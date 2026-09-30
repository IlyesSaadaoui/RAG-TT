# app/models/search_space.py
from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base


class SearchSpaceModel(Base):
    """
    Registre des configurations RAG déjà traitées par le moteur ECEE.

    Chaque configuration est identifiée de façon unique par son config_hash,
    ce qui permet de vérifier facilement si elle a déjà été stockée
    (et donc déjà testée), avant de la traiter à nouveau.
    """
    __tablename__ = "search_space"

    id = Column(Integer, primary_key=True, index=True)

    # Empreinte unique de la configuration (calculée à partir de ses paramètres)
    config_hash = Column(String, unique=True, nullable=False, index=True)

    # --- Paramètres de la configuration ---
    rag_type = Column(String, nullable=False)  # ex: 'naive', 'hybrid', 'agentic'

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

    created_at = Column(DateTime, default=datetime.utcnow)