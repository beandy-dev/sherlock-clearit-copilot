# Business Context Lite — Squad Sherlock (B5)

## Visão do Produto

Centralizar e tornar acessível o conhecimento técnico da ClearIT no momento do atendimento, apoiando os analistas de suporte L1 na tomada de decisão com sugestões automáticas de diagnóstico e resolução baseadas no histórico de chamados, base de conhecimento interna e documentação de fabricantes.

## Quem sofre com o problema

Os **analistas de suporte Nível 1** da ClearIT. Eles são a primeira linha de atendimento e enfrentam maior dificuldade para realizar diagnósticos assertivos porque o conhecimento necessário está disperso em múltiplas fontes. Os **clientes da ClearIT** sofrem o impacto indireto: tempo de resolução maior e, em casos críticos, indisponibilidade prolongada de infraestrutura.

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
- Menor risco de impacto no negócio do cliente por demora

## Indicadores de Sucesso (KPIs)

1. **Redução do MTTR/TMR** — Tempo médio de resolução dos chamados
2. **Melhoria do CSAT** — Resultado da pesquisa de satisfação enviada ao fechar cada chamado

## História de Usuário

Como **analista de suporte L1**, quero receber sugestões automáticas de diagnóstico e resolução com base nos logs e na base de conhecimento da empresa, para que eu possa resolver chamados com mais agilidade, precisão e sem depender exclusivamente dos analistas de níveis superiores.

## Critérios de Aceite

1. O agente identifica tickets antigos com problema similar mesmo quando os títulos são diferentes (busca semântica), retornando correspondência relevante em pelo menos 80% dos casos testados com uma base fictícia de 20 chamados.

2. O agente retorna um diagnóstico provável e pelo menos uma solução aplicável em 80% dos chamados submetidos, validado contra uma base de teste com respostas conhecidas.

3. 100% das respostas geradas pelo agente incluem a fonte da sugestão (ID do ticket de referência, link do KB interno ou documentação do fabricante), permitindo que o analista verifique a origem antes de aplicar.

4. Quando a descrição do chamado é vaga ou insuficiente para diagnóstico, o agente sugere passos de troubleshooting e coleta de logs em vez de propor uma solução direta, evitando instruções incorretas ao cliente.

5. O analista pode aceitar, editar ou rejeitar qualquer sugestão do agente antes que ela seja utilizada — nenhuma resposta é enviada ou aplicada automaticamente sem validação humana.

## Restrições e Regras de Negócio

1. A solução deve estar em conformidade com a **LGPD**, sem expor dados pessoais ou sensíveis dos clientes nas respostas ou logs do agente.
2. O assistente possui **caráter consultivo** — sugere diagnósticos e soluções, mas a decisão final é sempre do analista humano.
3. O desenvolvimento será feito com **dados fictícios**, sem integração com a base produtiva da ClearIT.
4. Preferência por **Google Cloud** como infraestrutura (migração corporativa em andamento).
5. A integração com o FreshService será via **API REST** (documentação pública disponível).

## Formato Esperado da Resposta do Agente

O cliente validou que o output do agente deve conter:

1. **Diagnóstico provável** — baseado na descrição do problema
2. **Possíveis soluções** — uma ou mais opções, ranqueadas por relevância
3. **Fonte** — de onde veio a sugestão (ticket #X, KB #Y, documentação do fabricante Z)
4. **Troubleshooting** (quando necessário) — se a descrição for vaga, sugerir passos de investigação/coleta de logs antes de propor solução

## Backlog de Features (prioridade validada pelo cliente)

| # | Feature | Valor | Status |
|---|---------|-------|--------|
| 1 | Busca inteligente em chamados encerrados (busca semântica) | Maior valor — prioridade #1 da Bia | Pronto para Dev |
| 2 | Consulta em KBs internos do FreshService | Alto | Pronto para Dev |
| 3 | Busca em documentação de fabricantes na web | Médio-Alto | Pronto para Dev |
| 4 | Sugestão de diagnóstico + soluções com fonte | Alto | Pronto para Dev |
| 5 | Sugestão de troubleshooting quando descrição é vaga | Médio | Pronto para Dev |

## Riscos Identificados

- **Resposta errada é pior que nenhuma resposta** — instrução incorreta pode causar impacto no ambiente do cliente. O agente deve indicar nível de confiança ou sinalizar quando não tem certeza.
- **Títulos diferentes para o mesmo problema** — exige busca semântica, não apenas keyword matching. É o core técnico do desafio.
- **Fabricantes com pouca documentação pública** (ex: Commvault) — para esses, a busca no histórico de tickets é ainda mais crítica.

## Informações Técnicas de Referência

| Item | Detalhe |
|------|---------|
| Plataforma de chamados | FreshService (ITSM SaaS) |
| Acesso à base | Via API REST (GET para tickets e solution articles) |
| Cloud preferido | Google Cloud |
| Dados para dev | Fictícios (gerados com IA ou anonimizados) |
| Base de KBs | Estruturada: categorias + fabricante + IDs nos títulos |
| Tipo de problemas | Geralmente software |
| SLAs | Resposta: até 2h / Solução: Alta 4h, Média 8h, Baixa 16h |
| Indicadores do dia a dia | Aging + quanto falta para estourar SLA |

---

*Documento gerado com base no Sprint de Validação com ClearIT — Desafio B Serviços — Pulse Mais 2026*
*Squad Sherlock (B5) — Status: Pronto para Dev*
