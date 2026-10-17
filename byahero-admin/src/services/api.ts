import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from './authService';

// Custom fetch client with credentials and session fallback support
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

  // Pass cached admin email header as fallback for session identification
  let cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
  if (!cachedEmail) {
    const adminUserStr = await AsyncStorage.getItem('byahero_admin_user');
    if (adminUserStr) {
      try {
        const adminUser = JSON.parse(adminUserStr);
        if (adminUser?.email) {
          cachedEmail = adminUser.email;
        }
      } catch (e) {}
    }
  }

  if (cachedEmail) {
    headers.set('X-Admin-Email', cachedEmail);
    headers.set('X-User-Email', cachedEmail);
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Crucial for session cookies with Laravel
  });

  if (!response.ok) {
    // If unauthorized / forbidden or session expired, try restoring session if we have stored email
    if ((response.status === 419 || response.status === 401 || response.status === 403) && path !== '/api/auth') {
      if (cachedEmail) {
        try {
          const restoreUrl = `${baseUrl}/api/auth`;
          const restoreRes = await fetch(restoreUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
            body: JSON.stringify({ action: 'restore_session', email: cachedEmail }),
            credentials: 'include'
          });
          if (restoreRes.ok) {
            const restoreData = await restoreRes.json();
            if (restoreData.success) {
              // Retry original request once session is restored
              response = await fetch(url, {
                ...options,
                headers,
                credentials: 'include',
              });
            }
          }
        } catch (e) {
          console.error('Session restore failed:', e);
        }
      }
    }

    if (!response.ok) {
      if (response.status === 419 || response.status === 401 || response.status === 403) {
        // CSRF token mismatch or unauthorized, remove local cached session
        await AsyncStorage.removeItem('byahero_cached_email');
        await AsyncStorage.removeItem('byahero_admin_user');
        await AsyncStorage.removeItem('byahero_cached_role');
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }
  }

  return response.json();
}
