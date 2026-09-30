# core/loaders/directory_manager.py
import sys
from pathlib import Path
from typing import List, Dict, Any

# Sécurité pour le Python Path afin de pouvoir exécuter ce script depuis n'importe où
root_path = Path(__file__).resolve().parent.parent.parent
if str(root_path) not in sys.path:
    sys.path.insert(0, str(root_path))

from app.core.loaders.file_loaders import PyPDFLoader, DocxLoader, TxtLoader

class ChronologicalDirectoryManager:
    """
    Scanne l'arborescence temporelle du dataset (Ex: datasets/2024/05/rapport.pdf)
    et extrait le texte ainsi que les métadonnées (année, mois, source) avec suivi de progression.
    """
    
    def __init__(self, loader_strategy: str = "all", base_dataset_path: str = "datasets"):
        self.base_path = Path(base_dataset_path)
        self.loader_strategy = loader_strategy.lower() # "all" par défaut
        
        # Enregistrement des stratégies de chargement disponibles
        self.loaders_map = {
            ".pdf": PyPDFLoader(),
            ".docx": DocxLoader(),
            ".txt": TxtLoader()
        }

    def _count_valid_files(self) -> List[Path]:
        """Parcourt une première fois pour lister et compter les fichiers valides."""
        valid_files = []
        if not self.base_path.exists():
            return valid_files

        for year_dir in self.base_path.iterdir():
            if year_dir.is_dir() and year_dir.name.isdigit():
                for month_dir in year_dir.iterdir():
                    if month_dir.is_dir():
                        for file_path in month_dir.iterdir():
                            if file_path.is_file() and file_path.suffix.lower() in self.loaders_map:
                                valid_files.append(file_path)
        return valid_files

    def load_all_documents(self) -> List[Dict[str, Any]]:
        """
        Parcourt récursivement datasets/ANNEE/MOIS/ avec indicateur de progression (%).
        """
        documents = []
        
        if not self.base_path.exists():
            print(f"[WARNING] Le dossier racine des données '{self.base_path.resolve()}' n'existe pas.")
            return documents

        # 1. Pré-calcul du total des fichiers pour le pourcentage
        all_files = self._count_valid_files()
        total_files = len(all_files)
        
        if total_files == 0:
            print("[INFO] Aucun document valide trouvé dans le dataset.")
            return documents

        print(f"[START] Début du traitement de {total_files} documents historiques...")
        
        processed_count = 0

        # 2. Parcours principal pour l'extraction
        for year_dir in self.base_path.iterdir():
            if year_dir.is_dir() and year_dir.name.isdigit():
                year = year_dir.name
                
                for month_dir in year_dir.iterdir():
                    if month_dir.is_dir():
                        month = month_dir.name
                        
                        for file_path in month_dir.iterdir():
                            if file_path.is_file():
                                ext = file_path.suffix.lower()
                                
                                if ext in self.loaders_map:
                                    # Mise à jour du compteur et calcul du pourcentage
                                    processed_count += 1
                                    percentage = (processed_count / total_files) * 100
                                    
                                    # Affichage dynamique sur la même ligne (\r)
                                    sys.stdout.write(f"\r[LOADING] Progression : {percentage:.1f}% ({processed_count}/{total_files}) - Lecture de : {file_path.name[:30]}")
                                    sys.stdout.flush()

                                    loader = self.loaders_map[ext]
                                    raw_text = loader.read_text(file_path)
                                    
                                    if raw_text.strip():
                                        documents.append({
                                            "text": raw_text,
                                            "metadata": {
                                                "year": year,
                                                "month": month,
                                                "source": file_path.name,
                                                "path": str(file_path)
                                            }
                                        })
                                        
        # Saut de ligne final pour nettoyer l'affichage dynamique \r
        print("\n" + "="*50)
        print(f"[SUCCESS] {len(documents)} documents chargés avec succès depuis l'arborescence.")
        return documents
    

# ==============================================================================
# EXEMPLE DE STRUCTURE DE DONNÉES RETOURNÉE PAR LE DIRECTORY_MANAGER :
# ==============================================================================
# Le résultat est une List[Dict[str, Any]] où chaque fichier est encapsulé
# avec son texte brut extrait et ses métadonnées chronologiques associées.
"""
[
    {
        "text": "RAPPORT FINANCIER Q2 2023\nLes performances du deuxième trimestre affichent une croissance constante dans le secteur de la tech...",
        "metadata": {
            "year": "2023",
            "month": "05",
            "source": "rapport.pdf",
            "path": "C:\\Users\\INFOKOM\\Desktop\\test1\\AI_Engine\\datasets\\2023\\05\\rapport.pdf"
        }
    },
    {
        "text": "COMMUNIQUE DE PRESSE DE FIN D'ANNEE\nL'entreprise annonce le lancement de sa nouvelle infrastructure cloud pour la gestion des données massives...",
        "metadata": {
            "year": "2024",
            "month": "12",
            "source": "communique.txt",
            "path": "C:\\Users\\INFOKOM\\Desktop\\test1\\AI_Engine\\datasets\\2024\\12\\communique.txt"
        }
    },
    {
        "text": "SYNTHÈSE STRATÉGIQUE DE L'EXERCICE 2025\nObjectifs clés : Consolider l'utilisation des LLM locaux (Ollama) et automatiser l'évaluation non supervisée...",
        "metadata": {
            "year": "2025",
            "month": "01",
            "source": "synthese.docx",
            "path": "C:\\Users\\INFOKOM\\Desktop\\test1\\AI_Engine\\datasets\\2025\\01\\synthese.docx"
        }
    }
]
"""
