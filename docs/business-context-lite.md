# Business Context Lite — Squad Sherlock (B5)

## Visão do Produto

Centralizar e tornar acessível o conhecimento técnico da ClearIT no momento do atendimento, apoiando os analistas de suporte L1 na tomada de decisão com sugestões automáticas de diagnóstico e resolução baseadas no histórico de chamados, base de conhecimento interna e documentação de fabricantes.

## Quem sofre com o problema

Os **analistas de suporte Nível 1** da ClearIT. Eles são a primeira linha de atendimento e enfrentam maior dificuldade para realizar diagnósticos assertivos porque o conhecimento necessário está disperso em múltiplas fontes. Os **clientes da ClearIT** sofrem o impacto indireto: tempo de resolução maior e, em casos críticos, indisponibilidade prolongada de infraestrutura.

## Persona

### Felipe — Analista de Suporte L1

**Cargo:** Analista de Suporte Nível 1

**Contexto**
Responsável pelo primeiro atendimento técnico da ClearIT. Trabalha diariamente no FreshService analisando chamados relacionados a infraestrutura, redes, backup, virtualização e servidores. Precisa consultar diferentes fontes de informação para diagnosticar incidentes com agilidade e manter os SLAs sob controle.

**Principais dores**
- Gasta mais tempo procurando informações do que aplicando soluções.
- O mesmo incidente pode aparecer com títulos diferentes em chamados antigos.
- Precisa consultar múltiplas bases de conhecimento, tickets antigos e documentações externas.
- Escala chamados para L2/L3 quando não consegue localizar rapidamente soluções já existentes.
- Tem dificuldade para padronizar respostas técnicas quando o histórico está espalhado.

**Objetivos**
- Resolver mais chamados diretamente no L1.
- Reduzir o tempo médio de resolução (MTTR/TMR).
- Receber sugestões de diagnóstico acompanhadas da fonte utilizada.
- Padronizar as respostas enviadas aos clientes.
- Ganhar autonomia técnica sem depender sempre de analistas seniores.

## Dores Priorizadas

**Dor 1 — Dificuldade no acesso e consulta do conhecimento técnico**
O conhecimento está disperso entre tickets encerrados no FreshService, KBs internos e documentação dos fabricantes. A busca na plataforma é limitada — exige termos exatos. O mesmo problema aparece com títulos diferentes em tickets distintos, tornando impossível encontrar soluções que já existem. Fabricantes como Commvault quase não têm KB público, concentrando todo o conhecimento nos chamados internos.

**Dor 2 — Tempo excessivo gasto na busca pela solução**
A atividade que mais consome tempo do analista L1 é procurar a resolução — não executá-la. Cada analista precisa reconstruir o diagnóstico praticamente do zero a cada incidente, mesmo quando a solução já foi aplicada antes por outro analista.

**Dor 3 — Escalonamentos desnecessários causados pela dificuldade de encontrar soluções já existentes**
Quando o L1 não encontra a informação após pesquisar em todas as fontes disponíveis, escala para L2/L3 ou fabricante. Em muitos casos, a solução existia em um ticket antigo ou KB, mas não foi localizada. Isso sobrecarrega os níveis superiores com demandas que poderiam ter sido resolvidas no L1.

## Impacto (se resolvermos essas dores, a empresa ganha)

- Menor MTTR/TMR (tempo médio de resolução)
- Maior produtividade do suporte L1
- Mais resoluções no primeiro contato
- Menos escalonamentos desnecessários para L2/L3
- Maior satisfação dos clientes (CSAT)
- Menor risco de impacto no negócio

---

## Backlog de Épicos e Features

| ID | Feature | Status | Descrição |
|---|---|---|---|
| F-01 | Busca Semântica de Tickets/KBs | Pronto para Dev | RAG para busca de tickets e KBs relevantes no banco vetorial |
| F-02 | Geração de Diagnóstico e Resolução | Pronto para Dev | LLM (Gemini) gera diagnóstico e sugestões a partir das fontes |
| F-03 | Guia de Troubleshooting Vago | Pronto para Dev | Guia passo a passo quando o chamado for muito vago/incompleto |

---

## Especificações Ativas

### Feature F-01: Busca Semântica de Tickets/KBs
- **História do Usuário:** Como Felipe, quero descrever um sintoma ou colar um erro de chamado e encontrar tickets semelhantes resolvidos anteriormente, mesmo que usem termos diferentes, para que eu possa ver como outros analistas resolveram o problema.
- **Critérios de Aceite:**
  1. A busca deve retornar os 3 tickets ou artigos de KB mais similares com base no significado da descrição.
  2. Cada resultado deve exibir uma pontuação de similaridade (de 0 a 100%).
  3. A busca deve suportar erros de digitação e termos equivalentes (ex: "timeout no backup" e "erro CVTimeout NetApp").

### Feature F-02: Geração de Diagnóstico e Resolução
- **História do Usuário:** Como Felipe, quero receber um diagnóstico pré-pronto e instruções de como corrigir o incidente atual com base nas fontes encontradas, para que eu não precise ler cada ticket manualmente para extrair a solução.
- **Critérios de Aceite:**
  1. O Sherlock deve gerar um relatório curto contendo: "Causa Provável", "Ações Recomendadas" e "Fontes de Referência".
  2. Todas as sugestões devem conter a fonte de onde a informação foi tirada (link ou ID do ticket).
  3. Se houver contradição nas fontes, a IA deve indicar ambos os caminhos.

### Feature F-03: Guia de Troubleshooting Vago
- **História do Usuário:** Como Felipe, quando receber um chamado vago como "A internet não funciona", quero que a IA me sugira perguntas de triagem ou um checklist básico de testes a serem executados, para que eu possa obter mais detalhes do cliente.
- **Critérios de Aceite:**
  1. Se a descrição contiver menos de 15 caracteres ou for considerada muito genérica, o Sherlock deve apresentar um checklist interativo de perguntas de troubleshooting para L1.
