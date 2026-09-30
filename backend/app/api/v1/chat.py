from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from typing import List, Dict
from pydantic import BaseModel

from app.database import get_db
from app.models.chat import ChatSession, ChatMessage
from app.schemas.chat import (
    ChatSessionResponse, 
    ChatSessionCreate, 
    ChatMessageCreate, 
    ChatMessageResponse
)

router = APIRouter()


# Schema Pydantic pour la réponse des statistiques RAG
class RagUsageStatsResponse(BaseModel):
    total: int
    percentages: Dict[str, float]
    counts: Dict[str, int]


# 1. Obtenir toutes les discussions d'un utilisateur
@router.get("/sessions/{user_email}", response_model=List[ChatSessionResponse])
def get_user_sessions(user_email: str, db: Session = Depends(get_db)):
    return db.query(ChatSession)\
             .filter(ChatSession.user_email == user_email)\
             .order_by(ChatSession.created_at.desc())\
             .all()


# 2. Créer une nouvelle session/discussion
@router.post("/sessions", response_model=ChatSessionResponse)
def create_session(payload: ChatSessionCreate, db: Session = Depends(get_db)):
    new_session = ChatSession(
        user_email=payload.user_email,
        title=payload.title
    )
    db.add(new_session)
    db.commit()
    db.refresh(new_session)
    return new_session


# 3. Récupérer les messages d'une discussion
@router.get("/sessions/{session_id}/messages", response_model=List[ChatMessageResponse])
def get_session_messages(session_id: str, db: Session = Depends(get_db)):
    return db.query(ChatMessage)\
             .filter(ChatMessage.session_id == session_id)\
             .order_by(ChatMessage.created_at.asc())\
             .all()


# 4. Ajouter un message dans une discussion
@router.post("/sessions/{session_id}/messages", response_model=ChatMessageResponse)
def add_message_to_session(session_id: str, payload: ChatMessageCreate, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")

    new_message = ChatMessage(
        session_id=session_id,
        sender=payload.sender,
        text=payload.text,
        rag_type=payload.rag_type
    )
    db.add(new_message)
    
    # Met à jour le titre de la session si c'est le premier message utilisateur
    if payload.sender == "user" and session.title == "Nouvelle discussion":
        session.title = payload.text[:30] + ("..." if len(payload.text) > 30 else "")

    db.commit()
    db.refresh(new_message)
    return new_message


# 5. Supprimer une discussion
@router.delete("/sessions/{session_id}")
def delete_session(session_id: str, db: Session = Depends(get_db)):
    session = db.query(ChatSession).filter(ChatSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session non trouvée")
    
    db.delete(session)
    db.commit()
    return {"message": "Session supprimée avec succès"}


# 6. Statistiques cumulées d'utilisation des moteurs RAG (Temps réel depuis la création BDD)
@router.get("/stats/rag-usage", response_model=RagUsageStatsResponse)
def get_rag_usage_stats(db: Session = Depends(get_db)):
    try:
        # Décompte total des réponses générées par le bot qui ont un rag_type renseigné
        total_bot_messages = db.query(ChatMessage).filter(
            ChatMessage.sender == 'bot',
            ChatMessage.rag_type.isnot(None)
        ).count()

        if total_bot_messages == 0:
            return {
                "total": 0,
                "percentages": {"naive": 0.0, "hybrid": 0.0, "agentic": 0.0},
                "counts": {"naive": 0, "hybrid": 0, "agentic": 0}
            }

        # Regroupement et comptage par type de RAG
        results = db.query(
            ChatMessage.rag_type, 
            func.count(ChatMessage.id)
        ).filter(
            ChatMessage.sender == 'bot',
            ChatMessage.rag_type.isnot(None)
        ).group_by(ChatMessage.rag_type).all()

        counts = {"naive": 0, "hybrid": 0, "agentic": 0}

        for rag_type, count in results:
            if not rag_type:
                continue
            clean_type = str(rag_type).lower().strip()
            
            # Normalisation des alias RAG
            if 'na' in clean_type:
                counts["naive"] += count
            elif 'hybr' in clean_type:
                counts["hybrid"] += count
            elif 'agent' in clean_type:
                counts["agentic"] += count

        # Calcul exact des pourcentages
        percentages = {
            k: round((v / total_bot_messages) * 100, 1) 
            for k, v in counts.items()
        }

        return {
            "total": total_bot_messages,
            "percentages": percentages,
            "counts": counts
        }

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Erreur lors du calcul des statistiques RAG: {str(e)}"
        )