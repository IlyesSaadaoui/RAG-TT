import { useState, useCallback } from 'react';

/**
 * Hook personnalisé pour la gestion de l'authentification.
 * Stocke et synchronise le Token JWT, l'email et le rôle dans localStorage.
 */
export default function useAuth() {
  // Initialisation synchrone depuis le localStorage pour éviter tout "flicker" au rechargement (F5)
  const [token, setToken] = useState(() => localStorage.getItem('token') || null);
  const [userEmail, setUserEmail] = useState(() => localStorage.getItem('user_email') || '');
  const [userRole, setUserRole] = useState(() => localStorage.getItem('user_role') || '');

  /**
   * Enregistre l'authentification réussie
   * Supporte : 
   *  1. Un objet API : handleAuthSuccess(responseData)
   *  2. Des arguments distincts : handleAuthSuccess(token, email, role)
   */
  const handleAuthSuccess = useCallback((firstArg, emailArg, roleArg) => {
    let newToken = null;
    let email = null;
    let role = null;

    if (typeof firstArg === 'object' && firstArg !== null) {
      // Cas 1 : L'API renvoie un objet JSON { token/access_token, email/user_email, role/user_role }
      newToken = firstArg.access_token || firstArg.token || null;
      email = firstArg.email || firstArg.user_email || null;
      role = firstArg.role || firstArg.user_role || null;
    } else {
      // Cas 2 : Passation d'arguments individuellement
      newToken = firstArg || null;
      email = emailArg || null;
      role = roleArg || null;
    }

    // 1. Sauvegarde du Token
    if (newToken) {
      localStorage.setItem('token', newToken);
      setToken(newToken);
    }

    // 2. Sauvegarde de l'Email
    if (email) {
      const cleanEmail = email.trim();
      localStorage.setItem('user_email', cleanEmail);
      setUserEmail(cleanEmail);
    }

    // 3. Sauvegarde du Rôle
    if (role) {
      const cleanRole = role.toString().toUpperCase().trim();
      localStorage.setItem('user_role', cleanRole);
      setUserRole(cleanRole);
    }
  }, []);

  /**
   * Déconnexion propre de l'utilisateur
   */
  const handleLogout = useCallback(() => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    localStorage.removeItem('user_role');
    localStorage.removeItem('active_session_id'); // Nettoie aussi la session chat courante

    setToken(null);
    setUserEmail('');
    setUserRole('');
  }, []);

  return {
    token,
    userEmail,
    userRole,
    isAuthenticated: Boolean(token),
    handleAuthSuccess,
    handleLogout,
  };
}