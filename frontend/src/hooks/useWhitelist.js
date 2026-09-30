import { useState, useEffect, useCallback } from 'react';

export function useWhitelist() {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // 1. Récupération de la liste
  const fetchWhitelist = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/admin/whitelist', {
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setEmails(data);
      }
    } catch (err) {
      console.error("Erreur lors du chargement de la whitelist :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchWhitelist();
  }, [fetchWhitelist]);

  // 2. Ajout d'un email
  const addEmail = async (emailInput) => {
    const cleanEmail = emailInput.trim().toLowerCase();
    setError('');
    setSuccess('');

    // Validation du domaine
    if (!cleanEmail.endsWith('@tunisietelecom.tn')) {
      setError("L'adresse email doit obligatoirement se terminer par @tunisietelecom.tn");
      return false;
    }

    setSubmitting(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/admin/whitelist', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ email: cleanEmail })
      });

      const responseData = await res.json();

      if (res.ok) {
        setSuccess(`Email "${cleanEmail}" ajouté avec succès à la whitelist !`);
        fetchWhitelist(); // Rafraîchit la liste
        return true;
      } else {
        setError(responseData.detail || "Impossible d'ajouter cet email.");
        return false;
      }
    } catch (err) {
      setError("Erreur de connexion avec le serveur.");
      return false;
    } finally {
      setSubmitting(false);
    }
  };

  // 3. Suppression d'un email
  const deleteEmail = async (emailToDelete) => {
    setError('');
    setSuccess('');
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`http://localhost:8000/api/v1/admin/whitelist?email=${encodeURIComponent(emailToDelete)}`, {
        method: 'DELETE',
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (res.ok) {
        setEmails((prev) => prev.filter((item) => item.email !== emailToDelete));
        setSuccess(`L'email "${emailToDelete}" a été retiré.`);
        return true;
      } else {
        const errData = await res.json();
        setError(errData.detail || "Erreur lors de la suppression.");
        return false;
      }
    } catch (err) {
      setError("Erreur réseau lors de la suppression.");
      return false;
    }
  };

  return {
    emails,
    loading,
    submitting,
    error,
    success,
    addEmail,
    deleteEmail,
    refreshWhitelist: fetchWhitelist
  };
}