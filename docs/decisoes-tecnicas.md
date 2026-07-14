# Decisões Técnicas — ClearIT Copilot

Registro das escolhas feitas durante o desenvolvimento, com justificativa e trade-offs.

---

## Infraestrutura

### Por que Render para o backend?

**Decisão:** Usar Render (free tier) como hosting do backend Node.js.

**Motivo:**
- Deploy instantâneo via push no GitHub (CI/CD automático)
- Free tier com HTTPS incluso (resolve o problema de Mixed Content no FreshService)
- Zero configuração de servidor (serverless-like)
- Suficiente para MVP com 5-10 analistas

**Trade-offs:**
- Free tier dorme após 15 min de inatividade (cold start de ~30s)
- Solução paliativa: cron job externo pingando a cada 14 min
- Em produção real, migraria para Cloud Run (Google) ou plano pago do Render

**Por que não Cloud Run desde o início?**
- Requer conta GCP com billing configurado
- Mais complexidade de setup (Docker, gcloud CLI, IAM)
- Para um MVP de 2 semanas, Render é mais rápido

---

### Por que FreshService como ITSM?

**Decisão:** Integrar com FreshService (trial gratuito) ao invés de ServiceNow, Jira SM ou Zendesk.

**Motivo:**
- É a ferramenta que a ClearIT **já usa** — validação real com o cliente
- Trial gratuito com API REST completa
- SDK de Custom Apps documentado (FDK)
- Marketplace permite apps privados sem custo

**Trade-offs:**
- FDK tem bugs e documentação inconsistente (Platform 3.0 exigiu vários ajustes)
- Dependência de versões específicas de Node (24.11.x para FDK 10)
- Widget roda em iframe com limitações de comunicação

---

### Por que Gemini e não OpenAI/Claude?

**Decisão:** Usar Google Gemini (Flash + Embedding) como LLM.

**Motivo:**
- Free tier generoso (15 RPM, suficiente para MVP)
- Modelo de embedding nativo (`gemini-embedding-001`) — não precisa de serviço separado
- SDK oficial para Node.js (`@google/generative-ai`)
- Suporte nativo a JSON mode (`responseMimeType: "application/json"`)
- Empresa parceira (ClearIT) já usa Google Workspace — alinhamento estratégico

**Trade-offs:**
- Billing instável em julho 2026 (bug de sincronização de créditos)
- Modelo `flash-lite` tem qualidade inferior ao `gpt-4o` em português
- Sem Google Search Grounding real (busca web é simulada via prompt)

**Por que não OpenAI?**
- Sem free tier para embeddings
- Custo maior por token
- Dois serviços separados (embedding + geração)

---

## Arquitetura de Código

### Por que RAG implementado do zero (sem LangChain)?

**Decisão:** Implementar o pipeline RAG manualmente com cosine similarity em JavaScript.

**Motivo:**
- Fluxo simples: embed → compare → generate. ~200 linhas de código
- Controle total sobre cada etapa (debug fácil)
- Zero dependências pesadas (LangChain adicionaria ~40 pacotes)
- Mais fácil de explicar na apresentação

**Trade-offs:**
- Busca O(n) — funciona para 53 documentos, não escala para 10k+
- Sem re-ranking, sem query expansion, sem hybrid search
- Se o fluxo ficar mais complexo (agents, tools, chains), precisaria de framework

---

### Por que cache de embeddings em JSON no disco?

**Decisão:** Persistir embeddings em `data/embeddings-cache.json` ao invés de banco vetorial.

**Motivo:**
- Zero dependência externa (não precisa de Pinecone, Weaviate, ChromaDB)
- Carrega em memória em <1s para 53 documentos
- Funciona offline
- Simples de debugar (arquivo legível)

**Trade-offs:**
- Não escala para grandes volumes (>2000 docs)
- Invalidação manual (deletar arquivo quando dados mudam)
- Sem índice ANN — busca é força bruta

**Futuro:** Migrar para Vertex AI Vector Search quando volume justificar.

---

### Por que mascaramento com regex (não NER)?

**Decisão:** Usar 14 regras regex para DLP ao invés de Named Entity Recognition via ML.

**Motivo:**
- Determinístico — mesma entrada, mesma saída. Sem falsos negativos por variação do modelo
- Instantâneo (<1ms) — não adiciona latência
- Auditável — cada regra é visível e testável isoladamente
- Sem dependência de modelo adicional

**Trade-offs:**
- Falsos positivos em padrões ambíguos (ex: `app.js` parece login corporativo)
- Resolvido com lista de exclusão (`LOGIN_FALSE_POSITIVES`)
- Não detecta dados sensíveis em formato inesperado (ex: CPF escrito por extenso)

---

### Por que busca web retorna resumo e não links?

**Decisão:** Endpoint `/api/web-search` retorna resumo textual + fontes por nome, sem URLs clicáveis.

**Motivo:**
- O Gemini não faz busca real na internet — ele gera URLs plausíveis que frequentemente não existem
- Links quebrados prejudicam a credibilidade do sistema
- Resumo mantém o analista no contexto do ticket (não precisa sair pra outra aba)
- Fontes citadas por nome permitem que o analista busque manualmente se quiser

**Trade-offs:**
- Analista não tem acesso direto ao documento original
- Informação pode estar desatualizada (baseada no treinamento do Gemini)

**Futuro:** Integrar Google Custom Search API (pago) para links verificados reais.

---

## Decisões de UX

### Por que o sistema não executa ações automaticamente?

**Decisão:** O Copilot é consultivo — sugere, nunca age.

**Motivo:**
- Princípio de segurança: ação automática errada > nenhuma ação
- Analista mantém controle e responsabilidade
- Confiança do usuário: se o sistema agisse errado uma vez, nunca mais confiaria
- Alinhado com a cultura da ClearIT (validação humana obrigatória)

---

### Por que mostrar nível de confiança?

**Decisão:** Exibir percentual de similaridade e alertar quando baixo.

**Motivo:**
- Transparência: analista sabe quando a sugestão é forte vs fraca
- Evita ação baseada em alucinação — <70% dispara alerta visual
- Diferencial vs ChatGPT genérico (que nunca diz "não sei")
- Calibra expectativa do usuário

---

### Por que análise de compatibilidade (diagnóstico vs web)?

**Decisão:** Após busca web, comparar automaticamente com o diagnóstico interno.

**Motivo:**
- Solicitação direta do head de operações da ClearIT durante avaliação
- Reforça ou questiona a sugestão interna com evidência externa
- Reduz risco de o analista seguir diagnóstico incorreto
- Diferencial: nenhum copilot de mercado faz essa cross-validation

---

## O que NÃO foi implementado e por quê

### Autenticação
**Por que não:** MVP de 2 semanas com foco em validar a IA, não a segurança. API roda em URL não divulgada. Primeiro passo pós-entrega.

### Testes automatizados
**Por que não:** Tempo insuficiente. Testes foram manuais (15 cenários via curl). Unit tests são próximo passo antes de qualquer refatoração.

### Logging estruturado
**Por que não:** `console.log` resolve para debug local. Em produção precisa de Cloud Logging + alertas, mas para MVP não justifica a complexidade.

### Fine-tuning do modelo
**Por que não:** Requer 500+ interações validadas. O sistema acabou de entrar no ar — ainda não tem volume de feedback suficiente.

### Multi-idioma
**Por que não:** ClearIT opera 100% em português. Não há demanda real para outros idiomas no momento.

### Integração Slack/Teams
**Por que não:** O Alexandre (ClearIT) prioriza o FreshService — é onde os analistas trabalham. Slack seria canal secundário, não prioritário.

---

*Documento atualizado em 13/07/2026*
