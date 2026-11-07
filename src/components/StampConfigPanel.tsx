import React from 'react';
import {
  Sliders,
  Layers,
  Map,
  Eye,
  Type,
  Layout,
  Maximize2,
  Minimize2,
  Check,
} from 'lucide-react';
import { StampConfig, StampPosition, MapType, BadgeTheme, StampTemplate } from '../types';

interface StampConfigPanelProps {
  config: StampConfig;
  onChange: (updated: Partial<StampConfig>) => void;
  onResetDefaults: () => void;
}

export const StampConfigPanel: React.FC<StampConfigPanelProps> = ({
  config,
  onChange,
  onResetDefaults,
}) => {
  const templates: { id: StampTemplate; label: string }[] = [
    { id: 'classic', label: 'Classic GPS Camera' },
    { id: 'engineering', label: 'Field Survey & Civil' },
    { id: 'full-banner', label: 'DPWH Ribbon Banner' },
    { id: 'minimal', label: 'Minimalist Clean' },
  ];

  const positions: { id: StampPosition; label: string }[] = [
    { id: 'bottom-left', label: 'Bottom Left' },
    { id: 'bottom-right', label: 'Bottom Right' },
    { id: 'top-left', label: 'Top Left' },
    { id: 'top-right', label: 'Top Right' },
    { id: 'bottom-center', label: 'Bottom Center' },
  ];

  const mapTypes: { id: MapType; label: string }[] = [
    { id: 'satellite', label: 'Satellite' },
    { id: 'streets', label: 'Street' },
    { id: 'hybrid', label: 'Hybrid' },
  ];

  const themes: {
    id: BadgeTheme;
    label: string;
    sublabel: string;
    swatchClass: string;
    defaultOpacity: number;
  }[] = [
    {
      id: 'dark',
      label: 'Dark Frosted',
      sublabel: 'Semi-transparent',
      swatchClass: 'bg-slate-900 border-slate-700',
      defaultOpacity: 78,
    },
    {
      id: 'solid-black',
      label: 'Solid Black',
      sublabel: '100% Opaque',
      swatchClass: 'bg-black border-slate-900',
      defaultOpacity: 100,
    },
    {
      id: 'glass',
      label: 'Glass',
      sublabel: 'Frosted Glass',
      swatchClass: 'bg-gradient-to-br from-white/70 via-white/20 to-slate-900/30 border-white shadow-xs',
      defaultOpacity: 45,
    },
    {
      id: 'light',
      label: 'Light',
      sublabel: 'Clean White',
      swatchClass: 'bg-white border-slate-300',
      defaultOpacity: 95,
    },
  ];

  return (
    <div className="flex flex-col h-full bg-white border-l border-slate-200 text-slate-800 overflow-y-auto no-scrollbar">
      {/* Panel Header without subtitles */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Sliders className="w-4 h-4" />
          </div>
          <h2 className="text-sm font-semibold text-slate-900">Stamp Customizer</h2>
        </div>

        <button
          onClick={onResetDefaults}
          className="text-xs px-2.5 py-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition font-medium"
          title="Reset to default style"
        >
          Reset
        </button>
      </div>

      <div className="p-4 space-y-4">
        {/* Template Style Preset */}
        <div className="space-y-2">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layout className="w-3.5 h-3.5 text-teal-600" />
            <span>Layout Preset</span>
          </label>
          <div className="grid grid-cols-2 gap-1.5">
            {templates.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  if (tpl.id === 'engineering') {
                    onChange({
                      template: tpl.id,
                      showAltitude: true,
                      showCompass: true,
                      showProjectName: true,
                    });
                  } else if (tpl.id === 'full-banner') {
                    onChange({
                      template: tpl.id,
                      position: 'bottom-center',
                      showAltitude: true,
                    });
                  } else {
                    onChange({ template: tpl.id });
                  }
                }}
                className={`text-left p-2 rounded-lg border transition text-xs font-medium ${
                  config.template === tpl.id
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-900 shadow-2xs font-semibold'
                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span>{tpl.label}</span>
                  {config.template === tpl.id && (
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* 1. Stamp Position */}
        {config.template !== 'full-banner' && (
          <div className="space-y-2 pt-2 border-t border-slate-200">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Layout className="w-3.5 h-3.5 text-emerald-600" />
              <span>Corner Position</span>
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {positions.map((pos) => (
                <button
                  key={pos.id}
                  onClick={() => onChange({ position: pos.id })}
                  className={`text-xs px-2.5 py-1.5 rounded-lg border text-left transition ${
                    config.position === pos.id
                      ? 'bg-emerald-50 border-emerald-500 text-emerald-900 font-semibold shadow-2xs'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  {pos.label}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* 2. Map Thumbnail Settings */}
        <div className="space-y-2 pt-2 border-t border-slate-200">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
              <Map className="w-3.5 h-3.5 text-teal-600" />
              <span>Map Thumbnail</span>
            </label>
            <input
              type="checkbox"
              id="toggle-map"
              checked={config.showMap}
              onChange={(e) => onChange({ showMap: e.target.checked })}
              className="accent-emerald-600 cursor-pointer h-4 w-4 rounded"
            />
          </div>

          {config.showMap && (
            <div className="space-y-2.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
              <div>
                <label className="text-[11px] text-slate-500 block mb-1 font-medium">
                  Imagery Layer
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {mapTypes.map((mt) => (
                    <button
                      key={mt.id}
                      onClick={() => onChange({ mapType: mt.id })}
                      className={`text-[11px] py-1 px-1 rounded border text-center transition font-medium ${
                        config.mapType === mt.id
                          ? 'bg-white border-emerald-500 text-emerald-700 shadow-2xs'
                          : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      {mt.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
                  <span>Zoom Level</span>
                  <span className="font-mono text-emerald-700">{config.mapZoom}x</span>
                </div>
                <input
                  type="range"
                  min="12"
                  max="18"
                  value={config.mapZoom}
                  onChange={(e) => onChange({ mapZoom: parseInt(e.target.value) })}
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* 3. Badge Appearance */}
        <div className="space-y-2.5 pt-2 border-t border-slate-200">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-teal-600" />
            <span>Badge Appearance</span>
          </label>

          <div className="grid grid-cols-2 gap-2">
            {themes.map((th) => {
              const isSelected = config.badgeTheme === th.id;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() =>
                    onChange({
                      badgeTheme: th.id,
                      badgeOpacity: th.defaultOpacity,
                    })
                  }
                  className={`p-2 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-50/90 border-emerald-500 text-emerald-950 font-semibold shadow-2xs ring-1 ring-emerald-500/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  aria-pressed={isSelected}
                  aria-label={`${th.label} badge theme`}
                >
                  {/* Visual Swatch */}
                  <div
                    className={`w-6 h-6 rounded-md border flex-shrink-0 flex items-center justify-center transition ${th.swatchClass}`}
                  >
                    {isSelected && (
                      <Check
                        className={`w-3.5 h-3.5 stroke-[2.5] ${
                          th.id === 'light' ? 'text-slate-900' : 'text-emerald-400'
                        }`}
                      />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold leading-tight truncate text-slate-900">
                      {th.label}
                    </div>
                    <div className="text-[10px] text-slate-500 leading-tight truncate">
                      {th.sublabel}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
              <span>Opacity</span>
              <span className="font-mono text-emerald-700">{config.badgeOpacity}%</span>
            </div>
            <input
              type="range"
              min="20"
              max="100"
              value={config.badgeOpacity}
              onChange={(e) => onChange({ badgeOpacity: parseInt(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>

          <div>
            <div className="flex justify-between text-[11px] text-slate-600 mb-1 font-medium">
              <span>Stamp Scale</span>
              <span className="font-mono text-emerald-700">{Math.round(config.scale * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.7"
              max="1.4"
              step="0.05"
              value={config.scale}
              onChange={(e) => onChange({ scale: parseFloat(e.target.value) })}
              className="w-full accent-emerald-600 cursor-pointer"
            />
          </div>
        </div>

        {/* 4. Display Toggles */}
        <div className="space-y-1.5 pt-2 border-t border-slate-200">
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Display Fields</span>
          </label>

          <div className="space-y-1 text-xs">
            {[
              { id: 'showTitle', label: 'Locality Title' },
              { id: 'showAddress', label: 'Street Address' },
              { id: 'showCoordinates', label: 'Coordinates (Lat/Long)' },
              { id: 'showDateTime', label: 'Date & Time Stamp' },
              { id: 'showAltitude', label: 'Altitude & Elevation' },
              { id: 'showCompass', label: 'Compass Bearing' },
              { id: 'showWeather', label: 'Ambient Weather' },
              { id: 'showProjectName', label: 'Project Name' },
              { id: 'showInspector', label: 'Inspector' },
              { id: 'showNotes', label: 'Note / Remarks' },
            ].map((field) => (
              <label
                key={field.id}
                className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-200 hover:bg-slate-100 cursor-pointer text-slate-700 font-medium"
              >
                <span>{field.label}</span>
                <input
                  type="checkbox"
                  checked={(config as any)[field.id]}
                  onChange={(e) => onChange({ [field.id]: e.target.checked } as any)}
                  className="accent-emerald-600 cursor-pointer h-4 w-4 rounded"
                />
              </label>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
