# core/retrievers/retriever_factory.py
from typing import Any
from app.core.retrievers.base_retriever import BaseRetriever
from app.core.retrievers.model_retrievers import StandardRetriever, ReRankingRetriever
from app.core.vector_stores.base_vector_store import BaseVectorStore

class RetrieverFactory:
    """Factory permettant d'instancier dynamiquement la stratégie de récupération pour le Grid Search."""
    
    @staticmethod
    def get_retriever(retriever_type: str, vector_store: BaseVectorStore, **kwargs) -> BaseRetriever:
        """
        Instancie le retriever demandé.
        
        Args:
            retriever_type (str): "standard" ou "rerank".
            vector_store (BaseVectorStore): L'instance FAISS ou Chroma déjà créée.
            **kwargs: Paramètres optionnels (ex: reranker_model_name).
        """
        normalized_type = retriever_type.strip().lower()

        if normalized_type in ["standard", "similarity", "mmr", "hybrid"]:
            # Si on a demandé directement "mmr" ou "hybrid" comme type, on s'en sert
            # comme stratégie ; sinon on prend "strategy" dans kwargs (défaut similarity).
            strategy = normalized_type if normalized_type in ["mmr", "hybrid"] else kwargs.get("strategy", "similarity")
            return StandardRetriever(vector_store=vector_store, strategy=strategy)

        elif normalized_type in ["rerank", "reranker", "reranking"]:
            model_name = kwargs.get("reranker_model_name", "BAAI/bge-reranker-base")
            return ReRankingRetriever(vector_store=vector_store, reranker_model_name=model_name)

        else:
            raise ValueError(
                f"Type de retriever '{retriever_type}' inconnu. "
                f"Options valides : 'standard' (+ strategy='similarity'/'mmr'/'hybrid'), "
                f"'hybrid', 'mmr' ou 'rerank'."
            )
