import React from 'react';
import {
  User, LoaderCircle, LayoutDashboard, X, Sliders,
  Camera, Lock, Phone, Eye, EyeOff,
} from 'lucide-react';

export default function ProfileModal({
  isOpen, onClose,
  activeTab, setActiveTab,
  profileData, setProfileData, profileLoading,
  handleProfileSave, uploadProfilePhoto,
  showPassword, setShowPassword,
  sessionsCount,
}) {
  if (!isOpen) return null;

  // Construction de l'URL d'avatar (vers le backend FastAPI)
  const getAvatarUrl = () => {
    if (!profileData?.profile_picture_url) return null;
    if (profileData.profile_picture_url.startsWith('http')) {
      return profileData.profile_picture_url;
    }
    return `http://localhost:8000${profileData.profile_picture_url}`;
  };

  const avatarUrl = getAvatarUrl();

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-[#080d1a] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">

        {/* HEADER MODAL */}
        <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#050914]">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white uppercase tracking-wider">Dashboard & Options</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ONGLETS NAVIGATION */}
        <div className="flex border-b border-slate-800 bg-[#060a17] px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'profile'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <User className="w-4 h-4" /> Mon Profil
          </button>
          <button
            onClick={() => setActiveTab('rag_config')}
            className={`flex items-center gap-2 py-3 px-4 text-xs font-semibold border-b-2 transition-all cursor-pointer ${
              activeTab === 'rag_config'
                ? 'border-cyan-400 text-cyan-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Sliders className="w-4 h-4" /> Moteur RAG & Stats
          </button>
        </div>

        {/* CONTENU SELON L'ONGLET SÉLECTIONNÉ */}
        <div className="p-6 max-h-[70vh] overflow-y-auto">

          {/* --- ONGLET 1 : MON PROFIL --- */}
          {activeTab === 'profile' && (
            profileLoading ? (
              <div className="flex justify-center items-center py-10 text-cyan-400 gap-2">
                <LoaderCircle className="w-6 h-6 animate-spin" />
                <span className="text-xs">Chargement du profil depuis PostgreSQL...</span>
              </div>
            ) : (
              <form onSubmit={handleProfileSave} className="space-y-5">

                {/* AVATAR / PHOTO DE PROFIL */}
                <div className="flex items-center gap-5 bg-[#0e1628] p-4 rounded-xl border border-slate-800">
                  <div className="relative group w-16 h-16 rounded-full overflow-hidden border-2 border-cyan-500/50 bg-slate-900 flex items-center justify-center shrink-0">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <User className="w-8 h-8 text-cyan-400" />
                    )}

                    <label className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 flex items-center justify-center cursor-pointer transition-all">
                      <Camera className="w-5 h-5 text-white" />
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) uploadProfilePhoto(file);
                        }}
                      />
                    </label>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold text-white">Photo de Profil</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Survolez et cliquez pour modifier l'image</p>
                  </div>
                </div>

                {/* FORMULAIRE */}
                <div className="grid grid-cols-2 gap-4">

                  {/* USERNAME */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400">Username / Handle</label>
                    <input
                      type="text"
                      value={profileData?.username || profileData?.full_name || ''}
                      onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                      className="w-full bg-[#0e1628] text-white text-xs px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      placeholder="@nom_utilisateur"
                      required
                    />
                  </div>

                  {/* EMAIL */}
                  <div className="space-y-1">
                    <label className="text-[11px] font-mono text-slate-400">Adresse Email</label>
                    <input
                      type="email"
                      value={profileData?.email || ''}
                      onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                      className="w-full bg-[#0e1628] text-white text-xs px-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                      required
                    />
                  </div>

                  {/* TÉLÉPHONE */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-mono text-slate-400">Numéro de Téléphone</label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={profileData?.phone_number || profileData?.phone || ''}
                        onChange={(e) => setProfileData({ ...profileData, phone_number: e.target.value })}
                        className="w-full bg-[#0e1628] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                        placeholder="+216 98 000 000"
                      />
                    </div>
                  </div>

                  {/* MOT DE PASSE */}
                  <div className="col-span-2 space-y-1">
                    <label className="text-[11px] font-mono text-slate-400">Nouveau Mot de Passe</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type={showPassword ? "text" : "password"}
                        value={profileData?.password || ''}
                        onChange={(e) => setProfileData({ ...profileData, password: e.target.value })}
                        className="w-full bg-[#0e1628] text-white text-xs pl-9 pr-10 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                        placeholder="•••••••• (Laissez vide si inchangé)"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-white cursor-pointer"
                      >
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                </div>

                {/* BOUTON SOUMISSION */}
                <div className="pt-2 flex justify-end">
                  <button
                    type="submit"
                    disabled={profileLoading}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-5 py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-2 disabled:opacity-50"
                  >
                    Enregistrer les modifications
                  </button>
                </div>

              </form>
            )
          )}

          {/* --- ONGLET 2 : MOTEUR RAG & STATS --- */}
          {activeTab === 'rag_config' && (
            <div className="space-y-5">
              <div className="grid grid-cols-3 gap-4">
                <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Sessions BDD</p>
                  <p className="text-xl font-bold text-cyan-400 mt-1">{sessionsCount}</p>
                </div>
                <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Modèle LLM</p>
                  <p className="text-sm font-bold text-emerald-400 mt-1">Llama 3.2</p>
                </div>
                <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
                  <p className="text-[10px] font-mono text-slate-500 uppercase">Vector DB</p>
                  <p className="text-sm font-bold text-purple-400 mt-1">ChromaDB</p>
                </div>
              </div>
            </div>
          )}

        </div>

        {/* FOOTER MODAL */}
        <div className="px-6 py-3 bg-[#050914] border-t border-slate-800 flex justify-between items-center">
          <span className="text-[10px] font-mono text-slate-500">Agent-TT v1.0.0</span>
          <button
            onClick={onClose}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
          >
            Fermer
          </button>
        </div>

      </div>
    </div>
  );
}