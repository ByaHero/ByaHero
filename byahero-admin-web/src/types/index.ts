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
  conductor_email?: string;
}

export interface ActiveBus extends Bus {
  latitude?: number;
  longitude?: number;
  conductor_id?: number;
  route_name?: string;
  speed?: number;
  heading?: number;
  last_updated?: string;
  current_location?: string;
  conductor_email?: string;
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
  fare_id: number;
  origin_stop_id: number;
  destination_stop_id: number;
  origin_stop_name?: string;
  destination_stop_name?: string;
  regular_fare: number;
  discounted_fare: number;
  distance_km?: number;
  base_regular_fare?: number;
  base_discounted_fare?: number;
  created_at?: string;
  updated_at?: string;
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

export interface Stop {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  type: string;
  status: 'active' | 'inactive';
  route?: string;
}

export interface Feedback {
  id: number;
  passenger_email: string;
  passenger_name?: string;
  feedback_text: string;
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
  image1_path?: string;
  image2_path?: string;
}

export interface IncidentReport {
  id: number;
  bus_number?: string;
  others_details?: string;
  report_reason?: string;
  status: 'pending' | 'resolved';
  created_at?: string;
  reporter_name?: string;
  reporter_email?: string;
  contact_number?: string;
}
