import express from 'express';
import cors from 'cors';
import fs from 'fs';

// Prevenir crash por erros não tratados
process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception (servidor continua rodando):', err.message);
});
process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection (servidor continua rodando):', err.message || err);
});
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenerativeAI } from '@google/generative-ai';
import dotenv from 'dotenv';
dotenv.config();
import { maskSensitiveDataSafe, getMaskingRulesForClient } from './services/masking.js';
import { semanticSearch, tokenSearch } from './services/rag.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ── CARREGAR DADOS ──
const mockData = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'mock-tickets.json'), 'utf-8'));
const activeTickets = JSON.parse(fs.readFileSync(path.join(__dirname, 'data', 'active-tickets.json'), 'utf-8'));
const simulatedResponses = {}; // Removido — sem respostas simuladas no backend

// ── RATE LIMITING SIMPLES ──
const requestCounts = new Map();
const RATE_LIMIT_WINDOW = 60000; // 1 minuto
const RATE_LIMIT_MAX = 30; // 30 requests por minuto por IP

function rateLimiter(req, res, next) {
  const ip = req.ip || req.connection.remoteAddress;
  const now = Date.now();
  const windowStart = now - RATE_LIMIT_WINDOW;

  if (!requestCounts.has(ip)) {
    requestCounts.set(ip, []);
  }

  const timestamps = requestCounts.get(ip).filter(t => t > windowStart);
  timestamps.push(now);
  requestCounts.set(ip, timestamps);

  if (timestamps.length > RATE_LIMIT_MAX) {
    return res.status(429).json({ error: "Muitas requisições. Aguarde um momento." });
  }
  next();
}

app.use('/api', rateLimiter);

// ── ENDPOINT: Regras de mascaramento para o frontend ──
app.get('/api/masking-rules', (_req, res) => {
  res.json(getMaskingRulesForClient());
});

// ── ENDPOINT 1: Listar chamados ativos ──
app.get('/api/tickets', (_req, res) => {
  res.json(activeTickets);
});

// ── ENDPOINT 2: Analisar chamado (Fluxo RAG) ──
app.post('/api/analyze', async (req, res) => {
  const { ticketId, subject, description, geminiApiKey } = req.body;
  const apiKey = (geminiApiKey && geminiApiKey.trim().length > 0) ? geminiApiKey : process.env.GEMINI_API_KEY;

  // DLP: Mascarar dados sensíveis ANTES de qualquer processamento com IA
  const maskedSubject = maskSensitiveDataSafe(subject || '');
  const maskedDescription = maskSensitiveDataSafe(description || '');
  const fullQueryText = `${maskedSubject} ${maskedDescription}`;

  const isVagueInput = maskedDescription.trim().length < 15;

  // RAG - Busca por similaridade (base local)
  let searchResults = [];
  let usedSemanticSearch = false;

  if (apiKey && apiKey.trim().length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      console.log("Executando busca semântica...");
      searchResults = await semanticSearch(genAI, fullQueryText, mockData);
      usedSemanticSearch = true;
      console.log(`Busca semântica OK. Resultados: ${searchResults.length}`);
    } catch (err) {
      console.error("Erro na busca semântica (fallback para tokens):", err.message);
    }
  }

  // Fallback: busca por tokens
  if (!usedSemanticSearch) {
    console.log("Executando busca por tokens (fallback)...");
    searchResults = tokenSearch(fullQueryText, mockData);
  }

  // ── FONTE ADICIONAL: FreshService real (tickets do ITSM) ──
  let freshserviceResults = [];
  const fsDomain = process.env.FRESHSERVICE_DOMAIN;
  const fsKey = process.env.FRESHSERVICE_API_KEY;
  if (fsDomain && fsKey && fullQueryText.length > 5) {
    try {
      const searchTerm = encodeURIComponent(fullQueryText.slice(0, 60));
      const fsResponse = await fetch(
        `https://${fsDomain}.freshservice.com/api/v2/tickets/filter?query="subject:'${searchTerm}' OR description:'${searchTerm}'"&per_page=3`,
        { headers: { 'Authorization': 'Basic ' + Buffer.from(fsKey + ':X').toString('base64') } }
      );
      if (fsResponse.ok) {
        const fsData = await fsResponse.json();
        const fsTickets = fsData.tickets || [];
        freshserviceResults = fsTickets.map(t => ({
          id: `FS-${t.id}`,
          title: `FreshService #${t.id}: ${t.subject}`,
          content: t.description_text || t.subject,
          type: 'FreshService',
          similarity: 60, // Base similarity for external source
          link: `https://${fsDomain}.freshservice.com/a/tickets/${t.id}`
        }));
        if (freshserviceResults.length > 0) {
          console.log(`FreshService: ${freshserviceResults.length} tickets encontrados`);
        }
      }
    } catch (fsErr) {
      console.log("FreshService API indisponível:", fsErr.message);
    }
  }

  // Combinar resultados locais + FreshService
  searchResults = [...searchResults, ...freshserviceResults];

  // Top 3 fontes
  searchResults.sort((a, b) => b.similarity - a.similarity);
  const topSources = searchResults.slice(0, 3);

  // Flag de baixa confiança — se a melhor fonte tem < 70% de similaridade
  const lowConfidence = topSources.length === 0 || topSources[0].similarity < 70;

  // MODO LIVE: Gerar resposta com Gemini
  if (apiKey && apiKey.trim().length > 0) {
    try {
      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-flash-lite-latest",
        generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
      });

      let prompt = "";
      if (isVagueInput) {
        prompt = `
          Você é o ClearIT Copilot, assistente de L1 da ClearIT. O analista recebeu um chamado muito vago:
          Assunto: "${maskedSubject}"
          Descrição: "${maskedDescription}"

          Como o chamado é genérico, gere um guia de troubleshooting estruturado para o analista coletar mais detalhes com o cliente.
          Retorne obrigatoriamente uma resposta no formato JSON abaixo:
          {
            "diagnosis": "Descrição curta do porquê o chamado está vago e o que precisa ser descoberto.",
            "actions": ["Ação ou pergunta de triagem 1", "Ação ou pergunta de triagem 2", "Ação ou pergunta de triagem 3"]
          }
          Responda em Português do Brasil (pt-BR).
        `;
      } else {
        const contextStr = topSources.map(s => `[Fonte: ${s.title}]\n${s.content}`).join('\n\n');
        const confidenceNote = lowConfidence 
          ? '\n          ATENÇÃO: As fontes encontradas têm baixa similaridade com o problema descrito. Seja cauteloso no diagnóstico, indique que a confiança é baixa e sugira que o analista valide com outras fontes antes de agir.'
          : '';
        prompt = `
          Você é o ClearIT Copilot, assistente de suporte Nível 1 da ClearIT. Ajude o analista a diagnosticar:
          Assunto: "${maskedSubject}"
          Descrição: "${maskedDescription}"

          Fontes históricas de referência:
          ${contextStr || "Nenhuma fonte semelhante encontrada."}
          ${confidenceNote}

          Gere um diagnóstico conciso e ações práticas passo a passo.
          Retorne obrigatoriamente no formato JSON:
          {
            "diagnosis": "Explicação resumida do diagnóstico provável",
            "actions": ["Passo 1 com fonte (cf. KB-XXXX ou Ticket #XXXX)", "Passo 2", "Passo 3"]
          }
          Responda em Português do Brasil (pt-BR).
        `;
      }

      const result = await model.generateContent(prompt);
      const text = result.response.text();
      
      let aiResponse;
      try {
        aiResponse = JSON.parse(text);
      } catch (parseError) {
        console.error("Gemini retornou JSON inválido. Usando fallback.", parseError.message);
        throw new Error("JSON inválido do Gemini");
      }

      // DLP na SAÍDA: mascarar qualquer dado sensível que a IA possa ter gerado
      const safeDiagnosis = maskSensitiveDataSafe(aiResponse.diagnosis || '');
      const safeActions = (aiResponse.actions || []).map(a => maskSensitiveDataSafe(a));

      // Se baixa confiança: buscar referências externas (web) via Gemini
      let webReferences = [];
      if (lowConfidence && !isVagueInput) {
        try {
          const webModel = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest" });
          console.log("Buscando referências web (lowConfidence)...");
          const webPrompt = `Busque na internet informações técnicas recentes sobre este problema de TI:
"${maskedDescription}"

Retorne 2-3 referências de documentação oficial de fabricantes (Nutanix, Commvault, Cisco, Microsoft, VMware, HP, Dell) ou fóruns técnicos confiáveis.
Para cada referência, informe: título da documentação, nome do site/fonte, e a data aproximada da publicação (mês/ano).
Priorize as referências mais recentes.

Formato: título | fonte | data
Exemplo:
How to Clear CVM Disk Space | Nutanix Support Portal | 2024-03
Troubleshooting Backup Timeout | Commvault Documentation | 2023-11`;

          const webResult = await webModel.generateContent(webPrompt);
          const webText = webResult.response.text();
          
          webText.split('\n').forEach(line => {
            const parts = line.split('|');
            if (parts.length >= 2) {
              const title = parts[0].replace(/\*\*/g, '').replace(/^\d+\.\s*/, '').trim();
              const source = parts[1] ? parts[1].trim() : '';
              const date = parts[2] ? parts[2].trim().split('\n')[0].split('(')[0].trim() : '';
              if (title.length > 3 && source.length > 2) {
                webReferences.push({ title, source, date });
              }
            }
          });
          if (webReferences.length > 0) {
            console.log(`Web references: ${webReferences.length} referências encontradas`);
          }
        } catch (webErr) {
          console.log("Web search indisponível:", webErr.message);
        }
      }

      // Adicionar links às fontes
      const sourcesWithLinks = topSources.map(s => ({
        id: s.id,
        title: s.title,
        type: s.type,
        similarity: s.similarity,
        link: s.link || null
      }));

      return res.json({
        diagnosis: safeDiagnosis,
        actions: safeActions,
        sources: sourcesWithLinks,
        webReferences,
        isVague: isVagueInput,
        lowConfidence,
        usedSemanticSearch: true
      });

    } catch (apiError) {
      console.error("Erro na chamada Gemini (caindo para fallback):", apiError.message);
    }
  }

  // Fallback sem Gemini — resposta baseada nas fontes locais
  if (isVagueInput) {
    return res.json({
      diagnosis: "Descrição insuficiente para diagnóstico automático.",
      actions: [
        "Solicitar ao cliente que detalhe o sintoma.",
        "Perguntar se outros usuários estão com o mesmo problema.",
        "Verificar desde quando o problema ocorre."
      ],
      sources: [],
      isVague: true
    });
  }

  if (topSources.length > 0) {
    const bestSource = topSources[0];
    return res.json({
      diagnosis: `Possível relação com ${bestSource.title.split(': ')[1]}.`,
      actions: [
        `Analisar o histórico da fonte ${bestSource.title}.`,
        `Validar se os sintomas batem com os descritos no arquivo.`,
        `Seguir a recomendação da fonte: verificar parâmetros de configuração correspondentes.`
      ],
      sources: topSources.map(s => ({ id: s.id, title: s.title, type: s.type, similarity: s.similarity })),
      isVague: false,
      lowConfidence
    });
  }

  res.json({
    diagnosis: "Nenhum histórico coincidente encontrado e chave de API do Gemini ausente.",
    actions: [
      "Cole a Gemini API Key nas configurações para obter diagnóstico por IA.",
      "Refine a busca com sintomas mais claros (ex: Commvault, VPN, AD, Nutanix)."
    ],
    sources: [],
    isVague: false
  });
});

// ── ENDPOINT 3: Chat interativo ──
app.post('/api/chat', async (req, res) => {
  const { queryText, ticketDesc, diagnosis, actions, geminiApiKey } = req.body;
  const apiKey = (geminiApiKey && geminiApiKey.trim().length > 0) ? geminiApiKey : process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return res.status(400).json({ error: "Gemini API Key não configurada." });
  }

  // DLP na entrada
  const maskedQuery = maskSensitiveDataSafe(queryText || '');
  const maskedDesc = maskSensitiveDataSafe(ticketDesc || '');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-flash-lite-latest", generationConfig: { temperature: 0.2 } });

    const prompt = `
      Você é o ClearIT Copilot, respondendo perguntas do analista sobre um chamado de TI.
      Sintomas: "${maskedDesc}"
      Diagnóstico Inicial: "${diagnosis}"
      Ações Recomendadas: ${JSON.stringify(actions)}

      Pergunta do Analista: "${maskedQuery}"

      Responda de forma clara e objetiva com comandos práticos de troubleshooting L1.
      Responda em Português do Brasil (pt-BR).
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    
    // DLP na SAÍDA: mascarar qualquer dado sensível na resposta da IA
    const safeReply = maskSensitiveDataSafe(responseText);
    
    res.json({ reply: safeReply });
  } catch (error) {
    console.error("Erro no chat Gemini:", error.message);
    const isAuthError = error.message && (
      error.message.includes('API_KEY_INVALID') || 
      error.message.includes('API key') || 
      error.message.includes('404') || 
      error.message.includes('not found')
    );
    res.status(400).json({ 
      error: "Erro de processamento da IA.",
      details: error.message,
      isAuthError: !!isAuthError
    });
  }
});

// ── ENDPOINT 4: Registrar feedback do analista ──
app.post('/api/feedback', (req, res) => {
  const { ticketId, query, diagnosis, sources, action, editedResponse, rejectionReason, analyst } = req.body;

  if (!action || !['aceito', 'parcial', 'rejeitado'].includes(action)) {
    return res.status(400).json({ error: "Ação inválida. Use: aceito, parcial ou rejeitado." });
  }

  const feedbackEntry = {
    id: `fb-${Date.now()}`,
    ticketId: ticketId || null,
    query: query || '',
    diagnosis: diagnosis || '',
    sources: sources || [],
    action,
    editedResponse: editedResponse || null,
    rejectionReason: rejectionReason || null,
    analyst: analyst || 'analista-l1',
    timestamp: new Date().toISOString()
  };

  // Salvar em arquivo local (em produção → Cloud Firestore)
  const feedbackFile = path.join(__dirname, 'data', 'feedbacks.json');
  let feedbacks = [];
  try {
    if (fs.existsSync(feedbackFile)) {
      feedbacks = JSON.parse(fs.readFileSync(feedbackFile, 'utf-8'));
    }
  } catch (e) { feedbacks = []; }

  feedbacks.push(feedbackEntry);
  try {
    fs.writeFileSync(feedbackFile, JSON.stringify(feedbacks, null, 2), 'utf-8');
  } catch (writeErr) {
    console.error('❌ Erro ao salvar feedback:', writeErr.message);
    return res.status(500).json({ error: 'Erro ao salvar feedback no disco.' });
  }

  console.log(`📊 Feedback [${action}] salvo: ${feedbackEntry.id}`);
  res.json({ status: 'ok', id: feedbackEntry.id, message: `Feedback "${action}" registrado com sucesso.` });
});

// ── ENDPOINT 5: Listar feedbacks registrados ──
app.get('/api/feedbacks', (_req, res) => {
  const feedbackFile = path.join(__dirname, 'data', 'feedbacks.json');
  try {
    if (fs.existsSync(feedbackFile)) {
      const feedbacks = JSON.parse(fs.readFileSync(feedbackFile, 'utf-8'));
      res.json({
        total: feedbacks.length,
        aceitos: feedbacks.filter(f => f.action === 'aceito').length,
        parciais: feedbacks.filter(f => f.action === 'parcial').length,
        rejeitados: feedbacks.filter(f => f.action === 'rejeitado').length,
        feedbacks
      });
    } else {
      res.json({ total: 0, aceitos: 0, parciais: 0, rejeitados: 0, feedbacks: [] });
    }
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// ── ENDPOINT 6: Busca web sob demanda ──
app.post('/api/web-search', async (req, res) => {
  const { description, diagnosis } = req.body;
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim().length === 0) {
    return res.status(400).json({ error: "Gemini API Key não configurada no servidor." });
  }

  if (!description || description.trim().length === 0) {
    return res.status(400).json({ error: "Descrição do problema é obrigatória." });
  }

  const maskedDescription = maskSensitiveDataSafe(description);

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: "gemini-flash-lite-latest",
      generationConfig: { responseMimeType: "application/json", temperature: 0.3 }
    });

    const prompt = `Você é um assistente técnico de TI. Pesquise na internet informações recentes e relevantes sobre este problema:
"${maskedDescription}"
${diagnosis ? `\nDiagnóstico atual: "${maskSensitiveDataSafe(diagnosis)}"` : ''}

Retorne um JSON com:
- "summary": Um resumo em 3-5 parágrafos curtos do que encontrou na internet sobre este problema. Inclua causas comuns, soluções recomendadas por fabricantes, e boas práticas. Foque em informações recentes.
- "sources": Array de strings com os nomes dos sites/documentações consultados (ex: "Nutanix Portal", "Commvault Documentation", "Microsoft TechNet", "VMware KB"). Máximo 5 fontes.
- "confidence": Número de 0 a 100 representando o quão relevante e confiável é a informação encontrada para este problema específico.

Responda em Português do Brasil.`;

    const result = await model.generateContent(prompt);
    const text = result.response.text();

    let parsed;
    try {
      parsed = JSON.parse(text);
    } catch (parseErr) {
      parsed = { summary: text, sources: [], confidence: 50 };
    }

    // Análise de compatibilidade: diagnóstico interno vs pesquisa web
    let compatibility = null;
    if (diagnosis && parsed.summary) {
      try {
        const compModel = genAI.getGenerativeModel({ 
          model: "gemini-flash-lite-latest",
          generationConfig: { responseMimeType: "application/json", temperature: 0.2 }
        });
        const compPrompt = `Compare o diagnóstico interno de um sistema de suporte com informações encontradas na internet sobre o mesmo problema.

Diagnóstico interno: "${maskSensitiveDataSafe(diagnosis)}"

Informações da internet: "${parsed.summary.slice(0, 500)}"

Retorne um JSON com:
- "status": "compativel" | "parcialmente_compativel" | "divergente"
- "analysis": Uma frase curta (máximo 2 linhas) explicando se as fontes externas confirmam, complementam ou contradizem o diagnóstico interno.

Responda em Português do Brasil.`;

        const compResult = await compModel.generateContent(compPrompt);
        const compText = compResult.response.text();
        try {
          compatibility = JSON.parse(compText);
        } catch (e) {
          compatibility = { status: "parcialmente_compativel", analysis: compText.slice(0, 200) };
        }
        console.log(`🔍 Compatibilidade: ${compatibility.status}`);
      } catch (compErr) {
        console.error("Erro na análise de compatibilidade:", compErr.message);
      }
    }

    console.log(`🌐 Web search: confiança ${parsed.confidence}%, fontes: ${(parsed.sources || []).join(', ')}`);
    res.json({
      summary: parsed.summary || null,
      sources: (parsed.sources || []).slice(0, 5),
      confidence: parsed.confidence || 50,
      compatibility
    });

  } catch (error) {
    console.error("Erro na busca web:", error.message);
    res.status(500).json({ error: "Erro ao buscar referências na web." });
  }
});

app.listen(PORT, () => {
  console.log(`ClearIT Copilot rodando em http://localhost:${PORT}`);
});
