import sys
import os
import json
import itertools

# Fix PYTHONPATH : Ajoute la racine du projet (parent de 'app')
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, "../.."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

SEARCH_SPACE_PATH = os.path.join(BASE_DIR, "search_space.json")
CONFIGS_PATH = os.path.join(BASE_DIR, "configurations.json")

def generate_configurations():
    with open(SEARCH_SPACE_PATH, "r", encoding="utf-8") as f:
        search_space = json.load(f)

    keys = list(search_space.keys())
    values = list(search_space.values())
    
    combinations = list(itertools.product(*values))
    
    generated_configs = []
    for idx, combo in enumerate(combinations):
        config_dict = {
            "config_id": f"cfg_{idx+1}",
            "rag_type": "hybrid"  # 👈 S'assure que rag_type est présent
        }
        config_dict.update(dict(zip(keys, combo)))
        generated_configs.append(config_dict)

    with open(CONFIGS_PATH, "w", encoding="utf-8") as f:
        json.dump(generated_configs, f, indent=4, ensure_ascii=False)

    print(f"✅ {len(generated_configs)} configurations générées dans {CONFIGS_PATH}")

if __name__ == "__main__":
    generate_configurations()