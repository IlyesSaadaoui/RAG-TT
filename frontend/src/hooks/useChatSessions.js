import { useState, useEffect, useCallback } from 'react';
import { chatApi, ragApi } from '../services/api';

export default function useChatSessions(userEmailProp) {
  const effectiveEmail = userEmailProp || localStorage.getItem('user_email') || '';

  const [sessions, setSessions] = useState([]);
  const [activeSessionId, setActiveSessionId] = useState(() => {
    return localStorage.getItem('active_session_id') || null;
  });

  const welcomeMessage = {
    sender: 'bot',
    text: "Bonjour ! Je suis l'assistant RAG de Tunisie Telecom. Comment puis-je vous aider aujourd'hui ?",
    rag_type: null
  };

  const [messages, setMessages] = useState([welcomeMessage]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [ragType, setRagType] = useState('naive');

  useEffect(() => {
    if (activeSessionId) {
      localStorage.setItem('active_session_id', activeSessionId);
    } else {
      localStorage.removeItem('active_session_id');
    }
  }, [activeSessionId]);

  // 1. Charger les messages d'une session depuis la BDD
  const loadSessionMessages = useCallback(async (sessionId) => {
    if (!sessionId) return;
    setActiveSessionId(sessionId);
    try {
      const res = await chatApi.getMessages(sessionId);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length > 0) {
          // Les messages contiennent la colonne `rag_type` venue de PostgreSQL
          setMessages(data);
        } else {
          setMessages([welcomeMessage]);
        }
      }
    } catch (err) {
      console.error("Erreur chargement messages :", err);
    }
  }, []);

  // 2. Charger les sessions utilisateur
  const fetchSessions = useCallback(async () => {
    if (!effectiveEmail) return;
    try {
      const res = await chatApi.listSessions(effectiveEmail);
      if (res.ok) {
        const data = await res.json();
        const sessionList = data || [];
        setSessions(sessionList);

        const savedSessionId = localStorage.getItem('active_session_id');
        if (savedSessionId && sessionList.some(s => String(s.id) === String(savedSessionId))) {
          loadSessionMessages(savedSessionId);
        }
      }
    } catch (err) {
      console.error("Erreur chargement des sessions :", err);
    }
  }, [effectiveEmail, loadSessionMessages]);

  useEffect(() => {
    if (effectiveEmail) {
      fetchSessions();
    }
  }, [effectiveEmail, fetchSessions]);

  // 3. Nouvelle discussion
  const handleNewChat = () => {
    setActiveSessionId(null);
    localStorage.removeItem('active_session_id');
    setMessages([welcomeMessage]);
    setInput('');
  };

  // 4. Supprimer une session
  const handleDeleteSession = async (e, sessionId) => {
    e.stopPropagation();
    try {
      const res = await chatApi.deleteSession(sessionId);
      if (res.ok) {
        setSessions((prev) => prev.filter((s) => String(s.id) !== String(sessionId)));
        if (String(activeSessionId) === String(sessionId)) {
          handleNewChat();
        }
      }
    } catch (err) {
      console.error("Erreur suppression session :", err);
    }
  };

  // 5. Envoyer un message
  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || !effectiveEmail) return;

    const userText = input;
    const selectedRag = ragType; // Contient 'naive', 'hybrid' ou 'agentic'
    setInput('');
    setLoading(true);

    let currentSessionId = activeSessionId;

    try {
      const updatedMessages = messages.filter(m => m !== welcomeMessage);

      // A. Création de la session en BDD
      if (!currentSessionId) {
        const sessionRes = await chatApi.createSession(effectiveEmail, userText.slice(0, 30));
        if (sessionRes.ok) {
          const newSession = await sessionRes.json();
          currentSessionId = newSession.id;
          setActiveSessionId(currentSessionId);
          localStorage.setItem('active_session_id', currentSessionId);
        }
      }

      // B. Message utilisateur
      setMessages([...updatedMessages, { sender: 'user', text: userText }]);
      if (currentSessionId) {
        await chatApi.postMessage(currentSessionId, 'user', userText);
      }

      // C. Interrogation de l'API RAG avec le RAG sélectionné ('naive', 'hybrid', 'agentic')
      const ragRes = await ragApi.ask(userText, selectedRag);
      const ragData = await ragRes.json();
      const botAnswer = ragData.answer || "Désolé, aucune réponse disponible.";
      const ragUsed = ragData.rag_type_used || selectedRag;

      // D. Affichage du Bot dans l'UI avec la bonne étiquette RAG
      setMessages((prev) => [
        ...prev, 
        { sender: 'bot', text: botAnswer, rag_type: ragUsed }
      ]);

      // E. Sauvegarde message Bot en BDD AVEC son `rag_type` !
      if (currentSessionId) {
        await chatApi.postMessage(currentSessionId, 'bot', botAnswer, ragUsed);
      }

      fetchSessions();
    } catch (error) {
      console.error("Erreur envoi message :", error);
      setMessages((prev) => [...prev, { sender: 'bot', text: "❌ Erreur de communication avec le serveur." }]);
    } finally {
      setLoading(false);
    }
  };

  return {
    sessions,
    activeSessionId,
    messages,
    setMessages,
    input,
    setInput,
    loading,
    setLoading,
    ragType,
    setRagType,
    fetchSessions,
    loadSessionMessages,
    handleNewChat,
    handleDeleteSession,
    handleSend,
  };
}