# core/embeddings/base_embeddings.py
from abc import ABC, abstractmethod
from typing import List

class BaseEmbeddingModel(ABC):
    def __init__(self, model_name: str):
        self.model_name = model_name

    @abstractmethod
    def embed_query(self, text: str) -> List[float]:
        """Transforme une question utilisateur en un seul vecteur."""
        pass

    @abstractmethod
    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """Transforme une liste de chunks en une liste de vecteurs."""
        pass