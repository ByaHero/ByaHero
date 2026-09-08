import { debugLogger, ApiDiagnosticInfo } from '../utils/debugLogger';

export class ApiError extends Error {
  public diagnosticInfo?: ApiDiagnosticInfo;
  public statusCode?: number;

  constructor(message: string, diagnosticInfo?: ApiDiagnosticInfo, statusCode?: number) {
    super(message);
    this.name = 'ApiError';
    this.diagnosticInfo = diagnosticInfo;
    this.statusCode = statusCode;
  }
}

const DEFAULT_SERVER_URL = 'https://byahero.alwaysdata.net';

export function isMessengerOrInAppBrowser(): boolean {
  if (typeof navigator === 'undefined') return false;
  const ua = navigator.userAgent || navigator.vendor || (window as any).opera || '';
  return /FBAN|FBAV|Instagram|TikTok|Line/i.test(ua);
}

export async function getServerUrl(): Promise<string> {
  try {
    const storedUrl = localStorage.getItem('byahero_server_url');
    if (storedUrl && !storedUrl.includes('vercel.app')) {
      return storedUrl;
    }
    if (storedUrl && storedUrl.includes('vercel.app')) {
      localStorage.removeItem('byahero_server_url');
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
      debugLogger.log('info', 'Config', `Reset server URL to default: ${DEFAULT_SERVER_URL}`);
    } else {
      const trimmed = url.trim().replace(/\/$/, "");
      localStorage.setItem('byahero_server_url', trimmed);
      debugLogger.log('info', 'Config', `Updated custom server URL to: ${trimmed}`);
    }
  } catch (e) {
    console.error(e);
  }
}

export async function preWarmServer(): Promise<void> {
  try {
    const baseUrl = await getServerUrl();
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 12000);

    debugLogger.log('info', 'PreWarm', `Pinging server at ${baseUrl}/api/ping`);

    fetch(`${baseUrl}/api/ping`, { signal: controller.signal })
      .then(res => res.json())
      .then(data => {
        debugLogger.log('success', 'PreWarm', 'Server ping response received', data);
        clearTimeout(timeoutId);
      })
      .catch(err => {
        debugLogger.log('warn', 'PreWarm', `Server ping status: ${err.message}`);
        clearTimeout(timeoutId);
      });
  } catch (e) {
    // Ignore error
  }
}

async function apiRequest(action: string, dataObj: Record<string, any>) {
  const baseUrl = await getServerUrl();
  const endpoint = `${baseUrl}/api/auth`;

  debugLogger.log('info', `API:${action}`, `Sending request to ${endpoint}`, {
    baseUrl,
    endpoint,
    action,
    parameters: Object.keys(dataObj),
  });

  const formData = new FormData();
  formData.append('action', action);
  for (const key in dataObj) {
    if (dataObj[key] !== undefined && dataObj[key] !== null) {
      formData.append(key, dataObj[key]);
    }
  }

  let response: Response;
  try {
    response = await fetch(endpoint, {
      method: 'POST',
      body: formData,
      headers: {
        'Accept': 'application/json',
      },
      credentials: 'include'
    });
  } catch (networkError: any) {
    const report = debugLogger.createDiagnosticReport(action, endpoint, baseUrl, networkError);
    throw new ApiError(
      `Network request failed: ${networkError.message || 'Unable to connect to server'}.`,
      report
    );
  }

  if (!response.ok) {
    let errorText = '';
    try {
      errorText = await response.text();
    } catch {
      // ignore
    }
    const report = debugLogger.createDiagnosticReport(
      action,
      endpoint,
      baseUrl,
      new Error(`HTTP ${response.status}: ${response.statusText || 'Server Error'}`),
      response.status,
      response.statusText
    );
    throw new ApiError(`Server error (HTTP ${response.status}): ${errorText || response.statusText}`, report, response.status);
  }

  try {
    const json = await response.json();
    debugLogger.log('success', `API:${action}`, 'Auth response received successfully', { success: json.success });
    return json;
  } catch (parseError: any) {
    const report = debugLogger.createDiagnosticReport(action, endpoint, baseUrl, parseError, response.status, 'Invalid JSON');
    throw new ApiError('Failed to parse server response as JSON.', report, response.status);
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
  debugLogger.log('info', 'GoogleAuth', 'Submitting Google ID Token to backend verification');
  const data = await apiRequest('google_auth', { credential: idToken });

  if (data.success) {
    const email = data.user?.email || 'Guest';
    const role = 'passenger';

    await cacheSession(email, role, data.user);
    debugLogger.log('success', 'GoogleAuth', `Successfully authenticated Google user: ${email}`);
    return { success: true, role, redirect: data.redirect, user: data.user, message: data.message };
  } else {
    throw new ApiError(data.message || 'Google authentication failed.');
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

export async function signupVerifyOtp(email: string, otp: string, name?: string, contacts?: string, password?: string) {
  const data = await apiRequest('signup_verify_otp', {
    email: email.trim(),
    otp: otp.trim(),
    name: name?.trim(),
    contacts: contacts?.trim(),
    password: password,
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
