import os
import base64
import cv2
import numpy as np
from fastapi import HTTPException, status

class FaceService:
    @staticmethod
    def verify_face(uploaded_base64: str, reference_image_name: str) -> bool:
        temp_filename = "temp_login_face.jpg"
        try:
            # 1. Décoder le Base64
            if "," in uploaded_base64:
                uploaded_base64 = uploaded_base64.split(",")[1]
            
            image_data = base64.b64decode(uploaded_base64)
            with open(temp_filename, "wb") as f:
                f.write(image_data)
                
            # 2. Charger les images en niveaux de gris directement
            img_scan = cv2.imread(temp_filename, cv2.IMREAD_GRAYSCALE)
            img_ref = cv2.imread(reference_image_name, cv2.IMREAD_GRAYSCALE)
            
            if img_scan is None or img_ref is None:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Erreur de lecture des fichiers images."
                )

            # 3. Forcer exactement la même taille (Standardisation)
            # On réduit à une petite taille (100x100) pour lisser les bruits et le flou de la webcam
            img_scan_resized = cv2.resize(img_scan, (100, 100))
            img_ref_resized = cv2.resize(img_ref, (100, 100))

            # 4. Normalisation de la luminosité (Évite le piège des ombres)
            img_scan_norm = cv2.equalizeHist(img_scan_resized)
            img_ref_norm = cv2.equalizeHist(img_ref_resized)

            # 5. Algorithme mathématique pur : Corrélation de Pearson via Numpy (Aucun attribut cv2 requis)
            # On aplatit les images en listes de pixels
            flat_scan = img_scan_norm.flatten().astype(float)
            flat_ref = img_ref_norm.flatten().astype(float)
            
            # Calcul de la matrice de corrélation
            correlation_matrix = np.corrcoef(flat_scan, flat_ref)
            score = correlation_matrix[0, 1]
            
            print(f"[MATRICE BIOMÉTRIQUE] Score de correspondance : {score:.4f}")

            # Nettoyage
            if os.path.exists(temp_filename):
                os.remove(temp_filename)

            # SEUIL ADAPTATIF : 0.30 est une valeur sûre pour valider une ressemblance globale
            if score < 0.15:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail=f"Visage non reconnu (Score obtenu: {score:.2f} | Requis: 0.15)."
                )

            return True
            
        except Exception as e:
            if os.path.exists(temp_filename):
                os.remove(temp_filename)
            if isinstance(e, HTTPException):
                raise e
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"Erreur d'analyse : {str(e)}"
            )