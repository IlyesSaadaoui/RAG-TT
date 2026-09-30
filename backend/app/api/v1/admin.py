import os
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict, Optional
from datetime import datetime, timedelta

from app.database import get_db
from app.models.user import User, UserLoginLog
from app.models.rag_config import RAGConfigModel
from app.rag.constants import RAG_OPTIONS

# Imports nettoyés depuis le dossier schemas
from app.schemas.user import UserResponse, DailyTrendResponse
from app.schemas.admin import RoleUpdateSchema, RAGConfigSchema, ReindexGlobalSchema

from app.services.rag_service import (
    clear_pipeline_cache, 
    warm_up_all_vector_stores, 
    get_indexing_status,
    get_all_data_files,
    trigger_global_reindexing
)

router = APIRouter(prefix="/admin", tags=["admin"])


# ============================================================================
# 1. GESTION DES UTILISATEURS
# ============================================================================
@router.get("/users", response_model=List[UserResponse])
def get_all_users(db: Session = Depends(get_db)):
    """Récupère tous les utilisateurs enregistrés dans la DB."""
    return db.query(User).all()


@router.put("/users/{user_id}/role")
def update_user_role(
    user_id: int, 
    role_data: RoleUpdateSchema, 
    db: Session = Depends(get_db)
):
    """Met à jour le rôle d'un utilisateur ('Administrateur' ou 'Agent TT')."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID #{user_id} non trouvé."
        )

    user.role = role_data.role
    db.commit()
    db.refresh(user)

    return {
        "success": True, 
        "message": f"Le rôle de {user.username} a été changé en '{role_data.role}'."
    }


@router.delete("/users/{user_id}")
def delete_user(user_id: int, db: Session = Depends(get_db)):
    """Supprime définitivement un utilisateur."""
    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Utilisateur avec l'ID #{user_id} introuvable."
        )

    db.delete(user)
    db.commit()

    return {
        "success": True, 
        "message": f"L'utilisateur #{user_id} a été supprimé avec succès."
    }


# ============================================================================
# 2. MÉTRIQUES ET GRAPHES (Tendance sur 14 jours)
# ============================================================================
@router.get("/metrics/daily-trend", response_model=List[DailyTrendResponse])
def get_daily_connection_trend(db: Session = Depends(get_db)):
    """
    Retourne le nombre de connexions par jour sur les 14 derniers jours.
    """
    now = datetime.utcnow()
    fourteen_days_ago = now - timedelta(days=13)
    
    try:
        dialect = db.bind.dialect.name
        if dialect == "postgresql":
            date_format_func = func.to_char(UserLoginLog.logged_at, 'DD/MM')
        else:
            date_format_func = func.strftime('%d/%m', UserLoginLog.logged_at)

        results = (
            db.query(
                date_format_func.label("date"),
                func.count(UserLoginLog.id).label("count")
            )
            .filter(UserLoginLog.logged_at >= fourteen_days_ago)
            .group_by("date")
            .all()
        )

        db_counts = {row.date: row.count for row in results}

        trend_data = []
        for i in range(14):
            day = fourteen_days_ago + timedelta(days=i)
            day_str = day.strftime("%d/%m")
            trend_data.append({
                "date": day_str,
                "count": db_counts.get(day_str, 0)
            })

        return trend_data

    except Exception as e:
        print(f"[METRICS ERROR] {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Erreur lors du calcul de la tendance quotidienne."
        )


# ============================================================================
# 3. GESTION DES CONFIGURATIONS RAG
# ============================================================================
@router.get("/rag/options")
def get_rag_options():
    """Renvoie les listes des options disponibles pour l'interface Admin."""
    return RAG_OPTIONS


@router.get("/rag/config/{rag_type}")
def get_rag_config(rag_type: str, db: Session = Depends(get_db)):
    """Récupère la configuration actuelle d'un type de RAG."""
    config = db.query(RAGConfigModel).filter(RAGConfigModel.rag_type == rag_type).first()
    if not config:
        return {
            "rag_type": rag_type,
            "cleaner": "standard",
            "chunking_strategy": "fixed_size",
            "chunk_size": 500,
            "chunk_overlap": 80,
            "embedding_model": "all-MiniLM-L6-v2",
            "vectorstore_type": "chroma",
            "retrieval_strategy": "hybrid" if "hybrid" in rag_type else "similarity",
            "top_k": 4,
            "llm_provider": "ollama",
            "llm_model": "llama3.2:latest"
        }
    return config


@router.post("/rag/config")
def save_rag_config(config_data: RAGConfigSchema, db: Session = Depends(get_db)):
    """Enregistre la configuration RAG et réinitialise le cache."""
    existing_config = db.query(RAGConfigModel).filter(
        RAGConfigModel.rag_type == config_data.rag_type
    ).first()

    if existing_config:
        for key, value in config_data.dict().items():
            setattr(existing_config, key, value)
    else:
        existing_config = RAGConfigModel(**config_data.dict())
        db.add(existing_config)

    db.commit()
    db.refresh(existing_config)

    clear_pipeline_cache(config_data.rag_type)

    return {
        "success": True,
        "message": f"Configuration '{config_data.rag_type}' enregistrée.",
        "config": existing_config
    }


@router.post("/rag/reindex")
def trigger_rag_reindex():
    status_info = get_indexing_status()
    if status_info.get("is_indexing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Une ré-indexation des bases vectorielles est déjà en cours d'exécution."
        )
    
    warm_up_all_vector_stores()
    return {
        "success": True,
        "message": "🚀 Ré-indexation des 3 bases vectorielles démarrée en arrière-plan !"
    }


# ============================================================================
# 4. GESTION DES FICHIERS DE DONNÉES & PRÉTRAITEMENT GLOBAL
# ============================================================================

@router.get("/files", response_model=List[Dict[str, str]])
async def get_available_files():
    """
    Récupère récursivement la liste de tous les fichiers (2018 à 2025)
    depuis app/data pour alimenter la sélection côté Frontend.
    """
    return get_all_data_files()


@router.post("/reindex-global")
def reindex_global(data: ReindexGlobalSchema):
    """
    Déclenche le prétraitement et l'indexation globale pour les fichiers sélectionnés.
    """
    status_info = get_indexing_status()
    if status_info.get("is_indexing"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Un traitement ou une ré-indexation est déjà en cours."
        )

    trigger_global_reindexing(file_paths=data.file_paths)

    count_str = f"{len(data.file_paths)}" if data.file_paths else "tous les"
    return {
        "success": True,
        "message": f"🚀 Prétraitement global démarré pour {count_str} fichier(s) sur les 3 pipelines !"
    }