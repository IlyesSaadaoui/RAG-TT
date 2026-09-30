# app/rag/base_pipeline.py

from abc import ABC, abstractmethod
from pathlib import Path
from typing import List, Dict, Any, Union, Optional
import os
import shutil
import uuid

from app.core.loaders.file_loaders import PyPDFLoader, DocxLoader, TxtLoader
from app.core.cleaner.cleaner_factory import CleanerFactory
from app.core.chunkers.chunker_factory import ChunkerFactory
from app.core.embeddings.embeddings_factory import EmbeddingModelFactory
from app.core.vector_stores.vector_store_factory import VectorStoreFactory


class BaseRAGPipeline(ABC):

    _LOADERS = {
        ".pdf": PyPDFLoader,
        ".docx": DocxLoader,
        ".txt": TxtLoader,
    }

    def __init__(self, config: Dict[str, Any], vector_store: Optional[Any] = None):
        self.config = config
        self.rag_type = config["rag_type"]
        self.cleaner_type = config["cleaner"]
        self.chunk_strategy = config["chunking_strategy"]
        self.chunk_size = config["chunk_size"]
        self.chunk_overlap = config["chunk_overlap"]
        self.embedding_model_name = config["embedding_model"]
        self.vectorstore_type = config["vectorstore_type"]
        self.retreival_strategy = config["retrieval_strategy"]
        self.top_k = config["top_k"]
        self.llm_provider = config["llm_provider"]
        self.llm_model = config["llm_model"]
        self.vector_store = vector_store

        if self.vector_store is None:
            try:
                self.load_existing_vector_store()
                print(f"📦 Collection '{self.rag_type}' rechargée depuis le disque.")
            except Exception as e:
                print(f"⚠️ Impossible de charger la collection sur disque pour '{self.rag_type}': {e}")

    def vector_store_exists(self) -> bool:
        if self.vector_store is not None:
            return True
        chroma_dir = os.path.join("chroma_db", self.rag_type)
        return os.path.exists(chroma_dir)

    def load_existing_vector_store(self):
        embedding_model = EmbeddingModelFactory.get_embedding_model(self.embedding_model_name)
        collection_name = self.config.get("collection_name", f"collection_{self.rag_type}")
        
        self.vector_store = VectorStoreFactory.get_vector_store(
            self.vectorstore_type,
            embedding_model,
            collection_name=collection_name
        )
        return self.vector_store

    def _clean_chroma_directory(self):
        """Supprime physiquement le dossier SQLite/Chroma sur disque pour repartir de zéro sans erreur SQL."""
        possible_paths = [
            os.path.join("chroma_db", self.rag_type),
            os.path.join(".", "chroma_db"),
            os.path.join(".", "chroma")
        ]
        
        # Fermeture des connexions existantes si présent
        if self.vector_store is not None:
            try:
                if hasattr(self.vector_store, "_client"):
                    self.vector_store._client.reset()
            except Exception:
                pass
            self.vector_store = None

        for path in possible_paths:
            if os.path.exists(path):
                try:
                    shutil.rmtree(path, ignore_errors=True)
                    print(f"🧹 Dossier SQLite/Chroma nettoyé : {path}")
                except Exception as e:
                    print(f"⚠️ Impossible de supprimer {path}: {e}")

    def _ingest(self, file_paths: Union[str, List[str]]):
        if isinstance(file_paths, (str, Path)):
            paths = [Path(file_paths)]
        else:
            paths = [Path(p) for p in file_paths]
            
        print(f"\n🚀 [INGESTION START] Début du prétraitement pour le pipeline '{self.rag_type}'")
        print(f"📁 Nombre total de fichiers à traiter : {len(paths)}")
        
        # 1. NETTOYAGE PHYSIQUE DU DISQUE AVANT DE CRÉER LA BASE
        self._clean_chroma_directory()

        all_chunks = []
        cleaner = CleanerFactory.get_cleaner(self.cleaner_type)
        chunker = ChunkerFactory.get_chunker(self.chunk_strategy, self.chunk_size, self.chunk_overlap)

        for path in paths:
            ext = path.suffix.lower()
            if ext not in self._LOADERS:
                continue

            try:
                loader = self._LOADERS[ext]()
                raw_text = loader.read_text(path)
                if not raw_text or not raw_text.strip():
                    continue

                clean_text = cleaner.clean(raw_text)
                file_chunks = chunker.split_documents([
                    {"text": clean_text, "metadata": {"source": path.name}}
                ])
                if file_chunks:
                    all_chunks.extend(file_chunks)

            except Exception as e:
                print(f"❌ Erreur d'ingestion sur le fichier '{path.name}': {e}")

        if not all_chunks:
            raise ValueError("Aucun chunk n'a pu être généré à partir des fichiers fournis.")
            
        print(f"📊 Total des chunks accumulés : {len(all_chunks)} chunks")
        
        # 2. INSTANCIATION SUR UNE BASE TOTALE NEUVE
        embedding_model = EmbeddingModelFactory.get_embedding_model(self.embedding_model_name)
        collection_name = f"collection_{self.rag_type}"

        self.vector_store = VectorStoreFactory.get_vector_store(
            self.vectorstore_type, 
            embedding_model,
            collection_name=collection_name
        )

        # 3. EXTRACTION SÉCURISÉE ET INGÉSTION PAR MINI-LOTS
        batch_size = 5
        total_batches = (len(all_chunks) + batch_size - 1) // batch_size
        print(f"💾 Ingestion sécurisée de {len(all_chunks)} chunks en {total_batches} lot(s)...")

        for i in range(0, len(all_chunks), batch_size):
            batch = all_chunks[i:i + batch_size]
            
            # Utilisation standard des méthodes VectorStore
            if hasattr(self.vector_store, "add_documents"):
                self.vector_store.add_documents(batch)
            elif hasattr(self.vector_store, "add_texts"):
                texts = [d.page_content if hasattr(d, "page_content") else d.get("text", "") for d in batch]
                metadatas = [d.metadata if hasattr(d, "metadata") else d.get("metadata", {}) for d in batch]
                self.vector_store.add_texts(texts=texts, metadatas=metadatas)
            else:
                # Si c'est un wrapper maison
                self.vector_store.add(batch)

        print(f"✅ Base '{self.rag_type}' réinitialisée et ré-indexée avec succès !")
        return self.vector_store
    @abstractmethod
    def run_pipeline(self, query: str, file_path: Optional[Union[str, List[str]]] = None) -> Dict[str, Any]:
        pass