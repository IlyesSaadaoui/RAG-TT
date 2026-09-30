# core/retrievers/model_retrievers.py
import numpy as np
from typing import List, Dict, Any
from app.core.retrievers.base_retriever import BaseRetriever
from app.core.vector_stores.base_vector_store import BaseVectorStore

# ==============================================================================
# 1. RETRIEVER STANDARD (TOP-K BRUT)
# ==============================================================================
class StandardRetriever(BaseRetriever):
    """
    Retriever qui délègue au Vector Store, en transmettant la stratégie de
    recherche demandée ("similarity", "mmr" ou "hybrid"). Avant ce correctif,
    la stratégie n'était jamais transmise et "similarity" était toujours
    utilisée quelle que soit la config.
    """

    def __init__(self, vector_store: BaseVectorStore, strategy: str = "similarity"):
        self.vector_store = vector_store
        self.strategy = strategy

    def retrieve(self, query: str, k: int) -> List[Dict[str, Any]]:
        print(f"[Retriever] Recherche '{self.strategy}' Top-{k} en cours...")
        return self.vector_store.similarity_search(query=query, k=k, strategy=self.strategy)


# ==============================================================================
# 2. RETRIEVER AVEC RE-RANKING (FILTRAGE INTELLIGENT)
# ==============================================================================
class ReRankingRetriever(BaseRetriever):
    """
    Retriever avancé. Il sur-échantillonne les résultats du Vector Store (ex: k * 3),
    puis utilise un Cross-Encoder pour re-classer finement les documents.
    """
    
    def __init__(self, vector_store: BaseVectorStore, reranker_model_name: str = "BAAI/bge-reranker-base"):
        """
        Args:
            vector_store: L'instance de FAISS ou ChromaDB via ta Factory.
            reranker_model_name: Le modèle de re-ranking Hugging Face à utiliser.
        """
        self.vector_store = vector_store
        # Import local pour ne charger la lourde l'extension sentence_transformers que si nécessaire
        from sentence_transformers import CrossEncoder
        print(f"[Retriever] Chargement du modèle de Re-ranking : {reranker_model_name}...")
        self.reranker = CrossEncoder(reranker_model_name)
        
    def retrieve(self, query: str, k: int) -> List[Dict[str, Any]]:
        # 1. Sur-échantillonnage : on demande 3 fois plus de documents à FAISS/Chroma
        oversample_k = k * 3
        print(f"[Retriever] Étape 1 : Pré-sélection de {oversample_k} documents dans le Vector Store...")
        initial_docs = self.vector_store.similarity_search(query=query, k=oversample_k)
        
        if not initial_docs:
            return []
            
        # 2. Préparation des paires (Question, Document) pour le Cross-Encoder
        pairs = [[query, doc["text"]] for doc in initial_docs]
        
        # 3. Calcul des scores de pertinence réels (plus précis que la simple distance vectorielle)
        print(f"[Retriever] Étape 2 : Re-calcul des scores de pertinence via Cross-Encoder...")
        scores = self.reranker.predict(pairs)
        
        # 4. Tri des documents en fonction des nouveaux scores (du plus haut au plus bas)
        ranked_indices = np.argsort(scores)[::-1]
        
        # 5. Sélection des k meilleurs documents après le tri
        final_docs = []
        print(f"\n--- CLASSEMENT APRÈS RE-RANKING (Top-{k}) ---")
        for rank, idx in enumerate(ranked_indices[:k]):
            doc = initial_docs[idx]
            score_decoratif = scores[idx]
            print(f"Rang {rank+1} -> Score Cross-Encoder : {score_decoratif:.4f} | Texte : {doc['text'][:50]}...")
            final_docs.append(doc)
        print("-" * 45 + "\n")
            
        return final_docs
    