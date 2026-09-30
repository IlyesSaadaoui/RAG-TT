# app/rag/pipeline_naive.py

from typing import Dict, Any, Union, List, Optional
from app.rag.base_pipeline import BaseRAGPipeline
from app.core.retrievers.retriever_factory import RetrieverFactory
from app.core.generation.llm_service import LLMService


class NaiveRAGPipeline(BaseRAGPipeline):
    """
    RAG Classique : Recherche vectorielle standard "similarity" -> LLM.
    """

    def __init__(self, config: Dict[str, Any], vector_store: Optional[Any] = None):
        super().__init__(config, vector_store=vector_store)

    def run_pipeline(self, query: str, file_path: Optional[Union[str, List[str]]] = None) -> Dict[str, Any]:
        # 1. Gestion et vérification du Vector Store
        if self.vector_store is None:
            if file_path:
                print("⚡ [INGESTION] Création du Vector Store et indexation...")
                self.vector_store = self._ingest(file_path)
            else:
                raise ValueError("❌ Aucun Vector Store disponible et aucun 'file_path' fourni.")
        else:
            print("⚡ [CACHE] Réutilisation du Vector Store existant (Pas de ré-ingestion)")

        # 2. Retrieval
        retriever = RetrieverFactory.get_retriever(
            retriever_type=self.retreival_strategy, 
            vector_store=self.vector_store
        )
        docs = retriever.retrieve(query, k=self.top_k)

        # 3. Génération via LLMService
        llm = LLMService(provider=self.llm_provider, model_name=self.llm_model)
        answer = llm.generate_answer(query, retrieved_docs=docs)

        return {
            "answer": answer,
            "docs_count": len(docs),
            "sources": [d["metadata"].get("source") for d in docs if isinstance(d, dict) and "metadata" in d],
        }