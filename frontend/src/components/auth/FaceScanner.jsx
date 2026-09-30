import React, { useState, useRef } from 'react';
import { ScanFace, Camera, ArrowLeft, RefreshCw, CheckCircle2 } from 'lucide-react';

// ==========================================================================
// ⚠️ FUSION : deux implémentations quasi-identiques existaient en parallèle
// (le sous-composant AuthScanner défini DANS Auth.jsx, et le fichier séparé
// AuthScanner.jsx utilisé nulle part de façon effective - Register.jsx
// l'importait mais ne le rendait jamais, utilisant react-webcam à la place).
// Un seul composant "vérité" ici, avec une prop `compact` pour couvrir les
// deux styles visuels (l'encart discret du formulaire de login vs. la grande
// carte du portail d'enrôlement).
//
// Bonus corrigé au passage : la version compacte capturait l'image SANS
// corriger l'effet miroir (le canvas ne reprenait pas la transformation
// scale-x-[-1] du <video>), donc la photo réellement envoyée au backend était
// inversée par rapport à ce que l'utilisateur voyait à l'écran. La version
// non-compacte le faisait déjà correctement (ctx.translate + ctx.scale) - on
// applique maintenant cette correction partout.
// ==========================================================================

export default function FaceScanner({ onScanSuccess, onCancel, compact = false }) {
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
        video: { width: 1280, height: 720, facingMode: 'user' },
      });
      setStream(mediaStream);
      setCameraActive(true);
      setTimeout(() => {
        if (videoRef.current) videoRef.current.srcObject = mediaStream;
      }, 100);
    } catch (err) {
      console.error("Erreur accès caméra:", err);
      setScanStatus('error');
      alert("Impossible d'accéder à la caméra. Vérifiez les autorisations.");
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
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
    // Corrige l'effet miroir pour que la photo capturée corresponde à ce que
    // l'utilisateur voit réellement à l'écran.
    ctx.translate(canvas.width, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    const imageDataBase64 = canvas.toDataURL('image/jpeg');
    setCapturedImage(imageDataBase64);
    stopCamera();

    setTimeout(() => {
      setScanStatus('success');
      onScanSuccess && onScanSuccess(imageDataBase64);
    }, compact ? 1500 : 800);
  };

  const handleBack = () => {
    stopCamera();
    onCancel && onCancel();
  };

  return (
    <div className={compact
      ? "w-full flex flex-col space-y-2 pt-2"
      : "w-full max-w-[360px] flex flex-col items-center space-y-4 animate-[fadeIn_0.3s_ease-out]"
    }>
      {compact && (
        <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">
          Reconnaissance faciale (MFA)
        </label>
      )}

      <div className={compact
        ? "relative w-full h-36 bg-[#0a1020] rounded-xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden"
        : "relative w-full aspect-square bg-[#0a1020] rounded-2xl border border-slate-800 flex flex-col items-center justify-center overflow-hidden group shadow-2xl"
      }>
        {scanStatus === 'scanning' && (
          <div className="absolute left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_12px_#22d3ee] animate-[bounce_2s_infinite] z-30" />
        )}

        {cameraActive && scanStatus !== 'success' ? (
          <>
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover scale-x-[-1]" />
            {!compact && (
              <div className="absolute inset-8 border border-cyan-500/30 rounded-xl pointer-events-none z-20 transition-all group-hover:border-cyan-500/50">
                <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-cyan-400" />
                <div className="absolute top-0 right-0 w-4 h-4 border-t-2 border-r-2 border-cyan-400" />
                <div className="absolute bottom-0 left-0 w-4 h-4 border-b-2 border-l-2 border-cyan-400" />
                <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-cyan-400" />
              </div>
            )}
          </>
        ) : capturedImage && scanStatus === 'success' ? (
          compact ? (
            <div className="relative w-full h-full">
              <img src={capturedImage} alt="Face" className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-emerald-950/20 backdrop-blur-[1px] flex flex-col items-center justify-center z-10">
                <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                <span className="text-[9px] font-mono font-bold text-emerald-400 uppercase mt-1">Empreinte capturée</span>
              </div>
            </div>
          ) : (
            <img src={capturedImage} alt="Visage capturé" className="w-full h-full object-cover" />
          )
        ) : (
          <div className="flex flex-col items-center text-center p-6 space-y-3 z-10">
            <div className={compact ? "" : "p-4 bg-slate-900/80 rounded-full border border-slate-800 text-slate-400"}>
              <ScanFace className={compact ? "w-5 h-5 text-slate-500" : "w-8 h-8 text-cyan-400"} />
            </div>
            <p className={compact ? "text-[10px] text-slate-400" : "text-xs text-slate-400 max-w-[200px]"}>
              {compact
                ? "Caméra requise pour validation"
                : "Système de reconnaissance biométrique RAG. Veuillez activer votre périphérique."}
            </p>
          </div>
        )}

        {scanStatus === 'scanning' && (
          <div className="absolute inset-0 bg-[#050914]/85 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-40">
            <RefreshCw className={compact ? "w-4 h-4 text-cyan-400 animate-spin" : "w-6 h-6 text-cyan-400 animate-spin"} />
            {!compact && (
              <p className="text-[10px] font-mono tracking-widest text-cyan-400 uppercase font-bold animate-pulse">
                Analyse de l'empreinte faciale...
              </p>
            )}
          </div>
        )}
      </div>

      <canvas ref={canvasRef} className="hidden" />

      <div className={compact ? "" : "w-full flex gap-2"}>
        {!compact && onCancel && (
          <button
            type="button"
            onClick={handleBack}
            className="px-4 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl flex items-center justify-center hover:text-white transition-all cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
        )}

        {!cameraActive && scanStatus !== 'success' ? (
          <button
            type="button"
            onClick={startCamera}
            className={compact
              ? "w-full bg-slate-900 border border-slate-800 text-slate-300 text-[11px] py-2 rounded-lg flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all"
              : "flex-1 bg-gradient-to-r from-blue-600 to-cyan-500 text-white text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:opacity-95 transition-all"
            }
          >
            <Camera className={compact ? "w-3.5 h-3.5 text-cyan-400" : "w-4 h-4"} />
            <span>{compact ? "Ouvrir l'objectif" : "Démarrer l'appareil"}</span>
          </button>
        ) : scanStatus === 'success' ? (
          <button
            type="button"
            onClick={startCamera}
            className={compact
              ? "w-full text-slate-400 text-[10px] py-1 flex items-center justify-center gap-1 cursor-pointer hover:text-slate-300 transition-all"
              : "flex-1 bg-slate-900 text-slate-200 border border-slate-800 text-xs font-bold py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-slate-800 transition-all"
            }
          >
            <RefreshCw className={compact ? "w-3 h-3" : "w-4 h-4"} />
            <span>{compact ? "Reprendre la photo" : "Recommencer le scan"}</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={captureAndScan}
            disabled={scanStatus === 'scanning'}
            className={compact
              ? "w-full bg-cyan-500 text-[#050914] text-[11px] font-bold py-2 rounded-lg flex items-center justify-center cursor-pointer hover:bg-cyan-400 transition-all uppercase"
              : "flex-1 bg-cyan-500 text-[#050914] text-xs font-black py-3 rounded-xl flex items-center justify-center gap-2 cursor-pointer hover:bg-cyan-400 transition-all uppercase tracking-wider shadow-lg shadow-cyan-500/20"
            }
          >
            <span>{compact ? "Prendre l'empreinte" : "Analyser le visage"}</span>
          </button>
        )}
      </div>
    </div>
  );
}
