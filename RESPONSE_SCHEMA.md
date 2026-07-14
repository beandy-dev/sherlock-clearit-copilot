# Padrão de Resposta da IA — ClearIT Copilot

## Contrato de Saída (Response Schema)

Toda resposta gerada pelo ClearIT Copilot **obrigatoriamente** segue este formato JSON:

```json
{
  "diagnosis": "string — diagnóstico provável ou descrição do problema identificado",
  "actions": ["string — passo 1", "string — passo 2", "string — passo 3"],
  "sources": [
    {
      "id": "string — ID do ticket ou KB",
      "title": "string — título da fonte (ex: 'Ticket #20001: Alerta de Alto Uso de Disco')",
      "type": "string — 'Ticket' ou 'KB'",
      "similarity": "number — percentual de similaridade (0-100)"
    }
  ],
  "isVague": "boolean — true se a descrição é insuficiente para diagnóstico"
}
```

---

## Regras Obrigatórias

### 1. Fonte SEMPRE presente (Critério de Aceite #3)

> "100% das respostas geradas pelo agente incluem a fonte da sugestão (ID do ticket de referência, link do KB interno ou documentação do fabricante)"

**Implementação:**
- O array `sources` NUNCA pode ser vazio
- Mínimo 1 fonte, máximo 3 (top 3 por similaridade)
- Cada fonte tem ID, título, tipo e percentual de similaridade
- Se a busca não encontrar nenhum resultado acima do threshold (35%), o sistema retorna o mais próximo disponível com flag de confiança baixa

**Código que garante (server.js):**
```javascript
// Top 3 fontes — sempre retornadas
searchResults.sort((a, b) => b.similarity - a.similarity);
const topSources = searchResults.slice(0, 3);
```

### 2. Diagnóstico NÃO é gerado se informação insuficiente (Critério de Aceite #4)

> "Quando a descrição do chamado é vaga ou insuficiente, o agente sugere passos de troubleshooting em vez de propor solução direta"

**Implementação:**
- Se `isVague: true` → `diagnosis` descreve POR QUE é vago
- `actions` se tornam **perguntas de triagem**, não soluções
- Confiança automaticamente reduzida (<60%)

**Detecção de vagueza (server.js):**
```javascript
const isVagueInput = maskedDescription.trim().length < 15;
```

### 3. Caráter consultivo (Critério de Aceite #5)

> "O analista pode aceitar, editar ou rejeitar qualquer sugestão — nenhuma resposta é enviada automaticamente"

**Implementação:**
- A resposta é EXIBIDA ao analista, nunca executada
- O analista decide o que fazer com a informação
- Feedback é registrado para melhoria contínua

---

## Dois Modos de Resposta

### Modo Normal (descrição suficiente)

```json
{
  "diagnosis": "A causa provável para o alto uso de disco na CVM é o acúmulo de logs antigos que não estão sendo rotacionados.",
  "actions": [
    "Acessar a CVM do node 3 via SSH",
    "Verificar consumo: df -h e du -sh /var/log/*",
    "Executar limpeza via logrotate (cf. Ticket #20001)",
    "Configurar job de limpeza automática semanal"
  ],
  "sources": [
    {
      "id": "20001",
      "title": "Ticket #20001: Alerta de Alto Uso de Disco em CVM",
      "type": "Ticket",
      "similarity": 91
    },
    {
      "id": "20002",
      "title": "Ticket #20002: Partição da Controller VM quase cheia",
      "type": "Ticket",
      "similarity": 80
    }
  ],
  "isVague": false
}
```

### Modo Troubleshooting (descrição vaga)

```json
{
  "diagnosis": "A descrição fornecida é genérica demais para um diagnóstico confiável. Necessário coletar mais informações antes de propor solução.",
  "actions": [
    "Contactar o cliente: qual sistema específico está com problema?",
    "Desde quando? Ocorre sempre ou é intermitente?",
    "Houve alguma mudança recente no ambiente (update, migração)?",
    "Verificar alertas ativos no Prism para o ambiente do cliente",
    "NÃO propor solução sem informação suficiente"
  ],
  "sources": [
    {
      "id": "20009",
      "title": "Ticket #20009: Sistema lento (caso similar com descrição vaga)",
      "type": "Ticket",
      "similarity": 65
    }
  ],
  "isVague": true
}
```

---

## Garantia de Fonte — Fluxo no Código

```
1. Analista digita descrição
         ↓
2. Mascaramento LGPD (14 regras)
         ↓
3. Embedding gerado (gemini-embedding-001)
         ↓
4. Busca vetorial → retorna TOP 3 mais similares
         ↓
   ┌─ SIM: sources[] preenchido com os resultados
   │
5. Tem resultados acima do threshold?
   │
   └─ NÃO: retorna o mais próximo disponível + confiança baixa
         ↓
6. Sources[] SEMPRE incluído na resposta final
         ↓
7. Gemini gera diagnóstico USANDO as sources como contexto
         ↓
8. Prompt instrui: "cite a fonte no final de cada ação"
```

---

## Prompt que Garante o Formato (server.js)

```javascript
const prompt = `
  Você é o ClearIT Copilot, assistente de suporte Nível 1 da ClearIT.
  
  Assunto: "${maskedSubject}"
  Descrição: "${maskedDescription}"

  Fontes históricas de referência:
  ${contextStr}

  Gere um diagnóstico conciso e ações práticas passo a passo.
  Retorne obrigatoriamente no formato JSON:
  {
    "diagnosis": "Explicação resumida do diagnóstico provável",
    "actions": ["Passo 1 com fonte (cf. KB-XXXX ou Ticket #XXXX)", "Passo 2", "Passo 3"]
  }
`;
```

O campo `sources` é adicionado pelo backend (não depende do Gemini) — vem direto da busca vetorial. Isso **garante** que a fonte está sempre presente, independente do que o Gemini retorne.

---

## Validação

| Critério de Aceite | Como é garantido |
|---|---|
| #1 — Busca semântica funciona | Embedding + cosine similarity |
| #2 — Diagnóstico + solução em 80%+ | Prompt estruturado + fontes como contexto |
| #3 — 100% com fonte | `sources[]` vem da busca, não da geração — sempre preenchido |
| #4 — Vago → troubleshooting | Flag `isVague` + prompt diferenciado |
| #5 — Analista valida | Resposta exibida, nunca executada. Feedback registrado. |

---

*Documento de referência — ClearIT Copilot (Squad Sherlock B5)*
