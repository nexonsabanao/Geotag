import exifr from 'exifr';
import { formatDateTime } from './formatters';

export interface ExifExtractionResult {
  hasGps: boolean;
  latitude?: number;
  longitude?: number;
  dateTime?: string;
  altitude?: number;
}

/**
 * Parses EXIF metadata from a File, Blob, or URL to extract GPS coordinates and timestamp.
 */
export async function extractExifData(source: File | Blob | string): Promise<ExifExtractionResult> {
  try {
    const output = await exifr.parse(source, {
      gps: true,
      exif: true,
      tiff: true,
      pick: ['latitude', 'longitude', 'GPSLatitude', 'GPSLongitude', 'DateTimeOriginal', 'CreateDate', 'ModifyDate', 'GPSAltitude', 'altitude'],
    });

    if (!output) {
      return { hasGps: false };
    }

    const lat = typeof output.latitude === 'number' ? output.latitude : (typeof output.GPSLatitude === 'number' ? output.GPSLatitude : undefined);
    const lng = typeof output.longitude === 'number' ? output.longitude : (typeof output.GPSLongitude === 'number' ? output.GPSLongitude : undefined);
    const rawDate = output.DateTimeOriginal || output.CreateDate || output.ModifyDate;
    const formattedDate = rawDate ? formatDateTime(rawDate) : undefined;
    const alt = typeof output.GPSAltitude === 'number' ? output.GPSAltitude : (typeof output.altitude === 'number' ? output.altitude : undefined);

    if (lat !== undefined && lng !== undefined && !isNaN(lat) && !isNaN(lng)) {
      return {
        hasGps: true,
        latitude: Number(lat.toFixed(6)),
        longitude: Number(lng.toFixed(6)),
        dateTime: formattedDate || formatDateTime(),
        altitude: alt !== undefined ? Math.round(alt * 10) / 10 : undefined,
      };
    }

    return {
      hasGps: false,
      dateTime: formattedDate,
      altitude: alt !== undefined ? Math.round(alt * 10) / 10 : undefined,
    };
  } catch (err) {
    console.warn('Failed to parse EXIF metadata:', err);
    return { hasGps: false };
  }
}
