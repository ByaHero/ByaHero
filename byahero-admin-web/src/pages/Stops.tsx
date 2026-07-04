import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, MapPin } from 'lucide-react';
import { adminService } from '../services/admin';
import { Stop } from '../types';
import Modal from '../components/Modal';
import StopsMap from '../components/StopsMap';

export default function Stops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);

  // Route Filter
  const [routeFilter, setRouteFilter] = useState<string>('ALL');

  // Inputs
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [type, setType] = useState<string>('PICKUP_POINT');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [route, setRoute] = useState<string>('LAUREL - TANAUAN');

  const fetchStops = async () => {
    try {
      setLoading(true);
      const data = await adminService.listStops();
      if (data.success) {
        setStops(data.stops || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const openAddModal = () => {
    setCurrentStop(null);
    setName('');
    setLatitude('14.0905');
    setLongitude('121.0550');
    setType('PICKUP_POINT');
    setStatus('active');
    setRoute(routeFilter !== 'ALL' ? routeFilter : 'LAUREL - TANAUAN');
    setIsFormOpen(true);
  };

  const openEditModal = (stop: Stop | any) => {
    setCurrentStop(stop);
    setName(stop.name || '');
    setLatitude((stop.latitude ?? stop.lat ?? 0).toString());
    setLongitude((stop.longitude ?? stop.lng ?? 0).toString());
    setType(stop.type || 'PICKUP_POINT');
    setStatus(stop.status || 'active');
    setRoute(stop.route || 'LAUREL - TANAUAN');
    setIsFormOpen(true);
  };

  const openDeleteModal = (stop: Stop) => {
    setCurrentStop(stop);
    setIsDeleteOpen(true);
  };

  const handleMapClick = (lat: string, lng: string, locationName: string) => {
    setLatitude(lat);
    setLongitude(lng);
    if (!isFormOpen) {
      setName(locationName || '');
      setType('PICKUP_POINT');
      setStatus('active');
      setRoute(routeFilter !== 'ALL' ? routeFilter : 'LAUREL - TANAUAN');
      setCurrentStop(null);
      setIsFormOpen(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !latitude || !longitude) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      let data;
      const payload = {
        name,
        location_name: name,
        location_landmark: '',
        lat: parseFloat(latitude),
        lng: parseFloat(longitude),
        type: type,
        route: route
      };

      if (currentStop) {
        data = await adminService.updateStop({ id: currentStop.id, ...payload });
      } else {
        data = await adminService.addStop(payload);
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchStops();
      } else {
        alert(data.error || 'Failed to save bus stop.');
      }
    } catch (e) {
      alert('Network error while saving stop.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStop) return;
    setSaving(true);
    try {
      const data = await adminService.deleteStop(currentStop.id);
      if (data.success) {
        setIsDeleteOpen(false);
        fetchStops();
      } else {
        alert(data.error || 'Failed to delete stop.');
      }
    } catch (e) {
      alert('Network error while deleting stop.');
    } finally {
      setSaving(false);
    }
  };

  const filteredStops = routeFilter === 'ALL'
    ? stops
    : stops.filter((s) => s.route === routeFilter);

  const mapFriendlyStops = filteredStops.map((s) => ({
    id: s.id,
    name: s.name,
    type: s.type,
    route: s.route || '',
    location_name: s.name,
    location_landmark: null,
    lat: s.latitude ?? (s as any).lat ?? 0,
    lng: s.longitude ?? (s as any).lng ?? 0,
  }));

  return (
    <div className="dashboard-grid">
      <div className="card" style={{ marginBottom: 0 }}>
        <div className="page-header-actions">
          <h2 className="card-title">Transit Network Stops</h2>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <select 
              className="form-input" 
              style={{ width: '170px', margin: 0, padding: '6px 10px', fontSize: '0.8rem', height: '34px' }}
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="ALL">All Routes</option>
              <option value="LAUREL - TANAUAN">Laurel - Tanauan</option>
              <option value="TANAUAN - LAUREL">Tanauan - Laurel</option>
            </select>
            <button className="btn btn-primary" onClick={openAddModal}>
              <Plus size={16} /> New Pick-up Point
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
            <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="empty-state">
            <MapPin size={48} className="empty-state-icon" />
            <p>No transit stops mapped for this filter. Add one using the button above or by clicking on the map.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Stop name</th>
                  <th>Route</th>
                  <th>Designation Type</th>
                  <th>Latitude</th>
                  <th>Longitude</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStops.map((stop) => (
                  <tr key={stop.id}>
                    <td style={{ fontWeight: 700 }}>{stop.name}</td>
                    <td style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{stop.route || 'LAUREL - TANAUAN'}</td>
                    <td>
                      <span className={`badge badge-${stop.type === 'TERMINAL' ? 'primary' : 'secondary'}`}>
                        {stop.type === 'TERMINAL' ? 'Terminal' : stop.type === 'PICKUP_POINT' ? 'Pickup Point' : 'Bus Stop'}
                      </span>
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {(stop.latitude ?? (stop as any).lat) ? parseFloat((stop.latitude ?? (stop as any).lat) as any).toFixed(6) : '0.000000'}
                    </td>
                    <td style={{ fontFamily: 'monospace' }}>
                      {(stop.longitude ?? (stop as any).lng) ? parseFloat((stop.longitude ?? (stop as any).lng) as any).toFixed(6) : '0.000000'}
                    </td>
                    <td>
                      <span className={`badge badge-${stop.status === 'active' ? 'success' : 'error'}`}>
                        {stop.status}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditModal(stop)}>
                          <Edit2 size={12} />
                        </button>
                        <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => openDeleteModal(stop)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: '560px', padding: '20px', marginBottom: 0 }}>
        <h3 className="card-title" style={{ fontSize: '1rem', marginBottom: '8px' }}>Stops Visualizer Map</h3>
        <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginBottom: '16px' }}>
          All mapped transit stops are displayed below. Click on a marker to view details.
        </p>
        <div style={{ flex: 1, borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
          <StopsMap stops={mapFriendlyStops} />
        </div>
      </div>

      {/* Save Modal with Map Inside */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentStop ? 'Edit Transit Stop' : 'Map New Transit Stop'}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div style={{ height: '220px', borderRadius: 'var(--radius-md)', overflow: 'hidden', border: '1px solid var(--border)' }}>
            <StopsMap stops={mapFriendlyStops} onMapClick={handleMapClick} />
          </div>
          <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0 }}>
            Click on the map above to select and update the latitude/longitude coordinates automatically.
          </p>
          <form onSubmit={handleSave}>
            <div className="form-group">
              <label className="form-label">Stop / Terminal Name</label>
              <input 
                type="text" 
                className="form-input" 
                placeholder="e.g. Quezon Avenue Terminal" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Latitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="form-input" 
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label className="form-label">Longitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="form-input" 
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Transit Route Segment</label>
              <select className="form-input" value={route} onChange={(e) => setRoute(e.target.value)}>
                <option value="LAUREL - TANAUAN">Laurel - Tanauan</option>
                <option value="TANAUAN - LAUREL">Tanauan - Laurel</option>
              </select>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Designation Type</label>
                <select className="form-input" value={type} onChange={(e) => setType(e.target.value)}>
                  <option value="PICKUP_POINT">Pickup Point</option>
                  <option value="TERMINAL">Terminal</option>
                  <option value="BUS_STOP">Bus Stop</option>
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Operational Status</label>
                <select className="form-input" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0, marginTop: '16px' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={saving}>
                {saving ? 'Saving...' : 'Save Stop'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Decommission Transit Stop">
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Are you sure you want to remove <strong>{currentStop?.name}</strong> from active transit operations?
        </p>
        <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Deleting...' : 'Delete Permanently'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
