# app/models/rag_config.py
from sqlalchemy import Column, Integer, String, Float, DateTime
from datetime import datetime
from app.database import Base

class RAGConfigModel(Base):
    __tablename__ = "rag_configurations"

    id = Column(Integer, primary_key=True, index=True)
    rag_type = Column(String, unique=True, nullable=False, index=True) # ex: 'naive', 'hybrid', 'agentic'
    
    cleaner = Column(String, default="standard")
    chunking_strategy = Column(String, default="fixed_size")
    chunk_size = Column(Integer, default=500)
    chunk_overlap = Column(Integer, default=80)
    
    embedding_model = Column(String, default="all-MiniLM-L6-v2")
    vectorstore_type = Column(String, default="chroma")
    retrieval_strategy = Column(String, default="hybrid")
    top_k = Column(Integer, default=4)
    
    llm_provider = Column(String, default="ollama")
    llm_model = Column(String, default="llama3.2:latest")
    
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)