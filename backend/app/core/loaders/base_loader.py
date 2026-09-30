# core/loaders/base_loader.py
from abc import ABC, abstractmethod
from pathlib import Path

class BaseFileLoader(ABC):
    @abstractmethod
    def read_text(self, file_path: Path) -> str:
        """
        Extrait le texte brut d'un fichier spécifique.
        Chaque format (PDF, DOCX, TXT) doit implémenter cette méthode.
        """
        pass

    