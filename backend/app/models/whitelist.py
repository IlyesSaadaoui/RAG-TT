from sqlalchemy import Column, Integer, String, DateTime
from datetime import datetime
from app.database import Base

class Whitelist(Base):
    __tablename__ = "whitelist"

    id = Column(Integer, primary_key=True, index=True)
    
    # L'adresse email unique et obligatoire
    email = Column(String, unique=True, index=True, nullable=False)
    
    # La date d'ajout automatique
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)