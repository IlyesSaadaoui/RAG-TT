const API_BASE = "http://localhost:8000/api/v1";
const AUTH_BASE = "http://localhost:8000";
const SERVER_ORIGIN = "http://localhost:8000";

export function resolveImageUrl(path) {
  if (!path) return null;
  if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  return `${SERVER_ORIGIN}/${path.replace(/^\/+/, '')}`;
}

function authHeaders(withJsonContentType = true) {
  const token = localStorage.getItem('token');
  return {
    ...(withJsonContentType ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
  };
}

export const authApi = {
  login: (payload) =>
    fetch(`${AUTH_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),

  register: (formData) =>
    fetch(`${AUTH_BASE}/auth/register`, {
      method: 'POST',
      body: formData,
    }),
};

export const userApi = {
  getProfile: (email) =>
    fetch(`${API_BASE}/user/profile/${encodeURIComponent(email.trim())}`, {
      headers: authHeaders(),
    }),

  updateProfile: (email, payload) =>
    fetch(`${API_BASE}/user/profile/${encodeURIComponent(email.trim())}`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }),

  uploadPhoto: (email, file) => {
    const formData = new FormData();
    formData.append('photo', file);
    return fetch(`${API_BASE}/user/profile/${encodeURIComponent(email.trim())}/photo`, {
      method: 'POST',
      headers: authHeaders(false),
      body: formData,
    });
  },
};

export const chatApi = {
  listSessions: (email) =>
    fetch(`${API_BASE}/chat/sessions/${encodeURIComponent(email.trim())}`, {
      headers: authHeaders(),
    }),

  getMessages: (sessionId) =>
    fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
      headers: authHeaders(),
    }),

  // Alignement exact avec le schéma Swagger : user_email & title uniquement
  createSession: (email, title) =>
    fetch(`${API_BASE}/chat/sessions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ 
        user_email: String(email).trim(), 
        title: title || "Nouvelle discussion" 
      }),
    }),

  // Alignement exact avec le schéma Swagger : sender & text uniquement
  postMessage: (sessionId, sender, text,ragType=null) =>
    fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ sender, text ,rag_type:ragType}), // 🔴 Ajout de rag_type pour la persistance en BDD
    }),

  deleteSession: (sessionId) =>
    fetch(`${API_BASE}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),
  getRagUsageStats: async () => {
    const token = localStorage.getItem('token');
    const response = await fetch(`${API_BASE}/chat/stats/rag-usage`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      }
    });

    if (!response.ok) {
      throw new Error('Erreur lors de la récupération des statistiques RAG');
    }

    return await response.json();
  }

  
};

export const ragApi = {
  ask: (question, ragType) =>
    fetch(`${API_BASE}/rag/ask`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ question, rag_type: ragType }),
    }),
};

export const adminApi = {
  getUsers: () =>
    fetch(`${API_BASE}/admin/users`, {
      headers: authHeaders(),
    }),

  updateUserRole: (userId, role) =>
    fetch(`${API_BASE}/admin/users/${userId}/role`, {
      method: 'PUT',
      headers: authHeaders(),
      body: JSON.stringify({ role }),
    }),

  deleteUser: (userId) =>
    fetch(`${API_BASE}/admin/users/${userId}`, {
      method: 'DELETE',
      headers: authHeaders(),
    }),

  getRagOptions: () =>
    fetch(`${API_BASE}/admin/rag/options`, {
      headers: authHeaders(),
    }),

  getRagConfig: (ragType) =>
    fetch(`${API_BASE}/admin/rag/config/${ragType}`, {
      headers: authHeaders(),
    }),

  saveRagConfig: (configData) =>
    fetch(`${API_BASE}/admin/rag/config`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify(configData),
    }),
};