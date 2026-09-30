import os
from pydantic_settings import BaseSettings, SettingsConfigDict

# 1. On trouve dynamiquement le dossier racine du backend
# __file__ est le chemin de config.py (app/core/config.py)
# On remonte de 3 niveaux pour arriver au dossier 'backend/'
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.dirname(os.path.dirname(CURRENT_DIR))
ENV_FILE_PATH = os.path.join(BACKEND_DIR, ".env")

class Settings(BaseSettings):
    # Charge les variables globales du projet
    PROJECT_NAME: str = "RAG Telecom Platform"
    VERSION: str = "1.0.0"
    API_PREFIX: str = "/api/v1"
    DEBUG: bool = True

    # Configuration de la Base de Données PostgreSQL
    DATABASE_HOST: str
    DATABASE_PORT: int
    DATABASE_NAME: str
    DATABASE_USER: str
    DATABASE_PASSWORD: str

    SECRET_KEY: str = "SUPER_SECRET_KEY_TELECOM_RAG_2026_A_CHANGER"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60

    # Propriété dynamique pour générer l'URL de connexion PostgreSQL
    @property
    def DATABASE_URL(self) -> str:
        return f"postgresql://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"

    # On passe le chemin absolu calculé à Pydantic !
    model_config = SettingsConfigDict(
        env_file=ENV_FILE_PATH,
        env_file_encoding="utf-8",
        extra="ignore"
    )

# On instancie la classe
settings = Settings()

""" Remplacer le bloc tout en bas par ceci :
if __name__ == "__main__":
    print("--------------------------------------------------")
    print("SUCCES : Le fichier .env a ete trouve et charge !")
    print(f"URL de connexion : {settings.DATABASE_URL}")
    print("--------------------------------------------------")"""
