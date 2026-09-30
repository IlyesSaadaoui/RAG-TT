from datetime import datetime, timedelta, timezone
from jose import jwt
import bcrypt
from app.core.config import settings

# --- SECTION 1 : GESTION DES MOTS DE PASSE (MODERNE & FIXÉ) ---

def get_password_hash(password: str) -> str:
    """
    Prend un mot de passe en clair, génère un salt et le hache avec bcrypt.
    """
    # On transforme la chaîne en bytes
    password_bytes = password.encode('utf-8')
    # On génère le sel unique
    salt = bcrypt.gensalt()
    # On hache et on re-transforme en texte pour PostgreSQL
    hashed_password = bcrypt.hashpw(password_bytes, salt)
    return hashed_password.decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Vérifie si le mot de passe en clair correspond au mot de passe haché.
    """
    plain_bytes = plain_password.encode('utf-8')
    hashed_bytes = hashed_password.encode('utf-8')
    return bcrypt.checkpw(plain_bytes, hashed_bytes)


# --- SECTION 2 : GESTION DES JETONS DE SESSION (JWT) ---

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt
