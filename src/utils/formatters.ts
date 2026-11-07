/**
 * Formatting and mathematical conversion utilities for GPS coordinates,
 * timestamps, map tiles, and geocoding.
 */

/**
 * Format latitude and longitude matching the GPS Map Camera style:
 * e.g. "Lat 10.690836°  Long 122.485223°"
 */
export function formatCoordinates(lat: number, lng: number, precision: number = 6): string {
  const latStr = Math.abs(lat).toFixed(precision);
  const lngStr = Math.abs(lng).toFixed(precision);
  const latPrefix = lat < 0 ? `Lat -${latStr}°` : `Lat ${latStr}°`;
  const lngPrefix = lng < 0 ? `Long -${lngStr}°` : `Long ${lngStr}°`;
  return `${latPrefix}  ${lngPrefix}`;
}

/**
 * Format Date into the exact style shown in the reference:
 * "07/24/25  10:15 AM" (MM/DD/YY  HH:MM AM/PM)
 */
export function formatDateTime(input?: Date | string | number): string {
  const date = input ? (input instanceof Date ? input : new Date(input)) : new Date();
  if (isNaN(date.getTime())) {
    return '07/24/25  10:15 AM';
  }

  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yy = String(date.getFullYear()).slice(-2);

  let hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12; // 12-hour clock
  const hh = String(hours).padStart(2, '0');

  return `${mm}/${dd}/${yy}  ${hh}:${minutes} ${ampm}`;
}

/**
 * Converts longitude to Web Mercator tile X coordinate (fractional)
 */
export function lonToTileX(lon: number, zoom: number): number {
  return ((lon + 180) / 360) * Math.pow(2, zoom);
}

/**
 * Converts latitude to Web Mercator tile Y coordinate (fractional)
 */
export function latToTileY(lat: number, zoom: number): number {
  const latRad = (lat * Math.PI) / 180;
  return (
    ((1 - Math.log(Math.tan(latRad) + 1 / Math.cos(latRad)) / Math.PI) / 2) *
    Math.pow(2, zoom)
  );
}

/**
 * Converts degree (0-360) to 8-point compass direction (N, NE, E, SE, S, SW, W, NW)
 */
export function degreesToCompass(deg: number): string {
  const normalized = ((deg % 360) + 360) % 360;
  const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  const index = Math.round(normalized / 45) % 8;
  return directions[index];
}

/**
 * Formats compass bearing: e.g. "142° SE"
 */
export function formatBearing(deg: number): string {
  const dir = degreesToCompass(deg);
  return `${Math.round(deg)}° ${dir}`;
}

/**
 * Parses Nominatim reverse geocode address object into clean Title and Full Address
 */
export function parseAddressHierarchy(addressObj: Record<string, string>): {
  title: string;
  address: string;
} {
  if (!addressObj) {
    return {
      title: 'Unknown Location',
      address: 'No street address available',
    };
  }

  const city =
    addressObj.city ||
    addressObj.town ||
    addressObj.municipality ||
    addressObj.village ||
    addressObj.suburb ||
    addressObj.county ||
    '';
  const state = addressObj.state || addressObj.province || addressObj.region || '';
  const country = addressObj.country || '';

  const titleParts = [city, state, country].filter(Boolean);
  const title = titleParts.length > 0 ? titleParts.join(', ') : 'Selected Location';

  const road = addressObj.road || addressObj.pedestrian || addressObj.footway || '';
  const neighbourhood = addressObj.neighbourhood || addressObj.suburb || addressObj.quarter || '';
  const postcode = addressObj.postcode || '';

  const addressParts = [
    road,
    neighbourhood,
    city,
    state,
    postcode,
    country,
  ].filter(Boolean);

  const address = addressParts.length > 0 ? addressParts.join(', ') : title;

  return { title, address };
}
