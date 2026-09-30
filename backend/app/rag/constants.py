# app/rag/constants.py

RAG_OPTIONS = {
    "rag_types": [
        {"id": "naive", "label": "RAG Naïf (Standard)"},
        {"id": "hybrid", "label": "RAG Hybride (BM25 + Dense)"},
        {"id": "agentic", "label": "RAG Agentique (Réflexif)"}
    ],
    "chunking_strategies": [
        {"id": "fixed_size", "label": "Taille fixe (Fixed Size)"},
        {"id": "semantic", "label": "Découpage Sémantique"}
    ],
    "vectorstores": [
        {"id": "chroma", "label": "ChromaDB"},
        {"id": "pgvector", "label": "PGVector (PostgreSQL)"},
        {"id": "faiss", "label": "FAISS"}
    ],
    "embedding_models": [
        {"id": "all-MiniLM-L6-v2", "label": "all-MiniLM-L6-v2 (Rapide / Léger)"},
        {"id": "text-embedding-3-small", "label": "OpenAI Text Embedding 3"},
        {"id": "bge-m3", "label": "BAAI BGE-M3 (Multilingue)"}
    ],
    "llm_providers": [
        {"id": "ollama", "label": "Ollama (Local)"},
        {"id": "openai", "label": "OpenAI (API)"}
    ],
    "llm_models": [
        {"id": "llama3.2:latest", "label": "Llama 3.2"},
        {"id": "mistral:latest", "label": "Mistral 7B"},
        {"id": "gpt-4o-mini", "label": "GPT-4o Mini"}
    ]
}

