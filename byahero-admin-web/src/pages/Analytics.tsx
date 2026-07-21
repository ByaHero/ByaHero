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
  TrendingUp,
  Users,
} from 'lucide-react';
import { API_BASE_URL } from '../services/api';
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

const emptyAnalytics: AnalyticsView = {
  totalTrips: 0,
  totalPassengers: 0,
  totalDeparted: 0,
  averageTripMinutes: 0,
  averageFare: 0,
  estimatedRevenue: 0,
  hourlyFlow: [],
  routes: [],
  boardingLocations: [],
  buses: [],
  conductors: [],
  locationLogs: [],
  recentOperations: [],
};

const fallbackAnalytics: Record<PeriodKey, AnalyticsView> = {
  today: emptyAnalytics,
  week: emptyAnalytics,
  month: emptyAnalytics,
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
      const url = `/api/admin/analytics?period=${encodeURIComponent(period)}`;
      console.log('[Analytics] Fetching', url, 'base API:', API_BASE_URL);
      const res = await adminService.getAnalytics({ period });
      console.log('[Analytics] API response', res);
      if (res && res.success) {
        setApiData(res as ApiAnalytics);
      } else {
        console.warn('[Analytics] API returned non-success response', res);
        setApiData(null);
      }
    } catch (e: any) {
      console.warn("[Analytics] API failed, fallback to mock analytics data", e);
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
              <div className="analytics-eyebrow">Bus intelligence</div>
              <h1 className="analytics-title">Analytics Dashboard</h1>
              <p className="analytics-subtitle">Boarding activity, route share, bus performance, and operational logs in a cleaner, denser view.</p>

              <div style={{ display: 'flex', gap: '8px', marginTop: '24px', backgroundColor: '#f1f5f9', padding: '6px', borderRadius: '12px', width: 'fit-content' }}>
                {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                  <button
                    key={key}
                    type="button"
                    style={{
                      padding: '8px 20px',
                      borderRadius: '8px',
                      fontSize: '0.875rem',
                      fontWeight: 600,
                      border: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      backgroundColor: period === key ? '#ffffff' : 'transparent',
                      color: period === key ? 'var(--primary-color)' : '#64748b',
                      boxShadow: period === key ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
                    }}
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

          <div className="analytics-summary-band">
            <div>
              <div className="analytics-section-kicker">Total Boarded Passengers</div>
              <div className="analytics-summary-value">{data.totalPassengers.toLocaleString()}</div>
              <div className="analytics-summary-copy">Activity across all tracked terminals & stops</div>
              
              <div className="analytics-location-cloud">
                <div className="analytics-location-pill">
                  <strong>BOARDING LOCATIONS</strong>
                </div>
                {data.boardingLocations.map((loc) => (
                  <div key={loc.location_name} className="analytics-location-pill">
                    {loc.location_name} <strong>{loc.total} Boarded</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="analytics-surface analytics-card-tight">
            <div className="analytics-section-head">
              <div>
                <div className="analytics-section-kicker">HOURLY TRENDS</div>
                <h3 className="analytics-section-title"><TrendingUp size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Passenger Flow</h3>
              </div>
            </div>
            <div className="analytics-chart-wrap" style={{ width: '100%', position: 'relative' }}>
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%', overflow: 'visible' }} aria-label="Passenger flow chart">
                <defs>
                  <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((line) => (
                  <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(148,163,184,0.1)" strokeWidth="0.5" />
                ))}
                {points.length > 0 && (
                  <>
                    <path d={areaPath} fill="url(#analyticsArea)" />
                    <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
              {points.map((pt, idx) => (
                <div 
                  key={idx}
                  style={{
                    position: 'absolute',
                    left: `${pt.x}%`,
                    top: `${pt.y}%`,
                    width: '14px',
                    height: '14px',
                    transform: 'translate(-50%, -50%)',
                    pointerEvents: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                >
                  <div style={{
                    position: 'absolute',
                    width: '12px',
                    height: '12px',
                    borderRadius: '50%',
                    backgroundColor: 'rgba(37, 99, 235, 0.15)',
                    border: '1px solid rgba(37, 99, 235, 0.3)'
                  }} />
                  <div style={{
                    position: 'absolute',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: '#ffffff',
                    border: '2px solid #2563eb',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                  }} />
                </div>
              ))}
            </div>
            <div className="analytics-hour-row">
              {data.hourlyFlow.slice(0, 6).map((entry) => (
                <div key={entry.hr} className="analytics-hour-chip">
                  {entry.hr % 12 || 12}{entry.hr >= 12 ? 'PM' : 'AM'}: <strong>{entry.total}</strong>
                </div>
              ))}
            </div>
          </div>

          <div className="analytics-table-card">
            <div className="analytics-section-head" style={{ padding: '20px 20px 0 20px' }}>
              <div>
                <div className="analytics-section-kicker">VOLUME SHARE</div>
                <h3 className="analytics-section-title"><Route size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Route Breakdown</h3>
              </div>
            </div>
            <div className="table-responsive" style={{ padding: '20px' }}>
              <div className="analytics-route-list">
                {data.routes.map((route) => (
                  <div key={route.name} className="analytics-route-row">
                    <div className="analytics-route-label">{route.name}</div>
                    <div className="analytics-route-track">
                      <div className="analytics-route-fill" style={{ width: `${Math.max(2, (route.count / routeChartMax) * 100)}%` }} />
                    </div>
                    <div className="analytics-route-value">{route.count.toLocaleString()} pax</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="analytics-table-card">
            <div className="analytics-section-head" style={{ padding: '20px 20px 0 20px' }}>
              <div>
                <div className="analytics-section-kicker">BUS STATS</div>
                <h3 className="analytics-section-title"><BusFront size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Bus Performance</h3>
              </div>
            </div>
            <p style={{ fontSize: '.75rem', color: '#64748b', padding: '0 20px', marginBottom: '0', fontWeight: 600 }}>Click on a bus to view its specific departure hotspots.</p>
            <div style={{ overflowX: 'auto' }}>
              {data.buses.length ? (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Bus Code</th>
                      <th>Trips</th>
                      <th>Passengers</th>
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

          <div className="analytics-table-card">
            <div className="analytics-section-head" style={{ padding: '20px 20px 0 20px' }}>
              <div>
                <div className="analytics-section-kicker">PERSONNEL</div>
                <h3 className="analytics-section-title"><BadgeInfo size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Conductor Activity</h3>
              </div>
            </div>
            <div className="table-responsive">
              {data.conductors.length ? (
                <table className="analytics-table">
                  <thead>
                    <tr>
                      <th>Conductor</th>
                      <th>Trips</th>
                      <th>Passengers</th>
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

          <div className="analytics-table-card">
            <div className="analytics-section-head" style={{ padding: '20px 20px 0 20px' }}>
              <div>
                <div className="analytics-section-kicker">REAL-TIME</div>
                <h3 className="analytics-section-title"><MapPinned size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Location Activity Log</h3>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {data.locationLogs.length ? (
                <>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Time</th>
                        <th>Location</th>
                        <th>Bus</th>
                        <th>Conductor</th>
                        <th>Route</th>
                        <th>Board</th>
                        <th>Depart</th>
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

          <div className="analytics-table-card">
            <div className="analytics-section-head" style={{ padding: '20px 20px 0 20px' }}>
              <div>
                <div className="analytics-section-kicker">STATUS</div>
                <h3 className="analytics-section-title"><History size={18} style={{ display: 'inline-block', marginRight: '6px' }} /> Recent Operations</h3>
              </div>
            </div>
            <div style={{ overflowX: 'auto' }}>
              {data.recentOperations.length ? (
                <>
                  <table className="analytics-table">
                    <thead>
                      <tr>
                        <th>Bus</th>
                        <th>Route</th>
                        <th>Conductor</th>
                        <th>Boarded</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.recentOperations.slice(0, recentLimit).map((operation, index) => {
                        const duration = operation.duration_min != null ? `${operation.duration_min} min` : '-';
                        return (
                          <tr key={`${operation.bus_code}-${operation.route}-${operation.conductor_email}-${index}`}>
                            <td style={{ fontWeight: 700 }}>{operation.bus_code}</td>
                            <td>{operation.route}</td>
                            <td>{conductorName(operation.conductor_email)}</td>
                            <td style={{ fontWeight: 700, color: 'var(--primary-color)' }}>{operation.total_boarded.toLocaleString()}</td>
                            <td>{duration}</td>
                            <td><span className={`analytics-status ${operation.status}`}>{operation.status}</span></td>
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
