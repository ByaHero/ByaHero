import { apiRequest } from './api';

export const adminService = {
  // Stats
  getDashboardStats: () => apiRequest('/api/admin/dashboard-stats'),

  // Staff (Drivers & Conductors)
  listStaff: () => apiRequest('/api/admin/staff'),
  addStaff: (data: any) => apiRequest('/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_user', ...data })
  }),
  deleteStaff: (id: number, role: string) => apiRequest('/api/admin/staff', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_user', id, role })
  }),

  // Buses
  listBuses: () => apiRequest('/api/admin/buses'),
  addBus: (data: any) => apiRequest('/api/admin/buses', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_bus', ...data })
  }),
  updateBus: (data: any) => apiRequest('/api/admin/buses', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_bus', ...data })
  }),
  deleteBus: (id: number) => apiRequest('/api/admin/buses', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_bus', id })
  }),

  // Active Buses
  listActiveBuses: () => apiRequest('/api/admin/active-buses'),

  // Stops (Pick up Points / Terminals)
  listStops: () => apiRequest('/api/admin/stops'),
  addStop: (data: any) => apiRequest('/api/admin/stops', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_stop', ...data })
  }),
  updateStop: (data: any) => apiRequest('/api/admin/stops', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_stop', ...data })
  }),
  deleteStop: (id: number) => apiRequest('/api/admin/stops', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_stop', id })
  }),

  // Schedules
  listSchedules: () => apiRequest('/api/admin/schedules'),
  addSchedule: (data: any) => apiRequest('/api/admin/schedules', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_schedule', ...data })
  }),
  updateSchedule: (data: any) => apiRequest('/api/admin/schedules', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_schedule', ...data })
  }),
  deleteSchedule: (id: number) => apiRequest('/api/admin/schedules', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_schedule', id })
  }),
  saveRoutes: (data: any) => apiRequest('/api/admin/schedules', {
    method: 'POST',
    body: JSON.stringify({ action: 'save_routes', ...data })
  }),

  // Fares
  listFares: () => apiRequest('/api/admin/fares'),
  addFare: (data: any) => apiRequest('/api/admin/fares', {
    method: 'POST',
    body: JSON.stringify({ action: 'add_fare', ...data })
  }),
  updateFare: (data: any) => apiRequest('/api/admin/fares', {
    method: 'POST',
    body: JSON.stringify({ action: 'update_fare', ...data })
  }),
  deleteFare: (id: number) => apiRequest('/api/admin/fares', {
    method: 'POST',
    body: JSON.stringify({ action: 'delete_fare', id })
  }),

  // Waiting Passengers
  listWaitingPassengers: () => apiRequest('/api/admin/waiting-passengers'),
  manageWaitingPassengers: (data: any) => apiRequest('/api/admin/waiting-passengers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Passenger Feedbacks
  listFeedbacks: () => apiRequest('/api/admin/feedbacks'),
  deleteFeedback: (id: number) => apiRequest(`/api/admin/feedbacks/delete`, {
    method: 'POST',
    body: JSON.stringify({ id })
  }),

  // Analytics
  getAnalytics: () => apiRequest('/api/admin/analytics'),

  // Lost & Found
  listLostAndFound: () => apiRequest('/api/admin/lost-and-found'),
  manageLostAndFound: (data: any) => apiRequest('/api/admin/lost-and-found', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Incident Reports
  listReports: () => apiRequest('/api/admin/reports'),
  manageReports: (data: any) => apiRequest('/api/admin/reports', {
    method: 'POST',
    body: JSON.stringify(data)
  }),

  // Auth & Profile
  login: (email: string, password: string) => apiRequest('/api/auth', {
    method: 'POST',
    body: (() => {
      const fd = new FormData();
      fd.append('action', 'login');
      fd.append('email', email);
      fd.append('password', password);
      return fd;
    })(),
    // Allow browser to determine multipart/form-data boundary
    headers: {} 
  }),
  logout: () => apiRequest('/api/logout', { method: 'POST' }),
  updateProfile: (data: any) => apiRequest('/api/admin/profile', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
};
