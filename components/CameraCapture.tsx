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
/** Cap the longest canvas side to limit base64 payload size. */
const MAX_CANVAS_SIDE = 1200;

export const CameraCapture: React.FC<CameraCaptureProps> = ({ onCapture, label }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const isMountedRef = useRef(true);
  /** Stores the id of the "camera ready" setTimeout so we can cancel it. */
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  /** Tracks any object URL created during file upload so it can be revoked. */
  const fileObjectUrlRef = useRef<string | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [hasStream, setHasStream] = useState(false);

  const clearReadyTimer = useCallback(() => {
    if (readyTimerRef.current !== null) {
      clearTimeout(readyTimerRef.current);
      readyTimerRef.current = null;
    }
  }, []);

  const stopCamera = useCallback(() => {
    clearReadyTimer();
    const s = streamRef.current;
    if (s) {
      s.getTracks().forEach(track => {
        try { track.stop(); } catch (_) {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    if (isMountedRef.current) {
      setHasStream(false);
    }
  }, [clearReadyTimer]);

  const startCamera = useCallback(async (retry = 0) => {
    if (!isMountedRef.current) return;
    // Cancel any pending "ready" timer from a previous start attempt
    clearReadyTimer();
    setError(null);
    setIsReady(false);

    // Small delay so previous camera release can propagate to the OS
    await new Promise(r => setTimeout(r, CAMERA_START_DELAY_MS));
    if (!isMountedRef.current) return;

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: 'environment',
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
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
        await videoRef.current.play().catch(() => {});
      }

      // Schedule "ready" state — store the timer id so it can be cancelled
      readyTimerRef.current = setTimeout(() => {
        if (isMountedRef.current) setIsReady(true);
      }, 1500);

    } catch (err: unknown) {
      if (retry < MAX_RETRIES && isMountedRef.current) {
        await new Promise(r => setTimeout(r, 600));
        return startCamera(retry + 1);
      }
      if (isMountedRef.current) {
        setError(
          "Não foi possível acessar a câmera. Toque em 'Usar Galeria' ou verifique as permissões.",
        );
      }
    }
  }, [clearReadyTimer]);

  // Mount: start camera. Unmount: cancel timers, stop stream, revoke object URLs.
  useEffect(() => {
    isMountedRef.current = true;
    startCamera();
    return () => {
      isMountedRef.current = false;
      clearReadyTimer();
      stopCamera();
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
        fileObjectUrlRef.current = null;
      }
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const takePhoto = () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (video.videoWidth === 0 || video.videoHeight === 0) return;

    // Downscale if needed to keep the base64 payload reasonable
    let w = video.videoWidth;
    let h = video.videoHeight;
    if (w > MAX_CANVAS_SIDE || h > MAX_CANVAS_SIDE) {
      const scale = MAX_CANVAS_SIDE / Math.max(w, h);
      w = Math.round(w * scale);
      h = Math.round(h * scale);
    }

    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.filter = 'contrast(1.1) brightness(1.05)';
    ctx.drawImage(video, 0, 0, w, h);

    const dataUrl = canvas.toDataURL('image/jpeg', 0.80);
    setPreview(dataUrl);
    stopCamera();
  };

  const confirmPhoto = () => {
    if (!preview) return;
    const parts = preview.split(',');
    if (parts.length < 2 || !parts[1] || parts[1].length < 100) {
      // Show error instead of silently dropping the confirmation
      setError('Foto inválida ou corrompida. Tente novamente.');
      setPreview(null);
      startCamera();
      return;
    }
    onCapture({
      id: Date.now().toString(),
      base64: parts[1],
      mimeType: 'image/jpeg',
      previewUrl: preview,
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
      if (!isMountedRef.current) return;

      // Revoke any previously created object URL before making a new one
      if (fileObjectUrlRef.current) {
        URL.revokeObjectURL(fileObjectUrlRef.current);
      }
      const previewUrl = URL.createObjectURL(file);
      fileObjectUrlRef.current = previewUrl;

      onCapture({
        id: Date.now().toString(),
        base64,
        mimeType: file.type,
        previewUrl,
      });
      /*
       * Transfer ownership of the object URL to the caller (App.tsx).
       * Clear the ref so the unmount cleanup does NOT revoke it a second time —
       * App.tsx will revoke it after extraction completes.
       */
      fileObjectUrlRef.current = null;
    } catch (_err) {
      if (isMountedRef.current) {
        setError('Não foi possível ler o arquivo. Tente novamente.');
      }
    }
  };

  /* ── Visual states (presentation only, logic untouched above) ─────────────── */
  const viewfinderBorder = isReady ? 'border-[#C6F833]' : 'border-white/90';
  const statusBg         = isReady ? 'bg-[#C6F833] text-[#000]' : 'bg-white/90 text-black';

  return (
    <div className="fixed inset-0 z-10 bg-black flex flex-col pt-14">
      <div className="relative flex-1 overflow-hidden flex flex-col items-center justify-center">

        {/* ── Error state ──────────────────────────────────────────────────── */}
        {error ? (
          <div className="px-6 text-center">
            <div className="nc-box bg-[#FFD23F] w-20 h-20 flex items-center justify-center mx-auto mb-6">
              <AlertTriangle className="w-8 h-8 text-[#000]" aria-hidden />
            </div>
            <h3 className="font-display text-2xl font-black text-white mb-3">
              CÂMERA INDISPONÍVEL
            </h3>
            <p className="text-white/70 font-mono text-sm mb-8 max-w-xs mx-auto leading-relaxed">
              {error}
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              aria-label="Usar galeria de imagens"
              className="nc-btn bg-[#C6F833] text-[#000] w-full max-w-xs py-4 flex items-center justify-center gap-2 font-mono font-bold text-sm uppercase tracking-wider"
            >
              <Upload className="w-5 h-5" aria-hidden />
              USAR GALERIA
            </button>
          </div>

        /* ── Photo preview ──────────────────────────────────────────────── */
        ) : preview ? (
          <img src={preview} alt="Preview da foto capturada" className="w-full h-full object-contain bg-black" />

        /* ── Live viewfinder ────────────────────────────────────────────── */
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
              {/* Chunky bordered viewfinder frame */}
              <div className={`relative w-72 h-80 border-[4px] transition-colors duration-500 ${viewfinderBorder}`}>
                {/* Corner accents — bold black squares */}
                <div className="absolute top-0 left-0 w-5 h-5 bg-white" />
                <div className="absolute top-0 right-0 w-5 h-5 bg-white" />
                <div className="absolute bottom-0 left-0 w-5 h-5 bg-white" />
                <div className="absolute bottom-0 right-0 w-5 h-5 bg-white" />

                {/* Scan line */}
                {!isReady && (
                  <div
                    className="absolute left-0 right-0 h-[3px] bg-[#C6F833] opacity-80"
                    style={{ animation: 'scan 2.2s ease-in-out infinite' }}
                  />
                )}

                {/* Ready indicator — lime dot */}
                {isReady && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-5 h-5 bg-[#C6F833] border-[3px] border-[#000]" />
                  </div>
                )}
              </div>

              {/* Status label — sticker tag below viewfinder */}
              <div className="mt-5">
                <div className={`border-[3px] border-[#000] px-4 py-2 font-mono font-bold text-[11px] uppercase tracking-widest shadow-[3px_3px_0_#000] ${statusBg}`}>
                  {isReady ? '✓ PRONTO PARA ESCANEAR' : label.toUpperCase()}
                </div>
              </div>
            </div>
          </>
        )}

        <canvas ref={canvasRef} className="hidden" />
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileUpload}
        />
      </div>

      {/* ── Control bar ──────────────────────────────────────────────────────── */}
      {!error && (
        <div className="h-44 bg-[#000] border-t-[3px] border-[#C6F833] flex flex-col items-center justify-center px-6 gap-4">
          {!preview ? (
            <div className="flex flex-col items-center gap-3">
              {/* BIG capture button — sinks on press */}
              <button
                onClick={takePhoto}
                disabled={!hasStream}
                aria-label="Tirar foto"
                className={[
                  'nc-btn w-24 h-24 rounded-full flex items-center justify-center',
                  'disabled:opacity-40 disabled:cursor-not-allowed',
                  isReady ? 'bg-[#C6F833]' : 'bg-white/20',
                ].join(' ')}
              >
                <div className={`w-16 h-16 rounded-full border-[3px] border-[var(--ink)] ${isReady ? 'bg-[#000]' : 'bg-white/40'}`} />
              </button>

              {/* Gallery shortcut */}
              <button
                onClick={() => fileInputRef.current?.click()}
                aria-label="Usar galeria em vez de câmera"
                className="font-mono text-[10px] font-bold text-white/60 uppercase tracking-widest border-b border-white/30 pb-0.5 hover:text-white/90 transition-colors"
              >
                Usar galeria
              </button>
            </div>
          ) : (
            <div className="flex gap-4 w-full max-w-sm">
              <button
                onClick={retakePhoto}
                aria-label="Tirar foto novamente"
                className="nc-btn flex-1 py-4 bg-white/10 text-white font-mono text-xs font-bold uppercase tracking-widest"
              >
                REPETIR
              </button>
              <button
                onClick={confirmPhoto}
                aria-label="Confirmar foto"
                className="nc-btn flex-1 py-4 bg-[#C6F833] text-[#000] font-mono text-xs font-bold uppercase tracking-widest"
              >
                CONFIRMAR
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
