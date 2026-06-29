import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, DollarSign } from 'lucide-react';
import { adminService } from '../services/admin';
import { Fare } from '../types';
import Modal from '../components/Modal';

export default function Fares() {
  const [fares, setFares] = useState<Fare[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentFare, setCurrentFare] = useState<Fare | null>(null);

  // Form Inputs
  const [routeName, setRouteName] = useState('');
  const [baseFare, setBaseFare] = useState('');
  const [perKmRate, setPerKmRate] = useState('');
  const [discountedBase, setDiscountedBase] = useState('');
  const [discountedPerKm, setDiscountedPerKm] = useState('');

  const fetchFares = async () => {
    try {
      setLoading(true);
      const data = await adminService.listFares();
      if (data.success) {
        setFares(data.fares || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFares();
  }, []);

  const openAddModal = () => {
    setCurrentFare(null);
    setRouteName('');
    setBaseFare('15.00');
    setPerKmRate('2.00');
    setDiscountedBase('12.00');
    setDiscountedPerKm('1.60');
    setIsFormOpen(true);
  };

  const openEditModal = (fare: Fare) => {
    setCurrentFare(fare);
    setRouteName(fare.route_name);
    setBaseFare(fare.base_fare.toString());
    setPerKmRate(fare.per_km_rate.toString());
    setDiscountedBase(fare.discounted_base.toString());
    setDiscountedPerKm(fare.discounted_per_km.toString());
    setIsFormOpen(true);
  };

  const openDeleteModal = (fare: Fare) => {
    setCurrentFare(fare);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !baseFare || !perKmRate) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      let data;
      const payload = {
        route_name: routeName,
        base_fare: parseFloat(baseFare),
        per_km_rate: parseFloat(perKmRate),
        discounted_base: parseFloat(discountedBase || '0'),
        discounted_per_km: parseFloat(discountedPerKm || '0')
      };

      if (currentFare) {
        data = await adminService.updateFare({ id: currentFare.id, ...payload });
      } else {
        data = await adminService.addFare(payload);
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchFares();
      } else {
        alert(data.error || 'Failed to save fare rules.');
      }
    } catch (e) {
      alert('Network error while saving fares.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentFare) return;
    setSaving(true);
    try {
      const data = await adminService.deleteFare(currentFare.id);
      if (data.success) {
        setIsDeleteOpen(false);
        fetchFares();
      } else {
        alert(data.error || 'Failed to remove fare.');
      }
    } catch (e) {
      alert('Network error while deleting fare.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Fare Matrices</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> New Fare Route
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : fares.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} className="empty-state-icon" />
          <p>No fare matrices configured. Tap button above to add pricing.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Route / Category</th>
                <th>Base Fare</th>
                <th>Distance rate (Per Km)</th>
                <th>Discount Base</th>
                <th>Discount rate (Per Km)</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fares.map((fare) => (
                <tr key={fare.id}>
                  <td style={{ fontWeight: 700 }}>{fare.route_name}</td>
                  <td>₱{fare.base_fare ? parseFloat(fare.base_fare as any).toFixed(2) : '0.00'}</td>
                  <td>₱{fare.per_km_rate ? parseFloat(fare.per_km_rate as any).toFixed(2) : '0.00'}</td>
                  <td>₱{fare.discounted_base ? parseFloat(fare.discounted_base as any).toFixed(2) : '0.00'}</td>
                  <td>₱{fare.discounted_per_km ? parseFloat(fare.discounted_per_km as any).toFixed(2) : '0.00'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                      <button className="btn btn-secondary" style={{ padding: '6px 10px' }} onClick={() => openEditModal(fare)}>
                        <Edit2 size={12} />
                      </button>
                      <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => openDeleteModal(fare)}>
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

      {/* Save Fare Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentFare ? 'Edit Fare Config' : 'Create Fare Config'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Route Category / Line</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. Regular Aircon Route" 
              value={routeName}
              onChange={(e) => setRouteName(e.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Base Fare (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={baseFare}
                onChange={(e) => setBaseFare(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Per Km Rate (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={perKmRate}
                onChange={(e) => setPerKmRate(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Discounted Base (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={discountedBase}
                onChange={(e) => setDiscountedBase(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discounted Per Km (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={discountedPerKm}
                onChange={(e) => setDiscountedPerKm(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Matrix'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Fare Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="De-authorize Route Fares">
        <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
          Are you sure you want to remove the fare configuration for <strong>{currentFare?.route_name}</strong>?
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
