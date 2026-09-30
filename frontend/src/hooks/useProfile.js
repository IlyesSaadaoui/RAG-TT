import { useState, useEffect, useCallback } from 'react';
import { userApi, resolveImageUrl } from '../services/api';

export default function useProfile(userEmail) {
  // 1. Fallback automatique si userEmail est vide ou indéfini
  const emailToUse = userEmail || localStorage.getItem('user_email') || 'ilyes.saadaoui@tunisietelecom.tn';

  const [profileLoading, setProfileLoading] = useState(false);
  const [profileData, setProfileData] = useState({
    username: '',
    full_name: '',
    email: emailToUse,
    phone_number: '',
    password: '',
    profile_picture_url: null,
  });

  const fetchUserProfile = useCallback(async () => {
    if (!emailToUse) return;
    setProfileLoading(true);
    try {
      const res = await userApi.getProfile(emailToUse);
      
      if (res.ok) {
        const data = await res.json();
        console.log("🟢 PROFIL REÇU DE L'API :", data); // Inspecter la structure BDD

        setProfileData({
          username: data.username || data.full_name || '',
          full_name: data.full_name || data.username || '',
          email: data.email || emailToUse,
          phone_number: data.phone_number || data.phone || '',
          password: '',
          profile_picture_url: resolveImageUrl(data.face_image_path || data.profile_picture_url),
        });
      } else {
        const errJson = await res.json().catch(() => ({}));
        console.warn(`🔴 API Profile Error (${res.status}):`, errJson);
      }
    } catch (err) {
      console.error("Erreur récupération profil :", err);
    } finally {
      setProfileLoading(false);
    }
  }, [emailToUse]);

  useEffect(() => {
    if (emailToUse) {
      setProfileData((prev) => ({ ...prev, email: emailToUse }));
      fetchUserProfile();
    }
  }, [emailToUse, fetchUserProfile]);

  const uploadProfilePhoto = async (file) => {
    try {
      const res = await userApi.uploadPhoto(emailToUse, file);
      if (res.ok) {
        const data = await res.json();
        setProfileData((prev) => ({
          ...prev,
          profile_picture_url: resolveImageUrl(data.face_image_path),
        }));
      } else {
        const errorData = await res.json();
        alert(`❌ Échec de l'envoi de la photo : ${errorData.detail || res.status}`);
      }
    } catch (err) {
      console.error("Erreur upload photo :", err);
      alert("❌ Problème de connexion lors de l'envoi de la photo.");
    }
  };

  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    try {
      const payload = {
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone_number,
      };
      if (profileData.password && profileData.password.trim() !== "") {
        payload.password = profileData.password;
      }

      const res = await userApi.updateProfile(emailToUse, payload);

      if (res.ok) {
        alert("✅ Profil mis à jour avec succès dans PostgreSQL !");
        setProfileData((prev) => ({ ...prev, password: '' }));
      } else {
        const errorData = await res.json();
        alert(`❌ Erreur (${res.status}) : ${errorData.detail || "Mise à jour échouée"}`);
      }
    } catch (err) {
      console.error("Erreur mise à jour profil :", err);
      alert("❌ Problème de connexion avec le serveur API.");
    } finally {
      setProfileLoading(false);
    }
  };

  return { profileData, setProfileData, profileLoading, uploadProfilePhoto, handleProfileSave };
}