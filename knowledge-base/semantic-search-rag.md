# Pesquisa Técnica — Busca Semântica com IA (RAG)

## O Problema que Precisamos Resolver

O FreshService busca por keywords exatas. Se um ticket diz "falha no backup" e outro diz "erro no snapshot do Commvault", a busca nativa não conecta os dois — mesmo sendo o mesmo problema. Precisamos de **busca semântica**: encontrar conteúdo por significado, não por palavras exatas.

## O que é RAG (Retrieval-Augmented Generation)

RAG é a arquitetura que combina:
1. **Retrieval** — buscar documentos relevantes numa base de conhecimento
2. **Augmented Generation** — usar esses documentos como contexto para a IA gerar uma resposta

É exatamente o que o agente precisa fazer: buscar tickets/KBs similares e usar como base para sugerir diagnóstico e solução.

## Como Funciona (Fluxo Simplificado)

```
Analista descreve o problema
        ↓
Texto é convertido em EMBEDDING (vetor numérico)
        ↓
Busca por SIMILARIDADE na base de embeddings (tickets + KBs)
        ↓
Top 5 documentos mais similares são recuperados
        ↓
LLM recebe: pergunta do analista + documentos relevantes
        ↓
LLM gera: diagnóstico + solução + fonte
```

## Conceitos-Chave

### Embeddings
Representação numérica (vetor) do significado de um texto. Textos com significado similar ficam próximos no espaço vetorial — mesmo com palavras diferentes.

- "falha no backup" → [0.12, -0.45, 0.78, ...]
- "erro no snapshot do Commvault" → [0.14, -0.43, 0.76, ...] (vetores próximos!)
- "problema com email" → [0.89, 0.12, -0.33, ...] (vetor distante)

### Vector Database (Banco Vetorial)
Banco de dados especializado em armazenar embeddings e fazer busca por similaridade (distância coseno). Opções:

| Ferramenta | Tipo | Google Cloud? | Complexidade |
|-----------|------|---------------|--------------|
| **Vertex AI Vector Search** | Managed (GCP) | ✅ Nativo | Baixa |
| ChromaDB | Open-source, local | Pode rodar em VM | Baixa |
| Pinecone | SaaS | Independente | Baixa |
| Weaviate | Open-source | Pode rodar em GKE | Média |
| pgvector (PostgreSQL) | Extensão do Postgres | Cloud SQL | Média |

### LLM (Large Language Model)
O modelo que gera a resposta final. Opções no Google Cloud:

| Modelo | Acesso | Melhor para |
|--------|--------|-------------|
| **Gemini Pro** | Vertex AI | Geração de resposta, raciocínio |
| Gemini Flash | Vertex AI | Respostas rápidas, menor custo |
| text-embedding-004 | Vertex AI | Gerar embeddings dos textos |

## Arquitetura Proposta para o MVP

```
┌─────────────────────────────────────────────────┐
│                    AGENTE                         │
├─────────────────────────────────────────────────┤
│                                                   │
│  1. Input: descrição do chamado (analista L1)     │
│                                                   │
│  2. Embedding: text-embedding-004 (Vertex AI)     │
│     → converte descrição em vetor                 │
│                                                   │
│  3. Busca: Vector Search                          │
│     → encontra top 5 tickets/KBs similares        │
│                                                   │
│  4. Geração: Gemini Pro (Vertex AI)               │
│     → recebe: pergunta + docs relevantes          │
│     → gera: diagnóstico + solução + fonte         │
│                                                   │
│  5. Output: resposta estruturada pro analista     │
│                                                   │
└─────────────────────────────────────────────────┘
```

## Opções no Google Cloud (preferência do cliente)

### Vertex AI Search (mais simples para MVP)
- Solução managed que já faz RAG out-of-the-box
- Upload de documentos → busca semântica automática
- Integra com Gemini para geração de resposta
- Não precisa gerenciar embeddings manualmente
- **Recomendado para o MVP pela simplicidade**

### Vertex AI + Custom RAG (mais controle)
- Gerar embeddings com text-embedding-004
- Armazenar em Vertex AI Vector Search ou ChromaDB
- Orquestrar com LangChain ou LlamaIndex
- Chamar Gemini Pro para geração
- **Mais trabalho, mas mais customizável**

## Stack Sugerida para o MVP

| Camada | Ferramenta | Justificativa |
|--------|-----------|---------------|
| Embeddings | Vertex AI text-embedding-004 | Nativo GCP, boa qualidade |
| Vector Store | ChromaDB (local) ou Vertex AI Vector Search | Simples para protótipo |
| LLM | Gemini Pro via Vertex AI | Nativo GCP, bom custo-benefício |
| Orquestração | LangChain (Python) | Framework padrão para RAG |
| Interface | Streamlit ou Gradio | Protótipo rápido de chat |

## Exemplo de Código (Conceitual)

```python
from langchain_google_vertexai import VertexAIEmbeddings, ChatVertexAI
from langchain_community.vectorstores import Chroma
from langchain.chains import RetrievalQA

# 1. Criar embeddings
embeddings = VertexAIEmbeddings(model_name="text-embedding-004")

# 2. Carregar base de tickets fictícios no vector store
vectorstore = Chroma.from_documents(tickets_ficticios, embeddings)

# 3. Criar retriever (busca semântica)
retriever = vectorstore.as_retriever(search_kwargs={"k": 5})

# 4. Criar chain RAG com Gemini
llm = ChatVertexAI(model_name="gemini-pro")
qa_chain = RetrievalQA.from_chain_type(
    llm=llm,
    retriever=retriever,
    return_source_documents=True  # retorna a fonte!
)

# 5. Consulta do analista
resultado = qa_chain.invoke("Cliente relata falha no backup noturno do servidor principal")
print(resultado["result"])        # diagnóstico + solução
print(resultado["source_documents"])  # tickets/KBs de referência
```

## Referências

- Vertex AI Search: https://cloud.google.com/vertex-ai-search
- Vertex AI Embeddings: https://cloud.google.com/vertex-ai/docs/generative-ai/embeddings/get-text-embeddings
- LangChain + Vertex AI: https://python.langchain.com/docs/integrations/llms/google_vertex_ai
- RAG explicado: https://cloud.google.com/blog/products/ai-machine-learning/rag-with-vertex-ai
- ChromaDB: https://www.trychroma.com/
