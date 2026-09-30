# core/vector_stores/base_vector_store.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseVectorStore(ABC):
    """Interface abstraite pour standardiser les bases de données vectorielles."""
    
    def __init__(self, embedding_model):
        self.embedding_model = embedding_model

    @abstractmethod
    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        """Indexe les documents (textes + métadonnées) dans le store."""
        pass

    @abstractmethod
    def similarity_search(self, query: str, k: int = 4) -> List[Dict[str, Any]]:
        """Effectue une recherche sémantique et retourne les K documents les plus proches."""
        pass
