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
  Navigation,
  BrainCircuit
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

  const [aiStats, setAiStats] = useState<any>(null);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const [data, analyticsData, aiData] = await Promise.all([
        adminService.getDashboardStats(),
        adminService.getAnalytics({ period: 'today' }).catch(() => null),
        adminService.getAiStats().catch(() => null)
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

          <div className="dashboard-section-title" style={{ marginTop: '24px' }}>AI Model Intelligence</div>
          <div style={{ display: 'block', padding: '24px', backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <div style={{ padding: '10px', borderRadius: '10px', backgroundColor: '#eff6ff', color: '#2563eb' }}>
                <BrainCircuit size={28} />
              </div>
              <div>
                <div style={{ fontSize: '1.1rem', fontWeight: 700, color: '#1e293b' }}>ETA Prediction Engine</div>
                <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Last Trained: {aiStats ? new Date(aiStats.last_trained).toLocaleString() : 'Loading...'}</div>
              </div>
            </div>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '16px', borderBottom: '1px solid #e2e8f0', marginBottom: '16px' }}>
              <div>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>What the AI has learned from</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--primary-color)' }}>{aiStats?.total_data_points ? aiStats.total_data_points.toLocaleString() : 0} GPS Records</div>
                <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '4px' }}>
                  <span style={{ color: '#10b981', fontWeight: 700 }}>{aiStats?.moving_points ? aiStats.moving_points.toLocaleString() : 0} moving records</span> <span style={{ opacity: 0.5 }}>•</span> <span style={{ color: '#ef4444', fontWeight: 700 }}>{aiStats?.stationary_points ? aiStats.stationary_points.toLocaleString() : 0} traffic stops</span>
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Status</div>
                <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--success)', backgroundColor: 'rgba(16, 185, 129, 0.1)', padding: '4px 12px', borderRadius: '12px', display: 'inline-block', marginTop: '4px' }}>Active & Learning</div>
              </div>
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Average Speeds by Route (How fast buses usually go)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {aiStats?.routes?.length > 0 ? aiStats.routes.map((r: any, idx: number) => (
                <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#f8fafc', borderRadius: '8px', border: '1px solid #f1f5f9' }}>
                  <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#334155' }}>{r.route}</span>
                  <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--primary-color)' }}>{r.avg_speed_kmh} km/h</span>
                </div>
              )) : (
                <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Not enough trips yet.</div>
              )}
            </div>

            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: '#475569', marginBottom: '8px' }}>Detected Rush Hours (Slowest Times)</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
              {(() => {
                if (aiStats?.hourly_speeds?.length > 0) {
                  const sorted = [...aiStats.hourly_speeds].sort((a: any, b: any) => a.avg_speed_kmh - b.avg_speed_kmh).slice(0, 3);
                  return sorted.map((h: any, idx: number) => {
                    const hour = h.hr % 12 || 12;
                    const ampm = h.hr >= 12 ? 'PM' : 'AM';
                    return (
                      <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px', backgroundColor: '#fef2f2', borderRadius: '8px', border: '1px solid #fee2e2' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <AlertTriangle size={16} color="#ef4444" />
                          <span style={{ fontSize: '0.8rem', fontWeight: 700, color: '#991b1b' }}>{hour}:00 {ampm}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontSize: '0.75rem', fontWeight: 600, color: '#b91c1c' }}>Heavy Traffic</span>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444' }}>{h.avg_speed_kmh} <span style={{ fontSize: '0.65rem', fontWeight: 700 }}>km/h</span></span>
                        </div>
                      </div>
                    );
                  });
                }
                return <div style={{ fontSize: '0.8rem', color: '#94a3b8', fontStyle: 'italic', padding: '10px 0' }}>Not enough data to detect rush hours yet.</div>;
              })()}
            </div>

            <div style={{ padding: '16px', backgroundColor: '#f0fdf4', borderRadius: '8px', border: '1px solid #bbf7d0' }}>
              <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#166534', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Activity size={16} />
                Why this AI is smart
              </div>
              <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '0.8rem', color: '#15803d', display: 'flex', flexDirection: 'column', gap: '8px', fontWeight: 500 }}>
                <li><strong>Rush Hour Aware:</strong> It knows when traffic is bad (like Friday at 5 PM) and adjusts ETAs so passengers aren't left guessing.</li>
                <li><strong>No Jumping ETAs:</strong> If a bus stops at a red light, the passenger's ETA stays steady instead of suddenly breaking or saying "infinity".</li>
                <li><strong>Always Improving:</strong> Every time a conductor uses the app, the AI silently learns where the new traffic hotspots are.</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
