import os
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.orm import Session
from app.schemas.rag import RAGQueryRequest, RAGQueryResponse
from app.services.rag_service import RAGRunnerService, get_indexing_status
from app.database import get_db 

# 📂 Chemin vers le dossier racine contenant tous les dossiers d'années/mois
DATA_DIR = os.path.join("app", "data")

# ✅ FIX : On retire le prefix="/rag" car il est déjà défini dans main.py ("/api/v1/rag")
router = APIRouter()

@router.get("/status")
def check_status():
    return get_indexing_status()

@router.post("/ask", response_model=RAGQueryResponse)
async def ask_rag(
    payload: RAGQueryRequest, 
    db: Session = Depends(get_db)
):
    try:
        # Envoie le dossier global des données
        result = RAGRunnerService.answer_question(
            rag_type=payload.rag_type,
            query=payload.question,
            data_dir=DATA_DIR,  # 👈 Utilisation du dossier global
            db=db
        )
        
        answer_text = result.get("answer") if isinstance(result, dict) else str(result)

        return RAGQueryResponse(
            answer=answer_text,
            rag_type_used=payload.rag_type
        )
        
    except Exception as e:
        print(f"❌ Erreur backend : {e}")
        raise HTTPException(status_code=500, detail=str(e))