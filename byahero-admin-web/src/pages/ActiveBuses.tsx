import React, { useEffect, useState } from 'react';
import { Loader2, Radio, Navigation, RefreshCw } from 'lucide-react';
import { adminService } from '../services/admin';
import { ActiveBus } from '../types';

export default function ActiveBuses() {
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchActiveBuses = async () => {
    try {
      setLoading(true);
      const data = await adminService.listActiveBuses();
      if (data.success) {
        setActiveBuses(data.activeBuses || data.active_buses || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBuses();
    const interval = setInterval(fetchActiveBuses, 15000); // refresh every 15s
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Active Dispatch Operations</h2>
        <button className="btn btn-secondary" onClick={fetchActiveBuses} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
          Sync Live Feed
        </button>
      </div>

      {loading && activeBuses.length === 0 ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : activeBuses.length === 0 ? (
        <div className="empty-state">
          <Radio size={48} className="empty-state-icon" style={{ animation: 'pulse 2s infinite' }} />
          <p>No active buses currently transmitting telemetry.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Bus No.</th>
                <th>Plate Number</th>
                <th>Active Conductor</th>
                <th>Current Location</th>
                <th>Routing Speed</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {activeBuses.map((bus, idx) => (
                <tr key={bus.id || idx}>
                  <td style={{ fontWeight: 700 }}>Bus {bus.bus_no}</td>
                  <td>{bus.plate_no}</td>
                  <td>{bus.conductor_name || (bus.conductor_email ? bus.conductor_email.split('@')[0] : 'N/A')}</td>
                  <td>
                    {bus.latitude && bus.longitude ? (
                      <span style={{ fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <Navigation size={12} color="var(--accent-color)" />
                        {bus.current_location && bus.current_location.trim() !== '' 
                          ? bus.current_location 
                          : `${Number(bus.latitude).toFixed(5)}, ${Number(bus.longitude).toFixed(5)}`}
                      </span>
                    ) : (
                      <span style={{ color: 'var(--text-muted)' }}>Calculating position...</span>
                    )}
                  </td>
                  <td>
                    {bus.speed ? `${Number(bus.speed).toFixed(1)} km/h` : '0.0 km/h'}
                  </td>
                  <td>
                    <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      <span className="status-dot" style={{ width: '4px', height: '4px', backgroundColor: 'var(--success)' }}></span>
                      On Route
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
