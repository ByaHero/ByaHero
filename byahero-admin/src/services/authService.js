import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

export async function getServerUrl() {
  if (Platform.OS === 'web') {
    return window.location.origin;
  }
  return DEFAULT_SERVER_URL;
}

export async function setServerUrl(url) {
  try {
    if (!url || url.trim() === '' || url === DEFAULT_SERVER_URL) {
      await AsyncStorage.removeItem('byahero_server_url');
    } else {
      const trimmed = url.trim().replace(/\/$/, "");
      await AsyncStorage.setItem('byahero_server_url', trimmed);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function preWarmServer() {
  try {
    const baseUrl = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);

    fetch(`${baseUrl}/api/ping`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        console.log('Pre-warm response:', data);
        clearTimeout(timeoutId);
      })
      .catch(err => {
        console.log('Pre-warm ping status (ignored/timed out):', err.message);
        clearTimeout(timeoutId);
      });
  } catch (e) {
    // Ignore error
  }
}

async function apiRequest(action, dataObj) {
  const baseUrl = await getServerUrl();
  const endpoint = `${baseUrl}/api/auth`;

  const formData = new FormData();
  formData.append('action', action);
  for (const key in dataObj) {
    formData.append(key, dataObj[key]);
  }

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include'
    });

    if (!response.ok) {
      throw new Error(`Server returned HTTP status ${response.status}`);
    }

    const json = await response.json();
    return json;
  } catch (error) {
    console.error(`API Error for action ${action}:`, error);
    throw error;
  }
}

export async function cacheSession(email, role, userDetails = {}) {
  try {
    await AsyncStorage.setItem('byahero_cached_email', email);
    await AsyncStorage.setItem('byahero_cached_role', role);
    await AsyncStorage.setItem('byahero_cached_name', userDetails.name || email.split('@')[0]);

    const contacts = userDetails.contacts || '';
    await AsyncStorage.setItem('byahero_cached_contacts', contacts);
    await AsyncStorage.setItem('byahero_cached_phone', contacts);

    if (userDetails.profile_picture) {
      await AsyncStorage.setItem('byahero_cached_profile_picture', userDetails.profile_picture);
    } else {
      await AsyncStorage.removeItem('byahero_cached_profile_picture');
    }
  } catch (e) {
    console.error(e);
  }
}

export async function login(email, password, isOnline = true) {
  const cleanEmail = email.trim();

  if (!isOnline) {
    const cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
    const cachedRole = await AsyncStorage.getItem('byahero_cached_role');

    if (cachedEmail && cachedEmail.toLowerCase() === cleanEmail.toLowerCase()) {
      return { success: true, offline: true, role: cachedRole };
    } else {
      throw new Error('You are offline. To login for the first time, please connect to the internet.');
    }
  }

  const data = await apiRequest('login', { email: cleanEmail, password });

  if (data.success) {
    let role = 'passenger';
    if (data.redirect?.includes('conductor')) role = 'conductor';
    else if (data.redirect?.includes('driver')) role = 'driver';
    else if (data.redirect?.includes('admin')) role = 'admin';

    await cacheSession(cleanEmail, role, data.user);
    return { success: true, offline: false, role, redirect: data.redirect, user: data.user };
  } else {
    throw new Error(data.message || 'Invalid email or password.');
  }
}

export async function logout() {
  try {
    const baseUrl = await getServerUrl();
    await fetch(`${baseUrl}/api/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
    await AsyncStorage.multiRemove([
      'byahero_cached_email',
      'byahero_cached_role',
      'byahero_cached_name',
      'byahero_cached_contacts',
      'byahero_cached_phone',
      'byahero_cached_profile_picture',
      'byahero_conductor_payload'
    ]);
  } catch (e) {
    console.error('Logout error', e);
  }
}
