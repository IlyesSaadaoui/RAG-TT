import React from 'react';
import { LoaderCircle } from 'lucide-react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function AnalyticsPanel({ dailyUsers, ragUsage, loading, totalUsers, todayCount }) {
  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-cyan-400 gap-2">
        <LoaderCircle className="w-6 h-6 animate-spin" />
        <span className="text-xs">Chargement des statistiques...</span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Total utilisateurs (30j)</p>
          <p className="text-xl font-bold text-cyan-400 mt-1">{totalUsers}</p>
        </div>
        <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Nouveaux aujourd'hui</p>
          <p className="text-xl font-bold text-emerald-400 mt-1">{todayCount}</p>
        </div>
        <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
          <p className="text-[10px] font-mono text-slate-500 uppercase">Requêtes RAG (30j)</p>
          <p className="text-xl font-bold text-purple-400 mt-1">
            {ragUsage.reduce((sum, r) => sum + r.count, 0)}
          </p>
        </div>
      </div>

      <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
        <p className="text-[11px] font-mono text-slate-400 uppercase mb-3">Utilisateurs actifs par jour (30 derniers jours)</p>
        {dailyUsers.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">Pas encore de données.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dailyUsers}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0e1628', border: '1px solid #1e293b', fontSize: 11 }} />
              <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      <div className="bg-[#0e1628] border border-slate-800 p-4 rounded-xl">
        <p className="text-[11px] font-mono text-slate-400 uppercase mb-3">Utilisation par type de RAG</p>
        {ragUsage.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">
            Pas encore de données — endpoint en attente d'intégration avec l'historique de chat.
          </p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ragUsage}>
              <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }} />
              <YAxis tick={{ fontSize: 10, fill: '#64748b' }} allowDecimals={false} />
              <Tooltip contentStyle={{ background: '#0e1628', border: '1px solid #1e293b', fontSize: 11 }} />
              <Bar dataKey="count" fill="#2563eb" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
