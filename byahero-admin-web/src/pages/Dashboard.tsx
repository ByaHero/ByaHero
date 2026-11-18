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
  Printer,
  RefreshCw, 
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

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, analyticsData, activeBusesData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics({ period: 'today' }).catch(() => null),
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
    },
    {
      title: 'System Configuration',
      items: [
        { label: 'Receipt Format', count: 'PT-210', route: '/receipts', action: 'Configure', icon: Printer },
      ],
    }
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-wrap justify-between items-center gap-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div>
          <h2 className="text-xl font-black text-[#0f3878] tracking-tight">System Monitor & Control Center</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">Real-time status overview of bus telemetry, schedules, and staff.</p>
        </div>
        <div className="flex items-center gap-2.5 flex-wrap">
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

            <div className="h-[540px] rounded-2xl overflow-hidden border border-slate-200 relative">
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
