import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, Image as ImageIcon, Upload, AlertTriangle, Scan } from 'lucide-react';
import { ImageFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface CameraCaptureProps {
  onCapture: (image: ImageFile) => void;
  label: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  const startCamera = async () => {
    setError(null);
    setIsReady(false);
    try {
      const constraints: MediaStreamConstraints = {
        video: { 
          facingMode: 'environment',
          width: { ideal: 1920 },
          height: { ideal: 1080 },
          // @ts-ignore - support for some browsers focus control
          focusMode: 'continuous'
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      handleStreamSuccess(mediaStream);
      
      // Feedback visual após um breve tempo para estabilização
      setTimeout(() => setIsReady(true), 1500);
      
    } catch (err) {
      console.warn("Camera access error:", err);
      setError("Não foi possível acessar a câmera de alta resolução. Verifique as permissões.");
    }
  };

  const handleStreamSuccess = (mediaStream: MediaStream) => {
    setStream(mediaStream);
    if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(e => console.error("Play error", e));
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      
      // Usar a resolução real do vídeo
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      
      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Pré-processamento leve para melhorar OCR: Aumentar contraste
        ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        
        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setPreview(dataUrl);
        stopCamera(); 
      }
    }
  };

  const confirmPhoto = () => {
    if (preview) {
      const base64 = preview.split(',')[1];
      onCapture({
        id: Date.now().toString(),
        base64,
        mimeType: 'image/jpeg',
        previewUrl: preview
      });
    }
  };

  const retakePhoto = () => {
    setPreview(null);
    startCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      try {
        const base64 = await fileToBase64(file);
        const previewUrl = URL.createObjectURL(file);
        onCapture({
            id: Date.now().toString(),
            base64,
            mimeType: file.type,
            previewUrl
        });
      } catch (err) {
        console.error(err);
      }
    }
  };

  const frameColor = isReady ? 'border-lime-400' : 'border-cyan-500/50';
  const shadowColor = isReady ? 'shadow-[0_0_15px_#a3e635]' : '';

  return (
    <div className="fixed inset-0 z-10 bg-black flex flex-col">
      <div className="relative flex-1 bg-gray-950 overflow-hidden flex flex-col items-center justify-center">
        {error ? (
            <div className="px-6 text-center animate-fade-in">
                <div className="w-20 h-20 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800">
                    <AlertTriangle className="w-8 h-8 text-yellow-500" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2 font-mono">FALHA NO DISPOSITIVO</h3>
                <p className="text-gray-400 mb-8 max-w-xs mx-auto text-sm">{error}</p>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-cyan-600 py-4 rounded-xl flex items-center justify-center gap-2 font-bold"
                >
                    <Upload className="w-5 h-5" />
                    USAR GALERIA
                </button>
            </div>
        ) : preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-cover" />
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            
            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                {/* Scanner Brackets */}
                <div className={`relative w-72 h-80 transition-colors duration-500 ${isReady ? 'text-lime-400' : 'text-cyan-500/50'}`}>
                    {/* Corners */}
                    <div className={`absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 rounded-tl-lg ${frameColor} ${shadowColor}`}></div>
                    <div className={`absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 rounded-tr-lg ${frameColor} ${shadowColor}`}></div>
                    <div className={`absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 rounded-bl-lg ${frameColor} ${shadowColor}`}></div>
                    <div className={`absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 rounded-br-lg ${frameColor} ${shadowColor}`}></div>
                    
                    {/* Scanning Laser Animation */}
                    <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-50"></div>
                    
                    {/* Focus UI Hint */}
                    {isReady && (
                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
                            <div className="w-4 h-4 border border-lime-400/50 rounded-full flex items-center justify-center">
                                <div className="w-1 h-1 bg-lime-400 rounded-full shadow-[0_0_8px_#a3e635]"></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Status Message */}
                <div className="absolute top-24 text-center">
                     <div className={`inline-block px-4 py-1 rounded border transition-all ${isReady ? 'bg-lime-950/20 border-lime-500/30' : 'bg-black/40 border-cyan-900/30'}`}>
                        <p className={`text-[10px] font-mono tracking-[0.2em] font-bold ${isReady ? 'text-lime-400' : 'text-cyan-400'}`}>
                            {isReady ? 'FOCO OTIMIZADO' : label.toUpperCase()}
                        </p>
                     </div>
                </div>
            </div>
          </>
        )}
        
        <canvas ref={canvasRef} className="hidden" />
        <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleFileUpload} />
      </div>

      {!error && (
          <div className="h-44 bg-black border-t border-gray-900 flex flex-col items-center justify-center px-6">
            {!preview ? (
                <button 
                    onClick={takePhoto}
                    disabled={!stream}
                    className="w-20 h-20 rounded-full border-4 border-white/10 flex items-center justify-center active:scale-90 transition-all"
                >
                    <div className={`w-16 h-16 rounded-full shadow-lg transition-colors ${isReady ? 'bg-lime-500 shadow-lime-500/20' : 'bg-white'}`}></div>
                </button>
            ) : (
                <div className="flex gap-4 w-full max-w-sm">
                    <button onClick={retakePhoto} className="flex-1 py-4 rounded-xl bg-gray-900 text-white font-mono text-xs border border-gray-800">
                        REPETIR
                    </button>
                    <button onClick={confirmPhoto} className="flex-1 py-4 rounded-xl bg-cyan-600 text-white font-mono text-xs font-bold border border-cyan-500">
                        CONFIRMAR
                    </button>
                </div>
            )}
        </div>
      )}

      <style>{`
        @keyframes scan {
            0%, 100% { transform: translateY(0); opacity: 0; }
            50% { transform: translateY(320px); opacity: 0.8; }
        }
      `}</style>
    </div>
  );
};