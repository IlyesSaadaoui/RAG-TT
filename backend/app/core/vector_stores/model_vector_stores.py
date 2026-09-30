# core/vector_stores/model_vector_stores.py
import faiss
import numpy as np
import chromadb
import time
from typing import List, Dict, Any, Optional
from rank_bm25 import BM25Okapi
from app.core.vector_stores.base_vector_store import BaseVectorStore

# Répertoire où Chroma persiste réellement les collections sur disque.
CHROMA_PERSIST_DIR = "app/data_vector_stores/chroma"


# ==============================================================================
# 1. IMPLÉMENTATION FAISS
# ==============================================================================
class FaissVectorStore(BaseVectorStore):
    """
    Gestionnaire FAISS supportant Similarity, MMR (diversification) et Hybrid (Dense+BM25).
    """

    def __init__(self, embedding_model, collection_name: Optional[str] = None):
        super().__init__(embedding_model)
        self.index = None
        self.documents = []
        self.bm25 = None
        self.collection_name = collection_name

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        if not documents:
            return

        texts = [doc["text"] for doc in documents]
        embeddings = self.embedding_model.embed_documents(texts)

        np_embeddings = np.array(embeddings).astype('float32')
        dimension = np_embeddings.shape[1]

        if self.index is None:
            self.index = faiss.IndexFlatL2(dimension)

        self.index.add(np_embeddings)
        self.documents.extend(documents)

        tokenized_corpus = [doc["text"].lower().split(" ") for doc in self.documents]
        self.bm25 = BM25Okapi(tokenized_corpus)

    def similarity_search(self, query: str, k: int = 4, strategy: str = "similarity") -> List[Dict[str, Any]]:
        if self.index is None or not self.documents:
            return []

        strategy = strategy.lower().strip()
        query_vector = self.embedding_model.embed_query(query)
        np_query = np.array([query_vector]).astype('float32')

        if strategy == "similarity":
            distances, indices = self.index.search(np_query, k)
            return [self.documents[idx] for idx in indices[0] if idx != -1 and idx < len(self.documents)]

        elif strategy == "mmr":
            fetch_k = min(k * 3, len(self.documents))
            distances, indices = self.index.search(np_query, fetch_k)
            candidate_indices = [idx for idx in indices[0] if idx != -1]

            if not candidate_indices:
                return []

            all_vectors = np.zeros((len(self.documents), self.index.d), dtype='float32')
            for i in range(len(self.documents)):
                all_vectors[i] = self.index.reconstruct(i)

            selected_indices = [candidate_indices[0]]

            while len(selected_indices) < min(k, len(candidate_indices)):
                best_mmr_score = -float('inf')
                best_candidate = -1

                for cand in candidate_indices:
                    if cand in selected_indices:
                        continue

                    sim_to_query = 1 / (1 + distances[0][candidate_indices.index(cand)])

                    sim_to_selected = max([np.dot(all_vectors[cand], all_vectors[sel]) /
                                           (np.linalg.norm(all_vectors[cand]) * np.linalg.norm(all_vectors[sel]) + 1e-5)
                                           for sel in selected_indices])

                    mmr_score = 0.5 * sim_to_query - (1 - 0.5) * sim_to_selected

                    if mmr_score > best_mmr_score:
                        best_mmr_score = mmr_score
                        best_candidate = cand

                if best_candidate == -1:
                    break
                selected_indices.append(best_candidate)

            return [self.documents[idx] for idx in selected_indices]

        elif strategy == "hybrid":
            if self.bm25 is None:
                return []

            _, faiss_indices = self.index.search(np_query, len(self.documents))
            vector_ranks = {idx: rank for rank, idx in enumerate(faiss_indices[0]) if idx != -1}

            tokenized_query = query.lower().split(" ")
            bm25_scores = self.bm25.get_scores(tokenized_query)
            bm25_indices = np.argsort(bm25_scores)[::-1]
            lexical_ranks = {idx: rank for rank, idx in enumerate(bm25_indices)}

            rrf_scores = {}
            c = 60
            for idx in range(len(self.documents)):
                v_rank = vector_ranks.get(idx, len(self.documents))
                l_rank = lexical_ranks.get(idx, len(self.documents))
                rrf_scores[idx] = (1.0 / (c + v_rank)) + (1.0 / (c + l_rank))

            sorted_indices = sorted(rrf_scores, key=rrf_scores.get, reverse=True)
            return [self.documents[idx] for idx in sorted_indices[:k]]

        else:
            raise ValueError(f"Stratégie '{strategy}' non reconnue pour FAISS.")


# ==============================================================================
# 2. IMPLÉMENTATION CHROMADB — CORRIGÉE ET OPTIMISÉE PAR LOTS
# ==============================================================================
class ChromaVectorStore(BaseVectorStore):
    """
    Gestionnaire ChromaDB supportant Similarity, MMR et Hybrid (RRF).
    Gestion par lots (batchs) avec affichage de progression en temps réel.
    """

    def __init__(self, embedding_model, collection_name: Optional[str] = None):
        super().__init__(embedding_model)

        self.client = chromadb.PersistentClient(path=CHROMA_PERSIST_DIR)

        if collection_name is None:
            import uuid
            collection_name = f"unnamed_{uuid.uuid4().hex[:8]}"
            print(
                "⚠️ [ChromaVectorStore] Aucun collection_name fourni — "
                "un nom aléatoire est utilisé, la persistance/réutilisation "
                "ne sera pas possible pour cet appel."
            )

        self.collection_name = collection_name

        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"hnsw:space": "cosine"}
        )

        self.documents_backup = []

        existing_count = self.collection.count()
        if existing_count > 0:
            existing = self.collection.get(include=["documents", "metadatas"])
            for text, meta in zip(existing["documents"], existing["metadatas"]):
                self.documents_backup.append({"text": text, "metadata": meta})
            print(
                f"♻️  [ChromaVectorStore] Collection '{collection_name}' déjà existante "
                f"({existing_count} documents) — réutilisation, aucun recalcul d'embedding."
            )

    def add_documents(self, documents: List[Dict[str, Any]]) -> None:
        if not documents:
            return

        # 🔑 Si la collection est déjà peuplée sur disque, on passe l'étape !
        if self.collection.count() > 0:
            print(
                f"♻️  [ChromaVectorStore] '{self.collection_name}' déjà peuplée "
                f"({self.collection.count()} docs) — add_documents() ignoré."
            )
            return

        total_docs = len(documents)
        batch_size = 200  # 🔑 Traitement par lots de 200 pour éviter le crash/freeze
        start_time = time.time()

        print(f"\n🧠 [EMBEDDINGS] Début de la vectorisation de {total_docs} chunks pour '{self.collection_name}'...")

        for i in range(0, total_docs, batch_size):
            batch_docs = documents[i:i + batch_size]
            
            texts = [doc["text"] for doc in batch_docs]
            metadatas = [doc["metadata"] for doc in batch_docs]
            
            # Calcul des embeddings pour ce lot spécifique
            embeddings = self.embedding_model.embed_documents(texts)
            ids = [f"id_{idx}" for idx in range(i, i + len(batch_docs))]

            # Ajout à ChromaDB
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                metadatas=metadatas,
                ids=ids
            )
            self.documents_backup.extend(batch_docs)
            time.sleep(0.05)  # 🔑 Pause minime pour éviter de saturer le serveur Chroma
            # 🔑 AFFICHAGE DU CHUNK ET DU POURCENTAGE EN TEMPS RÉEL
            current_count = min(i + len(batch_docs), total_docs)
            percent = round((current_count / total_docs) * 100, 1)
            print(f"  ⚡ [ChromaVectorStore] Chunk N° {current_count} / {total_docs} ({percent}%) indexé...")

        total_duration = round(time.time() - start_time, 2)
        print(f"✅ [EMBEDDINGS] Vectorisation terminée en {total_duration}s pour {total_docs} chunks !\n")

    def similarity_search(self, query: str, k: int = 4, strategy: str = "similarity") -> List[Dict[str, Any]]:
        query_vector = self.embedding_model.embed_query(query)
        strategy = strategy.lower().strip()

        if strategy in ["similarity", "mmr"]:
            results = self.collection.query(
                query_embeddings=[query_vector],
                n_results=k
            )

            standardized_results = []
            if results and results["documents"] and results["documents"][0]:
                for text, meta in zip(results["documents"][0], results["metadatas"][0]):
                    standardized_results.append({"text": text, "metadata": meta})
            return standardized_results

        elif strategy == "hybrid":
            if not self.documents_backup:
                return []

            chroma_res = self.collection.query(query_embeddings=[query_vector], n_results=len(self.documents_backup))

            if not chroma_res or not chroma_res["ids"] or not chroma_res["ids"][0]:
                return []

            vector_ranks = {res_id: rank for rank, res_id in enumerate(chroma_res["ids"][0])}

            tokenized_corpus = [doc["text"].lower().split(" ") for doc in self.documents_backup]
            bm25 = BM25Okapi(tokenized_corpus)
            bm25_scores = bm25.get_scores(query.lower().split(" "))
            bm25_indices = np.argsort(bm25_scores)[::-1]

            lexical_ranks = {f"id_{idx}": rank for rank, idx in enumerate(bm25_indices)}

            rrf_scores = {}
            c = 60
            for idx in range(len(self.documents_backup)):
                doc_id = f"id_{idx}"
                v_rank = vector_ranks.get(doc_id, len(self.documents_backup))
                l_rank = lexical_ranks.get(doc_id, len(self.documents_backup))
                rrf_scores[idx] = (1.0 / (c + v_rank)) + (1.0 / (c + l_rank))

            sorted_indices = sorted(rrf_scores, key=rrf_scores.get, reverse=True)
            return [self.documents_backup[idx] for idx in sorted_indices[:k]]

        else:
            raise ValueError(f"Stratégie '{strategy}' non reconnue pour ChromaDB.")