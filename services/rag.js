/**
 * Serviço de RAG (Retrieval-Augmented Generation)
 * Gerencia embeddings, busca semântica e fallback por tokens.
 * 
 * Modelo de embedding: gemini-embedding-001 (substituiu text-embedding-004)
 */

import fs from 'fs';

// Cache global de embeddings
let cachedTicketEmbeddings = [];
let cachedArticleEmbeddings = [];
let isEmbeddingsCacheInitialized = false;
const EMBEDDINGS_CACHE_PATH = './data/embeddings-cache.json';

/**
 * Similaridade de cosseno entre dois vetores.
 */
export function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) return 0;
  let dotProduct = 0.0;
  let normA = 0.0;
  let normB = 0.0;
  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
  }
  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Gera embedding para um texto usando gemini-embedding-001.
 */
async function embedText(genAI, text) {
  const model = genAI.getGenerativeModel({ model: "gemini-embedding-001" });
  const result = await model.embedContent(text);
  return result.embedding.values;
}

/**
 * Gera embeddings em lote com rate limiting (5 por segundo para não estourar).
 */
async function batchEmbed(genAI, texts) {
  const embeddings = [];
  const BATCH_SIZE = 5;
  
  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE);
    const promises = batch.map(text => embedText(genAI, text));
    const results = await Promise.all(promises);
    embeddings.push(...results);
    
    // Rate limit: esperar 1s entre batches
    if (i + BATCH_SIZE < texts.length) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  
  return embeddings;
}

/**
 * Inicializa cache de embeddings ou carrega do disco.
 */
export async function initializeEmbeddingsCache(genAI, mockData) {
  if (isEmbeddingsCacheInitialized) return;
  console.log("Inicializando cache de embeddings...");

  // 1. Tentar carregar cache do disco
  try {
    if (fs.existsSync(EMBEDDINGS_CACHE_PATH)) {
      const fileContent = fs.readFileSync(EMBEDDINGS_CACHE_PATH, 'utf8');
      const cacheData = JSON.parse(fileContent);

      if (cacheData.tickets && cacheData.tickets.length === mockData.tickets.length &&
          cacheData.articles && cacheData.articles.length === mockData.articles.length) {
        cachedTicketEmbeddings = cacheData.tickets;
        cachedArticleEmbeddings = cacheData.articles;
        isEmbeddingsCacheInitialized = true;
        console.log(`✅ Cache carregado do disco (${cacheData.tickets.length} tickets + ${cacheData.articles.length} KBs)`);
        return;
      }
      console.log("Cache desatualizado. Gerando novo...");
    }
  } catch (readError) {
    console.error("Erro ao ler cache:", readError.message);
  }

  // 2. Gerar via API (gemini-embedding-001)
  try {
    const ticketTexts = mockData.tickets.map(t => `${t.subject} ${t.description}`);
    const articleTexts = mockData.articles.map(kb => `${kb.title} ${kb.description}`);
    
    if (ticketTexts.length > 0) {
      console.log(`Gerando embeddings para ${ticketTexts.length} chamados...`);
      const ticketEmbeddings = await batchEmbed(genAI, ticketTexts);
      cachedTicketEmbeddings = mockData.tickets.map((t, idx) => ({
        id: t.id,
        embedding: ticketEmbeddings[idx]
      }));
    }
    
    if (articleTexts.length > 0) {
      console.log(`Gerando embeddings para ${articleTexts.length} artigos de KB...`);
      const articleEmbeddings = await batchEmbed(genAI, articleTexts);
      cachedArticleEmbeddings = mockData.articles.map((kb, idx) => ({
        id: kb.id,
        embedding: articleEmbeddings[idx]
      }));
    }
    
    // Persistir no disco
    try {
      fs.writeFileSync(EMBEDDINGS_CACHE_PATH, JSON.stringify({
        tickets: cachedTicketEmbeddings,
        articles: cachedArticleEmbeddings
      }), 'utf8');
      console.log("✅ Cache persistido em disco.");
    } catch (writeError) {
      console.error("Erro ao salvar cache:", writeError.message);
    }

    isEmbeddingsCacheInitialized = true;
    console.log(`✅ Embeddings gerados (${cachedTicketEmbeddings.length} tickets + ${cachedArticleEmbeddings.length} KBs)`);
  } catch (error) {
    console.error("❌ Erro ao gerar embeddings:", error.message);
    throw error;
  }
}

/**
 * Busca semântica usando embeddings em cache.
 */
export async function semanticSearch(genAI, queryText, mockData, threshold = 35) {
  const results = [];
  
  await initializeEmbeddingsCache(genAI, mockData);

  // Gerar embedding da query
  const queryEmbedding = await embedText(genAI, queryText);

  // Buscar em tickets
  mockData.tickets.forEach(t => {
    const cached = cachedTicketEmbeddings.find(te => te.id === t.id);
    if (cached) {
      const similarity = cosineSimilarity(queryEmbedding, cached.embedding);
      const percent = Math.round(similarity * 100);
      if (percent > threshold) {
        results.push({
          id: t.id,
          title: `Ticket #${t.id}: ${t.subject}`,
          content: `Descrição: ${t.description}\nResolução: ${t.resolution_notes}`,
          type: 'Ticket',
          similarity: Math.min(percent, 99)
        });
      }
    }
  });

  // Buscar em artigos
  mockData.articles.forEach(kb => {
    const cached = cachedArticleEmbeddings.find(ae => ae.id === kb.id);
    if (cached) {
      const similarity = cosineSimilarity(queryEmbedding, cached.embedding);
      const percent = Math.round(similarity * 100);
      if (percent > threshold) {
        results.push({
          id: kb.id,
          title: `${kb.id}: ${kb.title}`,
          content: kb.description,
          type: 'KB',
          similarity: Math.min(percent, 99)
        });
      }
    }
  });

  return results;
}

/**
 * Busca por similaridade local baseada em tokens (fallback sem API).
 */
export function tokenSearch(queryText, mockData) {
  const results = [];

  mockData.tickets.forEach(t => {
    const similarity = calculateTokenSimilarity(queryText, `${t.subject} ${t.description} ${t.tags.join(' ')}`);
    if (similarity > 15) {
      results.push({
        id: t.id,
        title: `Ticket #${t.id}: ${t.subject}`,
        content: `Descrição: ${t.description}\nResolução: ${t.resolution_notes}`,
        type: 'Ticket',
        similarity: Math.min(similarity + 10, 98)
      });
    }
  });

  mockData.articles.forEach(kb => {
    const similarity = calculateTokenSimilarity(queryText, `${kb.title} ${kb.description} ${kb.tags.join(' ')}`);
    if (similarity > 15) {
      results.push({
        id: kb.id,
        title: `${kb.id}: ${kb.title}`,
        content: kb.description,
        type: 'KB',
        similarity: Math.min(similarity + 15, 99)
      });
    }
  });

  return results;
}

function calculateTokenSimilarity(text1, text2) {
  const STOPWORDS = new Set([
    'que', 'para', 'com', 'uma', 'dos', 'das', 'nos', 'nas',
    'por', 'mais', 'como', 'mas', 'foi', 'bem', 'sem', 'tem',
    'seu', 'sua', 'isso', 'esta', 'esse', 'essa', 'num', 'numa',
    'pelos', 'pelas', 'esse', 'aqui', 'ali', 'ele', 'ela',
    'nao', 'sim', 'muito', 'tambem', 'pode', 'deve', 'acho',
    'quando', 'desde', 'ainda', 'sobre', 'entre', 'depois',
    'the', 'and', 'for', 'are', 'but', 'not', 'you', 'all',
    'was', 'her', 'she', 'has', 'this', 'that', 'with', 'from'
  ]);

  const normalize = (text) => {
    return text.toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 2 && !STOPWORDS.has(w));
  };

  const tokens1 = normalize(text1);
  const tokens2 = normalize(text2);
  if (tokens1.length === 0 || tokens2.length === 0) return 0;

  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  let intersectionSize = 0;

  for (const token of set1) {
    if (set2.has(token)) intersectionSize++;
  }

  return Math.round((intersectionSize / set1.size) * 100);
}
