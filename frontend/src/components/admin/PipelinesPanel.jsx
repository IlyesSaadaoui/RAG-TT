import React, { useState } from 'react';
import { LoaderCircle, Save, SlidersHorizontal, BarChart3, RotateCw, FileText, Play, CheckSquare, Square, Database } from 'lucide-react';

const LLM_OPTIONS = ['gpt-4o', 'Llama-3', 'Mistral-7B', 'llama3.2:latest'];

export default function PipelinesPanel({ 
  pipelines = [], 
  loading, 
  savingId, 
  updateLocalField, 
  savePipeline,
  // Props des données globales & preprocessing
  availableFiles = [],        // Liste globale des fichiers [{ path: '...', name: 'doc1.pdf', size: '2 MB' }]
  onRunGlobalPreprocessing,   // Callback async (selectedFilePaths) => Promise pour mettre à jour les 3 Vector Stores
  // Props des statistiques RAG
  ragStats = { total: 0, percentages: { naive: 0, hybrid: 0, agentic: 0 }, counts: { naive: 0, hybrid: 0, agentic: 0 } },
  loadingStats = false,
  refetchRagStats
}) {
  // 1. État local global pour la sélection des fichiers (partagé par les 3 moteurs)
  const [selectedGlobalFiles, setSelectedGlobalFiles] = useState([]);
  const [isGlobalProcessing, setIsGlobalProcessing] = useState(false);

  // Gestion cocher / décocher un fichier
  const toggleFile = (filePath) => {
    setSelectedGlobalFiles((prev) =>
      prev.includes(filePath)
        ? prev.filter((p) => p !== filePath)
        : [...prev, filePath]
    );
  };

  // Cocher / Décocher tout
  const toggleAllFiles = () => {
    if (selectedGlobalFiles.length === availableFiles.length) {
      setSelectedGlobalFiles([]);
    } else {
      const allPaths = availableFiles.map((f) => f.path || f.name);
      setSelectedGlobalFiles(allPaths);
    }
  };

  // Lancement du preprocessing global sur les 3 moteurs
  const handleTriggerGlobalPreprocessing = async () => {
    if (selectedGlobalFiles.length === 0) {
      alert("⚠️ Veuillez cocher au moins un fichier pour alimenter les bases vectorielles.");
      return;
    }

    if (onRunGlobalPreprocessing) {
      setIsGlobalProcessing(true);
      try {
        await onRunGlobalPreprocessing(selectedGlobalFiles);
      } finally {
        setIsGlobalProcessing(false);
      }
    } else {
      console.warn("Prop 'onRunGlobalPreprocessing' non fournie.");
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center py-10 text-cyan-400 gap-2">
        <LoaderCircle className="w-6 h-6 animate-spin" />
        <span className="text-xs">Chargement des pipelines...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* 📊 BANDEAU 1 : STATISTIQUES D'UTILISATION RAG */}
      <div className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 space-y-4 shadow-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Répartition Globale des Moteurs RAG
            </h4>
            <span className="text-[10px] text-slate-500 font-mono">
              ({ragStats.total || 0} messages au total)
            </span>
          </div>

          {refetchRagStats && (
            <button
              onClick={() => refetchRagStats()}
              className="text-[11px] bg-slate-800/80 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300 px-2.5 py-1 rounded-lg border border-cyan-500/20 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
              title="Actualiser les données BDD"
            >
              <RotateCw className={`w-3 h-3 ${loadingStats ? 'animate-spin text-cyan-300' : ''}`} />
              <span>Actualiser</span>
            </button>
          )}
        </div>

        {/* METRICS CARDS */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-[#050914] border border-blue-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-blue-400">Naïf</span>
              <span className="text-xs font-mono text-slate-400">{ragStats.counts?.naive || 0} msgs</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {ragStats.percentages?.naive || 0}%
            </div>
          </div>

          <div className="bg-[#050914] border border-purple-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-purple-400">Hybride</span>
              <span className="text-xs font-mono text-slate-400">{ragStats.counts?.hybrid || 0} msgs</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {ragStats.percentages?.hybrid || 0}%
            </div>
          </div>

          <div className="bg-[#050914] border border-emerald-500/20 rounded-lg p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-[11px] font-semibold text-emerald-400">Agentique</span>
              <span className="text-xs font-mono text-slate-400">{ragStats.counts?.agentic || 0} msgs</span>
            </div>
            <div className="text-xl font-extrabold text-white">
              {ragStats.percentages?.agentic || 0}%
            </div>
          </div>
        </div>

        {/* BARRE DE PROGRESSION VISUELLE */}
        <div className="w-full bg-[#050914] h-2.5 rounded-full overflow-hidden flex border border-slate-800">
          <div style={{ width: `${ragStats.percentages?.naive || 0}%` }} className="bg-blue-500 h-full transition-all duration-500" />
          <div style={{ width: `${ragStats.percentages?.hybrid || 0}%` }} className="bg-purple-500 h-full transition-all duration-500" />
          <div style={{ width: `${ragStats.percentages?.agentic || 0}%` }} className="bg-emerald-500 h-full transition-all duration-500" />
        </div>
      </div>

      {/* 📁 BANDEAU 2 : SÉLECTION GLOBALE DES DONNÉES & PREPROCESSING UNIFIÉ */}
      <div className="bg-[#0e1628] border border-emerald-500/30 rounded-xl p-5 space-y-4 shadow-lg relative overflow-hidden">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Database className="w-4 h-4 text-emerald-400" />
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">
              Source de Données Globale (Indexation Unifiée)
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">
              ({selectedGlobalFiles.length}/{availableFiles.length} fichier(s) sélectionné(s))
            </span>
          </div>

          {availableFiles.length > 0 && (
            <button
              type="button"
              onClick={toggleAllFiles}
              className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-medium"
            >
              {selectedGlobalFiles.length === availableFiles.length ? (
                <> <CheckSquare className="w-3.5 h-3.5" /> Tout décocher </>
              ) : (
                <> <Square className="w-3.5 h-3.5" /> Tout cocher </>
              )}
            </button>
          )}
        </div>

        {/* Grille de sélection des fichiers */}
        <div className="bg-[#050914] border border-slate-800 rounded-lg p-3 max-h-40 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-2">
          {availableFiles.length === 0 ? (
            <p className="text-[11px] text-slate-500 italic col-span-2 text-center py-2">
              Aucun fichier disponible pour le prétraitement.
            </p>
          ) : (
            availableFiles.map((f, idx) => {
              const filePath = f.path || f.name;
              const isChecked = selectedGlobalFiles.includes(filePath);

              return (
                <label
                  key={idx}
                  className={`flex items-center justify-between text-xs p-2 rounded-lg cursor-pointer transition-all border ${
                    isChecked
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/40'
                      : 'bg-slate-900/50 text-slate-400 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center gap-2 overflow-hidden">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleFile(filePath)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-emerald-500 focus:ring-emerald-500/20 cursor-pointer"
                    />
                    <span className="truncate font-mono text-[11px]">{f.name}</span>
                  </div>
                  {f.size && <span className="text-[10px] text-slate-500 font-mono ml-2">{f.size}</span>}
                </label>
              );
            })
          )}
        </div>

        {/* Bouton pour déclencher l'indexation simultanée sur les 3 bases vectorielles */}
        <button
          type="button"
          onClick={handleTriggerGlobalPreprocessing}
          disabled={isGlobalProcessing || selectedGlobalFiles.length === 0}
          className={`w-full py-2.5 rounded-lg text-xs font-bold flex items-center justify-center gap-2 transition-all shadow-md cursor-pointer ${
            isGlobalProcessing
              ? 'bg-emerald-900/50 text-emerald-400 cursor-not-allowed border border-emerald-500/30'
              : selectedGlobalFiles.length === 0
              ? 'bg-slate-800/50 text-slate-500 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-500 text-white active:scale-[0.99]'
          }`}
        >
          {isGlobalProcessing ? (
            <>
              <LoaderCircle className="w-4 h-4 animate-spin text-emerald-400" />
              <span>Prétraitement & Synchronisation des 3 Vector Stores en cours...</span>
            </>
          ) : (
            <>
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Lancer le prétraitement global (Naïf, Hybride & Agentique)</span>
            </>
          )}
        </button>
      </div>

      {/* ⚙️ BANDEAU 3 : CONFIGURATION INDÉPENDANTE DES PIPELINES RAG */}
      {!pipelines || pipelines.length === 0 ? (
        <p className="text-xs text-slate-500 italic py-6 text-center">
          Aucun pipeline configuré. Vérifiez vos paramètres en base de données.
        </p>
      ) : (
        <div className="space-y-6">
          {pipelines.map((p) => {
            const pId = p.id || p.rag_type;
            const tempValue = typeof p.temperature === 'number' ? p.temperature : 0.7;
            const simThreshold = typeof p.similarity_threshold === 'number' ? p.similarity_threshold : 0.5;

            return (
              <div key={pId} className="bg-[#0e1628] border border-slate-800 rounded-xl p-5 space-y-4">
                {/* Header du Pipeline */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-800/60">
                  <div className="flex items-center gap-2">
                    <SlidersHorizontal className="w-4 h-4 text-cyan-400" />
                    <h4 className="text-sm font-bold text-white">{p.name || `Pipeline RAG — ${p.rag_type?.toUpperCase()}`}</h4>
                  </div>
                  
                  {/* SAUVEGARDE INDÉPENDANTE DES PARAMÈTRES DU PIPELINE */}
                  <button
                    onClick={() => savePipeline(p.id)}
                    disabled={savingId === p.id}
                    className="bg-cyan-600 hover:bg-cyan-500 text-white text-[11px] font-semibold px-3 py-1.5 rounded-lg flex items-center gap-1.5 cursor-pointer transition-all disabled:opacity-50"
                  >
                    {savingId === p.id ? <LoaderCircle className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
                    Sauvegarder la configuration
                  </button>
                </div>

                {/* Formulaire des Paramètres */}
                <div className="grid grid-cols-2 gap-4">
                  {/* Choix LLM */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">Modèle LLM</label>
                    <select
                      value={p.llm_model || 'gpt-4o'}
                      onChange={(e) => updateLocalField(p.id, 'llm_model', e.target.value)}
                      className="w-full bg-[#050914] text-white text-xs px-2.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    >
                      {LLM_OPTIONS.map((m) => (
                        <option key={m} value={m}>{m}</option>
                      ))}
                    </select>
                  </div>

                  {/* Température */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">
                      Température : {tempValue.toFixed(2)}
                    </label>
                    <input
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={tempValue}
                      onChange={(e) => updateLocalField(p.id, 'temperature', parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Top-K */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">Top-K Retrieval</label>
                    <input
                      type="number" 
                      min="1" 
                      max="50"
                      value={p.top_k || 4}
                      onChange={(e) => updateLocalField(p.id, 'top_k', parseInt(e.target.value, 10) || 1)}
                      className="w-full bg-[#050914] text-white text-xs px-2.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Seuil de similarité */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">
                      Seuil de similarité : {simThreshold.toFixed(2)}
                    </label>
                    <input
                      type="range" 
                      min="0" 
                      max="1" 
                      step="0.05"
                      value={simThreshold}
                      onChange={(e) => updateLocalField(p.id, 'similarity_threshold', parseFloat(e.target.value))}
                      className="w-full accent-cyan-500 cursor-pointer"
                    />
                  </div>

                  {/* Chunk Size */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">Chunk Size</label>
                    <input
                      type="number" 
                      min="50" 
                      step="50"
                      value={p.chunk_size || 500}
                      onChange={(e) => updateLocalField(p.id, 'chunk_size', parseInt(e.target.value, 10) || 50)}
                      className="w-full bg-[#050914] text-white text-xs px-2.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Chunk Overlap */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-mono text-slate-500 uppercase">Chunk Overlap</label>
                    <input
                      type="number" 
                      min="0" 
                      step="10"
                      value={p.chunk_overlap || 80}
                      onChange={(e) => updateLocalField(p.id, 'chunk_overlap', parseInt(e.target.value, 10) || 0)}
                      className="w-full bg-[#050914] text-white text-xs px-2.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                {/* Prompt Système */}
                <div className="space-y-1">
                  <label className="text-[10px] font-mono text-slate-500 uppercase">System Prompt</label>
                  <textarea
                    value={p.system_prompt || ''}
                    onChange={(e) => updateLocalField(p.id, 'system_prompt', e.target.value)}
                    rows={2}
                    className="w-full bg-[#050914] text-white text-xs px-2.5 py-2 rounded-lg border border-slate-700 focus:outline-none focus:border-cyan-500 resize-none"
                    placeholder="Directives système pour ce pipeline..."
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}