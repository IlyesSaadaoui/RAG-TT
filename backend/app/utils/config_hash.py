# app/utils/config_hash.py
import hashlib
import json


def compute_config_hash(config: dict) -> str:
    """
    Calcule une empreinte unique (hash) pour une configuration RAG donnée,
    à partir de ses paramètres.

    Utilisé pour :
    - vérifier si une configuration existe déjà dans search_space (ECEE)
    - relier une prédiction de whiteLog/blackLog à sa vérification ultérieure
      dans whitelist/blacklist (même config = même hash)

    IMPORTANT : les clés du dictionnaire sont triées avant le hachage, afin que
    l'ordre dans lequel les paramètres sont fournis n'affecte jamais le résultat
    (deux configurations identiques doivent toujours produire le même hash,
    peu importe l'ordre des champs).
    """
    # Ne garder que les champs pertinents pour la configuration elle-même
    # (exclure id, timestamps, experiment_id, etc. qui ne font pas partie
    # de la définition de la configuration).
    relevant_fields = [
        "rag_type",
        "cleaner",
        "chunking_strategy",
        "chunk_size",
        "chunk_overlap",
        "embedding_model",
        "vectorstore_type",
        "retrieval_strategy",
        "top_k",
        "llm_provider",
        "llm_model",
    ]

    normalized = {key: config.get(key) for key in relevant_fields}

    # json.dumps avec sort_keys=True garantit un ordre stable et déterministe
    serialized = json.dumps(normalized, sort_keys=True)

    return hashlib.sha256(serialized.encode("utf-8")).hexdigest()