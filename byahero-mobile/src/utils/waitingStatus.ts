type Coordinates = { lat: number; lng: number };

export type WaitingOrigin = Coordinates & { locationName: string };

const EARTH_RADIUS_METERS = 6371000;
const CANCEL_DISTANCE_METERS = 300;
const radians = (degrees: number) => degrees * Math.PI / 180;

function validCoordinates(point: Coordinates): boolean {
  return Number.isFinite(point.lat) && Number.isFinite(point.lng);
}

function distanceMeters(a: Coordinates, b: Coordinates): number {
  const dLat = radians(b.lat - a.lat);
  const dLng = radians(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(radians(a.lat)) *
    Math.cos(radians(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_METERS * Math.asin(Math.sqrt(Math.min(1, h)));
}

function isNearRing(point: Coordinates, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i];
    const [xj, yj] = ring[j];
    if ((yi > point.lat) !== (yj > point.lat) &&
      point.lng < (xj - xi) * (point.lat - yi) / (yj - yi) + xi) {
      inside = !inside;
    }

    // Project each boundary segment around the passenger to retain the 300 m
    // allowance outside an area, rather than measuring from its centroid.
    const ax = radians(xi - point.lng) * Math.cos(radians(point.lat)) * EARTH_RADIUS_METERS;
    const ay = radians(yi - point.lat) * EARTH_RADIUS_METERS;
    const bx = radians(xj - point.lng) * Math.cos(radians(point.lat)) * EARTH_RADIUS_METERS;
    const by = radians(yj - point.lat) * EARTH_RADIUS_METERS;
    const dx = bx - ax;
    const dy = by - ay;
    const lengthSquared = dx * dx + dy * dy;
    const t = lengthSquared ? Math.max(0, Math.min(1, -(ax * dx + ay * dy) / lengthSquared)) : 0;
    if (Math.hypot(ax + t * dx, ay + t * dy) <= CANCEL_DISTANCE_METERS) return true;
  }
  return inside;
}

/** Missing or unrecognized location data must never cancel a saved request. */
export function shouldCancelWaiting(
  userLocation: Coordinates | null,
  locationName: string,
  origin: WaitingOrigin | null,
  stops: { name?: string; location_name?: string; lat?: string | number; lng?: string | number; latitude?: string | number; longitude?: string | number }[],
  features: { properties?: { [key: string]: unknown }; geometry?: { type: string; coordinates: unknown } }[],
): boolean {
  if (!userLocation || !validCoordinates(userLocation)) return false;

  // Newly registered passengers wait at their actual position, including
  // roadside pickups and names such as "Near Talisay Pickup Point".
  if (origin?.locationName === locationName && validCoordinates(origin)) {
    return distanceMeters(userLocation, origin) > CANCEL_DISTANCE_METERS;
  }

  // For a request restored from the server, a named area represents its whole
  // Polygon/MultiPolygon, not a point at the area's center.
  const rings: number[][][] = [];
  for (const feature of features) {
    if (feature.properties?.['Current Location'] !== locationName && feature.properties?.name !== locationName) continue;
    const geometry = feature.geometry;
    if (geometry?.type === 'Polygon') {
      const polygon = geometry.coordinates as number[][][];
      if (polygon[0]?.length) rings.push(polygon[0]);
    } else if (geometry?.type === 'MultiPolygon') {
      for (const polygon of geometry.coordinates as number[][][][]) {
        if (polygon[0]?.length) rings.push(polygon[0]);
      }
    }
  }
  if (rings.length) return !rings.some(ring => isNearRing(userLocation, ring));

  const matchingStops = stops
    .filter(stop => stop.name === locationName || stop.location_name === locationName)
    .map(stop => ({ lat: Number.parseFloat(String(stop.lat ?? stop.latitude)), lng: Number.parseFloat(String(stop.lng ?? stop.longitude)) }))
    .filter(validCoordinates);
  return matchingStops.length > 0 && matchingStops.every(stop => distanceMeters(userLocation, stop) > CANCEL_DISTANCE_METERS);
}
