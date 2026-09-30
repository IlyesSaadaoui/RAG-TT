# core/chunkers/text_chunkers.py
from typing import List, Dict, Any
from app.core.chunkers.base_chunker import BaseChunker

class FixedSizeChunker(BaseChunker):
    """Découpe le texte de manière brute à taille fixe avec chevauchement."""
    
    def split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc in documents:
            text = doc["text"]
            metadata = doc["metadata"]
            
            start = 0
            while start < len(text):
                end = start + self.chunk_size
                chunk_text = text[start:end]
                
                # Copie profonde des métadonnées pour que chaque fragment garde sa date
                chunks.append({
                    "text": chunk_text,
                    "metadata": metadata.copy()
                })
                
                # On avance de la taille du bloc moins le chevauchement
                start += (self.chunk_size - self.chunk_overlap)
                
                # Sécurité anti-boucle infinie si overlap >= chunk_size
                if self.chunk_size <= self.chunk_overlap:
                    break
                    
        return chunks

class RecursiveCharacterChunker(BaseChunker):
    """Découpe de manière récursive en essayant de respecter la ponctuation."""
    
    def __init__(self, chunk_size: int, chunk_overlap: int):
        super().__init__(chunk_size, chunk_overlap)
        self.separators = ["\n\n", "\n", ". ", " ", ""]

    def _split_text(self, text: str) -> List[str]:
        # Algorithme de découpage récursif simplifié et robuste sans dépendance externe
        final_chunks = []
        
        def recurse(current_text: str):
            if len(current_text) <= self.chunk_size:
                final_chunks.append(current_text)
                return
            
            # Chercher le meilleur séparateur possible
            for sep in self.separators:
                if sep == "":
                    # Sécurité si aucun séparateur ne convient
                    final_chunks.append(current_text[:self.chunk_size])
                    recurse(current_text[self.chunk_size:])
                    return
                
                if sep in current_text:
                    parts = current_text.split(sep)
                    # Réassemblage partiel respectant la taille limite
                    current_chunk = ""
                    for part in parts:
                        potential_chunk = current_chunk + (sep if current_chunk else "") + part
                        if len(potential_chunk) <= self.chunk_size:
                            current_chunk = potential_chunk
                        else:
                            if current_chunk:
                                final_chunks.append(current_chunk)
                            # Gérer le chevauchement grossier pour le segment suivant
                            overlap_start = max(0, len(current_chunk) - self.chunk_overlap)
                            recurse(current_chunk[overlap_start:] + sep + part if current_chunk else part)
                            return
                    break

        recurse(text)
        return final_chunks

    def split_documents(self, documents: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        chunks = []
        for doc in documents:
            text = doc["text"]
            metadata = doc["metadata"]
            
            text_segments = self._split_text(text)
            for segment in text_segments:
                if segment.strip():
                    chunks.append({
                        "text": segment,
                        "metadata": metadata.copy()
                    })
        return chunks
"""
RÉSUMÉ COMPARATIF DES CHUNKERS :

1. FixedSizeChunker (Découpe Brute) :
   - Approche : Découpage mécanique strict par tranche exacte de N caractères.
   - Respect taille/overlap : Strict (100%).
   - Impact : Risque élevé de couper les mots, liens et phrases en plein milieu.
   - Usage : Données non linguistiques, logs bruts ou structures binaires.

2. RecursiveCharacterChunker (Découpe Sémantique / Standard RAG) :
   - Approche : Découpage hiérarchique intelligent (Sauts de ligne -> Points -> Espaces).
   - Respect taille/overlap : Souple (chunk_size sert de limite maximale pour préserver les phrases).
   - Impact : Préserve la grammaire et la cohérence sémantique du texte.
   - Usage : Indispensable pour la majorité des projets RAG (PDF, docs, articles).
"""