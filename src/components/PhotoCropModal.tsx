import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Check, Crop, RotateCcw, ChevronDown } from 'lucide-react';
import { PhotoItem } from '../types';

export type AspectRatioType = 'free' | 'original' | '4:3' | '16:9' | '1:1' | '3:4' | '9:16' | '3:2' | 'custom';

interface PhotoCropModalProps {
  isOpen: boolean;
  onClose: () => void;
  photo: PhotoItem | null;
  onApplyCrop: (croppedDataUrl: string, newWidth: number, newHeight: number) => void;
}

interface NormalizedRect {
  x: number; // 0 to 1
  y: number; // 0 to 1
  w: number; // 0 to 1
  h: number; // 0 to 1
}

const PRESET_RATIOS: { id: AspectRatioType; label: string; ratio: number | null }[] = [
  { id: 'free', label: 'Free', ratio: null },
  { id: 'original', label: 'Original', ratio: 0 },
  { id: '4:3', label: '4:3 (Camera)', ratio: 4 / 3 },
  { id: '16:9', label: '16:9 (DPWH)', ratio: 16 / 9 },
  { id: '1:1', label: '1:1 (Square)', ratio: 1 },
  { id: '3:4', label: '3:4 (Portrait)', ratio: 3 / 4 },
  { id: '9:16', label: '9:16 (Phone)', ratio: 9 / 16 },
  { id: '3:2', label: '3:2 (35mm)', ratio: 3 / 2 },
];

export const PhotoCropModal: React.FC<PhotoCropModalProps> = ({
  isOpen,
  onClose,
  photo,
  onApplyCrop,
}) => {
  const [selectedRatio, setSelectedRatio] = useState<AspectRatioType>('4:3');
  const [crop, setCrop] = useState<NormalizedRect>({ x: 0, y: 0, w: 1, h: 1 });
  const [isProcessing, setIsProcessing] = useState(false);
  const [naturalDimensions, setNaturalDimensions] = useState<{ w: number; h: number }>({
    w: 1200,
    h: 900,
  });

  // User-typed dimension controls
  const [typedWidth, setTypedWidth] = useState<number>(1200);
  const [typedHeight, setTypedHeight] = useState<number>(900);
  // Whether the user has chosen an explicit target output resolution
  const [isOutputSizeLocked, setIsOutputSizeLocked] = useState<boolean>(false);

  const imageContainerRef = useRef<HTMLDivElement | null>(null);
  const imageElementRef = useRef<HTMLImageElement | null>(null);

  // Drag interaction state
  const dragRef = useRef<{
    isDragging: boolean;
    handle: string | null; // 'move' | 'nw' | 'ne' | 'se' | 'sw' | 'n' | 's' | 'e' | 'w'
    startX: number;
    startY: number;
    startCrop: NormalizedRect;
  }>({
    isDragging: false,
    handle: null,
    startX: 0,
    startY: 0,
    startCrop: { x: 0, y: 0, w: 1, h: 1 },
  });

  // Calculate default crop for a given preset ratio
  const calculateCropForRatio = useCallback(
    (ratioId: AspectRatioType, naturalW: number, naturalH: number): NormalizedRect => {
      if (ratioId === 'free' || ratioId === 'custom') {
        return { x: 0.05, y: 0.05, w: 0.9, h: 0.9 };
      }

      const imgAspect = naturalW / naturalH;
      let targetRatio: number;

      if (ratioId === 'original') {
        targetRatio = imgAspect;
      } else {
        const found = PRESET_RATIOS.find((p) => p.id === ratioId);
        targetRatio = found?.ratio || imgAspect;
      }

      let w = 1.0;
      let h = 1.0;

      if (targetRatio > imgAspect) {
        // Wider than image: fill width, reduce height
        w = 0.96;
        h = (w * imgAspect) / targetRatio;
      } else {
        // Taller than image: fill height, reduce width
        h = 0.96;
        w = (h * targetRatio) / imgAspect;
      }

      // Constrain within 0.1 to 1
      w = Math.min(1, Math.max(0.1, w));
      h = Math.min(1, Math.max(0.1, h));

      const x = Math.max(0, (1 - w) / 2);
      const y = Math.max(0, (1 - h) / 2);

      return { x, y, w, h };
    },
    []
  );

  // Update typed inputs whenever crop changes from dragging
  const syncTypedDimensionsFromCrop = useCallback(
    (newCrop: NormalizedRect, nw: number, nh: number) => {
      const calcW = Math.max(16, Math.round(newCrop.w * nw));
      const calcH = Math.max(16, Math.round(newCrop.h * nh));
      setTypedWidth(calcW);
      setTypedHeight(calcH);
    },
    []
  );

  // Initialize photo on open
  useEffect(() => {
    if (isOpen && photo) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.previewUrl;
      img.onload = () => {
        const nw = img.naturalWidth || photo.originalWidth || 1200;
        const nh = img.naturalHeight || photo.originalHeight || 900;
        setNaturalDimensions({ w: nw, h: nh });
        const initialCrop = calculateCropForRatio('4:3', nw, nh);
        setCrop(initialCrop);
        setSelectedRatio('4:3');
        setIsOutputSizeLocked(false);
        syncTypedDimensionsFromCrop(initialCrop, nw, nh);
      };
    }
  }, [isOpen, photo, calculateCropForRatio, syncTypedDimensionsFromCrop]);

  const handleSelectRatio = (ratioId: AspectRatioType) => {
    setSelectedRatio(ratioId);
    setIsOutputSizeLocked(false);
    const newCrop = calculateCropForRatio(ratioId, naturalDimensions.w, naturalDimensions.h);
    setCrop(newCrop);
    syncTypedDimensionsFromCrop(newCrop, naturalDimensions.w, naturalDimensions.h);
  };

  const handleResetCrop = () => {
    const fullCrop = { x: 0, y: 0, w: 1, h: 1 };
    setCrop(fullCrop);
    setSelectedRatio('free');
    setIsOutputSizeLocked(false);
    setTypedWidth(naturalDimensions.w);
    setTypedHeight(naturalDimensions.h);
  };

  // Adjust crop box when user manually edits Width
  const handleTypeWidth = (val: number) => {
    setIsOutputSizeLocked(true);
    setTypedWidth(val);
    setSelectedRatio('custom');
    if (val < 16) return;

    const nw = naturalDimensions.w;
    const nh = naturalDimensions.h;
    const currentH = typedHeight > 0 ? typedHeight : nh;

    // Adjust crop box on image to reflect typed aspect ratio
    const targetAspect = val / currentH;
    const imgAspect = nw / nh;
    let w = 0.96;
    let h = 0.96;

    if (targetAspect > imgAspect) {
      w = 0.96;
      h = Math.min(1, (w * imgAspect) / targetAspect);
    } else {
      h = 0.96;
      w = Math.min(1, (h * targetAspect) / imgAspect);
    }

    const x = Math.max(0, (1 - w) / 2);
    const y = Math.max(0, (1 - h) / 2);
    setCrop({ x, y, w, h });
  };

  // Adjust crop box when user manually edits Height
  const handleTypeHeight = (val: number) => {
    setIsOutputSizeLocked(true);
    setTypedHeight(val);
    setSelectedRatio('custom');
    if (val < 16) return;

    const nw = naturalDimensions.w;
    const nh = naturalDimensions.h;
    const currentW = typedWidth > 0 ? typedWidth : nw;

    const targetAspect = currentW / val;
    const imgAspect = nw / nh;
    let w = 0.96;
    let h = 0.96;

    if (targetAspect > imgAspect) {
      w = 0.96;
      h = Math.min(1, (w * imgAspect) / targetAspect);
    } else {
      h = 0.96;
      w = Math.min(1, (h * targetAspect) / imgAspect);
    }

    const x = Math.max(0, (1 - w) / 2);
    const y = Math.max(0, (1 - h) / 2);
    setCrop({ x, y, w, h });
  };

  // Quick set exact resolution shortcut
  const handleSetExactDimensions = (w: number, h: number) => {
    setIsOutputSizeLocked(true);
    setTypedWidth(w);
    setTypedHeight(h);
    setSelectedRatio('custom');

    const nw = naturalDimensions.w;
    const nh = naturalDimensions.h;
    const targetAspect = w / h;
    const imgAspect = nw / nh;

    let boxW = 1.0;
    let boxH = 1.0;

    if (targetAspect > imgAspect) {
      boxW = 0.96;
      boxH = Math.min(1, (boxW * imgAspect) / targetAspect);
    } else {
      boxH = 0.96;
      boxW = Math.min(1, (boxH * targetAspect) / imgAspect);
    }

    const x = Math.max(0, (1 - boxW) / 2);
    const y = Math.max(0, (1 - boxH) / 2);
    setCrop({ x, y, w: boxW, h: boxH });
  };

  // Pointer drag start
  const handlePointerDown = (e: React.PointerEvent, handle: string) => {
    e.preventDefault();
    e.stopPropagation();

    (e.target as HTMLElement).setPointerCapture(e.pointerId);

    dragRef.current = {
      isDragging: true,
      handle,
      startX: e.clientX,
      startY: e.clientY,
      startCrop: { ...crop },
    };
  };

  // Pointer move
  const handlePointerMove = (e: React.PointerEvent) => {
    if (!dragRef.current.isDragging || !imageContainerRef.current || !dragRef.current.handle) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return;

    const dx = (e.clientX - dragRef.current.startX) / rect.width;
    const dy = (e.clientY - dragRef.current.startY) / rect.height;
    const { startCrop, handle } = dragRef.current;
    if (!handle) return;

    let { x, y, w, h } = startCrop;

    if (handle === 'move') {
      // Reposition box smoothly without altering width/height or typed output resolution
      x = Math.max(0, Math.min(1 - w, startCrop.x + dx));
      y = Math.max(0, Math.min(1 - h, startCrop.y + dy));
      const nextCrop = { x, y, w, h };
      setCrop(nextCrop);
      return;
    }

    // Handle corner resizing
    const activePreset = PRESET_RATIOS.find((p) => p.id === selectedRatio);
    const targetRatio =
      selectedRatio === 'original'
        ? naturalDimensions.w / naturalDimensions.h
        : activePreset?.ratio ?? (selectedRatio !== 'free' && typedHeight > 0 ? typedWidth / typedHeight : null);

    const imgAspect = naturalDimensions.w / naturalDimensions.h;

    if (handle.includes('e')) {
      w = Math.max(0.1, Math.min(1 - startCrop.x, startCrop.w + dx));
    }
    if (handle.includes('s')) {
      h = Math.max(0.1, Math.min(1 - startCrop.y, startCrop.h + dy));
    }
    if (handle.includes('w')) {
      const newW = Math.max(0.1, Math.min(startCrop.x + startCrop.w, startCrop.w - dx));
      x = startCrop.x + (startCrop.w - newW);
      w = newW;
    }
    if (handle.includes('n')) {
      const newH = Math.max(0.1, Math.min(startCrop.y + startCrop.h, startCrop.h - dy));
      y = startCrop.y + (startCrop.h - newH);
      h = newH;
    }

    // Maintain aspect ratio if locked
    if (targetRatio !== null && targetRatio > 0) {
      if (handle === 'e' || handle === 'w' || handle === 'se' || handle === 'sw') {
        h = (w * imgAspect) / targetRatio;
        if (y + h > 1) {
          h = 1 - y;
          w = (h * targetRatio) / imgAspect;
        }
      } else {
        w = (h * targetRatio) / imgAspect;
        if (x + w > 1) {
          w = 1 - x;
          h = (w * imgAspect) / targetRatio;
        }
      }
    }

    // Boundary constraints
    x = Math.max(0, Math.min(1 - 0.1, x));
    y = Math.max(0, Math.min(1 - 0.1, y));
    w = Math.max(0.1, Math.min(1 - x, w));
    h = Math.max(0.1, Math.min(1 - y, h));

    const nextCrop = { x, y, w, h };
    setCrop(nextCrop);

    // Only update typed output size if user hasn't explicitly locked a target resolution
    if (!isOutputSizeLocked) {
      syncTypedDimensionsFromCrop(nextCrop, naturalDimensions.w, naturalDimensions.h);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (dragRef.current.isDragging) {
      dragRef.current.isDragging = false;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        // ignore
      }
    }
  };

  // Execute high-resolution crop on canvas with user-typed output dimensions
  const handleApply = async () => {
    if (!photo) return;
    setIsProcessing(true);

    try {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = photo.previewUrl;
      await new Promise((resolve, reject) => {
        img.onload = resolve;
        img.onerror = reject;
      });

      const nw = img.naturalWidth || naturalDimensions.w;
      const nh = img.naturalHeight || naturalDimensions.h;

      // Source rectangle on original image
      const cropX = Math.round(crop.x * nw);
      const cropY = Math.round(crop.y * nh);
      const cropW = Math.max(32, Math.round(crop.w * nw));
      const cropH = Math.max(32, Math.round(crop.h * nh));

      // Target output resolution: matches user-typed dimensions if provided, otherwise matches cropped slice
      const targetOutputW = typedWidth > 0 ? typedWidth : cropW;
      const targetOutputH = typedHeight > 0 ? typedHeight : cropH;

      const offscreen = document.createElement('canvas');
      offscreen.width = targetOutputW;
      offscreen.height = targetOutputH;

      const ctx = offscreen.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D context unavailable');

      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';

      // Draw cropped slice scaled to target resolution
      ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, targetOutputW, targetOutputH);

      const croppedDataUrl = offscreen.toDataURL('image/jpeg', 0.95);
      onApplyCrop(croppedDataUrl, targetOutputW, targetOutputH);
      onClose();
    } catch (err) {
      console.error('Failed to crop photo:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  if (!isOpen || !photo) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-3 sm:p-6 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-3 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white flex-shrink-0">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
              <Crop className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-semibold text-slate-900 text-sm">Crop & Resize</h3>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close crop modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 1. Aspect Ratio Presets */}
        <div className="px-3 sm:px-4 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto no-scrollbar flex-shrink-0">
          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mr-1 flex-shrink-0">
            Presets:
          </span>
          {PRESET_RATIOS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => handleSelectRatio(item.id)}
              className={`text-xs px-2.5 py-1 rounded-md border font-medium transition flex-shrink-0 whitespace-nowrap ${
                selectedRatio === item.id
                  ? 'bg-emerald-600 border-emerald-600 text-white shadow-2xs font-semibold'
                  : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
              }`}
            >
              {item.label}
            </button>
          ))}
          <button
            type="button"
            onClick={handleResetCrop}
            className="text-[11px] px-2 py-1 rounded-md text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 ml-auto flex items-center gap-1 transition flex-shrink-0"
            title="Reset to full photo size"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset</span>
          </button>
        </div>

        {/* 2. Interactive Cropper Canvas */}
        <div className="p-3 sm:p-5 flex-1 overflow-hidden bg-slate-900 flex items-center justify-center select-none relative">
          <div
            ref={imageContainerRef}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            className="relative max-w-full max-h-[52vh] flex items-center justify-center overflow-hidden touch-none"
            style={{
              aspectRatio: `${naturalDimensions.w} / ${naturalDimensions.h}`,
            }}
          >
            {/* Base Image */}
            <img
              ref={imageElementRef}
              src={photo.previewUrl}
              alt="Photo to crop"
              draggable={false}
              className="w-full h-full object-contain pointer-events-none"
            />

            {/* Dark Mask Top */}
            <div
              className="absolute left-0 top-0 right-0 bg-black/60 pointer-events-none"
              style={{ height: `${crop.y * 100}%` }}
            />
            {/* Dark Mask Bottom */}
            <div
              className="absolute left-0 bottom-0 right-0 bg-black/60 pointer-events-none"
              style={{ height: `${(1 - (crop.y + crop.h)) * 100}%` }}
            />
            {/* Dark Mask Left */}
            <div
              className="absolute left-0 bg-black/60 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${crop.x * 100}%`,
              }}
            />
            {/* Dark Mask Right */}
            <div
              className="absolute right-0 bg-black/60 pointer-events-none"
              style={{
                top: `${crop.y * 100}%`,
                height: `${crop.h * 100}%`,
                width: `${(1 - (crop.x + crop.w)) * 100}%`,
              }}
            />

            {/* Draggable Active Crop Box */}
            <div
              onPointerDown={(e) => handlePointerDown(e, 'move')}
              className="absolute border-2 border-white shadow-xl cursor-move group"
              style={{
                left: `${crop.x * 100}%`,
                top: `${crop.y * 100}%`,
                width: `${crop.w * 100}%`,
                height: `${crop.h * 100}%`,
              }}
            >
              {/* Rule-of-thirds grid */}
              <div className="absolute inset-0 pointer-events-none grid grid-cols-3 grid-rows-3 opacity-30">
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-r border-b border-white" />
                <div className="border-b border-white" />
                <div className="border-r border-white" />
                <div className="border-r border-white" />
                <div />
              </div>

              {/* Corner Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'nw')}
                className="absolute -top-2 -left-2 w-4 h-4 bg-white border-2 border-emerald-600 rounded-sm cursor-nw-resize shadow-md"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'ne')}
                className="absolute -top-2 -right-2 w-4 h-4 bg-white border-2 border-emerald-600 rounded-sm cursor-ne-resize shadow-md"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'se')}
                className="absolute -bottom-2 -right-2 w-4 h-4 bg-white border-2 border-emerald-600 rounded-sm cursor-se-resize shadow-md"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'sw')}
                className="absolute -bottom-2 -left-2 w-4 h-4 bg-white border-2 border-emerald-600 rounded-sm cursor-sw-resize shadow-md"
              />

              {/* Edge Handles */}
              <div
                onPointerDown={(e) => handlePointerDown(e, 'n')}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-white border border-emerald-600 rounded-sm cursor-n-resize shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 's')}
                className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-8 h-2.5 bg-white border border-emerald-600 rounded-sm cursor-s-resize shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'w')}
                className="absolute top-1/2 -left-1.5 -translate-y-1/2 w-2.5 h-8 bg-white border border-emerald-600 rounded-sm cursor-w-resize shadow-sm"
              />
              <div
                onPointerDown={(e) => handlePointerDown(e, 'e')}
                className="absolute top-1/2 -right-1.5 -translate-y-1/2 w-2.5 h-8 bg-white border border-emerald-600 rounded-sm cursor-e-resize shadow-sm"
              />

              {/* Live Dimensions Tag */}
              <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded bg-black/75 backdrop-blur-xs text-[10px] font-mono text-white pointer-events-none shadow-sm font-semibold">
                {typedWidth} × {typedHeight}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 sm:p-4 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 flex-shrink-0">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-slate-500 font-medium">Output Size:</span>

            {/* Seamless inline editable numbers - no heavy input borders, looks like clean text */}
            <div className="inline-flex items-center gap-1 font-mono font-bold text-slate-900 group bg-slate-50 hover:bg-slate-100/90 px-2 py-1 rounded-md transition outline-none focus-within:outline-none">
              <input
                type="number"
                min="32"
                value={typedWidth || ''}
                onChange={(e) => handleTypeWidth(parseInt(e.target.value) || 0)}
                onBlur={() => {
                  if (!typedWidth || typedWidth < 32) handleTypeWidth(32);
                }}
                className="w-12 sm:w-14 bg-transparent border-0 border-none p-0 text-slate-900 font-bold font-mono text-xs focus:ring-0 focus:outline-none focus-visible:outline-none outline-none ring-0 text-right [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text shadow-none"
                style={{ outline: 'none', boxShadow: 'none' }}
                title="Click number to edit width"
                aria-label="Output width"
              />
              <span className="text-slate-400 font-mono font-normal select-none">×</span>
              <input
                type="number"
                min="32"
                value={typedHeight || ''}
                onChange={(e) => handleTypeHeight(parseInt(e.target.value) || 0)}
                onBlur={() => {
                  if (!typedHeight || typedHeight < 32) handleTypeHeight(32);
                }}
                className="w-12 sm:w-14 bg-transparent border-0 border-none p-0 text-slate-900 font-bold font-mono text-xs focus:ring-0 focus:outline-none focus-visible:outline-none outline-none ring-0 text-left [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none cursor-text shadow-none"
                style={{ outline: 'none', boxShadow: 'none' }}
                title="Click number to edit height"
                aria-label="Output height"
              />

              {/* Only shows the arrow down button for presets */}
              <div
                className="relative inline-flex items-center justify-center w-5 h-5 rounded hover:bg-slate-200/80 text-slate-500 hover:text-slate-800 transition cursor-pointer ml-0.5 outline-none"
                title="Choose size preset"
              >
                <ChevronDown className="w-3.5 h-3.5 pointer-events-none" />
                <select
                  value={`${typedWidth}x${typedHeight}`}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (!val) return;
                    const [w, h] = val.split('x').map(Number);
                    if (w && h) {
                      handleSetExactDimensions(w, h);
                    }
                  }}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer outline-none focus:outline-none"
                  aria-label="Resolution presets"
                >
                  <option value="" disabled>Resolution Presets</option>
                  <option value="1920x1080">1920 × 1080 (16:9 Full HD)</option>
                  <option value="1280x720">1280 × 720 (16:9 HD)</option>
                  <option value="1200x900">1200 × 900 (4:3 Standard)</option>
                  <option value="1080x1080">1080 × 1080 (1:1 Square)</option>
                  <option value="1080x1920">1080 × 1920 (9:16 Mobile)</option>
                  <option value="1440x1080">1440 × 1080 (4:3 Hi-Res)</option>
                  <option value="1600x1200">1600 × 1200 (4:3)</option>
                  <option value="3840x2160">3840 × 2160 (16:9 4K)</option>
                  {photo && (
                    <option value={`${photo.originalWidth}x${photo.originalHeight}`}>
                      Original ({photo.originalWidth} × {photo.originalHeight})
                    </option>
                  )}
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleApply}
              disabled={isProcessing}
              className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition shadow-2xs disabled:opacity-50"
            >
              <Check className="w-3.5 h-3.5" />
              <span>{isProcessing ? 'Cropping...' : 'Apply Crop'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
