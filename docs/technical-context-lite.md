# Technical Context Lite — Sherlock ClearIT Copilot

## 1. Stack Tecnológica

- **Backend:** Node.js (v22) + Express.js.
- **Frontend:** Vanilla HTML5, Vanilla CSS3 (Glassmorphism design, Outfit & Space Grotesk fonts via Google Fonts), e Vanilla JS (ES6).
- **Orquestração RAG:** JavaScript customizado (para busca e estruturação do prompt) + `@google/generative-ai` SDK.
- **Banco Vetorial:** Banco JSON vetorial local integrado ao Express, suportando:
  - **Modo Demo:** Cálculo de similaridade local baseado em correspondência de termos-chave e pontuação semântica mapeada em JSON.
  - **Modo Live:** Chamada opcional à API `text-embedding-004` (ou `embedding-001`) do Gemini via SDK para calcular a distância cosseno em tempo real de novos inputs.
- **LLM:** `gemini-1.5-flash` ou `gemini-1.5-pro` via SDK oficial do Google Gen AI.

## 2. Padrões de Código

- **Linguagem:** Frontend e Backend escritos em JavaScript.
- **Estrutura de Nomes:** Variáveis e funções em inglês (ex: `getSimilarTickets`, `generateDiagnosis`). Logs e interface em português do Brasil (pt-BR) para atender Felipe e o suporte.
- **Tratamento de Erros:** Blocos `try/catch` em todas as rotas da API e requisições do frontend, com fallbacks graciosos para o Modo Demo se houver erros de rede ou de API Key.
- **Design System CSS:** CSS limpo, estruturado com variáveis CSS nativas (Custom Properties), sem frameworks externos (Tailwind/Bootstrap) para flexibilidade e velocidade.

## 3. Arquitetura Lógica

### Arquitetura Atual (MVP)

![Fluxo de Diagnóstico do Analista](Analista%20Problem%20Diagnosis-2026-07-10-051032.svg)

![Arquitetura de Design Detalhada](Analista%20Problem%20Diagnosis%20Architecture%20Design-2026-07-10-051306.svg)

```
┌──────────────────────────────────────────────────────────┐
│              INTERFACE DE USUÁRIO (Navegador)            │
│  ┌───────────────────────┐   ┌────────────────────────┐  │
│  │   Painel FreshService │   │   ClearIT Copilot     │  │
│  │  (Seleção de Chamado) │   │ (Diagnósticos e Chats) │  │
│  └───────────┬───────────┘   └───────────▲────────────┘  │
└──────────────┼───────────────────────────┼───────────────┘
               │                           │
               │ POST /api/analyze         │ JSON Response
               ▼                           │
┌──────────────┼───────────────────────────┼───────────────┐
│              SERVIDOR BACKEND (Node.js/Express)          │
│   ┌──────────▼───────────┐   ┌───────────┴────────────┐  │
│   │    RAG Controller    ├──►│  Prompt Constructor    │  │
│   └──────────┬───────────┘   └───────────┬────────────┘  │
│              │                           │               │
│              ▼                           ▼               │
│   ┌──────────────────────┐   ┌────────────────────────┐  │
│   │   Similarity Matcher │   │    Gemini API Client   │  │
│   │  (embeddings + cache)│   │   (Flash + Embedding)  │  │
│   └──────────────────────┘   └───────────┬────────────┘  │
│              │                           │               │
│              ▼                           │               │
│   ┌──────────────────────┐              │               │
│   │   DLP Pipeline       │              │               │
│   │   (14 regras LGPD)   │              │               │
│   └──────────────────────┘              │               │
└──────────────────────────────────────────┼───────────────┘
                                           ▼
                                ┌─────────────────────┐
                                │   Google Gemini API │
                                └─────────────────────┘
```

### Arquitetura Futura (Produção)

```
┌─────────────────────────────────────────────────────────────┐
│                    CONSUMIDORES                              │
│  FreshService (sidebar) · Slack/Teams · Chrome Extension    │
└──────────────────────────┬──────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│                API Gateway + Auth (JWT/API Key)               │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           ▼
┌──────────────────────────────────────────────────────────────┐
│              BACKEND (Cloud Run — serverless)                 │
│                                                              │
│  [DLP Pipeline] → [Embedding] → [Vector Search] → [Gemini]  │
│                                                              │
│  + Cache Redis · Logging estruturado · Rate limiting         │
└──────────────┬─────────────────────┬─────────────────────────┘
               │                     │
               ▼                     ▼
┌──────────────────────┐  ┌─────────────────────────────────┐
│ Firestore            │  │ Vertex AI Vector Search         │
│ (feedback, métricas) │  │ (embeddings, busca ANN)         │
└──────────────────────┘  └─────────────────────────────────┘
               │
               ▼
┌──────────────────────────────────────────────────────────────┐
│              PIPELINE DE CURADORIA                            │
│  Duplicidade → Temporalidade → Volume → Revisão → Ingestão  │
└──────────────────────────────────────────────────────────────┘
```

## 4. Planos de Impl. Ativos

### Plano para F-01 & F-02 (Busca Semântica & Diagnóstico RAG)
1. **Modelagem de Dados (`data/mock-tickets.json`):** Estruturar 20 tickets históricos e 10 artigos de KB baseados nas dores mapeadas (Commvault, NetApp, Redes, Active Directory).
2. **Implementação do Backend (`server.js`):**
   - Rota `GET /api/tickets` para expor a lista de tickets simulados no FreshService.
   - Rota `POST /api/analyze` que recebe a descrição de um chamado, realiza a busca por similaridade semântica simulada (com fallback para embeddings reais do Gemini caso a API Key seja provida), monta o prompt RAG e invoca a API do Gemini para gerar o diagnóstico e soluções recomendadas.
3. **Desenvolvimento do Frontend (`public/`):**
   - Criar layout moderno com visual luxuoso. O painel esquerdo simulará a caixa de entrada do FreshService. O painel direito representará o Sherlock Copilot com glows, status pulsantes e cards para os resultados do RAG.
   - Adicionar modal de configuração para inserir a Gemini API Key de forma segura.
   - Integrar lógica de polling ou status dinâmico ("Buscando chamados similares...", "Analisando com IA...", "Formatando diagnóstico...") para melhorar o UX de Felipe.
