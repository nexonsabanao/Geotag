import React, { useEffect, useRef, useState } from 'react';
import { Download, Copy, Check, ZoomIn, ZoomOut, RotateCcw, Share2, Sparkles, Crop } from 'lucide-react';
import { PhotoItem, StampConfig } from '../types';
import { renderStampedPhoto } from '../utils/canvasStampRenderer';
import confetti from 'canvas-confetti';

interface PhotoEditorCanvasProps {
  photo: PhotoItem | null;
  config: StampConfig;
  onPreviewRendered?: (url: string) => void;
  onAddPhotos?: (files: FileList | File[]) => void;
  onOpenCrop?: () => void;
}

export const PhotoEditorCanvas: React.FC<PhotoEditorCanvasProps> = ({
  photo,
  config,
  onPreviewRendered,
  onAddPhotos,
  onOpenCrop,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isRendering, setIsRendering] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [copied, setCopied] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [superSampleSmallImages, setSuperSampleSmallImages] = useState(true);
  const [isDraggingDirectly, setIsDraggingDirectly] = useState(false);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  const isSmallPhoto = (photo?.originalWidth || 0) < 1200;

  // Load and cache image
  useEffect(() => {
    if (!photo?.previewUrl) return;

    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = photo.previewUrl;
    img.onload = () => {
      imageElementRef.current = img;
      renderCurrentView();
    };
  }, [photo?.previewUrl]);

  // Re-render when config or geotag data changes
  const renderCurrentView = async () => {
    if (!photo || !imageElementRef.current || !canvasRef.current) return;
    setIsRendering(true);

    try {
      if (typeof document !== 'undefined' && document.fonts) {
        await document.fonts.ready;
      }
      const img = imageElementRef.current;
      // High-density preview buffer:
      // When an image is small (e.g. 400px - 800px), rendering directly to a 400px canvas
      // causes browser CSS and high-DPI (Retina) screens to upscale and blur the bitmap.
      // We ensure the canvas backing buffer is rendered at a sharp baseline (at least 1280px).
      const aspect = (img.naturalWidth || 1200) / (img.naturalHeight || 900);
      const minPreviewW = 1280;
      const baseW = Math.max(img.naturalWidth || 1200, minPreviewW);
      const renderW = Math.min(baseW, 1920);
      const renderH = Math.round(renderW / aspect);

      await renderStampedPhoto(
        canvasRef.current,
        img,
        photo.data,
        config,
        renderW,
        renderH
      );

      if (onPreviewRendered) {
        onPreviewRendered(canvasRef.current.toDataURL('image/jpeg', 0.85));
      }
    } catch (e) {
      console.error('Error rendering stamped photo preview:', e);
    } finally {
      setIsRendering(false);
    }
  };

  useEffect(() => {
    if (imageElementRef.current) {
      renderCurrentView();
    }
  }, [config, photo?.data]);

  // Full-resolution export handler
  const handleDownload = async (format: 'jpg' | 'png' = 'jpg', forceOriginalSize = false) => {
    if (!photo || !imageElementRef.current) return;
    setIsExporting(true);

    try {
      const img = imageElementRef.current;
      // Offscreen canvas at FULL original resolution, with optional 2x super-sample for small photos
      const exportCanvas = document.createElement('canvas');
      let fullWidth = img.naturalWidth || 1920;
      let fullHeight = img.naturalHeight || 1080;

      if (!forceOriginalSize && superSampleSmallImages && fullWidth < 1200) {
        const factor = Math.max(2, Math.ceil(1600 / fullWidth));
        fullWidth = Math.round(fullWidth * factor);
        fullHeight = Math.round(fullHeight * factor);
      }

      await renderStampedPhoto(
        exportCanvas,
        img,
        photo.data,
        config,
        fullWidth,
        fullHeight
      );

      const mimeType = format === 'png' ? 'image/png' : 'image/jpeg';
      const dataUrl = exportCanvas.toDataURL(mimeType, 0.95);

      const link = document.createElement('a');
      const suffix = fullWidth > (img.naturalWidth || 1200) ? '_gps_stamped_2xHD' : '_gps_stamped';
      const filename = `${photo.name.replace(/\.[^/.]+$/, '')}${suffix}.${format}`;
      link.download = filename;
      link.href = dataUrl;
      link.click();

      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.8 },
      });
    } catch (err) {
      console.error('Failed to export high-res photo:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopyToClipboard = async () => {
    if (!canvasRef.current) return;
    try {
      canvasRef.current.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([
            new ClipboardItem({ 'image/png': blob }),
          ]);
          setCopied(true);
          setTimeout(() => setCopied(false), 2200);
        } catch (clipboardErr) {
          console.warn('Direct clipboard image copy not permitted in current context:', clipboardErr);
        }
      }, 'image/png');
    } catch (e) {
      console.error('Copy to clipboard failed:', e);
    }
  };

  // Local drag-and-drop on the canvas
  const handleLocalDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDirectly(true);
  };

  const handleLocalDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDirectly(false);
  };

  const handleLocalDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingDirectly(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onAddPhotos) {
      onAddPhotos(e.dataTransfer.files);
    }
  };

  if (!photo) {
    return (
      <div
        onDragOver={handleLocalDragOver}
        onDragLeave={handleLocalDragLeave}
        onDrop={handleLocalDrop}
        className="flex-1 flex flex-col items-center justify-center p-8 bg-slate-50 text-slate-500 border-2 border-dashed border-slate-300 m-4 rounded-xl"
      >
        <p className="text-sm font-medium text-slate-700">No photo loaded.</p>
        <p className="text-xs text-slate-400 mt-1">Drag and drop any photo here or use Add Photo below.</p>
      </div>
    );
  }

  return (
    <div
      onDragOver={handleLocalDragOver}
      onDragLeave={handleLocalDragLeave}
      onDrop={handleLocalDrop}
      className="flex-1 flex flex-col bg-slate-100 relative overflow-hidden select-none"
    >
      {/* Top action bar over canvas - compact and mobile friendly */}
      <div className="h-11 px-3 sm:px-4 border-b border-slate-200 bg-white/90 backdrop-blur-md flex items-center justify-between text-xs text-slate-600 z-10 gap-2 shadow-2xs">
        <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
          <span className="font-semibold text-slate-900 truncate max-w-[110px] sm:max-w-[220px]">
            {photo.name}
          </span>
          <span className="text-slate-300 hidden sm:inline">•</span>
          <span className="text-slate-500 hidden md:inline text-[11px]">
            {photo.originalWidth} × {photo.originalHeight}px
          </span>
          <span className="px-1.5 py-0.5 rounded bg-teal-50 text-teal-700 border border-teal-200 text-[9px] font-semibold uppercase tracking-wider hidden sm:inline">
            {config.template === 'classic'
              ? 'Classic'
              : config.template === 'engineering'
              ? 'Field'
              : config.template === 'full-banner'
              ? 'Ribbon'
              : 'Minimal'}
          </span>
          {isSmallPhoto && (
            <span className="px-1.5 py-0.5 rounded bg-amber-50 text-amber-700 border border-amber-200 text-[9px] font-medium hidden lg:inline">
              Anti-Blur
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 sm:gap-1.5 flex-shrink-0">
          {/* Zoom controls - hidden on small mobile to keep top bar super clean */}
          <div className="hidden md:flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <button
              onClick={() => setZoomLevel((z) => Math.max(0.6, z - 0.15))}
              className="p-1 hover:text-slate-900 rounded hover:bg-slate-200 text-slate-500 transition"
              title="Zoom out"
              aria-label="Zoom out"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="px-1.5 text-[10px] font-mono font-medium text-slate-700">
              {Math.round(zoomLevel * 100)}%
            </span>
            <button
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.15))}
              className="p-1 hover:text-slate-900 rounded hover:bg-slate-200 text-slate-500 transition"
              title="Zoom in"
              aria-label="Zoom in"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => setZoomLevel(1)}
              className="p-1 hover:text-slate-900 rounded hover:bg-slate-200 text-slate-500 transition border-l border-slate-200"
              title="Reset view"
              aria-label="Reset zoom to 100%"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          {/* Crop & Resize button */}
          {onOpenCrop && (
            <button
              onClick={onOpenCrop}
              className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition text-xs"
              title="Crop & Resize Photo"
              aria-label="Crop photo"
            >
              <Crop className="w-3 h-3 text-emerald-600" />
              <span className="hidden sm:inline text-[11px] font-medium">Crop</span>
            </button>
          )}

          {/* Copy button */}
          <button
            onClick={handleCopyToClipboard}
            className="flex items-center gap-1 px-2 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-2xs transition text-xs"
            title="Copy stamped image to clipboard"
            aria-label="Copy stamped image to clipboard"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span className="hidden sm:inline text-[11px] font-medium">{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Compact matching JPG and PNG buttons */}
          <button
            onClick={() => handleDownload('jpg')}
            disabled={isExporting}
            className="flex items-center justify-center px-2.5 py-1 rounded-md bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs border border-emerald-600 shadow-xs transition disabled:opacity-50"
            title="Download full resolution stamped photo (JPEG)"
            aria-label="Download JPG"
          >
            <span>{isExporting ? '...' : 'JPG'}</span>
          </button>

          <button
            onClick={() => handleDownload('png')}
            disabled={isExporting}
            className="flex items-center justify-center px-2.5 py-1 rounded-md bg-white hover:bg-slate-50 text-slate-700 font-medium text-xs border border-slate-200 shadow-2xs transition disabled:opacity-50"
            title="Download full lossless PNG"
            aria-label="Download lossless PNG"
          >
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Main Canvas view area with drag-over support */}
      <div
        ref={containerRef}
        className="flex-1 flex items-center justify-center p-2 sm:p-4 overflow-auto bg-slate-100 relative no-scrollbar"
      >
        {isDraggingDirectly && (
          <div className="absolute inset-2 z-30 rounded-xl bg-emerald-50/90 border-2 border-dashed border-emerald-500 flex flex-col items-center justify-center backdrop-blur-xs pointer-events-none animate-fadeIn">
            <span className="text-sm font-semibold text-emerald-900">Drop photo here to geotag</span>
          </div>
        )}

        {isRendering && (
          <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-full bg-white/95 border border-slate-200 text-[11px] text-slate-700 flex items-center gap-1.5 shadow-sm backdrop-blur">
            <div className="w-2 h-2 rounded-full border-2 border-emerald-500 border-t-transparent animate-spin" />
            <span>Updating stamp...</span>
          </div>
        )}

        <div
          style={{
            transform: `scale(${zoomLevel})`,
            transformOrigin: 'center center',
            transition: 'transform 0.15s ease-out',
          }}
          className="relative max-w-full max-h-full flex items-center justify-center shadow-lg rounded-lg overflow-hidden border border-slate-200/90 bg-white"
        >
          <canvas
            ref={canvasRef}
            className="max-w-full max-h-[calc(100vh-160px)] sm:max-h-[75vh] object-contain rounded-lg"
            data-testid="gps-camera-canvas"
          />
        </div>
      </div>
    </div>
  );
};
