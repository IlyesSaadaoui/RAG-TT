import os
import shutil
import io
import enum
from fastapi import APIRouter, Depends, HTTPException, status, File, UploadFile, Form, BackgroundTasks
from sqlalchemy.orm import Session
from PIL import Image
from app.services.face_service import FaceService
from app.database import get_db
from app.models.user import User, UserRole, UserLoginLog
from app.models.whitelist import Whitelist
from app.schemas.user import UserCreate, UserLogin, UserResponse, Token
from app.core.security import get_password_hash, verify_password, create_access_token


router = APIRouter(prefix="/auth", tags=["auth"])

UPLOAD_DIR = "static/faces"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_user(
    username: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(...),
    role: str = Form(...),
    photo: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    clean_email = email.strip().lower()

    if not clean_email.endswith("tunisietelecom.tn"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Accès refusé. L'adresse email doit appartenir au domaine tunisietelecom.tn."
        )

    whitelisted = db.query(Whitelist).filter(Whitelist.email == clean_email).first()
    if not whitelisted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès refusé. Votre adresse email n'est pas autorisée par l'administrateur (non présente dans la Whitelist)."
        )

    if len(phone) != 8 or not phone.isdigit():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le numéro de téléphone doit être composé d'exactement 8 chiffres."
        )

    clean_role = role.strip().lower()
    if clean_role in ["admin", "administrateur"]:
        validated_role = UserRole.ADMIN
    elif clean_role in ["agent", "agent tt"]:
        validated_role = UserRole.AGENT
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rôle invalide. Les rôles autorisés sont 'Administrateur' ou 'Agent TT'."
        )

    user_exists = db.query(User).filter(
        (User.email == clean_email) |
        (User.username == username) |
        (User.phone == phone)
    ).first()

    if user_exists:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'identifiant, l'adresse email ou le numéro de téléphone est déjà associé à un compte."
        )

    try:
        image_content = await photo.read()
        image = Image.open(io.BytesIO(image_content))
        image.verify()
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Le fichier fourni n'est pas une image valide."
        )

    file_extension = os.path.splitext(photo.filename)[1] or ".jpg"
    secure_filename = f"ref_{username}_{clean_email.replace('@', '_at_')}{file_extension}"
    file_path = os.path.join(UPLOAD_DIR, secure_filename)

    await photo.seek(0)
    with open(file_path, "wb") as buffer:
        shutil.copyfileobj(photo.file, buffer)

    hashed_pwd = get_password_hash(password)
    new_user = User(
        username=username,
        email=clean_email,
        hashed_password=hashed_pwd,
        phone=phone,
        role=validated_role,
        face_image_path=file_path
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "status": "success",
        "message": "Enrôlement technique, hiérarchique et biométrique réussi !",
        "user": {
            "id": new_user.id,
            "username": new_user.username,
            "email": new_user.email,
            "phone": new_user.phone,
            "role": new_user.role.value,
            "face_image_path": new_user.face_image_path
        }
    }


# 2. ROUTE POUR LA CONNEXION (LOGIN) WITH FACIAL SCAN
@router.post("/login", response_model=Token)
def login_user(login_in: UserLogin, background_tasks: BackgroundTasks, db: Session = Depends(get_db)):
    clean_email = login_in.email.strip().lower()

    whitelisted = db.query(Whitelist).filter(Whitelist.email == clean_email).first()
    if not whitelisted:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Accès révoqué. Votre adresse email n'est pas/plus autorisée dans la Whitelist."
        )

    user = db.query(User).filter(User.email == clean_email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiants (Email ou Mot de passe) incorrects."
        )

    if not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Identifiants (Email ou Mot de passe) incorrects."
        )

    if not login_in.facial_data_sample:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="L'authentification faciale est obligatoire pour accéder à l'environnement RAG."
        )

    if not user.face_image_path or not os.path.exists(user.face_image_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Image de référence biométrique introuvable sur le serveur. Veuillez ré-enrôler votre compte."
        )

    print(f"[IA SCAN] Début de la comparaison faciale pour l'utilisateur {user.username}...")

    is_face_valid = FaceService.verify_face(
        uploaded_base64=login_in.facial_data_sample,
        reference_image_name=user.face_image_path
    )

    if not is_face_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Échec de la validation biométrique. Le visage ne correspond pas à l'agent authentifié."
        )

    print(f"[IA SCAN] Succès ! Visage validé pour {user.username}.")

    try:
        login_log = UserLoginLog(user_id=user.id)
        db.add(login_log)
        db.commit()
    except Exception as e:
        print(f"[METRIQUES] Erreur lors de l'enregistrement du log : {e}")
        db.rollback()

    # ⚠️ SUPPRIMÉ : warm_up_all_vector_stores() ne se lance plus ici.
    # L'indexation est désormais déclenchée une seule fois au démarrage du
    # serveur (voir app/main.py, événement "startup"), plus jamais au login.

    access_token = create_access_token(
        data={"sub": user.email, "role": user.role.value}
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": user.role.value
    }