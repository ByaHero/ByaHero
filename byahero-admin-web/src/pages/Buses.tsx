import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, AlertCircle } from 'lucide-react';
import { adminService } from '../services/admin';
import { Bus } from '../types';
import Modal from '../components/Modal';

export default function Buses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentBus, setCurrentBus] = useState<Bus | null>(null);

  // Form inputs
  const [busNo, setBusNo] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
  const [description, setDescription] = useState('');

  const fetchBuses = async () => {
    try {
      setLoading(true);
      const data = await adminService.listBuses();
      if (data.success) {
        setBuses(data.buses || []);
      }
    } catch (e) {
      setError('Failed to load buses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const openAddModal = () => {
    setCurrentBus(null);
    setBusNo('');
    setPlateNo('');
    setCapacity(50);
    setStatus('active');
    setDescription('');
    setIsFormOpen(true);
  };

  const openEditModal = (bus: Bus) => {
    setCurrentBus(bus);
    setBusNo(bus.bus_no);
    setPlateNo(bus.plate_no);
    setCapacity(bus.capacity);
    setStatus(bus.status);
    setDescription(bus.description || '');
    setIsFormOpen(true);
  };

  const openDeleteModal = (bus: Bus) => {
    setCurrentBus(bus);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNo.trim() || !plateNo.trim() || !capacity) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      let data;
      if (currentBus) {
        data = await adminService.updateBus({
          id: currentBus.id,
          bus_no: busNo,
          plate_no: plateNo,
          capacity,
          status,
          description
        });
      } else {
        data = await adminService.addBus({
          bus_no: busNo,
          plate_no: plateNo,
          capacity,
          status,
          description
        });
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchBuses();
      } else {
        alert(data.error || 'Failed to save bus info.');
      }
    } catch (e) {
      alert('Network error while saving bus.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentBus) return;
    setSaving(true);
    try {
      const data = await adminService.deleteBus(currentBus.id);
      if (data.success) {
        setIsDeleteOpen(false);
        fetchBuses();
      } else {
        alert(data.error || 'Failed to delete bus.');
      }
    } catch (e) {
      alert('Network error while deleting bus.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Bus Fleet Directory</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Register New Bus
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px', color: 'var(--error)', backgroundColor: 'var(--error-light)', borderRadius: 'var(--radius-md)', marginBottom: '16px' }}>
          {error}
        </div>
      )}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : buses.length === 0 ? (
        <div className="empty-state">
          <AlertCircle size={48} className="empty-state-icon" />
          <p>No registered buses found. Click the button above to add one.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Bus No.</th>
                <th>Plate Number</th>
                <th>Capacity</th>
                <th>Conductor Assignment</th>
                <th>Status</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {buses.map((bus) => (
                <tr key={bus.id}>
                  <td style={{ fontWeight: 700 }}>Bus {bus.bus_no}</td>
                  <td>{bus.plate_no}</td>
                  <td>{bus.capacity} seats</td>
                  <td>{bus.conductor_name || <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>None Assigned</span>}</td>
                  <td>
                    <span className={`badge badge-${bus.status === 'active' ? 'success' : bus.status === 'inactive' ? 'error' : 'warning'}`}>
                      {bus.status}
                    </span>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditModal(bus)}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => openDeleteModal(bus)}>
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
      <Modal 
        isOpen={isFormOpen} 
        onClose={() => setIsFormOpen(false)} 
        title={currentBus ? 'Edit Bus Registry' : 'Register New Vehicle'}
      >
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Bus Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 101" 
              value={busNo} 
              onChange={(e) => setBusNo(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Plate Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. ABC 1234" 
              value={plateNo} 
              onChange={(e) => setPlateNo(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Max Seating Capacity</label>
              <input 
                type="number" 
                className="form-input" 
                value={capacity} 
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Operations Status</label>
              <select 
                className="form-input" 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Description / Remarks</label>
            <textarea 
              className="form-input" 
              rows={3} 
              placeholder="Operational routing or configuration notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Registry'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        title="Deregister Vehicle"
      >
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '12px' }}>
          Are you sure you want to deregister <strong>Bus {currentBus?.bus_no}</strong> ({currentBus?.plate_no})?
        </p>
        <p style={{ fontSize: '0.75rem', color: 'var(--error)', fontWeight: 600 }}>
          This operation is permanent and will clear all current conductor allocations.
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
