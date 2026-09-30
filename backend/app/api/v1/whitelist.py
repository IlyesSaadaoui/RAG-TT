from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session

# Importations adaptées à la structure de ton projet
from app.database import get_db
from app.models.whitelist import Whitelist  # Ajuste le nom du fichier modèle si besoin

router = APIRouter(
    prefix="/admin/whitelist",
    tags=["Admin - Whitelist"]
)


# 🟢 1. GET : Récupérer tous les emails autorisés
@router.get("")
def get_whitelist(db: Session = Depends(get_db)):
    items = db.query(Whitelist).order_by(Whitelist.created_at.desc()).all()
    
    return [
        {
            "id": item.id,
            "email": item.email,
            "created_at": item.created_at.isoformat() if item.created_at else ""
        }
        for item in items
    ]


# 🔵 2. POST : Ajouter un email (validation directe sans schéma)
@router.post("", status_code=status.HTTP_201_CREATED)
def add_email_to_whitelist(payload: dict = Body(...), db: Session = Depends(get_db)):
    raw_email = payload.get("email", "")
    email_clean = str(raw_email).lower().strip()

    # ❌ 1. Champ vide ?
    if not email_clean:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'adresse email est obligatoire."
        )

    # ❌ 2. Mauvaise extension de domaine ?
    if not email_clean.endswith("@tunisietelecom.tn"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'email doit obligatoirement se terminer par '@tunisietelecom.tn'"
        )

    # ❌ 3. Déjà dans la BDD ?
    existing = db.query(Whitelist).filter(Whitelist.email == email_clean).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà enregistré dans la whitelist."
        )

    # ✅ Insertion BDD
    new_entry = Whitelist(email=email_clean)
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)

    return {"message": "Email ajouté avec succès", "email": new_entry.email}


# 🔴 3. DELETE : Supprimer un email
@router.delete("")
def delete_email_from_whitelist(email: str = Query(...), db: Session = Depends(get_db)):
    email_clean = email.lower().strip()
    entry = db.query(Whitelist).filter(Whitelist.email == email_clean).first()
    
    if not entry:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Email non trouvé dans la whitelist."
        )

    db.delete(entry)
    db.commit()

    return {"message": f"L'email {email_clean} a été retiré avec succès."}