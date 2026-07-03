import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeInfo,
  BusFront,
  ChevronDown,
  ChevronUp,
  Clock3,
  History,
  Loader2,
  MapPinned,
  Route,
  Users,
} from 'lucide-react';
import { adminService } from '../services/admin';

type PeriodKey = 'today' | 'week' | 'month';

type RouteRow = {
  name: string;
  count: number;
  percentage: number;
};

type HourlyFlow = {
  hr: number;
  total: number;
};

type BoardingLocation = {
  location_name: string;
  total: number;
};

type BusRow = {
  code: string;
  trips: number;
  passengers: number;
  routes: string;
  conductors: string;
  hotspots: BoardingLocation[];
};

type ConductorRow = {
  email: string;
  trips: number;
  passengers: number;
};

type LocationLogRow = {
  recorded_at: string;
  location_name: string;
  bus_code: string;
  conductor_email: string;
  route: string;
  boarded: number;
  departed: number;
};

type OperationRow = {
  bus_code: string;
  route: string;
  conductor_email: string;
  total_boarded: number;
  duration_min?: number;
  status: 'active' | 'completed' | 'pending';
};

type AnalyticsView = {
  totalTrips: number;
  totalPassengers: number;
  totalDeparted: number;
  averageTripMinutes: number;
  averageFare: number;
  estimatedRevenue: number;
  hourlyFlow: HourlyFlow[];
  routes: RouteRow[];
  boardingLocations: BoardingLocation[];
  buses: BusRow[];
  conductors: ConductorRow[];
  locationLogs: LocationLogRow[];
  recentOperations: OperationRow[];
};

type ApiAnalytics = {
  success?: boolean;
  period?: string;
  summary?: {
    total_trips?: number;
    total_passengers?: number;
    total_pre_departure?: number;
    total_departed?: number;
    avg_trip_minutes?: number;
  };
  routes?: Array<{ route?: string; trips?: number; passengers?: number }>;
  buses?: Array<{
    code?: string;
    bus_id?: number;
    trips?: number;
    passengers?: number;
    routes?: string;
    conductors?: string;
    hotspots?: Array<{ location_name?: string; total?: number }>;
  }>;
  conductors?: Array<{ email?: string; trips?: number; passengers?: number }>;
  hourly_flow?: Array<{ hr?: number; total?: number }>;
  departure_locations?: Array<{ location_name?: string; total?: number }>;
  boarding_locations?: Array<{ location_name?: string; total?: number }>;
  recent_operations?: Array<{
    bus_code?: string;
    route?: string;
    conductor_email?: string;
    total_boarded?: number;
    duration_min?: number;
    status?: 'active' | 'completed' | 'pending' | string;
  }>;
  location_logs?: Array<{
    recorded_at?: string;
    location_name?: string;
    bus_code?: string;
    conductor_email?: string;
    route?: string;
    boarded?: number;
    departed?: number;
  }>;
  average_fare?: number;
  estimated_revenue?: number;
};

const periodLabels: Record<PeriodKey, string> = {
  today: 'Today',
  week: 'This Week',
  month: 'This Month',
};

const fallbackAnalytics: Record<PeriodKey, AnalyticsView> = {
  today: {
    totalTrips: 42,
    totalPassengers: 1420,
    totalDeparted: 1378,
    averageTripMinutes: 38,
    averageFare: 28.5,
    estimatedRevenue: 40470,
    hourlyFlow: [
      { hr: 5, total: 4 },
      { hr: 6, total: 18 },
      { hr: 7, total: 31 },
      { hr: 8, total: 45 },
      { hr: 9, total: 28 },
      { hr: 10, total: 19 },
      { hr: 11, total: 22 },
      { hr: 12, total: 25 },
      { hr: 13, total: 29 },
      { hr: 14, total: 27 },
      { hr: 15, total: 33 },
      { hr: 16, total: 39 },
      { hr: 17, total: 47 },
      { hr: 18, total: 36 },
      { hr: 19, total: 20 },
      { hr: 20, total: 11 },
    ],
    routes: [
      { name: 'EDSA Aircon Line', count: 680, percentage: 80 },
      { name: 'Commonwealth Commuter', count: 420, percentage: 65 },
      { name: 'Quezon Ave Link', count: 210, percentage: 45 },
      { name: 'España Express', count: 110, percentage: 30 },
    ],
    boardingLocations: [
      { location_name: 'North Avenue', total: 348 },
      { location_name: 'Philcoa', total: 261 },
      { location_name: 'España', total: 190 },
      { location_name: 'Morayta', total: 168 },
    ],
    buses: [
      {
        code: 'BUS-104',
        trips: 11,
        passengers: 390,
        routes: 'EDSA Aircon Line, Quezon Ave Link',
        conductors: 'm.delacruz@byahero.com, r.santos@byahero.com',
        hotspots: [
          { location_name: 'North Avenue', total: 148 },
          { location_name: 'Philcoa', total: 102 },
          { location_name: 'Q.Ave', total: 76 },
          { location_name: 'España', total: 48 },
        ],
      },
      {
        code: 'BUS-212',
        trips: 9,
        passengers: 328,
        routes: 'Commonwealth Commuter',
        conductors: 'j.cruz@byahero.com, l.garcia@byahero.com',
        hotspots: [
          { location_name: 'Commonwealth', total: 138 },
          { location_name: 'Philcoa', total: 91 },
          { location_name: 'Q.C. Hall', total: 59 },
        ],
      },
      {
        code: 'BUS-330',
        trips: 7,
        passengers: 228,
        routes: 'España Express',
        conductors: 't.reyes@byahero.com',
        hotspots: [
          { location_name: 'España', total: 114 },
          { location_name: 'Morayta', total: 74 },
          { location_name: 'Legarda', total: 40 },
        ],
      },
    ],
    conductors: [
      { email: 'm.delacruz@byahero.com', trips: 11, passengers: 390 },
      { email: 'r.santos@byahero.com', trips: 10, passengers: 362 },
      { email: 'j.cruz@byahero.com', trips: 9, passengers: 328 },
      { email: 'l.garcia@byahero.com', trips: 8, passengers: 271 },
    ],
    locationLogs: [
      { recorded_at: new Date().toISOString(), location_name: 'North Avenue', bus_code: 'BUS-104', conductor_email: 'm.delacruz@byahero.com', route: 'EDSA Aircon Line', boarded: 14, departed: 2 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), location_name: 'Philcoa', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 11, departed: 1 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(), location_name: 'España', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 9, departed: 0 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 44).toISOString(), location_name: 'Morayta', bus_code: 'BUS-104', conductor_email: 'r.santos@byahero.com', route: 'EDSA Aircon Line', boarded: 8, departed: 3 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 61).toISOString(), location_name: 'Commonwealth', bus_code: 'BUS-212', conductor_email: 'l.garcia@byahero.com', route: 'Commonwealth Commuter', boarded: 16, departed: 4 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 77).toISOString(), location_name: 'Legarda', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 6, departed: 2 },
    ],
    recentOperations: [
      { bus_code: 'BUS-104', route: 'EDSA Aircon Line', conductor_email: 'm.delacruz@byahero.com', total_boarded: 104, duration_min: 41, status: 'active' },
      { bus_code: 'BUS-212', route: 'Commonwealth Commuter', conductor_email: 'j.cruz@byahero.com', total_boarded: 96, duration_min: 36, status: 'completed' },
      { bus_code: 'BUS-330', route: 'España Express', conductor_email: 't.reyes@byahero.com', total_boarded: 88, duration_min: 29, status: 'active' },
      { bus_code: 'BUS-145', route: 'EDSA Aircon Line', conductor_email: 'r.santos@byahero.com', total_boarded: 72, duration_min: 34, status: 'completed' },
      { bus_code: 'BUS-220', route: 'Commonwealth Commuter', conductor_email: 'l.garcia@byahero.com', total_boarded: 69, duration_min: 27, status: 'pending' },
    ],
  },
  week: {
    totalTrips: 255,
    totalPassengers: 8950,
    totalDeparted: 8720,
    averageTripMinutes: 39,
    averageFare: 28.5,
    estimatedRevenue: 255075,
    hourlyFlow: [
      { hr: 5, total: 15 },
      { hr: 6, total: 58 },
      { hr: 7, total: 91 },
      { hr: 8, total: 128 },
      { hr: 9, total: 103 },
      { hr: 10, total: 79 },
      { hr: 11, total: 87 },
      { hr: 12, total: 94 },
      { hr: 13, total: 102 },
      { hr: 14, total: 98 },
      { hr: 15, total: 118 },
      { hr: 16, total: 126 },
      { hr: 17, total: 149 },
      { hr: 18, total: 111 },
      { hr: 19, total: 74 },
      { hr: 20, total: 38 },
    ],
    routes: [
      { name: 'EDSA Aircon Line', count: 3120, percentage: 82 },
      { name: 'Commonwealth Commuter', count: 2280, percentage: 69 },
      { name: 'Quezon Ave Link', count: 1690, percentage: 52 },
      { name: 'España Express', count: 860, percentage: 32 },
    ],
    boardingLocations: [
      { location_name: 'North Avenue', total: 2010 },
      { location_name: 'Philcoa', total: 1772 },
      { location_name: 'España', total: 1198 },
      { location_name: 'Morayta', total: 1018 },
    ],
    buses: [
      {
        code: 'BUS-104',
        trips: 38,
        passengers: 1310,
        routes: 'EDSA Aircon Line, Quezon Ave Link',
        conductors: 'm.delacruz@byahero.com, r.santos@byahero.com',
        hotspots: [
          { location_name: 'North Avenue', total: 512 },
          { location_name: 'Philcoa', total: 330 },
          { location_name: 'Q.Ave', total: 248 },
          { location_name: 'España', total: 220 },
        ],
      },
      {
        code: 'BUS-212',
        trips: 31,
        passengers: 1094,
        routes: 'Commonwealth Commuter',
        conductors: 'j.cruz@byahero.com, l.garcia@byahero.com',
        hotspots: [
          { location_name: 'Commonwealth', total: 476 },
          { location_name: 'Philcoa', total: 314 },
          { location_name: 'Q.C. Hall', total: 213 },
        ],
      },
      {
        code: 'BUS-330',
        trips: 28,
        passengers: 934,
        routes: 'España Express',
        conductors: 't.reyes@byahero.com',
        hotspots: [
          { location_name: 'España', total: 430 },
          { location_name: 'Morayta', total: 308 },
          { location_name: 'Legarda', total: 196 },
        ],
      },
    ],
    conductors: [
      { email: 'm.delacruz@byahero.com', trips: 41, passengers: 1465 },
      { email: 'r.santos@byahero.com', trips: 39, passengers: 1388 },
      { email: 'j.cruz@byahero.com', trips: 36, passengers: 1230 },
      { email: 'l.garcia@byahero.com', trips: 35, passengers: 1174 },
    ],
    locationLogs: [
      { recorded_at: new Date().toISOString(), location_name: 'North Avenue', bus_code: 'BUS-104', conductor_email: 'm.delacruz@byahero.com', route: 'EDSA Aircon Line', boarded: 21, departed: 4 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), location_name: 'Philcoa', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 18, departed: 2 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(), location_name: 'España', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 16, departed: 1 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 44).toISOString(), location_name: 'Morayta', bus_code: 'BUS-104', conductor_email: 'r.santos@byahero.com', route: 'EDSA Aircon Line', boarded: 14, departed: 5 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 61).toISOString(), location_name: 'Commonwealth', bus_code: 'BUS-212', conductor_email: 'l.garcia@byahero.com', route: 'Commonwealth Commuter', boarded: 23, departed: 4 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 77).toISOString(), location_name: 'Legarda', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 12, departed: 3 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 92).toISOString(), location_name: 'Philcoa', bus_code: 'BUS-104', conductor_email: 'm.delacruz@byahero.com', route: 'EDSA Aircon Line', boarded: 20, departed: 7 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 111).toISOString(), location_name: 'North Avenue', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 17, departed: 5 },
    ],
    recentOperations: [
      { bus_code: 'BUS-104', route: 'EDSA Aircon Line', conductor_email: 'm.delacruz@byahero.com', total_boarded: 418, duration_min: 41, status: 'active' },
      { bus_code: 'BUS-212', route: 'Commonwealth Commuter', conductor_email: 'j.cruz@byahero.com', total_boarded: 389, duration_min: 36, status: 'completed' },
      { bus_code: 'BUS-330', route: 'España Express', conductor_email: 't.reyes@byahero.com', total_boarded: 342, duration_min: 29, status: 'active' },
      { bus_code: 'BUS-145', route: 'EDSA Aircon Line', conductor_email: 'r.santos@byahero.com', total_boarded: 311, duration_min: 34, status: 'completed' },
      { bus_code: 'BUS-220', route: 'Commonwealth Commuter', conductor_email: 'l.garcia@byahero.com', total_boarded: 286, duration_min: 27, status: 'pending' },
      { bus_code: 'BUS-411', route: 'España Express', conductor_email: 'm.delacruz@byahero.com', total_boarded: 258, duration_min: 32, status: 'completed' },
    ],
  },
  month: {
    totalTrips: 1080,
    totalPassengers: 36780,
    totalDeparted: 35920,
    averageTripMinutes: 40,
    averageFare: 28.5,
    estimatedRevenue: 1049130,
    hourlyFlow: [
      { hr: 5, total: 64 },
      { hr: 6, total: 202 },
      { hr: 7, total: 311 },
      { hr: 8, total: 406 },
      { hr: 9, total: 350 },
      { hr: 10, total: 297 },
      { hr: 11, total: 322 },
      { hr: 12, total: 338 },
      { hr: 13, total: 344 },
      { hr: 14, total: 339 },
      { hr: 15, total: 382 },
      { hr: 16, total: 407 },
      { hr: 17, total: 461 },
      { hr: 18, total: 401 },
      { hr: 19, total: 266 },
      { hr: 20, total: 148 },
    ],
    routes: [
      { name: 'EDSA Aircon Line', count: 12890, percentage: 84 },
      { name: 'Commonwealth Commuter', count: 9640, percentage: 71 },
      { name: 'Quezon Ave Link', count: 7440, percentage: 58 },
      { name: 'España Express', count: 4810, percentage: 36 },
    ],
    boardingLocations: [
      { location_name: 'North Avenue', total: 8430 },
      { location_name: 'Philcoa', total: 7610 },
      { location_name: 'España', total: 5990 },
      { location_name: 'Morayta', total: 4820 },
    ],
    buses: [
      {
        code: 'BUS-104',
        trips: 158,
        passengers: 5230,
        routes: 'EDSA Aircon Line, Quezon Ave Link',
        conductors: 'm.delacruz@byahero.com, r.santos@byahero.com',
        hotspots: [
          { location_name: 'North Avenue', total: 2012 },
          { location_name: 'Philcoa', total: 1530 },
          { location_name: 'Q.Ave', total: 942 },
          { location_name: 'España', total: 746 },
        ],
      },
      {
        code: 'BUS-212',
        trips: 139,
        passengers: 4728,
        routes: 'Commonwealth Commuter',
        conductors: 'j.cruz@byahero.com, l.garcia@byahero.com',
        hotspots: [
          { location_name: 'Commonwealth', total: 1920 },
          { location_name: 'Philcoa', total: 1454 },
          { location_name: 'Q.C. Hall', total: 1109 },
        ],
      },
      {
        code: 'BUS-330',
        trips: 124,
        passengers: 3569,
        routes: 'España Express',
        conductors: 't.reyes@byahero.com',
        hotspots: [
          { location_name: 'España', total: 1478 },
          { location_name: 'Morayta', total: 1186 },
          { location_name: 'Legarda', total: 905 },
        ],
      },
    ],
    conductors: [
      { email: 'm.delacruz@byahero.com', trips: 168, passengers: 5620 },
      { email: 'r.santos@byahero.com', trips: 159, passengers: 5411 },
      { email: 'j.cruz@byahero.com', trips: 152, passengers: 4986 },
      { email: 'l.garcia@byahero.com', trips: 147, passengers: 4742 },
    ],
    locationLogs: [
      { recorded_at: new Date().toISOString(), location_name: 'North Avenue', bus_code: 'BUS-104', conductor_email: 'm.delacruz@byahero.com', route: 'EDSA Aircon Line', boarded: 28, departed: 5 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 12).toISOString(), location_name: 'Philcoa', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 24, departed: 3 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 26).toISOString(), location_name: 'España', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 19, departed: 2 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 44).toISOString(), location_name: 'Morayta', bus_code: 'BUS-104', conductor_email: 'r.santos@byahero.com', route: 'EDSA Aircon Line', boarded: 21, departed: 5 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 61).toISOString(), location_name: 'Commonwealth', bus_code: 'BUS-212', conductor_email: 'l.garcia@byahero.com', route: 'Commonwealth Commuter', boarded: 27, departed: 4 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 77).toISOString(), location_name: 'Legarda', bus_code: 'BUS-330', conductor_email: 't.reyes@byahero.com', route: 'España Express', boarded: 17, departed: 2 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 92).toISOString(), location_name: 'Philcoa', bus_code: 'BUS-104', conductor_email: 'm.delacruz@byahero.com', route: 'EDSA Aircon Line', boarded: 22, departed: 6 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 111).toISOString(), location_name: 'North Avenue', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 20, departed: 5 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 132).toISOString(), location_name: 'Q.C. Hall', bus_code: 'BUS-330', conductor_email: 'l.garcia@byahero.com', route: 'España Express', boarded: 14, departed: 1 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 153).toISOString(), location_name: 'Morayta', bus_code: 'BUS-104', conductor_email: 'r.santos@byahero.com', route: 'EDSA Aircon Line', boarded: 18, departed: 3 },
      { recorded_at: new Date(Date.now() - 1000 * 60 * 177).toISOString(), location_name: 'España', bus_code: 'BUS-212', conductor_email: 'j.cruz@byahero.com', route: 'Commonwealth Commuter', boarded: 25, departed: 7 },
    ],
    recentOperations: [
      { bus_code: 'BUS-104', route: 'EDSA Aircon Line', conductor_email: 'm.delacruz@byahero.com', total_boarded: 1432, duration_min: 41, status: 'active' },
      { bus_code: 'BUS-212', route: 'Commonwealth Commuter', conductor_email: 'j.cruz@byahero.com', total_boarded: 1365, duration_min: 36, status: 'completed' },
      { bus_code: 'BUS-330', route: 'España Express', conductor_email: 't.reyes@byahero.com', total_boarded: 1194, duration_min: 29, status: 'active' },
      { bus_code: 'BUS-145', route: 'EDSA Aircon Line', conductor_email: 'r.santos@byahero.com', total_boarded: 1138, duration_min: 34, status: 'completed' },
      { bus_code: 'BUS-220', route: 'Commonwealth Commuter', conductor_email: 'l.garcia@byahero.com', total_boarded: 1094, duration_min: 27, status: 'pending' },
      { bus_code: 'BUS-411', route: 'España Express', conductor_email: 'm.delacruz@byahero.com', total_boarded: 978, duration_min: 32, status: 'completed' },
      { bus_code: 'BUS-532', route: 'EDSA Aircon Line', conductor_email: 'r.santos@byahero.com', total_boarded: 943, duration_min: 38, status: 'active' },
      { bus_code: 'BUS-609', route: 'Commonwealth Commuter', conductor_email: 'j.cruz@byahero.com', total_boarded: 894, duration_min: 31, status: 'completed' },
    ],
  },
};

export default function Analytics() {
  const [apiData, setApiData] = useState<ApiAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('today');
  const [expandedBus, setExpandedBus] = useState<string | null>(null);
  const [recentLimit, setRecentLimit] = useState(10);
  const [logLimit, setLogLimit] = useState(10);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAnalytics({ period });
      if (res.success) {
        setApiData(res as ApiAnalytics);
      }
    } catch (e) {
      console.warn("Analytics API failed, fallback to mock analytics data");
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period]);

  const data = useMemo<AnalyticsView>(() => {
    const base = fallbackAnalytics[period];

    if (!apiData) {
      return base;
    }

    const routeVolumes = apiData.routes?.map((route) => Number(route.passengers ?? 0)) ?? [];
    const maxRouteVolume = Math.max(...routeVolumes, 1);

    const routeList = apiData.routes?.length
      ? apiData.routes.map((route, index) => ({
          name: route.route ?? `Route ${index + 1}`,
          count: Number(route.passengers ?? 0),
          percentage: Math.max(12, Math.round((Number(route.passengers ?? 0) / maxRouteVolume) * 100)),
        }))
      : base.routes;

    const busList = apiData.buses?.length
      ? apiData.buses.map((bus) => ({
          code: bus.code ?? `Bus ${bus.bus_id ?? ''}`,
          trips: Number(bus.trips ?? 0),
          passengers: Number(bus.passengers ?? 0),
          routes: bus.routes ?? 'N/A',
          conductors: bus.conductors ?? 'N/A',
          hotspots: (bus.hotspots ?? []).map((hotspot) => ({
            location_name: hotspot.location_name ?? 'Unknown',
            total: Number(hotspot.total ?? 0),
          })),
        }))
      : base.buses;

    const hourlyFlow = apiData.hourly_flow?.length
      ? apiData.hourly_flow.map((entry) => ({
          hr: Number(entry.hr ?? 0),
          total: Number(entry.total ?? 0),
        }))
      : base.hourlyFlow;

    const boardingLocations = apiData.boarding_locations?.length
      ? apiData.boarding_locations.map((location) => ({
          location_name: location.location_name ?? 'Unknown',
          total: Number(location.total ?? 0),
        }))
      : base.boardingLocations;

    const locationLogs = apiData.location_logs?.length
      ? apiData.location_logs.map((log) => ({
          recorded_at: log.recorded_at ?? new Date().toISOString(),
          location_name: log.location_name ?? 'Terminal',
          bus_code: log.bus_code ?? '',
          conductor_email: log.conductor_email ?? '',
          route: log.route ?? '',
          boarded: Number(log.boarded ?? 0),
          departed: Number(log.departed ?? 0),
        }))
      : base.locationLogs;

    const recentOperations = apiData.recent_operations?.length
      ? apiData.recent_operations.map((operation) => ({
          bus_code: operation.bus_code ?? '',
          route: operation.route ?? '',
          conductor_email: operation.conductor_email ?? '',
          total_boarded: Number(operation.total_boarded ?? 0),
          duration_min: operation.duration_min,
          status: (operation.status as OperationRow['status']) ?? 'completed',
        }))
      : base.recentOperations;

    const conductors = apiData.conductors?.length
      ? apiData.conductors.map((conductor) => ({
          email: conductor.email ?? '',
          trips: Number(conductor.trips ?? 0),
          passengers: Number(conductor.passengers ?? 0),
        }))
      : base.conductors;

    return {
      ...base,
      totalTrips: apiData.summary?.total_trips ?? base.totalTrips,
      totalPassengers: apiData.summary?.total_passengers ?? base.totalPassengers,
      totalDeparted: apiData.summary?.total_departed ?? base.totalDeparted,
      averageTripMinutes: apiData.summary?.avg_trip_minutes ?? base.averageTripMinutes,
      averageFare: apiData.average_fare ?? base.averageFare,
      estimatedRevenue: apiData.estimated_revenue ?? base.estimatedRevenue,
      routes: routeList,
      buses: busList,
      conductors,
      hourlyFlow,
      boardingLocations,
      locationLogs,
      recentOperations,
    };
  }, [apiData, period]);

  const routeChartMax = Math.max(...data.routes.map((route) => route.count), 1);
  const hourlyMax = Math.max(...data.hourlyFlow.map((entry) => entry.total), 1);

  const hourlyPoints = data.hourlyFlow
    .map((entry, index) => {
      const width = 100 / Math.max(data.hourlyFlow.length - 1, 1);
      const x = index * width;
      const y = 100 - (entry.total / hourlyMax) * 100;
      return `${x},${y}`;
    })
    .join(' ');

  const hourlyArea = [
    '0,100',
    ...data.hourlyFlow.map((entry, index) => {
      const width = 100 / Math.max(data.hourlyFlow.length - 1, 1);
      const x = index * width;
      const y = 100 - (entry.total / hourlyMax) * 100;
      return `${x},${y}`;
    }),
    '100,100',
  ].join(' ');

  const formatTimestamp = (value: string) => {
    const date = new Date(value);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const conductorName = (email: string) => email.split('@')[0];

  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <div className="text-center py-5 text-muted">
      <div className="d-inline-flex align-items-center justify-content-center rounded-circle bg-light mb-3" style={{ width: '52px', height: '52px' }}>
        {icon}
      </div>
      <p className="fw-bold small mb-0">{message}</p>
    </div>
  );

  const heroMiniStats = [
    { label: 'Revenue', value: `₱${data.estimatedRevenue.toLocaleString()}`, icon: <Route size={18} /> },
    { label: 'Passengers', value: data.totalPassengers.toLocaleString(), icon: <Users size={18} /> },
    { label: 'Avg Fare', value: `₱${data.averageFare.toFixed(2)}`, icon: <Clock3 size={18} /> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : (
        <>
          <section className="analytics-hero analytics-surface">
            <div className="analytics-hero-copy">
              <div className="analytics-eyebrow">Fleet intelligence</div>
              <h1 className="analytics-title">Analytics Dashboard</h1>
              <p className="analytics-subtitle">Boarding activity, route share, fleet performance, and operational logs in a cleaner, denser view.</p>

              <div className="analytics-pill-row">
                {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    className={`period-pill ${period === key ? 'active' : ''}`}
                    onClick={() => setPeriod(key)}
                  >
                    {periodLabels[key]}
                  </button>
                ))}
              </div>
            </div>

            <div className="analytics-hero-panel">
              <div className="analytics-hero-panel-top">
                <div>
                  <div className="analytics-panel-label">Current period</div>
                  <div className="analytics-panel-value">{periodLabels[period]}</div>
                </div>
                <div className="analytics-panel-badge">Live data</div>
              </div>

              <div className="analytics-hero-number">{data.totalPassengers.toLocaleString()}</div>
              <div className="analytics-hero-caption">Passengers boarded across all tracked terminals and stops.</div>

              <div className="analytics-mini-grid">
                {heroMiniStats.map((stat) => (
                  <div key={stat.label} className="analytics-mini-stat">
                    <div className="analytics-mini-stat-icon">{stat.icon}</div>
                    <div>
                      <div className="analytics-mini-stat-label">{stat.label}</div>
                      <div className="analytics-mini-stat-value">{stat.value}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="analytics-hero-actions">
                <div className="analytics-hero-action-pill">{data.totalTrips.toLocaleString()} trips</div>
                <div className="analytics-hero-action-pill">{data.recentOperations.length} recent operations</div>
              </div>
            </div>
          </section>

          <div className="stats-grid">
            <div className="stat-card analytics-stat-primary">
              <span className="stat-label">Total Trips</span>
              <div className="stat-row">
                <span className="stat-count">{data.totalTrips.toLocaleString()}</span>
                <Route size={20} style={{ opacity: 0.8 }} />
              </div>
            </div>
            
            <div className="stat-card analytics-stat-success">
              <span className="stat-label">Passengers Boarded</span>
              <div className="stat-row">
                <span className="stat-count">{data.totalPassengers.toLocaleString()}</span>
                <Users size={20} style={{ opacity: 0.8 }} />
              </div>
            </div>

            <div className="stat-card analytics-stat-accent">
              <span className="stat-label">Passengers Departed</span>
              <div className="stat-row">
                <span className="stat-count">{data.totalDeparted.toLocaleString()}</span>
                <BusFront size={20} style={{ opacity: 0.8 }} />
              </div>
            </div>

            <div className="stat-card analytics-stat-warn">
              <span className="stat-label">Avg Trip Duration</span>
              <div className="stat-row">
                <span className="stat-count">{Math.round(data.averageTripMinutes)}<span style={{ fontSize: '1rem', fontWeight: 700 }}> min</span></span>
                <Clock3 size={20} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <div className="d-flex align-items-center justify-content-center flex-column text-center py-2">
              <div className="text-uppercase text-muted fw-bold small tracking-wider" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>Total Boarded Passengers</div>
              <div className="display-5 fw-bold text-success lh-sm">{data.totalPassengers.toLocaleString()}</div>
              <div className="text-muted fw-semibold small mt-2">Activity across all tracked terminals &amp; stops</div>
            </div>
            <div className="text-center mt-3 pt-3 border-top">
              <div className="text-uppercase text-muted fw-bold small tracking-wider" style={{ fontSize: '0.7rem', marginBottom: '8px' }}>Boarding Locations</div>
              <div className="d-flex flex-wrap justify-content-center gap-2 mt-2">
                {data.boardingLocations.map((location) => (
                  <span key={location.location_name} className="badge bg-light text-dark border py-2 px-3 rounded-pill fw-bold">
                    {location.location_name} — <span className="text-success">{location.total}</span> <span className="text-muted" style={{ fontSize: '0.65rem' }}>Boarded</span>
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">show_chart</span>
              Passenger Flow
            </h5>
            <div className="chart-wrap" style={{ width: '100%' }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-label="Passenger flow chart">
                <defs>
                  <linearGradient id="analyticsArea" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="rgba(29, 78, 216, 0.32)" />
                    <stop offset="100%" stopColor="rgba(29, 78, 216, 0.02)" />
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((line) => (
                  <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(148,163,184,0.15)" strokeWidth="0.6" />
                ))}
                <polygon points={hourlyArea} fill="url(#analyticsArea)" />
                <polyline points={hourlyPoints} fill="none" stroke="#1d4ed8" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                {data.hourlyFlow.map((entry, index) => {
                  const width = 100 / Math.max(data.hourlyFlow.length - 1, 1);
                  const x = index * width;
                  const y = 100 - (entry.total / hourlyMax) * 100;
                  return <circle key={`${entry.hr}-${entry.total}`} cx={x} cy={y} r="1.3" fill="#1d4ed8" />;
                })}
              </svg>
            </div>
            <div className="d-flex flex-wrap gap-2 mt-3 justify-content-between align-items-center">
              {data.hourlyFlow.slice(0, 6).map((entry) => (
                <div key={entry.hr} className="small text-muted fw-semibold">
                  {entry.hr % 12 || 12}{entry.hr >= 12 ? 'PM' : 'AM'} <span className="text-primary fw-bold">{entry.total}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">route</span>
              Route Breakdown
            </h5>
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0 text-secondary fw-semibold small">
                <thead>
                  <tr className="text-uppercase text-muted small border-bottom border-light-subtle" style={{ fontSize: '0.7rem' }}>
                    <th className="py-2">Route</th>
                    <th className="py-2">Trips</th>
                    <th className="py-2">Passengers</th>
                  </tr>
                </thead>
                <tbody>
                  {data.routes.map((route) => (
                    <tr key={route.name}>
                      <td className="text-dark fw-bold py-2">{route.name}</td>
                      <td className="py-2">{Math.max(1, Math.round((route.count / routeChartMax) * 48))}</td>
                      <td className="text-primary fw-bold py-2">{route.count.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">directions_bus</span>
              Bus Performance
            </h5>
            <p style={{ fontSize: '.75rem', color: '#64748b', marginBottom: '12px', fontWeight: 600 }}>Click on a bus to view its specific departure hotspots.</p>
            <div style={{ overflowX: 'auto' }}>
              {data.buses.length ? (
                <table className="table table-hover align-middle mb-0 text-secondary fw-semibold small">
                  <thead>
                    <tr className="text-uppercase text-muted small border-bottom border-light-subtle" style={{ fontSize: '0.7rem' }}>
                      <th className="py-2">Bus Code</th>
                      <th className="py-2">Trips</th>
                      <th className="py-2">Passengers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.buses.map((bus) => {
                      const isOpen = expandedBus === bus.code;
                      return (
                        <React.Fragment key={bus.code}>
                          <tr style={{ cursor: 'pointer' }} onClick={() => setExpandedBus(isOpen ? null : bus.code)}>
                            <td className="text-dark fw-bold py-2">
                              {isOpen ? (
                                <ChevronUp className="expand-icon align-middle" size={18} style={{ marginRight: 4 }} />
                              ) : (
                                <ChevronDown className="expand-icon align-middle" size={18} style={{ marginRight: 4 }} />
                              )}
                              {bus.code}
                            </td>
                            <td className="py-2">{bus.trips}</td>
                            <td className="text-primary fw-bold py-2">{bus.passengers.toLocaleString()}</td>
                          </tr>
                          {isOpen && (
                            <tr style={{ backgroundColor: '#fafafa' }}>
                              <td colSpan={3} className="p-0 border-0">
                                <div className="border-start border-4 border-primary p-3 bg-light-subtle rounded-end shadow-inner">
                                  <div className="row mb-3">
                                    <div className="col-6">
                                      <div className="text-uppercase text-muted fw-bold small tracking-wider mb-1" style={{ fontSize: '0.7rem' }}>Routes Taken</div>
                                      <div className="text-dark fw-bold" style={{ fontSize: '.8rem' }}>{bus.routes}</div>
                                    </div>
                                    <div className="col-6">
                                      <div className="text-uppercase text-muted fw-bold small tracking-wider mb-1" style={{ fontSize: '0.7rem' }}>Conductors</div>
                                      <div className="text-dark fw-bold" style={{ fontSize: '.8rem' }}>{bus.conductors.split(', ').map(conductorName).join(', ')}</div>
                                    </div>
                                  </div>
                                  <div className="text-uppercase text-muted fw-bold small tracking-wider mb-2" style={{ fontSize: '0.7rem' }}>Departure Hotspots</div>
                                  {bus.hotspots.length ? bus.hotspots.map((hotspot) => {
                                    const width = Math.max(6, (hotspot.total / Math.max(...bus.hotspots.map((item) => item.total), 1)) * 100);
                                    return (
                                      <div key={hotspot.location_name} className="d-flex align-items-center gap-2 mb-2">
                                        <span className="text-muted fw-bold small" style={{ minWidth: 90, fontSize: '.75rem' }}>{hotspot.location_name}</span>
                                        <div className="progress flex-grow-1" style={{ height: 6, backgroundColor: '#e2e8f0' }}>
                                          <div className="progress-bar bg-primary" role="progressbar" style={{ width: `${width}%` }} />
                                        </div>
                                        <span className="text-primary fw-bold small text-end" style={{ minWidth: 35, fontSize: '.75rem' }}>{hotspot.total.toLocaleString()}</span>
                                      </div>
                                    );
                                  }) : (
                                    <p className="small text-muted fw-bold mb-0">No departure data recorded for this bus.</p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              ) : renderEmptyState(<BusFront size={18} className="text-primary" />, 'No bus data yet')}
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">badge</span>
              Conductor Activity
            </h5>
            <div className="table-responsive">
              {data.conductors.length ? (
                <table className="table table-hover align-middle mb-0 text-secondary fw-semibold small">
                  <thead>
                    <tr className="text-uppercase text-muted small border-bottom border-light-subtle" style={{ fontSize: '0.7rem' }}>
                      <th className="py-2">Conductor</th>
                      <th className="py-2">Trips</th>
                      <th className="py-2">Passengers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.conductors.map((conductor) => (
                      <tr key={conductor.email}>
                        <td className="text-dark fw-bold py-2">{conductor.email}</td>
                        <td className="py-2">{conductor.trips}</td>
                        <td className="text-primary fw-bold py-2">{conductor.passengers.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : renderEmptyState(<BadgeInfo size={18} className="text-primary" />, 'No conductor data yet')}
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">list_alt</span>
              Location Activity Log
            </h5>
            <div style={{ overflowX: 'auto' }}>
              {data.locationLogs.length ? (
                <>
                  <table className="table table-hover align-middle mb-0 text-secondary fw-semibold small">
                    <thead>
                      <tr className="text-uppercase text-muted small border-bottom border-light-subtle" style={{ fontSize: '0.7rem' }}>
                        <th className="py-2">Time</th>
                        <th className="py-2">Location</th>
                        <th className="py-2">Bus</th>
                        <th className="py-2">Conductor</th>
                        <th className="py-2">Route</th>
                        <th className="py-2">Board</th>
                        <th className="py-2">Depart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.locationLogs.slice(0, logLimit).map((log) => (
                        <tr key={`${log.recorded_at}-${log.bus_code}`}>
                          <td className="py-2" style={{ whiteSpace: 'nowrap' }}>{formatTimestamp(log.recorded_at)}</td>
                          <td className="text-primary fw-bold py-2">{log.location_name || 'Terminal'}</td>
                          <td className="text-dark fw-bold py-2">{log.bus_code}</td>
                          <td className="py-2">{conductorName(log.conductor_email)}</td>
                          <td className="py-2" style={{ fontSize: '.75rem' }}>{log.route}</td>
                          <td className="text-success fw-bold py-2">+{log.boarded}</td>
                          <td className="text-danger fw-bold py-2">-{log.departed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.locationLogs.length > logLimit && (
                    <button type="button" className="btn btn-light btn-sm w-100 py-2 mt-2 fw-bold text-primary rounded-3 text-uppercase tracking-wider" style={{ fontSize: '.72rem' }} onClick={() => setLogLimit((value) => (value === 10 ? data.locationLogs.length : 10))}>
                      {logLimit === 10 ? `See More (${data.locationLogs.length - 10})` : 'See Less'}
                    </button>
                  )}
                </>
              ) : renderEmptyState(<MapPinned size={18} className="text-primary" />, 'No location activity recorded yet')}
            </div>
          </div>

          <div className="card border border-light-subtle shadow-sm rounded-3 p-4 mb-0 bg-white">
            <h5 className="fw-bold mb-3 d-flex align-items-center gap-2 text-dark fs-6 text-uppercase tracking-wider">
              <span className="material-icons-round text-primary fs-5">history</span>
              Recent Operations
            </h5>
            <div style={{ overflowX: 'auto' }}>
              {data.recentOperations.length ? (
                <>
                  <table className="table table-hover align-middle mb-0 text-secondary fw-semibold small">
                    <thead>
                      <tr className="text-uppercase text-muted small border-bottom border-light-subtle" style={{ fontSize: '0.7rem' }}>
                        <th className="py-2">Bus</th>
                        <th className="py-2">Route</th>
                        <th className="py-2">Conductor</th>
                        <th className="py-2">Boarded</th>
                        <th className="py-2">Duration</th>
                        <th className="py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOperations.slice(0, recentLimit).map((operation) => {
                        const statusBadge = operation.status === 'active' ? 'bg-success-subtle text-success' : operation.status === 'pending' ? 'bg-warning-subtle text-warning' : 'bg-primary-subtle text-primary';
                        const duration = operation.duration_min != null ? `${operation.duration_min} min` : '-';
                        return (
                          <tr key={`${operation.bus_code}-${operation.route}-${operation.conductor_email}`}>
                            <td className="text-dark fw-bold py-2">{operation.bus_code}</td>
                            <td className="py-2">{operation.route}</td>
                            <td className="py-2">{conductorName(operation.conductor_email)}</td>
                            <td className="text-primary fw-bold py-2">{operation.total_boarded.toLocaleString()}</td>
                            <td className="py-2">{duration}</td>
                            <td className="py-2"><span className={`badge rounded-pill fw-bold text-uppercase px-2 py-1 ${statusBadge}`} style={{ fontSize: '0.65rem' }}>{operation.status}</span></td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.recentOperations.length > recentLimit && (
                    <button type="button" className="btn btn-light btn-sm w-100 py-2 mt-2 fw-bold text-primary rounded-3 text-uppercase tracking-wider" style={{ fontSize: '.72rem' }} onClick={() => setRecentLimit((value) => (value === 10 ? data.recentOperations.length : 10))}>
                      {recentLimit === 10 ? `See More (${data.recentOperations.length - 10})` : 'See Less'}
                    </button>
                  )}
                </>
              ) : renderEmptyState(<History size={18} className="text-primary" />, 'No operations recorded yet')}
            </div>
          </div>

        </>
      )}
    </div>
  );
}
