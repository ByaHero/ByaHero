import axios from 'axios';

// The live hosted domain of the ByaHero backend.
// Change this to your local dev IP (e.g. 'http://192.168.1.10/ByaHero-Prototype-V3') for offline emulator testing.
export const BASE_URL = 'http://localhost/ByaHero-Prototype-V3';

// Configure Axios with auto cookie persistence. 
// setting withCredentials = true forces Axios to store and send PHP's standard session cookies (PHPSESSID) automatically.
const client = axios.create({
  baseURL: BASE_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Configure default interceptors for debugging or adding header variations
client.interceptors.request.use(
  (config) => {
    // If you ever decide to transition to Bearer tokens:
    const userStr = localStorage.getItem('byahero_user');
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user.id) {
          // You could append custom auth headers here if needed.
          config.headers['X-User-Id'] = String(user.id);
          config.headers['X-User-Role'] = String(user.role);
        }
      } catch (e) {
        console.error('Error parsing local user storage', e);
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

export default client;

/**
 * Interface mapping the ByaHero User Model
 */
export interface ByaHeroUser {
  id: number;
  email: string;
  role: 'passenger' | 'conductor' | 'driver' | 'admin';
  name: string;
  contacts: string;
  profile_picture?: string | null;
}

/**
 * Clean API services mapping key backend endpoints
 */
export const ApiService = {
  // --- AUTH ENDPOINTS ---
  login: async (emailOrContact: string, password: string) => {
    const formData = new FormData();
    formData.append('action', 'login');
    formData.append('email', emailOrContact);
    formData.append('password', password);

    // Call auth_api.php using multipart form-data as expected by PHP auth
    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  signUpRequestOtp: async (data: { name: string; email: string; contacts: string; password: string; confirm_password: string }) => {
    const formData = new FormData();
    formData.append('action', 'signup_request_otp');
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('contacts', data.contacts);
    formData.append('password', data.password);
    formData.append('confirm_password', data.confirm_password);

    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData);
    return response.data;
  },

  signUpVerifyOtp: async (email: string, otp: string) => {
    const formData = new FormData();
    formData.append('action', 'signup_verify_otp');
    formData.append('email', email);
    formData.append('otp', otp);

    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  recoverRequestOtp: async (email: string) => {
    const formData = new FormData();
    formData.append('action', 'request_otp');
    formData.append('email', email);

    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  recoverVerifyOtp: async (email: string, otp: string) => {
    const formData = new FormData();
    formData.append('action', 'verify_otp');
    formData.append('email', email);
    formData.append('otp', otp);

    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  recoverResetPassword: async (email: string, otp: string, newPassword: string) => {
    const formData = new FormData();
    formData.append('action', 'reset_password');
    formData.append('email', email);
    formData.append('otp', otp);
    formData.append('new_password', newPassword);

    const response = await axios.post(`${BASE_URL}/public/auth_api.php`, formData, {
      withCredentials: true,
    });
    return response.data;
  },

  logout: async () => {
    localStorage.removeItem('byahero_user');
    // Clear cookie session
    try {
      await axios.get(`${BASE_URL}/public/logout.php`, { withCredentials: true });
    } catch (e) {
      console.warn('Silent logout failed', e);
    }
  },

  // --- PASSENGER & CONDUCTOR BUS DATA ENDPOINTS ---
  getBuses: async () => {
    const response = await client.get('/public/api.php?action=get_buses');
    return response.data;
  },

  getBusesConductor: async () => {
    const response = await client.get('/public/api.php?action=get_buses_conductor');
    return response.data;
  },

  updateLocation: async (payload: {
    bus_id: number;
    lat?: number;
    lng?: number;
    seats_available?: number;
    status?: 'available' | 'on_stop' | 'full' | 'unavailable';
    route?: string;
  }) => {
    const response = await client.post('/public/api.php?action=update_location', payload);
    return response.data;
  },

  startOperation: async (payload: {
    bus_id: number;
    route: string;
    pre_departure_count: number;
    start_location?: string;
  }) => {
    const response = await client.post('/public/api.php?action=start_operation', payload);
    return response.data;
  },

  stopTracking: async (payload: { bus_id: number; end_location?: string }) => {
    const response = await client.post('/public/api.php?action=stop_tracking', payload);
    return response.data;
  },

  logPassengerEvent: async (payload: {
    operation_id: number;
    event_type: 'board' | 'depart';
    count: number;
    location_name?: string;
    lat?: number;
    lng?: number;
  }) => {
    const response = await client.post('/public/api.php?action=log_passenger_event', payload);
    return response.data;
  },

  checkActiveRide: async () => {
    const response = await client.get('/public/api.php?action=check_active_ride');
    return response.data;
  },

  // --- SOS ALERTS ENDPOINTS ---
  sendSosAlert: async (payload: {
    operation_id: number;
    lat?: number;
    lng?: number;
    message?: string;
  }) => {
    // Hits the backend sendSosAlert.php script
    const response = await client.post('/backend/sendSosAlert.php', payload);
    return response.data;
  },

  getSosAlerts: async () => {
    const response = await client.get('/backend/getSosAlerts.php');
    return response.data;
  },
};
