import React, { useState, useEffect } from 'react';
import { 
  Search, 
  Trash2, 
  RefreshCw, 
  Phone, 
  Mail, 
  AlertCircle,
  Radio
} from 'lucide-react';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import useAdmin from '../../hooks/useAdmin';
import { resolveImageUrl } from '../../services/api';

export default function UsersPanel() {
  const adminData = useAdmin() || {};

  const { 
    users = [], 
    loading = false, 
    error = null, 
    onlineCount = 0,
    realtimeHistory = [],
    wsConnected = false,
    dailyTrend = [],
    trendLoading = false,
    fetchUsers = () => {}, 
    changeUserRole = () => {}, 
    removeUser = () => {}
  } = adminData;

  const [searchTerm, setSearchTerm] = useState('');
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const showToast = (text, isError = false) => {
    setToast({ text, isError });
    setTimeout(() => setToast(null), 3500);
  };

  const handleRoleChange = async (userId, newRole) => {
    const res = await changeUserRole(userId, newRole);
    if (res.success) {
      showToast(res.message || "Rôle mis à jour avec succès !");
    } else {
      showToast(res.error || "Échec de la modification du rôle.", true);
    }
  };

  const handleDelete = async (userId, username) => {
    if (window.confirm(`Êtes-vous sûr de vouloir supprimer l'utilisateur "${username}" ?`)) {
      const res = await removeUser(userId);
      if (res.success) {
        showToast(`Utilisateur ${username} supprimé.`);
      } else {
        showToast(res.error || "Échec de la suppression.", true);
      }
    }
  };

  const filteredUsers = users.filter((u) => {
    const term = searchTerm.toLowerCase();
    return (
      u.username?.toLowerCase().includes(term) ||
      u.email?.toLowerCase().includes(term) ||
      u.phone?.includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* TOAST / NOTIFICATION */}
      {toast && (
        <div className={`p-4 rounded-xl border font-medium text-sm transition-all duration-200 flex items-center gap-3 ${
          toast.isError 
            ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' 
            : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
        }`}>
          <AlertCircle size={18} />
          <span>{toast.text}</span>
        </div>
      )}

      {/* WIDGET TEMPS RÉEL + TENDANCE LONGUE DURÉE */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* TEMPS RÉEL (WebSocket, fenêtre glissante, ne persiste pas) */}
        <div className="bg-[#0b1222] border border-slate-800 p-5 rounded-2xl shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-mono text-slate-400 uppercase tracking-wider">
                Utilisateurs Connectés (Temps Réel)
              </p>
              <div className="flex items-center gap-3 mt-2">
                <span className="text-3xl font-extrabold text-white">{onlineCount}</span>
                <span className={`w-2.5 h-2.5 rounded-full ${wsConnected ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] font-mono text-slate-500">
              <Radio size={12} className={wsConnected ? 'text-emerald-400' : 'text-slate-600'} />
              {wsConnected ? 'Connecté' : 'Reconnexion...'}
            </div>
          </div>

          <ResponsiveContainer width="100%" height={100}>
            <AreaChart data={realtimeHistory}>
              <defs>
                <linearGradient id="onlineGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="time" hide />
              <YAxis hide domain={[0, 'dataMax + 2']} />
              <Tooltip
                contentStyle={{ background: '#0e1628', border: '1px solid #1e293b', fontSize: 11 }}
                labelFormatter={(v) => `À ${v}`}
                formatter={(value) => [value, 'En ligne']}
              />
              <Area type="monotone" dataKey="count" stroke="#10b981" strokeWidth={2} fill="url(#onlineGradient)" isAnimationActive={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* TENDANCE LONGUE DURÉE (persistée en base, 14 derniers jours) */}
        <div className="bg-[#0b1222] border border-slate-800 p-5 rounded-2xl shadow-lg">
          <p className="text-xs font-mono text-slate-400 uppercase tracking-wider mb-3">
            Tendance des connexions (14 derniers jours)
          </p>

          {trendLoading ? (
            <div className="h-[100px] flex items-center justify-center text-slate-500 text-xs gap-2">
              <RefreshCw size={14} className="animate-spin" /> Chargement...
            </div>
          ) : dailyTrend.length === 0 ? (
            <div className="h-[100px] flex items-center justify-center text-slate-500 text-xs italic">
              Pas encore de données sur cette période.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={100}>
              <LineChart data={dailyTrend}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                <XAxis dataKey="date" tick={{ fontSize: 9, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 9, fill: '#64748b' }} allowDecimals={false} width={24} />
                <Tooltip contentStyle={{ background: '#0e1628', border: '1px solid #1e293b', fontSize: 11 }} />
                <Line type="monotone" dataKey="count" stroke="#22d3ee" strokeWidth={2} dot={{ r: 2 }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* BARRE D'ACTIONS */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-center bg-[#0b1222] p-4 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
          <input
            type="text"
            placeholder="Rechercher nom, email, tél..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-10 pr-4 py-2 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>

        <button
          onClick={fetchUsers}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-all cursor-pointer disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          <span>Actualiser</span>
        </button>
      </div>

      {/* TABLEAU DES UTILISATEURS */}
      <div className="bg-[#0b1222] border border-slate-800 rounded-2xl overflow-hidden">
        {loading && users.length === 0 ? (
          <div className="p-12 text-center text-slate-400 flex flex-col items-center gap-3">
            <RefreshCw size={28} className="animate-spin text-cyan-400" />
            <p className="text-sm">Chargement de la liste des utilisateurs...</p>
          </div>
        ) : error ? (
          <div className="p-8 text-center text-rose-400 text-sm">
            Erreur : {error}
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            Aucun utilisateur trouvé.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-900/50 text-slate-400 text-xs uppercase tracking-wider">
                  <th className="py-4 px-6">Utilisateur</th>
                  <th className="py-4 px-6">Coordonnées</th>
                  <th className="py-4 px-6">Rôle Privilégié</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredUsers.map((u) => {
                  const isAdmin = u.role === 'Administrateur' || u.role === 'ADMIN';
                  
                  return (
                    <tr key={u.id} className="hover:bg-slate-900/30 transition-colors">
                      {/* IDENTITÉ */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden border border-slate-700 flex items-center justify-center font-bold text-slate-300 shrink-0">
                            {u.face_image_path ? (
                              <img 
                                src={resolveImageUrl(u.face_image_path)} 
                                alt={u.username}
                                className="w-full h-full object-cover" 
                                onError={(e) => { e.target.style.display = 'none'; }}
                              />
                            ) : (
                              u.username?.[0]?.toUpperCase() || 'U'
                            )}
                          </div>
                          <div>
                            <p className="font-semibold text-slate-100">{u.username}</p>
                            <p className="text-xs text-slate-500">ID: #{u.id}</p>
                          </div>
                        </div>
                      </td>

                      {/* CONTACT */}
                      <td className="py-4 px-6">
                        <div className="space-y-1 text-xs">
                          <div className="flex items-center gap-1.5 text-slate-300">
                            <Mail size={13} className="text-slate-500" />
                            <span>{u.email}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-slate-400">
                            <Phone size={13} className="text-slate-500" />
                            <span>+216 {u.phone}</span>
                          </div>
                        </div>
                      </td>

                      {/* RÔLE */}
                      <td className="py-4 px-6">
                        <select
                          value={isAdmin ? 'Administrateur' : 'Agent TT'}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-full border focus:outline-none cursor-pointer transition-all ${
                            isAdmin 
                              ? 'bg-purple-500/10 text-purple-300 border-purple-500/30 hover:bg-purple-500/20' 
                              : 'bg-cyan-500/10 text-cyan-300 border-cyan-500/30 hover:bg-cyan-500/20'
                          }`}
                        >
                          <option value="Agent TT" className="bg-slate-900 text-slate-200">Agent TT</option>
                          <option value="Administrateur" className="bg-slate-900 text-slate-200">Administrateur</option>
                        </select>
                      </td>

                      {/* SUPPRESSION */}
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => handleDelete(u.id, u.username)}
                          className="p-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/20 rounded-lg transition-all cursor-pointer"
                          title="Supprimer l'utilisateur"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}