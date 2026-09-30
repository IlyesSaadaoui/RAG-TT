import os
import time
import threading
from typing import Dict, Any, Optional, List
from sqlalchemy.orm import Session
from app.rag.pipeline_factory import RAGPipelineFactory
from app.models.rag_config import RAGConfigModel
from app.database import SessionLocal

# --- CONFIGURATION ENVIRONNEMENT (Silence warnings HuggingFace & Chroma) ---
os.environ["TOKENIZERS_PARALLELISM"] = "false"
os.environ["HF_HUB_DISABLE_SYMLINKS_WARNING"] = "1"

GREETINGS = ["bonjour", "bonsoir", "salut", "hello", "coucou", "hi"]

VECTOR_STORES_CACHE: Dict[str, Any] = {
    "naive": None,
    "hybrid": None,
    "agentic": None
}

PIPELINE_CACHE: Dict[str, Any] = {}
IS_INDEXING = False


def normalize_rag_type(rag_type: str) -> str:
    """Normalise la chaîne rag_type pour correspondre aux clés du cache."""
    r_type = rag_type.lower().strip()
    if "naive" in r_type:
        return "naive"
    elif "hybrid" in r_type:
        return "hybrid"
    elif "agentic" in r_type:
        return "agentic"
    return r_type


def get_all_data_files(data_dir: str = "app/data") -> List[Dict[str, str]]:
    """
    Parcourt récursivement le dossier app/data et tous ses sous-dossiers (2018 à 2025).
    Retourne la liste complète des fichiers compatibles (.pdf, .txt, .docx).
    """
    supported_extensions = {".pdf", ".txt", ".docx"}
    supported_files = []

    # Vérification et fallback du dossier source
    if not os.path.exists(data_dir):
        if os.path.exists("data"):
            data_dir = "data"
        else:
            os.makedirs(data_dir, exist_ok=True)
            return []

    for root, _, files in os.walk(data_dir):
        for file in files:
            ext = os.path.splitext(file)[1].lower()
            if ext in supported_extensions:
                full_path = os.path.join(root, file).replace("\\", "/")
                rel_path = os.path.relpath(full_path, data_dir).replace("\\", "/")
                
                size_mb = os.path.getsize(full_path) / (1024 * 1024)
                supported_files.append({
                    "name": rel_path,
                    "path": full_path,
                    "size": f"{size_mb:.2f} MB"
                })

    return supported_files


# --- FONCTIONS DE GESTION DU CACHE ---

def clear_vector_stores_cache():
    global VECTOR_STORES_CACHE
    VECTOR_STORES_CACHE = {"naive": None, "hybrid": None, "agentic": None}
    print("🧹 [CACHE] Réinitialisation des bases vectorielles.")


def clear_pipeline_cache(rag_type: Optional[str] = None):
    global PIPELINE_CACHE
    if rag_type:
        norm_type = normalize_rag_type(rag_type)
        if norm_type in PIPELINE_CACHE:
            del PIPELINE_CACHE[norm_type]
    else:
        PIPELINE_CACHE.clear()

    clear_vector_stores_cache()


# --- WARM-UP & INSTANCIATION DES PIPELINES ---

def get_pipeline_from_db(db: Session, rag_type: str):
    norm_type = normalize_rag_type(rag_type)
    
    if norm_type not in PIPELINE_CACHE:
        config_record = db.query(RAGConfigModel).filter(RAGConfigModel.rag_type == rag_type).first()
        collection_name = f"collection_{norm_type}"
        
        config = {
            "rag_type": norm_type,
            "cleaner": config_record.cleaner if config_record else "standard",
            "chunking_strategy": config_record.chunking_strategy if config_record else "fixed_size",
            "chunk_size": config_record.chunk_size if config_record else 500,
            "chunk_overlap": config_record.chunk_overlap if config_record else 80,
            "embedding_model": config_record.embedding_model if config_record else "all-MiniLM-L6-v2",
            "vectorstore_type": config_record.vectorstore_type if config_record else "chroma",
            "retrieval_strategy": config_record.retrieval_strategy if config_record else ("hybrid" if norm_type == "hybrid" else "similarity"),
            "top_k": config_record.top_k if config_record else 4,
            "llm_provider": config_record.llm_provider if config_record else "ollama",
            "llm_model": config_record.llm_model if config_record else "llama3.2:latest",
            "collection_name": collection_name
        }

        pipeline = RAGPipelineFactory.get_pipeline(config, vector_store=VECTOR_STORES_CACHE.get(norm_type))
        PIPELINE_CACHE[norm_type] = pipeline
        if hasattr(pipeline, "vector_store") and pipeline.vector_store:
            VECTOR_STORES_CACHE[norm_type] = pipeline.vector_store

    return PIPELINE_CACHE[norm_type]


def reindex_all_pipelines_worker(file_paths: Optional[List[str]] = None):
    """Effectue l'ingestion physique (_ingest) dans les 3 vector stores."""
    global IS_INDEXING, VECTOR_STORES_CACHE
    IS_INDEXING = True

    local_db = SessionLocal()
    try:
        if file_paths and len(file_paths) > 0:
            target_files = file_paths
        else:
            all_file_objects = get_all_data_files()
            target_files = [f["path"] for f in all_file_objects]

        if not target_files:
            print("⚠️ Aucun fichier valide trouvé pour le prétraitement.")
            return

        print("\n" + "="*80)
        print(f"🚀 [PRÉTRAITEMENT GLOBAL] Traitement de {len(target_files)} fichier(s)...")
        print("="*80)

        clear_pipeline_cache()

        for r_type in ["naive", "hybrid", "agentic"]:
            pipeline = get_pipeline_from_db(local_db, r_type)
            if hasattr(pipeline, "_ingest"):
                print(f"⚙️ Ingestion pour le pipeline '{r_type}'...")
                vector_store = pipeline._ingest(target_files)
                VECTOR_STORES_CACHE[r_type] = vector_store

        print("\n✅ [PRÉTRAITEMENT TERMINÉ] Indexation globale effectuée !")
        print("="*80 + "\n")

    except Exception as e:
        print(f"❌ [ERREUR PRÉTRAITEMENT] : {e}")
    finally:
        local_db.close()
        IS_INDEXING = False


def trigger_global_reindexing(file_paths: Optional[List[str]] = None):
    """Lance la ré-indexation globale en arrière-plan."""
    global IS_INDEXING
    if not IS_INDEXING:
        thread = threading.Thread(
            target=reindex_all_pipelines_worker, 
            args=(file_paths,), 
            daemon=True
        )
        thread.start()


def _warm_up_worker():
    global VECTOR_STORES_CACHE, IS_INDEXING
    IS_INDEXING = False

    local_db = SessionLocal()
    try:
        print("\n" + "="*80)
        print("⏳ [WARM-UP] Chargement direct des bases vectorielles depuis le disque...")
        print("="*80)

        for r_type in ["naive", "hybrid", "agentic"]:
            pipeline = get_pipeline_from_db(local_db, r_type)
            VECTOR_STORES_CACHE[r_type] = getattr(pipeline, "vector_store", None)
            print(f"✅ Base vectorielle '{r_type}' chargée !")

        print("\n🚀 [WARM-UP TERMINÉ] L'Agent TT est disponible !")
        print("="*80 + "\n")

    except Exception as e:
        print(f"\n❌ [WARM-UP ERREUR] : {e}")
    finally:
        local_db.close()
        IS_INDEXING = False


def warm_up_all_vector_stores():
    global IS_INDEXING
    if not IS_INDEXING:
        thread = threading.Thread(target=_warm_up_worker, daemon=True)
        thread.start()


def get_indexing_status():
    global IS_INDEXING, VECTOR_STORES_CACHE
    all_loaded = all(VECTOR_STORES_CACHE.get(k) is not None for k in ["naive", "hybrid", "agentic"])
    return {
        "is_indexing": IS_INDEXING,
        "is_ready": all_loaded and not IS_INDEXING
    }


class RAGRunnerService:

    @staticmethod
    def answer_question(db: Session, rag_type: str, query: str, data_dir: Optional[str] = None) -> Dict[str, Any]:
        norm_type = normalize_rag_type(rag_type)

        if IS_INDEXING:
            raise RuntimeError("⚠️ L'administrateur met à jour la base de connaissances. La messagerie est temporairement indisponible.")

        clean_query = query.strip().lower()
        if clean_query in GREETINGS:
            return {
                "answer": "Bonjour ! Je suis l'assistant RAG Tunisie Telecom. Comment puis-je vous aider aujourd'hui ?",
                "rag_type": rag_type,
                "sources": []
            }

        pipeline = get_pipeline_from_db(db, rag_type)

        try:
            result = pipeline.run_pipeline(query=query)
            if isinstance(result, str):
                return {"answer": result, "rag_type": rag_type}
            return result
        except Exception as e:
            print(f"❌ Erreur RAG ({rag_type}) : {e}")
            raise RuntimeError(f"Erreur du moteur RAG : {str(e)}")