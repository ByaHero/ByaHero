import { getServerUrl } from './authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * Standardized Fetch helper matching HTML client's safePost logic.
 */
export async function safeRequest(relativeUrl, payload = null, method = 'GET') {
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

  const options = {
    method,
    credentials: 'include',
    headers
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
    if (!response.ok) {
      throw new Error(`HTTP status ${response.status}`);
    }
    const json = await response.json();
    return json;
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    return { success: false, error: error.message };
  }
}

/**
 * Loads unassigned active buses for Conductor dropdown list.
 */
export async function getBusesConductor() {
  return safeRequest('api/conductor/buses');
}

/**
 * Fetches all active buses telemetries for the map dashboard.
 */
export async function getActiveBuses() {
  return safeRequest('api/buses');
}

/**
 * Starts a live dispatch operation session in the database.
 */
export async function startOperation(payload) {
  // payload: { bus_id, route, pre_departure_count, start_location }
  return safeRequest('api/conductor/start', payload, 'POST');
}

/**
 * Updates geo location telemetry and seats availability.
 */
export async function updateGeoLocation(payload) {
  // payload: { bus_id, geojson, route, seats_available, status, current_location_name }
  return safeRequest('api/conductor/update-location', payload, 'POST');
}

/**
 * Logs historical passenger boarding/departing events.
 */
export async function logPassengerEvent(payload) {
  return safeRequest('api/conductor/log-passenger-event', payload, 'POST');
}

/**
 * Stops live tracking and closes the active operation session.
 */
export async function stopTracking(payload) {
  // payload: { bus_id, end_location }
  return safeRequest('api/conductor/stop', payload, 'POST');
}

/**
 * Fetches route geometry features (polygons) from map_data.php for geofencing.
 */
export async function getMapFeatures() {
  try {
    const baseUrl = await getServerUrl();
    const response = await fetch(`${baseUrl}/api/buses/stops-terminal`, { cache: 'no-store' });
    const json = await response.json();
    // Re-format stops data if needed to match features geometry format,
    // or fall back to map_data.geojson from public.
    if (json.success && json.data) {
      return { features: json.data };
    }
    const backupRes = await fetch(`${baseUrl}/public/map_data.php`, { cache: 'no-store' });
    return await backupRes.json();
  } catch (e) {
    console.error('getMapFeatures error:', e);
    return null;
  }
}

/**
 * Retrieves the count of waiting passengers per stop.
 */
export async function getWaitingPassengerCount() {
  return safeRequest('backend/waiting_api.php?action=get_wait_count');
}

/**
 * Updates profile details (email / password) for conductors.
 */
export async function updateProfile(payload) {
  // payload: { name, email, current_password, new_password, confirm_password }
  return safeRequest('api/conductor/profile', payload, 'POST');
}
