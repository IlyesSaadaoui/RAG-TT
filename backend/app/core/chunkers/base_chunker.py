# core/chunkers/base_chunker.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseChunker(ABC):
    def __init__(self, chunk_size: int, chunk_overlap: int):
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap

    @abstractmethod
    def split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Prend une liste de documents nettoyés et retourne une liste de chunks."""
        pass
