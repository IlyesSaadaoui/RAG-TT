import React, { useState, useEffect, useRef } from 'react';
import Sidebar from './Sidebar';
import ChatWindow from './ChatWindow';
import ProfileModal from './ProfileModal';
import useProfile from '../../hooks/useProfile';
import useChatSessions from '../../hooks/useChatSessions';

export default function AgentTT({ onLogout, userEmail }) {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [isDashboardOpen, setIsDashboardOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);

  // 🔴 CORRECTION : Récupérer l'email depuis les props ou le localStorage
  const effectiveEmail = userEmail || localStorage.getItem('user_email') || '';

  // Charger le profil avec l'email effectif
  const { profileData, setProfileData, profileLoading, uploadProfilePhoto, handleProfileSave } = useProfile(effectiveEmail);

  // Charger les sessions avec l'email effectif
  const {
    messages, input, setInput, loading, ragType, setRagType,
    sessions, activeSessionId,
    loadSessionMessages, handleNewChat, handleDeleteSession, handleSend,
  } = useChatSessions(effectiveEmail);

  const messagesEndRef = useRef(null);

  // WebSocket pour la présence en ligne
  useEffect(() => {
    const ws = new WebSocket('ws://localhost:8000/ws/online-users');
    return () => {
      ws.close();
    };
  }, []);

  // Auto-scroll bas de page
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  return (
    <div className="w-screen h-screen bg-[#050914] text-slate-200 flex overflow-hidden font-sans relative">

      {/* SIDEBAR DE NAVIGATION & PROFIL */}
      <Sidebar
        sidebarOpen={sidebarOpen}
        setSidebarOpen={setSidebarOpen}
        sessions={sessions}
        activeSessionId={activeSessionId}
        loadSessionMessages={loadSessionMessages}
        handleDeleteSession={handleDeleteSession}
        handleNewChat={handleNewChat}
        setIsDashboardOpen={setIsDashboardOpen}
        profileData={profileData}
        userEmail={effectiveEmail} // 🔴 TRANSMISSION DE EFFECTIVE_EMAIL
        onLogout={onLogout}
      />

      {/* FENÊTRE DE DISCUSSION */}
      <ChatWindow
        messages={messages}
        loading={loading}
        messagesEndRef={messagesEndRef}
        ragType={ragType}
        setRagType={setRagType}
        input={input}
        setInput={setInput}
        handleSend={handleSend}
        profileData={profileData}
      />

      {/* MODALE DE PROFIL */}
      <ProfileModal
        isOpen={isDashboardOpen}
        onClose={() => setIsDashboardOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        profileData={profileData}
        setProfileData={setProfileData}
        profileLoading={profileLoading}
        handleProfileSave={handleProfileSave}
        uploadProfilePhoto={uploadProfilePhoto}
        showPassword={showPassword}
        setShowPassword={setShowPassword}
        sessionsCount={sessions?.length || 0}
      />

    </div>
  );
}