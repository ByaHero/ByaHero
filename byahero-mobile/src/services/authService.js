import AsyncStorage from '@react-native-async-storage/async-storage';
import { NativeModules, Platform } from 'react-native';

const { LocationServiceModule } = NativeModules;

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

/**
 * Gets the configured backend base URL from storage.
 */
export async function getServerUrl() {
  try {
    const storedUrl = await AsyncStorage.getItem('byahero_server_url');
    if (storedUrl) {
      return storedUrl;
    }
  } catch (error) {
    console.error('Error getting server URL:', error);
  }
  return DEFAULT_SERVER_URL;
}

/**
 * Asynchronously pings the server to wake it up from idle sleep.
 */
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

/**
 * Updates the backend base URL configuration.
 */
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

/**
 * Helper to make POST form-data requests to Laravel API /api/auth
 */
async function apiRequest(action, dataObj, retries = 2) {
  const baseUrl = await getServerUrl();
  const endpoint = `${baseUrl}/api/auth`;

  const formData = new FormData();
  formData.append('action', action);
  for (const key in dataObj) {
    if (dataObj[key] !== undefined && dataObj[key] !== null) {
      formData.append(key, dataObj[key]);
    }
  }

  let lastError = null;
  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    // 20s timeout — generous enough for cold AlwaysData starts on mobile data
    const timeoutId = setTimeout(() => controller.abort(), 20000);

    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Server returned HTTP status ${response.status}`);
      }

      const json = await response.json();
      return json;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;
      console.warn(`API attempt ${attempt}/${retries} failed for action "${action}":`, error.message);
      if (attempt < retries) {
        // Short back-off before retry: 1.5s
        await new Promise(resolve => setTimeout(resolve, 1500));
      }
    }
  }

  console.error(`API Error for action ${action} after ${retries} attempts:`, lastError);
  throw lastError;
}


/**
 * Cache session data to local storage for offline operation.
 */
export async function cacheSession(email, role, userDetails = {}) {
  try {
    await AsyncStorage.setItem('byahero_cached_email', email);
    await AsyncStorage.setItem('byahero_cached_role', role);

    const contacts = userDetails.contacts || '';
    await AsyncStorage.setItem('byahero_cached_contacts', contacts);
    await AsyncStorage.setItem('byahero_cached_phone', contacts);
    await AsyncStorage.setItem('byahero_cached_name', userDetails.name || email.split('@')[0]);

    if (userDetails.profile_picture) {
      await AsyncStorage.setItem('byahero_cached_profile_picture', userDetails.profile_picture);
    } else {
      await AsyncStorage.removeItem('byahero_cached_profile_picture');
    }
  } catch (e) {
    console.error(e);
  }
}

/**
 * Standard password login. Supports offline authentication check.
 */
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

/**
 * Silently restores backend session using cached email.
 */
export async function restoreSession(email) {
  try {
    const data = await apiRequest('restore_session', { email: email.trim() });
    return data;
  } catch (error) {
    console.error('Failed to restore session:', error);
    return { success: false };
  }
}

const decodeBase64 = (input) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let str = input.replace(/=+$/, '');
  let output = '';
  if (str.length % 4 === 1) return null;
  for (let bc = 0, bs = 0, buffer, idx = 0; (buffer = str.charAt(idx++));) {
    buffer = chars.indexOf(buffer);
    if (~buffer) {
      bs = bc % 4 ? bs * 64 + buffer : buffer;
      if (bc++ % 4) {
        output += String.fromCharCode(255 & (bs >> ((-2 * bc) & 6)));
      }
    }
  }
  return output;
};

const decodeJwtPayload = (token) => {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');

    // Add standard base64 padding if missing
    while (base64.length % 4) {
      base64 += '=';
    }

    let decoded;
    if (typeof atob === 'function') {
      decoded = atob(base64);
    } else {
      decoded = decodeBase64(base64);
    }
    return decoded ? JSON.parse(decoded) : null;
  } catch (e) {
    console.error('Failed decoding JWT payload:', e);
    return null;
  }
};

/**
 * Google Sign-In backend verification.
 */
export async function googleAuth(idToken) {
  const data = await apiRequest('google_auth', { credential: idToken });

  if (data.success) {
    const email = data.user?.email || 'Guest';
    let role = 'passenger';

    // Decode ID Token to retrieve Google Profile Picture URL
    const payload = decodeJwtPayload(idToken);
    if (payload && payload.picture) {
      if (!data.user) data.user = {};
      data.user.profile_picture = payload.picture;
    }

    await cacheSession(email, role, data.user);
    return { success: true, role, redirect: data.redirect, user: data.user };
  } else {
    throw new Error(data.message || 'Google authentication failed.');
  }
}

/**
 * Sign up Step 1: Request Email Verification OTP.
 */
export async function signupRequestOtp(name, email, contacts, password, confirmPassword) {
  const data = await apiRequest('signup_request_otp', {
    name,
    email: email.trim(),
    contacts: contacts.trim(),
    password,
    confirm_password: confirmPassword,
  });

  if (data.success) {
    return { success: true, devOtp: data.dev_otp };
  } else {
    throw new Error(data.message || 'Sign up request failed');
  }
}

/**
 * Sign up Step 2: Verify OTP and complete registration.
 */
export async function signupVerifyOtp(email, otp) {
  const data = await apiRequest('signup_verify_otp', {
    email: email.trim(),
    otp: otp.trim(),
  });

  if (data.success) {
    return { success: true, redirect: data.redirect };
  } else {
    throw new Error(data.message || 'OTP verification failed');
  }
}

/**
 * Forgot Password Step 1: Send Recovery Code.
 */
export async function forgotRequestOtp(email) {
  const data = await apiRequest('request_otp', { email: email.trim() });

  if (data.success) {
    return { success: true, devOtp: data.dev_otp };
  } else {
    throw new Error(data.message || 'Failed to send recovery code');
  }
}

/**
 * Forgot Password Step 2: Verify OTP.
 */
export async function forgotVerifyOtp(email, otp) {
  const data = await apiRequest('verify_otp', {
    email: email.trim(),
    otp: otp.trim(),
  });

  if (data.success) {
    return { success: true };
  } else {
    throw new Error(data.message || 'Invalid verification code');
  }
}

/**
 * Forgot Password Step 3: Complete reset with new password.
 */
export async function forgotResetPassword(email, otp, newPassword) {
  const data = await apiRequest('reset_password', {
    email: email.trim(),
    otp: otp.trim(),
    new_password: newPassword,
  });

  if (data.success) {
    return { success: true };
  } else {
    throw new Error(data.message || 'Failed to reset password');
  }
}

/**
 * Safely and atomically logs the user out.
 * - Stops Android native location service if active.
 * - Clears session cookies.
 * - Immediately and atomically wipes user session & offline cache from AsyncStorage.
 * - Non-blockingly cancels waiting status and notifies backend /api/logout.
 */
export async function logout() {
  try {
    // 1. Stop background location service if running on Android
    if (Platform.OS === 'android' && LocationServiceModule?.stopService) {
      try {
        LocationServiceModule.stopService();
      } catch (err) {
        console.warn('Failed to stop LocationServiceModule on logout:', err);
      }
    }

    // 2. Clear native cookies if available
    try {
      let CookieManager = require('@react-native-cookies/cookies');
      if (CookieManager && CookieManager.default) {
        CookieManager = CookieManager.default;
      }
      if (CookieManager?.clearAll) {
        await CookieManager.clearAll();
      }
    } catch (cookieErr) {
      // CookieManager may not be available on some platforms
    }

    // 3. Read identifiers needed for backend cleanup before wiping storage
    let email = '';
    let token = '';
    try {
      email = (await AsyncStorage.getItem('byahero_cached_email')) || '';
      token = (await AsyncStorage.getItem('sos_fcm_active_token')) || '';
    } catch (e) {}

    // 4. Atomically remove all user session and cache keys
    const keysToRemove = [
      'byahero_cached_email',
      'byahero_cached_role',
      'byahero_cached_name',
      'byahero_cached_profile_picture',
      'byahero_cached_contacts',
      'byahero_cached_phone',
      'sos_fcm_active_token',
      'byahero_active_tour_step',
      'byahero_cached_ride_history',
      'byahero_cached_my_reports',
      'byahero_cached_user_feedback',
      'byahero_pending_profile_edits',
      'byahero_offline_friends',
    ];
    await AsyncStorage.multiRemove(keysToRemove);

    // 5. Fire backend cleanup in the background with strict timeout so it never blocks UI
    const baseUrl = await getServerUrl();
    const networkCleanups = [];

    if (email) {
      const controller1 = new AbortController();
      const timeout1 = setTimeout(() => controller1.abort(), 2500);
      networkCleanups.push(
        fetch(`${baseUrl}/api/waiting/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
          body: JSON.stringify({ email }),
          credentials: 'include',
          signal: controller1.signal,
        })
          .catch(() => {})
          .finally(() => clearTimeout(timeout1))
      );
    }

    const controller2 = new AbortController();
    const timeout2 = setTimeout(() => controller2.abort(), 2500);
    const logoutBody = 'fcm_token=' + encodeURIComponent(token) + (email ? '&email=' + encodeURIComponent(email) : '');
    networkCleanups.push(
      fetch(`${baseUrl}/api/logout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
        body: logoutBody,
        credentials: 'include',
        signal: controller2.signal,
      })
        .catch(() => {})
        .finally(() => clearTimeout(timeout2))
    );

    // Give network calls up to 500ms to resolve cleanly if network is fast; otherwise proceed immediately
    await Promise.race([
      Promise.all(networkCleanups),
      new Promise(resolve => setTimeout(resolve, 500)),
    ]);
  } catch (error) {
    console.error('Logout error:', error);
    // Ensure critical session keys are purged regardless of error
    try {
      await AsyncStorage.multiRemove(['byahero_cached_email', 'byahero_cached_role']);
    } catch (_) {}
  }
}

