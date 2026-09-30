# app/rag/pipeline_factory.py

from typing import Any, Optional
from app.rag.base_pipeline import BaseRAGPipeline
from app.rag.pipeline_naive import NaiveRAGPipeline
from app.rag.pipeline_hybrid import HybridRAGPipeline
from app.rag.pipeline_agentic import AgenticRAGPipeline


class RAGPipelineFactory:
    @staticmethod
    def get_pipeline(config: dict, vector_store: Optional[Any] = None) -> BaseRAGPipeline:
        r_type = config.get("rag_type", "").lower().strip()
        
        if "naive" in r_type:
            return NaiveRAGPipeline(config, vector_store=vector_store)
        elif "hybrid" in r_type:
            return HybridRAGPipeline(config, vector_store=vector_store)
        elif "agentic" in r_type:
            return AgenticRAGPipeline(config, vector_store=vector_store)
        else:
            raise ValueError(f"Type de RAG invalide : {r_type}")