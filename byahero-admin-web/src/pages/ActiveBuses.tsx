import React, { useEffect, useState } from 'react';
import { Loader2, Radio, Navigation, RefreshCw, StopCircle } from 'lucide-react';
import { adminService } from '../services/admin';
import { ActiveBus } from '../types';

import Modal from '../components/Modal';

export default function ActiveBuses() {
  const [activeBuses, setActiveBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [stoppingBusId, setStoppingBusId] = useState<number | null>(null);
  
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [selectedBusToStop, setSelectedBusToStop] = useState<ActiveBus | null>(null);

  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

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

  const confirmStopBus = (bus: ActiveBus) => {
    setSelectedBusToStop(bus);
    setIsStopModalOpen(true);
  };

  const handleStop = async () => {
    if (!selectedBusToStop) return;
    const busId = selectedBusToStop.Bus_ID || selectedBusToStop.id;
    try {
      setStoppingBusId(busId);
      setIsStopModalOpen(false);
      const res = await adminService.stopActiveBus(busId);
      if (res.success) {
        await fetchActiveBuses();
      } else {
        setErrorMessage(res.error || 'Failed to stop tracking');
        setErrorModalVisible(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'An error occurred');
      setErrorModalVisible(true);
    } finally {
      setStoppingBusId(null);
      setSelectedBusToStop(null);
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
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {activeBuses.map((bus, idx) => (
                <tr key={bus.id || bus.Bus_ID || idx}>
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
                  <td>
                    <button 
                      className="btn btn-danger" 
                      style={{ padding: '4px 8px', fontSize: '12px', display: 'inline-flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => confirmStopBus(bus)}
                      disabled={stoppingBusId === (bus.Bus_ID || bus.id)}
                    >
                      {stoppingBusId === (bus.Bus_ID || bus.id) ? (
                        <Loader2 size={12} className="animate-spin" />
                      ) : (
                        <StopCircle size={12} />
                      )}
                      Stop
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={isStopModalOpen} onClose={() => setIsStopModalOpen(false)} title="Authorization Required">
        <div style={{ marginBottom: '20px', lineHeight: '1.5' }}>
          <p>By proceeding, you authorize the system to forcefully terminate the current tracking session for <strong>Bus {selectedBusToStop?.bus_no}</strong>.</p>
          <p style={{ marginTop: '10px' }}>This will mark all ongoing rides as completed and unassign the conductor.</p>
          <p style={{ marginTop: '10px', fontWeight: 'bold' }}>Are you sure you want to continue?</p>
        </div>
        <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <button className="btn btn-secondary" onClick={() => setIsStopModalOpen(false)}>Cancel</button>
          <button className="btn btn-danger" onClick={handleStop}>Confirm Authorization</button>
        </div>
      </Modal>

      <Modal isOpen={errorModalVisible} onClose={() => setErrorModalVisible(false)} title="Error Encountered">
        <div style={{ marginBottom: '20px', lineHeight: '1.5', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ color: '#ef4444', background: '#fef2f2', padding: '10px', borderRadius: '50%' }}>
            <StopCircle size={24} />
          </div>
          <p>{errorMessage}</p>
        </div>
        <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <button className="btn btn-primary" onClick={() => setErrorModalVisible(false)}>Okay</button>
        </div>
      </Modal>
    </div>
  );
}
