import React, { useState, useRef } from 'react';
import { Mail, Lock, LogIn, ShieldCheck, Globe, Eye, EyeOff, ScanFace, Camera, RefreshCw, CheckCircle2 } from 'lucide-react';

// ==========================================
// 🚀 SOUS-COMPOSANT : SCANNER DE CAMÉRA
// ==========================================
function AuthScanner({ onScanSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
  const [capturedImage, setCapturedImage] = useState(null);

  const startCamera = async () => {
    setScanStatus('idle');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      setStream(mediaStream);
      setCameraActive(true);

      setTimeout(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = mediaStream;
        }
      }, 100);
    } catch (err) {
      console.error("Erreur accès caméra:", err);
      setScanStatus('error');
      alert("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setScanStatus('scanning');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    const imageDataBase64 = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataBase64);
    stopCamera();

    setTimeout(() => {
      setScanStatus('success');
      if (onScanSuccess) {
        onScanSuccess(imageDataBase64);
      }
    }, 1500);
  };

  return (
    <div className="w-full flex flex-col space-y-2 pt-2">
      <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Reconnaissance faciale (MFA)</label>
      
      <div className="relative w-full h-36 bg-[#0a1020] rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden">
        {scanStatus === 'scanning' && (
          <div className="absolute left-0 right-0 h-0.5 bg-cyan-400 shadow-[0_0_10px_#22d3ee] animate-[bounce_2s_infinite] z-30" />
        )}

        {cameraActive && scanStatus !== 'success' ? (
          <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
        ) : capturedImage && scanStatus === 'success' ? (
          <div className="relative w-full h-full">
            <img src={capturedImage} alt="Face" className="w-full h-full object-cover scale-x-[-1]" />
            <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase mt-1">Empreinte capturée</span>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center text-center p-2 space-y-1">
            <ScanFace className="w-5 h-5 text-slate-500" />
            <p className="text-[10px] text-slate-400">Caméra requise pour validation</p>
          </div>
        )}

        {scanStatus === 'scanning' && (
          <div className="absolute inset-0 bg-[#050914]/80 backdrop-blur-sm flex flex-col items-center justify-center z-40">
            <RefreshCw className="w-4 h-4 text-cyan-400 animate-spin" />
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div>
        {!cameraActive && scanStatus !== 'success' ? (
          <button 
            type="button" 
            onClick={startCamera}
            className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-cyan-400" />
            <span>Ouvrir l'objectif</span>
          </button>
        ) : scanStatus === 'success' ? (
          <button 
            type="button" 
            onClick={startCamera}
            className="w-full text-slate-400 text-[10px] py-1 flex items-center justify-center gap-1 cursor-pointer hover:text-slate-300 transition-all"
          >
            <RefreshCw className="w-3 h-3" />
            <span>Reprendre la photo</span>
          </button>
        ) : (
          <button 
            type="button" 
            onClick={captureAndScan}
            disabled={scanStatus === 'scanning'}
            className="w-full bg-cyan-500 text-[#050914] text-[11px] font-bold py-2 rounded-lg flex items-center justify-center cursor-pointer hover:bg-cyan-400 transition-all uppercase"
          >
            <span>Prendre l'empreinte</span>
          </button>
        )}
      </div>
    </div>
  );
}


// ==========================================
// 🛡️ COMPOSANT PRINCIPAL : AUTH CONTEXT
// ==========================================
export default function Auth({ onNavigateToRegister, onAuthSuccess }) {
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [biometricPayload, setBiometricPayload] = useState(null);

  // Soumission finale unique regroupant les 3 paramètres
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!biometricPayload) {
      alert("❌ L'authentification faciale est obligatoire. Veuillez capturer votre visage avant de soumettre.");
      return;
    }

    const completeAuthData = {
      email: formData.email,
      password: formData.password,
      faceMatchToken: biometricPayload 
    };

    try {
      const response = await fetch("http://127.0.0.1:8000/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(completeAuthData),
      });

      const data = await response.json();

      if (response.ok) {
        // 🟢 Extraction du token JWT ou création d'une session
        const tokenToSave = data.access_token || data.token || "session-token-active";
        
        // 🟢 Sauvegarde du token ET de l'email de l'utilisateur
        localStorage.setItem("token", tokenToSave);
        localStorage.setItem("user_email", formData.email);
        
        // 🚀 Redirection vers le composant Chat Agent TT avec le token ET l'email
        if (onAuthSuccess) {
          onAuthSuccess(tokenToSave, formData.email);
        } else {
          window.location.reload(); 
        }

      } else {
        alert(`❌ Échec de la connexion : ${data.detail || "Identifiants ou visage incorrects."}`);
      }

    } catch (error) {
      console.error("Erreur de communication backend :", error);
      alert("❌ Erreur de réseau ou problème côté serveur.");
    }
  };

  return (
    <div className="fixed inset-0 w-screen h-screen bg-[#050914] z-50 grid grid-cols-2 text-slate-200 antialiased overflow-hidden select-none">
      
      {/* GLOWS */}
      <div className="absolute -top-40 -left-20 w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute -bottom-40 -right-20 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[130px] pointer-events-none" />

      {/* COLONNE GAUCHE */}
      <div className="p-10 flex flex-col justify-center items-center relative border-r border-slate-900/80 bg-[#03060f]/60 h-full overflow-hidden">
        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="flex flex-col items-center text-center w-full mb-6">
            <div className="relative w-40 h-40 flex items-center justify-center mb-5">
              <div className="absolute inset-4 rounded-full bg-cyan-500/10 animate-ping opacity-75 duration-1000" />
              <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/30 animate-[spin_80s_linear_infinite]" />
              <div className="w-50 h-50 z-10 flex items-center justify-center">
                <img src="/src/assets/tt-logo.png" alt="Tunisie Telecom" className="w-full h-full object-contain filter brightness-125 [mix-blend-mode:color-dodge]" />
              </div>
            </div>

            <h2 className="text-3xl font-black text-white tracking-tight uppercase bg-gradient-to-r from-white to-slate-400 bg-clip-text text-transparent">
              Tunisie Telecom
            </h2>
            <div className="mt-2 px-3 py-0.5 bg-cyan-500/10 border border-cyan-500/20 rounded-full">
              <p className="text-[10px] font-mono font-bold tracking-[0.25em] text-cyan-400 uppercase">RAG SECURE ACCESS</p>
            </div>
          </div>

          <div className="space-y-3 w-full z-10">
            <div className="flex items-start gap-3.5 p-3.5 bg-[#0a1020]/60 backdrop-blur-md rounded-xl border border-slate-800/50">
              <div className="p-2.5 bg-[#0d1527] rounded-lg border border-slate-800 text-blue-400 shrink-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="font-bold text-xs text-white tracking-wide">Authentification Forte Obligatoire</p>
                <p className="text-[11px] text-slate-400 mt-0.5 leading-normal">Pour des raisons de confidentialité RAG, la validation par mot de passe ET par scanner facial est strictly requise.</p>
              </div>
            </div>
          </div>
        </div>
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 text-[10px] text-slate-600 font-mono">&copy; 2026 Tunisie Telecom.</div>
      </div>

      {/* COLONNE DROITE */}
      <div className="p-10 flex flex-col justify-center items-center relative bg-[#050914]/20 h-full overflow-hidden">
        
        <div className="absolute top-6 right-6 flex items-center gap-1.5 p-1.5 px-3 bg-[#0a1020] rounded-full border border-slate-800 text-[10px] font-semibold text-slate-400">
          <Globe className="w-3.5 h-3.5 text-cyan-400" />
          <span>FR</span>
        </div>

        <div className="text-center mb-5 w-full max-w-[360px]">
          <h1 className="text-2xl font-black text-white uppercase tracking-tight">Connexion Sécurisée</h1>
          <p className="text-xs text-slate-400 mt-1">Veuillez renseigner vos paramètres d'accès</p>
        </div>

        <form onSubmit={handleSubmit} className="w-full max-w-[360px] space-y-3.5">
          
          {/* Email */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Adresse Email</label>
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type="email" 
                placeholder="prenom.nom@tunisietelecom.tn" 
                className="w-full bg-[#0a1020] pl-11 pr-4 py-2.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner" 
                value={formData.email} 
                onChange={(e) => setFormData({...formData, email: e.target.value})} 
                required 
              />
            </div>
          </div>

          {/* Mot de Passe */}
          <div>
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Mot de passe</label>
            <div className="relative">
              <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="••••••••" 
                className="w-full bg-[#0a1020] pl-11 pr-11 py-2.5 rounded-xl border border-slate-800 text-white text-xs focus:border-cyan-500 focus:outline-none transition-all shadow-inner" 
                value={formData.password} 
                onChange={(e) => setFormData({...formData, password: e.target.value})} 
                required 
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-500 hover:text-cyan-400 p-1">
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Scanner Facial */}
          <AuthScanner onScanSuccess={(base64) => setBiometricPayload(base64)} />

          {/* Bouton de Soumission */}
          <button 
            type="submit" 
            className="w-full bg-blue-600 text-white font-bold py-2.5 rounded-xl flex items-center justify-center gap-2 text-xs cursor-pointer hover:bg-blue-500 transition-all pt-3 shadow-lg shadow-blue-600/10"
          >
            <LogIn className="w-4 h-4" />
            <span>Vérifier l'ensemble des identifiants</span>
          </button>

          <div className="pt-2 text-center border-t border-slate-900/60 text-xs text-slate-400">
            Nouveau sur la plateforme ? <button type="button" onClick={onNavigateToRegister} className="text-cyan-400 font-bold hover:underline ml-1">Créer un compte</button>
          </div>

        </form>
      </div>
    </div>
  );
}