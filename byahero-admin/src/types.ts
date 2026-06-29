export interface Bus {
  id: number;
  bus_no: string;
  plate_no: string;
  capacity: number;
  status: 'active' | 'inactive' | 'maintenance';
  description?: string;
  conductor_name?: string;
}

export interface ActiveBus {
  id: number;
  bus_no: string;
  plate_no: string;
  conductor_name?: string;
  latitude?: number;
  longitude?: number;
  speed?: number;
}

export interface StaffMember {
  id: number;
  email: string;
  name?: string;
  role: 'conductor' | 'driver';
  contacts?: string;
  created_at?: string;
}

export interface Stop {
  id: number;
  name: string;
  type: 'terminal' | 'regular';
  latitude: number | string;
  longitude: number | string;
  status: 'active' | 'inactive';
}

export interface Fare {
  id: number;
  route_name: string;
  base_fare: number | string;
  per_km_rate: number | string;
  discounted_base: number | string;
  discounted_per_km: number | string;
}

export interface WaitingPassenger {
  id: number;
  user_id: number;
  user_name: string;
  location_name: string;
  created_at: string;
  status: string;
  registered_name: string;
  registered_email: string;
}

export interface Feedback {
  id: number;
  user_email: string;
  name: string;
  rating: number;
  message: string;
  created_at: string;
}

export interface IncidentReport {
  id: number;
  user_name?: string;
  reporter_name?: string;
  user_id?: string | number;
  reporter_email?: string;
  user_email?: string;
  bus_number?: string;
  contact_number?: string;
  category?: string;
  title?: string;
  report_reason?: string;
  description?: string;
  others_details?: string;
  status: 'pending' | 'resolved' | string;
  created_at: string;
}

export interface LostItem {
  id: number;
  item_name: string;
  description: string;
  reported_by: string;
  contact_number: string;
  status: 'lost' | 'found' | 'claimed';
  created_at: string;
}
