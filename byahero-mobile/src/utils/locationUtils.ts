import routeGeoJSON from '../../assets/data/laurel-talisay-tanauan.json';

// ── GeoJSON point-in-polygon helper ──────────────────────────────────────────
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
