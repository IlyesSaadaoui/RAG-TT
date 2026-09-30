import os
import shutil
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile
from sqlalchemy.orm import Session
from typing import Optional

from app.database import get_db
from app.models.user import User  # Ton modèle SQLAlchemy User
from app.schemas.user import UserResponse, UserProfileUpdate
from app.core.security import get_password_hash

UPLOAD_DIR = "static/faces"
os.makedirs(UPLOAD_DIR, exist_ok=True)

# 1. Ajout du préfixe exact pour correspondre à tes appels Frontend
router = APIRouter(prefix="/user", tags=["user"])


# 1. GET /user/profile/{email} : Récupérer le profil d'un utilisateur par son email
@router.get("/profile/{email}", response_model=UserResponse)
def get_user_profile(email: str, db: Session = Depends(get_db)):
    # .strip() au cas où des espaces ou majuscules traînent
    clean_email = email.strip()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )
    return user


# 2. PUT /user/profile/{email} : Mettre à jour les informations du profil
@router.put("/profile/{email}", response_model=UserResponse)
def update_user_profile(
    email: str,
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db)
):
    clean_email = email.strip()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    # Mise à jour du username
    if profile_data.username is not None:
        user.username = profile_data.username

    # ⚠️ CORRIGÉ : l'email n'était jamais réassigné auparavant, malgré sa présence
    # dans UserProfileUpdate. On vérifie aussi l'unicité pour éviter un conflit
    # avec un autre compte existant.
    if profile_data.email is not None and profile_data.email != user.email:
        # 🔒 AJOUTÉ : cette vérification existait déjà dans /auth/register mais
        # était absente ici. Sans elle, n'importe qui pouvait contourner la
        # restriction de domaine simplement en modifiant son profil après
        # inscription.
        if not profile_data.email.endswith("tunisietelecom.tn"):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Accès refusé. L'adresse email doit appartenir au domaine tunisietelecom.tn."
            )

        email_taken = db.query(User).filter(
            User.email == profile_data.email,
            User.id != user.id
        ).first()
        if email_taken:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cette adresse email est déjà utilisée par un autre compte."
            )
        user.email = profile_data.email

    # ⚠️ CORRIGÉ : "phone" correspond maintenant exactement au nom de colonne du
    # modèle ET au nom de champ envoyé par le frontend (plus de hasattr sur un
    # nom de champ qui n'existait pas dans le schéma).
    if profile_data.phone is not None:
        # 🔒 AJOUTÉ : même validation que /auth/register (8 chiffres tunisiens),
        # absente ici auparavant.
        if len(profile_data.phone) != 8 or not profile_data.phone.isdigit():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Le numéro de téléphone doit être composé d'exactement 8 chiffres."
            )
        user.phone = profile_data.phone

    # ⚠️ CORRIGÉ : "face_image_path" correspond maintenant exactement au nom de
    # colonne du modèle ET au nom de champ envoyé par le frontend.
    if profile_data.face_image_path is not None:
        user.face_image_path = profile_data.face_image_path

    # 🔒 HACHAGE DU MOT DE PASSE S'IL A ÉTÉ MODIFIÉ
    if profile_data.password and profile_data.password.strip() != "":
        user.hashed_password = get_password_hash(profile_data.password)

    db.commit()
    db.refresh(user)
    return user


# 3. POST /user/profile/{email}/photo : Uploader une nouvelle photo de référence
# ⚠️ AJOUTÉ : endpoint dédié qui écrit un vrai fichier sur le disque (comme
# /auth/register le fait déjà) et stocke un chemin relatif dans face_image_path.
# C'est indispensable : /auth/login vérifie os.path.exists(user.face_image_path),
# donc ce champ doit TOUJOURS être un chemin de fichier valide, jamais une URL
# absolue ni une chaîne base64 (ce qui cassait l'authentification faciale).
@router.post("/profile/{email}/photo", response_model=UserResponse)
async def update_profile_photo(
    email: str,
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    clean_email = email.strip()
    user = db.query(User).filter(User.email == clean_email).first()

    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Utilisateur non trouvé"
        )

    file_extension = os.path.splitext(photo.filename)[1] or ".jpg"
    secure_filename = f"ref_{user.username}_{user.email.replace('@', '_at_')}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, secure_filename)

    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    user.face_image_path = file_path
    db.commit()
    db.refresh(user)
    return user