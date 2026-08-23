const CACHE_KEY = 'byahero_bus_data_cache';

export interface CachedBusData {
  cached_at: string; // ISO 8601 string
  schedules: any[];
  fare_stops: any[];
  fare_rules: any[];
  pickup_points?: any[];
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
  try {
    const jsonString = localStorage.getItem(CACHE_KEY);
    if (jsonString) {
      return JSON.parse(jsonString) as CachedBusData;
    }
  } catch (error) {
    console.error('Failed to load bus data from cache:', error);
  }
  return null;
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
