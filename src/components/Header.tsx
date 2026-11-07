import React from 'react';
import { Camera, MapPin, Sparkles, Layers, Sliders, Image as ImageIcon, Download } from 'lucide-react';

interface HeaderProps {
  onOpenLiveCamera: () => void;
  onSelectSample: () => void;
  onOpenMapPicker: () => void;
  onExportZip?: () => void;
  isExportingZip?: boolean;
  photoCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenLiveCamera,
  onSelectSample,
  onOpenMapPicker,
  onExportZip,
  isExportingZip,
  photoCount,
}) => {
  return (
    <header className="bg-white border-b border-slate-200 text-slate-800 sticky top-0 z-30 shadow-xs">
      <div className="max-w-7xl mx-auto px-3 sm:px-6 h-13 sm:h-14 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-gradient-to-tr from-emerald-500 to-teal-500 flex items-center justify-center shadow-xs">
            <MapPin className="w-4 h-4 text-white font-bold" />
          </div>
          <h1 className="font-bold text-lg sm:text-xl tracking-tight text-slate-900">
            Geotag
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {photoCount > 1 && onExportZip && (
            <button
              onClick={onExportZip}
              disabled={isExportingZip}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 transition-colors disabled:opacity-50"
              title="Download all photos as a ZIP archive"
            >
              <Download className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">ZIP ({photoCount})</span>
            </button>
          )}

          <button
            onClick={onOpenMapPicker}
            className="flex items-center gap-1 px-2 sm:px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 transition-colors"
            title="Interactive map picker"
            aria-label="Open interactive map picker"
          >
            <MapPin className="w-3.5 h-3.5 text-teal-600" />
            <span className="hidden sm:inline">Map</span>
          </button>

          <button
            onClick={onSelectSample}
            className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-700 hover:text-slate-900 bg-slate-100/90 hover:bg-slate-200/80 border border-slate-200 transition-colors hidden lg:flex"
            title="Load sample photo"
            aria-label="Load demo photo"
          >
            <ImageIcon className="w-3.5 h-3.5 text-teal-600" />
            <span>Sample</span>
          </button>

          <button
            onClick={onOpenLiveCamera}
            className="flex items-center gap-1 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white shadow-xs transition-colors"
            title="Capture photo from device camera"
            aria-label="Open live camera"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden xs:inline">Camera</span>
          </button>
        </div>
      </div>
    </header>
  );
};
