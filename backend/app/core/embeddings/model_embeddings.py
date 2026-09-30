# core/embeddings/model_embeddings.py
import requests
from typing import List
import logging
from concurrent.futures import ThreadPoolExecutor
from sentence_transformers import SentenceTransformer
from app.core.embeddings.base_embeddings import BaseEmbeddingModel

logger = logging.getLogger("ModelEmbeddings")

# ==============================================================================
# 1. IMPLÉMENTATION HUGGING FACE (SENTENCE-TRANSFORMERS) — inchangée, déjà optimale
# ==============================================================================
class HuggingFaceEmbeddingModel(BaseEmbeddingModel):
    """Gère la génération de vecteurs localement via HuggingFace (Sentence-Transformers)."""

    def __init__(self, model_name: str):
        super().__init__(model_name)
        self.model = SentenceTransformer(model_name)

    def embed_query(self, text: str) -> List[float]:
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        embeddings = self.model.encode(texts, convert_to_numpy=True)
        return embeddings.tolist()


# ==============================================================================
# 2. IMPLÉMENTATION OLLAMA (API LOCAL REST) — CORRIGÉE : requêtes en parallèle
# ==============================================================================
class OllamaEmbeddingModel(BaseEmbeddingModel):
    """Gère la génération de vecteurs en local via l'API d'Ollama."""

    def __init__(self, model_name: str, base_url: str = "http://localhost:11434", max_workers: int = 8):
        super().__init__(model_name)
        self.api_url = f"{base_url}/api/embeddings"
        # Nombre de requêtes envoyées en parallèle vers Ollama.
        # Ollama ne propose pas d'API batch native pour /api/embeddings,
        # donc on compense en parallélisant les appels HTTP eux-mêmes,
        # plutôt que de les envoyer un par un de façon strictement séquentielle.
        self.max_workers = max_workers

    def embed_query(self, text: str) -> List[float]:
        if not text:
            return []

        payload = {"model": self.model_name, "prompt": text}

        try:
            response = requests.post(self.api_url, json=payload, timeout=30)
            response.raise_for_status()
            response_json = response.json()
            if "embedding" in response_json:
                return response_json["embedding"]
            else:
                raise KeyError("La clé 'embedding' est absente de la réponse d'Ollama.")
        except requests.exceptions.ConnectionError:
            raise RuntimeError(
                f"[OLLAMA ERROR] Impossible de se connecter au serveur Ollama. "
                f"Vérifiez qu'il est démarré sur {self.api_url.split('/api')[0]}"
            )
        except Exception as e:
            raise RuntimeError(f"[OLLAMA ERROR] Erreur lors du calcul de l'embedding : {e}")

    def embed_documents(self, texts: List[str]) -> List[List[float]]:
        """
        AVANT : une requête HTTP séquentielle par chunk (extrêmement lent sur
        plusieurs milliers de chunks — c'était la cause probable principale
        du délai de 30+ minutes).

        APRÈS : les requêtes sont envoyées en parallèle (jusqu'à max_workers
        simultanées), ce qui peut réduire le temps total par un facteur proche
        de max_workers, tout en restant raisonnable pour ne pas saturer le
        serveur Ollama local.
        """
        if not texts:
            return []

        results: List[List[float]] = [None] * len(texts)  # type: ignore
        errors = []

        def _embed_one(idx_text):
            idx, text = idx_text
            try:
                return idx, self.embed_query(text)
            except Exception as e:
                return idx, e

        with ThreadPoolExecutor(max_workers=self.max_workers) as executor:
            for idx, result in executor.map(_embed_one, enumerate(texts)):
                if isinstance(result, Exception):
                    logger.error(f"Échec de l'embedding pour le chunk index {idx}: {result}")
                    errors.append((idx, result))
                else:
                    results[idx] = result

        if errors:
            # On préserve le comportement d'origine : une erreur d'embedding
            # sur un chunk fait échouer tout le batch, pour ne jamais indexer
            # un vector store partiellement incomplet sans le savoir.
            first_idx, first_error = errors[0]
            raise RuntimeError(
                f"[OLLAMA ERROR] {len(errors)} chunk(s) ont échoué (ex: index {first_idx}) : {first_error}"
            )

        return results