import React from 'react';
import {
  User, LogOut, MessageSquare, Plus,
  PanelLeftClose, PanelLeft, LayoutDashboard, Trash2,
} from 'lucide-react';
import { resolveImageUrl } from '../../services/api';

export default function Sidebar({
  sidebarOpen, setSidebarOpen,
  sessions, activeSessionId, loadSessionMessages, handleDeleteSession, handleNewChat,
  setIsDashboardOpen,
  profileData, userEmail, onLogout,
}) {

  const avatarUrl = resolveImageUrl(profileData?.profile_picture_url);
  const displayName = profileData?.full_name || profileData?.username || userEmail || "Agent TT";

  return (
    <aside
      className={`${
        sidebarOpen ? 'w-64' : 'w-16'
      } bg-[#080d1a] border-r border-slate-800 transition-all duration-300 flex flex-col justify-between shrink-0 z-30`}
    >
      <div className="p-3 flex flex-col gap-4 min-h-0">

        {/* LOGO ET BOUTON RÉDUCTION */}
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

        {/* BOUTON NOUVELLE DISCUSSION */}
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
            {!sessions || sessions.length === 0 ? (
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

      {/* PIED DE SIDEBAR : DASHBOARD & FOOTER PROFIL */}
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
              
              {/* AVATAR OU PHOTO */}
              <div className="w-7 h-7 rounded-full bg-blue-600/30 text-cyan-400 flex items-center justify-center text-xs font-bold shrink-0 overflow-hidden border border-slate-700">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-3.5 h-3.5" />
                )}
              </div>

              {/* NOM & EMAIL */}
              <div className="flex flex-col truncate min-w-0">
                <span className="text-[11px] font-medium text-slate-200 truncate">
                  {displayName}
                </span>
                <span className="text-[9px] text-slate-500 truncate">
                  {userEmail || profileData?.email}
                </span>
              </div>

            </div>

            {/* BOUTON DÉCONNEXION */}
            <button 
              onClick={onLogout} 
              title="Déconnexion" 
              className="text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <button 
            onClick={onLogout} 
            title="Déconnexion" 
            className="p-2 rounded-lg text-slate-500 hover:text-rose-400 flex justify-center cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        )}
      </div>
    </aside>
  );
}