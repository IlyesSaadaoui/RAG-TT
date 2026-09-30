import React, { useState, useRef } from 'react';
import { ScanFace, Camera, ArrowLeft, RefreshCw } from 'lucide-react';

export default function AuthScanner({ onCancel, onScanSuccess }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [stream, setStream] = useState(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [scanStatus, setScanStatus] = useState('idle'); // 'idle' | 'scanning' | 'success' | 'error'
  const [capturedImage, setCapturedImage] = useState(null);

  // Activer la caméra de l'utilisateur
  const startCamera = async () => {
    setScanStatus('idle');
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { width: 1280, height: 720, facingMode: 'user' }
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setCameraActive(true);
    } catch (err) {
      console.error("Erreur accès caméra:", err);
      setScanStatus('error');
      alert("Impossible d'accéder à la caméra. Veuillez vérifier les autorisations.");
    }
  };

  // Arrêter proprement le flux vidéo
  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setCameraActive(false);
  };

  // Capturer la frame et simuler le traitement IA
  const captureAndScan = () => {
    if (!videoRef.current || !canvasRef.current) return;
    
    setScanStatus('scanning');
    const video = videoRef.current;
    const canvas = canvasRef.current;
    
    // Résolution identique au flux vidéo
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const ctx = canvas.getContext('2d');
    // Effet miroir pour la capture pour correspondre au rendu visuel
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    
    // Extraction en Base64 (Prêt à l'envoi pour l'API Backend)
    const imageDataBase64 = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataBase64);

    // On coupe la caméra dès que la photo est prise
    stopCamera();

    // Notification au parent ou traitement
    if (onScanSuccess) {
      onScanSuccess(imageDataBase64, setScanStatus);
    } else {
      // Simulation locale si aucune fonction backend n'est encore connectée
      setTimeout(() => {
        setScanStatus('success');
      }, 2000);
    }
  };

  const handleBack = () => {
    stopCamera();
    onCancel();
  };

  return (
    <div className="w-full max-w-[360px] flex flex-col items-center space-y-4 animate-[fadeIn_0.3s_ease-out]">
      
      {/* Zone d'affichage du Scanner */}
      <div className="relative w-full aspect-square bg-[#0a1020] rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-2xl">
        
        {/* Ligne laser technologique animée */}
        {scanStatus === 'scanning' && (
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-[bounce_2s_infinite] z-30" />
        )}

        {cameraActive && scanStatus !== 'success' ? (
          <>
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              className="w-full h-full object-cover scale-x-[-1]" 
            />
            
            {/* Viseur cible UI */}
            <div className="absolute inset-8 border border-cyan-500/30 rounded-xl pointer-events-none z-20 transition-all group-hover:border-cyan-500/50">
              <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
              <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
              <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
              <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
            </div>
          </>
        ) : capturedImage && scanStatus === 'success' ? (
          <img src={capturedImage} alt="Visage capturé" className="w-full h-full object-cover" />
        ) : (
          <div className="flex flex-col items-center text-center p-6 space-y-3 z-10">
            <div className="p-4 bg-slate-900/80 rounded-full border border-slate-800 text-slate-400">
              <ScanFace className="w-8 h-8 text-cyan-400" />
            </div>
            <p className="text-xs text-slate-400 max-w-[200px]">
              Système de reconnaissance biométrique RAG. Veuillez activer votre périphérique.
            </p>
          </div>
        )}

        {/* Écran de chargement pendant l'analyse IA */}
        {scanStatus === 'scanning' && (
          <div className="absolute inset-0 bg-[#050914]/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-40">
            <RefreshCw className="w-6 h-6 text-cyan-400 animate-spin" />
            <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold animate-pulse">
              Analyse de l'empreinte faciale...
            </p>
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Boutons de contrôle */}
      <div className="w-full flex gap-2">
        <button 
          type="button" 
          onClick={handleBack} 
          className="px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:text-white transition-all cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>

        {!cameraActive && scanStatus !== 'success' ? (
          <button 
            type="button" 
            onClick={startCamera}
            className="flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-all"
          >
            <Camera className="w-4 h-4" />
            <span>Démarrer l'appareil</span>
          </button>
        ) : scanStatus === 'success' ? (
          <button 
            type="button" 
            onClick={startCamera}
            className="flex-1 bg-slate-900 text-slate-200 border border-slate-800 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Recommencer le scan</span>
          </button>
        ) : (
          <button 
            type="button" 
            onClick={captureAndScan}
            disabled={scanStatus === 'scanning'}
            className="flex-1 bg-cyan-500 text-[#050914] text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-cyan-400 transition-all uppercase tracking-wider shadow-lg shadow-cyan-500/20"
          >
            <span>Analyser le visage</span>
          </button>
        )}
      </div>
    </div>
  );
}