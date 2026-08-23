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
  let url = `${baseUrl}/api/buses`;
  if (userLat !== undefined && userLng !== undefined) {
    url += `?user_lat=${userLat}&user_lng=${userLng}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const list: BusItem[] = data.buses || (Array.isArray(data) ? data : []);

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
  } catch (error) {
    console.warn('Failed to fetch buses live, using cached data:', error);
    try {
      const cached = localStorage.getItem('byahero_cached_live_buses');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }
}

export async function fetchBusStops(): Promise<BusStopItem[]> {
  const baseUrl = await getServerUrl();
  try {
    const res = await fetch(`${baseUrl}/api/buses/stops`, {
      method: 'GET',
      credentials: 'include',
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const data = await res.json();
    const list: BusStopItem[] = data.stops || (Array.isArray(data) ? data : []);
    localStorage.setItem('byahero_cached_bus_stops', JSON.stringify(list));
    return list;
  } catch (error) {
    console.warn('Failed to fetch bus stops live, using cached data:', error);
    try {
      const cached = localStorage.getItem('byahero_cached_bus_stops');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  }
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
