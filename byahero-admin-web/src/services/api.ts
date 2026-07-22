import { User } from '../types';

export const API_BASE_URL = 'https://byahero.alwaysdata.net';

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

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Crucial for session cookies with Laravel
  });

  if (!response.ok) {
    if (response.status === 419 || response.status === 401 || response.status === 403) {
      // CSRF token mismatch, unauthorized, or forbidden (expired session), remove local cached session
      localStorage.removeItem('byahero_admin_user');
      window.location.href = '/login';
    }
    throw new Error(`HTTP Error: ${response.status}`);
  }

  return response.json();
}
