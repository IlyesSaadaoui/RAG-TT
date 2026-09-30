import React, { useState, useEffect, useRef } from 'react';
import { 
  BotMessageSquare, User, SendHorizontal, LogOut, LoaderCircle, 
  ShieldCheck, MessageSquare, Cpu, Layers, Sparkles, Plus, 
  PanelLeftClose, PanelLeft, Settings, Trash2, LayoutDashboard, X, Sliders,
  Camera, Lock, Phone, Eye, EyeOff
} from 'lucide-react';

export default function AgentTT({ onLogout, userEmail = "test2@tunisietelecom.tn" }) {
  const API_BASE = "http://localhost:8000/api/v1";
  // ⚠️ AJOUTÉ : origine du serveur backend (sans /api/v1) utilisée pour construire
  // une URL absolue vers les fichiers statiques (photos de profil).
  const SERVER_ORIGIN = "http://localhost:8000";

  // Construit une URL affichable dans <img src=...> à partir de ce que renvoie le backend :
  // - déjà une image base64 (data:...) ou une URL absolue (http...) -> inchangé
  // - un chemin relatif type "static/faces/xxx.jpg" -> préfixé par SERVER_ORIGIN
  const resolveImageUrl = (path) => {
    if (!path) return null;
    if (path.startsWith('data:') || path.startsWith('http://') || path.startsWith('https://')) {
      return path;
    }
    return `${SERVER_ORIGIN}/${path.replace(/^\/+/, '')}`;
  };

  // --- ÉTATS DU CHAT & PARAMÈTRES ---
  const [messages, setMessages] = useState([
    { 
      sender: 'bot', 
      text: 'Bonjour ! Je suis l\'Assistant RAG Tunisie Telecom. Comment puis-je vous aider aujourd\'hui ?' 
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ragType, setRagType] = useState('naive');

  // --- ÉTATS SIDEBAR & HISTORIQUE ---
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeSessionId, setActiveSessionId] = useState(null);
  const [sessions, setSessions] = useState([]);

  // --- ÉTATS MODAL DASHBOARD & PROFIL ---
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile'); // 'profile' ou 'rag_config'
  const [showPassword, setShowPassword] = useState(false);
  const [profileLoading, setProfileLoading] = useState(false);

  // État du Formulaire de Profil
  const [profileData, setProfileData] = useState({
    username: '',
    email: userEmail,
    phone_number: '',
    password: '',
    profile_picture_url: null,
  });

  const messagesEndRef = useRef(null);

  // Helper pour récupérer le token JWT
  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return {
      'Content-Type': 'application/json',
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    };
  };

  // 1. Charger les sessions et le profil utilisateur au lancement
  useEffect(() => {
    if (userEmail) {
      setProfileData((prev) => ({ ...prev, email: userEmail }));
      fetchSessions();
      fetchUserProfile();
    }
  }, [userEmail]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // --- API : Récupérer le profil utilisateur depuis le Backend ---
  const fetchUserProfile = async () => {
    setProfileLoading(true);
    try {
      const encodedEmail = encodeURIComponent(userEmail.trim());
      const res = await fetch(`${API_BASE}/user/profile/${encodedEmail}`, {
        headers: getAuthHeaders()
      });

      if (res.ok) {
        const data = await res.json();
        setProfileData({
          username: data.username || '',
          email: data.email || userEmail,
          phone_number: data.phone || data.phone_number || '',
          password: '',
          profile_picture_url: resolveImageUrl(data.face_image_path || data.profile_picture_url),
        });
      } else {
        console.warn("Utilisateur non trouvé ou erreur de profil.");
      }
    } catch (err) {
      console.error("Erreur récupération profil :", err);
    } finally {
      setProfileLoading(false);
    }
  };

  // --- API : Uploader une nouvelle photo de profil (fichier réel, pas de base64 en base) ---
  const uploadProfilePhoto = async (file) => {
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('photo', file);

      const encodedEmail = encodeURIComponent(userEmail.trim());
      const res = await fetch(`${API_BASE}/user/profile/${encodedEmail}/photo`, {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: formData, // Ne PAS fixer Content-Type manuellement (multipart boundary auto)
      });

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

  // --- API : Sauvegarder les modifications du profil (PUT) ---
  const handleProfileSave = async (e) => {
    e.preventDefault();
    setProfileLoading(true);

    try {
      const payload = {
        username: profileData.username,
        email: profileData.email,
        phone: profileData.phone_number,
        // ⚠️ CORRIGÉ : on n'envoie plus face_image_path ici. La photo est
        // maintenant gérée par uploadProfilePhoto() (upload immédiat vers
        // /user/profile/{email}/photo), qui écrit un vrai fichier sur le
        // disque et met à jour face_image_path côté serveur avec le bon
        // chemin relatif. L'envoyer ici écrasait la valeur en base avec une
        // URL absolue ou une chaîne base64, ce qui cassait l'authentification
        // faciale au login (os.path.exists() échoue sur une URL/base64).
      };

      if (profileData.password && profileData.password.trim() !== "") {
        payload.password = profileData.password;
      }

      const encodedEmail = encodeURIComponent(userEmail.trim());

      const res = await fetch(`${API_BASE}/user/profile/${encodedEmail}`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: JSON.stringify(payload),
      });

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

  // --- API : Récupérer toutes les sessions de l'utilisateur ---
  const fetchSessions = async () => {
    try {
      const encodedEmail = encodeURIComponent(userEmail.trim());
      const res = await fetch(`${API_BASE}/chat/sessions/${encodedEmail}`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        setSessions(data);
      }
    } catch (err) {
      console.error("Erreur chargement des sessions :", err);
    }
  };

  // --- API : Charger les messages d'une session spécifique ---
  const loadSessionMessages = async (sessionId) => {
    setActiveSessionId(sessionId);
    try {
      const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}/messages`, {
        headers: getAuthHeaders()
      });
      if (res.ok) {
        const data = await res.json();
        if (data.length > 0) {
          setMessages(data);
        } else {
          setMessages([{ sender: 'bot', text: 'Discussion vide.' }]);
        }
      }
    } catch (err) {
      console.error("Erreur chargement des messages :", err);
    }
  };

  // --- Action : Nouvelle discussion ---
  const handleNewChat = () => {
    setActiveSessionId(null);
    setMessages([
      { 
        sender: 'bot', 
        text: 'Nouvelle session démarrée. Quelle est votre question ?' 
      }
    ]);
  };

  // --- API : Supprimer une discussion ---
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await fetch(`${API_BASE}/chat/sessions/${sessionId}`, { 
        method: 'DELETE',
        headers: getAuthHeaders()
      });
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => s.id !== sessionId));
        if (activeSessionId === sessionId) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Erreur suppression session :", err);
    }
  };

  // --- Action : Envoyer un message & Enregistrer en BDD ---
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userText = input;
    const selectedRag = ragType;
    setInput('');
    setLoading(true);

    let currentSessionId = activeSessionId;

    try {
      if (!currentSessionId) {
        const sessionRes = await fetch(`${API_BASE}/chat/sessions`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ user_email: userEmail, title: userText.slice(0, 30) }),
        });
        
        if (sessionRes.ok) {
          const newSession = await sessionRes.json();
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          setSessions((prev) => [newSession, ...prev]);
        }
      }

      setMessages((prev) => [...prev, { sender: 'user', text: userText }]);
      
      if (currentSessionId) {
        await fetch(`${API_BASE}/chat/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sender: 'user', text: userText, rag_type: selectedRag }),
        });
      }

      const ragRes = await fetch(`${API_BASE}/rag/ask`, {
        method: 'POST',
        headers: getAuthHeaders(),
        body: JSON.stringify({ question: userText, rag_type: selectedRag }),
      });

      const ragData = await ragRes.json();
      const botAnswer = ragData.answer || "Désolé, aucune réponse trouvée.";

      setMessages((prev) => [...prev, { sender: 'bot', text: botAnswer }]);

      if (currentSessionId) {
        await fetch(`${API_BASE}/chat/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ sender: 'bot', text: botAnswer, rag_type: selectedRag }),
        });
      }

      fetchSessions();

    } catch (error) {
      console.error("Erreur lors de l'envoi :", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "❌ Erreur de communication avec le serveur." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-screen h-screen bg-[#050914] text-slate-200 flex overflow-hidden font-sans relative">
      
      {/* -------------------------------------------------------------------------- */}
      {/* 1️⃣ SIDEBAR LATÉRAL                                                         */}
      {/* -------------------------------------------------------------------------- */}
      <aside 
        className={`${
          sidebarOpen ? 'w-64' : 'w-16'
        } bg-[#080d1a] border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 z-30`}
      >
        <div className="p-3 flex flex-col gap-4">
          
          <div className="flex items-center justify-between">
            {sidebarOpen && (
              <div className="flex items-center gap-2">
                <img src="/src/assets/tt-logo.png" alt="TT Logo" className="h-6 w-auto" />
                <span className="text-xs font-bold text-white tracking-wider">RAG PLATFORM</span>
              </div>
            )}
            <button 
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-slate-800/60 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
          </div>

          <button
            onClick={handleNewChat}
            className={`flex items-center gap-3 bg-blue-600 hover:bg-blue-500 text-white p-2.5 rounded-xl transition-all shadow-md cursor-pointer ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <Plus className="w-4 h-4 shrink-0" />
            {sidebarOpen && <span className="text-xs font-semibold">Nouvelle discussion</span>}
          </button>

          {/* LISTE DES SESSIONS */}
          {sidebarOpen && (
            <div className="mt-2 flex flex-col gap-1 overflow-y-auto max-h-[calc(100vh-280px)]">
              <span className="text-[10px] font-mono text-slate-500 uppercase px-2 mb-1">Récentes (BDD)</span>
              {sessions.length === 0 ? (
                <p className="text-[11px] text-slate-600 px-2 italic">Aucune discussion</p>
              ) : (
                sessions.map((sess) => (
                  <div
                    key={sess.id}
                    onClick={() => loadSessionMessages(sess.id)}
                    className={`group flex items-center justify-between px-3 py-2 rounded-lg text-xs cursor-pointer transition-all ${
                      activeSessionId === sess.id 
                        ? 'bg-[#0e1628] text-white border border-slate-700 font-medium' 
                        : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <MessageSquare className="w-3.5 h-3.5 shrink-0 text-cyan-400" />
                      <span className="truncate">{sess.title}</span>
                    </div>
                    <button 
                      onClick={(e) => handleDeleteSession(e, sess.id)}
                      className="opacity-0 group-hover:opacity-100 hover:text-rose-400 transition-all p-1"
                      title="Supprimer"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        <div className="p-3 border-t border-slate-800/80 flex flex-col gap-2">
          <button
            onClick={() => setIsDashboardOpen(true)}
            className={`flex items-center gap-3 w-full p-2 rounded-lg text-xs text-slate-400 hover:text-white hover:bg-slate-800/60 transition-all cursor-pointer ${
              !sidebarOpen && 'justify-center'
            }`}
          >
            <LayoutDashboard className="w-4 h-4 text-cyan-400 shrink-0" />
            {sidebarOpen && <span>Dashboard & Options</span>}
          </button>

          {sidebarOpen ? (
            <div className="flex items-center justify-between bg-[#0e1628] p-2 rounded-lg border border-slate-800 mt-1">
              <div className="flex items-center gap-2 truncate">
                <div className="w-6 h-6 rounded bg-blue-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden">
                  {profileData.profile_picture_url ? (
                    <img src={profileData.profile_picture_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-3.5 h-3.5" />
                  )}
                </div>
                <span className="text-[11px] font-medium text-slate-300 truncate">{profileData.username || userEmail}</span>
              </div>
              <button onClick={onLogout} title="Déconnexion" className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer">
                <LogOut className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button onClick={onLogout} title="Déconnexion" className="p-2 rounded-lg text-slate-500 hover:text-rose-400 flex justify-center">
              <LogOut className="w-4 h-4" />
            </button>
          )}
        </div>
      </aside>

      {/* -------------------------------------------------------------------------- */}
      {/* 2️⃣ ZONE DU CHAT                                                          */}
      {/* -------------------------------------------------------------------------- */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        
        <header className="w-full bg-[#080d1a] border-b border-slate-800 px-6 py-3 flex justify-between items-center shrink-0">
          <div>
            <h1 className="text-sm font-bold text-white uppercase tracking-wider">RAG Tunisie Telecom</h1>
            <p className="text-[9px] font-mono text-cyan-400 uppercase">Assistant Virtuel Intelligent</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-800/50">
            <ShieldCheck className="w-3.5 h-3.5" /> Session Sécurisée
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
          {messages.map((msg, index) => (
            <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              
              {msg.sender === 'bot' && (
                <div className="w-8 h-8 rounded-lg bg-[#0e1628] border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
                  <BotMessageSquare className="w-4 h-4" />
                </div>
              )}

              <div className={`max-w-[75%] px-4 py-3 rounded-xl text-xs leading-relaxed shadow-md ${
                  msg.sender === 'user'
                    ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                    : 'bg-[#0e1628] text-slate-200 rounded-tl-none border border-slate-800'
                }`}
              >
                {msg.text}
              </div>

              {msg.sender === 'user' && (
                <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-blue-300 shrink-0 mt-1 overflow-hidden">
                  {profileData.profile_picture_url ? (
                    <img src={profileData.profile_picture_url} alt="User" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                </div>
              )}
            </div>
          ))}
          
          {loading && (
            <div className="flex justify-start gap-3 items-center">
              <div className="w-8 h-8 rounded-lg bg-[#0e1628] border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0">
                <LoaderCircle className="w-4 h-4 animate-spin" />
              </div>
              <div className="px-4 py-2 bg-[#0e1628]/60 text-slate-400 border border-slate-800 text-xs rounded-xl italic">
                Traitement & Sauvegarde PostgreSQL...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </main>

        <footer className="w-full bg-[#080d1a] border-t border-slate-800 p-4 shrink-0">
          <div className="max-w-3xl mx-auto space-y-3">
            
            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider">Stratégie RAG :</span>
              
              <div className="flex items-center gap-2 bg-[#050914] p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRagType('naive')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    ragType === 'naive' ? 'bg-blue-600 text-white font-semibold' : 'hover:text-white'
                  }`}
                >
                  <Cpu className="w-3.5 h-3.5" /> Naïf
                </button>

                <button
                  type="button"
                  onClick={() => setRagType('hybrid')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    ragType === 'hybrid' ? 'bg-cyan-600 text-white font-semibold' : 'hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" /> Hybride
                </button>

                <button
                  type="button"
                  onClick={() => setRagType('agentic')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs transition-all cursor-pointer ${
                    ragType === 'agentic' ? 'bg-purple-600 text-white font-semibold' : 'hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" /> Agentique
                </button>
              </div>
            </div>

            <form onSubmit={handleSend} className="relative w-full flex items-center">
              <MessageSquare className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Poser une question (${ragType.toUpperCase()})...`}
                className="w-full bg-[#0e1628] text-white placeholder:text-slate-500 text-xs pl-11 pr-12 py-3 rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500 transition-all shadow-inner"
              />
              <button
                type="submit"
                disabled={loading || !input.trim()}
                className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 rounded-lg bg-blue-600 text-white flex items-center justify-center transition-all hover:bg-blue-500 disabled:bg-slate-800 cursor-pointer"
              >
                <SendHorizontal className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>
        </footer>

      </div>

      {/* -------------------------------------------------------------------------- */}
      {/* 3️⃣ MODAL DASHBOARD / PARAMÈTRES & PROFIL                                  */}
      {/* -------------------------------------------------------------------------- */}
      {isDashboardOpen && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#080d1a] border border-slate-800 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col">
            
            {/* HEADER MODAL */}
            <div className="px-6 py-4 border-b border-slate-800 flex justify-between items-center bg-[#050914]">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="w-5 h-5 text-cyan-400" />
                <h2 className="text-sm font-bold text-white uppercase tracking-wider">Dashboard & Options</h2>
              </div>
              <button 
                onClick={() => setIsDashboardOpen(false)}
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
                        {profileData.profile_picture_url ? (
                          <img src={profileData.profile_picture_url} alt="Avatar" className="w-full h-full object-cover" />
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
                              // ⚠️ CORRIGÉ : on envoie le vrai fichier au backend (upload immédiat),
                              // qui l'écrit sur le disque et renvoie le chemin relatif à jour.
                              // Avant, on stockait juste le base64 en mémoire, jamais persisté comme
                              // fichier, ce qui cassait ensuite l'authentification faciale au login.
                              if (file) {
                                uploadProfilePhoto(file);
                              }
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
                          value={profileData.username}
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
                          value={profileData.email}
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
                            value={profileData.phone_number}
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
                            value={profileData.password}
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
                      <p className="text-xl font-bold text-cyan-400 mt-1">{sessions.length}</p>
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
                onClick={() => setIsDashboardOpen(false)}
                className="bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold px-4 py-1.5 rounded-lg transition-all cursor-pointer"
              >
                Fermer
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}