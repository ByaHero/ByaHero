import AsyncStorage from '@react-native-async-storage/async-storage';

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

/**
 * Gets the configured backend base URL from storage.
 */
export async function getServerUrl() {
  // Temporarily bypass AsyncStorage because it's caching the production URL
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
