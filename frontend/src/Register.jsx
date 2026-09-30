import React, { useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { Mail, User, Lock, Phone, Shield, Camera, Upload, CheckCircle, RefreshCw } from 'lucide-react';
import AuthScanner from './AuthScanner'; // Vu qu'ils sont dans le même dossier !

export default function Register() {
  const webcamRef = useRef(null);
  const [useCamera, setUseCamera] = useState(false);
  const [photo, setPhoto] = useState(null);
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

      const response = await fetch('http://localhost:8000/auth/register', { method: 'POST', body: payload });
      if (response.ok) alert("🎉 Enrôlement réussi !");
      else alert(`❌ Échec de l'inscription.`);
    } catch (error) {
      alert("❌ Impossible de joindre le serveur.");
    }
  };

  return (
    <div className="w-full max-w-md bg-[#070c18] border border-blue-500/20 rounded-3xl p-8 shadow-[0_0_50px_rgba(30,58,138,0.3)] backdrop-blur-xl relative overflow-hidden group/card transition-all duration-500 hover:border-blue-500/40">
      
      {/* --- ANIMATION DE FOND GLISSANTE --- */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-blue-600/20 transition-all duration-700" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-cyan-500/10 rounded-full blur-[100px] pointer-events-none group-hover/card:bg-cyan-500/20 transition-all duration-700" />
      
      {/* --- LOGO BIOMÉTRIQUE AVANCÉ ANIMÉ --- */}
      <div className="flex flex-col items-center mb-8 relative">
        <div className="relative w-20 h-20 flex items-center justify-center mb-4">
          {/* Cercle orbital extérieur pulse */}
          <div className="absolute inset-0 rounded-full border-2 border-dashed border-blue-500/30 animate-[spin_20s_linear_infinite]" />
          {/* Cercle orbital intermédiaire rapide */}
          <div className="absolute inset-2 rounded-full border border-cyan-400/40 border-t-transparent animate-[spin_3s_linear_infinite]" />
          {/* Cœur du logo */}
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-cyan-500 rounded-2xl flex items-center justify-center shadow-[0_0_20px_rgba(37,99,235,0.5)] transform rotate-12 group-hover/card:rotate-45 transition-transform duration-700">
            <Shield className="w-6 h-6 text-white transform -rotate-12 group-hover/card:-rotate-45 transition-transform duration-700" />
          </div>
        </div>
        <h2 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-200 to-slate-400 tracking-tight uppercase">
          TT SECURITÉ
        </h2>
        <p className="text-[11px] font-mono tracking-[0.2em] text-cyan-400 uppercase mt-1">
          Portail d'Enrôlement RAG
        </p>
      </div>
      
      <form onSubmit={handleSubmit} className="space-y-4 relative">
        
        {/* Champ Adresse Email */}
        <div className="relative group/input">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-focus-within/input:text-blue-400 transition-colors">Adresse Email</label>
          <div className="relative">
            <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
            <input 
              type="email" 
              placeholder="id@tunisietelecom.tn"
              className="w-full bg-[#0d1527] pl-11 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:bg-[#0f1930] focus:outline-none text-white placeholder-slate-600 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              required 
            />
          </div>
        </div>

        {/* Champ Nom d'utilisateur */}
        <div className="relative group/input">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-focus-within/input:text-blue-400 transition-colors">Nom d'utilisateur</label>
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
            <input 
              type="text" 
              placeholder="Pseudo"
              className="w-full bg-[#0d1527] pl-11 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:bg-[#0f1930] focus:outline-none text-white placeholder-slate-600 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              value={formData.username}
              onChange={(e) => setFormData({...formData, username: e.target.value})}
              required 
            />
          </div>
        </div>

        {/* Champ Mot de passe */}
        <div className="relative group/input">
          <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-focus-within/input:text-blue-400 transition-colors">Mot de passe</label>
          <div className="relative">
            <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
            <input 
              type="password" 
              placeholder="••••••••"
              className="w-full bg-[#0d1527] pl-11 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:bg-[#0f1930] focus:outline-none text-white placeholder-slate-600 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              required 
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          {/* Champ Téléphone */}
          <div className="relative group/input">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 group-focus-within/input:text-blue-400 transition-colors">Téléphone</label>
            <div className="relative">
              <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-500 group-focus-within/input:text-blue-400 transition-colors" />
              <input 
                type="tel" 
                maxLength="8"
                placeholder="98123456"
                className="w-full bg-[#0d1527] pl-11 pr-4 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:bg-[#0f1930] focus:outline-none text-white placeholder-slate-600 transition-all text-sm shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                value={formData.phone}
                onChange={(e) => setFormData({...formData, phone: e.target.value.replace(/\D/g, '')})}
                required 
              />
            </div>
          </div>

          {/* Choix du Rôle */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Rôle</label>
            <div className="relative">
              <select
                className="w-full bg-[#0d1527] pl-4 pr-8 py-3 rounded-xl border border-slate-800 focus:border-blue-500 focus:bg-[#0f1930] focus:outline-none text-white transition-all text-sm appearance-none cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.4)]"
                value={formData.role}
                onChange={(e) => setFormData({...formData, role: e.target.value})}
                required
              >
                <option value="" disabled hidden>Choisir...</option>
                <option value="admin">Administrateur</option>
                <option value="agent">Agent TT</option>
              </select>
              <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none text-xs">▼</span>
            </div>
          </div>
        </div>

        {/* Section Biométrique */}
        <div className="pt-4 border-t border-slate-900">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Scanner Biométrique</label>
            {photo && (
              <span className="flex items-center gap-1 text-[10px] text-cyan-400 bg-cyan-500/10 px-2.5 py-0.5 rounded-full border border-cyan-500/20 font-mono animate-pulse">
                <CheckCircle className="w-3 h-3" /> VERIFIED
              </span>
            )}
          </div>
          
          <div className="flex gap-2 p-1 bg-[#040810] rounded-xl mb-4 border border-slate-900">
            <button 
              type="button" 
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${!useCamera ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setUseCamera(false)}
            >
              <Upload className="w-3.5 h-3.5" /> Image
            </button>
            <button 
              type="button" 
              className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all duration-300 flex items-center justify-center gap-1.5 ${useCamera ? 'bg-gradient-to-r from-blue-600 to-blue-700 text-white shadow-lg shadow-blue-600/20' : 'text-slate-500 hover:text-slate-300'}`}
              onClick={() => setUseCamera(true)}
            >
              <Camera className="w-3.5 h-3.5" /> Flux Web
            </button>
          </div>

          {!useCamera ? (
            <div className="p-4 bg-[#0d1527] border-2 border-dashed border-slate-800 rounded-xl text-center hover:border-blue-500/40 transition-all duration-300 group cursor-pointer relative overflow-hidden">
              <input type="file" accept="image/*" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10" />
              <Upload className="w-6 h-6 mx-auto mb-2 text-slate-600 group-hover:text-blue-400 transition-colors duration-300 group-hover:scale-110 transform" />
              <p className="text-xs text-slate-500 group-hover:text-slate-400 transition-colors">Uploader l'empreinte faciale</p>
            </div>
          ) : (
            <div className="space-y-3 bg-[#040810] p-3 rounded-xl border border-slate-900 relative">
              <div className="relative rounded-lg overflow-hidden border border-slate-800 aspect-video">
                <Webcam className="w-full h-full object-cover" ref={webcamRef} screenshotFormat="image/jpeg" videoConstraints={{ width: 640, height: 480, facingMode: "user" }} />
                
                {/* --- LIGNE DE SCAN BIOMÉTRIQUE ANIMÉE (LASER EFFECT) --- */}
                <div className="absolute inset-x-0 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#06b6d4] animate-[scan_2.5s_ease-in-out_infinite]" />
                
                {/* Overlay de ciblage */}
                <div className="absolute inset-6 border border-dashed border-cyan-500/20 rounded-md pointer-events-none" />
              </div>
              <button 
                type="button" 
                onClick={handleCapture} 
                className="w-full bg-blue-500/10 hover:bg-blue-600 text-blue-400 hover:text-white border border-blue-500/20 text-xs py-2.5 rounded-xl font-bold transition-all duration-300 flex items-center justify-center gap-2 shadow-inner"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin" style={{ animationDuration: '6s' }} /> Analyser & Capturer
              </button>
            </div>
          )}
        </div>

        {photo && !useCamera && (
          <div className="flex items-center gap-3 p-3 bg-[#0d1527] rounded-xl border border-slate-800/60 animate-fade-in">
            <img src={photo} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-blue-500/30" />
            <div>
              <p className="text-xs font-semibold text-slate-300">Cliché Biomémorisé</p>
              <p className="text-[10px] font-mono text-cyan-500 uppercase tracking-wider">Payload structuré</p>
            </div>
          </div>
        )}

        {/* --- BOUTON DE SOUMISSION PREMIUM ANIMÉ --- */}
        <button 
          type="submit" 
          className="w-full bg-gradient-to-r from-blue-600 via-blue-500 to-cyan-600 hover:opacity-95 text-white font-bold py-3.5 rounded-xl transition-all duration-300 flex items-center justify-center gap-2 text-sm shadow-[0_4px_20px_rgba(37,99,235,0.25)] hover:shadow-[0_4px_30px_rgba(37,99,235,0.4)] transform active:scale-[0.98] mt-6 cursor-pointer overflow-hidden relative group/btn"
        >
          {/* Lueur au survol du bouton */}
          <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/btn:translate-x-[100%] transition-transform duration-1000 ease-out" />
          <span>Créer l'empreinte & Finaliser</span>
        </button>
      </form>
    </div>
  );
}