# ClearIT Copilot

IA consultiva para analistas de suporte técnico L1. Busca por significado, não por palavra.

**Squad Sherlock (B5) — Pulse Mais 2026**

---

## O que é

O ClearIT Copilot é um serviço de IA que recebe a descrição de um problema de suporte, busca em múltiplas fontes (tickets históricos, bases de conhecimento, documentação de fabricantes) e retorna um diagnóstico estruturado com fonte citada e nível de confiança.

O analista sempre valida antes de agir — o sistema é consultivo, nunca executa ações automaticamente.

> **Nota de design:** A interface da POC foi intencionalmente inspirada na UI clássica do FreshService para demonstrar como o Copilot se integraria ao fluxo de trabalho real do analista. Não é produto oficial da Freshworks.

---

## Funcionalidades

- **Busca semântica** — encontra tickets similares mesmo com títulos diferentes (gemini-embedding-001)
- **Geração de diagnóstico** — Gemini Flash gera diagnóstico + passos de ação com fonte citada
- **Mascaramento LGPD** — 14 regras de DLP garantem que dados sensíveis nunca chegam na IA
- **Detecção de descrição vaga** — modo triagem quando o chamado é insuficiente
- **Busca web sob demanda** — pesquisa documentação de fabricantes com resumo e análise de compatibilidade
- **Chat follow-up** — perguntas adicionais mantendo contexto do problema
- **Feedback loop** — analista avalia respostas para melhoria contínua
- **Integração FreshService** — widget disponível em repositório separado ([clearit-copilot-freshservice-api](https://github.com/beandy-dev/clearit-copilot-freshservice-api))
- **Fallback gracioso** — funciona sem internet usando busca por tokens

---

## Arquitetura

```
Chamado do Analista → [LGPD 14 regras] → [Embedding 3072d] → [Busca 3 fontes] → [Gemini] → Resultado
                                                                    ↓
                                                        Tickets · KBs · FreshService API
                                                                    ↓ (se baixa confiança)
                                                            Busca Web + Análise de Compatibilidade
```

Ver diagramas detalhados e visão futura em [Contexto Técnico](docs/technical-context-lite.md).

---

## Documentação

| Documento | Descrição |
|-----------|-----------|
| [Contexto de Negócio](docs/business-context-lite.md) | Problema, personas, critérios de aceite, regras de negócio |
| [Contexto Técnico](docs/technical-context-lite.md) | Stack, arquitetura RAG, fluxo de dados, diagramas (atual vs futuro) |
| [Decisões Técnicas](docs/decisoes-tecnicas.md) | Por quê de cada escolha (Render, Gemini, regex, etc.) e o que não foi implementado |
| [Resultados de Testes](docs/resultados-testes.md) | 15 testes automatizados — busca, vagueza, LGPD, chat, performance |
| [Contrato de API](RESPONSE_SCHEMA.md) | Schema JSON de resposta dos endpoints |
| [Changelog e Backlog](CHANGELOG.md) | Mudanças recentes, curadoria de feedback, melhorias futuras |
| [Widget FreshService](https://github.com/beandy-dev/clearit-copilot-freshservice-api) | Custom App: repositório separado |

---

## Estrutura do Projeto

```
clearit-copilot/
├── server.js                  # Backend Express (API REST)
├── services/
│   ├── masking.js             # Pipeline DLP/LGPD (14 regras)
│   └── rag.js                 # RAG: embeddings, busca semântica, fallback por tokens
├── public/                    # Frontend (design inspirado na UI do FreshService)
│   ├── index.html
│   ├── app.js
│   └── styles.css
├── data/
│   ├── mock-tickets.json      # 40 tickets + 13 KBs (base vetorial)
│   └── active-tickets.json    # Tickets ativos para o painel demo
├── docs/                      # Documentação
│   ├── business-context-lite.md
│   ├── technical-context-lite.md
│   ├── decisoes-tecnicas.md
│   ├── resultados-testes.md
│   └── *.svg                  # Diagramas de arquitetura
├── start.sh                   # Script de inicialização
├── RESPONSE_SCHEMA.md         # Contrato da API
├── CHANGELOG.md               # Mudanças, decisões e roadmap
├── .env.example               # Template de variáveis de ambiente
└── package.json
```

---

## Como Rodar

### Pré-requisitos
- Node.js 18+
- Chave de API do Gemini ([Google AI Studio](https://aistudio.google.com/apikey))

### Instalação

```bash
git clone https://github.com/beandy-dev/sherlock-clearit-copilot.git
cd sherlock-clearit-copilot
npm install
cp .env.example .env
# Editar .env com sua GEMINI_API_KEY
```

### Execução

```bash
npm start
# ou
./start.sh
```

Acesse http://localhost:3000

### Modo sem API key
Funciona com busca por tokens (keyword matching). Qualidade menor, mas o serviço não para.

---

## API

| Endpoint | Método | Descrição |
|----------|--------|-----------|
| `/api/tickets` | GET | Lista chamados ativos |
| `/api/analyze` | POST | Diagnóstico RAG (busca + geração) |
| `/api/chat` | POST | Chat follow-up contextualizado |
| `/api/feedback` | POST | Registra avaliação do analista |
| `/api/feedbacks` | GET | Lista feedbacks com estatísticas |
| `/api/web-search` | POST | Busca web + análise de compatibilidade |
| `/api/masking-rules` | GET | Retorna regras de mascaramento ativas |

Ver detalhes em [RESPONSE_SCHEMA.md](./RESPONSE_SCHEMA.md).

---

## Stack Técnica

| Componente | Tecnologia |
|------------|-----------|
| Backend | Node.js + Express |
| IA (geração) | Gemini Flash (Google AI) |
| IA (embeddings) | gemini-embedding-001 (3072d) |
| Busca vetorial | Cosine similarity em memória + cache em disco |
| Segurança | Pipeline DLP com 14 regras regex |
| Frontend | HTML + CSS + Vanilla JS |
| Frontend | HTML + CSS + Vanilla JS |
| Deploy | Render (backend) |

---

## Segurança e LGPD

Dados sensíveis são mascarados **antes** de qualquer contato com a IA:

| Tipo | Exemplo | Resultado |
|------|---------|-----------|
| CPF | 123.456.789-00 | `[CPF_MASCARADO]` |
| Email | joao@empresa.com | `[EMAIL_MASCARADO]` |
| IPv4 | 192.168.1.50 | `[IP_MASCARADO]` |
| Login | felipe.silva | `[LOGIN_MASCARADO]` |
| API Key | AIzaSy... | `[API_KEY_MASCARADA]` |
| + 9 outros padrões | | |

Mascaramento aplicado na entrada (antes do embedding e geração) **e** na saída (resposta da IA).

---

## Resultados de Testes

15 testes automatizados — **100% passaram**:

| Categoria | Testes | Status |
|-----------|--------|--------|
| Busca semântica | 3 | ✅ 86-90% similaridade |
| Detecção de vagueza | 2 | ✅ |
| Low confidence + web | 2 | ✅ |
| Mascaramento LGPD | 1 | ✅ 100% eficácia |
| Feedback | 3 | ✅ |
| Chat follow-up | 3 | ✅ |
| Performance | 2 | ✅ ~1.9s por consulta |

Ver detalhes em [docs/resultados-testes.md](./docs/resultados-testes.md).

---

## Deploy em Produção

> **Nota:** O servidor de testes em `clearit-copilot.onrender.com` é temporário e será desativado em breve. Ele existe apenas para validação durante o programa Pulse Mais 2026. Para uso próprio, siga as instruções abaixo para criar seu próprio deploy.

Para colocar o sistema em produção, você precisa configurar:

### Backend (Render, Railway, Cloud Run ou similar)

1. Crie uma conta no [Render](https://render.com) ou serviço equivalente
2. Crie um novo Web Service apontando para o repositório
3. Configure as variáveis de ambiente:
   - `GEMINI_API_KEY` — chave do Google AI Studio
   - `FRESHSERVICE_DOMAIN` — subdomínio do FreshService (ex: `suaempresa`)
   - `FRESHSERVICE_API_KEY` — chave da API do FreshService (Profile Settings)
   - `PORT` — porta (geralmente o próprio serviço define)
4. Deploy automático a cada push na branch main

### Widget FreshService

O widget é mantido em repositório separado: [clearit-copilot-freshservice-api](https://github.com/beandy-dev/clearit-copilot-freshservice-api)

Consulte o README daquele repositório para instruções de empacotamento e deploy.

### Manter o serviço ativo (free tier)

Serviços free tier (Render, Railway) dormem após inatividade. Configure um cron job externo (ex: [cron-job.org](https://cron-job.org)) para pingar o backend a cada 14 minutos.

---

## Roadmap

Ver [CHANGELOG.md](./CHANGELOG.md) para lista completa de melhorias futuras, incluindo:
- Pipeline de curadoria de feedback (sugestão da banca avaliadora)
- Autenticação e observabilidade
- Cache inteligente e chunking
- Webhook proativo (Zabbix/Datadog)
- Multi-tenant (SaaS)
- Fine-tuning após 500+ interações

---

## Repositórios Relacionados

| Repo | Descrição |
|------|-----------|
| [clearit-copilot-backend](https://github.com/beandy-dev/clearit-copilot-backend) | Backend em produção (Render) |
| [clearit-copilot-freshservice-api](https://github.com/beandy-dev/clearit-copilot-freshservice-api) | Widget FreshService (Custom App) |

---

## Equipe

| Membro | Frente |
|--------|--------|
| Beatriz Andrade Lourenço | Tecnologia, Produto e Negócios |
| Davi da Paz Mota | Tecnologia e Produto |
| Maria Eduarda Ferreira Santos | Tecnologia e Produto |
| Maria Eloisa Gomes da Conceição | Negócios e Estratégia |
| Phelipe Alexandre de Almeida | Tecnologia e Produto |

---

