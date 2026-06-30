# Sherlock — Copiloto de Suporte para ClearIT

Agente de IA que auxilia analistas de suporte L1 a diagnosticar e resolver incidentes com mais agilidade, buscando automaticamente em bases de conhecimento, histórico de chamados e documentação técnica.

## O Problema

Os analistas de suporte da ClearIT gastam a maior parte do tempo **buscando informação** — não resolvendo o problema. O conhecimento está disperso entre tickets antigos, KBs internos e documentação de fabricantes. A busca da plataforma atual (FreshService) exige termos exatos, e o mesmo problema aparece com títulos diferentes em tickets distintos.

Resultado: tempo de resolução elevado, escalonamentos desnecessários e retrabalho.

## A Solução

Um copiloto que:
- Recebe a descrição do problema do analista
- Busca semanticamente em chamados encerrados e KBs (mesmo com títulos diferentes)
- Sugere diagnóstico, soluções possíveis e fontes de referência
- Quando a descrição é vaga, sugere passos de troubleshooting

O analista **sempre** valida antes de aplicar qualquer sugestão.

## Estrutura do Repositório

```
docs/
├── business-context-lite.md          # Especificação de produto
└── knowledge-base/
    ├── freshservice-api.md           # Pesquisa: API do FreshService
    ├── busca-semantica-rag.md        # Pesquisa: Arquitetura RAG + Vertex AI
    └── dados-ficticios.md            # Pesquisa: Geração de dados de teste
```

## Stack Planejada

- **Google Cloud** (Vertex AI)
- **Gemini Pro** — geração de respostas
- **Text-embedding-004** — embeddings para busca semântica
- **LangChain** — orquestração RAG
- **ChromaDB** — vector store para protótipo

## Squad Sherlock (B5)

| Membro | Frente |
|--------|--------|
| Beatriz Andrade Lourenço | Negócios e Estratégia |
| Davi da Paz Mota | Tecnologia e Produto |
| Maria Eduarda Ferreira Santos | Tecnologia e Produto |
| Maria Eloisa Gomes da Conceição | Negócios e Estratégia |
| Phelipe Alexandre de Almeida | Tecnologia e Produto |

## Status

**Sprint 1 (Descoberta):** ✅ Concluído — Feature "Pronto para Dev"

---

*Desafio B — Serviços | Pulse Mais 2026*
