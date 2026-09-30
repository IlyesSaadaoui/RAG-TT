# core/chunkers/chunker_factory.py
from app.core.chunkers.text_chunkers import FixedSizeChunker, RecursiveCharacterChunker

class ChunkerFactory:
    @staticmethod
    def get_chunker(chunker_type: str, chunk_size: int, chunk_overlap: int):
        """Instancie le découpeur de texte (Chunker) approprié selon la configuration."""
        chunker_type_clean = chunker_type.lower().strip()
        
        if chunker_type_clean == "fixed_size":
            return FixedSizeChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        elif chunker_type_clean == "recursive":
            return RecursiveCharacterChunker(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        else:
            raise ValueError(
                f"Le type de Chunker '{chunker_type}' n'est pas reconnu. "
                f"Choisissez parmi : ['fixed_size', 'recursive']"
            )

# ==============================================================================
# EXEMPLE DE CHUNK GRAND FORMAT FINAL (SORTIE DU PIPELINE CLEANER + CHUNKER)
# ==============================================================================
# Ce dictionnaire représente l'unité de base qui sera stockée dans l'index vectoriel.
# Le texte est parfaitement nettoyé et fait environ 500 caractères (un paragraphe).
"""
{
    "text": "L'implémentation de notre nouvelle architecture RAG (Retrieval-Augmented Generation) au second trimestre 2024 a permis de réduire les hallucinations du modèle de 42%. En intégrant une base de données vectorielle locale couplée à un modèle d'embeddings open-source, les agents techniques peuvent désormais interroger l'historique des pannes en moins de 2 secondes. Cette transition vers des architectures agentiques non supervisées marque un tournant majeur pour l'automatisation de notre support client.",
    "metadata": {
        "year": "2024",
        "month": "06",
        "source": "rapport_technique_Q2.pdf",
        "path": "C:\\Users\\INFOKOM\\Desktop\\test1\\AI_Engine\\datasets\\2024\\06\\rapport_technique_Q2.pdf",
        "chunk_id": "2024_06_rapport_technique_Q2_chunk_004"
    }
}
"""