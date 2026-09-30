from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from app.core.config import settings

# 1. On crée le moteur de connexion (Engine) en utilisant notre URL dynamique
engine = create_engine(
    settings.DATABASE_URL,
    # pool_pre_ping=True évite les déconnexions silencieuses en testant la connexion avant chaque requête
    pool_pre_ping=True 
)

# 2. On crée l'usine à sessions
# - autocommit=False : On valide les changements en base manuellement (commit) pour plus de sécurité
# - autoflush=False : On contrôle quand envoyer les modifications en base de données
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# 3. Le moule de base pour nos futurs modèles SQL
Base = declarative_base()

# 4. Fonction utilitaire (Générateur) pour gérer la durée de vie de chaque session
def get_db():
    db = SessionLocal()
    try:
        yield db  # On fournit la session à la requête en cours
    finally:
        db.close()  # Une fois la requête terminée (succès ou erreur), on ferme proprement la session !