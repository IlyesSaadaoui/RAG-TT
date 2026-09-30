# app/rag/pipeline_agentic.py

from typing import Dict, Any, Union, List, Optional
from app.rag.base_pipeline import BaseRAGPipeline
from app.core.retrievers.retriever_factory import RetrieverFactory
from app.core.generation.llm_service import LLMService


MAX_ITERATIONS = 4

AGENT_PROMPT_TEMPLATE = """Tu es un agent de recherche documentaire. Tu dois répondre à la QUESTION
en te basant uniquement sur le CONTEXTE COLLECTÉ ci-dessous.

Règles strictes de format (une seule ligne, respecte exactement un des 2 formats) :
- Si le contexte est insuffisant pour répondre avec certitude, réponds :
  RECHERCHE: <nouvelle requête de recherche, différente des précédentes, plus précise ou reformulée>
- Si le contexte est suffisant, réponds :
  REPONSE_FINALE: <ta réponse complète et sourcée>

CONTEXTE COLLECTÉ JUSQU'ICI (itération {iteration}/{max_iterations}) :
{context}

QUESTION : {query}
"""


class AgenticRAGPipeline(BaseRAGPipeline):
    """
    RAG Agentique : Boucle ReAct autonome pilotée par le LLM.
    """

    def run_pipeline(self, query: str, file_path: Optional[Union[str, List[str]]] = None) -> Dict[str, Any]:
        if self.vector_store is None:
            if file_path:
                print("⚡ [INGESTION] Création du Vector Store Agentique...")
                self.vector_store = self._ingest(file_path)
            else:
                raise ValueError("❌ Aucun Vector Store disponible et aucun 'file_path' fourni.")

        strategy = self.retreival_strategy or "hybrid"
        retriever = RetrieverFactory.get_retriever("standard", self.vector_store, strategy=strategy)
        llm = LLMService(provider=self.llm_provider, model_name=self.llm_model)

        accumulated_steps = []
        trace = []

        for iteration in range(1, MAX_ITERATIONS + 1):
            prompt = self._build_prompt(query, accumulated_steps, iteration)
        
        # 🟢 Correctif ici : remplacement de generate_raw par generate_answer
            decision = llm.generate_answer(query=prompt, retrieved_docs=[])
        
            trace.append({"iteration": iteration, "raw_decision": decision})
            normalized = decision.strip()

            if normalized.upper().startswith("RECHERCHE:"):
                sub_query = normalized.split(":", 1)[1].strip()
                if not sub_query:
                    sub_query = query
                docs = retriever.retrieve(sub_query, k=self.top_k)
                accumulated_steps.append({"query": sub_query, "docs": docs})
                continue

            if normalized.upper().startswith("REPONSE_FINALE:"):
                answer = normalized.split(":", 1)[1].strip()
                return {
                    "answer": answer,
                    "iterations": iteration,
                    "trace": trace,
                    "sources": self._collect_sources(accumulated_steps),
                }

            return {
                "answer": normalized,
                "iterations": iteration,
                "trace": trace,
                "sources": self._collect_sources(accumulated_steps),
                "format_warning": "Le LLM n'a pas suivi le format RECHERCHE:/REPONSE_FINALE:",
            }

        all_docs = [d for step in accumulated_steps for d in step["docs"]]
        answer = llm.generate_answer(query, retrieved_docs=all_docs)
        return {
            "answer": answer,
            "iterations": MAX_ITERATIONS,
            "trace": trace,
            "sources": self._collect_sources(accumulated_steps),
            "forced_final": True,
        }
    @staticmethod
    def _build_prompt(query: str, accumulated_steps: list, iteration: int) -> str:
        if not accumulated_steps:
            context = "(aucun contexte collecté pour le moment)"
        else:
            blocks = []
            for step in accumulated_steps:
                for doc in step["docs"]:
                    snippet = doc.get("text", "")[:500] if isinstance(doc, dict) else str(doc)[:500]
                    blocks.append(f"[Recherche: '{step['query']}'] {snippet}")
            context = "\n\n".join(blocks) if blocks else "(recherche sans résultat)"

        return AGENT_PROMPT_TEMPLATE.format(
            iteration=iteration, max_iterations=MAX_ITERATIONS, context=context, query=query
        )

    @staticmethod
    def _collect_sources(accumulated_steps: list) -> list:
        sources = set()
        for step in accumulated_steps:
            for doc in step["docs"]:
                if isinstance(doc, dict):
                    src = doc.get("metadata", {}).get("source")
                    if src:
                        sources.add(src)
        return sorted(list(sources))