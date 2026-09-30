import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Mail, User, Lock, Phone, ShieldCheck, Upload, Camera, CheckCircle, RefreshCw, UserPlus, Globe, Eye, EyeOff } from 'lucide-react';
import { authApi } from '../../services/api';

export default function RegisterPage({ onNavigateToLogin }) {
  const webcamRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    phone: '',
    role: ''
  });

  const handleCapture = () => {
    const screenshot = webcamRef.current?.getScreenshot();
    if (screenshot) setPhoto(screenshot);
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setPhoto(reader.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!photo) return alert("❌ Une photo biométrique est obligatoire.");
    if (!formData.email.endsWith('tunisietelecom.tn')) return alert("❌ L'adresse email doit se terminer par 'tunisietelecom.tn'.");
    if (!/^\d{8}$/.test(formData.phone)) return alert("❌ Le téléphone doit avoir 8 chiffres.");
    if (!formData.role) return alert("❌ Veuillez sélectionner un rôle.");

    const payload = new FormData();
    payload.append('username', formData.username);
    payload.append('email', formData.email);
    payload.append('password', formData.password);
    payload.append('phone', formData.phone);
    payload.append('role', formData.role);

    try {
      const blob = await fetch(photo).then(r => r.blob());
      payload.append('photo', blob, 'avatar.jpg');

      const response = await authApi.register(payload);
      if (response.ok) {
        alert("🎉 Enrôlement réussi ! Vous pouvez maintenant vous connecter.");
        if (onNavigateToLogin) onNavigateToLogin();
      } else {
        const errorData = await response.json();
        alert(`❌ Échec de l'inscription : ${errorData.detail || "Vérifiez vos informations."}`);
      }
    } catch (error) {
      alert("❌ Impossible de joindre le serveur.");
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#050914] z-50 grid grid-cols-2 text-slate-200 antialiased overflow-hidden select-none">

      {/* GLOWS DE FOND */}
      <div className="absolute -top-40 -left-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* COLONNE GAUCHE - FIXE ET CENTRÉE */}
      <div className="p-8 flex flex-col justify-between items-center relative border-r border-slate-900/80 bg-[#03060f]/60 h-full overflow-hidden">
        <div /> {/* Espaceur top */}

        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="flex flex-col items-center text-center w-full mb-6">
            <div className="relative w-36 h-36 flex items-center justify-center mb-4">
              <div className="absolute inset-4 rounded-full bg-cyan-500/10 animate-ping opacity-75 duration-1000" />
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 animate-[spin_80s_linear_infinite]" />
              <div className="w-44 h-44 z-10 flex items-center justify-center">
                <img src="/src/assets/tt-logo.png" alt="Tunisie Telecom" className="w-full h-full object-contain" />
              </div>
            </div>

            <h2 className="text-2xl font-black text-white tracking-tight uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Tunisie Telecom
            </h2>
            <div className="mt-2 px-3 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <p className="text-[10px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">ENRÔLEMENT RAG SECURE</p>
            </div>
          </div>

          <div className="space-y-3 w-full z-10">
            <div className="flex items-start gap-3.5 p-3.5 bg-[#0a1020]/60 backdrop-blur-md rounded-xl border border-slate-800/50">
              <div className="p-2.5 bg-[#0d1527] rounded-lg border border-slate-800 text-cyan-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-white tracking-wide">Création d'Empreinte Biométrique</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">
                  L'enregistrement d'une photo faciale de référence est requise pour créer votre profil d'accès au RAG Tunisie Telecom.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-slate-600 font-mono pb-2">&copy; 2026 Tunisie Telecom.</div>
      </div>

      {/* COLONNE DROITE - TOUT RESTE VISIBLE SANS SCROLL */}
      <div className="p-6 flex flex-col justify-center items-center relative bg-[#050914]/20 h-full overflow-hidden">

        {/* Sélecteur de langue */}
        <div className="absolute top-4 right-6 flex items-center gap-1.5 p-1 px-2.5 bg-[#0a1020] rounded-full border border-slate-800 text-[10px] font-semibold text-slate-400">
          <Globe className="w-3 h-3 text-cyan-400" />
          <span>FR</span>
        </div>

        <div className="w-full max-w-[350px] flex flex-col justify-center">

          {/* Titre principal */}
          <div className="text-center mb-3">
            <h1 className="text-xl font-black text-white uppercase tracking-tight">Créer un Compte</h1>
            <p className="text-[11px] text-slate-400 mt-0.5">Renseignez vos identifiants pour enregistrer votre profil</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2">

            {/* Email */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Adresse Email</label>
              <div className="relative">
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="email"
                  placeholder="prenom.nom@tunisietelecom.tn"
                  className="w-full bg-[#0a1020] pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Username */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Nom d'utilisateur</label>
              <div className="relative">
                <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Pseudo"
                  className="w-full bg-[#0a1020] pl-9 pr-3 py-1.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                  value={formData.username}
                  onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Mot de passe */}
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Mot de passe</label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                <input
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  className="w-full bg-[#0a1020] pl-9 pr-9 py-1.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  required
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 p-1">
                  {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Téléphone & Rôle */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Téléphone</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
                  <input
                    type="tel"
                    maxLength="8"
                    placeholder="98123456"
                    className="w-full bg-[#0a1020] pl-8 pr-2 py-1.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, '') })}
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rôle</label>
                <div className="relative">
                  <select
                    className="w-full bg-[#0a1020] pl-3 pr-7 py-1.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all appearance-none cursor-pointer shadow-inner"
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                    required
                  >
                    <option value="" disabled hidden>Choisir...</option>
                    <option value="admin">Administrateur</option>
                    <option value="agent">Agent TT</option>
                  </select>
                  <span className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-[10px]">▼</span>
                </div>
              </div>
            </div>

            {/* Section Capture Biométrique */}
            <div className="pt-1.5 border-t border-slate-800/80">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-widest">Photo Biométrique</label>
                {photo && (
                  <span className="flex items-center gap-1 text-[8px] text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20 font-mono">
                    <CheckCircle className="w-2.5 h-2.5" /> CAPTURÉE
                  </span>
                )}
              </div>

              {/* Toggle Fichier / Webcam */}
              <div className="flex gap-1 p-0.5 bg-[#03060f] rounded-lg mb-1.5 border border-slate-900">
                <button
                  type="button"
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${!useCamera ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setUseCamera(false)}
                >
                  <Upload className="w-3 h-3" /> Fichier
                </button>
                <button
                  type="button"
                  className={`flex-1 py-1 rounded-md text-[10px] font-bold transition-all flex items-center justify-center gap-1 ${useCamera ? 'bg-blue-600 text-white shadow-md shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
                  onClick={() => setUseCamera(true)}
                >
                  <Camera className="w-3 h-3" /> Webcam
                </button>
              </div>

              {!useCamera ? (
                <div className="p-2 bg-[#0a1020] border border-dashed border-slate-800 rounded-xl text-center hover:border-cyan-500/40 transition-all cursor-pointer relative overflow-hidden group">
                  <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
                  <Upload className="w-4 h-4 mx-auto mb-0.5 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                  <p className="text-[10px] text-slate-400">Importer une photo faciale</p>
                </div>
              ) : (
                <div className="space-y-1 bg-[#03060f] p-1 rounded-xl border border-slate-900 relative">
                  {/* Hauteur optimisée de la webcam à 110px */}
                  <div className="relative rounded-lg overflow-hidden border border-slate-800 h-[110px] flex items-center justify-center bg-black">
                    <Webcam className="w-full h-full object-cover" ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ width: 640, height: 480, facingMode: "user" }} />
                    <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-[scan_2.5s_ease-in-out_infinite]" />
                  </div>
                  <button
                    type="button"
                    onClick={handleCapture}
                    className="w-full bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-[10px] py-1 rounded-lg font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" /> Capturer l'empreinte
                  </button>
                </div>
              )}
            </div>

            {/* Aperçu de l'image si importée par fichier */}
            {photo && !useCamera && (
              <div className="flex items-center gap-2 p-1.5 bg-[#0a1020] rounded-xl border border-slate-800">
                <img src={photo} alt="Preview" className="w-6 h-6 object-cover rounded-md border border-cyan-500/30" />
                <div>
                  <p className="text-[10px] font-semibold text-slate-300">Photo biométrique prête</p>
                </div>
              </div>
            )}

            {/* Bouton de Soumission */}
            <button
              type="submit"
              className="w-full bg-blue-600 text-white font-bold py-2 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer hover:bg-blue-500 transition-all shadow-lg shadow-blue-600/10 mt-1"
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Finaliser l'enrôlement</span>
            </button>

            {/* Lien de redirection vers la connexion */}
            <div className="pt-1.5 text-center border-t border-slate-900/60 text-[11px] text-slate-400">
              Déjà inscrit ? <button type="button" onClick={onNavigateToLogin} className="text-cyan-400 font-bold hover:underline ml-1 cursor-pointer">Se connecter</button>
            </div>

          </form>
        </div>
      </div>
    </div>
  );
}