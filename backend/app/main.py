import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.database import engine, Base

# ⚠️ S'assurer que les dossiers locaux indispensables existent
os.makedirs("static/faces", exist_ok=True)
os.makedirs("app/data", exist_ok=True)  # Dossier contenant vos documents source PDF/Docs

# ⚠️ IMPORT OBLIGATOIRE DES MODÈLES POUR GÉNÉRER LES TABLES DANS POSTGRESQL
import app.models.chat       # Charge les modèles ChatSession et ChatMessage
import app.models.user       # Charge le modèle User
import app.models.whitelist  # Charge le modèle Whitelist pour la BDD
import app.models.rag_config # Charge le modèle RAGConfigModel
import app.models.search_space # Charge le modèle SearchSpaceModel

# Import des routeurs d'API
from app.api.v1.auth import router as auth_router
from app.api.v1.rag import router as rag_router
from app.api.v1.chat import router as chat_router
from app.api.v1.user import router as user_router
from app.api.v1.admin import router as admin_router  # Routeur d'administration (admin_2.py)
from app.api.v1.websocket import router as websocket_router
from app.api.v1.whitelist import router as whitelist_router
from app.services.rag_service import warm_up_all_vector_stores


# 1. CRÉATION AUTOMATIQUE DES TABLES DANS POSTGRESQL
try:
    print("--------------------------------------------------")
    print("🔄 Initialisation de la base de données...")
    Base.metadata.create_all(bind=engine)
    print("✅ Base de données initialisée et tables synchronisées avec succès !")
    print("--------------------------------------------------")
except Exception as e:
    print("--------------------------------------------------")
    print(f"❌ Erreur lors de l'initialisation de la base de données : {e}")
    print("--------------------------------------------------")

# 2. INSTANCIATION DE L'APPLICATION FASTAPI
app = FastAPI(
    title="RAG Telecom Platform API",
    description="Backend de gestion de Chat AI RAG avec authentification par Scan Facial",
    version="1.0.0"
)

# 3. CONFIGURATION DE LA SÉCURITÉ CORS
origins = [
    "http://localhost:3000",     # Port par défaut React (Create React App)
    "http://127.0.0.1:3000",
    "http://localhost:5173",     # Port par défaut Vite / React
    "http://127.0.0.1:5173",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,        # Liste des frontends autorisés
    allow_credentials=True,
    allow_methods=["*"],          # Autorise toutes les méthodes (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],          # Autorise tous les headers HTTP
)

# 3.5 EXPOSITION DES FICHIERS STATIQUES (photos de profil / visages de référence)
app.mount("/static", StaticFiles(directory="static"), name="static")

# 4. INCLUSION DES ROUTEURS D'API
app.include_router(auth_router)
app.include_router(rag_router, prefix="/api/v1/rag", tags=["RAG Engine"])
app.include_router(chat_router, prefix="/api/v1/chat", tags=["Chat History"])
app.include_router(user_router, prefix="/api/v1", tags=["User Profile"])
app.include_router(websocket_router, tags=["WebSocket"])

# ⚠️ ADMIN & WHITELIST
app.include_router(admin_router, prefix="/api/v1", tags=["Admin"])
app.include_router(whitelist_router, prefix="/api/v1", tags=["Admin - Whitelist"])

@app.on_event("startup")
def startup_event():
    """
    Lance la vectorisation au démarrage du serveur.
    """
    print("🚀 [STARTUP] Lancement de l'indexation des bases vectorielles au démarrage du serveur...")
    warm_up_all_vector_stores()


# 5. ROUTE DE BASE (TEST DE BON FONCTIONNEMENT)
@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "Bienvenue sur l'API de RAG Telecom Platform",
        "version": "1.0.0"
    }