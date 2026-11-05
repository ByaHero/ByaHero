import { getServerUrl } from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';
import defaultBusesFleet from '../constants/defaultBusesFleet.json';
import defaultBusDataSync from '../constants/defaultBusDataSync.json';

export const CONDUCTOR_BUSES_CACHE_KEY = 'byahero_conductor_cached_buses';
export const CONDUCTOR_BUSES_CACHED_AT_KEY = 'byahero_conductor_buses_cached_at';
export const CONDUCTOR_LAST_SELECTED_BUS_KEY = 'byahero_conductor_last_selected_bus';
export const CONDUCTOR_HISTORY_CACHE_KEY = 'byahero_conductor_history_cache';

/**
 * Standardized Fetch helper matching HTML client's safePost logic with timeout protection.
 */
export async function safeRequest(relativeUrl, payload = null, method = 'GET', timeoutMs = 8000) {
  const baseUrl = await getServerUrl();
  
  // Resolve absolute URL
  let cleanRel = relativeUrl.replace(/^\.\.\/\.\.\/|^\.\.\//, '');
  if (cleanRel.startsWith('api.php') || cleanRel.startsWith('map_data.php') || cleanRel.startsWith('update_geo_location.php') || cleanRel.startsWith('logout.php')) {
    if (!baseUrl.includes('alwaysdata.net')) {
      cleanRel = 'public/' + cleanRel;
    }
  }
  
  const cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
  
  let url = `${baseUrl}/${cleanRel}`;
  if (method === 'GET' && cachedEmail) {
    const separator = url.includes('?') ? '&' : '?';
    url = `${url}${separator}email=${encodeURIComponent(cachedEmail)}`;
  }
  
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'ByaHeroConductor/1.0',
    'X-Requested-With': 'XMLHttpRequest'
  };

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  const options = {
    method,
    credentials: 'include',
    headers,
    signal: controller.signal
  };

  if (payload) {
    headers['Content-Type'] = 'application/json';
    if (cachedEmail && !payload.email) {
      payload.email = cachedEmail;
    }
    options.body = JSON.stringify(payload);
  }

  try {
    const response = await fetch(url, options);
    clearTimeout(timer);
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    clearTimeout(timer);
    const isTimeout = error.name === 'AbortError' || error.message?.includes('aborted');
    console.error(`Fetch error for ${url}:`, error.message);
    return { 
      success: false, 
      error: isTimeout ? 'Network timeout: server took too long to respond.' : error.message,
      isTimeout 
    };
  }
}

/**
 * Returns cached buses from AsyncStorage, or falls back to bundled defaultBusesFleet.
 */
export async function getLocalCachedBuses() {
  try {
    const cachedStr = await AsyncStorage.getItem(CONDUCTOR_BUSES_CACHE_KEY);
    const cachedAt = await AsyncStorage.getItem(CONDUCTOR_BUSES_CACHED_AT_KEY);
    if (cachedStr) {
      const parsed = JSON.parse(cachedStr);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return {
          buses: parsed,
          source: 'cache',
          cachedAt: cachedAt || null
        };
      }
    }
  } catch (e) {
    console.warn('Error reading cached buses:', e);
  }

  // Fallback to bundled fleet
  return {
    buses: defaultBusesFleet || [],
    source: 'fleet_bundle',
    cachedAt: null
  };
}

/**
 * Saves fresh buses list to AsyncStorage
 */
export async function saveBusesToCache(buses) {
  try {
    if (Array.isArray(buses) && buses.length > 0) {
      await AsyncStorage.setItem(CONDUCTOR_BUSES_CACHE_KEY, JSON.stringify(buses));
      await AsyncStorage.setItem(CONDUCTOR_BUSES_CACHED_AT_KEY, new Date().toISOString());
    }
  } catch (e) {
    console.warn('Error caching buses:', e);
  }
}

/**
 * Remembers the conductor's last selected bus
 */
export async function saveLastSelectedBus(bus) {
  try {
    if (bus) {
      await AsyncStorage.setItem(CONDUCTOR_LAST_SELECTED_BUS_KEY, JSON.stringify(bus));
    }
  } catch (e) {
    console.warn('Error saving last selected bus:', e);
  }
}

/**
 * Retrieves the conductor's last selected bus
 */
export async function getLastSelectedBus() {
  try {
    const raw = await AsyncStorage.getItem(CONDUCTOR_LAST_SELECTED_BUS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Error getting last selected bus:', e);
  }
  return null;
}

/**
 * Loads unassigned active buses for Conductor dropdown list with cache fallback.
 */
export async function getBusesConductorWithCache() {
  const local = await getLocalCachedBuses();
  
  try {
    const res = await safeRequest('api/conductor/buses', null, 'GET', 7000);
    if (res && res.success && Array.isArray(res.buses) && res.buses.length > 0) {
      await saveBusesToCache(res.buses);
      return {
        success: true,
        buses: res.buses,
        source: 'live',
        isOffline: false
      };
    }
  } catch (err) {
    console.warn('Failed to fetch live buses:', err);
  }

  return {
    success: true,
    buses: local.buses,
    source: local.source,
    isOffline: true,
    cachedAt: local.cachedAt
  };
}

/**
 * Loads unassigned active buses for Conductor dropdown list.
 */
export async function getBusesConductor() {
  return safeRequest('api/conductor/buses', null, 'GET', 7000);
}

/**
 * Fetches all active buses telemetries for the map dashboard.
 */
export async function getActiveBuses() {
  return safeRequest('api/buses', null, 'GET', 7000);
}

/**
 * Starts a live dispatch operation session in the database.
 */
export async function startOperation(payload) {
  // payload: { bus_id, route, pre_departure_count, start_location }
  return safeRequest('api/conductor/start', payload, 'POST', 8000);
}

/**
 * Updates geo location telemetry and seats availability.
 */
export async function updateGeoLocation(payload) {
  // payload: { bus_id, geojson, route, seats_available, status, current_location_name }
  return safeRequest('api/conductor/update-location', payload, 'POST', 6000);
}

/**
 * Logs historical passenger boarding/departing events.
 */
export async function logPassengerEvent(payload) {
  return safeRequest('api/conductor/log-passenger-event', payload, 'POST', 6000);
}

/**
 * Saves a printed ticket to the backend and fetches the real ticket number.
 */
export async function printTicket(payload) {
  return safeRequest('api/conductor/print-ticket', payload, 'POST', 7000);
}

/**
 * Stops live tracking and closes the active operation session.
 */
export async function stopTracking(payload) {
  // payload: { bus_id, end_location }
  return safeRequest('api/conductor/stop', payload, 'POST', 8000);
}

/**
 * Fetches route geometry features (polygons) from map_data.php for geofencing.
 */
export async function getMapFeatures() {
  try {
    const baseUrl = await getServerUrl();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    const response = await fetch(`${baseUrl}/api/map-data`, { cache: 'no-store', signal: controller.signal });
    clearTimeout(timer);
    if (response.ok) {
      return await response.json();
    }
    // Fallback to stops list if map-data is unavailable
    const fallbackRes = await fetch(`${baseUrl}/api/buses/stops-terminal`, { cache: 'no-store' });
    const json = await fallbackRes.json();
    if (json.success && json.data) {
      return { features: json.data };
    }
    return null;
  } catch (e) {
    console.error('getMapFeatures error:', e);
    return null;
  }
}

/**
 * Retrieves the count of waiting passengers per stop.
 */
export async function getWaitingPassengerCount() {
  return safeRequest('api/conductor/waiting-passengers', null, 'GET', 6000);
}

/**
 * Updates profile details (email / password) for conductors.
 */
export async function updateProfile(payload) {
  // payload: { name, email, current_password, new_password, confirm_password }
  return safeRequest('api/conductor/profile', payload, 'POST', 8000);
}

/**
 * Fetches initial sync data including bus stops, fares, and schedule with bundled offline fallback.
 */
export async function getSyncData() {
  try {
    const res = await safeRequest('api/buses/sync', null, 'GET', 6000);
    if (res && res.success && Array.isArray(res.bus_stops) && res.bus_stops.length > 0) {
      return res;
    }
  } catch (e) {
    console.warn('getSyncData error, using bundled defaultBusDataSync:', e);
  }
  return defaultBusDataSync;
}

/**
 * Fetches operation history for the conductor with cache fallback.
 */
export async function getOperationHistory() {
  let cached = [];
  try {
    const raw = await AsyncStorage.getItem(CONDUCTOR_HISTORY_CACHE_KEY);
    if (raw) {
      cached = JSON.parse(raw);
    }
  } catch (e) {}

  try {
    const res = await safeRequest('api/conductor/history', null, 'GET', 7000);
    if (res && res.success && Array.isArray(res.history)) {
      await AsyncStorage.setItem(CONDUCTOR_HISTORY_CACHE_KEY, JSON.stringify(res.history));
      return { success: true, history: res.history, source: 'live' };
    }
  } catch (err) {
    console.warn('getOperationHistory network failed:', err);
  }

  if (cached && cached.length > 0) {
    return { success: true, history: cached, source: 'cache', isOffline: true };
  }

  return { success: false, history: [], error: 'History unavailable' };
}

/**
 * Fetches receipt configuration (header, footer, etc.) for PT-210 portable printer.
 */
export async function getReceiptConfig() {
  return safeRequest('api/conductor/receipt-config', null, 'GET', 6000);
}

/**
 * Fetches operation summary for printing end of trip reports.
 */
export async function getTripSummary(tripId) {
  return safeRequest(`api/conductor/operations/${tripId}/summary`, null, 'GET', 7000);
}
