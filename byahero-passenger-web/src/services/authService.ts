const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

export async function getServerUrl(): Promise<string> {
  try {
    const storedUrl = localStorage.getItem('byahero_server_url');
    if (storedUrl) {
      return storedUrl;
    }
  } catch (error) {
    console.error('Error getting server URL:', error);
  }
  return DEFAULT_SERVER_URL;
}

export async function setServerUrl(url: string): Promise<void> {
  try {
    if (!url || url.trim() === '' || url === DEFAULT_SERVER_URL) {
      localStorage.removeItem('byahero_server_url');
    } else {
      const trimmed = url.trim().replace(/\/$/, "");
      localStorage.setItem('byahero_server_url', trimmed);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function preWarmServer(): Promise<void> {
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

async function apiRequest(action: string, dataObj: Record<string, any>) {
  const baseUrl = await getServerUrl();
  const endpoint = `${baseUrl}/api/auth`;

  const formData = new FormData();
  formData.append('action', action);
  for (const key in dataObj) {
    if (dataObj[key] !== undefined && dataObj[key] !== null) {
      formData.append(key, dataObj[key]);
    }
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

export async function cacheSession(email: string, role: string, userDetails: any = {}) {
  try {
    localStorage.setItem('byahero_cached_email', email);
    localStorage.setItem('byahero_cached_role', role);

    const contacts = userDetails?.contacts || '';
    localStorage.setItem('byahero_cached_contacts', contacts);
    localStorage.setItem('byahero_cached_phone', contacts);
    localStorage.setItem('byahero_cached_name', userDetails?.name || email.split('@')[0]);

    if (userDetails?.profile_picture) {
      localStorage.setItem('byahero_cached_profile_picture', userDetails.profile_picture);
    } else {
      localStorage.removeItem('byahero_cached_profile_picture');
    }
  } catch (e) {
    console.error(e);
  }
}

export async function clearCachedSession() {
  localStorage.removeItem('byahero_cached_email');
  localStorage.removeItem('byahero_cached_role');
  localStorage.removeItem('byahero_cached_contacts');
  localStorage.removeItem('byahero_cached_phone');
  localStorage.removeItem('byahero_cached_name');
  localStorage.removeItem('byahero_cached_profile_picture');
}

export async function login(email: string, password: string, isOnline: boolean = true) {
  const cleanEmail = email.trim();

  if (!isOnline) {
    const cachedEmail = localStorage.getItem('byahero_cached_email');
    const cachedRole = localStorage.getItem('byahero_cached_role');

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

export async function restoreSession(email: string) {
  try {
    const data = await apiRequest('restore_session', { email: email.trim() });
    return data;
  } catch (error) {
    console.error('Failed to restore session:', error);
    return { success: false };
  }
}

export async function googleAuth(idToken: string) {
  const data = await apiRequest('google_auth', { credential: idToken });

  if (data.success) {
    const email = data.user?.email || 'Guest';
    const role = 'passenger';

    await cacheSession(email, role, data.user);
    return { success: true, role, redirect: data.redirect, user: data.user };
  } else {
    throw new Error(data.message || 'Google authentication failed.');
  }
}

export async function signupRequestOtp(name: string, email: string, contacts: string, password: string, confirmPassword: string) {
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

export async function signupVerifyOtp(email: string, otp: string) {
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

export async function forgotRequestOtp(email: string) {
  const data = await apiRequest('request_otp', { email: email.trim() });

  if (data.success) {
    return { success: true, devOtp: data.dev_otp };
  } else {
    throw new Error(data.message || 'Failed to send recovery code');
  }
}

export async function forgotVerifyOtp(email: string, otp: string) {
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

export async function forgotResetPassword(email: string, otp: string, newPassword: string) {
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
