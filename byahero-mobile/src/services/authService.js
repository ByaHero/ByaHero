import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

/**
 * Gets the configured backend base URL from storage.
 */
export async function getServerUrl() {
  try {
    const url = await AsyncStorage.getItem('byahero_server_url');
    if (url === 'https://byahero.alwaysdata.net') {
      return DEFAULT_SERVER_URL;
    }
    // Auto-align hostname to match localhost vs 127.0.0.1 and prevent SameSite cookie discard
    if (typeof window !== 'undefined' && window.location) {
      const currentHost = window.location.hostname;
      if (currentHost === 'localhost' || currentHost === '127.0.0.1') {
        return `http://${currentHost}:8000`;
      }
    }
    return url || DEFAULT_SERVER_URL;
  } catch (e) {
    return DEFAULT_SERVER_URL;
  }
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
 * Google Sign-In backend verification.
 */
export async function googleAuth(idToken) {
  const data = await apiRequest('google_auth', { credential: idToken });
  
  if (data.success) {
    const email = data.user?.email || 'Guest';
    let role = 'passenger';
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
