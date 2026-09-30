import React, { useState } from 'react';
import { UserPlus, Trash2, Mail, CheckCircle, ShieldAlert, LoaderCircle, Search } from 'lucide-react';
import { useWhitelist } from '../../hooks/useWhitelist'; // 👈 Import du Custom Hook

export default function WhitelistPanel() {
  const [newEmail, setNewEmail] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // 🌟 Utilisation du Custom Hook
  const { emails, loading, submitting, error, success, addEmail, deleteEmail } = useWhitelist();

  const handleAddSubmit = async (e) => {
    e.preventDefault();
    const isSuccess = await addEmail(newEmail);
    if (isSuccess) {
      setNewEmail(''); // Réinitialise l'input si l'ajout s'est bien passé
    }
  };

  const handleDeleteClick = (emailToDelete) => {
    if (window.confirm(`Voulez-vous vraiment retirer "${emailToDelete}" de la whitelist ?`)) {
      deleteEmail(emailToDelete);
    }
  };

  // Filtrage pour la recherche
  const filteredEmails = emails.filter((item) =>
    item.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* FORMULAIRE D'AJOUT */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4">
        <div className="flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-cyan-400" />
          <h3 className="text-sm font-bold text-white uppercase tracking-wider">
            Autoriser un nouvel utilisateur
          </h3>
        </div>

        <form onSubmit={handleAddSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
            <input
              type="email"
              required
              placeholder="ex: nom.prenom@tunisietelecom.tn"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              className="w-full bg-[#050914] text-white text-xs pl-9 pr-3 py-2.5 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold px-4 py-2.5 rounded-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 active:scale-95"
          >
            {submitting ? <LoaderCircle className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
            Ajouter à la Whitelist
          </button>
        </form>

        {/* ALERTE ERREUR */}
        {error && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-lg text-rose-400 text-xs flex items-center gap-2">
            <ShieldAlert size={16} />
            <span>{error}</span>
          </div>
        )}

        {/* ALERTE SUCCÈS */}
        {success && (
          <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
            <CheckCircle size={16} />
            <span>{success}</span>
          </div>
        )}
      </div>

      {/* TABLEAU DE LA WHITELIST */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Adresses autorisées (@tunisietelecom.tn)
            </h4>
            <span className="text-[10px] bg-slate-800 text-cyan-400 px-2 py-0.5 rounded-full font-mono">
              {emails.length} autorisés
            </span>
          </div>

          <div className="relative w-64">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              placeholder="Rechercher un email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#050914] text-white text-[11px] pl-8 pr-3 py-1.5 rounded-lg border border-slate-800 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-8 text-cyan-400 gap-2">
            <LoaderCircle className="w-5 h-5 animate-spin" />
            <span className="text-xs">Chargement de la whitelist...</span>
          </div>
        ) : filteredEmails.length === 0 ? (
          <p className="text-xs text-slate-500 italic py-6 text-center">
            Aucun email correspondant dans la whitelist.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 uppercase text-[10px] font-mono">
                  <th className="py-2.5 px-3">Email</th>
                  <th className="py-2.5 px-3">Date d'ajout</th>
                  <th className="py-2.5 px-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredEmails.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-white flex items-center gap-2">
                      <Mail className="w-3.5 h-3.5 text-cyan-400" />
                      {item.email}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 text-[11px] font-mono">
                      {item.created_at ? new Date(item.created_at).toLocaleDateString('fr-FR') : 'N/A'}
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <button
                        onClick={() => handleDeleteClick(item.email)}
                        className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-all cursor-pointer"
                        title="Retirer de la whitelist"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}