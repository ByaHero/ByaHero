import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, MapPin } from 'lucide-react';
import { adminService } from '../services/admin';
import { Stop } from '../types';
import Modal from '../components/Modal';

export default function Stops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentStop, setCurrentStop] = useState<Stop | null>(null);

  // Inputs
  const [name, setName] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [type, setType] = useState<'terminal' | 'regular'>('regular');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');

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
    setLatitude('14.5995');
    setLongitude('120.9842');
    setType('regular');
    setStatus('active');
    setIsFormOpen(true);
  };

  const openEditModal = (stop: Stop) => {
    setCurrentStop(stop);
    setName(stop.name);
    setLatitude(stop.latitude.toString());
    setLongitude(stop.longitude.toString());
    setType(stop.type);
    setStatus(stop.status);
    setIsFormOpen(true);
  };

  const openDeleteModal = (stop: Stop) => {
    setCurrentStop(stop);
    setIsDeleteOpen(true);
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
        latitude: parseFloat(latitude),
        longitude: parseFloat(longitude),
        type,
        status
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

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Transit Network Stops</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> New Pick-up Point
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : stops.length === 0 ? (
        <div className="empty-state">
          <MapPin size={48} className="empty-state-icon" />
          <p>No transit stops mapped. Add one using the button above.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Stop name</th>
                <th>Designation Type</th>
                <th>Latitude</th>
                <th>Longitude</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {stops.map((stop) => (
                <tr key={stop.id}>
                  <td style={{ fontWeight: 700 }}>{stop.name}</td>
                  <td>
                    <span className={`badge badge-${stop.type === 'terminal' ? 'primary' : 'secondary'}`}>
                      {stop.type}
                    </span>
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    {stop.latitude ? parseFloat(stop.latitude as any).toFixed(6) : '0.000000'}
                  </td>
                  <td style={{ fontFamily: 'monospace' }}>
                    {stop.longitude ? parseFloat(stop.longitude as any).toFixed(6) : '0.000000'}
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

      {/* Save Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentStop ? 'Edit Transit Stop' : 'Map New Transit Stop'}>
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

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Designation Type</label>
              <select className="form-input" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="regular">Regular Stop</option>
                <option value="terminal">Main Terminal</option>
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

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Stop'}
            </button>
          </div>
        </form>
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
