import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, AlertCircle, Loader2 } from 'lucide-react';

interface CameraCaptureModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (file: File) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async () => {
    stopCamera();
    setCameraError(null);
    setIsStarting(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera API is not supported in this browser.');
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: facingMode,
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (err: any) {
      console.warn('Camera error:', err);
      setCameraError(
        err.name === 'NotAllowedError'
          ? 'Camera access denied. Please allow camera permissions in your browser settings.'
          : err.name === 'NotFoundError'
          ? 'No camera was found. Please connect a camera and try again.'
          : 'Unable to access camera. Please allow camera permissions or upload a file.'
      );
    } finally {
      setIsStarting(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
  };

  const handleTakePhoto = () => {
    if (!videoRef.current) return;
    const video = videoRef.current;

    // Wait for video to be ready before capturing
    if (video.readyState < 2) {
      setCameraError('Camera is still starting. Please wait a moment.');
      return;
    }

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 1280;
    canvas.height = video.videoHeight || 720;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCameraError('Failed to initialize canvas for photo capture.');
      return;
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `photo_${Date.now()}.jpg`, {
          type: 'image/jpeg',
        });
        onCapture(file);
        onClose();
      },
      'image/jpeg',
      0.95
    );
  };

  const toggleCameraFacing = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Camera className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Device Camera</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close camera modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Video Viewport */}
        <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
          {cameraError ? (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
              <AlertCircle className="w-8 h-8 text-amber-400" />
              <p className="text-xs">{cameraError}</p>
              <button
                onClick={() => {
                  setCameraError(null);
                  startCamera();
                }}
                className="mt-2 text-xs text-emerald-600 hover:text-emerald-800 underline"
              >
                Try again
              </button>
            </div>
          ) : isStarting ? (
            <div className="p-6 text-center text-slate-400 flex flex-col items-center gap-2">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-400" />
              <p className="text-xs">Starting camera...</p>
            </div>
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              className="w-full h-full object-cover"
            />
          )}

          {/* Crosshair guide overlay */}
          {!cameraError && !isStarting && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="w-16 h-16 border border-white/30 rounded-lg flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full animate-ping opacity-60" />
              </div>
            </div>
          )}
        </div>

        {/* Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
          <button
            type="button"
            onClick={toggleCameraFacing}
            className="p-2.5 rounded-full bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 shadow-2xs transition"
            title="Switch front/back camera"
            aria-label="Switch camera"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={!!cameraError}
            className="w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white flex items-center justify-center shadow-md shadow-emerald-600/30 transition disabled:opacity-40"
            title="Snap photo"
            aria-label="Capture photo"
          >
            <div className="w-11 h-11 rounded-full border-2 border-white flex items-center justify-center">
              <Camera className="w-5 h-5 fill-current" />
            </div>
          </button>

          <div className="w-10" />
        </div>
      </div>
    </div>
  );
};
