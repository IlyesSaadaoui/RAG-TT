// src/hooks/usePipelines.js
import { useState, useEffect, useCallback } from 'react';
import { adminApi, chatApi } from '../services/api'; // On importe chatApi pour les stats RAG

export function usePipelines() {
  const [pipelines, setPipelines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState(null);

  // État dédié aux statistiques globales de RAG
  const [ragStats, setRagStats] = useState({
    total: 0,
    percentages: { naive: 0, hybrid: 0, agentic: 0 },
    counts: { naive: 0, hybrid: 0, agentic: 0 }
  });
  const [loadingStats, setLoadingStats] = useState(true);

  // 1. Charger les statistiques RAG depuis le backend (chat.py -> /stats/rag-usage)
  const loadRagStats = useCallback(async () => {
    setLoadingStats(true);
    try {
      const data = await chatApi.getRagUsageStats();
      if (data) {
        setRagStats(data);
      }
    } catch (err) {
      console.error("Erreur de chargement des statistiques RAG :", err);
    } finally {
      setLoadingStats(false);
    }
  }, []);

  // 2. Charger les configurations des pipelines RAG
  const loadPipelines = useCallback(async () => {
    setLoading(true);
    try {
      const types = ['naive', 'hybrid', 'agentic'];
      const fetchedPipelines = await Promise.all(
        types.map(async (type, idx) => {
          const res = await adminApi.getRagConfig(type);
          if (res.ok) {
            const data = await res.json();
            return {
              id: data.id || idx + 1,
              name: `Pipeline RAG — ${type.toUpperCase()}`,
              rag_type: type,
              llm_model: data.llm_model || 'llama3.2:latest',
              temperature: data.temperature ?? 0.7,
              top_k: data.top_k || 4,
              similarity_threshold: data.similarity_threshold ?? 0.5,
              chunk_size: data.chunk_size || 500,
              chunk_overlap: data.chunk_overlap || 80,
              system_prompt: data.system_prompt || '',
            };
          }
          return null;
        })
      );
      setPipelines(fetchedPipelines.filter(Boolean));
    } catch (err) {
      console.error("Erreur de chargement des pipelines :", err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Chargement initial au montage du composant
  useEffect(() => {
    loadPipelines();
    loadRagStats();
  }, [loadPipelines, loadRagStats]);

  // Modifier localement un champ avant sauvegarde
  const updateLocalField = (id, field, value) => {
    setPipelines((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
  };

  // Envoyer au serveur FastAPI
  const savePipeline = async (id) => {
    const pipelineToSave = pipelines.find((p) => p.id === id);
    if (!pipelineToSave) return;

    setSavingId(id);
    try {
      const res = await adminApi.saveRagConfig({
        rag_type: pipelineToSave.rag_type,
        llm_model: pipelineToSave.llm_model,
        top_k: pipelineToSave.top_k,
        chunk_size: pipelineToSave.chunk_size,
        chunk_overlap: pipelineToSave.chunk_overlap,
        // Tu peux ajouter d'autres champs si ton backend le requiert
      });

      if (res.ok) {
        alert(`Pipeline ${pipelineToSave.name} sauvegardé avec succès !`);
      } else {
        alert("Erreur lors de la sauvegarde.");
      }
    } catch (err) {
      console.error("Erreur de sauvegarde :", err);
    } finally {
      setSavingId(null);
    }
  };

  return {
    pipelines,
    loading,
    savingId,
    ragStats,
    loadingStats,
    refetchRagStats: loadRagStats, // Permet de rafraîchir manuellement les stats depuis la vue
    updateLocalField,
    savePipeline
  };
}