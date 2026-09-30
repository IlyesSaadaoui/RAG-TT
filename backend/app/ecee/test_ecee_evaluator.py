import sys
import os
import json
import time
# Force Hugging Face à réutiliser les modèles déjà téléchargés sans appeler le web
os.environ["HF_HUB_OFFLINE"] = "1"
os.environ["TRANSFORMERS_OFFLINE"] = "1"

# 1. Résolution dynamique du chemin racine (Fix ModuleNotFoundError 'app')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from app.rag.pipeline_factory import RAGPipelineFactory

CONFIGS_PATH = os.path.join(BASE_DIR, "configurations.json")
REJECTED_PATH = os.path.join(BASE_DIR, "configurations_rejetees.json")

# Dataset de test ECEE
BENCHMARK_DATASET = [
    {
        "query": "Quels sont les tarifs du roaming ?",
        "expected_keywords": ["roaming", "tarif", "dt", "mo"],
        "should_know": True
    }
]

FORBIDDEN_RESPONSES = [
    "je ne sais pas", 
    "information non disponible", 
    "désolé", 
    "aucune information"
]

def is_weak_configuration(response_text: str, expected_keywords: list) -> bool:
    clean_resp = response_text.lower().strip()
    
    # Règle 1 : Élimination si réponse de rejet non justifiée
    for forbidden in FORBIDDEN_RESPONSES:
        if forbidden in clean_resp:
            return True

    # Règle 2 : Élimination si aucun mot-clé attendu n'est présent
    has_keyword = any(kw.lower() in clean_resp for kw in expected_keywords)
    if not has_keyword:
        return True

    return False

def run_ecee_evaluation(file_path: str):
    if not os.path.exists(CONFIGS_PATH):
        raise FileNotFoundError(f"Fichier introuvable : {CONFIGS_PATH}. Exécutez d'abord config_generator.py !")

    with open(CONFIGS_PATH, "r", encoding="utf-8") as f:
        configurations = json.load(f)

    rejected_configs = []
    valid_configs = []

    print(f"🚀 [ECEE] Lancement du banc d'essai sur {len(configurations)} configurations...\n")

    for config in configurations:
        cfg_id = config.get("config_id", "cfg_unknown")
        is_rejected = False
        rejection_reason = ""
        total_latency = 0.0

        try:
            # Récupération dynamique de la pipeline RAG
            pipeline = RAGPipelineFactory.get_pipeline(config)
            
            for test_case in BENCHMARK_DATASET:
                start_time = time.time()
                result = pipeline.run_pipeline(file_path=file_path, query=test_case["query"])
                latency = time.time() - start_time
                total_latency += latency

                answer = result.get("answer", "") if isinstance(result, dict) else str(result)

                if test_case["should_know"] and is_weak_configuration(answer, test_case["expected_keywords"]):
                    is_rejected = True
                    rejection_reason = f"Faux Négatif / Réponse faible : '{answer[:60]}...'"
                    break

        except Exception as e:
            is_rejected = True
            rejection_reason = f"Erreur d'exécution : {str(e)}"

        if is_rejected:
            print(f"❌ [{cfg_id}] REJETÉE - Raison: {rejection_reason}")
            config["rejection_reason"] = rejection_reason
            rejected_configs.append(config)
        else:
            avg_latency = total_latency / len(BENCHMARK_DATASET)
            print(f"✅ [{cfg_id}] VALIDE - Latence moyenne: {avg_latency:.2f}s")
            config["avg_latency"] = avg_latency
            valid_configs.append(config)

    # Sauvegarde dans configurations_rejetees.json
    with open(REJECTED_PATH, "w", encoding="utf-8") as f:
        json.dump(rejected_configs, f, indent=4, ensure_ascii=False)

    print(f"\n📊 [BILAN ECEE] : {len(valid_configs)} Valides | {len(rejected_configs)} Rejetées")

if __name__ == "__main__":
    sample_pdf = os.path.join(PROJECT_ROOT, "app", "data", "2018", "01", "FCmajRoaming2912.pdf")
    run_ecee_evaluation(sample_pdf)