import React from 'react';
import {
  BotMessageSquare, User, SendHorizontal, LoaderCircle,
  ShieldCheck, MessageSquare, Cpu, Layers, Sparkles,
} from 'lucide-react';
import { resolveImageUrl } from '../../services/api';

export default function ChatWindow({
  messages, loading, messagesEndRef,
  ragType, setRagType, input, setInput, handleSend,
  profileData,
}) {
  const avatarUrl = resolveImageUrl(profileData?.profile_picture_url);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden">

      {/* HEADER */}
      <header className="w-full bg-[#080d1a] border-b border-slate-800 px-6 py-3 flex justify-between items-center shrink-0">
        <div>
          <h1 className="text-sm font-bold text-white uppercase tracking-wider">RAG Tunisie Telecom</h1>
          <p className="text-[9px] font-mono text-cyan-400 uppercase">Assistant Virtuel Intelligent</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-emerald-400 font-mono bg-emerald-950/30 px-3 py-1 rounded-full border border-emerald-800/50">
          <ShieldCheck className="w-3.5 h-3.5" /> Session Sécurisée
        </div>
      </header>

      {/* CHAT MESSAGES CONTAINER */}
      <main className="flex-1 overflow-y-auto p-6 space-y-4 max-w-4xl w-full mx-auto">
        {messages.map((msg, index) => (
          <div key={index} className={`flex gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>

            {msg.sender === 'bot' && (
              <div className="w-8 h-8 rounded-lg bg-[#0e1628] border border-slate-800 flex items-center justify-center text-cyan-400 shrink-0 mt-1">
                <BotMessageSquare className="w-4 h-4" />
              </div>
            )}

            <div className={`max-w-[75%] px-4 py-3 rounded-xl text-xs leading-relaxed shadow-md flex flex-col gap-1 ${
                msg.sender === 'user'
                  ? 'bg-blue-600 text-white rounded-tr-none font-medium'
                  : 'bg-[#0e1628] text-slate-200 rounded-tl-none border border-slate-800'
              }`}
            >
              <div>{msg.text}</div>

              {/* Tag optionnel pour indiquer la stratégie RAG du message */}
              {msg.sender === 'bot' && msg.rag_type && (
                <span className="text-[9px] font-mono text-slate-500 uppercase self-end mt-1 opacity-70">
                  RAG: {msg.rag_type}
                </span>
              )}
            </div>

            {msg.sender === 'user' && (
              <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-700/50 flex items-center justify-center text-blue-300 shrink-0 mt-1 overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="User" className="w-full h-full object-cover" />
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
              Traitement RAG ({ragType.toUpperCase()}) & Sauvegarde...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </main>

      {/* FOOTER INPUT & STRATEGY CHOICE */}
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
  );
}