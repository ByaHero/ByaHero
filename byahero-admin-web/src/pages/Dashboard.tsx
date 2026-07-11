import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
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
  Navigation 
} from 'lucide-react';
import { adminService } from '../services/admin';

export default function Dashboard() {
  const [loading, setLoading] = useState(false);
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
      const [data, analyticsData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics({ period: 'today' }).catch(() => null)
      ]);
      
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
      title: 'Fleet & Operations',
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
    <div>
      <div className="page-header-actions">
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--primary-color)' }}>
          System Monitor
        </h2>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            className="btn btn-secondary" 
            style={{ backgroundColor: '#e2e8f0', color: '#334155' }}
            onClick={async () => {
              if (window.confirm("Retrain the ETA AI Model using latest historical data?")) {
                setLoading(true);
                try {
                  const res = await adminService.trainAiModel();
                  alert(res.message || "Model trained");
                } catch (e: any) {
                  alert(e.message || "Failed to train model");
                }
                setLoading(false);
              }
            }} 
            disabled={loading}
          >
            <Activity size={14} />
            Retrain ETA AI
          </button>
          <button className="btn btn-secondary" onClick={fetchStats} disabled={loading}>
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh Stats
          </button>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-left">
          {sections.map((sec, sIdx) => (
            <div key={sIdx}>
              <h3 className="dashboard-section-title">{sec.title}</h3>
              <div className="stats-grid">
                {sec.items.map((item, iIdx) => {
                  const Icon = item.icon;
                  return (
                    <div key={iIdx} className="stat-card">
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <span className="stat-label">{item.label}</span>
                        <Icon size={20} style={{ opacity: 0.8 }} />
                      </div>
                      <div className="stat-row">
                        <span className="stat-count">{item.count}</span>
                        <Link to={item.route} className="stat-action">
                          {item.action}
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        <div className="dashboard-right" style={{ marginTop: '32px' }}>
          <div className="map-tracker-container">
            <div className="map-header">
              <div className="map-logo-area">
                <div style={{
                  width: '16px', height: '16px', borderRadius: '50%', backgroundColor: 'var(--primary-color)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '9px', color: 'white', fontWeight: 900
                }}>
                  B
                </div>
                <span className="map-logo-text">BUS TRACKER</span>
              </div>
              <div className="map-updates">
                <span className="status-dot" style={{ backgroundColor: 'var(--success)', width: '6px', height: '6px' }}></span>
                <span>Live Feed</span>
              </div>
            </div>

            <div className="map-viewport">
              <Navigation size={48} color="#94a3b8" className="animate-pulse" />
              <span className="map-viewport-text">Live Dispatch Operations Map</span>
              <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textAlign: 'center', padding: '0 24px' }}>
                Active bus fleets coordinates and real-time transit telemetry are visualized here.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
