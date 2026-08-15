import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { AlertManager } from '../components/WebAlert';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import busIconSvg from '../assets/busStopMarkerFinalBlue.svg';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const BusIcon = L.icon({
  iconUrl: busIconSvg,
  iconSize: [32, 42],
  iconAnchor: [16, 42],
  popupAnchor: [0, -42],
});

import { 
  Bus, 
  Activity, 
  Calendar, 
  Users, 
  UserCheck, 
  MapPin, 
  HelpCircle, 
  AlertTriangle, 
  MessageSquare, 
  DollarSign, 
  BarChart3, 
  RefreshCw, 
  BrainCircuit,
  Maximize,
  X
} from 'lucide-react';
import { adminService } from '../services/admin';
import { ActiveBus } from '../types';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const { alertConfig, showAlert, showConfirm } = useAlertModal();
  const [stats, setStats] = useState({
    total_buses: 0,
    active_buses: 0,
    schedules: 0,
    waiting_pax: 0,
    drivers: 0,
    conductors: 0,
    bus_stops: 0,
    lost_and_found: 0,
    reports: 0,
    feedbacks: 0,
    bus_fares: 0,
    analytics_boarded: 0,
  });

  const [aiStats, setAiStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, analyticsData, aiData, activeBusesData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics({ period: 'today' }).catch(() => null),
        adminService.getAiStats().catch(() => null),
        adminService.listActiveBuses().catch(() => null)
      ]);

      if (activeBusesData && activeBusesData.success) {
        setActiveBuses(activeBusesData.activeBuses || activeBusesData.active_buses || []);
      }
      
      let analyticsBoarded = 0;
      if (analyticsData && analyticsData.success && analyticsData.summary) {
        analyticsBoarded = analyticsData.summary.total_passengers ?? 0;
      }

      if (data.success && data.stats) {
        setStats({
          ...data.stats,
          analytics_boarded: analyticsBoarded
        });
      }
      
      if (aiData && aiData.success && aiData.stats) {
        setAiStats(aiData.stats);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(interval);
  }, []);

  const sections = [
    {
      title: 'Buses & Operations',
      items: [
        { label: 'Total Buses', count: stats.total_buses, route: '/buses', action: 'Manage', icon: Bus },
        { label: 'Active Buses', count: stats.active_buses, route: '/active-buses', action: 'Manage', icon: Activity },
        { label: 'Schedules', count: stats.schedules, route: '/schedules', action: 'Manage', icon: Calendar },
        { label: 'Waiting Pax', count: stats.waiting_pax, route: '/waiting-passengers', action: 'Manage', icon: Users },
      ],
    },
    {
      title: 'Personnel & Infrastructure',
      items: [
        { label: 'Drivers & Conductors', count: stats.drivers + stats.conductors, route: '/conductors', action: 'Manage', icon: UserCheck },
        { label: 'Bus Stops', count: stats.bus_stops, route: '/stops', action: 'Manage', icon: MapPin },
      ],
    },
    {
      title: 'Passenger Experience',
      items: [
        { label: 'Lost & Found', count: stats.lost_and_found, route: '/lost-and-found', action: 'Manage', icon: HelpCircle },
        { label: 'Reports', count: stats.reports, route: '/reports', action: 'Manage', icon: AlertTriangle },
        { label: 'Feedbacks', count: stats.feedbacks, route: '/feedbacks', action: 'Manage', icon: MessageSquare },
      ],
    },
    {
      title: 'Revenue & Insights',
      items: [
        { label: 'Bus Fares', count: stats.bus_fares, route: '/fares', action: 'Manage', icon: DollarSign },
        { label: 'Analytics (Boarded)', count: stats.analytics_boarded ?? 0, route: '/analytics', action: 'View', icon: BarChart3 },
      ],
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#0f3878] tracking-tight">System Monitor & Control Center</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Real-time status overview of bus telemetry, schedules, staff, and AI predictors.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
          <button 
            className="inline-flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-slate-100 border border-slate-200 text-slate-700 hover:bg-slate-200 transition cursor-pointer disabled:opacity-60" 
            onClick={async () => {
              showConfirm(
                'Retrain ETA AI Model',
                'Retrain the ETA AI Model using latest historical data?',
                async () => {
                  setLoading(true);
                  try {
                    const res = await adminService.trainAiModel();
                    showAlert('Model Trained', res.message || 'Model trained successfully.', 'success');
                  } catch (e: any) {
                    showAlert('Training Failed', e.message || 'Failed to train model.', 'error');
                  }
                  setLoading(false);
                }
              );
            }} 
            disabled={loading}
          >
            <Activity size={14} />
            Retrain ETA AI
          </button>
          <button 
            className="inline-flex items-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-[#0f3878] text-white hover:bg-[#0a2958] transition cursor-pointer disabled:opacity-60 shadow-sm" 
            onClick={fetchStats} 
            disabled={loading}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Stats
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[1.6fr_1fr] gap-6">
        {/* Left column: Categories & Stat Cards */}
        <div className="space-y-6">
          {sections.map((sec, sIdx) => (
            <div key={sIdx} className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <h3 className="text-xs font-black text-[#0f3878] uppercase tracking-wider pl-2.5 border-l-4 border-[#4C85C5] mb-4">
                {sec.title}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <div key={iIdx} className="bg-gradient-to-br from-[#4C85C5] to-[#3b70ad] text-white p-5 rounded-2xl flex flex-col justify-between min-h-[130px] shadow-sm hover:shadow-md transition hover:-translate-y-0.5">
                      <div className="flex justify-between items-start">
                        <span className="text-xs font-bold tracking-wide opacity-90">{item.label}</span>
                        <div className="p-2 rounded-xl bg-white/15 backdrop-blur-xs">
                          <Icon size={18} />
                        </div>
                      </div>
                      <div className="flex justify-between items-end mt-4">
                        <span className="text-3xl font-black tracking-tight leading-none">{item.count}</span>
                        <Link 
                          to={item.route} 
                          className="bg-white/20 hover:bg-white/30 text-white text-[11px] font-bold py-1.5 px-3 rounded-full transition no-underline border border-white/20"
                        >
                          {item.action} &rarr;
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Right column: Bus Tracker Live Map & AI Info */}
        <div className="space-y-6">
          {/* Map Preview Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm overflow-hidden">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-[#0f3878] text-white flex items-center justify-center font-black text-[10px]">
                  B
                </div>
                <span className="text-xs font-black tracking-wider text-slate-800 uppercase">Live Map Tracker</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-emerald-200">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span>{activeBuses.length} Active</span>
                </div>
                <button 
                  onClick={() => setIsMapModalOpen(true)} 
                  className="inline-flex items-center gap-1 py-1 px-2.5 rounded-lg text-xs font-bold bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
                >
                  <Maximize size={12} />
                  Expand
                </button>
              </div>
            </div>

            <div className="h-[280px] rounded-2xl overflow-hidden border border-slate-200 relative">
              <MapContainer 
                center={[14.076, 120.931]}
                zoom={12} 
                style={{ width: '100%', height: '100%', zIndex: 1 }}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                {activeBuses.map((bus, idx) => {
                  if (bus.latitude && bus.longitude) {
                    return (
                      <Marker 
                        key={bus.id || idx} 
                        position={[Number(bus.latitude), Number(bus.longitude)]}
                        icon={BusIcon}
                      >
                        <Popup>
                          <div className="p-1 text-slate-800 text-xs">
                            <strong className="text-sm font-extrabold text-slate-900 block mb-1">Bus {bus.bus_no}</strong>
                            <div>Plate: {bus.plate_no}</div>
                            <div>Speed: {bus.speed ? `${Number(bus.speed).toFixed(1)} km/h` : '0.0 km/h'}</div>
                            <div className="mt-2 pt-2 border-t border-slate-200">
                              <Link 
                                to="/active-buses" 
                                className="inline-block py-1 px-2 text-[11px] font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition no-underline"
                              >
                                Manage Live Tracking &rarr;
                              </Link>
                            </div>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  }
                  return null;
                })}
              </MapContainer>
            </div>
          </div>

          {/* AI Intelligence Card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-5">
            <div className="flex items-center gap-3.5">
              <div className="p-3 rounded-2xl bg-blue-50 text-blue-600 border border-blue-100">
                <BrainCircuit size={26} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 leading-tight">ETA Prediction Engine</h4>
                <p className="text-[11px] text-slate-400 font-medium">Last Trained: {aiStats ? new Date(aiStats.last_trained).toLocaleString() : 'Loading...'}</p>
              </div>
            </div>
            
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Training Dataset Size</span>
                <span className="text-xl font-black text-[#0f3878]">{aiStats?.total_data_points ? aiStats.total_data_points.toLocaleString() : 0} Records</span>
                <div className="text-[10px] text-slate-500 mt-0.5 space-x-1">
                  <span className="text-emerald-600 font-bold">{aiStats?.moving_points ? aiStats.moving_points.toLocaleString() : 0} moving</span>
                  <span>•</span>
                  <span className="text-red-500 font-bold">{aiStats?.stationary_points ? aiStats.stationary_points.toLocaleString() : 0} stops</span>
                </div>
              </div>
              <div className="text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Engine State</span>
                <span className="inline-block mt-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 py-1 px-3 rounded-full">
                  Active & Learning
                </span>
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Average Speeds by Route</span>
              <div className="space-y-2">
                {aiStats?.routes?.length > 0 ? aiStats.routes.map((r: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-center p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                    <span className="text-xs font-semibold text-slate-700">{r.route}</span>
                    <span className="text-xs font-extrabold text-[#0f3878]">{r.avg_speed_kmh} km/h</span>
                  </div>
                )) : (
                  <div className="text-xs text-slate-400 italic py-2">Not enough trip telemetry yet.</div>
                )}
              </div>
            </div>

            <div>
              <span className="text-xs font-bold text-slate-700 block mb-2">Detected Rush Hours</span>
              <div className="space-y-2">
                {(() => {
                  if (aiStats?.hourly_speeds?.length > 0) {
                    const sorted = [...aiStats.hourly_speeds].sort((a: any, b: any) => a.avg_speed_kmh - b.avg_speed_kmh).slice(0, 3);
                    return sorted.map((h: any, idx: number) => {
                      const hour = h.hr % 12 || 12;
                      const ampm = h.hr >= 12 ? 'PM' : 'AM';
                      return (
                        <div key={idx} className="flex justify-between items-center p-2.5 bg-red-50/70 border border-red-100 rounded-xl">
                          <div className="flex items-center gap-2 text-red-700">
                            <AlertTriangle size={14} className="text-red-500" />
                            <span className="text-xs font-bold">{hour}:00 {ampm}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="text-[11px] font-semibold text-red-700">Heavy Traffic</span>
                            <span className="text-xs font-black text-red-600">{h.avg_speed_kmh} km/h</span>
                          </div>
                        </div>
                      );
                    });
                  }
                  return <div className="text-xs text-slate-400 italic py-2">Not enough historical data to detect rush hours yet.</div>;
                })()}
              </div>
            </div>

            <div className="p-4 bg-emerald-50/70 rounded-2xl border border-emerald-100 space-y-2">
              <div className="text-xs font-black text-emerald-900 flex items-center gap-2">
                <Activity size={15} />
                <span>Why this AI is smart</span>
              </div>
              <ul className="text-[11px] text-emerald-800 space-y-1.5 list-disc list-inside font-medium leading-relaxed">
                <li><strong>Rush Hour Aware:</strong> Dynamically factors in seasonal traffic peaks to calibrate passenger ETAs.</li>
                <li><strong>No Jumping ETAs:</strong> Eliminates erratic predictions when buses make brief traffic signal stops.</li>
                <li><strong>Continuous Learning:</strong> Auto-updates speed profiles on every newly concluded conductor session.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Expanded Map Modal */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm z-50 flex flex-col p-6 animate-modal-enter">
          <div className="flex justify-between items-center bg-white p-4 px-6 rounded-t-2xl border-b border-slate-200">
            <h2 className="text-lg font-black text-[#0f3878]">Live Dispatch Operations Map</h2>
            <button 
              onClick={() => setIsMapModalOpen(false)} 
              className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
            >
              <X size={22} />
            </button>
          </div>
          <div className="flex-1 bg-white rounded-b-2xl overflow-hidden relative shadow-2xl">
            <MapContainer 
              center={[14.076, 120.931]}
              zoom={12} 
              style={{ width: '100%', height: '100%', zIndex: 1 }}
            >
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {activeBuses.map((bus, idx) => {
                if (bus.latitude && bus.longitude) {
                  return (
                    <Marker 
                      key={bus.id || idx} 
                      position={[Number(bus.latitude), Number(bus.longitude)]}
                      icon={BusIcon}
                    >
                      <Popup>
                        <div className="p-1 text-slate-800 text-xs">
                          <strong className="text-sm font-extrabold text-slate-900 block mb-1">Bus {bus.bus_no}</strong>
                          <div>Plate: {bus.plate_no}</div>
                          <div>Speed: {bus.speed ? `${Number(bus.speed).toFixed(1)} km/h` : '0.0 km/h'}</div>
                          <div className="mt-2 pt-2 border-t border-slate-200">
                            <Link 
                              to="/active-buses" 
                              className="inline-block py-1 px-2.5 text-xs font-bold text-blue-600 bg-blue-50 hover:bg-blue-100 rounded-lg transition no-underline"
                            >
                              Manage Live Tracking &rarr;
                            </Link>
                          </div>
                        </div>
                      </Popup>
                    </Marker>
                  );
                }
                return null;
              })}
            </MapContainer>
          </div>
        </div>
      )}
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
