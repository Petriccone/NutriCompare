import React, { useRef, useState, useEffect } from 'react';
import { Camera, RefreshCw, Check, Image as ImageIcon, Upload, AlertTriangle, Scan } from 'lucide-react';
import { ImageFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface CameraCaptureProps {
  onCapture: (image: ImageFile) => void;
  label: string;
  step?: string;
}

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label, step }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    startCamera();
    return () => stopCamera();
  }, []);

  // Ensure stream is attached to video element when it mounts/remounts
  useEffect(() => {
    if (stream && videoRef.current && !preview) {
      videoRef.current.srcObject = stream;
      videoRef.current.play().catch(e => console.error("Play error", e));
    }
  }, [stream, preview]);

  useEffect(() => {
    if (step) {
      setPreview(null);
    }
  }, [step]);

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
    streamRef.current = mediaStream;
  };

  const stopCamera = () => {
    const s = streamRef.current || stream;
    if (s) {
      s.getTracks().forEach(track => track.stop());
      streamRef.current = null;
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const takePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current;
      const canvas = canvasRef.current;

      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const cw = video.clientWidth;
      const ch = video.clientHeight;

      // HUD box size on screen (match tailwind w-72 h-80)
      const cbw = 288;
      const cbh = 320;

      // Object-cover math
      const scale = Math.max(cw / vw, ch / vh);
      const dw = vw * scale;
      const dh = vh * scale;
      const dx = (dw - cw) / 2;
      const dy = (dh - ch) / 2;

      // Crop box on screen (centered)
      const screenX = (cw - cbw) / 2;
      const screenY = (ch - cbh) / 2;

      // Map to video pixels
      const videoX = (screenX + dx) / scale;
      const videoY = (screenY + dy) / scale;
      const videoW = cbw / scale;
      const videoH = cbh / scale;

      // Set canvas to 2x size for better quality
      canvas.width = cbw * 2;
      canvas.height = cbh * 2;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.filter = 'contrast(1.1) brightness(1.05) saturate(1.1)';
        ctx.drawImage(
          video,
          videoX, videoY, videoW, videoH, // Source
          0, 0, canvas.width, canvas.height // Destination
        );

        const dataUrl = canvas.toDataURL('image/jpeg', 0.95);
        setPreview(dataUrl);
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
    <div className="fixed inset-0 z-10 bg-gray-100 dark:bg-black flex flex-col pt-16 transition-colors">
      <div className="relative flex-1 bg-gray-200 dark:bg-gray-950 overflow-hidden flex flex-col items-center justify-center transition-colors">
        {error ? (
          <div className="px-6 text-center animate-fade-in">
            <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 dark:border-gray-800 transition-colors">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-mono transition-colors">FALHA NO DISPOSITIVO</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm transition-colors">{error}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors"
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
                <div className={`inline-block px-4 py-1 rounded border transition-all ${isReady ? 'bg-lime-100/80 dark:bg-lime-950/20 border-lime-500/50 dark:border-lime-500/30' : 'bg-white/80 dark:bg-black/40 border-cyan-400/50 dark:border-cyan-900/30'}`}>
                  <p className={`text-[10px] font-mono tracking-[0.2em] font-bold ${isReady ? 'text-lime-600 dark:text-lime-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
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
        <div className="h-44 bg-white dark:bg-black border-t border-gray-200 dark:border-gray-900 flex flex-col items-center justify-center px-6 transition-colors">
          {!preview ? (
            <button
              onClick={takePhoto}
              disabled={!stream}
              className="w-20 h-20 rounded-full border-4 border-gray-300 dark:border-white/10 flex items-center justify-center active:scale-90 transition-all"
            >
              <div className={`w-16 h-16 rounded-full shadow-lg transition-colors ${isReady ? 'bg-lime-500 shadow-lime-500/50 dark:shadow-lime-500/20' : 'bg-gray-200 dark:bg-white'}`}></div>
            </button>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button onClick={retakePhoto} className="flex-1 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-white font-mono text-xs border border-gray-200 dark:border-gray-800 transition-colors">
                REPETIR
              </button>
              <button onClick={confirmPhoto} className="flex-1 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 dark:bg-cyan-600 dark:hover:bg-cyan-700 text-white font-mono text-xs font-bold border border-cyan-400 dark:border-cyan-500 transition-colors">
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