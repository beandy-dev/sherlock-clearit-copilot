# Pesquisa Técnica — Geração de Dados Fictícios para Testes

## Por que dados fictícios

A ClearIT não vai liberar acesso ao sistema produtivo. O Alexandre confirmou: "trabalhar com dados fictícios, pode pegar dados da base real e alterar informações sensíveis". O consultor Gustavo reforçou que é fácil gerar dados fictícios com IA para treinar o modelo.

## Estrutura dos Dados (baseada no FreshService)

### Ticket (chamado)

```json
{
  "id": 10234,
  "subject": "Falha no backup noturno - Servidor PROD-DB-01",
  "description": "Cliente reporta que o job de backup agendado para 02h00 não completou. Log indica timeout na conexão com o storage. Ambiente: Commvault v11, storage NetApp.",
  "status": "closed",
  "priority": "high",
  "category": "Backup",
  "subcategory": "Commvault",
  "created_at": "2026-05-10T08:30:00Z",
  "resolved_at": "2026-05-10T12:45:00Z",
  "tags": ["commvault", "backup", "timeout", "netapp"],
  "resolution_notes": "Causa: timeout por fragmentação no volume NetApp. Solução: executar vol realloc no volume de destino e reagendar o job. KB relacionado: KB-0087.",
  "agent": "Analista Fictício",
  "conversations": [
    {
      "body": "Verificado nos logs do Commvault: erro CVTimeout no media agent. Consultado KB-0087 sobre fragmentação.",
      "created_at": "2026-05-10T09:15:00Z"
    },
    {
      "body": "Executado vol realloc no NetApp. Job de backup reagendado e executado com sucesso às 14h.",
      "created_at": "2026-05-10T12:30:00Z"
    }
  ]
}
```

### Knowledge Base Article (KB)

```json
{
  "id": "KB-0087",
  "title": "Commvault - Timeout no backup por fragmentação de volume NetApp",
  "description": "Quando o job de backup do Commvault retorna CVTimeout ao tentar gravar no storage NetApp, a causa mais comum é fragmentação elevada no volume de destino. Solução: executar 'vol realloc' no volume afetado via CLI do NetApp e reagendar o job.",
  "category": "Backup",
  "tags": ["commvault", "netapp", "timeout", "fragmentação"],
  "created_at": "2026-03-15T10:00:00Z"
}
```

## Cenários de Teste Recomendados

Para validar os critérios de aceite, precisamos de pelo menos 20 tickets fictícios que cubram:

### Cenário 1: Mesmo problema, títulos diferentes (testar busca semântica)
| Ticket A | Ticket B | Mesmo problema? |
|----------|----------|-----------------|
| "Falha no backup noturno" | "Erro no snapshot do Commvault" | Sim |
| "Email não chega ao destinatário" | "Fila de SMTP travada" | Sim |
| "VPN desconecta intermitente" | "Túnel IPSec cai toda hora" | Sim |
| "Servidor lento" | "Alta utilização de CPU no host" | Sim |
| "Acesso negado ao file server" | "Permissão NTFS incorreta" | Sim |

### Cenário 2: Descrição vaga (testar troubleshooting)
- "Sistema não funciona"
- "Cliente reclama de lentidão"
- "Algo deu errado no servidor"
- "Backup falhou"
- "Usuário não consegue acessar"

### Cenário 3: Problema com solução documentada no KB
- Ticket descreve problema → solução existe em KB interno
- Agente deve encontrar o KB e sugerir a solução com link

### Cenário 4: Problema resolvido apenas em ticket antigo (sem KB)
- Solução existe só nas conversation notes de um ticket fechado
- Agente deve encontrar o ticket similar e extrair a resolução

## Como Gerar com IA

Prompt para gerar a base fictícia:

```
Gere 20 tickets fictícios de suporte técnico de infraestrutura de TI no formato JSON.
Cada ticket deve ter: id, subject, description, status (closed), priority, category,
subcategory, tags, resolution_notes, conversations (array com pelo menos 2 entradas).

Requisitos:
- Categorias: Backup, Rede, Servidor, Segurança, Email, Storage
- Fabricantes: Commvault, Fortinet, VMware, NetApp, Microsoft, Cisco
- Incluir 5 pares de tickets que descrevem o MESMO problema com títulos DIFERENTES
- Incluir 5 tickets com descrição VAGA (sem detalhes técnicos)
- Dados completamente fictícios (nomes, IPs, empresas inventados)
- Não incluir nenhum dado pessoal real
```

## Ferramentas para Gerar

- **ChatGPT/Claude:** Gerar os JSONs diretamente com o prompt acima
- **Python + Faker:** Para dados complementares (datas, IDs, nomes)
- **Vertex AI (Gemini):** Pode gerar direto no ambiente de desenvolvimento

## Organização dos Arquivos

```
data/
├── tickets_ficticios.json      # 20 tickets completos
├── kbs_ficticios.json          # 10 artigos de KB
└── README.md                   # Explicação da estrutura
```

## Referências

- Faker (Python): https://faker.readthedocs.io/
- FreshService API schema: https://api.freshservice.com/#tickets
