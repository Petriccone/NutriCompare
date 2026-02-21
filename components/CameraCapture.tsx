import React, { useRef, useState, useEffect, useCallback } from 'react';
import { Upload, AlertTriangle } from 'lucide-react';
import { ImageFile } from '../types';
import { fileToBase64 } from '../utils/fileUtils';

interface CameraCaptureProps {
  onCapture: (image: ImageFile) => void;
  label: string;
}

const CAMERA_START_DELAY_MS = 400;
const MAX_RETRIES = 2;

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);

  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasStream, setHasStream] = useState(false);

  const stopCamera = useCallback(() => {
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(track => {
        try { track.stop(); } catch (_) { }
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isMountedRef.current) {
      setHasStream(false);
    }
  }, []);

  const startCamera = useCallback(async (retry = 0) => {
    if (!isMountedRef.current) return;
    setError(null);
    setIsReady(false);

    // Small delay so previous camera release has time to propagate to OS
    await new Promise(r => setTimeout(r, CAMERA_START_DELAY_MS));

    if (!isMountedRef.current) return;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);

      if (!isMountedRef.current) {
        mediaStream.getTracks().forEach(t => t.stop());
        return;
      }

      streamRef.current = mediaStream;
      setHasStream(true);

      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        await videoRef.current.play().catch(e => console.warn('Play error:', e));
      }

      setTimeout(() => {
        if (isMountedRef.current) setIsReady(true);
      }, 1500);

    } catch (err: any) {
      console.warn(`Camera error (attempt ${retry + 1}):`, err?.name, err?.message);

      if (retry < MAX_RETRIES && isMountedRef.current) {
        console.log(`Retrying camera in 600ms... (attempt ${retry + 2}/${MAX_RETRIES + 1})`);
        await new Promise(r => setTimeout(r, 600));
        return startCamera(retry + 1);
      }

      if (isMountedRef.current) {
        setError("Não foi possível acessar a câmera. Toque em 'Usar Galeria' ou verifique as permissões.");
      }
    }
  }, []);

  // On mount: start camera. On unmount: cleanup.
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      stopCamera();
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      console.warn('Video not ready yet');
      return;
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.filter = 'contrast(1.1) brightness(1.05)';
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Lower quality (0.80) = much smaller base64, still great for OCR
    const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
    console.log(`📸 Photo captured: ${Math.round(dataUrl.length / 1024)}KB base64`);
    setPreview(dataUrl);
    stopCamera();
  };

  const confirmPhoto = () => {
    if (!preview) return;
    const base64 = preview.split(',')[1];
    if (!base64 || base64.length < 100) {
      console.error('base64 is empty or too short!');
      return;
    }
    console.log(`✅ Confirming photo, base64 size: ${Math.round(base64.length / 1024)}KB`);
    onCapture({
      id: Date.now().toString(),
      base64,
      mimeType: 'image/jpeg',
      previewUrl: preview
    });
  };

  const retakePhoto = () => {
    setPreview(null);
    startCamera();
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
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
      console.error('File upload error:', err);
    }
  };

  const frameColor = isReady ? 'border-lime-400' : 'border-cyan-500/50';
  const shadowColor = isReady ? 'shadow-[0_0_15px_#a3e635]' : '';

  return (
    <div className="fixed inset-0 z-10 bg-gray-100 dark:bg-black flex flex-col pt-16 transition-colors">
      <div className="relative flex-1 bg-gray-200 dark:bg-gray-950 overflow-hidden flex flex-col items-center justify-center transition-colors">

        {error ? (
          <div className="px-6 text-center">
            <div className="w-20 h-20 bg-white dark:bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-200 dark:border-gray-800">
              <AlertTriangle className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2 font-mono">CÂMERA INDISPONÍVEL</h3>
            <p className="text-gray-500 dark:text-gray-400 mb-8 max-w-xs mx-auto text-sm">{error}</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full bg-cyan-500 hover:bg-cyan-600 text-white py-4 rounded-xl flex items-center justify-center gap-2 font-bold transition-colors"
            >
              <Upload className="w-5 h-5" />
              USAR GALERIA
            </button>
          </div>

        ) : preview ? (
          <img src={preview} alt="Preview" className="w-full h-full object-contain bg-black" />

        ) : (
          <>
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />

            {/* HUD Overlay */}
            <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
              <div className={`relative w-72 h-80 transition-colors duration-500`}>
                {/* Corners */}
                <div className={`absolute top-0 left-0 w-12 h-12 border-l-4 border-t-4 rounded-tl-lg ${frameColor} ${shadowColor}`}></div>
                <div className={`absolute top-0 right-0 w-12 h-12 border-r-4 border-t-4 rounded-tr-lg ${frameColor} ${shadowColor}`}></div>
                <div className={`absolute bottom-0 left-0 w-12 h-12 border-l-4 border-b-4 rounded-bl-lg ${frameColor} ${shadowColor}`}></div>
                <div className={`absolute bottom-0 right-0 w-12 h-12 border-r-4 border-b-4 rounded-br-lg ${frameColor} ${shadowColor}`}></div>

                {/* Scanning laser */}
                <div className="absolute top-0 left-0 w-full h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-[scan_2s_ease-in-out_infinite] opacity-50"></div>

                {isReady && (
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 animate-pulse">
                    <div className="w-4 h-4 border border-lime-400/50 rounded-full flex items-center justify-center">
                      <div className="w-1 h-1 bg-lime-400 rounded-full shadow-[0_0_8px_#a3e635]"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* Status label */}
              <div className="absolute top-24 text-center">
                <div className={`inline-block px-4 py-1 rounded border transition-all ${isReady
                  ? 'bg-lime-100/80 dark:bg-lime-950/20 border-lime-500/50 dark:border-lime-500/30'
                  : 'bg-white/80 dark:bg-black/40 border-cyan-400/50 dark:border-cyan-900/30'}`}>
                  <p className={`text-[10px] font-mono tracking-[0.2em] font-bold ${isReady ? 'text-lime-600 dark:text-lime-400' : 'text-cyan-600 dark:text-cyan-400'}`}>
                    {isReady ? 'PRONTO PARA ESCANEAR' : label.toUpperCase()}
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
              disabled={!hasStream}
              className="w-20 h-20 rounded-full border-4 border-gray-300 dark:border-white/10 flex items-center justify-center active:scale-90 transition-all disabled:opacity-40"
            >
              <div className={`w-16 h-16 rounded-full shadow-lg transition-colors ${isReady ? 'bg-lime-500 shadow-lime-500/50' : 'bg-gray-300 dark:bg-gray-700'}`}></div>
            </button>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button
                onClick={retakePhoto}
                className="flex-1 py-4 rounded-xl bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-700 dark:text-white font-mono text-xs border border-gray-200 dark:border-gray-800 transition-colors"
              >
                REPETIR
              </button>
              <button
                onClick={confirmPhoto}
                className="flex-1 py-4 rounded-xl bg-cyan-500 hover:bg-cyan-600 text-white font-mono text-xs font-bold border border-cyan-400 transition-colors"
              >
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