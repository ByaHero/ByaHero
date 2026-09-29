import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BarChart3,
  BusFront,
  Calendar,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Download,
  FileSpreadsheet,
  Flame,
  History,
  Loader2,
  MapPin,
  MapPinned,
  Phone,
  RefreshCw,
  Route,
  Search,
  Sparkles,
  TrendingUp,
  UserCheck,
  Users,
  Users2,
} from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

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

  // Circle feature metrics
  total_circles_created: number;
  circle_owners_count: number;
  total_circle_memberships: number;
  unique_circle_members: number;
  total_circle_users: number;
  circle_adoption_rate: number;
  avg_circle_size: number;

  // Safety & Waiting metrics
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
  status: 'active' | 'completed' | 'pending' | string;
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

const periodLabels: Record<PeriodKey, string> = {
  deployment: 'Deployment (Sept 9 – 22, 2026)',
  today: 'Today',
  week: 'Past 7 Days',
  month: 'Past 30 Days',
  custom: 'Custom Date Range',
};

export default function Analytics() {
  const [loading, setLoading] = useState(true);
  const [period, setPeriod] = useState<PeriodKey>('deployment');
  const [activeTab, setActiveTab] = useState<ActiveTab>('overview');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [apiData, setApiData] = useState<any>(null);

  // Filters & Sorting for tables
  const [busSearch, setBusSearch] = useState('');
  const [busSortBy, setBusSortBy] = useState<'trips' | 'passengers' | 'load_factor' | 'code'>('trips');
  const [expandedBus, setExpandedBus] = useState<string | null>(null);

  const [conductorSearch, setConductorSearch] = useState('');
  const [conductorSortBy, setConductorSortBy] = useState<'trips' | 'passengers' | 'duty_time' | 'name'>('trips');

  const [recentLimit, setRecentLimit] = useState(15);
  const [logLimit, setLogLimit] = useState(15);
  const [downloading, setDownloading] = useState(false);
  const [exportingCsv, setExportingCsv] = useState(false);

  const { alertConfig, showAlert } = useAlertModal();

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const params: { period: string; start?: string; end?: string } = { period };
      if (period === 'deployment') {
        params.start = '2026-09-09';
        params.end = '2026-09-22';
      } else if (period === 'custom') {
        if (customStart) params.start = customStart;
        if (customEnd) params.end = customEnd;
      }

      // Fetch primary analytics and backup stats in parallel for complete defense data
      const [res, statsRes] = await Promise.all([
        adminService.getAnalytics(params).catch((err) => {
          console.warn('[Analytics] API getAnalytics failed:', err);
          return null;
        }),
        adminService.getDashboardStats().catch(() => null),
      ]);

      if (res && res.success) {
        setApiData({
          ...res,
          _statsBackup: statsRes?.stats || null,
        });
      } else {
        setApiData(null);
      }
    } catch (e: any) {
      console.warn('[Analytics] Fetch error:', e);
      setApiData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalytics();
  }, [period, customStart, customEnd]);

  // Normalized, robust data view
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

    // Locations
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

  // Hourly Flow Peak calculation
  const hourlyMax = useMemo(() => Math.max(...data.hourlyFlow.map((h) => h.total), 1), [data.hourlyFlow]);
  const peakHour = useMemo(() => {
    if (!data.hourlyFlow.length) return null;
    return [...data.hourlyFlow].sort((a, b) => b.total - a.total)[0];
  }, [data.hourlyFlow]);

  // Chart SVG Points
  const points = useMemo(() => {
    if (!data.hourlyFlow.length) return [];
    return data.hourlyFlow.map((entry, index) => {
      const width = 100 / Math.max(data.hourlyFlow.length - 1, 1);
      const x = index * width;
      const y = 90 - (entry.total / hourlyMax) * 80;
      return { x, y };
    });
  }, [data.hourlyFlow, hourlyMax]);

  const curvePath = useMemo(() => {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;

    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const curr = points[i];
      const next = points[i + 1];
      const cp1x = curr.x + (next.x - curr.x) / 3;
      const cp1y = curr.y;
      const cp2x = curr.x + 2 * (next.x - curr.x) / 3;
      const cp2y = next.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [points]);

  const areaPath = useMemo(() => {
    if (points.length === 0) return '';
    return `${curvePath} L ${points[points.length - 1].x} 100 L ${points[0].x} 100 Z`;
  }, [points, curvePath]);

  // Filtered & Sorted Buses
  const filteredBuses = useMemo(() => {
    let list = [...data.buses];
    if (busSearch.trim()) {
      const q = busSearch.toLowerCase();
      list = list.filter((b) => b.code.toLowerCase().includes(q) || b.routes.toLowerCase().includes(q) || b.conductors.toLowerCase().includes(q));
    }

    list.sort((a, b) => {
      if (busSortBy === 'trips') return b.trips - a.trips;
      if (busSortBy === 'passengers') return b.passengers - a.passengers;
      if (busSortBy === 'load_factor') return b.load_factor - a.load_factor;
      return a.code.localeCompare(b.code);
    });

    return list;
  }, [data.buses, busSearch, busSortBy]);

  // Filtered & Sorted Conductors
  const filteredConductors = useMemo(() => {
    let list = [...data.conductors];
    if (conductorSearch.trim()) {
      const q = conductorSearch.toLowerCase();
      list = list.filter((c) => c.name.toLowerCase().includes(q) || c.email.toLowerCase().includes(q) || (c.contacts && c.contacts.toLowerCase().includes(q)));
    }

    list.sort((a, b) => {
      if (conductorSortBy === 'trips') return b.trips - a.trips;
      if (conductorSortBy === 'passengers') return b.passengers - a.passengers;
      if (conductorSortBy === 'duty_time') return b.total_duty_minutes - a.total_duty_minutes;
      return a.name.localeCompare(b.name);
    });

    return list;
  }, [data.conductors, conductorSearch, conductorSortBy]);

  const formatTimestamp = (val?: string) => {
    if (!val) return '-';
    try {
      const d = new Date(val);
      return d.toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch {
      return val;
    }
  };

  const formatHours = (mins: number) => {
    const hrs = Math.floor(mins / 60);
    const remMins = Math.round(mins % 60);
    if (hrs === 0) return `${remMins}m`;
    return `${hrs}h ${remMins}m`;
  };

  // Export CSV functionality
  const exportToCSV = () => {
    try {
      setExportingCsv(true);
      let csvContent = 'data:text/csv;charset=utf-8,';

      // Section 1: Executive Overview
      csvContent += 'BYAHERO TRANSIT DEPLOYMENT ANALYTICS REPORT\r\n';
      csvContent += `Generated At,${new Date().toLocaleString()}\r\n`;
      csvContent += `Selected Period,${period === 'deployment' ? 'Official Deployment Window: September 9 - 22, 2026 (14 Days)' : periodLabels[period]}\r\n\r\n`;

      csvContent += '--- EXECUTIVE SUMMARY METRICS ---\r\n';
      csvContent += `Total Passenger Boardings,${data.totalPassengers}\r\n`;
      csvContent += `Total Passenger Departures,${data.totalDeparted}\r\n`;
      csvContent += `Total Bus Trips / Sessions,${data.totalTrips}\r\n`;
      csvContent += `Fleet Deployment Rate,${data.fleetOverview.deployed_buses}/${data.fleetOverview.total_fleet} (${data.fleetOverview.fleet_deployment_rate}%)\r\n`;
      csvContent += `Conductor Participation Rate,${data.conductorOverview.active_conductors}/${data.conductorOverview.total_conductors} (${data.conductorOverview.participation_rate}%)\r\n`;
      csvContent += `Average Trip Duration (min),${Math.round(data.averageTripMinutes)}\r\n\r\n`;

      // Section 2: Commuter & Circle Adoption
      csvContent += '--- COMMUTER & CIRCLE FEATURE ADOPTION ---\r\n';
      csvContent += `Total Registered Commuters,${data.userAnalytics.total_registered_users}\r\n`;
      csvContent += `Commuters With Ride History,${data.userAnalytics.users_with_rides} (${data.userAnalytics.ride_history_adoption_rate}%)\r\n`;
      csvContent += `Total Logged Passenger Rides,${data.userAnalytics.total_passenger_rides}\r\n`;
      csvContent += `Commuters Utilizing Circle Features,${data.userAnalytics.total_circle_users} (${data.userAnalytics.circle_adoption_rate}%)\r\n`;
      csvContent += `Total Circles Formed,${data.userAnalytics.total_circles_created}\r\n`;
      csvContent += `Total Circle Memberships,${data.userAnalytics.total_circle_memberships}\r\n`;
      csvContent += `Average Circle Size,${data.userAnalytics.avg_circle_size}\r\n\r\n`;

      // Section 3: Bus Fleet Performance
      csvContent += '--- DEPLOYED BUS FLEET TELEMETRY ---\r\n';
      csvContent += 'Bus Code,Completed Trips,Passengers Boarded,Passengers Departed,Avg Pax/Trip,Load Factor %,Routes,Conductors\r\n';
      data.buses.forEach((b) => {
        csvContent += `"${b.code}",${b.trips},${b.passengers},${b.departed},${b.avg_passengers_per_trip.toFixed(1)},${b.load_factor}%,` + `"${b.routes.replace(/"/g, '""')}","${b.conductors.replace(/"/g, '""')}"\r\n`;
      });
      csvContent += '\r\n';

      // Section 4: Conductor Sessions
      csvContent += '--- CONDUCTOR DUTY SESSIONS ---\r\n';
      csvContent += 'Conductor Name,Email,Contacts,Sessions Conducted,Passengers Served,Avg Pax/Session,Duty Hours,Buses Operated\r\n';
      data.conductors.forEach((c) => {
        csvContent += `"${c.name}","${c.email}","${c.contacts || 'N/A'}",${c.trips},${c.passengers},${c.avg_passengers_per_session.toFixed(1)},` + `"${formatHours(c.total_duty_minutes)}","${c.buses_operated.replace(/"/g, '""')}"\r\n`;
      });

      const encodedUri = encodeURI(csvContent);
      const link = document.createElement('a');
      link.setAttribute('href', encodedUri);
      link.setAttribute('download', `ByaHero_Deployment_Analytics_${period}_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      showAlert('Dataset Exported', 'Deployment analytics CSV has been downloaded successfully.', 'info');
    } catch (e) {
      console.error(e);
      showAlert('Export Failed', 'Failed to generate CSV file.', 'error');
    } finally {
      setExportingCsv(false);
    }
  };

  // Generate Multi-Page Defense Panel PDF Report
  const generatePDF = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const container = document.createElement('div');
      container.style.padding = '24px';
      container.style.fontFamily = "'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
      container.style.color = '#1e293b';
      container.style.lineHeight = '1.4';

      const periodText =
        period === 'deployment'
          ? 'Official Deployment Window: September 9 – 22, 2026 (14-Day Pilot Trial)'
          : period === 'custom'
          ? `${customStart || 'Start'} to ${customEnd || 'Present'}`
          : periodLabels[period];

      container.innerHTML = `
        <div style="border-bottom: 3px solid #0f3878; padding-bottom: 12px; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-end;">
            <div>
              <div style="font-size: 11px; font-weight: 800; color: #2563eb; text-transform: uppercase; letter-spacing: 1px;">ByaHero Transit Management System</div>
              <h1 style="color: #0f3878; margin: 3px 0 0 0; font-size: 24px; font-weight: 900;">Deployment Analytics & System Evaluation Report</h1>
            </div>
            <div style="text-align: right; font-size: 11px; color: #64748b;">
              <div><strong>Evaluation Period:</strong> ${periodText}</div>
              <div><strong>Generated Date:</strong> ${new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        <!-- 1. Executive Defense Summary -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 14px; font-weight: 800; color: #0f3878; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 8px;">
            1. Executive Deployment Summary
          </h2>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 14px; font-size: 12px;">
            <tr>
              <td style="width: 25%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">
                <div style="font-size: 20px; font-weight: 900; color: #0f3878;">${data.totalPassengers.toLocaleString()}</div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 3px;">Passengers Boarded</div>
              </td>
              <td style="width: 25%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">
                <div style="font-size: 20px; font-weight: 900; color: #16a34a;">${data.totalTrips.toLocaleString()}</div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 3px;">Completed Bus Trips</div>
              </td>
              <td style="width: 25%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">
                <div style="font-size: 20px; font-weight: 900; color: #2563eb;">${data.fleetOverview.deployed_buses} / ${data.fleetOverview.total_fleet}</div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 3px;">Fleet Deployment (${data.fleetOverview.fleet_deployment_rate}%)</div>
              </td>
              <td style="width: 25%; padding: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; text-align: center;">
                <div style="font-size: 20px; font-weight: 900; color: #d97706;">${data.conductorOverview.active_conductors} / ${data.conductorOverview.total_conductors}</div>
                <div style="font-size: 10px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-top: 3px;">Conductor Participation (${data.conductorOverview.participation_rate}%)</div>
              </td>
            </tr>
          </table>
        </div>

        <!-- 2. Commuter & Circle Feature Adoption -->
        <div style="margin-bottom: 24px;">
          <h2 style="font-size: 14px; font-weight: 800; color: #0f3878; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 8px;">
            2. Commuter & Feature Adoption Metrics
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 11px;">
            <thead>
              <tr style="background: #0f3878; color: white;">
                <th style="padding: 8px 10px; text-align: left;">Adoption Metric</th>
                <th style="padding: 8px 10px; text-align: right;">Count / Value</th>
                <th style="padding: 8px 10px; text-align: right;">Adoption Ratio</th>
                <th style="padding: 8px 10px; text-align: left;">Evaluation Significance</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; font-weight: 700;">Total Registered Commuters</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800;">${data.userAnalytics.total_registered_users}</td>
                <td style="padding: 8px 10px; text-align: right;">100%</td>
                <td style="padding: 8px 10px; color: #64748b;">Registered user base on mobile application</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <td style="padding: 8px 10px; font-weight: 700;">Commuters With Ride History</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #16a34a;">${data.userAnalytics.users_with_rides}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #16a34a;">${data.userAnalytics.ride_history_adoption_rate}%</td>
                <td style="padding: 8px 10px; color: #64748b;">Active commuters who recorded trips via QR/auto-board</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; font-weight: 700;">Commuters Using Circle Features</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #2563eb;">${data.userAnalytics.total_circle_users}</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800; color: #2563eb;">${data.userAnalytics.circle_adoption_rate}%</td>
                <td style="padding: 8px 10px; color: #64748b;">Formed or joined commute safety circles</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0; background: #f8fafc;">
                <td style="padding: 8px 10px; font-weight: 700;">Total Circles Formed</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800;">${data.userAnalytics.total_circles_created}</td>
                <td style="padding: 8px 10px; text-align: right;">${data.userAnalytics.avg_circle_size} pax/circle</td>
                <td style="padding: 8px 10px; color: #64748b;">Active tracking & safety sharing peer groups</td>
              </tr>
              <tr style="border-bottom: 1px solid #e2e8f0;">
                <td style="padding: 8px 10px; font-weight: 700;">Total Commuter Rides Logged</td>
                <td style="padding: 8px 10px; text-align: right; font-weight: 800;">${data.userAnalytics.total_passenger_rides}</td>
                <td style="padding: 8px 10px; text-align: right;">${data.userAnalytics.completed_passenger_rides} Completed</td>
                <td style="padding: 8px 10px; color: #64748b;">Trip histories stored in passenger_rides database</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 3. Deployed Bus Fleet Summary -->
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <h2 style="font-size: 14px; font-weight: 800; color: #0f3878; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 8px;">
            3. Deployed Bus Fleet Data (${data.buses.length} Active Buses)
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #0f3878; color: white;">
                <th style="padding: 6px 8px; text-align: left;">Bus Code</th>
                <th style="padding: 6px 8px; text-align: right;">Trips</th>
                <th style="padding: 6px 8px; text-align: right;">Pax Boarded</th>
                <th style="padding: 6px 8px; text-align: right;">Avg Pax/Trip</th>
                <th style="padding: 6px 8px; text-align: right;">Load Factor</th>
                <th style="padding: 6px 8px; text-align: left;">Routes Served</th>
              </tr>
            </thead>
            <tbody>
              ${data.buses
                .slice(0, 15)
                .map(
                  (b) => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px; font-weight: 700;">${b.code}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 600;">${b.trips}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f3878;">${b.passengers.toLocaleString()}</td>
                  <td style="padding: 6px 8px; text-align: right;">${b.avg_passengers_per_trip.toFixed(1)}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 700; color: ${b.load_factor >= 85 ? '#16a34a' : '#2563eb'};">${b.load_factor}%</td>
                  <td style="padding: 6px 8px; color: #475569;">${b.routes}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          ${data.buses.length > 15 ? `<div style="font-size: 9px; color: #64748b; margin-top: 4px; font-style: italic;">Showing top 15 of ${data.buses.length} deployed buses.</div>` : ''}
        </div>

        <!-- 4. Conductor Duty Sessions -->
        <div style="margin-bottom: 24px; page-break-inside: avoid;">
          <h2 style="font-size: 14px; font-weight: 800; color: #0f3878; text-transform: uppercase; margin-bottom: 10px; border-left: 4px solid #2563eb; padding-left: 8px;">
            4. Conductor Duty Sessions (${data.conductors.length} Active Conductors)
          </h2>
          <table style="width: 100%; border-collapse: collapse; font-size: 10px;">
            <thead>
              <tr style="background: #0f3878; color: white;">
                <th style="padding: 6px 8px; text-align: left;">Conductor Name</th>
                <th style="padding: 6px 8px; text-align: left;">Email / Account</th>
                <th style="padding: 6px 8px; text-align: right;">Sessions</th>
                <th style="padding: 6px 8px; text-align: right;">Pax Handled</th>
                <th style="padding: 6px 8px; text-align: right;">Duty Hours</th>
                <th style="padding: 6px 8px; text-align: left;">Buses Operated</th>
              </tr>
            </thead>
            <tbody>
              ${data.conductors
                .slice(0, 15)
                .map(
                  (c) => `
                <tr style="border-bottom: 1px solid #e2e8f0;">
                  <td style="padding: 6px 8px; font-weight: 700;">${c.name}</td>
                  <td style="padding: 6px 8px; color: #475569;">${c.email}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 600;">${c.trips}</td>
                  <td style="padding: 6px 8px; text-align: right; font-weight: 800; color: #0f3878;">${c.passengers.toLocaleString()}</td>
                  <td style="padding: 6px 8px; text-align: right;">${formatHours(c.total_duty_minutes)}</td>
                  <td style="padding: 6px 8px; color: #475569;">${c.buses_operated}</td>
                </tr>
              `
                )
                .join('')}
            </tbody>
          </table>
          ${data.conductors.length > 15 ? `<div style="font-size: 9px; color: #64748b; margin-top: 4px; font-style: italic;">Showing top 15 of ${data.conductors.length} active conductors.</div>` : ''}
        </div>

        <div style="border-top: 1px solid #cbd5e1; padding-top: 12px; margin-top: 20px; font-size: 10px; color: #94a3b8; display: flex; justify-content: space-between;">
          <span>ByaHero Automated Analytics System &bull; Confidential Capstone Research Evaluation</span>
          <span>Page 1 of 1</span>
        </div>
      `;

      const opt = {
        margin: [10, 12, 10, 12],
        filename: `ByaHero_Defense_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] },
      };

      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
      await html2pdf().set(opt).from(container).save();
      showAlert('Report Ready', 'Defense Panel PDF report generated and downloaded.', 'info');
    } catch (err) {
      console.warn('PDF Download Error:', err);
      showAlert('Download Failed', 'Failed to generate PDF report.', 'error');
    } finally {
      setDownloading(false);
    }
  };

  const renderEmptyState = (icon: React.ReactNode, message: string) => (
    <div className="text-center py-16 text-slate-400">
      <div className="inline-flex items-center justify-center rounded-3xl bg-slate-50 mb-3 w-14 h-14 border border-slate-100 shadow-inner">
        {icon}
      </div>
      <p className="font-bold text-sm text-slate-600">{message}</p>
      <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">Try selecting "Deployment Period" to see trial data collected from Tanauan-Laurel.</p>
    </div>
  );

  return (
    <div className="space-y-6 pb-12">
      {/* 1. Header Banner & Period Controls */}
      <section className="bg-gradient-to-br from-[#0f3878] via-[#164893] to-[#2563eb] text-white p-6 sm:p-8 rounded-3xl shadow-lg relative overflow-hidden">
        {/* Subtle background glow effect */}
        <div className="absolute -right-20 -bottom-20 w-80 h-80 rounded-full bg-blue-400/20 blur-3xl pointer-events-none" />
        <div className="absolute right-1/3 -top-20 w-60 h-60 rounded-full bg-indigo-500/15 blur-2xl pointer-events-none" />

        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-[1.5fr_1fr] gap-6 items-center">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 text-[11px] font-extrabold uppercase tracking-widest text-blue-200 bg-white/10 border border-white/20 py-1 px-3.5 rounded-full backdrop-blur-md">
              <Sparkles size={13} className="text-yellow-300" />
              <span>Transit Telemetry &amp; Panel Evaluation</span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white flex items-center gap-3">
              Analytics Dashboard
              <span className="text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 px-2.5 py-0.5 rounded-full inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Deployment Mode
              </span>
            </h1>

            <p className="text-xs sm:text-sm text-blue-100/90 max-w-2xl font-medium leading-relaxed">
              Complete operational statistics for Tanauan - Laurel transit corridor: deployed bus throughput, conductor duty sessions, commuter registration numbers, and circle feature adoption.
            </p>

            {period === 'deployment' && (
              <div className="inline-flex items-center gap-2 bg-emerald-500/20 border border-emerald-400/40 px-3.5 py-1.5 rounded-xl text-xs font-bold text-emerald-200 backdrop-blur-md shadow-xs">
                <CheckCircle2 size={15} className="text-emerald-300 shrink-0" />
                <span>Field Deployment Period: September 9 – 22, 2026 (14 Days on Tanauan – Laurel Transit Corridor)</span>
              </div>
            )}

            {/* Quick Period Selector Buttons */}
            <div className="pt-2 flex flex-wrap items-center gap-2">
              <div className="flex flex-wrap bg-black/25 p-1 rounded-2xl border border-white/10 backdrop-blur-md">
                {(Object.keys(periodLabels) as PeriodKey[]).map((key) => {
                  const isActive = period === key;
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setPeriod(key)}
                      className={`py-1.5 px-3.5 rounded-xl text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5 ${
                        isActive
                          ? 'bg-white text-[#0f3878] shadow-sm font-black'
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                    >
                      {key === 'deployment' && <Flame size={13} className={isActive ? 'text-amber-500' : 'text-amber-300'} />}
                      {key === 'today' && <Calendar size={13} />}
                      {periodLabels[key]}
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 ml-auto">
                <button
                  type="button"
                  onClick={exportToCSV}
                  disabled={exportingCsv || loading}
                  className="inline-flex items-center gap-1.5 py-2 px-3.5 rounded-xl text-xs font-bold bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer disabled:opacity-50"
                  title="Download Raw Deployment Dataset (CSV)"
                >
                  <FileSpreadsheet size={14} />
                  <span>CSV Dataset</span>
                </button>

                <button
                  type="button"
                  onClick={generatePDF}
                  disabled={downloading || loading}
                  className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl text-xs font-bold bg-white text-[#0f3878] hover:bg-blue-50 transition shadow-sm cursor-pointer disabled:opacity-50"
                  title="Download Formatted Thesis Evaluation Report"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  <span>{downloading ? 'Exporting...' : 'Defense PDF'}</span>
                </button>

                <button
                  type="button"
                  onClick={fetchAnalytics}
                  disabled={loading}
                  className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-white border border-white/20 transition cursor-pointer"
                  title="Refresh Telemetry"
                >
                  <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
                </button>
              </div>
            </div>

            {/* Custom Date Range Picker */}
            {period === 'custom' && (
              <div className="flex flex-wrap items-center gap-3 pt-2 bg-white/10 p-3 rounded-2xl border border-white/15">
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-200" />
                  <span className="text-xs text-blue-100 font-semibold">Start:</span>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="bg-white/20 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:bg-white focus:text-slate-900 transition border border-white/20"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Calendar size={14} className="text-blue-200" />
                  <span className="text-xs text-blue-100 font-semibold">End:</span>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="bg-white/20 text-white rounded-lg px-2.5 py-1 text-xs outline-none focus:bg-white focus:text-slate-900 transition border border-white/20"
                  />
                </div>
                {(customStart || customEnd) && (
                  <button
                    type="button"
                    onClick={() => {
                      setCustomStart('');
                      setCustomEnd('');
                    }}
                    className="text-xs text-blue-200 hover:text-white underline cursor-pointer font-bold px-1"
                  >
                    Reset Range
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Quick Hero Telemetry Card */}
          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-3">
            <div className="flex justify-between items-center pb-2.5 border-b border-white/15">
              <div>
                <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider">Evaluation Scope</span>
                <span className="text-sm font-black text-white">{periodLabels[period]}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-blue-200 block tracking-wider">Estimated Revenue</span>
                <span className="text-base font-black text-emerald-300">₱{data.estimatedRevenue.toLocaleString()}</span>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-blue-200 block uppercase">Buses Deployed</span>
                <span className="text-sm font-black text-white mt-0.5 block">
                  {data.fleetOverview.deployed_buses} <span className="text-[10px] text-blue-200 font-normal">/ {data.fleetOverview.total_fleet}</span>
                </span>
                <span className="text-[9px] text-emerald-300 font-bold block mt-0.5">{data.fleetOverview.fleet_deployment_rate}% Active</span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-blue-200 block uppercase">Conductors</span>
                <span className="text-sm font-black text-white mt-0.5 block">
                  {data.conductorOverview.active_conductors} <span className="text-[10px] text-blue-200 font-normal">/ {data.conductorOverview.total_conductors}</span>
                </span>
                <span className="text-[9px] text-emerald-300 font-bold block mt-0.5">{data.conductorOverview.participation_rate}% Active</span>
              </div>

              <div className="bg-white/10 p-2.5 rounded-xl border border-white/10">
                <span className="text-[10px] font-bold text-blue-200 block uppercase">Circle Users</span>
                <span className="text-sm font-black text-white mt-0.5 block">{data.userAnalytics.total_circle_users}</span>
                <span className="text-[9px] text-blue-200 font-bold block mt-0.5">{data.userAnalytics.total_circles_created} Circles</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Navigation Tabs (Categorized Panels for Easy Defense Presentation) */}
      <div className="flex border-b border-slate-200 overflow-x-auto gap-2 py-1">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'overview'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BarChart3 size={15} />
          <span>Executive Overview</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('buses')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'buses'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <BusFront size={15} />
          <span>Deployed Bus Data</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'buses' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
            {data.buses.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('conductors')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'conductors'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <UserCheck size={15} />
          <span>Conductor Sessions</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'conductors' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'}`}>
            {data.conductors.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'users'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Users2 size={15} />
          <span>Commuters &amp; Circle Features</span>
          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${activeTab === 'users' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'}`}>
            {data.userAnalytics.total_registered_users}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('routes')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'routes'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <Route size={15} />
          <span>Routes &amp; Hotspots</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('operations')}
          className={`py-3 px-4 rounded-xl text-xs font-extrabold transition-all cursor-pointer whitespace-nowrap flex items-center gap-2 ${
            activeTab === 'operations'
              ? 'bg-[#0f3878] text-white shadow-sm'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
          }`}
        >
          <History size={15} />
          <span>Session Logs</span>
        </button>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-20 flex flex-col items-center justify-center gap-4 shadow-sm">
          <Loader2 className="animate-spin text-[#0f3878]" size={42} />
          <p className="text-sm font-bold text-slate-600">Aggregating ByaHero deployment telemetry...</p>
        </div>
      ) : (
        <>
          {/* TAB 1: EXECUTIVE OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* 6 Key Performance Indicators Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
                {/* 1. Boardings */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Pax Boarded</span>
                    <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                      <Users size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-emerald-600 mt-2">{data.totalPassengers.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400 font-medium">-{data.totalDeparted.toLocaleString()} departed</span>
                </div>

                {/* 2. Completed Trips */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Completed Trips</span>
                    <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                      <Route size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-900 mt-2">{data.totalTrips.toLocaleString()}</div>
                  <span className="text-[11px] text-slate-400 font-medium">across all routes</span>
                </div>

                {/* 3. Fleet Deployed */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Fleet Deployed</span>
                    <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
                      <BusFront size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-indigo-600 mt-2">
                    {data.fleetOverview.deployed_buses} <span className="text-xs text-slate-400 font-bold">/ {data.fleetOverview.total_fleet}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">{data.fleetOverview.fleet_deployment_rate}% deployment rate</span>
                </div>

                {/* 4. Active Conductors */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Active Conductors</span>
                    <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                      <UserCheck size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-amber-600 mt-2">
                    {data.conductorOverview.active_conductors} <span className="text-xs text-slate-400 font-bold">/ {data.conductorOverview.total_conductors}</span>
                  </div>
                  <span className="text-[11px] text-emerald-600 font-bold">{data.conductorOverview.participation_rate}% field active</span>
                </div>

                {/* 5. Commuters with Rides */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Ride Adopters</span>
                    <div className="p-2 rounded-xl bg-cyan-50 text-cyan-600">
                      <Award size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-cyan-700 mt-2">{data.userAnalytics.users_with_rides}</div>
                  <span className="text-[11px] text-slate-500 font-semibold">{data.userAnalytics.ride_history_adoption_rate}% of registered</span>
                </div>

                {/* 6. Circle Safety Users */}
                <div className="bg-white border border-slate-200 rounded-2xl p-4 shadow-sm hover:shadow-md transition">
                  <div className="flex justify-between items-center">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">Circle Users</span>
                    <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                      <Users2 size={16} />
                    </div>
                  </div>
                  <div className="text-2xl font-black text-purple-700 mt-2">{data.userAnalytics.total_circle_users}</div>
                  <span className="text-[11px] text-slate-500 font-semibold">{data.userAnalytics.total_circles_created} Circles formed</span>
                </div>
              </div>

              {/* Hourly Passenger Flow SVG Chart with Peak Detection */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div className="flex flex-wrap justify-between items-center gap-2">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Commuter Mobility Trends</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <TrendingUp size={18} className="text-blue-600" /> Hourly Passenger Flow Analysis
                    </h3>
                  </div>

                  {peakHour && (
                    <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-xl text-xs font-bold text-amber-800">
                      <Flame size={14} className="text-amber-500" />
                      <span>
                        Peak Commute Hour: {peakHour.hr % 12 || 12} {peakHour.hr >= 12 ? 'PM' : 'AM'} ({peakHour.total.toLocaleString()} boardings)
                      </span>
                    </div>
                  )}
                </div>

                <div className="h-48 w-full relative rounded-2xl bg-slate-50/70 p-4 border border-slate-100">
                  <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible" aria-label="Hourly Flow Chart">
                    <defs>
                      <linearGradient id="analyticsAreaEnhanced" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.35} />
                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0.0} />
                      </linearGradient>
                    </defs>

                    {[0, 25, 50, 75, 100].map((line) => (
                      <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(203,213,225,0.4)" strokeWidth="0.5" />
                    ))}

                    {points.length > 0 && (
                      <>
                        <path d={areaPath} fill="url(#analyticsAreaEnhanced)" />
                        <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </>
                    )}
                  </svg>

                  {points.map((pt, idx) => (
                    <div
                      key={idx}
                      className="absolute w-4 h-4 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                      style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                    >
                      <div className="w-3.5 h-3.5 rounded-full bg-blue-500/20 border border-blue-500/40 absolute animate-ping" />
                      <div className="w-2 h-2 rounded-full bg-white border-2 border-blue-600 shadow-xs absolute" />
                    </div>
                  ))}
                </div>

                <div className="flex flex-wrap gap-2 pt-1">
                  {data.hourlyFlow.map((entry) => (
                    <div
                      key={entry.hr}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold border ${
                        peakHour?.hr === entry.hr
                          ? 'bg-amber-50 border-amber-300 text-amber-900 font-extrabold'
                          : 'bg-slate-50 border-slate-200 text-slate-700'
                      }`}
                    >
                      {entry.hr % 12 || 12}
                      {entry.hr >= 12 ? 'PM' : 'AM'}: <strong className="text-blue-700 ml-1">{entry.total.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Route Volume Share & Quick Highlights Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Route breakdown */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Corridor Throughput</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <Route size={18} className="text-blue-600" /> Route Volume Distribution
                    </h3>
                  </div>

                  <div className="space-y-4 pt-2">
                    {data.routes.map((route) => (
                      <div key={route.name} className="space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <span className="font-extrabold text-slate-800">{route.name}</span>
                          <span className="font-black text-blue-700">{route.count.toLocaleString()} pax ({route.trips} trips)</span>
                        </div>
                        <div className="bg-slate-100 h-3 rounded-full overflow-hidden">
                          <div
                            className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-700"
                            style={{ width: `${route.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Top Stop Distribution Preview */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Pickup &amp; Drop-off Demand</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <MapPin size={18} className="text-blue-600" /> Top Boarding Locations
                    </h3>
                  </div>

                  <div className="flex flex-wrap gap-2 pt-2">
                    {data.boardingLocations.slice(0, 8).map((loc, idx) => (
                      <div key={loc.location_name} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-700 flex items-center gap-2">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-[10px] font-black flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <span>{loc.location_name}</span>
                        <strong className="text-emerald-700 font-extrabold ml-auto">+{loc.total.toLocaleString()}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: BUS FLEET DATA (Buses that traveled in the deployment period) */}
          {activeTab === 'buses' && (
            <div className="space-y-6">
              {/* Fleet Metric Strip */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider block">Trial Deployment Fleet Performance</span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">Buses Active During Deployment Period</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Individual telemetry per bus including trips completed, passengers boarded, passenger load factor, assigned conductors, and departure hotspots.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2 text-center">
                      <span className="text-[10px] font-bold uppercase text-blue-600 block">Deployed Fleet</span>
                      <span className="text-lg font-black text-blue-900">
                        {data.buses.length} <span className="text-xs text-slate-500 font-bold">/ {data.fleetOverview.total_fleet}</span>
                      </span>
                    </div>

                    <div className="bg-emerald-50 border border-emerald-200 rounded-2xl px-4 py-2 text-center">
                      <span className="text-[10px] font-bold uppercase text-emerald-600 block">Total Boardings</span>
                      <span className="text-lg font-black text-emerald-900">{data.totalPassengers.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-4">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search bus plate/code (e.g. T-00022), route, or conductor..."
                      value={busSearch}
                      onChange={(e) => setBusSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Sort by:</span>
                    <select
                      value={busSortBy}
                      onChange={(e) => setBusSortBy(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
                    >
                      <option value="trips">Completed Trips (High to Low)</option>
                      <option value="passengers">Total Passengers (High to Low)</option>
                      <option value="load_factor">Capacity Load Factor (High to Low)</option>
                      <option value="code">Bus Code (A to Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Buses Table */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {filteredBuses.length ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-4 px-5">Bus Code / Plate</th>
                          <th className="py-4 px-4 text-center">Trips Completed</th>
                          <th className="py-4 px-4 text-right">Passengers Boarded</th>
                          <th className="py-4 px-4 text-center">Avg Pax / Trip</th>
                          <th className="py-4 px-4 text-center">Capacity Load Factor</th>
                          <th className="py-4 px-4">Routes Traveled</th>
                          <th className="py-4 px-4">Assigned Conductors</th>
                          <th className="py-4 px-4 text-center">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredBuses.map((bus) => {
                          const isOpen = expandedBus === bus.code;
                          return (
                            <React.Fragment key={bus.code}>
                              <tr
                                className={`hover:bg-slate-50/80 transition cursor-pointer ${isOpen ? 'bg-blue-50/40' : ''}`}
                                onClick={() => setExpandedBus(isOpen ? null : bus.code)}
                              >
                                <td className="py-3.5 px-5 font-black text-slate-900 flex items-center gap-2">
                                  <div className="p-2 rounded-xl bg-blue-50 text-blue-700">
                                    <BusFront size={16} />
                                  </div>
                                  <div>
                                    <span className="block font-black text-sm text-[#0f3878]">{bus.code}</span>
                                    <span className="text-[10px] text-slate-400 font-semibold">{bus.total_seats} seats total</span>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-800">
                                  <span className="inline-block bg-slate-100 px-2.5 py-1 rounded-lg text-slate-700">
                                    {bus.trips} trips
                                  </span>
                                </td>
                                <td className="py-3.5 px-4 text-right font-black text-blue-700 text-sm">
                                  {bus.passengers.toLocaleString()} pax
                                </td>
                                <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                                  {bus.avg_passengers_per_trip.toFixed(1)} / trip
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <div className="flex flex-col items-center gap-1">
                                    <span className={`text-xs font-black ${bus.load_factor >= 85 ? 'text-emerald-600' : 'text-blue-600'}`}>
                                      {bus.load_factor}%
                                    </span>
                                    <div className="w-20 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${bus.load_factor >= 85 ? 'bg-emerald-500' : 'bg-blue-600'}`}
                                        style={{ width: `${Math.min(100, bus.load_factor)}%` }}
                                      />
                                    </div>
                                  </div>
                                </td>
                                <td className="py-3.5 px-4 text-slate-700 font-medium max-w-[200px] truncate" title={bus.routes}>
                                  {bus.routes}
                                </td>
                                <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[180px] truncate" title={bus.conductors}>
                                  {bus.conductors}
                                </td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    className="p-1.5 rounded-lg hover:bg-slate-200 text-slate-500 transition cursor-pointer"
                                  >
                                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                  </button>
                                </td>
                              </tr>

                              {/* Expanded Drawer: Bus specific Hotspots and Duty Logs */}
                              {isOpen && (
                                <tr className="bg-slate-50/80">
                                  <td colSpan={8} className="p-5 border-t border-slate-200">
                                    <div className="bg-white rounded-2xl p-5 border border-slate-200 space-y-4">
                                      <div className="flex flex-wrap justify-between items-center border-b border-slate-100 pb-3">
                                        <div className="flex items-center gap-2">
                                          <BusFront size={18} className="text-blue-600" />
                                          <h4 className="font-extrabold text-sm text-slate-900">Telemetry Breakdown for {bus.code}</h4>
                                        </div>
                                        <div className="text-xs text-slate-500">
                                          Operating time logged: <strong className="text-slate-800">{formatHours(bus.total_operating_minutes)}</strong>
                                        </div>
                                      </div>

                                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div>
                                          <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Departure Hotspots &amp; Drop-off Demand</span>
                                          {bus.hotspots.length ? (
                                            <div className="space-y-1.5">
                                              {bus.hotspots.map((hotspot) => {
                                                const maxTotal = Math.max(...bus.hotspots.map((h) => h.total), 1);
                                                const width = Math.max(8, (hotspot.total / maxTotal) * 100);
                                                return (
                                                  <div key={hotspot.location_name} className="flex items-center gap-3">
                                                    <span className="text-xs font-semibold text-slate-600 min-w-[120px]">{hotspot.location_name}</span>
                                                    <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                                      <div className="bg-blue-600 h-full rounded-full" style={{ width: `${width}%` }} />
                                                    </div>
                                                    <span className="text-xs font-black text-blue-700 min-w-[40px] text-right">{hotspot.total.toLocaleString()}</span>
                                                  </div>
                                                );
                                              })}
                                            </div>
                                          ) : (
                                            <p className="text-xs text-slate-400 italic">No specific stop departures logged for this bus.</p>
                                          )}
                                        </div>

                                        <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-100">
                                          <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Assigned Conductor Accounts</span>
                                            <span className="text-xs font-bold text-slate-800 block mt-0.5">{bus.conductors}</span>
                                          </div>
                                          <div>
                                            <span className="text-[10px] font-bold uppercase text-slate-400 block">Corridor Routes Run</span>
                                            <span className="text-xs font-bold text-blue-700 block mt-0.5">{bus.routes}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                </tr>
                              )}
                            </React.Fragment>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderEmptyState(<BusFront size={24} className="text-blue-600" />, 'No buses match your filter')
                )}
              </div>
            </div>
          )}

          {/* TAB 3: CONDUCTOR DATA (Conductors who conducted sessions in deployment period) */}
          {activeTab === 'conductors' && (
            <div className="space-y-6">
              {/* Personnel Summary Strip */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <div className="flex flex-wrap justify-between items-center gap-4 pb-4 border-b border-slate-100">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-blue-600 tracking-wider block">Conductor Duty Performance</span>
                    <h2 className="text-xl font-black text-slate-900 mt-0.5">Conductors with Sessions in Deployment Period</h2>
                    <p className="text-xs text-slate-500 font-medium mt-1">
                      Accountability leaderboard: sessions conducted, passenger fare/headcount collected, duty hours, and assigned bus units.
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-2 text-center">
                      <span className="text-[10px] font-bold uppercase text-amber-700 block">Active Conductors</span>
                      <span className="text-lg font-black text-amber-900">
                        {data.conductors.length} <span className="text-xs text-slate-500 font-bold">/ {data.conductorOverview.total_conductors}</span>
                      </span>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-2xl px-4 py-2 text-center">
                      <span className="text-[10px] font-bold uppercase text-blue-700 block">Participation Rate</span>
                      <span className="text-lg font-black text-blue-900">{data.conductorOverview.participation_rate}%</span>
                    </div>
                  </div>
                </div>

                {/* Filter and Sort Toolbar */}
                <div className="flex flex-wrap justify-between items-center gap-3 pt-4">
                  <div className="relative flex-1 min-w-[240px] max-w-md">
                    <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Search conductor name, email, or contact number..."
                      value={conductorSearch}
                      onChange={(e) => setConductorSearch(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs outline-none focus:border-blue-600 focus:bg-white transition"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-500">Sort by:</span>
                    <select
                      value={conductorSortBy}
                      onChange={(e) => setConductorSortBy(e.target.value as any)}
                      className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-700 outline-none focus:border-blue-600"
                    >
                      <option value="trips">Trips Conducted (Leaderboard)</option>
                      <option value="passengers">Passengers Handled</option>
                      <option value="duty_time">Duty Duration</option>
                      <option value="name">Conductor Name (A to Z)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Conductors Table */}
              <div className="bg-white border border-slate-200 rounded-3xl shadow-sm overflow-hidden">
                {filteredConductors.length ? (
                  <div className="w-full overflow-x-auto">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-4 px-5">Rank &amp; Conductor</th>
                          <th className="py-4 px-4">Contact Phone</th>
                          <th className="py-4 px-4 text-center">Sessions Conducted</th>
                          <th className="py-4 px-4 text-right">Passengers Handled</th>
                          <th className="py-4 px-4 text-center">Avg Pax / Session</th>
                          <th className="py-4 px-4 text-center">Duty Duration</th>
                          <th className="py-4 px-4">Buses Operated</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {filteredConductors.map((c, index) => (
                          <tr key={c.email} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-5 font-bold text-slate-900 flex items-center gap-3">
                              <span
                                className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${
                                  index === 0
                                    ? 'bg-amber-400 text-amber-950 shadow-xs'
                                    : index === 1
                                    ? 'bg-slate-300 text-slate-800'
                                    : index === 2
                                    ? 'bg-amber-700 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {index + 1}
                              </span>
                              <div>
                                <span className="font-extrabold text-sm text-slate-900 block">{c.name}</span>
                                <span className="text-[11px] text-slate-500 font-medium block">{c.email}</span>
                              </div>
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">
                              {c.contacts ? (
                                <span className="inline-flex items-center gap-1 text-slate-600">
                                  <Phone size={12} className="text-slate-400" /> {c.contacts}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic">None</span>
                              )}
                            </td>
                            <td className="py-3.5 px-4 text-center font-black text-slate-800">
                              <span className="inline-block bg-blue-50 text-blue-700 font-extrabold px-2.5 py-1 rounded-lg">
                                {c.trips} sessions
                              </span>
                            </td>
                            <td className="py-3.5 px-4 text-right font-black text-emerald-700 text-sm">
                              {c.passengers.toLocaleString()} pax
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              {c.avg_passengers_per_session.toFixed(1)}
                            </td>
                            <td className="py-3.5 px-4 text-center font-bold text-slate-700">
                              {formatHours(c.total_duty_minutes)}
                            </td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium max-w-[200px] truncate" title={c.buses_operated}>
                              {c.buses_operated}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  renderEmptyState(<UserCheck size={24} className="text-blue-600" />, 'No conductors match your filter')
                )}
              </div>
            </div>
          )}

          {/* TAB 4: COMMUTERS & CIRCLE FEATURE ADOPTION */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              {/* Header Box */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
                <span className="text-[11px] font-extrabold uppercase text-purple-600 tracking-wider block">Commuter Engagement &amp; Social Adoption</span>
                <h2 className="text-xl font-black text-slate-900 mt-0.5">Commuter User &amp; Circle Features Telemetry</h2>
                <p className="text-xs text-slate-500 font-medium mt-1">
                  Concrete numerical proof of commuter application adoption, passengers who logged ride histories, and commuters who created or joined commuter safety circles.
                </p>
              </div>

              {/* 4 Essential Feature Adoption Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* 1. Total Registered Commuters */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Registered Commuters</span>
                    <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                      <Users size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-slate-900">{data.userAnalytics.total_registered_users}</div>
                  <p className="text-[11px] text-slate-500 font-medium">Verified accounts created in ByaHero</p>
                </div>

                {/* 2. Ride History Users */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Users With Ride History</span>
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                      <CheckCircle2 size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-emerald-600">{data.userAnalytics.users_with_rides}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md">
                      {data.userAnalytics.ride_history_adoption_rate}%
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">commuter adoption rate</span>
                  </div>
                </div>

                {/* 3. Circle Feature Users */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Circle Feature Users</span>
                    <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
                      <Users2 size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-purple-700">{data.userAnalytics.total_circle_users}</div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-extrabold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-md">
                      {data.userAnalytics.circle_adoption_rate}%
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">social safety circle usage</span>
                  </div>
                </div>

                {/* 4. Total Logged Rides */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500 uppercase">Logged Passenger Rides</span>
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-cyan-600">
                      <Route size={18} />
                    </div>
                  </div>
                  <div className="text-3xl font-black text-cyan-700">{data.userAnalytics.total_passenger_rides}</div>
                  <p className="text-[11px] text-slate-500 font-medium">
                    {data.userAnalytics.completed_passenger_rides} completed &bull; {data.userAnalytics.active_passenger_rides} active
                  </p>
                </div>
              </div>

              {/* Detailed Circle Features Deep Dive Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Circle Feature Breakdown */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-purple-600 tracking-wider block">Peer Safety Groups</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <Users2 size={18} className="text-purple-600" /> Circle Features Breakdown
                    </h3>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-2">
                    <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-purple-700 block">Circles Formed</span>
                      <span className="text-2xl font-black text-purple-900 mt-1 block">{data.userAnalytics.total_circles_created}</span>
                      <span className="text-[10px] text-purple-600 mt-1 block">Active groups created</span>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-purple-700 block">Total Memberships</span>
                      <span className="text-2xl font-black text-purple-900 mt-1 block">{data.userAnalytics.total_circle_memberships}</span>
                      <span className="text-[10px] text-purple-600 mt-1 block">Peer connections</span>
                    </div>

                    <div className="bg-purple-50/60 border border-purple-100 p-4 rounded-2xl">
                      <span className="text-[10px] font-bold uppercase text-purple-700 block">Avg Circle Size</span>
                      <span className="text-2xl font-black text-purple-900 mt-1 block">{data.userAnalytics.avg_circle_size}</span>
                      <span className="text-[10px] text-purple-600 mt-1 block">members per group</span>
                    </div>
                  </div>

                  <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs space-y-2 text-slate-600 leading-relaxed">
                    <p>
                      <strong>How Circle Feature Works:</strong> Commuters scan QR codes or enter invite tokens to form safety circles. Circle members can monitor each other's live bus trips, boarding locations, and receive automated notifications upon arrival or departure.
                    </p>
                    <p className="font-semibold text-purple-900">
                      &bull; {data.userAnalytics.circle_owners_count} Commuters initiated their own circles as group owners.
                      <br />
                      &bull; {data.userAnalytics.unique_circle_members} Unique members joined friend/peer circles.
                    </p>
                  </div>
                </div>

                {/* Ride History Adoption Breakdown */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <div>
                    <span className="text-[11px] font-bold uppercase text-emerald-600 tracking-wider block">Individual Trip Records</span>
                    <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                      <CheckCircle2 size={18} className="text-emerald-600" /> Ride History Activity
                    </h3>
                  </div>

                  <div className="space-y-3 pt-2">
                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">Total Logged Trips</span>
                        <span className="text-xl font-black text-slate-900">{data.userAnalytics.total_passenger_rides} Records</span>
                      </div>
                      <span className="text-xs font-black text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full">
                        {data.userAnalytics.completed_passenger_rides} Completed
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">SOS Safety Alerts Logged</span>
                        <span className="text-xl font-black text-slate-900">{data.userAnalytics.total_sos_alerts}</span>
                      </div>
                      <span className={`text-xs font-bold px-3 py-1 rounded-full ${data.userAnalytics.total_sos_alerts > 0 ? 'bg-amber-100 text-amber-800' : 'bg-slate-200 text-slate-600'}`}>
                        {data.userAnalytics.total_sos_alerts > 0 ? 'Alerts Reviewed' : 'Zero Emergency Triggers'}
                      </span>
                    </div>

                    <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex justify-between items-center">
                      <div>
                        <span className="text-xs font-bold text-slate-500 uppercase block">Pickup / Waiting Requests</span>
                        <span className="text-xl font-black text-slate-900">{data.userAnalytics.total_waiting_requests} Requests</span>
                      </div>
                      <span className="text-xs font-bold bg-blue-100 text-blue-800 px-3 py-1 rounded-full">
                        Terminal Waiting
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Top Commuters Table */}
              {data.userAnalytics.top_commuters.length > 0 && (
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <Award size={18} className="text-blue-600" /> Highly Engaged Commuters (By Ride History Volume)
                  </h3>
                  <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full border-collapse text-left text-xs">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                          <th className="py-3.5 px-4">Commuter</th>
                          <th className="py-3.5 px-4">Account Email</th>
                          <th className="py-3.5 px-4 text-center">Rides Logged</th>
                          <th className="py-3.5 px-4 text-right">Last Recorded Ride</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.userAnalytics.top_commuters.map((commuter) => (
                          <tr key={commuter.user_id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{commuter.name}</td>
                            <td className="py-3.5 px-4 text-slate-600">{commuter.email}</td>
                            <td className="py-3.5 px-4 text-center font-extrabold text-blue-700">{commuter.rides_count} rides</td>
                            <td className="py-3.5 px-4 text-right text-slate-500">{formatTimestamp(commuter.last_ride)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 5: ROUTES & STOP DISTRIBUTION */}
          {activeTab === 'routes' && (
            <div className="space-y-6">
              {/* Route Breakdown */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Service Corridor Split</span>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                    <Route size={18} className="text-blue-600" /> Route Performance Comparison
                  </h3>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  {data.routes.map((route) => (
                    <div key={route.name} className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase">Corridor</span>
                          <h4 className="text-base font-black text-slate-900">{route.name}</h4>
                        </div>
                        <span className="inline-block bg-blue-100 text-blue-800 text-xs font-black px-3 py-1 rounded-full">
                          {route.trips} Trips
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline pt-2">
                        <span className="text-2xl font-black text-blue-700">{route.count.toLocaleString()} pax</span>
                        <span className="text-xs font-bold text-slate-500">
                          {route.trips > 0 ? (route.count / route.trips).toFixed(1) : 0} pax/trip
                        </span>
                      </div>

                      <div className="bg-slate-200 h-2.5 rounded-full overflow-hidden">
                        <div className="bg-blue-600 h-full rounded-full" style={{ width: `${route.percentage}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Boarding vs Departure Hotspots */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Boarding stops */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin size={18} className="text-emerald-600" /> Top Boarding Stops
                  </h3>
                  <div className="space-y-2">
                    {data.boardingLocations.map((loc, idx) => (
                      <div key={loc.location_name} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          {loc.location_name}
                        </span>
                        <span className="font-black text-emerald-700">+{loc.total.toLocaleString()} boarded</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Departure stops */}
                <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                    <MapPin size={18} className="text-red-500" /> Top Drop-off Stops
                  </h3>
                  <div className="space-y-2">
                    {data.departureLocations.map((loc, idx) => (
                      <div key={loc.location_name} className="flex justify-between items-center p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <span className="font-bold text-slate-800 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-red-100 text-red-800 text-[10px] font-black flex items-center justify-center">
                            {idx + 1}
                          </span>
                          {loc.location_name}
                        </span>
                        <span className="font-black text-red-600">-{loc.total.toLocaleString()} dropped</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 6: OPERATION LOGS & AUDIT TRAIL */}
          {activeTab === 'operations' && (
            <div className="space-y-6">
              {/* Location Activity Log */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Real-time Activity</span>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                    <MapPinned size={18} className="text-blue-600" /> Location Activity Stream
                  </h3>
                </div>

                <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
                  {data.locationLogs.length ? (
                    <>
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Time</th>
                            <th className="py-3.5 px-4">Stop Location</th>
                            <th className="py-3.5 px-4">Bus Code</th>
                            <th className="py-3.5 px-4">Conductor</th>
                            <th className="py-3.5 px-4">Route</th>
                            <th className="py-3.5 px-4 text-center">Boarded</th>
                            <th className="py-3.5 px-4 text-center">Departed</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.locationLogs.slice(0, logLimit).map((log, idx) => (
                            <tr key={`${log.recorded_at}-${idx}`} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 whitespace-nowrap text-slate-500">{formatTimestamp(log.recorded_at)}</td>
                              <td className="py-3 px-4 font-bold text-blue-700">{log.location_name || 'Terminal'}</td>
                              <td className="py-3 px-4 font-black text-slate-900">{log.bus_code}</td>
                              <td className="py-3 px-4 text-slate-700">{log.conductor_name || log.conductor_email.split('@')[0]}</td>
                              <td className="py-3 px-4 text-slate-500 text-[11px]">{log.route}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-emerald-600">+{log.boarded}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-red-500">-{log.departed}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.locationLogs.length > logLimit && (
                        <button
                          type="button"
                          className="w-full py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition border-t border-slate-100 cursor-pointer uppercase tracking-wider text-center"
                          onClick={() => setLogLimit((val) => (val === 15 ? data.locationLogs.length : 15))}
                        >
                          {logLimit === 15 ? `See All (${data.locationLogs.length - 15} More)` : 'Collapse Log'}
                        </button>
                      )}
                    </>
                  ) : (
                    renderEmptyState(<MapPinned size={22} className="text-blue-600" />, 'No location activity logs found')
                  )}
                </div>
              </div>

              {/* Recent Operations Table */}
              <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
                <div>
                  <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Session Telemetry</span>
                  <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2 mt-0.5">
                    <History size={18} className="text-blue-600" /> Conductor Duty Sessions Log
                  </h3>
                </div>

                <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
                  {data.recentOperations.length ? (
                    <>
                      <table className="w-full border-collapse text-left text-xs">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                            <th className="py-3.5 px-4">Bus</th>
                            <th className="py-3.5 px-4">Route</th>
                            <th className="py-3.5 px-4">Conductor</th>
                            <th className="py-3.5 px-4 text-center">Boarded</th>
                            <th className="py-3.5 px-4 text-center">Duration</th>
                            <th className="py-3.5 px-4 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {data.recentOperations.slice(0, recentLimit).map((op, idx) => (
                            <tr key={`${op.bus_code}-${idx}`} className="hover:bg-slate-50/80 transition">
                              <td className="py-3 px-4 font-black text-slate-900">{op.bus_code}</td>
                              <td className="py-3 px-4 text-slate-700">{op.route}</td>
                              <td className="py-3 px-4 text-slate-700">{op.conductor_name || op.conductor_email.split('@')[0]}</td>
                              <td className="py-3 px-4 text-center font-extrabold text-blue-700">{op.total_boarded.toLocaleString()}</td>
                              <td className="py-3 px-4 text-center text-slate-600 font-medium">
                                {op.duration_min != null ? `${op.duration_min} min` : '-'}
                              </td>
                              <td className="py-3 px-4 text-center">
                                <span
                                  className={`inline-flex items-center py-0.5 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                    op.status === 'completed'
                                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                      : 'bg-blue-50 text-blue-700 border border-blue-200'
                                  }`}
                                >
                                  {op.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      {data.recentOperations.length > recentLimit && (
                        <button
                          type="button"
                          className="w-full py-3 text-xs font-bold text-blue-600 hover:bg-blue-50 transition border-t border-slate-100 cursor-pointer uppercase tracking-wider text-center"
                          onClick={() => setRecentLimit((val) => (val === 15 ? data.recentOperations.length : 15))}
                        >
                          {recentLimit === 15 ? `See All (${data.recentOperations.length - 15} More)` : 'Collapse Operations'}
                        </button>
                      )}
                    </>
                  ) : (
                    renderEmptyState(<History size={22} className="text-blue-600" />, 'No operations history found')
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
