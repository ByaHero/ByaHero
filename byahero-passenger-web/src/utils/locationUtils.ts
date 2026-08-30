import routeGeoJSON from '../assets/data/laurel-talisay-tanauan.json';

// GeoJSON point-in-polygon helper
export function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

/**
 * Resolves a human-readable location name for a lat/lng by checking which
 * GeoJSON polygon the point falls inside. Returns null if outside all polygons.
 */
export function resolveBusLocationName(lat: number, lng: number): string | null {
  if (!routeGeoJSON || !Array.isArray((routeGeoJSON as any).features)) return null;
  for (const feature of (routeGeoJSON as any).features) {
    if (!feature.geometry) continue;
    if (feature.geometry.type === 'Polygon' && Array.isArray(feature.geometry.coordinates[0])) {
      if (pointInRing(lng, lat, feature.geometry.coordinates[0])) {
        return feature.properties?.['Current Location'] || null;
      }
    }
    if (feature.geometry.type === 'MultiPolygon' && Array.isArray(feature.geometry.coordinates)) {
      for (const poly of feature.geometry.coordinates) {
        if (poly?.[0] && pointInRing(lng, lat, poly[0])) {
          return feature.properties?.['Current Location'] || null;
        }
      }
    }
  }
  return null;
}

/**
 * Computes Haversine distance in km between two lat/lng coordinates.
 */
export function getHaversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Resolves a full human-readable location address for a coordinate pair (lat/lng).
 * 1. Checks GeoJSON route polygons (Laurel, Tanauan, Talisay, etc.)
 * 2. Checks nearest bus stop / terminal in database
 * 3. Uses reverse-geocoding API (BigDataCloud / Nominatim) to get real Barangay, City/Municipality, Province
 */
export async function resolveLocationAddress(lat: number, lng: number, busStops?: any[]): Promise<string> {
  // 1. Check GeoJSON polygon first
  const polygonName = resolveBusLocationName(lat, lng);
  if (polygonName) {
    return polygonName;
  }

  // 2. Check if near a registered bus stop / landmark
  if (busStops && busStops.length > 0) {
    let closestStop: any = null;
    let minDistance = Infinity;

    for (const stop of busStops) {
      const sLat = parseFloat((stop.lat || stop.latitude) as string);
      const sLng = parseFloat((stop.lng || stop.longitude) as string);
      if (!isNaN(sLat) && !isNaN(sLng)) {
        const dist = getHaversineDistanceKm(lat, lng, sLat, sLng);
        if (dist < minDistance) {
          minDistance = dist;
          closestStop = stop;
        }
      }
    }

    if (closestStop && minDistance <= 0.25) {
      const name = closestStop.name || closestStop.location_name;
      if (name) return name;
    }
  }

  // 3. Reverse Geocode via BigDataCloud (fast, client-side, CORS-enabled, no key needed)
  try {
    const res = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=en`
    );
    if (res.ok) {
      const data = await res.json();
      const locality = data.locality || data.city || '';
      const city = data.city || '';
      const province = data.principalSubdivision || '';
      
      const parts = [locality, city !== locality ? city : '', province]
        .filter(Boolean)
        .filter((item, index, self) => self.indexOf(item) === index);
      
      if (parts.length > 0) {
        return parts.join(', ');
      }
    }
  } catch (e) {}

  // 4. Fallback to OpenStreetMap Nominatim
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1`
    );
    if (res.ok) {
      const data = await res.json();
      const addr = data.address;
      if (addr) {
        const place = addr.suburb || addr.neighbourhood || addr.village || addr.town || addr.city || addr.municipality;
        const state = addr.state || addr.province || addr.region;
        const parts = [place, state].filter(Boolean);
        if (parts.length > 0) {
          return parts.join(', ');
        }
        if (data.display_name) {
          return data.display_name.split(',').slice(0, 3).join(',').trim();
        }
      }
    }
  } catch (e) {}

  return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
}

