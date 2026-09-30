import React from 'react';

/**
 * Composant purement visuel : affiche un spinner et un message.
 * Ne fait plus AUCUN polling ni AUCUNE navigation en interne.
 * Toute la logique de vérification de statut et de redirection reste
 * centralisée dans LoginPage.jsx (un seul point de vérité, plus de
 * double polling redondant).
 */
const LoadingScreen = ({ message = "Veuillez patienter..." }) => {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh' }}>
      <div className="spinner"></div>
      <h2>Veuillez patienter...</h2>
      <p>{message}</p>
    </div>
  );
};

export default LoadingScreen;