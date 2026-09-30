# core/retrievers/base_retriever.py
from abc import ABC, abstractmethod
from typing import List, Dict, Any

class BaseRetriever(ABC):
    """Classe abstraite définissant le comportement d'un composant de récupération (Retriever)."""
    
    @abstractmethod
    def retrieve(self, query: str, k: int) -> List[Dict[str, Any]]:
        """
        Récupère les documents pertinents pour une requête donnée.
        
        Args:
            query (str): La question de l'utilisateur.
            k (int): Le nombre final de documents à renvoyer au LLM.
            
        Returns:
            List[Dict[str, Any]]: La liste des documents au format standard.
        """
        pass
