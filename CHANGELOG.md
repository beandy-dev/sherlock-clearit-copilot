# Changelog

Todas as mudanças notáveis do projeto ClearIT Copilot (versão final/produção) estão documentadas neste arquivo.

## [1.2.1] - 2026-07-15

### Adicionado

- **Testes automatizados** — 19 testes com Vitest cobrindo: mascaramento LGPD (6), busca por tokens (4), cosine similarity (5), integridade dos dados (4). Executar com `npm test`.
- **Botão Manual na página de ticket** — agora acessível tanto na lista quanto no detalhe do ticket
- **Aviso de cold start** nos READMEs — informa que o manual pode demorar ~30s na primeira carga (Render free tier)
- **Prompt do chat otimizado** — simplificado para evitar timeout. Chat agora recusa perguntas fora do contexto do chamado ("Só posso ajudar com o chamado em análise"). Timeout do chat: 45s.

---

## [1.2.0] - 2026-07-14 (entrega final)

> Organização dos repositórios, manual do sistema, diagramas de arquitetura e melhorias de documentação para entrega.

### Adicionado

- **Manual do sistema** — página HTML completa (`/manual.html`) com 10 seções: descrição, como usar (POC + MVP), funcionalidades, configuração, problemas/soluções, recomendações, limitações, próximos passos, equipe e glossário
- **Manual centralizado no backend** — servido via HTTPS pelo Render, acessível pelo widget e pela POC
- **Botão "Manual"** na POC (header azul) e no widget (header ao lado do badge)
- **Diagramas SVG** — fluxo do analista, arquitetura atual (Mermaid) e arquitetura futura (Mermaid)
- **Sidebar fixa no manual** — navegação lateral dark com accent gradient, números por seção, zoom nas imagens
- **Glossário** — 14 termos técnicos explicados (RAG, embedding, cosine similarity, LLM, DLP, etc.)
- **Busca web e regerar no widget** — mesmas features da POC agora no Custom App do FreshService
- **GitHub da equipe** — links nos READMEs e no manual
- **Referência ao manual** — link nos 3 READMEs + aviso sobre servidor temporário

### Alterado

- **Technical context** reorganizado — seção 3 separada em: fluxo de consulta, arquitetura atual, arquitetura futura (com explicação por bloco)
- **SVGs renomeados** — `fluxo-diagnostico.svg`, `arquitetura-atual.svg`, `arquitetura-futura.svg` (nomes descritivos)
- **POC consome manual do backend** — não tem mais cópia local do manual
- **Widget: feedback antes de regerar/web** — mesma ordem da POC
- **Widget: link do manual no header** — mais visível

### Corrigido

- Referências a `freshservice-app/` removidas do README da POC (pasta não existe mais)
- "Gemini Flash" corrigido para "Gemini Flash Lite" no manual e README
- "6 tickets" corrigido para "8 tickets" no manual
- SVGs referenciados corretamente no manual (nomes sem espaço)
- Link "Voltar ao sistema" removido do manual no backend (não faz sentido fora da POC)

### Documentado

- Por que o manual e SVGs estão no backend (README do deploy)
- Aviso de servidor temporário (Render) no widget e no backend
- Nota sobre design inspirado no FreshService (README da POC)

## [1.1.0] - 2026-07-13 (pós-apresentação)

> Alterações realizadas após a apresentação final (11/07) para organização do repositório, documentação e melhorias sugeridas pela banca avaliadora.

### Adicionado (features)

- **Busca web sob demanda** com resumo textual (links reais exigiriam Google Custom Search API ou Search Grounding — serviços pagos não incluídos no MVP)
- **Análise de compatibilidade** — compara diagnóstico interno vs fontes externas
- **Botão "Regerar resposta"** — re-chama a API com mesmos dados
- **Chat sempre visível** após resultado (não depende de feedback)

### Adicionado (documentação)

- `docs/decisoes-tecnicas.md` — justificativa de cada escolha técnica
- `CHANGELOG.md` — registro de mudanças e roadmap
- `freshservice-app/README.md` — guia completo do widget
- READMEs atualizados para os 3 repositórios
- Diagramas SVG no contexto técnico (arquitetura atual vs futura)
- Curadoria de feedback documentada (sugestão da banca)
- Melhorias futuras priorizadas

### Corrigido (bugfixes)

- Feedback no widget FreshService: confirmação visual + textarea para edição no "parcial"
- Retry automático no feedback (cold start do Render)
- Confiança movida para após as fontes (UX)
- Contraste dos botões e card de busca web (acessibilidade)
- `.gitignore` da POC não cobria `.env` — corrigido
- Removidos arquivos que não pertencem ao projeto (Onion, presentation.html)
- **Timeout 30s no frontend** — se o Gemini não responder em 30s, exibe mensagem ao invés de loading infinito
- **Anti-crash no servidor** — handlers para `uncaughtException` e `unhandledRejection` previnem que o processo morra por erros da API do Gemini

---

## [1.0.0] - 2026-07-11 (apresentação)

### Removido

- **Respostas simuladas no backend** — O backend de produção não contém mais respostas mockadas. O modo demo/simulado existe apenas na POC standalone (`clearit-copilot`). O backend final sempre consulta a API do Gemini em tempo real.
- **Fallback para localhost no widget** — O widget FreshService não tenta mais `http://localhost:3000` como fallback. A URL do backend é obrigatoriamente configurada via `iparams` (`backend_url`). Isso evita comportamento inesperado em produção.

### Adicionado

- **Endpoint `/api/web-search`** — Nova rota que realiza busca na web e retorna um **resumo textual** gerado pela IA ao invés de uma lista de links. O usuário recebe uma resposta consolidada e útil sem precisar navegar para fora do ticket.
- **Análise de compatibilidade (diagnóstico interno vs web)** — O sistema agora avalia internamente se a base de conhecimento local é suficiente para responder. Caso contrário, sugere complementar com busca na web. Essa decisão é transparente para o usuário.
- **Botões "Regerar" e "Buscar na web"** — Após cada resposta, o usuário pode:
  - **Regerar**: solicitar nova resposta com o mesmo contexto (útil se a resposta não foi satisfatória).
  - **Buscar na web**: acionar o endpoint `/api/web-search` para complementar com informações externas.
- **Chat sempre visível após resultado** — O campo de chat permanece visível após a primeira resposta ser exibida, permitindo perguntas de follow-up sem recarregar o widget.
- **Feedback com retry para cold start do Render** — O sistema de feedback agora implementa retry automático com backoff quando o backend no Render está em cold start. O usuário vê um indicador de "enviando..." ao invés de erro imediato.

### Alterado

- **Confiança movida para após as fontes** — O indicador de nível de confiança da resposta agora aparece **abaixo** da seção de fontes, seguindo o fluxo de leitura: resposta → fontes → confiança. Anteriormente ficava no topo.
- **Integração FreshService atualizada** — Migração completa para:
  - **FDK 10.x** (Freshworks Developer Kit)
  - **Platform 3.0** (sem campo `product` no `manifest.json`)
  - **Node.js 24.11** (requerido pelo FDK 10 para empacotamento)

---

## Próximos Passos — Curadoria de Feedback (sugestão da banca avaliadora)

### Problema identificado
Aceitar feedback cegamente e re-ingerir na base vetorial pode:
- **Poluir a base** com informações redundantes (ticket já existe com mesma resolução)
- **Gerar falsos positivos** — o problema foi resolvido por outro motivo no meio do caminho, mas o analista marcou como "útil"
- **Acumular ruído** — respostas genéricas aprovadas por conveniência que não agregam valor real

### Solução proposta: Pipeline de Regulação

```
Analista marca como "Útil"
        ↓
[1] Verificação de duplicidade
    → Calcular similaridade com fontes já existentes na base
    → Se >85% similar a algo que já existe → descarta (não re-ingere)
        ↓
[2] Verificação de temporalidade
    → Se o ticket foi resolvido >24h após a sugestão do Copilot
    → Marcar como "resolução incerta" (pode ter sido outra ação)
        ↓
[3] Validação por volume
    → Só re-ingerir quando a mesma sugestão for aprovada por 2+ analistas diferentes
    → Evita bias individual
        ↓
[4] Revisão periódica (semanal)
    → Analista sênior ou gestor revisa batch de sugestões aprovadas
    → Aprova/rejeita re-ingestão manualmente
        ↓
[5] Re-ingestão controlada
    → Gera embedding apenas do conteúdo aprovado no gate
    → Adiciona à base com tag "feedback_validado" + timestamp
    → Permite rollback se necessário
```

### Implementação técnica (futuro)

| Etapa | Complexidade | Dependência |
|-------|-------------|-------------|
| Duplicidade (cosine >85%) | Baixa | Embeddings já existem |
| Temporalidade (timestamp ticket vs feedback) | Baixa | Integração com API FreshService |
| Validação por volume (2+ analistas) | Média | Identificação de analista no feedback |
| Revisão sênior | Média | Dashboard de curadoria |
| Re-ingestão com tag | Baixa | Job periódico no Firestore |

### Benefício
A base de conhecimento cresce de forma **controlada e confiável**, evitando degradação da qualidade de busca ao longo do tempo.

---

## Melhorias Futuras

### Alta prioridade (pós-entrega imediata)

| Melhoria | Justificativa |
|----------|---------------|
| **Autenticação (API key ou JWT)** | API está aberta — qualquer um acessa `/api/analyze`. Em produção com dados de clientes, é inaceitável. Cada instalação (FreshService, Slack) recebe key própria. |
| **Observabilidade e logging estruturado** | Sem logging por etapa, não dá pra diagnosticar quando algo fica lento. Registrar tempo de: mascaramento, embedding, busca, geração. Alertas para taxa de rejeição >30%. |
| **Validação da resposta antes de exibir** | Se o Gemini retornar JSON malformado, alucinação óbvia ou resposta fora do formato, interceptar antes de mostrar ao analista. Gate de qualidade na saída. |

### Média prioridade (próximas sprints)

| Melhoria | Justificativa |
|----------|---------------|
| **Cache inteligente** | Se o mesmo problema foi consultado nos últimos 30 min, retornar cache. Economiza chamadas ao Gemini e reduz latência pra <500ms. |
| **Métricas de uso por categoria** | Dashboard pro gestor: quais tipos de problema são mais consultados, taxa de aceitação por categoria, tempo médio de resposta. Identifica onde faltam KBs. |
| **Chunking da base de dados** | Hoje indexa ticket inteiro como 1 embedding. Para tickets longos, dividir em chunks de ~300 tokens melhora precisão da busca semântica (recomendação IBM RAG Cookbook). |
| **Widget com estados visuais** | Loading skeleton ao invés de spinner, transições suaves, estado "sem conexão" gracioso. Seguir padrão visual Freshworks Dew (lançado dez/2025). |
| **Pipeline de curadoria de feedback** | Verificação de duplicidade, temporalidade, volume mínimo e revisão humana antes de re-ingerir na base (detalhado acima). |

### Longo prazo

| Melhoria | Justificativa |
|----------|---------------|
| **Webhook proativo (Zabbix/Datadog)** | Alerta de monitoramento dispara → Copilot pré-diagnostica → ticket nasce com sugestão anexada. Sistema reativo vira proativo. |
| **Multi-tenant (SaaS)** | Cada cliente com base isolada, billing separado, mascaramento customizável. Permite vender como produto. |
| **Fine-tuning do modelo** | Após 500+ interações curadas pelo pipeline de regulação. Modelo cada vez mais especializado no domínio da ClearIT. |
| **Integração Slack/Teams** | Bot que recebe descrição do problema e retorna diagnóstico no canal. Mesmo backend, nova interface. |
| **Análise de tendências** | Job periódico que identifica picos de problemas similares e alerta o gestor proativamente. |
