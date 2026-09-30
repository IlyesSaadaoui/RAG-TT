# app/rag/pipeline_hybrid.py

from typing import Dict, Any, Union, List, Optional
from app.rag.base_pipeline import BaseRAGPipeline
from app.core.retrievers.retriever_factory import RetrieverFactory
from app.core.generation.llm_service import LLMService


class HybridRAGPipeline(BaseRAGPipeline):
    """
    RAG Hybride : Fusion Dense + Sparse (BM25) via RRF -> LLM.
    """

    def run_pipeline(self, query: str, file_path: Optional[Union[str, List[str]]] = None) -> Dict[str, Any]:
        # 1. Vérification du Vector Store
        if self.vector_store is None:
            if file_path:
                print("⚡ [INGESTION] Création du Vector Store Hybride...")
                self.vector_store = self._ingest(file_path)
            else:
                raise ValueError("❌ Aucun Vector Store disponible et aucun 'file_path' fourni.")

        # 2. Retrieval Hybride
        retriever = RetrieverFactory.get_retriever(
            retriever_type="standard", 
            vector_store=self.vector_store, 
            strategy="hybrid"
        )
        docs = retriever.retrieve(query, k=self.top_k)

        # 3. Génération
        llm = LLMService(provider=self.llm_provider, model_name=self.llm_model)
        answer = llm.generate_answer(query, retrieved_docs=docs)

        return {
            "answer": answer,
            "docs_count": len(docs),
            "sources": [d["metadata"].get("source") for d in docs if isinstance(d, dict) and "metadata" in d],
        }