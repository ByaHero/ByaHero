import React, { useEffect, useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  TouchableOpacity,
  RefreshControl,
  TextInput,
  Platform,
  Share,
} from 'react-native';
import AlertModal from '@/components/AlertModal';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export type PeriodKey = 'deployment' | 'today' | 'week' | 'month' | 'custom';
export type ActiveTab = 'overview' | 'buses' | 'conductors' | 'users' | 'routes' | 'operations';

export type RouteRow = {
  name: string;
  count: number;
  trips: number;
  percentage: number;
};

export type HourlyFlow = {
  hr: number;
  total: number;
};

export type BoardingLocation = {
  location_name: string;
  total: number;
};

export type BusRow = {
  bus_id?: number;
  code: string;
  total_seats: number;
  current_status: string;
  trips: number;
  passengers: number;
  departed: number;
  avg_passengers_per_trip: number;
  load_factor: number;
  total_operating_minutes: number;
  first_deployment_trip?: string;
  last_deployment_trip?: string;
  routes: string;
  conductors: string;
  conductor_emails: string;
  hotspots: BoardingLocation[];
};

export type ConductorRow = {
  conductor_id?: number;
  name: string;
  email: string;
  contacts?: string | null;
  trips: number;
  passengers: number;
  departed: number;
  avg_passengers_per_session: number;
  total_duty_minutes: number;
  first_session?: string;
  last_session?: string;
  buses_operated: string;
  routes_served: string;
};

export type CommuterItem = {
  user_id: number;
  name: string;
  email: string;
  rides_count: number;
  last_ride?: string;
};

export type UserAnalytics = {
  total_registered_users: number;
  users_with_rides: number;
  total_passenger_rides: number;
  completed_passenger_rides: number;
  active_passenger_rides: number;
  ride_history_adoption_rate: number;

  total_circles_created: number;
  circle_owners_count: number;
  total_circle_memberships: number;
  unique_circle_members: number;
  total_circle_users: number;
  circle_adoption_rate: number;
  avg_circle_size: number;

  total_sos_alerts: number;
  total_waiting_requests: number;
  top_commuters: CommuterItem[];
};

export type FleetOverview = {
  total_fleet: number;
  deployed_buses: number;
  fleet_deployment_rate: number;
};

export type ConductorOverview = {
  total_conductors: number;
  active_conductors: number;
  participation_rate: number;
};

export type DeploymentMeta = {
  earliest_op?: string;
  latest_op?: string;
  total_deployment_days?: number;
  deployed_buses_count?: number;
  deployed_conductors_count?: number;
};

export type LocationLogRow = {
  recorded_at: string;
  location_name: string;
  bus_code: string;
  conductor_name?: string;
  conductor_email: string;
  route: string;
  boarded: number;
  departed: number;
};

export type OperationRow = {
  id?: number;
  bus_code: string;
  route: string;
  conductor_name?: string;
  conductor_email: string;
  total_boarded: number;
  total_departed?: number;
  started_at?: string;
  ended_at?: string;
  duration_min?: number;
  status: string;
};

export type AnalyticsView = {
  totalTrips: number;
  totalPassengers: number;
  totalDeparted: number;
  totalPreDeparture: number;
  averageTripMinutes: number;
  averageFare: number;
  estimatedRevenue: number;
  fleetOverview: FleetOverview;
  conductorOverview: ConductorOverview;
  deploymentMeta: DeploymentMeta;
  userAnalytics: UserAnalytics;
  hourlyFlow: HourlyFlow[];
  routes: RouteRow[];
  boardingLocations: BoardingLocation[];
  departureLocations: BoardingLocation[];
  buses: BusRow[];
  conductors: ConductorRow[];
  locationLogs: LocationLogRow[];
  recentOperations: OperationRow[];
};

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [period, setPeriod] = useState<PeriodKey>('deployment');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [apiData, setApiData] = useState<any>(null);

  // Search and sort states
  const [busSearch, setBusSearch] = useState('');
  const [busSortBy, setBusSortBy] = useState<'trips' | 'passengers' | 'load_factor' | 'code'>('trips');
  const [expandedBuses, setExpandedBuses] = useState<Record<string, boolean>>({});

  const [conductorSearch, setConductorSearch] = useState('');
  const [conductorSortBy, setConductorSortBy] = useState<'trips' | 'passengers' | 'duty_time' | 'name'>('trips');

  const [seeMoreOps, setSeeMoreOps] = useState(false);
  const [seeMoreLogs, setSeeMoreLogs] = useState(false);

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void,
    onCancel?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
      onCancel: onCancel
        ? () => {
            setAlertConfig((prev) => ({ ...prev, visible: false }));
            onCancel();
          }
        : undefined,
    });
  };

  const fetchAnalytics = useCallback(async () => {
    try {
      let url = `/api/admin/analytics?period=${period}`;
      if (period === 'deployment') {
        url += `&start=2026-09-09&end=2026-09-22`;
      } else if (period === 'custom') {
        if (customStart) url += `&start=${customStart}`;
        if (customEnd) url += `&end=${customEnd}`;
      }
      const resData = await apiRequest(url);
      if (resData && resData.success !== false) {
        setApiData(resData);
      } else {
        setApiData(null);
      }
    } catch (e) {
      console.warn('[Analytics] API fetch error, using fallback if deployment', e);
      setApiData(null);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  // Normalized data memo
  const data = useMemo<AnalyticsView>(() => {
    if (!apiData) {
      return {
        totalTrips: 0,
        totalPassengers: 0,
        totalDeparted: 0,
        totalPreDeparture: 0,
        averageTripMinutes: 0,
        averageFare: 0,
        estimatedRevenue: 0,
        fleetOverview: { total_fleet: 0, deployed_buses: 0, fleet_deployment_rate: 0 },
        conductorOverview: { total_conductors: 0, active_conductors: 0, participation_rate: 0 },
        deploymentMeta: {},
        userAnalytics: {
          total_registered_users: 0,
          users_with_rides: 0,
          total_passenger_rides: 0,
          completed_passenger_rides: 0,
          active_passenger_rides: 0,
          ride_history_adoption_rate: 0,
          total_circles_created: 0,
          circle_owners_count: 0,
          total_circle_memberships: 0,
          unique_circle_members: 0,
          total_circle_users: 0,
          circle_adoption_rate: 0,
          avg_circle_size: 0,
          total_sos_alerts: 0,
          total_waiting_requests: 0,
          top_commuters: [],
        },
        hourlyFlow: [],
        routes: [],
        boardingLocations: [],
        departureLocations: [],
        buses: [],
        conductors: [],
        locationLogs: [],
        recentOperations: [],
      };
    }

    const summary = apiData.summary || {};
    const totalTrips = Number(summary.total_trips ?? 0);
    const totalPassengers = Number(summary.total_passengers ?? 0);
    const totalDeparted = Number(summary.total_departed ?? 0);
    const totalPreDeparture = Number(summary.total_pre_departure ?? 0);
    const averageTripMinutes = Number(summary.avg_trip_minutes ?? 0);
    const averageFare = Number(apiData.average_fare ?? 0);
    const estimatedRevenue = Number(apiData.estimated_revenue ?? totalPassengers * averageFare);

    // Routes
    const routeVolumes = (apiData.routes || []).map((r: any) => Number(r.passengers ?? 0));
    const maxRouteVolume = Math.max(...routeVolumes, 1);
    const routes: RouteRow[] = (apiData.routes || []).map((r: any) => ({
      name: r.route || 'Unknown Route',
      count: Number(r.passengers ?? 0),
      trips: Number(r.trips ?? 0),
      percentage: Math.max(8, Math.round((Number(r.passengers ?? 0) / maxRouteVolume) * 100)),
    }));

    // Buses
    const buses: BusRow[] = (apiData.buses || []).map((b: any) => {
      const trips = Number(b.trips ?? 0);
      const passengers = Number(b.passengers ?? 0);
      const departed = Number(b.departed ?? 0);
      const totalSeats = Number(b.total_seats ?? 25) || 25;
      const avgPax = trips > 0 ? passengers / trips : 0;
      const loadFactor = b.load_factor != null ? Number(b.load_factor) : Math.min(100, Math.round((avgPax / totalSeats) * 100));

      return {
        bus_id: b.bus_id,
        code: b.code || `Bus ${b.bus_id ?? ''}`,
        total_seats: totalSeats,
        current_status: b.current_status || b.status || 'available',
        trips,
        passengers,
        departed,
        avg_passengers_per_trip: Number(b.avg_passengers_per_trip ?? avgPax),
        load_factor: loadFactor,
        total_operating_minutes: Number(b.total_operating_minutes ?? trips * averageTripMinutes),
        first_deployment_trip: b.first_deployment_trip,
        last_deployment_trip: b.last_deployment_trip,
        routes: b.routes || 'N/A',
        conductors: b.conductors || 'N/A',
        conductor_emails: b.conductor_emails || '',
        hotspots: (b.hotspots || []).map((h: any) => ({
          location_name: h.location_name || 'Terminal',
          total: Number(h.total ?? 0),
        })),
      };
    });

    // Conductors
    const conductors: ConductorRow[] = (apiData.conductors || []).map((c: any) => {
      const trips = Number(c.trips ?? 0);
      const passengers = Number(c.passengers ?? 0);
      const avgPax = trips > 0 ? passengers / trips : 0;
      const dutyMins = Number(c.total_duty_minutes ?? trips * averageTripMinutes);

      return {
        conductor_id: c.conductor_id,
        name: c.name || (c.email ? c.email.split('@')[0] : 'Conductor'),
        email: c.email || 'N/A',
        contacts: c.contacts || null,
        trips,
        passengers,
        departed: Number(c.departed ?? 0),
        avg_passengers_per_session: Number(c.avg_passengers_per_session ?? avgPax),
        total_duty_minutes: dutyMins,
        first_session: c.first_session,
        last_session: c.last_session,
        buses_operated: c.buses_operated || 'N/A',
        routes_served: c.routes_served || 'N/A',
      };
    });

    // Fleet & Conductor Overviews
    const totalFleet = apiData.fleet_overview?.total_fleet ?? buses.length;
    const deployedBuses = apiData.fleet_overview?.deployed_buses ?? buses.length;
    const fleetDeploymentRate = totalFleet > 0 ? Math.round((deployedBuses / totalFleet) * 1000) / 10 : 0;

    const totalConductors = apiData.conductor_overview?.total_conductors ?? conductors.length;
    const activeConductors = apiData.conductor_overview?.active_conductors ?? conductors.length;
    const conductorParticipationRate = totalConductors > 0 ? Math.round((activeConductors / totalConductors) * 1000) / 10 : 0;

    // User Analytics directly from backend
    const rawUser = apiData.user_analytics || {};
    const totalRegUsers = Number(rawUser.total_registered_users ?? 0);
    const usersWithRides = Number(rawUser.users_with_rides ?? 0);
    const totalPassengerRides = Number(rawUser.total_passenger_rides ?? 0);
    const completedPassengerRides = Number(rawUser.completed_passenger_rides ?? 0);
    const activePassengerRides = Number(rawUser.active_passenger_rides ?? 0);
    const rideAdoptionRate = Number(rawUser.ride_history_adoption_rate ?? (totalRegUsers > 0 ? Math.round((usersWithRides / totalRegUsers) * 1000) / 10 : 0));

    const totalCircles = Number(rawUser.total_circles_created ?? 0);
    const circleOwners = Number(rawUser.circle_owners_count ?? 0);
    const totalCircleMemberships = Number(rawUser.total_circle_memberships ?? 0);
    const uniqueCircleMembers = Number(rawUser.unique_circle_members ?? 0);
    const totalCircleUsers = Number(rawUser.total_circle_users ?? 0);
    const circleAdoptionRate = Number(rawUser.circle_adoption_rate ?? (totalRegUsers > 0 ? Math.round((totalCircleUsers / totalRegUsers) * 1000) / 10 : 0));
    const avgCircleSize = Number(rawUser.avg_circle_size ?? (totalCircles > 0 ? Math.round(((totalCircleMemberships + circleOwners) / totalCircles) * 10) / 10 : 0));

    const rawTopCommuters = rawUser.top_commuters || [];
    const topCommuters: CommuterItem[] = rawTopCommuters.map((tc: any) => ({
      user_id: tc.user_id,
      name: tc.name || `Commuter #${tc.user_id}`,
      email: tc.email || 'commuter@byahero.com',
      rides_count: Number(tc.rides_count ?? 0),
      last_ride: tc.last_ride,
    }));

    const userAnalytics: UserAnalytics = {
      total_registered_users: totalRegUsers,
      users_with_rides: usersWithRides,
      total_passenger_rides: totalPassengerRides,
      completed_passenger_rides: completedPassengerRides,
      active_passenger_rides: activePassengerRides,
      ride_history_adoption_rate: rideAdoptionRate,
      total_circles_created: totalCircles,
      circle_owners_count: circleOwners,
      total_circle_memberships: totalCircleMemberships,
      unique_circle_members: uniqueCircleMembers,
      total_circle_users: totalCircleUsers,
      circle_adoption_rate: circleAdoptionRate,
      avg_circle_size: avgCircleSize,
      total_sos_alerts: Number(rawUser.total_sos_alerts ?? 0),
      total_waiting_requests: Number(rawUser.total_waiting_requests ?? 0),
      top_commuters: topCommuters,
    };

    // Hourly flow
    const rawHourly = apiData.hourly_flow || [];
    const hourlyFlow: HourlyFlow[] = rawHourly.map((h: any) => ({
      hr: Number(h.hr ?? 0),
      total: Number(h.total ?? 0),
    }));

    // Boarding & Departure Locations
    const rawBoarding = apiData.boarding_locations || [];
    const boardingLocations: BoardingLocation[] = rawBoarding.map((b: any) => ({
      location_name: b.location_name || 'Terminal',
      total: Number(b.total ?? 0),
    }));

    const rawDepartures = apiData.departure_locations || [];
    const departureLocations: BoardingLocation[] = rawDepartures.map((b: any) => ({
      location_name: b.location_name || 'Terminal',
      total: Number(b.total ?? 0),
    }));

    // Logs & Operations
    const locationLogs: LocationLogRow[] = (apiData.location_logs || []).map((l: any) => ({
      recorded_at: l.recorded_at || new Date().toISOString(),
      location_name: l.location_name || 'Terminal',
      bus_code: l.bus_code || 'N/A',
      conductor_name: l.conductor_name,
      conductor_email: l.conductor_email || 'N/A',
      route: l.route || 'N/A',
      boarded: Number(l.boarded ?? 0),
      departed: Number(l.departed ?? 0),
    }));

    const recentOperations: OperationRow[] = (apiData.recent_operations || []).map((o: any) => ({
      id: o.id,
      bus_code: o.bus_code || 'N/A',
      route: o.route || 'N/A',
      conductor_name: o.conductor_name,
      conductor_email: o.conductor_email || 'N/A',
      total_boarded: Number(o.total_boarded ?? 0),
      total_departed: Number(o.total_departed ?? 0),
      started_at: o.started_at,
      ended_at: o.ended_at,
      duration_min: o.duration_min != null ? Number(o.duration_min) : undefined,
      status: o.status || 'completed',
    }));

    return {
      totalTrips,
      totalPassengers,
      totalDeparted,
      totalPreDeparture,
      averageTripMinutes,
      averageFare,
      estimatedRevenue,
      fleetOverview: {
        total_fleet: totalFleet,
        deployed_buses: deployedBuses,
        fleet_deployment_rate: fleetDeploymentRate,
      },
      conductorOverview: {
        total_conductors: totalConductors,
        active_conductors: activeConductors,
        participation_rate: conductorParticipationRate,
      },
      deploymentMeta: apiData.deployment_meta || {},
      userAnalytics,
      routes,
      buses,
      conductors,
      hourlyFlow,
      boardingLocations,
      departureLocations,
      locationLogs,
      recentOperations,
    };
  }, [apiData]);

  // Bus filtering and sorting
  const filteredBuses = useMemo(() => {
    let list = [...data.buses];
    if (busSearch.trim()) {
      const q = busSearch.toLowerCase().trim();
      list = list.filter(
        (b) =>
          b.code.toLowerCase().includes(q) ||
          b.conductors.toLowerCase().includes(q) ||
          b.routes.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (busSortBy === 'trips') return b.trips - a.trips;
      if (busSortBy === 'passengers') return b.passengers - a.passengers;
      if (busSortBy === 'load_factor') return b.load_factor - a.load_factor;
      if (busSortBy === 'code') return a.code.localeCompare(b.code);
      return 0;
    });

    return list;
  }, [data.buses, busSearch, busSortBy]);

  // Conductor filtering and sorting
  const filteredConductors = useMemo(() => {
    let list = [...data.conductors];
    if (conductorSearch.trim()) {
      const q = conductorSearch.toLowerCase().trim();
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.email.toLowerCase().includes(q) ||
          c.buses_operated.toLowerCase().includes(q) ||
          c.routes_served.toLowerCase().includes(q)
      );
    }

    list.sort((a, b) => {
      if (conductorSortBy === 'trips') return b.trips - a.trips;
      if (conductorSortBy === 'passengers') return b.passengers - a.passengers;
      if (conductorSortBy === 'duty_time') return b.total_duty_minutes - a.total_duty_minutes;
      if (conductorSortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });

    return list;
  }, [data.conductors, conductorSearch, conductorSortBy]);

  const toggleBusDetails = (code: string) => {
    setExpandedBuses((prev) => ({ ...prev, [code]: !prev[code] }));
  };

  // PDF Report Generation
  const generatePDF = async () => {
    if (!data) return;
    try {
      const periodTitle =
        period === 'deployment'
          ? 'Official Sept 9 - 22, 2026 Deployment Period'
          : period === 'custom'
          ? `Custom Range (${customStart || 'Start'} to ${customEnd || 'End'})`
          : period.toUpperCase();

      const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8" />
            <title>ByaHero Deployment Analytics Report</title>
            <style>
              body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b; padding: 24px; line-height: 1.5; }
              .header { border-bottom: 3px solid #1d4ed8; padding-bottom: 12px; margin-bottom: 24px; }
              .header h1 { color: #0f3878; margin: 0 0 4px 0; font-size: 24px; font-weight: 800; }
              .header p { color: #64748b; font-size: 13px; margin: 0; font-weight: 600; }
              .kpi-grid { display: flex; flex-wrap: wrap; gap: 12px; margin-bottom: 24px; }
              .kpi-card { flex: 1; min-width: 140px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 10px; padding: 12px; text-align: center; }
              .kpi-val { font-size: 20px; font-weight: 800; color: #1d4ed8; }
              .kpi-lbl { font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 4px; }
              .section-title { font-size: 15px; font-weight: 800; color: #0f3878; margin: 24px 0 12px 0; border-left: 4px solid #1d4ed8; padding-left: 8px; text-transform: uppercase; tracking-wide; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px; }
              th { background: #f1f5f9; padding: 8px; text-align: left; border-bottom: 2px solid #cbd5e1; color: #475569; font-weight: 700; text-transform: uppercase; font-size: 9px; }
              td { padding: 8px; border-bottom: 1px solid #e2e8f0; color: #334155; }
              tr:nth-child(even) { background-color: #fafafa; }
              .badge { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 700; background: #dbeafe; color: #1e40af; }
              .footer { margin-top: 40px; text-align: center; font-size: 10px; color: #94a3b8; border-top: 1px solid #e2e8f0; padding-top: 12px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ByaHero Telemetry & Deployment Analytics</h1>
              <p>Period: ${periodTitle} | Generated on ${new Date().toLocaleString()}</p>
            </div>
            
            <div class="kpi-grid">
              <div class="kpi-card">
                <div class="kpi-val">${Number(data.totalTrips || 0).toLocaleString()}</div>
                <div class="kpi-lbl">Total Trips</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${Number(data.totalPassengers || 0).toLocaleString()}</div>
                <div class="kpi-lbl">Passengers Boarded</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${Number(data.totalDeparted || 0).toLocaleString()}</div>
                <div class="kpi-lbl">Passengers Departed</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${data.fleetOverview?.fleet_deployment_rate || 0}%</div>
                <div class="kpi-lbl">Fleet Deployed (${data.fleetOverview?.deployed_buses || 0}/${data.fleetOverview?.total_fleet || 50})</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">${data.conductorOverview?.participation_rate || 0}%</div>
                <div class="kpi-lbl">Active Conductors (${data.conductorOverview?.active_conductors || 0}/${data.conductorOverview?.total_conductors || 26})</div>
              </div>
              <div class="kpi-card">
                <div class="kpi-val">₱${Number(data.estimatedRevenue || 0).toLocaleString()}</div>
                <div class="kpi-lbl">Est. Revenue</div>
              </div>
            </div>

            <div class="section-title">Commuter & Safety Analytics</div>
            <table>
              <tr>
                <th>Registered Users</th>
                <th>Ride Adopters</th>
                <th>Total Rides</th>
                <th>Circles Created</th>
                <th>Circle Adoption %</th>
                <th>Unique Circle Members</th>
                <th>SOS Alerts</th>
              </tr>
              <tr>
                <td>${data.userAnalytics.total_registered_users}</td>
                <td>${data.userAnalytics.users_with_rides} (${data.userAnalytics.ride_history_adoption_rate}%)</td>
                <td>${data.userAnalytics.total_passenger_rides}</td>
                <td>${data.userAnalytics.total_circles_created}</td>
                <td>${data.userAnalytics.circle_adoption_rate}%</td>
                <td>${data.userAnalytics.unique_circle_members}</td>
                <td>${data.userAnalytics.total_sos_alerts}</td>
              </tr>
            </table>

            <div class="section-title">Bus Fleet Telemetry</div>
            <table>
              <tr>
                <th>Bus Code</th>
                <th>Status</th>
                <th>Trips</th>
                <th>Passengers</th>
                <th>Load Factor</th>
                <th>Duty Time</th>
                <th>Conductors</th>
              </tr>
              ${data.buses?.slice(0, 30).map(b => `
                <tr>
                  <td><b>${b.code}</b></td>
                  <td><span class="badge">${b.current_status}</span></td>
                  <td>${b.trips}</td>
                  <td>${Number(b.passengers).toLocaleString()}</td>
                  <td>${b.load_factor}%</td>
                  <td>${Math.round(b.total_operating_minutes / 60)}h ${b.total_operating_minutes % 60}m</td>
                  <td>${(b.conductors || '').substring(0, 30)}</td>
                </tr>
              `).join('') || '<tr><td colspan="7">No bus data</td></tr>'}
            </table>

            <div class="section-title">Conductor Session Leaderboard</div>
            <table>
              <tr>
                <th>Conductor</th>
                <th>Email</th>
                <th>Trips</th>
                <th>Passengers</th>
                <th>Avg Pax/Session</th>
                <th>Total Duty Time</th>
              </tr>
              ${data.conductors?.slice(0, 20).map(c => `
                <tr>
                  <td><b>${c.name}</b></td>
                  <td>${c.email}</td>
                  <td>${c.trips}</td>
                  <td>${Number(c.passengers).toLocaleString()}</td>
                  <td>${c.avg_passengers_per_session}</td>
                  <td>${Math.round(c.total_duty_minutes / 60)}h ${c.total_duty_minutes % 60}m</td>
                </tr>
              `).join('') || '<tr><td colspan="6">No conductor data</td></tr>'}
            </table>

            <div class="section-title">Route Breakdown</div>
            <table>
              <tr><th>Route Name</th><th>Trips</th><th>Passengers Boarded</th></tr>
              ${data.routes?.map(r => `<tr><td><b>${r.name}</b></td><td>${r.trips}</td><td>${Number(r.count).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No route data</td></tr>'}
            </table>

            <div class="section-title">Top Boarding Terminals & Stops</div>
            <table>
              <tr><th>Terminal / Stop Name</th><th>Passengers Boarded</th></tr>
              ${data.boardingLocations?.slice(0, 10).map(l => `<tr><td>${l.location_name}</td><td>${Number(l.total).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="2">No location data</td></tr>'}
            </table>

            <div class="footer">
              ByaHero Automated Telemetry System &copy; 2026. Official Administrative Defense Record.
            </div>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);

        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();

        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 500);
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
      }
    } catch (err) {
      console.warn('PDF Error:', err);
      showAlert('Export Error', 'Failed to generate PDF report', 'error');
    }
  };

  // CSV Export Generation
  const generateCSV = async () => {
    if (!data) return;
    try {
      let csv = '=== BYAHERO ANALYTICS TELEMETRY EXPORT ===\n';
      csv += `Period,${period.toUpperCase()}\n`;
      csv += `Generated,${new Date().toLocaleString()}\n\n`;

      csv += '=== SUMMARY KPI ===\n';
      csv += `Total Trips,${data.totalTrips}\n`;
      csv += `Passengers Boarded,${data.totalPassengers}\n`;
      csv += `Passengers Departed,${data.totalDeparted}\n`;
      csv += `Fleet Deployment Rate %,${data.fleetOverview.fleet_deployment_rate}%\n`;
      csv += `Conductor Participation %,${data.conductorOverview.participation_rate}%\n`;
      csv += `Estimated Revenue,PHP ${data.estimatedRevenue}\n\n`;

      csv += '=== BUS FLEET TELEMETRY ===\n';
      csv += 'Bus Code,Seats,Status,Trips,Passengers Boarded,Passengers Departed,Avg Pax/Trip,Load Factor %,Operating Mins,Conductors,Routes\n';
      data.buses.forEach((b) => {
        csv += `"${b.code}",${b.total_seats},"${b.current_status}",${b.trips},${b.passengers},${b.departed},${b.avg_passengers_per_trip},${b.load_factor}%,${b.total_operating_minutes},"${b.conductors}","${b.routes}"\n`;
      });
      csv += '\n';

      csv += '=== CONDUCTOR DUTY LEADERBOARD ===\n';
      csv += 'Conductor Name,Email,Trips,Passengers,Avg Pax/Session,Duty Mins,Buses Operated,Routes Served\n';
      data.conductors.forEach((c) => {
        csv += `"${c.name}","${c.email}",${c.trips},${c.passengers},${c.avg_passengers_per_session},${c.total_duty_minutes},"${c.buses_operated}","${c.routes_served}"\n`;
      });
      csv += '\n';

      csv += '=== USER & COMMUTER METRICS ===\n';
      csv += `Total Registered Users,${data.userAnalytics.total_registered_users}\n`;
      csv += `Users with Ride History,${data.userAnalytics.users_with_rides}\n`;
      csv += `Ride History Adoption %,${data.userAnalytics.ride_history_adoption_rate}%\n`;
      csv += `Total Circles Created,${data.userAnalytics.total_circles_created}\n`;
      csv += `Circle Adoption %,${data.userAnalytics.circle_adoption_rate}%\n`;
      csv += `Total SOS Alerts,${data.userAnalytics.total_sos_alerts}\n`;
      csv += `Total Waiting Requests,${data.userAnalytics.total_waiting_requests}\n\n`;

      csv += '=== TOP COMMUTERS LEADERBOARD ===\n';
      csv += 'User ID,Name,Email,Rides Count,Last Ride\n';
      data.userAnalytics.top_commuters.forEach((tc) => {
        csv += `${tc.user_id},"${tc.name}","${tc.email}",${tc.rides_count},"${tc.last_ride || 'N/A'}"\n`;
      });

      if (Platform.OS === 'web') {
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', `byahero_analytics_${period}_${Date.now()}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        await Share.share({
          title: 'ByaHero Analytics CSV Export',
          message: csv,
        });
      }
    } catch (e) {
      console.warn('CSV Export error:', e);
      showAlert('Export Error', 'Failed to export CSV dataset', 'error');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Analytics & Deployment Telemetry" />

      {/* Header & Controls */}
      <View style={tw`p-5 pb-3`}>
        <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Analytics Dashboard</Text>
        <Text style={tw`text-slate-500 text-[12px] font-medium mt-0.5`}>
          {period === 'deployment' ? 'Official Sept 9 – 22, 2026 Deployment Telemetry' : 'Real-time Operations & Commuter Analytics'}
        </Text>

        {/* Period Selector Buttons */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-4`}>
          <View style={tw`flex-row bg-slate-200/70 p-1 rounded-2xl items-center gap-1`}>
            {[
              { id: 'deployment', label: 'Deployment (Sept 9–22)' },
              { id: 'today', label: 'Today' },
              { id: 'week', label: 'This Week' },
              { id: 'month', label: 'This Month' },
              { id: 'custom', label: 'Custom' },
            ].map((p) => {
              const active = period === p.id;
              return (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setPeriod(p.id as PeriodKey)}
                  style={tw`px-3.5 py-2 rounded-xl flex-row items-center ${active ? 'bg-white shadow-sm' : ''}`}
                >
                  {p.id === 'deployment' && (
                    <Ionicons name="sparkles" size={13} color={active ? '#1d4ed8' : '#64748b'} style={tw`mr-1`} />
                  )}
                  <Text style={tw`font-bold text-[12px] ${active ? 'text-[#1d4ed8]' : 'text-slate-600'}`}>
                    {p.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>

        {/* Custom date range input */}
        {period === 'custom' && (
          <View style={tw`flex-row flex-wrap items-center mt-3 gap-2 bg-white p-3 rounded-2xl border border-slate-200`}>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={customStart}
                onChange={(e: any) => setCustomStart(e.target.value)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  minWidth: '120px',
                  outline: 'none',
                }}
              />
            ) : (
              <TextInput
                style={tw`bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] min-w-[100px]`}
                placeholder="YYYY-MM-DD"
                value={customStart}
                onChangeText={setCustomStart}
              />
            )}
            <Text style={tw`text-slate-400 font-bold text-[12px]`}>to</Text>
            {Platform.OS === 'web' ? (
              <input
                type="date"
                value={customEnd}
                onChange={(e: any) => setCustomEnd(e.target.value)}
                style={{
                  backgroundColor: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '8px',
                  padding: '6px 10px',
                  fontSize: '12px',
                  minWidth: '120px',
                  outline: 'none',
                }}
              />
            ) : (
              <TextInput
                style={tw`bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-[12px] min-w-[100px]`}
                placeholder="YYYY-MM-DD"
                value={customEnd}
                onChangeText={setCustomEnd}
              />
            )}
            <TouchableOpacity onPress={fetchAnalytics} style={tw`bg-[#1d4ed8] px-3.5 py-1.5 rounded-lg`}>
              <Text style={tw`text-white font-bold text-[12px]`}>Apply</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Action Export Buttons */}
        <View style={tw`flex-row gap-2 mt-3`}>
          <TouchableOpacity
            onPress={generatePDF}
            style={tw`flex-1 flex-row items-center justify-center bg-[#1d4ed8] px-4 py-2.5 rounded-xl shadow-sm`}
          >
            <Ionicons name="document-text" size={16} color="white" style={tw`mr-1.5`} />
            <Text style={tw`text-white font-bold text-[13px]`}>Export PDF Report</Text>
          </TouchableOpacity>

          <TouchableOpacity
            onPress={generateCSV}
            style={tw`flex-row items-center justify-center bg-emerald-600 px-4 py-2.5 rounded-xl shadow-sm`}
          >
            <Ionicons name="download-outline" size={16} color="white" style={tw`mr-1.5`} />
            <Text style={tw`text-white font-bold text-[13px]`}>Export CSV</Text>
          </TouchableOpacity>
        </View>

        {/* Nav Tabs */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`mt-4 border-b border-slate-200 pb-1`}>
          <View style={tw`flex-row gap-1`}>
            {[
              { id: 'overview', label: 'Overview', icon: 'grid-outline' },
              { id: 'buses', label: `Buses (${data.buses.length})`, icon: 'bus-outline' },
              { id: 'conductors', label: `Conductors (${data.conductors.length})`, icon: 'people-outline' },
              { id: 'users', label: 'Users & Commuters', icon: 'person-add-outline' },
              { id: 'routes', label: 'Routes', icon: 'navigate-outline' },
              { id: 'operations', label: 'Operations Log', icon: 'time-outline' },
            ].map((tab) => {
              const active = activeTab === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setActiveTab(tab.id as ActiveTab)}
                  style={tw`flex-row items-center px-4 py-2 rounded-xl border ${
                    active ? 'bg-[#1d4ed8] border-[#1d4ed8]' : 'bg-white border-slate-200'
                  }`}
                >
                  <Ionicons name={tab.icon as any} size={15} color={active ? 'white' : '#64748b'} style={tw`mr-1.5`} />
                  <Text style={tw`font-bold text-[12px] ${active ? 'text-white' : 'text-slate-600'}`}>
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </ScrollView>
      </View>

      {/* Main Content Area */}
      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center py-20`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
          <Text style={tw`text-slate-400 font-medium text-[12px] mt-3`}>Processing analytics data...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw`pb-12 pt-2`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <View>
              {/* Summary Stats Grid */}
              <View style={tw`flex-row flex-wrap px-3 mb-4`}>
                {[
                  { label: 'Total Trips', val: Number(data.totalTrips || 0).toLocaleString(), icon: 'car-sport', color: '#1d4ed8' },
                  { label: 'Pax Boarded', val: Number(data.totalPassengers || 0).toLocaleString(), icon: 'log-in', color: '#0284c7' },
                  { label: 'Pax Departed', val: Number(data.totalDeparted || 0).toLocaleString(), icon: 'log-out', color: '#059669' },
                  { label: 'Avg Trip Time', val: `${Math.round(Number(data.averageTripMinutes || 0))}m`, icon: 'time', color: '#d97706' },
                  { label: 'Est. Revenue', val: `₱${Number(data.estimatedRevenue || 0).toLocaleString()}`, icon: 'cash', color: '#16a34a' },
                  { label: 'Pre-Departures', val: Number(data.totalPreDeparture || 0).toLocaleString(), icon: 'footsteps', color: '#7c3aed' },
                ].map((stat, i) => (
                  <View key={i} style={tw`w-[50%] p-1.5`}>
                    <View style={tw`bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex-row items-center justify-between h-[82px]`}>
                      <View>
                        <Text style={tw`text-[22px] font-extrabold text-slate-800`}>{stat.val}</Text>
                        <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-wider mt-0.5`}>{stat.label}</Text>
                      </View>
                      <View style={tw`w-9 h-9 rounded-xl justify-center items-center bg-slate-50 border border-slate-100`}>
                        <Ionicons name={stat.icon as any} size={18} color={stat.color} />
                      </View>
                    </View>
                  </View>
                ))}
              </View>

              {/* Fleet & Staff Telemetry Highlights */}
              <View style={tw`flex-row flex-wrap px-3 mb-5`}>
                <View style={tw`w-[50%] p-1.5`}>
                  <View style={tw`bg-blue-600 rounded-2xl p-4 shadow-sm text-white justify-between min-h-[105px]`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={tw`text-blue-100 text-[10px] font-bold uppercase tracking-wider`}>Fleet Deployment</Text>
                      <Ionicons name="bus-outline" size={16} color="white" />
                    </View>
                    <Text style={tw`text-white text-2xl font-black`}>{data.fleetOverview.fleet_deployment_rate}%</Text>
                    <Text style={tw`text-blue-100 text-[11px] font-medium mt-1`}>
                      {data.fleetOverview.deployed_buses} of {data.fleetOverview.total_fleet} buses deployed
                    </Text>
                  </View>
                </View>

                <View style={tw`w-[50%] p-1.5`}>
                  <View style={tw`bg-indigo-600 rounded-2xl p-4 shadow-sm text-white justify-between min-h-[105px]`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={tw`text-indigo-100 text-[10px] font-bold uppercase tracking-wider`}>Conductor Duty Rate</Text>
                      <Ionicons name="people-outline" size={16} color="white" />
                    </View>
                    <Text style={tw`text-white text-2xl font-black`}>{data.conductorOverview.participation_rate}%</Text>
                    <Text style={tw`text-indigo-100 text-[11px] font-medium mt-1`}>
                      {data.conductorOverview.active_conductors} of {data.conductorOverview.total_conductors} active on duty
                    </Text>
                  </View>
                </View>
              </View>

              {/* Boarding Hotspots */}
              <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-2 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Top Terminal Boarding Hotspots</Text>
                  <Ionicons name="location" size={18} color="#1d4ed8" />
                </View>
                <Text style={tw`text-slate-400 text-[11px] font-medium mb-4`}>
                  Concentration of passenger boardings recorded across terminals
                </Text>
                <View style={tw`flex-row flex-wrap gap-2`}>
                  {data.boardingLocations?.length ? (
                    data.boardingLocations.map((loc, i) => (
                      <View key={i} style={tw`bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2 flex-row items-center`}>
                        <Ionicons name="pin" size={14} color="#1d4ed8" style={tw`mr-1.5`} />
                        <Text style={tw`font-bold text-slate-700 text-[12px] mr-2`}>{loc.location_name}</Text>
                        <View style={tw`bg-blue-100 px-2 py-0.5 rounded-full`}>
                          <Text style={tw`text-[#1d4ed8] font-extrabold text-[11px]`}>+{Number(loc.total).toLocaleString()}</Text>
                        </View>
                      </View>
                    ))
                  ) : (
                    <Text style={tw`text-slate-400 text-[12px] italic`}>No terminal boarding logs</Text>
                  )}
                </View>
              </View>

              {/* Passenger Flow (Hourly) */}
              <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-1 justify-between`}>
                  <View style={tw`flex-row items-center`}>
                    <Ionicons name="stats-chart" size={18} color="#1d4ed8" style={tw`mr-2`} />
                    <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Passenger Flow (Hourly)</Text>
                  </View>
                </View>
                <Text style={tw`text-slate-400 text-[11px] font-medium mb-4`}>Boarding distribution by hour of day</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                  <View style={tw`flex-row items-end h-[140px] pt-4`}>
                    {data.hourlyFlow?.map((f, i) => {
                      const maxVal = Math.max(...data.hourlyFlow.map((hl) => Number(hl.total)), 1);
                      const hPct = maxVal > 0 ? (Number(f.total) / maxVal) * 100 : 0;
                      return (
                        <View key={i} style={tw`items-center mx-2 w-[28px]`}>
                          <Text style={tw`text-[#1d4ed8] font-black text-[10px] mb-1`}>{f.total}</Text>
                          <View style={[tw`w-[18px] bg-[#1d4ed8] rounded-t-md`, { height: `${hPct}%`, minHeight: 4 }]} />
                          <Text style={tw`text-slate-400 font-bold text-[9px] mt-2`}>{f.hr}:00</Text>
                        </View>
                      );
                    })}
                    {!data.hourlyFlow?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No hourly flow data</Text>}
                  </View>
                </ScrollView>
              </View>
            </View>
          )}

          {/* TAB 2: BUS FLEET TELEMETRY */}
          {activeTab === 'buses' && (
            <View style={tw`px-5`}>
              {/* Summary Card */}
              <View style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200`}>
                <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2`}>Fleet Telemetry Overview</Text>
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <View>
                    <Text style={tw`text-3xl font-black text-slate-800`}>{data.fleetOverview.deployed_buses} / {data.fleetOverview.total_fleet}</Text>
                    <Text style={tw`text-slate-500 text-[12px] font-medium`}>Active Buses Deployed</Text>
                  </View>
                  <View style={tw`bg-blue-50 border border-blue-200 px-4 py-2 rounded-2xl`}>
                    <Text style={tw`text-[#1d4ed8] font-black text-xl`}>{data.fleetOverview.fleet_deployment_rate}%</Text>
                    <Text style={tw`text-blue-600 text-[9px] font-bold uppercase tracking-wider`}>Deployment Rate</Text>
                  </View>
                </View>
              </View>

              {/* Search & Sort Controls */}
              <View style={tw`flex-row gap-2 mb-4`}>
                <View style={tw`flex-1 bg-white border border-slate-200 rounded-xl px-3 flex-row items-center`}>
                  <Ionicons name="search" size={16} color="#94a3b8" style={tw`mr-2`} />
                  <TextInput
                    style={tw`flex-1 py-2 text-[13px] text-slate-800`}
                    placeholder="Search bus code, conductor..."
                    value={busSearch}
                    onChangeText={setBusSearch}
                  />
                  {busSearch ? (
                    <TouchableOpacity onPress={() => setBusSearch('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`self-center`}>
                  <View style={tw`flex-row bg-slate-200/60 p-1 rounded-xl gap-1`}>
                    {[
                      { id: 'trips', label: 'Trips' },
                      { id: 'passengers', label: 'Pax' },
                      { id: 'load_factor', label: 'Load %' },
                      { id: 'code', label: 'Code' },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setBusSortBy(s.id as any)}
                        style={tw`px-2.5 py-1.5 rounded-lg ${busSortBy === s.id ? 'bg-white shadow-sm' : ''}`}
                      >
                        <Text style={tw`text-[11px] font-bold ${busSortBy === s.id ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Bus Cards List */}
              {filteredBuses.map((b, i) => {
                const expanded = expandedBuses[b.code];
                return (
                  <View key={i} style={tw`bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-200`}>
                    <TouchableOpacity onPress={() => toggleBusDetails(b.code)} style={tw`flex-row justify-between items-center`}>
                      <View style={tw`flex-row items-center`}>
                        <View style={tw`w-10 h-10 rounded-xl bg-blue-50 border border-blue-100 justify-center items-center mr-3`}>
                          <Ionicons name="bus" size={20} color="#1d4ed8" />
                        </View>
                        <View>
                          <Text style={tw`font-extrabold text-slate-800 text-[15px]`}>{b.code}</Text>
                          <Text style={tw`text-slate-400 text-[11px]`}>{b.total_seats} Seats • {b.current_status}</Text>
                        </View>
                      </View>
                      <View style={tw`items-end`}>
                        <Text style={tw`font-black text-[#1d4ed8] text-[16px]`}>{Number(b.passengers).toLocaleString()} pax</Text>
                        <Text style={tw`text-slate-500 text-[11px] font-bold`}>{b.trips} trips</Text>
                      </View>
                    </TouchableOpacity>

                    {/* Progress Bar Load Factor */}
                    <View style={tw`mt-3 border-t border-slate-100 pt-3`}>
                      <View style={tw`flex-row justify-between items-center mb-1`}>
                        <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Load Factor</Text>
                        <Text style={tw`text-[#1d4ed8] text-[11px] font-extrabold`}>{b.load_factor}%</Text>
                      </View>
                      <View style={tw`h-2 bg-slate-100 rounded-full overflow-hidden`}>
                        <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${Math.min(100, b.load_factor)}%` }]} />
                      </View>
                    </View>

                    {/* Expandable Details */}
                    {expanded && (
                      <View style={tw`mt-3 pt-3 border-t border-slate-100 bg-slate-50/70 p-3 rounded-xl border border-slate-100`}>
                        <View style={tw`flex-row mb-2`}>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Conductors</Text>
                            <Text style={tw`text-slate-700 font-bold text-[11px]`}>{b.conductors || 'N/A'}</Text>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Routes Served</Text>
                            <Text style={tw`text-slate-700 font-bold text-[11px]`}>{b.routes || 'N/A'}</Text>
                          </View>
                        </View>

                        <View style={tw`flex-row mb-3`}>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Operating Time</Text>
                            <Text style={tw`text-slate-700 font-bold text-[11px]`}>
                              {Math.round(b.total_operating_minutes / 60)}h {b.total_operating_minutes % 60}m
                            </Text>
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Avg Pax / Trip</Text>
                            <Text style={tw`text-slate-700 font-bold text-[11px]`}>{b.avg_passengers_per_trip.toFixed(1)} pax</Text>
                          </View>
                        </View>

                        {/* Hotspots */}
                        <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-2`}>Departure Hotspots</Text>
                        {!b.hotspots?.length ? (
                          <Text style={tw`text-slate-400 italic text-[11px]`}>No departure logs</Text>
                        ) : (
                          b.hotspots.slice(0, 3).map((h, hi) => (
                            <View key={hi} style={tw`flex-row items-center mb-1`}>
                              <Text style={tw`text-slate-600 font-medium text-[11px] flex-1`} numberOfLines={1}>
                                {h.location_name}
                              </Text>
                              <Text style={tw`text-[#1d4ed8] font-extrabold text-[11px]`}>+{h.total}</Text>
                            </View>
                          ))
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
              {!filteredBuses.length && (
                <Text style={tw`text-center py-8 text-slate-400 italic text-[13px]`}>No matching bus telemetry records</Text>
              )}
            </View>
          )}

          {/* TAB 3: CONDUCTORS LEADERBOARD */}
          {activeTab === 'conductors' && (
            <View style={tw`px-5`}>
              {/* Summary Banner */}
              <View style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200`}>
                <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2`}>Conductor Session Leaderboard</Text>
                <View style={tw`flex-row justify-between items-center`}>
                  <View>
                    <Text style={tw`text-3xl font-black text-slate-800`}>
                      {data.conductorOverview.active_conductors} / {data.conductorOverview.total_conductors}
                    </Text>
                    <Text style={tw`text-slate-500 text-[12px] font-medium`}>Active Duty Conductors</Text>
                  </View>
                  <View style={tw`bg-indigo-50 border border-indigo-200 px-4 py-2 rounded-2xl`}>
                    <Text style={tw`text-indigo-600 font-black text-xl`}>{data.conductorOverview.participation_rate}%</Text>
                    <Text style={tw`text-indigo-500 text-[9px] font-bold uppercase tracking-wider`}>Participation</Text>
                  </View>
                </View>
              </View>

              {/* Search & Sort Controls */}
              <View style={tw`flex-row gap-2 mb-4`}>
                <View style={tw`flex-1 bg-white border border-slate-200 rounded-xl px-3 flex-row items-center`}>
                  <Ionicons name="search" size={16} color="#94a3b8" style={tw`mr-2`} />
                  <TextInput
                    style={tw`flex-1 py-2 text-[13px] text-slate-800`}
                    placeholder="Search conductor name, email..."
                    value={conductorSearch}
                    onChangeText={setConductorSearch}
                  />
                  {conductorSearch ? (
                    <TouchableOpacity onPress={() => setConductorSearch('')}>
                      <Ionicons name="close-circle" size={16} color="#94a3b8" />
                    </TouchableOpacity>
                  ) : null}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw`self-center`}>
                  <View style={tw`flex-row bg-slate-200/60 p-1 rounded-xl gap-1`}>
                    {[
                      { id: 'trips', label: 'Trips' },
                      { id: 'passengers', label: 'Pax' },
                      { id: 'duty_time', label: 'Duty' },
                      { id: 'name', label: 'Name' },
                    ].map((s) => (
                      <TouchableOpacity
                        key={s.id}
                        onPress={() => setConductorSortBy(s.id as any)}
                        style={tw`px-2.5 py-1.5 rounded-lg ${conductorSortBy === s.id ? 'bg-white shadow-sm' : ''}`}
                      >
                        <Text style={tw`text-[11px] font-bold ${conductorSortBy === s.id ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
                          {s.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>

              {/* Conductor Cards */}
              {filteredConductors.map((c, i) => (
                <View key={i} style={tw`bg-white rounded-2xl p-4 mb-3 shadow-sm border border-slate-200`}>
                  <View style={tw`flex-row justify-between items-center mb-2`}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <View style={tw`w-8 h-8 rounded-full bg-[#1d4ed8] justify-center items-center mr-2.5`}>
                        <Text style={tw`text-white font-extrabold text-[12px]`}>#{i + 1}</Text>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`font-extrabold text-slate-800 text-[14px]`} numberOfLines={1}>
                          {c.name}
                        </Text>
                        <Text style={tw`text-slate-400 text-[11px]`} numberOfLines={1}>
                          {c.email}
                        </Text>
                      </View>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={tw`font-black text-[#1d4ed8] text-[15px]`}>{Number(c.passengers).toLocaleString()} pax</Text>
                      <Text style={tw`text-slate-500 text-[11px] font-bold`}>{c.trips} trips</Text>
                    </View>
                  </View>

                  <View style={tw`bg-slate-50 p-2.5 rounded-xl flex-row justify-between items-center mt-1 border border-slate-100`}>
                    <View>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Duty Duration</Text>
                      <Text style={tw`text-slate-700 font-extrabold text-[11px]`}>
                        {Math.round(c.total_duty_minutes / 60)}h {c.total_duty_minutes % 60}m
                      </Text>
                    </View>
                    <View>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Avg Pax / Session</Text>
                      <Text style={tw`text-slate-700 font-extrabold text-[11px]`}>{c.avg_passengers_per_session.toFixed(1)} pax</Text>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Buses Operated</Text>
                      <Text style={tw`text-[#1d4ed8] font-extrabold text-[11px]`} numberOfLines={1}>
                        {(c.buses_operated || '').substring(0, 18)}
                      </Text>
                    </View>
                  </View>
                </View>
              ))}
              {!filteredConductors.length && (
                <Text style={tw`text-center py-8 text-slate-400 italic text-[13px]`}>No conductor duty records found</Text>
              )}
            </View>
          )}

          {/* TAB 4: USERS & CIRCLE ADOPTION */}
          {activeTab === 'users' && (
            <View style={tw`px-5`}>
              {/* Registered Users & Ride History Card */}
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-3 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Commuter Telemetry & Adoption</Text>
                  <Ionicons name="people" size={18} color="#1d4ed8" />
                </View>
                <View style={tw`flex-row flex-wrap -mx-1`}>
                  <View style={tw`w-[50%] p-1`}>
                    <View style={tw`bg-slate-50 p-3.5 rounded-2xl border border-slate-200`}>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Registered Commuters</Text>
                      <Text style={tw`text-2xl font-black text-slate-800 mt-1`}>{data.userAnalytics.total_registered_users}</Text>
                    </View>
                  </View>
                  <View style={tw`w-[50%] p-1`}>
                    <View style={tw`bg-slate-50 p-3.5 rounded-2xl border border-slate-200`}>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Ride History Adopters</Text>
                      <Text style={tw`text-2xl font-black text-[#1d4ed8] mt-1`}>
                        {data.userAnalytics.users_with_rides} ({data.userAnalytics.ride_history_adoption_rate}%)
                      </Text>
                    </View>
                  </View>
                  <View style={tw`w-[50%] p-1`}>
                    <View style={tw`bg-slate-50 p-3.5 rounded-2xl border border-slate-200`}>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Total Passenger Rides</Text>
                      <Text style={tw`text-2xl font-black text-slate-800 mt-1`}>{data.userAnalytics.total_passenger_rides}</Text>
                    </View>
                  </View>
                  <View style={tw`w-[50%] p-1`}>
                    <View style={tw`bg-slate-50 p-3.5 rounded-2xl border border-slate-200`}>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider`}>Active Rides</Text>
                      <Text style={tw`text-2xl font-black text-emerald-600 mt-1`}>{data.userAnalytics.active_passenger_rides}</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Circle Feature Adoption Section */}
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-2 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Circle Feature Adoption</Text>
                  <Ionicons name="sparkles" size={18} color="#7c3aed" />
                </View>
                <Text style={tw`text-slate-400 text-[11px] font-medium mb-4`}>
                  Group travel & passenger circle creation metrics
                </Text>

                <View style={tw`bg-purple-50 p-4 rounded-2xl border border-purple-100 mb-4`}>
                  <View style={tw`flex-row justify-between items-center`}>
                    <View>
                      <Text style={tw`text-purple-900 font-black text-3xl`}>{data.userAnalytics.circle_adoption_rate}%</Text>
                      <Text style={tw`text-purple-600 text-[11px] font-bold uppercase tracking-wider`}>Overall Circle Adoption Rate</Text>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={tw`text-purple-900 font-extrabold text-lg`}>{data.userAnalytics.total_circles_created}</Text>
                      <Text style={tw`text-purple-600 text-[10px] font-bold uppercase`}>Circles Created</Text>
                    </View>
                  </View>
                </View>

                <View style={tw`flex-row flex-wrap -mx-1`}>
                  <View style={tw`w-[33.3%] p-1`}>
                    <View style={tw`bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center`}>
                      <Text style={tw`text-slate-800 font-extrabold text-base`}>{data.userAnalytics.total_circle_memberships}</Text>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase text-center mt-0.5`}>Memberships</Text>
                    </View>
                  </View>
                  <View style={tw`w-[33.3%] p-1`}>
                    <View style={tw`bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center`}>
                      <Text style={tw`text-slate-800 font-extrabold text-base`}>{data.userAnalytics.unique_circle_members}</Text>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase text-center mt-0.5`}>Unique Members</Text>
                    </View>
                  </View>
                  <View style={tw`w-[33.3%] p-1`}>
                    <View style={tw`bg-slate-50 p-3 rounded-2xl border border-slate-200 items-center`}>
                      <Text style={tw`text-slate-800 font-extrabold text-base`}>{data.userAnalytics.avg_circle_size}</Text>
                      <Text style={tw`text-slate-400 text-[9px] font-bold uppercase text-center mt-0.5`}>Avg Size</Text>
                    </View>
                  </View>
                </View>
              </View>

              {/* Safety & Terminal Demands */}
              <View style={tw`flex-row flex-wrap -mx-1 mb-5`}>
                <View style={tw`w-[50%] p-1`}>
                  <View style={tw`bg-rose-50 border border-rose-200 rounded-3xl p-4`}>
                    <Ionicons name="alert-circle" size={20} color="#e11d48" style={tw`mb-1`} />
                    <Text style={tw`text-rose-900 text-2xl font-black`}>{data.userAnalytics.total_sos_alerts}</Text>
                    <Text style={tw`text-rose-600 text-[10px] font-bold uppercase tracking-wider`}>SOS Alerts Triggered</Text>
                  </View>
                </View>

                <View style={tw`w-[50%] p-1`}>
                  <View style={tw`bg-amber-50 border border-amber-200 rounded-3xl p-4`}>
                    <Ionicons name="time-outline" size={20} color="#d97706" style={tw`mb-1`} />
                    <Text style={tw`text-amber-900 text-2xl font-black`}>{data.userAnalytics.total_waiting_requests}</Text>
                    <Text style={tw`text-amber-700 text-[10px] font-bold uppercase tracking-wider`}>Waiting Pax Requests</Text>
                  </View>
                </View>
              </View>

              {/* Top Commuters Leaderboard */}
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-3 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Top Commuter Leaderboard</Text>
                  <Ionicons name="trophy" size={18} color="#d97706" />
                </View>
                {data.userAnalytics.top_commuters.map((tc, i) => (
                  <View key={i} style={tw`flex-row justify-between items-center py-2.5 border-b border-slate-100`}>
                    <View style={tw`flex-row items-center flex-1`}>
                      <Text style={tw`w-6 text-slate-400 font-extrabold text-[12px]`}>#{i + 1}</Text>
                      <View style={tw`flex-1`}>
                        <Text style={tw`font-bold text-slate-800 text-[13px]`}>{tc.name}</Text>
                        <Text style={tw`text-slate-400 text-[11px]`} numberOfLines={1}>{tc.email}</Text>
                      </View>
                    </View>
                    <View style={tw`items-end`}>
                      <Text style={tw`font-black text-[#1d4ed8] text-[13px]`}>{tc.rides_count} rides</Text>
                      <Text style={tw`text-slate-400 text-[10px]`}>{tc.last_ride ? tc.last_ride.split(' ')[0] : 'N/A'}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* TAB 5: ROUTES */}
          {activeTab === 'routes' && (
            <View style={tw`px-5`}>
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-4`}>
                  <Ionicons name="map" size={18} color="#1d4ed8" style={tw`mr-2`} />
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Route Passenger Volume</Text>
                </View>
                {data.routes.map((r, i) => (
                  <View key={i} style={tw`mb-4`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={tw`font-extrabold text-slate-800 text-[14px]`}>{r.name}</Text>
                      <Text style={tw`font-black text-[#1d4ed8] text-[14px]`}>
                        {Number(r.count).toLocaleString()} pax ({r.trips} trips)
                      </Text>
                    </View>
                    <View style={tw`h-2 bg-slate-100 rounded-full overflow-hidden`}>
                      <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${r.percentage}%` }]} />
                    </View>
                  </View>
                ))}
                {!data.routes.length && <Text style={tw`text-center py-6 text-slate-400 italic text-[12px]`}>No route volume records</Text>}
              </View>
            </View>
          )}

          {/* TAB 6: OPERATIONS & LOCATION LOGS */}
          {activeTab === 'operations' && (
            <View style={tw`px-5`}>
              {/* Recent Operations */}
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-4 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Recent Bus Operations</Text>
                  <Ionicons name="time" size={18} color="#1d4ed8" />
                </View>
                {(seeMoreOps ? data.recentOperations : data.recentOperations.slice(0, 10)).map((o, i) => (
                  <View key={i} style={tw`py-3 border-b border-slate-100`}>
                    <View style={tw`flex-row justify-between items-center mb-1`}>
                      <Text style={tw`font-extrabold text-slate-800 text-[13px]`}>{o.bus_code}</Text>
                      <View style={tw`px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-blue-100' : 'bg-slate-100'}`}>
                        <Text style={tw`text-[9px] font-black uppercase ${o.status === 'active' ? 'text-blue-700' : 'text-slate-700'}`}>
                          {o.status}
                        </Text>
                      </View>
                    </View>
                    <Text style={tw`text-slate-600 font-medium text-[12px]`} numberOfLines={1}>{o.route}</Text>
                    <View style={tw`flex-row justify-between items-center mt-1`}>
                      <Text style={tw`text-slate-400 text-[11px]`}>Conductor: {(o.conductor_email || '').split('@')[0]}</Text>
                      <Text style={tw`text-[#1d4ed8] font-bold text-[12px]`}>+{o.total_boarded} pax</Text>
                    </View>
                  </View>
                ))}
                {data.recentOperations.length > 10 && (
                  <TouchableOpacity onPress={() => setSeeMoreOps(!seeMoreOps)} style={tw`mt-3 py-2 bg-slate-50 items-center rounded-xl`}>
                    <Text style={tw`text-[#1d4ed8] font-bold text-[12px]`}>
                      {seeMoreOps ? 'Show Less' : `Show More (${data.recentOperations.length - 10})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {/* Location Activity Logs */}
              <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-200`}>
                <View style={tw`flex-row items-center mb-4 justify-between`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Terminal Activity Log</Text>
                  <Ionicons name="list" size={18} color="#1d4ed8" />
                </View>
                {(seeMoreLogs ? data.locationLogs : data.locationLogs.slice(0, 10)).map((l, i) => (
                  <View key={i} style={tw`py-2.5 border-b border-slate-100 flex-row justify-between items-center`}>
                    <View style={tw`flex-1 mr-2`}>
                      <Text style={tw`font-bold text-slate-800 text-[12px]`} numberOfLines={1}>{l.location_name}</Text>
                      <Text style={tw`text-slate-400 text-[10px]`}>
                        {new Date(l.recorded_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} • {l.bus_code} ({l.route})
                      </Text>
                    </View>
                    <View style={tw`flex-row gap-2`}>
                      <Text style={tw`text-[#1d4ed8] font-black text-[12px]`}>+{l.boarded}</Text>
                      <Text style={tw`text-rose-500 font-black text-[12px]`}>-{l.departed}</Text>
                    </View>
                  </View>
                ))}
                {data.locationLogs.length > 10 && (
                  <TouchableOpacity onPress={() => setSeeMoreLogs(!seeMoreLogs)} style={tw`mt-3 py-2 bg-slate-50 items-center rounded-xl`}>
                    <Text style={tw`text-[#1d4ed8] font-bold text-[12px]`}>
                      {seeMoreLogs ? 'Show Less' : `Show More (${data.locationLogs.length - 10})`}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
        </ScrollView>
      )}

      {/* Alert Modal */}
      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}
