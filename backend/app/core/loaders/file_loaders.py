# core/loaders/file_loaders.py
import pypdf
from pathlib import Path
from app.core.loaders.base_loader import BaseFileLoader

class PyPDFLoader(BaseFileLoader):
    def read_text(self, file_path: Path) -> str:
        text = ""
        try:
            with open(file_path, "rb") as f:
                reader = pypdf.PdfReader(f)
                for page in reader.pages:
                    page_text = page.extract_text()
                    if page_text:
                        text += page_text + "\n"
        except Exception as e:
            print(f"[ERROR] Lecture PDF échouée pour {file_path.name}: {e}")
        return text

class DocxLoader(BaseFileLoader):
    def read_text(self, file_path: Path) -> str:
        try:
            import docx
            doc = docx.Document(file_path)
            return "\n".join([p.text for p in doc.paragraphs])
        except ImportError:
            # Fallback si la librairie n'est pas encore installée dans l'environnement
            return f"[DOCX Fallback] Contenu simulé pour le fichier Word : {file_path.name}"
        except Exception as e:
            print(f"[ERROR] Lecture DOCX échouée pour {file_path.name}: {e}")
            return ""

class TxtLoader(BaseFileLoader):
    def read_text(self, file_path: Path) -> str:
        try:
            with open(file_path, "r", encoding="utf-8", errors="ignore") as f:
                return f.read()
        except Exception as e:
            print(f"[ERROR] Lecture TXT échouée pour {file_path.name}: {e}")
            return ""