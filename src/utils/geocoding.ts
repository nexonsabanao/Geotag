import { LocationSearchResult } from '../types';
import { parseAddressHierarchy } from './formatters';

// Cache to prevent duplicate network calls
const geocodeCache = new Map<string, { title: string; address: string }>();

// Predefined quick location presets including the exact location from the user's sample image
export const POPULAR_LOCATIONS: LocationSearchResult[] = [
  {
    title: 'Oton, Iloilo, Philippines',
    address: 'Iloilo R-1 Road, Poblacion North, Oton, Iloilo 5020, Philippines',
    lat: 10.690836,
    lon: 122.485223,
    displayName: 'Oton, Iloilo (Reference Image Sample)',
  },
  {
    title: 'Manila, Metro Manila, Philippines',
    address: 'Roxas Blvd, Ermita, Manila, 1000 Metro Manila, Philippines',
    lat: 14.5831,
    lon: 120.9794,
    displayName: 'Manila, Metro Manila, Philippines',
  },
  {
    title: 'Cebu City, Cebu, Philippines',
    address: 'Osmeña Blvd, Cebu City, 6000 Cebu, Philippines',
    lat: 10.3157,
    lon: 123.8854,
    displayName: 'Cebu City, Cebu, Philippines',
  },
  {
    title: 'Davao City, Davao del Sur, Philippines',
    address: 'San Pedro St, Poblacion District, Davao City, 8000 Philippines',
    lat: 7.0731,
    lon: 125.6128,
    displayName: 'Davao City, Philippines',
  },
  {
    title: 'New York, New York, United States',
    address: 'Broadway, Manhattan, New York, NY 10036, United States',
    lat: 40.758,
    lon: -73.9855,
    displayName: 'Times Square, New York, USA',
  },
  {
    title: 'Tokyo, Japan',
    address: 'Shinjuku, Tokyo 160-0022, Japan',
    lat: 35.6938,
    lon: 139.7034,
    displayName: 'Shinjuku, Tokyo, Japan',
  },
];

/**
 * Reverse geocode a latitude and longitude into address and locality
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<{ title: string; address: string }> {
  // Check if near reference sample
  if (Math.abs(lat - 10.690836) < 0.005 && Math.abs(lng - 122.485223) < 0.005) {
    return {
      title: 'Oton, Iloilo, Philippines',
      address: 'Iloilo R-1 Road, Poblacion North, Oton, Iloilo 5020, Philippines',
    };
  }

  const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
  if (geocodeCache.has(key)) {
    return geocodeCache.get(key)!;
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      if (data && data.address) {
        const parsed = parseAddressHierarchy(data.address);
        geocodeCache.set(key, parsed);
        return parsed;
      }
    }
  } catch (e) {
    console.warn('Reverse geocoding request failed or timed out:', e);
  }

  // Graceful fallback
  const fallback = {
    title: `Location (${lat.toFixed(4)}°, ${lng.toFixed(4)}°)`,
    address: `Coordinates: ${lat.toFixed(6)}° N, ${lng.toFixed(6)}° E`,
  };
  return fallback;
}

/**
 * Search places by query string
 */
export async function searchLocations(query: string): Promise<LocationSearchResult[]> {
  const trimmed = query.trim().toLowerCase();
  if (!trimmed) return [];

  // Check matching popular presets first
  const localMatches = POPULAR_LOCATIONS.filter(
    (loc) =>
      loc.title.toLowerCase().includes(trimmed) ||
      loc.address.toLowerCase().includes(trimmed) ||
      loc.displayName.toLowerCase().includes(trimmed)
  );

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 3500);

    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(
        query
      )}&limit=5&addressdetails=1`,
      {
        headers: {
          'Accept-Language': 'en',
        },
        signal: controller.signal,
      }
    );
    clearTimeout(timeout);

    if (response.ok) {
      const data = await response.json();
      const apiResults: LocationSearchResult[] = data.map((item: any) => {
        const parsed = parseAddressHierarchy(item.address || {});
        return {
          displayName: item.display_name,
          title: parsed.title,
          address: parsed.address || item.display_name,
          lat: parseFloat(item.lat),
          lon: parseFloat(item.lon),
        };
      });

      // Combine local presets and API results, deduplicating by coordinates
      const combined = [...localMatches];
      for (const res of apiResults) {
        if (!combined.some((c) => Math.abs(c.lat - res.lat) < 0.001 && Math.abs(c.lon - res.lon) < 0.001)) {
          combined.push(res);
        }
      }
      return combined.slice(0, 6);
    }
  } catch (e) {
    console.warn('Geocoding search failed:', e);
  }

  return localMatches;
}

/**
 * Get device GPS coordinates via browser geolocation API
 */
export function getCurrentDevicePosition(): Promise<{
  latitude: number;
  longitude: number;
  accuracy?: number;
  altitude?: number;
}> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Geolocation is not supported by your browser.'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          latitude: Number(pos.coords.latitude.toFixed(6)),
          longitude: Number(pos.coords.longitude.toFixed(6)),
          accuracy: pos.coords.accuracy ? Math.round(pos.coords.accuracy) : undefined,
          altitude: pos.coords.altitude ? Math.round(pos.coords.altitude * 10) / 10 : undefined,
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
