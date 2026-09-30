# core/cleaner/base_cleaner.py
from abc import ABC, abstractmethod

class BaseCleaner(ABC):
    @abstractmethod
    def clean(self, text: str) -> str:
        """Nettoie et normalise un texte brut."""
        pass