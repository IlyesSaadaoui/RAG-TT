import requests
import json
from typing import List, Dict, Any, Generator

class LLMService:
    """Service chargé de construire le prompt et d'interroger le LLM configuré par le Grid Search."""
    
    def __init__(self, provider: str = "ollama", model_name: str = "llama3.2:latest", api_url: str = "http://localhost:11434/api/generate"):
        self.provider = provider.lower().strip()
        self.model_name = model_name.strip()
        self.api_url = api_url

    def generate_answer(self, query: str, retrieved_docs: List[Dict[str, Any]]) -> str:
        """
        Version synchrone/bloquante pour la compatibilité avec NaiveRAGPipeline.
        Consomme l'ensemble des tokens générés par le flux de streaming pour renvoyer une chaîne 'str'.
        """
        tokens = list(self.generate_answer_stream(query, retrieved_docs))
        return "".join(tokens)

    def generate_answer_stream(self, query: str, retrieved_docs: List[Dict[str, Any]]) -> Generator[str, None, None]:
        """Génère la réponse mot par mot (Streaming) pour une latence perçue immédiate."""
        if not retrieved_docs:
            yield "Aucun document pertinent trouvé."
            return

        # 1. Extraction et fusion des textes du contexte
        context_blocks = [f"[Doc {i+1}]: {doc['text']}" for i, doc in enumerate(retrieved_docs)]
        context = "\n\n".join(context_blocks)

        # 2. Prompt strict anti-hallucination
        prompt = f"""Tu es un assistant virtuel rigoureux. Réponds à la QUESTION en utilisant UNIQUEMENT le CONTEXTE fourni. 
Si l'information n'est pas dedans, dis simplement: "Je ne sais pas." Ne devine rien.

CONTEXTE:
{context}

QUESTION:
{query}

RÉPONSE:"""

        yield from self.generate_raw_stream(prompt, temperature=0.0)

    def generate_raw_stream(self, prompt: str, temperature: float = 0.0) -> Generator[str, None, None]:
        """Envoie le prompt à Ollama en mode Stream = True (avec gestion hybride CPU/GPU)."""
        if self.provider == "ollama":
            try:
                payload = {
                    "model": self.model_name,
                    "prompt": prompt,
                    "stream": True,
                    "keep_alive": "0s",  # <--- FIX 1: Libère la mémoire (VRAM/RAM) dès la fin de la réponse
                    "options": {
                        "temperature": temperature,
                        "num_gpu": 0,  # <--- FIX 2: Forcer l'utilisation du CPU pour éviter les erreurs CUDA sur certaines machines
                        "num_ctx": 2048
                    }
                }
                # stream=True au niveau de requests pour lire la réponse au fur et à mesure
                response = requests.post(self.api_url, json=payload, stream=True, timeout=60)
                
                if response.status_code == 200:
                    for line in response.iter_lines():
                        if line:
                            data = json.loads(line.decode('utf-8'))
                            token = data.get("response", "")
                            yield token
                else:
                    yield f"[Erreur Ollama] Code HTTP {response.status_code} - Message : {response.text}"
            except Exception as e:
                yield f"[Erreur Connexion] Vérifie qu'Ollama est démarré. Détails : {str(e)}"
        else:
            yield f"Provider '{self.provider}' non supporté pour le moment."