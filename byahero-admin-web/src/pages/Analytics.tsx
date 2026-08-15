import React, { useEffect, useMemo, useState } from 'react';
import {
  BadgeInfo,
  BusFront,
  ChevronDown,
  ChevronUp,
  Clock3,
  Download,
  History,
  Loader2,
  MapPinned,
  Route,
  TrendingUp,
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
  const [downloading, setDownloading] = useState(false);

  const fetchAnalytics = async () => {
    try {
      setLoading(true);
      const res = await adminService.getAnalytics({ period });
      if (res && res.success) {
        setApiData(res as ApiAnalytics);
      } else {
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
    <div className="text-center py-12 text-slate-400">
      <div className="inline-flex items-center justify-center rounded-2xl bg-slate-50 mb-3 w-12 h-12 border border-slate-100">
        {icon}
      </div>
      <p className="font-bold text-xs text-slate-500">{message}</p>
    </div>
  );

  const heroMiniStats = [
    { label: 'Revenue', value: `₱${data.estimatedRevenue.toLocaleString()}`, icon: <Route size={16} /> },
    { label: 'Passengers', value: data.totalPassengers.toLocaleString(), icon: <Users size={16} /> },
    { label: 'Avg Fare', value: `₱${data.averageFare.toFixed(2)}`, icon: <Clock3 size={16} /> },
  ];

  const generatePDF = async () => {
    if (!data || downloading) return;
    setDownloading(true);
    try {
      const container = document.createElement('div');
      container.style.padding = '20px';
      container.style.fontFamily = "'Helvetica', 'Arial', sans-serif";
      container.style.color = '#333';

      container.innerHTML = `
        <div style="border-bottom: 2px solid #0f3878; padding-bottom: 10px; margin-bottom: 20px; page-break-inside: avoid;">
          <h1 style="color: #0f3878; margin: 0 0 5px 0; font-size: 22px;">ByaHero Analytics Report</h1>
          <div style="color: #666; font-size: 13px;">Period: ${periodLabels[period]} | Generated: ${new Date().toLocaleDateString()}</div>
        </div>
        
        <div style="display: flex; flex-wrap: wrap; margin-bottom: 25px; justify-content: space-between; page-break-inside: avoid;">
          <div style="width: 22%; padding: 12px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${Number(data.totalTrips || 0).toLocaleString()}</div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Total Trips</div>
          </div>
          <div style="width: 22%; padding: 12px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${Number(data.totalPassengers || 0).toLocaleString()}</div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Pax Boarded</div>
          </div>
          <div style="width: 22%; padding: 12px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${Number(data.totalDeparted || 0).toLocaleString()}</div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Pax Departed</div>
          </div>
          <div style="width: 22%; padding: 12px 8px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center;">
            <div style="font-size: 20px; font-weight: bold; color: #1d4ed8;">${Math.round(Number(data.averageTripMinutes || 0))}m</div>
            <div style="font-size: 9px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 4px;">Avg Trip Time</div>
          </div>
        </div>
      `;

      const opt = {
        margin: 10,
        filename: `ByaHero_Analytics_Report_${period}_${new Date().toISOString().split('T')[0]}.pdf`,
        image: { type: 'jpeg' as const, quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, logging: false },
        jsPDF: { unit: 'mm' as const, format: 'a4' as const, orientation: 'portrait' as const },
        pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
      };

      // @ts-ignore
      const html2pdfModule = await import('html2pdf.js');
      const html2pdf = (html2pdfModule.default || html2pdfModule) as any;
      await html2pdf().set(opt).from(container).save();
    } catch (err) {
      console.warn('PDF Download Error:', err);
      alert('Failed to download PDF report.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex justify-center shadow-sm">
          <Loader2 className="animate-spin text-[#0f3878]" size={36} />
        </div>
      ) : (
        <>
          {/* Hero Banner with Period Selector */}
          <section className="bg-gradient-to-br from-[#0f3878] via-[#164893] to-[#2563eb] text-white p-6 sm:p-8 rounded-3xl shadow-md grid grid-cols-1 lg:grid-cols-[1.6fr_1fr] gap-6 items-center">
            <div className="space-y-4">
              <span className="text-[11px] font-extrabold uppercase tracking-widest text-blue-200 bg-white/10 py-1 px-3 rounded-full inline-block">
                Transit Fleet Intelligence
              </span>
              <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">Analytics Dashboard</h1>
              <p className="text-xs sm:text-sm text-blue-100/90 max-w-xl font-medium leading-relaxed">
                Live boarding activity, route distribution, individual bus throughput, and telemetry history.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <div className="flex bg-black/20 p-1 rounded-xl backdrop-blur-xs">
                  {(Object.keys(periodLabels) as PeriodKey[]).map((key) => (
                    <button
                      key={key}
                      type="button"
                      className={`py-1.5 px-4 rounded-lg text-xs font-bold transition cursor-pointer ${
                        period === key 
                          ? 'bg-white text-[#0f3878] shadow-sm' 
                          : 'text-white/80 hover:text-white hover:bg-white/10'
                      }`}
                      onClick={() => setPeriod(key)}
                    >
                      {periodLabels[key]}
                    </button>
                  ))}
                </div>

                <button
                  type="button"
                  onClick={generatePDF}
                  disabled={downloading}
                  className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-white text-[#0f3878] hover:bg-slate-100 transition shadow-sm cursor-pointer disabled:opacity-60"
                >
                  {downloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                  {downloading ? 'Exporting...' : 'Export PDF'}
                </button>
              </div>
            </div>

            {/* Quick Hero Panel */}
            <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 space-y-4">
              <div className="flex justify-between items-center pb-3 border-b border-white/10">
                <div>
                  <span className="text-[10px] uppercase font-bold text-blue-200 block">Selected Window</span>
                  <span className="text-sm font-black text-white">{periodLabels[period]}</span>
                </div>
                <span className="inline-flex items-center gap-1.5 bg-emerald-400/20 text-emerald-300 px-2.5 py-1 rounded-full text-[10px] font-bold border border-emerald-400/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Live Data
                </span>
              </div>

              <div>
                <span className="text-3xl font-black text-white block leading-none">{data.totalPassengers.toLocaleString()}</span>
                <span className="text-[11px] text-blue-100/80 mt-1 block">Passengers boarded across all routes</span>
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2">
                {heroMiniStats.map((stat) => (
                  <div key={stat.label} className="bg-white/10 p-2 rounded-xl text-center border border-white/10">
                    <span className="text-[10px] text-blue-200 font-bold block">{stat.label}</span>
                    <span className="text-xs font-black text-white mt-0.5 block">{stat.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* KPI Stat Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Total Trips</span>
              <div className="flex justify-between items-center mt-3">
                <span className="text-2xl font-black text-slate-900">{data.totalTrips.toLocaleString()}</span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <Route size={18} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Passengers Boarded</span>
              <div className="flex justify-between items-center mt-3">
                <span className="text-2xl font-black text-emerald-600">{data.totalPassengers.toLocaleString()}</span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
                  <Users size={18} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Passengers Departed</span>
              <div className="flex justify-between items-center mt-3">
                <span className="text-2xl font-black text-blue-600">{data.totalDeparted.toLocaleString()}</span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600">
                  <BusFront size={18} />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Avg Trip Duration</span>
              <div className="flex justify-between items-center mt-3">
                <span className="text-2xl font-black text-amber-600">
                  {Math.round(data.averageTripMinutes)} <span className="text-xs font-bold text-slate-500">min</span>
                </span>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
                  <Clock3 size={18} />
                </div>
              </div>
            </div>
          </div>

          {/* Boarding Locations Cloud */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Boarding Locations Distribution</span>
            <div className="text-2xl font-black text-slate-900 mt-1">{data.totalPassengers.toLocaleString()} Boarded</div>
            <div className="flex flex-wrap gap-2 mt-4">
              {data.boardingLocations.map((loc) => (
                <div key={loc.location_name} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 font-medium">
                  {loc.location_name} <strong className="text-blue-700 ml-1">{loc.total} Boarded</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Hourly Passenger Flow SVG Chart */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Hourly Trends</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <TrendingUp size={18} className="text-blue-600" /> Passenger Flow
              </h3>
            </div>

            <div className="h-44 w-full relative rounded-2xl bg-slate-50/50 p-4 border border-slate-100">
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible" aria-label="Passenger flow chart">
                <defs>
                  <linearGradient id="analyticsArea" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#2563eb" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#2563eb" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                {[0, 25, 50, 75, 100].map((line) => (
                  <line key={line} x1="0" x2="100" y1={line} y2={line} stroke="rgba(203,213,225,0.4)" strokeWidth="0.5" />
                ))}
                {points.length > 0 && (
                  <>
                    <path d={areaPath} fill="url(#analyticsArea)" />
                    <path d={curvePath} fill="none" stroke="#2563eb" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
              </svg>
              {points.map((pt, idx) => (
                <div 
                  key={idx}
                  className="absolute w-3.5 h-3.5 -translate-x-1/2 -translate-y-1/2 pointer-events-none flex items-center justify-center"
                  style={{ left: `${pt.x}%`, top: `${pt.y}%` }}
                >
                  <div className="w-3 h-3 rounded-full bg-blue-500/20 border border-blue-500/30 absolute" />
                  <div className="w-1.5 h-1.5 rounded-full bg-white border-2 border-blue-600 shadow-xs absolute" />
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              {data.hourlyFlow.slice(0, 6).map((entry) => (
                <div key={entry.hr} className="bg-slate-50 border border-slate-200 px-3 py-1 rounded-lg text-xs font-semibold text-slate-700">
                  {entry.hr % 12 || 12}{entry.hr >= 12 ? 'PM' : 'AM'}: <strong className="text-blue-700">{entry.total}</strong>
                </div>
              ))}
            </div>
          </div>

          {/* Route Breakdown */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Volume Share</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <Route size={18} className="text-blue-600" /> Route Breakdown
              </h3>
            </div>

            <div className="space-y-3 pt-2">
              {data.routes.map((route) => (
                <div key={route.name} className="flex items-center gap-4">
                  <span className="w-48 text-xs font-bold text-slate-700 truncate">{route.name}</span>
                  <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-gradient-to-r from-blue-600 to-indigo-600 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(2, (route.count / routeChartMax) * 100)}%` }} 
                    />
                  </div>
                  <span className="w-24 text-right text-xs font-extrabold text-slate-900">{route.count.toLocaleString()} pax</span>
                </div>
              ))}
            </div>
          </div>

          {/* Bus Performance Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Fleet Telemetry</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <BusFront size={18} className="text-blue-600" /> Bus Performance
              </h3>
              <p className="text-[11px] text-slate-400 font-medium mt-1">Click on a bus to expand specific departure hotspots.</p>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
              {data.buses.length ? (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Bus Code</th>
                      <th className="py-3.5 px-4">Trips Completed</th>
                      <th className="py-3.5 px-4">Passengers Served</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.buses.map((bus) => {
                      const isOpen = expandedBus === bus.code;
                      return (
                        <React.Fragment key={bus.code}>
                          <tr 
                            className="hover:bg-slate-50/80 cursor-pointer transition"
                            onClick={() => setExpandedBus(isOpen ? null : bus.code)}
                          >
                            <td className="py-3.5 px-4 font-extrabold text-slate-900 flex items-center gap-1.5">
                              {isOpen ? <ChevronUp size={16} className="text-blue-600" /> : <ChevronDown size={16} className="text-slate-400" />}
                              {bus.code}
                            </td>
                            <td className="py-3.5 px-4 font-semibold text-slate-700">{bus.trips}</td>
                            <td className="py-3.5 px-4 font-black text-blue-700">{bus.passengers.toLocaleString()}</td>
                          </tr>
                          {isOpen && (
                            <tr className="bg-slate-50/70">
                              <td colSpan={3} className="p-4 border-t border-slate-100">
                                <div className="border-l-4 border-blue-600 pl-4 py-1 space-y-3">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Routes Taken</span>
                                      <span className="text-xs font-bold text-slate-800">{bus.routes}</span>
                                    </div>
                                    <div>
                                      <span className="text-[10px] font-bold uppercase text-slate-400 block">Conductors</span>
                                      <span className="text-xs font-bold text-slate-800">{bus.conductors.split(', ').map(conductorName).join(', ')}</span>
                                    </div>
                                  </div>
                                  <div>
                                    <span className="text-[10px] font-bold uppercase text-slate-400 block mb-2">Departure Hotspots</span>
                                    {bus.hotspots.length ? bus.hotspots.map((hotspot) => {
                                      const width = Math.max(6, (hotspot.total / Math.max(...bus.hotspots.map((item) => item.total), 1)) * 100);
                                      return (
                                        <div key={hotspot.location_name} className="flex items-center gap-3 mb-1.5">
                                          <span className="text-xs font-semibold text-slate-600 min-w-[100px]">{hotspot.location_name}</span>
                                          <div className="flex-1 bg-slate-200 h-1.5 rounded-full overflow-hidden">
                                            <div className="bg-blue-600 h-full rounded-full" style={{ width: `${width}%` }} />
                                          </div>
                                          <span className="text-xs font-bold text-blue-700 min-w-[40px] text-right">{hotspot.total.toLocaleString()}</span>
                                        </div>
                                      );
                                    }) : (
                                      <p className="text-xs text-slate-400 italic">No departure data recorded for this bus.</p>
                                    )}
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
              ) : renderEmptyState(<BusFront size={20} className="text-blue-600" />, 'No bus data recorded yet')}
            </div>
          </div>

          {/* Conductor Activity Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Personnel</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <BadgeInfo size={18} className="text-blue-600" /> Conductor Activity
              </h3>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
              {data.conductors.length ? (
                <table className="w-full border-collapse text-left text-xs">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3.5 px-4">Conductor</th>
                      <th className="py-3.5 px-4">Trips Completed</th>
                      <th className="py-3.5 px-4">Passengers Served</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.conductors.map((conductor) => (
                      <tr key={conductor.email} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 font-bold text-slate-900">{conductor.email}</td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">{conductor.trips}</td>
                        <td className="py-3.5 px-4 font-black text-blue-700">{conductor.passengers.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : renderEmptyState(<BadgeInfo size={20} className="text-blue-600" />, 'No conductor telemetry recorded yet')}
            </div>
          </div>

          {/* Location Activity Log */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">Live Stream</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <MapPinned size={18} className="text-blue-600" /> Location Activity Log
              </h3>
            </div>

            <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
              {data.locationLogs.length ? (
                <>
                  <table className="w-full border-collapse text-left text-xs">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3.5 px-4">Time</th>
                        <th className="py-3.5 px-4">Location</th>
                        <th className="py-3.5 px-4">Bus</th>
                        <th className="py-3.5 px-4">Conductor</th>
                        <th className="py-3.5 px-4">Route</th>
                        <th className="py-3.5 px-4">Boarded</th>
                        <th className="py-3.5 px-4">Departed</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.locationLogs.slice(0, logLimit).map((log) => (
                        <tr key={`${log.recorded_at}-${log.bus_code}`} className="hover:bg-slate-50/80 transition">
                          <td className="py-3.5 px-4 whitespace-nowrap text-slate-500">{formatTimestamp(log.recorded_at)}</td>
                          <td className="py-3.5 px-4 font-bold text-blue-700">{log.location_name || 'Terminal'}</td>
                          <td className="py-3.5 px-4 font-bold text-slate-900">{log.bus_code}</td>
                          <td className="py-3.5 px-4 text-slate-700">{conductorName(log.conductor_email)}</td>
                          <td className="py-3.5 px-4 text-[11px] text-slate-500">{log.route}</td>
                          <td className="py-3.5 px-4 font-extrabold text-emerald-600">+{log.boarded}</td>
                          <td className="py-3.5 px-4 font-extrabold text-red-500">-{log.departed}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {data.locationLogs.length > logLimit && (
                    <button 
                      type="button" 
                      className="w-full py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition border-t border-slate-100 cursor-pointer uppercase tracking-wider" 
                      onClick={() => setLogLimit((value) => (value === 10 ? data.locationLogs.length : 10))}
                    >
                      {logLimit === 10 ? `See More (${data.locationLogs.length - 10})` : 'See Less'}
                    </button>
                  )}
                </>
              ) : renderEmptyState(<MapPinned size={20} className="text-blue-600" />, 'No location activity logs recorded yet')}
            </div>
          </div>

          {/* Recent Operations Table */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <div>
              <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block">History</span>
              <h3 className="text-base font-extrabold text-slate-800 flex items-center gap-2 mt-0.5">
                <History size={18} className="text-blue-600" /> Recent Operations
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
                        <th className="py-3.5 px-4">Boarded</th>
                        <th className="py-3.5 px-4">Duration</th>
                        <th className="py-3.5 px-4">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {data.recentOperations.slice(0, recentLimit).map((operation, index) => {
                        const duration = operation.duration_min != null ? `${operation.duration_min} min` : '-';
                        return (
                          <tr key={`${operation.bus_code}-${operation.route}-${operation.conductor_email}-${index}`} className="hover:bg-slate-50/80 transition">
                            <td className="py-3.5 px-4 font-bold text-slate-900">{operation.bus_code}</td>
                            <td className="py-3.5 px-4 text-slate-700">{operation.route}</td>
                            <td className="py-3.5 px-4 text-slate-700">{conductorName(operation.conductor_email)}</td>
                            <td className="py-3.5 px-4 font-extrabold text-blue-700">{operation.total_boarded.toLocaleString()}</td>
                            <td className="py-3.5 px-4 text-slate-600 font-medium">{duration}</td>
                            <td className="py-3.5 px-4">
                              <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                                operation.status === 'completed' 
                                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                                  : operation.status === 'active' 
                                  ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                                  : 'bg-amber-50 text-amber-700 border border-amber-200'
                              }`}>
                                {operation.status}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                  {data.recentOperations.length > recentLimit && (
                    <button 
                      type="button" 
                      className="w-full py-2.5 text-xs font-bold text-blue-600 hover:bg-blue-50 transition border-t border-slate-100 cursor-pointer uppercase tracking-wider" 
                      onClick={() => setRecentLimit((value) => (value === 10 ? data.recentOperations.length : 10))}
                    >
                      {recentLimit === 10 ? `See More (${data.recentOperations.length - 10})` : 'See Less'}
                    </button>
                  )}
                </>
              ) : renderEmptyState(<History size={20} className="text-blue-600" />, 'No operations history recorded yet')}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
