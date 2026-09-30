import re
import unicodedata
from app.core.cleaner.base_cleaner import BaseCleaner


try:
    import ftfy
    HAS_FTFY = True
except ImportError:
    HAS_FTFY = False


class StandardCleaner(BaseCleaner):
    """
    Nettoyeur standard recommandé pour la majorité des pipelines RAG.
    Conserve la structure linguistique globale tout en éliminant le bruit d'encodage et d'espacement.
    """
    
    def clean(self, text: str) -> str:
        if not text:
            return ""

        # 1. Correction des problèmes d'encodage (ex: Mojibake, caractères UTF-8 cassés)
        if HAS_FTFY:
            text = ftfy.fix_text(text)

        # 2. Normalisation Unicode (NFC permet d'harmoniser les caractères accentués)
        text = unicodedata.normalize("NFC", text)

        # 3. Normalisation des sauts de ligne (transforme \r\n en \n)
        text = re.sub(r'\r\n|\r', '\n', text)

        # 4. Suppression des sauts de ligne excessifs (plus de 2 réduits à 2 pour préserver les paragraphes)
        text = re.sub(r'\n{3,}', '\n\n', text)

        # 5. Réduction des espaces multiples (hors sauts de ligne)
        text = re.sub(r'[ \t]+', ' ', text)

        return text.strip()


class AdvancedCleaner(BaseCleaner):
    """
    Nettoyeur avancé (Deep Cleaning).
    Applique des traitements plus destructifs pour purifier le texte issu d'OCR,
    de logs informatiques ou de scans PDF de mauvaise qualité.
    """
    
    def __init__(self, remove_urls: bool = False, remove_emails: bool = False, remove_pii: bool = False):
        self.standard_cleaner = StandardCleaner()
        self.remove_urls = remove_urls
        self.remove_emails = remove_emails
        self.remove_pii = remove_pii

    def clean(self, text: str) -> str:
        if not text:
            return ""

        # 1. Passage par le nettoyage standard
        text = self.standard_cleaner.clean(text)

        # 2. Resolution des césures de mots de fin de ligne (très fréquent sur les PDF scannés/OCR)
        # Ex: "paral- \n lèle" -> "parallèle"
        text = re.sub(r'(\w+)-\s*\n\s*(\w+)', r'\1\2', text)

        # 3. Suppression des caractères non-imprimables / Bruit binaire
        text = re.sub(r'[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]', '', text)

        # 4. Anonymisation / Masquage des URLs (Optionnel)
        if self.remove_urls:
            text = re.sub(r'https?://\S+|www\.\S+', '[URL]', text)

        # 5. Anonymisation des e-mails (Optionnel)
        if self.remove_emails or self.remove_pii:
            text = re.sub(r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', '[EMAIL]', text)

        # 6. Suppression des en-têtes/pieds de page récurrents type "Page 1 sur 10"
        text = re.sub(r'(?i)page\s+\d+(\s+sur|\/)\s*\d+', '', text)

        # Nettoyage final des espaces résiduels
        return self.standard_cleaner.clean(text)