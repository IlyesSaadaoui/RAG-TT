# 🛠 Architecture & Flux d'Exécution Frontend

## 1. Cycle de Démarrage (Vite & React)

* **1.1. Déclenchement :** Lancement de la commande `npm run dev` dans le terminal.
* **1.2. Environnement :** Node.js exécute le script `dev` défini dans `package.json` (`"dev": "vite"`) et démarre l'outil Vite.
* **1.3. Serveur Local :** Vite initialise un serveur web local à l'écoute sur le port `5173`.
* **1.4. Requête Initiale :** Le navigateur envoie une requête HTTP `GET /` vers `http://localhost:5173/`.
* **1.5. Fichier Racine :** N'ayant aucun fichier spécifié dans l'URL, le serveur applique sa règle par défaut et retourne le fichier `index.html` (servi par Vite).

---

## 2. Cycle d'Authentification

### 2.1. Appel initial de l'application
Lors du chargement de `index.html`, le navigateur exécute le point d'entrée `main.jsx` qui instancie le composant racine `<App />` (enrobé par le routeur `<BrowserRouter>`).

### 2.2. Démarrage de `App()` et vérification de la session
Au lancement de la fonction `App()` :
* Le hook personnalisé `useAuth()` est exécuté pour lire synchrinement le `localStorage` (`token`, `userEmail`, `userRole`).
* L'état d'aiguillage `isRegistering` est initialisé à `false`.
* Si aucun jeton n'est détecté (`!token === true`), `App.jsx` affiche par défaut la page de connexion `LoginPage.jsx`.

### 2.3. Soumission du formulaire et validation biométrique
Dans `LoginPage.jsx` :
1. L'état `isLoading` est initialisé à `false` (affichage du formulaire).
2. À la soumission (`handleSubmit`) :
   * **Contrôle Biométrique :** Si `biometricPayload` est `null` (pas de scan facial), une alerte bloque la soumission.
   * **Indicateur de charge :** Si l'empreinte faciale est valide, `isLoading` passe à `true` pour afficher l'écran d'attente (`LoadingScreen`).

### 2.4. Communication API & Traitement Serveur
* La fonction `handleSubmit` sollicite `authApi.login()` issue du service `api.js`.
* `api.js` émet une requête HTTP `POST` contenant l'email, le mot de passe et l'empreinte biométrique (`facial_data_sample`) à destination du backend FastAPI.
* Le backend vérifie les accès et retourne une réponse JSON contenant le jeton (`access_token`) et le rôle attribué.

### 2.5. Sauvegarde et Redirection selon le Rôle
* **En cas d'échec :** `isLoading` repasse à `false` et une notification d'erreur est affichée à l'utilisateur.
* **En cas de succès :**
  1. `handleAuthSuccess()` enregistre le `token`, l'email et le rôle dans le `localStorage`.
  2. La mise à jour de l'état `token` déclenche le re-rendu automatique de `App.jsx`.
  3. `App()` évalue la fonction `isAdmin(userRole)` :
     * **Rôle `ADMIN` :** Redirection vers `AdminDashboard.jsx`.
     * **Rôle `AGENT` :** Redirection vers `AgentTT.jsx`.

### 2.6. Attachement du Token aux requêtes ultérieures
Pour chaque requête réseau suivante (Chat, RAG, Administration), la fonction utilitaire `authHeaders()` dans `api.js` extrait le jeton sauvegardé dans le `localStorage` et l'injecte automatiquement dans les en-têtes HTTP :  
`Authorization: Bearer <token>`
