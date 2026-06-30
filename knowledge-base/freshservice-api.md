# Pesquisa Técnica — API do FreshService

## O que é o FreshService

FreshService é uma plataforma ITSM (IT Service Management) SaaS da Freshworks. É o sistema usado pela ClearIT para gerenciar chamados de suporte, base de conhecimento (KBs) e histórico de atendimentos.

## API REST — Visão Geral

- **Tipo:** REST API
- **Autenticação:** API Key (Basic Auth — API key como username, senha vazia)
- **Base URL:** `https://{dominio}.freshservice.com/api/v2/`
- **Formato:** JSON
- **Rate Limit:** Varia por plano (geralmente 1000 req/hora no plano mais comum)
- **Documentação oficial:** https://api.freshservice.com/

## Endpoints Relevantes para o Desafio

### 1. Tickets (Chamados)

**Listar tickets:**
```
GET /api/v2/tickets
```

**Filtrar tickets por status (fechados/resolvidos):**
```
GET /api/v2/tickets?filter=resolved
GET /api/v2/tickets?filter=closed
```

**Buscar ticket específico:**
```
GET /api/v2/tickets/{id}
```

**Buscar conversas/logs de um ticket:**
```
GET /api/v2/tickets/{id}/conversations
```

Campos úteis retornados:
- `subject` — título do chamado
- `description_text` — descrição em texto puro
- `status` — status atual (2=Open, 3=Pending, 4=Resolved, 5=Closed)
- `priority` — prioridade (1=Low, 2=Medium, 3=High, 4=Urgent)
- `category` — categoria do chamado
- `created_at` / `updated_at` — timestamps
- `tags` — tags associadas

### 2. Knowledge Base (Solution Articles)

**Listar categorias de KB:**
```
GET /api/v2/solutions/categories
```

**Listar artigos de uma pasta:**
```
GET /api/v2/solutions/folders/{folder_id}/articles
```

**Buscar artigo específico:**
```
GET /api/v2/solutions/articles/{id}
```

**Buscar artigos por keyword:**
```
GET /api/v2/solutions/articles?search_term={termo}
```

Campos úteis:
- `title` — título do artigo
- `description` — conteúdo completo (HTML)
- `category_id` — categoria
- `folder_id` — pasta
- `tags` — tags
- `status` — publicado/rascunho

### 3. Search (Busca Global)

```
GET /api/v2/search/tickets?query="falha backup"
```

Limitação: busca por keyword exata — não faz busca semântica. É exatamente esse gap que o agente precisa resolver.

## Autenticação — Exemplo Prático

```python
import requests

API_KEY = "sua_api_key_aqui"
DOMAIN = "clearit"  # exemplo

url = f"https://{DOMAIN}.freshservice.com/api/v2/tickets?filter=closed&per_page=30"

response = requests.get(
    url,
    auth=(API_KEY, "X"),  # senha pode ser qualquer coisa
    headers={"Content-Type": "application/json"}
)

tickets = response.json()["tickets"]
```

## Limitações Relevantes

- **Busca limitada:** Só keyword matching — sem busca semântica nativa
- **Paginação:** Máximo 30 resultados por página, precisa paginar
- **Rate limit:** Respeitar limites para não ser bloqueado
- **Dados sensíveis:** Tickets podem conter PII dos clientes — necessário anonimizar

## Implicações para o Projeto

1. **Extração de dados:** Usar API para extrair tickets fechados e KBs, criar base local anonimizada
2. **Gap de busca:** A busca nativa do FreshService é por keyword — o valor do agente está em fazer busca SEMÂNTICA sobre esses dados
3. **Dados para MVP:** Gerar base fictícia simulando a estrutura real (subject, description, category, tags, conversations)
4. **Integração futura:** Na produção, o agente consultaria a API em tempo real ou sincronizaria periodicamente

## Referências

- Documentação oficial: https://api.freshservice.com/
- Guia de autenticação: https://support.freshservice.com/support/solutions/articles/50000000306
- Limites de API: https://api.freshservice.com/#ratelimit
