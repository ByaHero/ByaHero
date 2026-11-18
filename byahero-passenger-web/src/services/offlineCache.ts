import defaultData from '../constants/defaultBusDataSync.json';

const CACHE_KEY = 'byahero_bus_data_cache';
const LIVE_BUSES_KEY = 'byahero_live_buses_cache';

export interface CachedBusData {
  cached_at: string; // ISO 8601 string
  schedules: any[];
  fare_stops: any[];
  fare_rules: any[];
  pickup_points?: any[];
  live_buses?: any[];
}

/**
 * Saves the latest active bus locations to localStorage.
 */
export function saveLiveBusesCache(buses: any[]): void {
  try {
    if (Array.isArray(buses) && buses.length > 0) {
      localStorage.setItem(LIVE_BUSES_KEY, JSON.stringify(buses));
    }
  } catch (error) {
    console.error('Failed to save live buses to cache:', error);
  }
}

/**
 * Loads the last saved active bus locations from localStorage.
 */
export function loadLiveBusesCache(): any[] {
  try {
    const raw = localStorage.getItem(LIVE_BUSES_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch (error) {
    console.error('Failed to load live buses from cache:', error);
  }
  return [];
}

export async function saveBusData(schedules: any[], fareStops: any[], fareRules: any[], pickupPoints: any[] = []): Promise<void> {
  try {
    const data: CachedBusData = {
      cached_at: new Date().toISOString(),
      schedules,
      fare_stops: fareStops,
      fare_rules: fareRules,
      pickup_points: pickupPoints,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save bus data to cache:', error);
  }
}

export async function loadBusData(): Promise<CachedBusData | null> {
  let localCache: CachedBusData | null = null;
  try {
    const jsonString = localStorage.getItem(CACHE_KEY);
    if (jsonString) {
      localCache = JSON.parse(jsonString) as CachedBusData;
    }
  } catch (error) {
    console.error('Failed to load bus data from cache:', error);
  }

  let defaultCache: CachedBusData | null = null;
  try {
    if (defaultData && defaultData.success) {
      defaultCache = {
        cached_at: new Date().toISOString(),
        schedules: defaultData.bus_schedule || [],
        fare_stops: defaultData.bus_stops || [],
        fare_rules: defaultData.bus_fares || [],
        pickup_points: defaultData.stops_terminal || [],
      };
    }
  } catch (e) {
    console.warn('Failed to load fallback JSON', e);
  }

  if (localCache && defaultCache) {
    return {
      cached_at: localCache.cached_at,
      schedules: (localCache.schedules && localCache.schedules.length > 0) ? localCache.schedules : defaultCache.schedules,
      fare_stops: (localCache.fare_stops && localCache.fare_stops.length > 0) ? localCache.fare_stops : defaultCache.fare_stops,
      fare_rules: (localCache.fare_rules && localCache.fare_rules.length > 0) ? localCache.fare_rules : defaultCache.fare_rules,
      pickup_points: (localCache.pickup_points && localCache.pickup_points.length > 0) ? localCache.pickup_points : defaultCache.pickup_points,
    };
  }

  return localCache || defaultCache;
}

export async function getBusDataAgeHours(): Promise<number> {
  try {
    const jsonString = localStorage.getItem(CACHE_KEY);
    if (jsonString) {
      const data = JSON.parse(jsonString) as CachedBusData;
      if (data && data.cached_at) {
        const cachedDate = new Date(data.cached_at);
        const now = new Date();
        const diffMs = now.getTime() - cachedDate.getTime();
        return diffMs / (1000 * 60 * 60);
      }
    } else {
      return 999;
    }
  } catch (error) {
    console.error('Failed to calculate cache age:', error);
  }
  return -1;
}

export function formatTimeAgo(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / (1000 * 60));
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min ago`;
  
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
}
