export interface GeotagData {
  title: string;
  address: string;
  latitude: number;
  longitude: number;
  dateTime: string;
  altitude?: number;
  accuracy?: number;
  bearing?: number; // Compass heading 0-360
  compassDirection?: string; // 'N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'
  weather?: string; // e.g. '31°C Sunny'
  projectName?: string;
  inspectorName?: string;
  organization?: string;
  notes?: string;
}

export type StampTemplate = 'classic' | 'engineering' | 'minimal' | 'full-banner';
export type StampPosition = 'bottom-left' | 'bottom-right' | 'top-left' | 'top-right' | 'bottom-center';
export type MapType = 'satellite' | 'streets' | 'hybrid';
export type BadgeTheme = 'dark' | 'light' | 'solid-black' | 'glass';

export interface StampConfig {
  template: StampTemplate;
  position: StampPosition;
  mapType: MapType;
  mapZoom: number;
  showMap: boolean;
  showTitle: boolean;
  showAddress: boolean;
  showCoordinates: boolean;
  showDateTime: boolean;
  showAltitude: boolean;
  showCompass: boolean;
  showWeather: boolean;
  showProjectName: boolean;
  showInspector: boolean;
  showNotes: boolean;
  badgeOpacity: number; // 0 to 100
  badgeTheme: BadgeTheme;
  scale: number; // 0.7 to 1.4
  dateFormat: 'MM/DD/YY hh:mm A' | 'YYYY-MM-DD HH:mm:ss' | 'DD/MM/YYYY hh:mm A';
}

export interface PhotoItem {
  id: string;
  name: string;
  file?: File;
  previewUrl: string;
  originalWidth: number;
  originalHeight: number;
  data: GeotagData;
  detectedFromExif: boolean;
  status: 'ready' | 'processing' | 'error';
  errorMessage?: string;
}

export interface LocationSearchResult {
  displayName: string;
  title: string;
  address: string;
  lat: number;
  lon: number;
}
