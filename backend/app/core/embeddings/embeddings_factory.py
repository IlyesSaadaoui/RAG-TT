# core/embeddings/embeddings_factory.py

# CHANGE UNIQUEMENT CETTE LIGNE D'IMPORT :
from app.core.embeddings.model_embeddings import HuggingFaceEmbeddingModel, OllamaEmbeddingModel

class EmbeddingModelFactory:
    @staticmethod
    def get_embedding_model(model_name: str):
        model_name_clean = model_name.lower().strip()
        
        # Liste arbitraire pour l'aiguillage (à adapter selon tes préférences)
        ollama_models = ["llama3", "mistral", "nomic-embed-text"]
        
        if model_name_clean in ollama_models:
            return OllamaEmbeddingModel(model_name=model_name)
        else:
            # Par défaut, on cherche sur Hugging Face (ex: all-MiniLM-L6-v2)
            return HuggingFaceEmbeddingModel(model_name=model_name)