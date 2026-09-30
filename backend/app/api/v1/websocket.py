from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from typing import List

router = APIRouter(tags=["websocket"])

class ConnectionManager:
    def __init__(self):
        # Liste de toutes les fenêtres/onglets actuellement ouverts
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        # Notifier tout le monde du nouveau nombre d'utilisateurs connectés
        await self.broadcast_online_count()

    def disconnect(self, websocket: WebSocket):
        # Suppression sécurisée pour éviter les crashs
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_online_count(self):
        # Envoie le total des connexions actives à tous les clients
        count = len(self.active_connections)
        payload = {"type": "ONLINE_USERS_COUNT", "count": count}

        # Copie de la liste pour éviter des erreurs lors des itérations simultanées
        for connection in list(self.active_connections):
            try:
                await connection.send_json(payload)
            except Exception:
                # Si l'envoi échoue (connexion fermée brutalement), on nettoie
                self.disconnect(connection)

manager = ConnectionManager()

@router.websocket("/ws/online-users")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        while True:
            # On maintient la connexion ouverte et on écoute (ex: pings)
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        # Détection automatique de la fermeture d'onglet/fenêtre
        manager.disconnect(websocket)
        await manager.broadcast_online_count()
    except Exception as e:
        print(f"[WS ERROR] Interruption imprévue : {e}")
        manager.disconnect(websocket)
        await manager.broadcast_online_count()