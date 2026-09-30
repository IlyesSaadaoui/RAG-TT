# core/vector_stores/vector_store_factory.py
from typing import Any
from app.core.vector_stores.model_vector_stores import FaissVectorStore, ChromaVectorStore

class VectorStoreFactory:
    """Factory permettant d'instancier dynamiquement le Vector Store ciblé par le Grid Search."""

    @staticmethod
    def get_vector_store(store_type: str, embedding_model: Any,collection_name: str = None ) -> Any:
        """
        Instancie et renvoie le gestionnaire de base vectorielle demandé.
        
        Args:
            store_type (str): Le type de store ("faiss" ou "chroma", insensible à la casse).
            embedding_model: L'instance du modèle d'embedding à injecter.
            
        Returns:
            BaseVectorStore: Une instance de FaissVectorStore ou ChromaVectorStore.
            
        Raises:
            ValueError: Si le type de store demandé n'est pas supporté.
        """
        # Nettoyage de la chaîne pour éviter les bugs de casse ou d'espaces
        normalized_type = store_type.strip().lower()

        if normalized_type == "faiss":
            return FaissVectorStore(embedding_model=embedding_model, collection_name=collection_name)
            
        elif normalized_type == "chroma" or normalized_type == "chromadb":
            return ChromaVectorStore(embedding_model=embedding_model, collection_name=collection_name)
            
        else:
            raise ValueError(
                f"Vector Store type '{store_type}' non supporté. "
                f"Les options valides sont : 'faiss' ou 'chroma'."
            )
        