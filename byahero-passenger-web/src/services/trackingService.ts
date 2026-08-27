import { getServerUrl } from './authService';
import { resolveBusLocationName } from '../utils/locationUtils';

export interface BusItem {
  Bus_ID?: number;
  bus_id?: number;
  id?: number;
  code: string;
  plate_number?: string;
  route: string;
  status: 'available' | 'on_stop' | 'full' | 'unavailable' | string;
  seats_available: number;
  seats_total: number;
  seat_availability?: number;
  total_seats?: number;
  progress?: number;
  lat: number | string;
  lng: number | string;
  latitude?: number | string;
  longitude?: number | string;
  speed?: number;
  current_location_name?: string;
  conductor_name?: string;
  driver_name?: string;
  updated_at?: string;
  _distKm?: number;
}

export interface BusStopItem {
  id: number;
  name: string;
  location_name?: string;
  location_landmark?: string;
  route: string;
  type?: string;
  lat: number | string;
  lng: number | string;
  latitude?: number | string;
  longitude?: number | string;
  sort_order?: number;
  fare?: number;
  _distance?: number;
}

export interface CircleMember {
  id: number;
  name: string;
  email: string;
  phone?: string;
  contacts?: string;
  profile_picture?: string;
  latitude: number | string;
  longitude: number | string;
  last_active?: string;
  battery?: number;
  is_online?: boolean;
  waiting_status?: boolean;
  waiting_location?: string;
  ride_status?: string;
  boarded_bus_code?: string;
}

export async function fetchLiveBuses(userLat?: number, userLng?: number): Promise<BusItem[]> {
  const baseUrl = await getServerUrl();
  let list: BusItem[] = [];
  let isSuccess = false;

  let url = `${baseUrl}/api/buses`;
  if (userLat !== undefined && userLng !== undefined) {
    url += `?user_lat=${userLat}&user_lng=${userLng}`;
  }

  // 1. Try primary configured url
  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      list = data.buses || (Array.isArray(data) ? data : []);
      isSuccess = true;
    }
  } catch (err) {
    console.warn(`Failed to fetch buses from primary server URL: ${baseUrl}`, err);
  }

  // 2. Try alwaysdata.net production failover if primary failed
  if (!isSuccess && baseUrl !== 'https://byahero.alwaysdata.net') {
    let fallbackUrl = `https://byahero.alwaysdata.net/api/buses`;
    if (userLat !== undefined && userLng !== undefined) {
      fallbackUrl += `?user_lat=${userLat}&user_lng=${userLng}`;
    }
    try {
      const res = await fetch(fallbackUrl, {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        list = data.buses || (Array.isArray(data) ? data : []);
        isSuccess = true;
      }
    } catch (fallbackErr) {
      console.error('Fallback fetch buses to alwaysdata failed:', fallbackErr);
    }
  }

  if (isSuccess) {
    // Resolve location names if missing
    list.forEach((b) => {
      const bLat = typeof b.lat === 'number' ? b.lat : parseFloat((b.lat || b.latitude || 0) as string);
      const bLng = typeof b.lng === 'number' ? b.lng : parseFloat((b.lng || b.longitude || 0) as string);
      if (!b.current_location_name && !isNaN(bLat) && !isNaN(bLng)) {
        b.current_location_name = resolveBusLocationName(bLat, bLng);
      }
    });

    localStorage.setItem('byahero_cached_live_buses', JSON.stringify(list));
    return list;
  }

  // 3. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem('byahero_cached_live_buses');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed)) {
        return parsed;
      }
    }
  } catch (e) {}

  return [];
}

export async function fetchBusStops(): Promise<BusStopItem[]> {
  const baseUrl = await getServerUrl();
  let list: BusStopItem[] = [];
  let isSuccess = false;

  // 1. Try configured serverUrl
  try {
    const res = await fetch(`${baseUrl}/api/buses/stops`, {
      method: 'GET',
      credentials: 'include',
    });
    if (res.ok) {
      const data = await res.json();
      list = data.stops || (Array.isArray(data) ? data : []);
      if (list.length > 0) {
        isSuccess = true;
      }
    }
  } catch (err) {
    console.warn(`Failed to fetch stops from primary server URL: ${baseUrl}`, err);
  }

  // 2. Try alwaysdata.net production url failover if primary failed
  if (!isSuccess && baseUrl !== 'https://byahero.alwaysdata.net') {
    try {
      const res = await fetch('https://byahero.alwaysdata.net/api/buses/stops', {
        method: 'GET',
        credentials: 'include',
      });
      if (res.ok) {
        const data = await res.json();
        list = data.stops || (Array.isArray(data) ? data : []);
        if (list.length > 0) {
          isSuccess = true;
        }
      }
    } catch (err) {
      console.warn('Failed to fetch stops from alwaysdata backup URL', err);
    }
  }

  if (isSuccess && list.length > 0) {
    localStorage.setItem('byahero_cached_bus_stops', JSON.stringify(list));
    return list;
  }

  // 3. Fallback to localStorage cache
  try {
    const cached = localStorage.getItem('byahero_cached_bus_stops');
    if (cached) {
      const parsed = JSON.parse(cached);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (e) {}

  // 4. Fallback to default local JSON database
  try {
    const { loadBusData } = await import('./offlineCache');
    const cachedData = await loadBusData();
    if (cachedData && cachedData.pickup_points && cachedData.pickup_points.length > 0) {
      return cachedData.pickup_points;
    }
  } catch (e) {}

  return [];
}

export async function fetchGroupCircle(): Promise<CircleMember[]> {
  const baseUrl = await getServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/group/view`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    return data.friends || data.members || (Array.isArray(data) ? data : []);
  } catch (error) {
    console.warn('Failed to fetch circle members:', error);
    return [];
  }
}
