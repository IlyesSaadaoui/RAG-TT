import React, { useState } from 'react';
import LoginPage from './components/auth/LoginPage';
import RegisterPage from './components/auth/RegisterPage';
import AgentTT from './components/agent/AgentTT';
import AdminDashboard from './components/admin/AdminDashboard';
import useAuth from './hooks/useAuth';

function App() {
  // Récupération des données d'authentification depuis le hook personnalisé
  const { token, userEmail, userRole, handleAuthSuccess, handleLogout } = useAuth();
  const [isRegistering, setIsRegistering] = useState(false);

  // Fonction utilitaire pour identifier si le rôle est Administrateur
  const isAdmin = (role) => {
    if (!role) return false;
    const normalized = role.toString().toUpperCase().trim();
    return normalized === 'ADMIN' || normalized === 'ADMINISTRATEUR';
  };

  return (
    <div className="min-h-screen bg-[#0b111e] text-white font-sans">
      {!token ? (
        /* Rendu direct des pages d'authentification pour respecter le layout split-screen plein écran */
        isRegistering ? (
          <RegisterPage 
            onNavigateToLogin={() => setIsRegistering(false)} 
          />
        ) : (
          <LoginPage
            onAuthSuccess={handleAuthSuccess}
            onNavigateToRegister={() => setIsRegistering(true)}
          />
        )
      ) : (
        /* AIGUILLAGE STRICT SELON LE RÔLE D'UTILISATEUR */
        isAdmin(userRole) ? (
          <AdminDashboard 
            onLogout={handleLogout} 
            userEmail={userEmail} 
          />
        ) : (
          <AgentTT 
            onLogout={handleLogout} 
            userEmail={userEmail} 
          />
        )
      )}
    </div>
  );
}

export default App;