# core/cleaner/cleaner_factory.py
from app.core.cleaner.text_cleaners import StandardCleaner, AdvancedCleaner

class CleanerFactory:
    @staticmethod
    def get_cleaner(cleaner_type: str):
        """Instancie le nettoyeur de texte approprié selon la configuration."""
        cleaner_type_clean = cleaner_type.lower().strip()
        
        if cleaner_type_clean == "standard":
            return StandardCleaner()
        elif cleaner_type_clean == "advanced":
            return AdvancedCleaner()
        else:
            raise ValueError(
                f"Le type de Cleaner '{cleaner_type}' n'est pas reconnu. "
                f"Choisissez parmi : ['standard', 'advanced']"
            )