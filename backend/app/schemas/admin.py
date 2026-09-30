from pydantic import BaseModel
from typing import List, Optional

class RoleUpdateSchema(BaseModel):
    role: str

class RAGConfigSchema(BaseModel):
    rag_type: str                         # 'naive', 'hybrid', ou 'agentic'
    cleaner: Optional[str] = "standard"
    chunking_strategy: Optional[str] = "fixed_size"
    chunk_size: Optional[int] = 500
    chunk_overlap: Optional[int] = 80
    embedding_model: Optional[str] = "all-MiniLM-L6-v2"
    vectorstore_type: Optional[str] = "chroma"
    retrieval_strategy: Optional[str] = "hybrid"
    top_k: Optional[int] = 4
    llm_provider: Optional[str] = "ollama"
    llm_model: Optional[str] = "llama3.2:latest"

class ReindexGlobalSchema(BaseModel):
    file_paths: Optional[List[str]] = []