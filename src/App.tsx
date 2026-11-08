import React, { useState, useEffect, useRef } from 'react';
import { Header } from './components/Header';
import { PhotoEditorCanvas } from './components/PhotoEditorCanvas';
import { LocationDetailsPanel } from './components/LocationDetailsPanel';
import { StampConfigPanel } from './components/StampConfigPanel';
import { BatchGallery } from './components/BatchGallery';
import { CameraCaptureModal } from './components/CameraCaptureModal';
import { PhotoCropModal } from './components/PhotoCropModal';
import { PhotoItem, StampConfig, GeotagData } from './types';
import { extractExifData } from './utils/exifParser';
import { reverseGeocode } from './utils/geocoding';
import { formatDateTime } from './utils/formatters';
import {
  MapPin,
  Sliders,
  Upload,
  Camera,
} from 'lucide-react';

// Removed sample default image - app now starts empty, user adds photos via camera or upload

import { MapPickerModal } from './components/MapPickerModal';
import { exportAllPhotosZip } from './utils/batchExport';
import confetti from 'canvas-confetti';

const DEFAULT_STAMP_CONFIG: StampConfig = {
  template: 'classic',
  position: 'bottom-left',
  mapType: 'satellite',
  mapZoom: 16,
  showMap: true,
  showTitle: true,
  showAddress: true,
  showCoordinates: true,
  showDateTime: true,
  showAltitude: false,
  showCompass: false,
  showWeather: false,
  showProjectName: false,
  showInspector: false,
  showNotes: true,
  badgeOpacity: 74,
  badgeTheme: 'dark',
  scale: 1.0,
  dateFormat: 'MM/DD/YY hh:mm A',
};

// App starts with zero photos - user adds photos via camera or upload
const getInitialPhotos = (): PhotoItem[] => [];
const getInitialActivePhotoId = (): string => '';

export default function App() {
  const [photos, setPhotos] = useState<PhotoItem[]>(() => getInitialPhotos());
  const [activePhotoId, setActivePhotoId] = useState<string>(() => getInitialActivePhotoId());
  const [config, setConfig] = useState<StampConfig>(DEFAULT_STAMP_CONFIG);
  const [activeTab, setActiveTab] = useState<'location' | 'stamp'>('location');
  const [mobileTab, setMobileTab] = useState<'preview' | 'location' | 'stamp'>('preview');
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isMapPickerOpen, setIsMapPickerOpen] = useState(false);
  const [isCropOpen, setIsCropOpen] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isExportingZip, setIsExportingZip] = useState(false);
  const dragCounterRef = useRef(0);

  const [renderedPreviewUrl, setRenderedPreviewUrl] = useState<string>('');

  const activePhoto = photos.find((p) => p.id === activePhotoId) || null;

  const handleExportZip = async () => {
    if (photos.length === 0) return;
    setIsExportingZip(true);
    try {
      const blob = await exportAllPhotosZip(photos, config);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `GPS_Map_Camera_Export_${Date.now()}.zip`;
      a.click();
      URL.revokeObjectURL(url);
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    } catch (err) {
      console.error('Failed to export zip:', err);
    } finally {
      setIsExportingZip(false);
    }
  };

  // Process and add uploaded files with automatic EXIF parsing & reverse geocoding
  const handleAddPhotos = async (files: FileList | File[]) => {
    const fileList = Array.from(files);
    if (fileList.length === 0) return;

    const newPhotoItems: PhotoItem[] = [];

    for (const file of fileList) {
      if (!file.type.startsWith('image/')) continue;

      const previewUrl = URL.createObjectURL(file);
      const img = new Image();
      img.src = previewUrl;
      await new Promise((resolve) => {
        img.onload = resolve;
        img.onerror = resolve;
      });

      // Extract EXIF data
      const exif = await extractExifData(file);

      let initialGeotag: GeotagData;

      if (exif.hasGps && exif.latitude && exif.longitude) {
        // Automatically reverse geocode to get city, street address
        const geocoded = await reverseGeocode(exif.latitude, exif.longitude);
        initialGeotag = {
          title: geocoded.title,
          address: geocoded.address,
          latitude: exif.latitude,
          longitude: exif.longitude,
          dateTime: exif.dateTime || formatDateTime(file.lastModified || new Date()),
          altitude: exif.altitude,
        };
      } else {
        // Inherit current active photo location or default
        const fallback = activePhoto?.data || photos[0]?.data;
        initialGeotag = {
          ...(fallback ?? { title: '', address: '', latitude: 0, longitude: 0 }),
          dateTime: exif.dateTime || formatDateTime(file.lastModified || new Date()),
        };
      }

      newPhotoItems.push({
        id: `photo-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        file,
        previewUrl,
        originalWidth: img.naturalWidth || 1200,
        originalHeight: img.naturalHeight || 900,
        data: initialGeotag,
        detectedFromExif: exif.hasGps,
        status: 'ready',
      });
    }

    if (newPhotoItems.length > 0) {
      setPhotos((prev) => [...prev, ...newPhotoItems]);
      setActivePhotoId(newPhotoItems[0].id);
    }
  };

  const handleUpdateGeotag = (updated: Partial<GeotagData>) => {
    if (!activePhoto) return;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? {
              ...p,
              data: { ...p.data, ...updated },
            }
          : p
      )
    );
  };

  const handleApplyToAll = () => {
    if (!activePhoto) return;
    const templateData = { ...activePhoto.data };
    setPhotos((prev) =>
      prev.map((p) => ({
        ...p,
        data: {
          ...templateData,
          dateTime: p.data.dateTime, // keep individual timestamps
        },
      }))
    );
  };

  const handleDeletePhoto = (id: string) => {
    if (photos.length <= 1) return;
    const remaining = photos.filter((p) => p.id !== id);
    setPhotos(remaining);
    if (activePhotoId === id) {
      setActivePhotoId(remaining[0].id);
    }
  };

  const handleApplyCrop = (croppedDataUrl: string, newWidth: number, newHeight: number) => {
    if (!activePhoto) return;
    setPhotos((prev) =>
      prev.map((p) =>
        p.id === activePhoto.id
          ? {
              ...p,
              previewUrl: croppedDataUrl,
              originalWidth: newWidth,
              originalHeight: newHeight,
            }
          : p
      )
    );
  };

  // Drag and drop handlers with counter to prevent flickering over child nodes
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current++;
    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDraggingOver(true);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setIsDraggingOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current--;
    if (dragCounterRef.current <= 0) {
      dragCounterRef.current = 0;
      setIsDraggingOver(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    dragCounterRef.current = 0;
    setIsDraggingOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleAddPhotos(e.dataTransfer.files);
    }
  };

  return (
    <div
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="flex flex-col h-screen w-screen overflow-hidden bg-slate-50 text-slate-800 font-sans"
    >
      {/* Drag and drop overlay */}
      {isDraggingOver && (
        <div
          onDragOver={(e) => e.preventDefault()}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="fixed inset-0 z-50 bg-white/95 backdrop-blur-md border-4 border-dashed border-emerald-500 flex flex-col items-center justify-center p-6 text-center animate-fadeIn"
        >
          <div className="w-16 h-16 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3 border border-emerald-200 shadow-sm">
            <Upload className="w-8 h-8 animate-bounce" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-1">Drop Photo Here</h2>
          <p className="text-xs text-slate-500 max-w-xs">
            Auto-detects GPS coordinates and applies map stamp
          </p>
        </div>
      )}

      {/* Top Application Header */}
      <Header
        onOpenLiveCamera={() => setIsCameraOpen(true)}
        onOpenMapPicker={() => setIsMapPickerOpen(true)}
        onExportZip={handleExportZip}
        isExportingZip={isExportingZip}
        photoCount={photos.length}
      />

      {/* Workspace Body */}
      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Left/Center: Canvas Photo Preview Area */}
        <div
          className={`flex-1 flex flex-col min-w-0 h-full overflow-hidden ${
            mobileTab !== 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          <PhotoEditorCanvas
            photo={activePhoto}
            config={config}
            onPreviewRendered={setRenderedPreviewUrl}
            onAddPhotos={handleAddPhotos}
            onOpenCrop={() => setIsCropOpen(true)}
          />

          {/* Bottom Batch Photos Strip */}
          <BatchGallery
            photos={photos}
            activeId={activePhotoId}
            onSelectPhoto={setActivePhotoId}
            onDeletePhoto={handleDeletePhoto}
            onAddPhotos={handleAddPhotos}
          />
        </div>

        {/* Right Sidebar: Location & Stamp Controls */}
        <aside
          className={`w-full lg:w-96 lg:min-w-[384px] h-full border-t lg:border-t-0 lg:border-l border-slate-200 bg-white flex flex-col z-20 overflow-hidden ${
            mobileTab === 'preview' ? 'hidden lg:flex' : 'flex'
          }`}
        >
          {/* Tab Selector - hidden on phone view since bottom navigation already provides Location and Stamp tabs */}
          <div className="hidden lg:flex border-b border-slate-200 bg-slate-50/80 flex-shrink-0">
            <button
              onClick={() => {
                setActiveTab('location');
                setMobileTab('location');
              }}
              className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === 'location'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Location</span>
            </button>

            <button
              onClick={() => {
                setActiveTab('stamp');
                setMobileTab('stamp');
              }}
              className={`flex-1 py-2.5 px-3 text-xs font-semibold flex items-center justify-center gap-1.5 border-b-2 transition ${
                activeTab === 'stamp'
                  ? 'border-emerald-600 text-emerald-800 bg-white shadow-2xs'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Stamp</span>
            </button>
          </div>

          {/* Tab Content with no-scrollbar */}
          <div className="flex-1 overflow-y-auto no-scrollbar">
            {activeTab === 'location' ? (
              activePhoto && (
                <LocationDetailsPanel
                  data={activePhoto.data}
                  onChange={handleUpdateGeotag}
                  onApplyToAll={handleApplyToAll}
                  onOpenMapPicker={() => setIsMapPickerOpen(true)}
                  hasMultiplePhotos={photos.length > 1}
                />
              )
            ) : (
              <StampConfigPanel
                config={config}
                onChange={(upd) => setConfig((prev) => ({ ...prev, ...upd }))}
                onResetDefaults={() => setConfig(DEFAULT_STAMP_CONFIG)}
              />
            )}
          </div>
        </aside>
      </div>

      {/* Mobile Bottom Navigation Bar (Phone only) */}
      <nav
        aria-label="Mobile Navigation"
        className="lg:hidden flex items-center justify-around border-t border-slate-200 bg-white/95 backdrop-blur px-2 py-1.5 flex-shrink-0 z-30 shadow-xs"
      >
        <button
          onClick={() => setMobileTab('preview')}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
            mobileTab === 'preview'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Camera className="w-4 h-4" />
          <span>Photo</span>
        </button>
        <button
          onClick={() => {
            setMobileTab('location');
            setActiveTab('location');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
            mobileTab === 'location'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Location</span>
        </button>
        <button
          onClick={() => {
            setMobileTab('stamp');
            setActiveTab('stamp');
          }}
          className={`flex-1 py-1.5 flex flex-col items-center gap-0.5 rounded-lg text-[10px] font-semibold transition ${
            mobileTab === 'stamp'
              ? 'text-emerald-700 bg-emerald-50 border border-emerald-200/60 shadow-2xs'
              : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Sliders className="w-4 h-4" />
          <span>Stamp</span>
        </button>
      </nav>

      {/* Interactive Map Picker Modal */}
      {activePhoto && (
        <MapPickerModal
          isOpen={isMapPickerOpen}
          onClose={() => setIsMapPickerOpen(false)}
          currentLat={activePhoto.data.latitude}
          currentLng={activePhoto.data.longitude}
          onSelectCoordinates={(lat, lng, title, address) => {
            handleUpdateGeotag({
              latitude: lat,
              longitude: lng,
              ...(title ? { title } : {}),
              ...(address ? { address } : {}),
            });
          }}
        />
      )}

      {/* Camera Capture Modal */}
      <CameraCaptureModal
        isOpen={isCameraOpen}
        onClose={() => setIsCameraOpen(false)}
        onCapture={(file) => handleAddPhotos([file])}
      />

      {/* Photo Crop & Resize Modal */}
      <PhotoCropModal
        isOpen={isCropOpen}
        onClose={() => setIsCropOpen(false)}
        photo={activePhoto}
        onApplyCrop={handleApplyCrop}
      />
    </div>
  );
}
