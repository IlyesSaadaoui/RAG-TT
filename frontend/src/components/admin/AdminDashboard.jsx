import React, { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  ShieldCheck, 
  LogOut, 
  Activity, 
  Layers, 
  UserPlus, 
  Bot 
} from 'lucide-react';
import UsersPanel from './UsersPanel';
import PipelinesPanel from './PipelinesPanel';
import ChatWindow from '../agent/ChatWindow';
import WhitelistPanel from './WhitelistPanel';
import { adminApi } from '../../services/api';

export default function AdminDashboard({ onLogout, userEmail }) {
  // Navigation active
  const [activeTab, setActiveTab] = useState('users');

  // --- ÉTATS RAG PIPELINES ---
  const [pipelines, setPipelines] = useState([]);
  const [loadingPipelines, setLoadingPipelines] = useState(false);
  const [savingId, setSavingId] = useState(null);

  // 📁 ÉTAT POUR LES FICHIERS DE DONNÉES GLOBALES
  const [availableFiles, setAvailableFiles] = useState([]);

  // STATS RAG
  const [ragStats, setRagStats] = useState({
    total: 0,
    percentages: { naive: 0, hybrid: 0, agentic: 0 },
    counts: { naive: 0, hybrid: 0, agentic: 0 }
  });
  const [loadingStats, setLoadingStats] = useState(false);

  // ➕ FONCTION : Charger la liste des fichiers disponibles dans le dossier BDD/data
  const loadAvailableFiles = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/admin/files', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setAvailableFiles(data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des fichiers disponibles :", err);
    }
  };

  // ➕ FONCTION : Déclencher le prétraitement global pour les 3 vector stores simultanément
  const handleGlobalPreprocessing = async (selectedFilePaths) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/admin/reindex-global', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ file_paths: selectedFilePaths })
      });

      if (!res.ok) {
        throw new Error("Erreur serveur lors du prétraitement.");
      }

      const data = await res.json();
      alert(`✅ Prétraitement réussi !\n${data.message || 'Les 3 Vector Stores ont été ré-indexés avec succès.'}`);
    } catch (err) {
      console.error("Erreur lors du prétraitement global :", err);
      alert("❌ Échec du prétraitement global des bases vectorielles.");
    }
  };

  // Charger les statistiques RAG
  const loadRagStats = async () => {
    setLoadingStats(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:8000/api/v1/chat/stats/rag-usage', {
        headers: {
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        }
      });
      if (res.ok) {
        const data = await res.json();
        setRagStats(data);
      }
    } catch (err) {
      console.error("Erreur lors de la récupération des stats RAG :", err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Charger les pipelines
  const loadPipelines = async () => {
    setLoadingPipelines(true);
    try {
      const types = ['naive', 'hybrid', 'agentic'];
      const fetched = await Promise.all(
        types.map(async (type, idx) => {
          try {
            const res = await adminApi.getRagConfig(type);
            if (res && res.ok) {
              const data = await res.json();
              return {
                id: data.id || idx + 1,
                name: `Pipeline RAG — ${type.toUpperCase()}`,
                rag_type: type,
                llm_model: data.llm_model || 'gpt-4o',
                temperature: data.temperature ?? 0.7,
                top_k: data.top_k || 4,
                similarity_threshold: data.similarity_threshold ?? 0.5,
                chunk_size: data.chunk_size || 500,
                chunk_overlap: data.chunk_overlap || 80,
                system_prompt: data.system_prompt || '',
              };
            }
          } catch (e) {
            console.warn(`Impossible de charger la config pour ${type}`, e);
          }
          return {
            id: idx + 1,
            name: `Pipeline RAG — ${type.toUpperCase()}`,
            rag_type: type,
            llm_model: 'gpt-4o',
            temperature: 0.7,
            top_k: 4,
            similarity_threshold: 0.5,
            chunk_size: 500,
            chunk_overlap: 80,
            system_prompt: '',
          };
        })
      );
      setPipelines(fetched.filter(Boolean));
    } catch (err) {
      console.error("Erreur lors du chargement des pipelines :", err);
    } finally {
      setLoadingPipelines(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'pipelines') {
      loadPipelines();
      loadRagStats();
      loadAvailableFiles(); // 👈 Charger la liste des fichiers quand l'onglet Pipelines s'ouvre
    }

    const timer = setInterval(() => {
      if (activeTab === 'pipelines') {
        loadRagStats();
      }
    }, 10000);

    return () => clearInterval(timer);
  }, [activeTab]);

  const updateLocalField = (id, field, value) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  const savePipeline = async (id) => {
    const p = pipelines.find((item) => item.id === id);
    if (!p) return;
    setSavingId(id);
    try {
      if (adminApi.saveRagConfig) {
        await adminApi.saveRagConfig({
          rag_type: p.rag_type,
          llm_model: p.llm_model,
          temperature: p.temperature,
          top_k: p.top_k,
          similarity_threshold: p.similarity_threshold,
          chunk_size: p.chunk_size,
          chunk_overlap: p.chunk_overlap,
          system_prompt: p.system_prompt,
        });
      }
      alert(`⚙️ Configuration ${p.rag_type.toUpperCase()} sauvegardée avec succès !`);
    } catch (err) {
      console.error("Erreur lors de la sauvegarde :", err);
    } finally {
      setSavingId(null);
    }
  };

  // --- ÉTATS CHATBOT ---
  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'Bonjour Administrateur ! Quel test RAG souhaitez-vous effectuer ?' }
  ]);
  const [input, setInput] = useState('');
  const [ragType, setRagType] = useState('naive');
  const [loadingChat, setLoadingChat] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (activeTab === 'chatbot') {
      scrollToBottom();
    }
  }, [messages, loadingChat, activeTab]);

  const handleSend = (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { sender: 'user', text: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setLoadingChat(true);

    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { 
          sender: 'bot', 
          text: `[Test Admin Mode ${ragType.toUpperCase()}] : Requête traitée avec succès dans l'environnement de contrôle.` 
        }
      ]);
      setLoadingChat(false);
    }, 1000);
  };

  const profileData = {
    profile_picture_url: null,
    email: userEmail
  };

  return (
    <div className="min-h-screen bg-[#080d1a] text-slate-100 flex flex-col font-sans w-full overflow-x-hidden">
      
      {/* HEADER ADMIN */}
      <header className="h-16 border-b border-slate-800 bg-[#0b1222]/90 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-50 w-full">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-cyan-500/10 rounded-lg border border-cyan-500/20 text-cyan-400">
            <ShieldCheck size={20} />
          </div>
          <div>
            <h1 className="text-base font-bold bg-gradient-to-r from-white via-slate-200 to-cyan-400 bg-clip-text text-transparent">
              Administration TT — RAG Platform
            </h1>
            <p className="text-[10px] text-slate-400">Espace de contrôle & modération</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <span className="text-xs text-slate-400 font-mono">{userEmail}</span>
          <button
            onClick={onLogout}
            className="flex items-center gap-2 px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-semibold rounded-xl border border-rose-500/30 transition-all cursor-pointer"
          >
            <LogOut size={14} />
            <span>Déconnexion</span>
          </button>
        </div>
      </header>

      {/* CONTENU PRINCIPAL */}
      <div className="flex-1 flex flex-col md:flex-row w-full max-w-7xl mx-auto p-6 gap-6">
        
        {/* SIDEBAR */}
        <aside className="w-full md:w-64 bg-[#0b1222] border border-slate-800 rounded-2xl p-3 flex flex-col gap-1.5 shrink-0 h-fit">
          <p className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1 tracking-wider">
            Panneau de Contrôle
          </p>

          <button
            onClick={() => setActiveTab('users')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Users size={16} />
            <span>Utilisateurs (Agents)</span>
          </button>

          <button
            onClick={() => setActiveTab('whitelist')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'whitelist'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <UserPlus size={16} />
            <span>Whitelist (Autorisations)</span>
          </button>

          <button
            onClick={() => setActiveTab('pipelines')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'pipelines'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Layers size={16} />
            <span>Pipelines RAG</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
            }`}
          >
            <Activity size={16} />
            <span>Analytics & Logs</span>
          </button>

          <div className="my-2 border-t border-slate-800/80" />

          <p className="text-[10px] font-bold text-slate-500 uppercase px-3 py-1 tracking-wider">
            Espace Agent / Test
          </p>

          <button
            onClick={() => setActiveTab('chatbot')}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              activeTab === 'chatbot'
                ? 'bg-blue-600 text-white border border-blue-400/30 shadow-lg shadow-blue-500/20'
                : 'text-slate-300 bg-slate-900/60 hover:bg-slate-800 border border-slate-800'
            }`}
          >
            <Bot size={16} className={activeTab === 'chatbot' ? 'text-white' : 'text-cyan-400'} />
            <span>Tester le Chatbot RAG</span>
          </button>
        </aside>

        {/* PANNEAU D'AFFICHAGE DYNAMIQUE */}
        <main className="flex-1 min-w-0">
          {activeTab === 'users' && <UsersPanel />}

          {activeTab === 'whitelist' && <WhitelistPanel />}

          {activeTab === 'pipelines' && (
            <PipelinesPanel
              pipelines={pipelines}
              loading={loadingPipelines}
              savingId={savingId}
              updateLocalField={updateLocalField}
              savePipeline={savePipeline}
              /* PROPS FICHIERS & PREPROCESSING GLOBAL */
              availableFiles={availableFiles}
              onRunGlobalPreprocessing={handleGlobalPreprocessing}
              /* PROPS STATS */
              ragStats={ragStats}
              loadingStats={loadingStats}
              refetchRagStats={loadRagStats}
            />
          )}

          {activeTab === 'analytics' && (
            <div className="bg-[#0b1222] border border-slate-800 rounded-2xl p-8 text-center text-slate-400 text-xs">
              Module Analytics & Logs
            </div>
          )}

          {activeTab === 'chatbot' && (
            <div className="bg-[#0b1222] border border-slate-800 rounded-2xl h-[75vh] flex flex-col overflow-hidden">
              <ChatWindow
                messages={messages}
                loading={loadingChat}
                messagesEndRef={messagesEndRef}
                ragType={ragType}
                setRagType={setRagType}
                input={input}
                setInput={setInput}
                handleSend={handleSend}
                profileData={profileData}
              />
            </div>
          )}
        </main>

      </div>
    </div>
  );
}