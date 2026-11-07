import React, { useState } from 'react';
import {
  MapPin,
  Search,
  Navigation,
  Calendar,
  Clock,
  Compass,
  Building,
  RefreshCw,
  Sliders,
  Check,
  AlertCircle,
} from 'lucide-react';
import { GeotagData, LocationSearchResult } from '../types';
import {
  searchLocations,
  reverseGeocode,
  getCurrentDevicePosition,
  POPULAR_LOCATIONS,
} from '../utils/geocoding';
import { formatDateTime, degreesToCompass } from '../utils/formatters';

interface LocationDetailsPanelProps {
  data: GeotagData;
  onChange: (updated: Partial<GeotagData>) => void;
  onApplyToAll?: () => void;
  onOpenMapPicker?: () => void;
  hasMultiplePhotos: boolean;
}

export const LocationDetailsPanel: React.FC<LocationDetailsPanelProps> = ({
  data,
  onChange,
  onApplyToAll,
  onOpenMapPicker,
  hasMultiplePhotos,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LocationSearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [isReverseGeocoding, setIsReverseGeocoding] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;
    setIsSearching(true);
    try {
      const results = await searchLocations(searchQuery);
      setSearchResults(results);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectLocation = (loc: LocationSearchResult) => {
    onChange({
      title: loc.title,
      address: loc.address,
      latitude: loc.lat,
      longitude: loc.lon,
    });
    setSearchResults([]);
    setSearchQuery('');
    showToast(`Updated location to ${loc.title}`);
  };

  const handleUseCurrentGPS = async () => {
    setIsLocating(true);
    setStatusMessage('Querying device GPS sensors...');
    try {
      const pos = await getCurrentDevicePosition();
      const geocoded = await reverseGeocode(pos.latitude, pos.longitude);
      onChange({
        latitude: pos.latitude,
        longitude: pos.longitude,
        title: geocoded.title,
        address: geocoded.address,
        altitude: pos.altitude,
        accuracy: pos.accuracy,
      });
      showToast('Device GPS coordinates locked and address detected!');
    } catch (err: any) {
      console.warn(err);
      setStatusMessage('GPS access unavailable. You can enter location manually or search.');
      setTimeout(() => setStatusMessage(null), 4000);
    } finally {
      setIsLocating(false);
    }
  };

  const handleManualCoordChange = async (lat: number, lng: number) => {
    onChange({ latitude: lat, longitude: lng });
    setIsReverseGeocoding(true);
    try {
      const geocoded = await reverseGeocode(lat, lng);
      onChange({
        title: geocoded.title,
        address: geocoded.address,
      });
    } catch (e) {
      console.warn(e);
    } finally {
      setIsReverseGeocoding(false);
    }
  };

  const handleSetCurrentTime = () => {
    onChange({ dateTime: formatDateTime(new Date()) });
    showToast('Updated timestamp to now');
  };

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => setStatusMessage(null), 3000);
  };

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 text-slate-800 overflow-y-auto no-scrollbar">
      {/* Panel Title without subtitles */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-teal-50 text-teal-700 border border-teal-200">
            <MapPin className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Location Details</h2>
        </div>

        {hasMultiplePhotos && onApplyToAll && (
          <button
            onClick={onApplyToAll}
            className="text-xs px-2.5 py-1 rounded-md bg-teal-50 hover:bg-teal-100 text-teal-700 border border-teal-200 transition font-medium"
            title="Copy this location and timestamp to all uploaded photos"
          >
            Apply to All
          </button>
        )}
      </div>

      <div className="p-4 space-y-4">
        {/* Toast status banner */}
        {statusMessage && (
          <div className="px-3 py-2 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2 animate-fadeIn">
            <Check className="w-3.5 h-3.5 flex-shrink-0 text-emerald-600" />
            <span>{statusMessage}</span>
          </div>
        )}

        {/* 1. Location Search */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700">
              Search Location
            </span>
            <div className="flex items-center gap-2">
              {onOpenMapPicker && (
                <button
                  type="button"
                  onClick={onOpenMapPicker}
                  className="text-[11px] text-teal-600 hover:text-teal-700 flex items-center gap-1 font-medium"
                  aria-label="Open interactive map picker"
                >
                  <MapPin className="w-3 h-3" />
                  <span>Map Picker</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleUseCurrentGPS}
                disabled={isLocating}
                className="text-[11px] text-emerald-600 hover:text-emerald-700 flex items-center gap-1 font-medium disabled:opacity-50"
                aria-label="Use current GPS location from device"
              >
                <Navigation className="w-3 h-3" />
                <span>{isLocating ? 'Locating...' : 'Use My GPS'}</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="e.g. Oton, Iloilo or Manila..."
              className="w-full pl-9 pr-16 py-2 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 placeholder-slate-400 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
            />
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <button
              type="submit"
              disabled={isSearching}
              className="absolute right-1.5 top-1.5 px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-medium transition disabled:opacity-50 shadow-2xs"
            >
              {isSearching ? '...' : 'Search'}
            </button>
          </form>

          {/* Autocomplete dropdown */}
          {searchResults.length > 0 && (
            <div className="rounded-lg bg-white border border-slate-200 shadow-lg overflow-hidden divide-y divide-slate-100">
              {searchResults.map((res, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => handleSelectLocation(res)}
                  className="w-full p-2.5 text-left hover:bg-slate-50 transition flex items-start gap-2 text-xs"
                >
                  <MapPin className="w-3.5 h-3.5 text-teal-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-semibold text-slate-900">{res.title}</div>
                    <div className="text-[11px] text-slate-500 line-clamp-1">{res.address}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Popular preset quick-pick chips */}
          <div className="flex flex-wrap gap-1.5 pt-0.5">
            {POPULAR_LOCATIONS.slice(0, 4).map((preset, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => handleSelectLocation(preset)}
                className="text-[11px] px-2.5 py-1 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 transition font-medium"
              >
                {preset.title.split(',')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* 2. Structured Fields */}
        <div className="space-y-3 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
              Text Overlay
            </span>
            {isReverseGeocoding && (
              <span className="text-[10px] text-teal-600 animate-pulse flex items-center gap-1 font-medium">
                <RefreshCw className="w-2.5 h-2.5 animate-spin" />
                Syncing...
              </span>
            )}
          </div>

          {/* Title / Locality */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Title / Locality
            </label>
            <input
              type="text"
              value={data.title}
              onChange={(e) => onChange({ title: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-900 font-medium focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              placeholder="e.g. Oton, Iloilo, Philippines"
            />
          </div>

          {/* Detailed Street Address */}
          <div>
            <label className="text-[11px] font-medium text-slate-500 block mb-1">
              Street Address
            </label>
            <textarea
              rows={2}
              value={data.address}
              onChange={(e) => onChange({ address: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white resize-none transition"
              placeholder="e.g. Iloilo R-1 Road, Poblacion North, Oton, Iloilo 5020, Philippines"
            />
          </div>

          {/* Coordinates (Latitude & Longitude) */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Latitude (°)
              </label>
              <input
                type="number"
                step="0.000001"
                value={data.latitude}
                onChange={(e) =>
                  handleManualCoordChange(parseFloat(e.target.value) || 0, data.longitude)
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-500 block mb-1">
                Longitude (°)
              </label>
              <input
                type="number"
                step="0.000001"
                value={data.longitude}
                onChange={(e) =>
                  handleManualCoordChange(data.latitude, parseFloat(e.target.value) || 0)
                }
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-emerald-700 font-semibold focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-[11px] font-medium text-slate-500">
                Date & Time
              </label>
              <button
                type="button"
                onClick={handleSetCurrentTime}
                className="text-[10px] text-teal-600 hover:text-teal-700 flex items-center gap-1 font-semibold"
              >
                <Clock className="w-2.5 h-2.5" />
                <span>Now</span>
              </button>
            </div>
            <input
              type="text"
              value={data.dateTime}
              onChange={(e) => onChange({ dateTime: e.target.value })}
              className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              placeholder="07/24/25  10:15 AM"
            />
          </div>

          {/* Optional Project & Field Survey Details */}
          <div className="pt-2 border-t border-slate-200 space-y-2">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider block">
              Field Telemetry
            </span>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Altitude (m)</label>
                <input
                  type="number"
                  step="0.1"
                  value={data.altitude ?? ''}
                  onChange={(e) =>
                    onChange({
                      altitude: e.target.value ? parseFloat(e.target.value) : undefined,
                    })
                  }
                  placeholder="e.g. 18.2"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Compass Bearing (°)</label>
                <input
                  type="number"
                  min="0"
                  max="360"
                  value={data.bearing ?? ''}
                  onChange={(e) => {
                    const deg = e.target.value ? parseFloat(e.target.value) : undefined;
                    onChange({
                      bearing: deg,
                      compassDirection: deg !== undefined ? degreesToCompass(deg) : undefined,
                    });
                  }}
                  placeholder="e.g. 142 (SE)"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Weather</label>
                <input
                  type="text"
                  value={data.weather ?? ''}
                  onChange={(e) => onChange({ weather: e.target.value })}
                  placeholder="e.g. 31°C Sunny"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-500 block mb-1">Inspector</label>
                <input
                  type="text"
                  value={data.inspectorName ?? ''}
                  onChange={(e) => onChange({ inspectorName: e.target.value })}
                  placeholder="e.g. Engr. N. Sabanao"
                  className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
                />
              </div>
            </div>

            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Project Name</label>
              <input
                type="text"
                value={data.projectName ?? ''}
                onChange={(e) => onChange({ projectName: e.target.value })}
                placeholder="e.g. DepEd School Building Inspection"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>

            <div>
              <label className="text-[11px] text-slate-500 block mb-1">Note / Remarks</label>
              <input
                type="text"
                value={data.notes ?? ''}
                onChange={(e) => onChange({ notes: e.target.value })}
                placeholder="e.g. Station 12+450 pouring inspected"
                className="w-full px-3 py-1.5 rounded-lg bg-slate-50 border border-slate-200 text-xs text-slate-800 focus:outline-none focus:border-emerald-500 focus:bg-white transition"
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
