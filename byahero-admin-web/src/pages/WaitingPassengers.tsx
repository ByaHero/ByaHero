import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Users, RefreshCw, XCircle, MapPin, Filter } from 'lucide-react';
import { adminService } from '../services/admin';
import { WaitingPassenger } from '../types';

export default function WaitingPassengers() {
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');

  const fetchPassengers = async () => {
    try {
      const data = await adminService.listWaitingPassengers();
      if (data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, []);

  // Auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchPassengers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(30);
    fetchPassengers();
  };

  const handleDismissLocation = async (location: string) => {
    if (!window.confirm(`Dismiss all waiting passenger signals for ${location}?`)) return;
    try {
      setRefreshing(true);
      const data = await adminService.manageWaitingPassengers({
        action: 'cancel_location',
        location
      });
      if (data.success) {
        fetchPassengers();
      } else {
        alert(data.error || 'Failed to dismiss signals.');
      }
    } catch (e) {
      alert('Network error while dismissing signals.');
    } finally {
      setRefreshing(false);
    }
  };

  // Grouping / Location Counts
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    waitingList.forEach(wp => {
      counts[wp.location_name] = (counts[wp.location_name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [waitingList]);

  // Unique list of locations for filtering dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    waitingList.forEach(wp => locations.add(wp.location_name));
    return ['All Stop Locations', ...Array.from(locations)];
  }, [waitingList]);

  // Filtered List
  const filteredList = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return waitingList;
    return waitingList.filter(wp => wp.location_name === filterLocation);
  }, [waitingList, filterLocation]);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Top Stats Overview Card */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <span className="form-label">Total Waiting Passengers</span>
            <div style={{ display: 'flex', alignItems: 'center', marginTop: '6px' }}>
              <span style={{ fontSize: '2.5rem', fontWeight: 800, marginRight: '12px', lineHeight: 1 }}>
                {waitingList.length}
              </span>
              <span className="badge badge-success" style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="status-dot pulse" style={{ width: '6px', height: '6px', backgroundColor: 'var(--success)' }}></span>
                Live Track
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div className="system-status" style={{ height: '36px' }}>
              <span>Auto-refresh in: <strong>{countdown}s</strong></span>
            </div>
            <button className="btn btn-secondary" onClick={handleManualRefresh} disabled={refreshing}>
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Sync Now
            </button>
          </div>
        </div>

        {/* ProgressBar */}
        <div style={{ width: '100%', height: '4px', backgroundColor: 'var(--border)', borderRadius: '2px', overflow: 'hidden', marginTop: '16px' }}>
          <div style={{ height: '100%', backgroundColor: 'var(--accent-color)', width: `${((30 - countdown) / 30) * 100}%`, transition: 'width 1s linear' }}></div>
        </div>

        {/* Busiest Locations Section */}
        <div style={{ marginTop: '20px' }}>
          <span className="form-label" style={{ display: 'block', marginBottom: '8px' }}>Busiest Terminals</span>
          {locationCounts.length === 0 ? (
            <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>No active passenger queue signals.</p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {locationCounts.slice(0, 5).map(([location, count], idx) => (
                <div key={idx} style={{
                  display: 'flex', alignItems: 'center', gap: '8px', 
                  backgroundColor: 'var(--primary-light)', color: 'var(--primary-color)',
                  padding: '6px 12px', borderRadius: 'var(--radius-full)', border: '1px solid var(--border)',
                  fontSize: '0.75rem', fontWeight: 600
                }}>
                  <MapPin size={12} />
                  <span>{location.split(',')[0]}: <strong>{count}</strong> waiting</span>
                  <button 
                    onClick={() => handleDismissLocation(location)}
                    style={{ background: 'none', border: 'none', color: 'var(--error)', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}
                    title="Dismiss entire queue"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Directory and filtering */}
      <div className="card">
        <div className="page-header-actions" style={{ marginBottom: '20px' }}>
          <h2 className="card-title">Waiting Passengers Directory</h2>
          
          {/* Filtering Dropdown */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={16} color="var(--text-muted)" />
            <select 
              className="form-input" 
              style={{ width: '220px', padding: '6px 12px' }}
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              {uniqueLocations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
              ))}
            </select>
          </div>
        </div>

        {loading && !refreshing ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="empty-state">
            <Users size={48} className="empty-state-icon" />
            <p>No waiting passenger reports match the selected filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Passenger</th>
                  <th>Location / Terminal</th>
                  <th>Status</th>
                  <th>Signal Date</th>
                </tr>
              </thead>
              <tbody>
                {filteredList.map((wp) => (
                  <tr key={wp.id}>
                    <td>
                      <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <span style={{ fontWeight: 700 }}>{wp.registered_name || wp.user_name || 'Passenger'}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{wp.registered_email || 'No email info'}</span>
                      </div>
                    </td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{wp.location_name}</span>
                    </td>
                    <td>
                      <span className="badge badge-success">
                        {wp.status || 'waiting'}
                      </span>
                    </td>
                    <td>{wp.created_at ? new Date(wp.created_at).toLocaleString() : 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
