import AsyncStorage from '@react-native-async-storage/async-storage';

const CACHE_KEY = 'byahero_bus_data_cache';
export const FRIENDS_CACHE_KEY = 'byahero_friends_cache';
export const INVITE_CODE_CACHE_KEY = 'byahero_cached_invite_code';
export const LIVE_BUSES_CACHE_KEY = 'byahero_live_buses_cache';

export interface CachedBusData {
  cached_at: string; // ISO 8601 string
  schedules: any[];
  fare_stops: any[];
  fare_rules: any[];
  pickup_points?: any[];
  live_buses?: any[];
}

/**
 * Saves the latest active bus locations to persistent storage.
 */
export async function saveLiveBusesCache(buses: any[]): Promise<void> {
  try {
    if (Array.isArray(buses) && buses.length > 0) {
      await AsyncStorage.setItem(LIVE_BUSES_CACHE_KEY, JSON.stringify(buses));
    }
  } catch (error) {
    console.error('Failed to save live buses to cache:', error);
  }
}

/**
 * Loads the last saved active bus locations from persistent storage.
 */
export async function loadLiveBusesCache(): Promise<any[]> {
  try {
    const raw = await AsyncStorage.getItem(LIVE_BUSES_CACHE_KEY);
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

export interface CachedFriendsData {
  cached_at: string | null;
  owner_email?: string | null;
  friends: any[];
}

/**
 * Saves bus data (schedules, stops, fares) to AsyncStorage with a timestamp.
 */
export async function saveBusData(schedules: any[], fareStops: any[], fareRules: any[], pickupPoints: any[] = []): Promise<void> {
  try {
    const data: CachedBusData = {
      cached_at: new Date().toISOString(),
      schedules,
      fare_stops: fareStops,
      fare_rules: fareRules,
      pickup_points: pickupPoints,
    };
    await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Failed to save bus data to cache:', error);
  }
}

/**
 * Loads cached bus data from AsyncStorage.
 * Returns null if no cache exists.
 */
export async function loadBusData(): Promise<CachedBusData | null> {
  let localCache: CachedBusData | null = null;
  try {
    const jsonString = await AsyncStorage.getItem(CACHE_KEY);
    if (jsonString) {
      localCache = JSON.parse(jsonString) as CachedBusData;
    }
  } catch (error) {
    console.error('Failed to load bus data from cache:', error);
  }
  
  let defaultCache: CachedBusData | null = null;
  // Load fallback bundled JSON file
  try {
    const defaultData = require('../constants/defaultBusDataSync.json');
    if (defaultData && defaultData.success) {
      defaultCache = {
        cached_at: new Date().toISOString(), // App bundled time
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
    // Merge: if local cache is missing a field, fallback to bundled data
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

/**
 * Gets the age of the cache in hours.
 * Returns -1 if no cache exists or error occurs.
 */
export async function getBusDataAgeHours(): Promise<number> {
  try {
    // Check local storage first to get true age
    const jsonString = await AsyncStorage.getItem(CACHE_KEY);
    if (jsonString) {
      const data = JSON.parse(jsonString) as CachedBusData;
      if (data && data.cached_at) {
        const cachedDate = new Date(data.cached_at);
        const now = new Date();
        const diffMs = now.getTime() - cachedDate.getTime();
        return diffMs / (1000 * 60 * 60); // Convert to hours
      }
    } else {
        // If it's using the fallback JSON, it's considered very old (or just 'offline bundled data')
        return 999;
    }
  } catch (error) {
    console.error('Failed to calculate cache age:', error);
  }
  return -1;
}

async function resolveCurrentEmail(explicitEmail?: string | null): Promise<string> {
  if (explicitEmail && explicitEmail.trim()) {
    return explicitEmail.trim().toLowerCase();
  }
  try {
    const stored = await AsyncStorage.getItem('byahero_cached_email');
    return (stored || '').trim().toLowerCase();
  } catch {
    return '';
  }
}

export async function saveFriendsData(friends: any[], ownerEmail?: string | null): Promise<string> {
  const cachedAt = new Date().toISOString();
  try {
    const normalizedOwner = await resolveCurrentEmail(ownerEmail);
    const payload: CachedFriendsData = {
      cached_at: cachedAt,
      owner_email: normalizedOwner || null,
      friends: Array.isArray(friends) ? friends : [],
    };
    await AsyncStorage.setItem(FRIENDS_CACHE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error('Failed to save friends data to cache:', error);
  }
  return cachedAt;
}

export async function loadFriendsCache(ownerEmail?: string | null): Promise<CachedFriendsData | null> {
  try {
    const jsonString = await AsyncStorage.getItem(FRIENDS_CACHE_KEY);
    if (!jsonString) return null;

    const parsed = JSON.parse(jsonString);
    const currentEmail = await resolveCurrentEmail(ownerEmail);

    // Backwards compatibility with legacy array format
    if (Array.isArray(parsed)) {
      return {
        cached_at: null,
        owner_email: currentEmail || null,
        friends: parsed,
      };
    }

    if (parsed && Array.isArray(parsed.friends)) {
      const cachedOwner = (parsed.owner_email || '').trim().toLowerCase();
      if (cachedOwner && currentEmail && cachedOwner !== currentEmail) {
        return null;
      }
      return {
        cached_at: parsed.cached_at || null,
        owner_email: parsed.owner_email || null,
        friends: parsed.friends,
      };
    }
  } catch (error) {
    console.error('Failed to load friends data from cache:', error);
  }
  return null;
}

export async function loadFriendsData(ownerEmail?: string | null): Promise<any[] | null> {
  const cached = await loadFriendsCache(ownerEmail);
  return cached ? cached.friends : null;
}

export async function saveInviteCode(inviteCode: string, ownerEmail?: string | null): Promise<void> {
  try {
    if (!inviteCode || inviteCode === '------') return;
    const normalizedOwner = await resolveCurrentEmail(ownerEmail);
    await AsyncStorage.setItem(
      INVITE_CODE_CACHE_KEY,
      JSON.stringify({
        invite_code: inviteCode,
        owner_email: normalizedOwner || null,
        cached_at: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.error('Failed to save invite code to cache:', error);
  }
}

export async function loadInviteCode(ownerEmail?: string | null): Promise<string | null> {
  try {
    const raw = await AsyncStorage.getItem(INVITE_CODE_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const currentEmail = await resolveCurrentEmail(ownerEmail);

    if (typeof parsed === 'string') {
      return parsed;
    }
    if (parsed && typeof parsed.invite_code === 'string') {
      const cachedOwner = (parsed.owner_email || '').trim().toLowerCase();
      if (cachedOwner && currentEmail && cachedOwner !== currentEmail) {
        return null;
      }
      return parsed.invite_code;
    }
  } catch (error) {
    console.error('Failed to load invite code from cache:', error);
  }
  return null;
}

export async function clearCircleCache(): Promise<void> {
  try {
    await AsyncStorage.multiRemove([
      FRIENDS_CACHE_KEY,
      INVITE_CODE_CACHE_KEY,
      'byahero_offline_friends',
    ]);
  } catch (error) {
    console.error('Failed to clear circle cache:', error);
  }
}

/**
 * Formats a given date to a relative time string. (e.g. "2 hours ago")
 */
export function formatTimeAgo(isoString: string): string {
    if (!isoString) return 'recently';
    let normalized = String(isoString).trim();
    if (!normalized.includes('Z') && !/[+-]\d{2}(:\d{2})?$/.test(normalized)) {
      normalized = normalized.replace(' ', 'T') + '+08:00';
    }
    const date = new Date(normalized);
    if (isNaN(date.getTime())) return 'recently';
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
