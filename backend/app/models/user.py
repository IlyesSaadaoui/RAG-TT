from sqlalchemy import Column, Integer, String, Enum, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base

# 1. On définit uniquement les deux rôles souhaités
class UserRole(str, enum.Enum):
    ADMIN = "Administrateur"
    AGENT = "Agent TT"

# 2. Modèle User (SQLAlchemy)
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    
    # Le numéro de téléphone (8 chiffres) obligatoire et unique
    phone = Column(String, unique=True, index=True, nullable=False) 
    
    # Le rôle restreint à "admin" ou "agent"
    role = Column(Enum(UserRole), default=UserRole.AGENT, nullable=False)
    
    # 🌟 CHAMP BIOMÉTRIQUE : Stocke le chemin local du fichier image
    face_image_path = Column(String, nullable=True)

    # Relation inverse avec les logs de connexion
    login_logs = relationship("UserLoginLog", back_populates="user", cascade="all, delete-orphan")


# 3. Modèle pour l'historique des connexions (Métriques)
class UserLoginLog(Base):
    __tablename__ = "user_login_logs"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    logged_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relation vers l'utilisateur
    user = relationship("User", back_populates="login_logs")