import { User } from '../types';

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL !== undefined
  ? import.meta.env.VITE_API_BASE_URL
  : (import.meta.env.DEV ? '' : 'https://byahero.alwaysdata.net');

// Helper to construct full API endpoints
export const getApiUrl = (path: string) => `${API_BASE_URL}${path}`;

// Custom fetch client with credentials support
export async function apiRequest(path: string, options: RequestInit = {}) {
  const url = getApiUrl(path);
  
  // Set default headers
  const headers = new Headers(options.headers || {});
  if (!headers.has('Accept')) {
    headers.set('Accept', 'application/json');
  }
  
  // Don't override Content-Type if it's FormData (let browser set it with boundary)
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  // Pass cached admin email header if available as fallback for session identification
  const userStr = localStorage.getItem('byahero_admin_user');
  if (userStr) {
    try {
      const parsed = JSON.parse(userStr);
      if (parsed?.email) {
        headers.set('X-Admin-Email', parsed.email);
        headers.set('X-User-Email', parsed.email);
      }
    } catch (e) {}
  }

  let response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Crucial for session cookies with Laravel
  });

  if (!response.ok) {
    if ((response.status === 419 || response.status === 401 || response.status === 403) && path !== '/api/auth') {
      // Try restoring session if we have stored user
      if (userStr) {
        try {
          const parsed = JSON.parse(userStr);
          if (parsed?.email) {
            const restoreUrl = getApiUrl('/api/auth');
            const restoreRes = await fetch(restoreUrl, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
              body: JSON.stringify({ action: 'restore_session', email: parsed.email }),
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
          }
        } catch (e) {
          console.error('Session restore failed:', e);
        }
      }
    }

    if (!response.ok) {
      if (response.status === 419 || response.status === 401 || response.status === 403) {
        // CSRF token mismatch, unauthorized, or forbidden (expired session), remove local cached session
        localStorage.removeItem('byahero_admin_user');
        window.location.href = '/login';
      }
      throw new Error(`HTTP Error: ${response.status}`);
    }
  }

  return response.json();
}

