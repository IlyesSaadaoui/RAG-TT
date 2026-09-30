import { useState, useCallback, useEffect } from 'react';
import { adminApi } from '../services/api';

export default function useAdmin() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // ==========================================
  // 1. STATS TEMPS RÉEL (WebSocket)
  // ==========================================
  const [onlineCount, setOnlineCount] = useState(0);
  const [wsConnected, setWsConnected] = useState(false);

  // Initialisation avec plusieurs points à 0 pour forcer le tracé d'une courbe immédiate
  const [realtimeHistory, setRealtimeHistory] = useState(() => {
    const now = new Date();
    const initialPoints = [];
    for (let i = 4; i >= 0; i--) {
      const t = new Date(now.getTime() - i * 3000);
      initialPoints.push({
        time: t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
        count: 0
      });
    }
    return initialPoints;
  });

  // ==========================================
  // 2. TENDANCE 14 JOURS (API Backend PostgreSQL)
  // ==========================================
  const [dailyTrend, setDailyTrend] = useState([]);
  const [trendLoading, setTrendLoading] = useState(false);

  // ----------------------------------------------------
  // A. Gestion de la connexion WebSocket
  // ----------------------------------------------------
  useEffect(() => {
    let ws;
    let pingInterval;

    try {
      ws = new WebSocket('ws://localhost:8000/ws/online-users');

      ws.onopen = () => {
        setWsConnected(true);
        // Ping automatique toutes les 30 secondes pour maintenir la socket ouverte
        pingInterval = setInterval(() => {
          if (ws.readyState === WebSocket.OPEN) {
            ws.send('ping');
          }
        }, 30000);
      };

      ws.onmessage = (event) => {
        try {
          if (event.data === 'pong') return;

          const data = JSON.parse(event.data);
          if (data.type === 'ONLINE_USERS_COUNT') {
            const count = data.count;
            setOnlineCount(count);

            const timeFormatted = new Date().toLocaleTimeString([], { 
              hour: '2-digit', 
              minute: '2-digit', 
              second: '2-digit' 
            });

            // Mise à jour de l'historique temps réel pour dessiner la courbe
            setRealtimeHistory((prev) => [
              ...prev.slice(-14), // Conserve jusqu'à 15 points
              { time: timeFormatted, count }
            ]);
          }
        } catch (err) {
          console.error("Erreur de parsing WebSocket :", err);
        }
      };

      ws.onerror = () => {
        setWsConnected(false);
      };

      ws.onclose = () => {
        setWsConnected(false);
        if (pingInterval) clearInterval(pingInterval);
      };
    } catch (e) {
      setWsConnected(false);
    }

    return () => {
      if (pingInterval) clearInterval(pingInterval);
      if (ws) ws.close();
    };
  }, []);

  // ----------------------------------------------------
  // B. Charger la tendance des 14 jours depuis l'API
  // ----------------------------------------------------
  const fetchDailyTrend = useCallback(async () => {
    setTrendLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/admin/metrics/daily-trend', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (res.ok) {
        const data = await res.json();
        setDailyTrend(data);
      } else {
        console.error("Impossible de récupérer la tendance 14 jours");
      }
    } catch (err) {
      console.error("Erreur API Daily Trend :", err);
    } finally {
      setTrendLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDailyTrend();
  }, [fetchDailyTrend]);

  // ----------------------------------------------------
  // C. Charger la liste des utilisateurs
  // ----------------------------------------------------
  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await adminApi.getUsers();
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || 'Erreur lors du chargement des utilisateurs');
      }
      const data = await res.json();
      setUsers(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  // ----------------------------------------------------
  // D. Actions Administrateur (Rôles & Suppression)
  // ----------------------------------------------------
  const changeUserRole = async (userId, newRole) => {
    try {
      const res = await adminApi.updateUserRole(userId, newRole);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de modification du rôle');

      setUsers((prev) =>
        prev.map((u) => (u.id === userId ? { ...u, role: newRole } : u))
      );
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  const removeUser = async (userId) => {
    try {
      const res = await adminApi.deleteUser(userId);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Erreur de suppression');

      setUsers((prev) => prev.filter((u) => u.id !== userId));
      return { success: true, message: data.message };
    } catch (err) {
      return { success: false, error: err.message };
    }
  };

  // Valeurs retournées vers le composant React (UsersPanel.jsx)
  return {
    users,
    loading,
    error,
    onlineCount,
    realtimeHistory,
    wsConnected,
    dailyTrend,
    trendLoading,
    fetchUsers,
    fetchDailyTrend,
    changeUserRole,
    removeUser,
  };
}