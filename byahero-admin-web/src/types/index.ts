export interface User {
  id: number;
  email: string;
  name?: string;
  contacts?: string;
  role: string;
  profile_picture?: string;
  created_at?: string;
}

export interface Bus {
  id: number;
  plate_no: string;
  bus_no: string;
  status: 'active' | 'inactive' | 'maintenance';
  capacity: number;
  description?: string;
  created_at?: string;
  conductor_name?: string;
}

export interface ActiveBus extends Bus {
  latitude?: number;
  longitude?: number;
  conductor_id?: number;
  route_name?: string;
  speed?: number;
  heading?: number;
  last_updated?: string;
}

export interface StaffMember {
  id: number;
  email: string;
  name?: string;
  contacts?: string;
  role: 'admin' | 'conductor' | 'driver';
  created_at?: string;
}

export interface Schedule {
  id: number;
  bus_id: number;
  bus_no?: string;
  route_name: string;
  start_time: string;
  end_time: string;
  status: 'scheduled' | 'running' | 'completed' | 'cancelled';
  conductor_id?: number;
  conductor_name?: string;
}

export interface Fare {
  id: number;
  route_name: string;
  base_fare: number;
  per_km_rate: number;
  discounted_base: number;
  discounted_per_km: number;
  created_at?: string;
}

export interface WaitingPassenger {
  id: number;
  stop_id: number;
  stop_name?: string;
  passengers_count: number;
  route_direction?: string;
  updated_at?: string;
}

export interface Stop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  type: 'terminal' | 'regular';
  status: 'active' | 'inactive';
}

export interface Feedback {
  id: number;
  user_email: string;
  name?: string;
  message: string;
  rating: number;
  created_at?: string;
}

export interface LostItem {
  id: number;
  item_name: string;
  description: string;
  reported_by: string;
  contact_number: string;
  status: 'lost' | 'found' | 'claimed';
  created_at?: string;
}

export interface IncidentReport {
  id: number;
  title: string;
  description: string;
  category: 'accident' | 'delay' | 'breakdown' | 'other';
  status: 'pending' | 'resolved';
  created_at?: string;
  user_name?: string;
}
