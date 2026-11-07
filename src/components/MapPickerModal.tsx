import React, { useState } from 'react';
import { X, MapPin, Search, Check, Navigation, Layers } from 'lucide-react';
import { reverseGeocode, searchLocations, POPULAR_LOCATIONS } from '../utils/geocoding';

interface MapPickerModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentLat: number;
  currentLng: number;
  onSelectCoordinates: (lat: number, lng: number, title?: string, address?: string) => void;
}

export const MapPickerModal: React.FC<MapPickerModalProps> = ({
  isOpen,
  onClose,
  currentLat,
  currentLng,
  onSelectCoordinates,
}) => {
  const [lat, setLat] = useState(currentLat);
  const [lng, setLng] = useState(currentLng);
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [currentAddress, setCurrentAddress] = useState<string>('');

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchLocations(query);
      setSearchResults(results);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectSearchResult = (res: any) => {
    setLat(res.lat);
    setLng(res.lon);
    setCurrentAddress(`${res.title} • ${res.address}`);
    setSearchResults([]);
  };

  const handleConfirm = async () => {
    setIsReverseGeocoding(true);
    try {
      const geo = await reverseGeocode(lat, lng);
      onSelectCoordinates(lat, lng, geo.title, geo.address);
      onClose();
    } catch (e) {
      onSelectCoordinates(lat, lng);
      onClose();
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 sm:p-6 animate-fadeIn">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl overflow-hidden shadow-2xl flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-3.5 sm:p-4 border-b border-slate-200 flex items-center justify-between bg-white">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
              <MapPin className="w-4 h-4" />
            </div>
            <h3 className="font-semibold text-slate-900 text-sm">Pick GPS Location</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
            aria-label="Close map picker modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-b border-slate-200 space-y-2.5">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search address, landmark, or city..."
              className="w-full pl-9 pr-20 py-2 rounded-lg bg-white border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1.5 px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium disabled:opacity-50 transition shadow-2xs"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {searchResults.length > 0 && (
            <div className="rounded-lg bg-white border border-slate-200 shadow-md max-h-40 overflow-y-auto no-scrollbar divide-y divide-slate-100">
              {searchResults.map((r, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectSearchResult(r)}
                  className="w-full p-2.5 text-left hover:bg-slate-50 text-xs text-slate-700 flex items-start gap-2"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{r.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{r.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Quick Presets */}
          <div className="flex flex-wrap items-center gap-1.5 text-[11px]">
            <span className="text-slate-500 text-[10px] uppercase tracking-wider font-semibold mr-1">
              Popular:
            </span>
            {POPULAR_LOCATIONS.map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectSearchResult(preset)}
                className="px-2.5 py-1 rounded-md bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 text-[11px] font-medium shadow-2xs transition"
              >
                {preset.title.split(',')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* Interactive Map Visualizer / Coordinate Fine-tuning */}
        <div className="p-4 sm:p-5 space-y-3.5 bg-white flex-1 overflow-y-auto no-scrollbar">
          {/* Visual Satellite Map Pin Centerpiece */}
          <div className="relative h-56 rounded-xl overflow-hidden border border-slate-200 bg-slate-100 shadow-inner flex items-center justify-center">
            {/* Satellite Imagery Tile Backdrop */}
            <iframe
              title="Interactive OpenStreetMap preview"
              width="100%"
              height="100%"
              className="border-0 opacity-90"
              src={`https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.006}%2C${lat - 0.004}%2C${lng + 0.006}%2C${lat + 0.004}&layer=mapnik&marker=${lat}%2C${lng}`}
            />
            {/* Live Center Pin Indicator */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
              <div className="relative -mt-6">
                <div className="w-4 h-4 bg-red-600 rounded-full border-2 border-white shadow-lg animate-bounce" />
                <div className="w-2 h-1 bg-black/40 rounded-full mx-auto mt-1 blur-xs" />
              </div>
            </div>
          </div>

          {/* Coordinate Inputs */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Latitude (°)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Longitude (°)
              </label>
              <input
                type="number"
                step="0.000001"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white"
              />
            </div>
          </div>

          {currentAddress && (
            <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-xs text-emerald-900">
              <span className="font-semibold block mb-0.5">Selected:</span>
              <span className="text-emerald-800">{currentAddress}</span>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 sm:p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-200 transition"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isReverseGeocoding}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium transition disabled:opacity-50 shadow-2xs"
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isReverseGeocoding ? 'Detecting...' : 'Set Location'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
