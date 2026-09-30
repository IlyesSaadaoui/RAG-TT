from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from app.models.user import UserRole


# ==========================================
# 1. SCHÉMA DE BASE (Champs communs)
# ==========================================
class UserBase(BaseModel):
    email: EmailStr
    username: str = Field(..., description="Le handle unique de l'utilisateur commençant par @")
    # ⚠️ CORRIGÉ : renommé pour correspondre exactement à la colonne SQLAlchemy `phone`
    # (l'ancien nom "phone_number" ne correspondait à aucune colonne du modèle User,
    # ce qui faisait que ce champ était toujours renvoyé à null par l'API)
    phone: Optional[str] = None


# ==========================================
# 2. INSCRIPTION (SIGN UP)
# ==========================================
class UserCreate(UserBase):
    password: str = Field(..., min_length=6, description="Le mot de passe de l'utilisateur")
    # ⚠️ CORRIGÉ : renommé pour correspondre à la colonne SQLAlchemy `face_image_path`
    face_image_path: Optional[str] = None


# ==========================================
# 3. CONNEXION (LOGIN)
# ==========================================
class UserLogin(BaseModel):
    email: EmailStr
    password: str
    facial_data_sample: str = Field(
        ...,
        validation_alias="faceMatchToken",
        description="Données biométriques Base64 obligatoires reçues de la caméra"
    )


# ==========================================
# 4. MISE À JOUR DU PROFIL
# ==========================================
class UserProfileUpdate(BaseModel):
    """
    Rend tous les champs optionnels pour permettre
    une mise à jour partielle (ex: changer uniquement le téléphone ou la photo).

    ⚠️ CORRIGÉ : les noms des champs correspondent maintenant EXACTEMENT à ceux
    envoyés par le frontend (AgentTT.jsx -> payload = { username, email, phone,
    face_image_path, password }). Avant, Pydantic ignorait silencieusement
    "phone" et "face_image_path" reçus du frontend car le schéma attendait
    "phone_number" et "profile_picture_url" — d'où les modifications qui
    n'étaient jamais appliquées.
    """
    username: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    password: Optional[str] = Field(None, min_length=6, description="Nouveau mot de passe si modifié")
    face_image_path: Optional[str] = None


# ==========================================
# 5. RÉPONSE API (RESPONSE SCHEMAS)
# ==========================================
class UserResponse(UserBase):
    id: int
    role: UserRole
    # ⚠️ CORRIGÉ : renommé pour correspondre à la colonne SQLAlchemy `face_image_path`.
    # Avant, ce champ s'appelait "profile_picture_url" qui n'existe pas sur le modèle
    # User -> FastAPI/Pydantic (response_model + from_attributes) filtrait la valeur
    # réelle et renvoyait toujours null au frontend.
    face_image_path: Optional[str] = None
    is_active: bool = True

    # Pydantic v2 : Permet de lire directement depuis les objets SQLAlchemy / ORM
    class Config:
        from_attributes = True


# ==========================================
# 6. SESSIONS ET TOKENS JWT
# ==========================================
class Token(BaseModel):
    access_token: str
    token_type: str
    role: str


class TokenData(BaseModel):
    email: Optional[str] = None

# ==========================================
# 7. METRIQUES ET STATISTIQUES (ADMIN)
# ==========================================
class DailyTrendResponse(BaseModel):
    date: str = Field(..., description="Date au format DD/MM")
    count: int = Field(..., description="Nombre de connexions enregistrées ce jour-là")

    class Config:
        from_attributes = True