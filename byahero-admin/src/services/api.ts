import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from './authService';

// Custom fetch client with credentials support
export async function apiRequest(path: string, options: RequestInit = {}) {
  const baseUrl = await getServerUrl();
  const url = `${baseUrl}${path}`;
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Don't override Content-Type if it's FormData
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Crucial for session cookies with Laravel
  });

  if (!response.ok) {
    if (response.status === 419 || response.status === 401) {
      // CSRF token mismatch or unauthorized, remove local cached session
      await AsyncStorage.removeItem('byahero_admin_user');
      await AsyncStorage.removeItem('byahero_cached_role');
    }
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response.json();
}
