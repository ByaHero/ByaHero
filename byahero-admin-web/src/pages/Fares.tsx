import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, DollarSign } from 'lucide-react';
import { adminService } from '../services/admin';
import { Fare, Stop } from '../types';
import Modal from '../components/Modal';

export default function Fares() {
  const [fares, setFares] = useState<Fare[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentFare, setCurrentFare] = useState<Fare | null>(null);

  // Form Inputs
  const [routeName, setRouteName] = useState('LAUREL - TANAUAN');
  const [originStopId, setOriginStopId] = useState('');
  const [destinationStopId, setDestinationStopId] = useState('');
  const [regularFare, setRegularFare] = useState('');
  const [discountedFare, setDiscountedFare] = useState('');
  const [distanceKm, setDistanceKm] = useState('');
  const [baseRegularFare, setBaseRegularFare] = useState('');
  const [baseDiscountedFare, setBaseDiscountedFare] = useState('');

  const fetchInitialData = async () => {
    try {
      setLoading(true);
      const [faresData, stopsData] = await Promise.all([
        adminService.listFares(),
        adminService.listStops()
      ]);
      if (faresData.success) {
        setFares(faresData.fares || []);
      }
      if (stopsData.success) {
        setStops(stopsData.stops || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const openAddModal = () => {
    setCurrentFare(null);
    setRouteName('LAUREL - TANAUAN');
    setOriginStopId('');
    setDestinationStopId('');
    setRegularFare('15.00');
    setDiscountedFare('12.00');
    setDistanceKm('1');
    setBaseRegularFare('15.00');
    setBaseDiscountedFare('12.00');
    setIsFormOpen(true);
  };

  const openEditModal = (fare: Fare) => {
    setCurrentFare(fare);
    // Determine route from origin stop if possible
    const originStop = stops.find(s => s.id === fare.origin_stop_id);
    setRouteName(originStop?.route || 'LAUREL - TANAUAN');
    setOriginStopId(fare.origin_stop_id.toString());
    setDestinationStopId(fare.destination_stop_id.toString());
    setRegularFare(fare.regular_fare.toString());
    setDiscountedFare(fare.discounted_fare.toString());
    setDistanceKm(fare.distance_km?.toString() || '1');
    setBaseRegularFare(fare.base_regular_fare?.toString() || '15.00');
    setBaseDiscountedFare(fare.base_discounted_fare?.toString() || '12.00');
    setIsFormOpen(true);
  };

  const openDeleteModal = (fare: Fare) => {
    setCurrentFare(fare);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!routeName.trim() || !originStopId || !destinationStopId || !regularFare) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      let data;
      const payload = {
        origin_stop_id: parseInt(originStopId),
        destination_stop_id: parseInt(destinationStopId),
        regular_fare: parseFloat(regularFare),
        discounted_fare: parseFloat(discountedFare || '0'),
        distance_km: parseInt(distanceKm || '1'),
        base_regular_fare: parseFloat(baseRegularFare || regularFare),
        base_discounted_fare: parseFloat(baseDiscountedFare || discountedFare),
      };

      if (currentFare) {
        data = await adminService.updateFare({ fare_id: currentFare.fare_id, ...payload });
      } else {
        data = await adminService.addFare(payload);
      }

      if (data.success) {
        setIsFormOpen(false);
        const refetch = await adminService.listFares();
        if (refetch.success) setFares(refetch.fares || []);
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
      const data = await adminService.deleteFare(currentFare.fare_id);
      if (data.success) {
        setIsDeleteOpen(false);
        const refetch = await adminService.listFares();
        if (refetch.success) setFares(refetch.fares || []);
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
                <th>Origin Stop</th>
                <th>Destination Stop</th>
                <th>Regular Fare</th>
                <th>Discounted Fare</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {fares.map((fare) => (
                <tr key={fare.fare_id}>
                  <td>{fare.origin_stop_name || fare.origin_stop_id}</td>
                  <td>{fare.destination_stop_name || fare.destination_stop_id}</td>
                  <td>₱{fare.regular_fare ? parseFloat(fare.regular_fare as any).toFixed(2) : '0.00'}</td>
                  <td>₱{fare.discounted_fare ? parseFloat(fare.discounted_fare as any).toFixed(2) : '0.00'}</td>
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
            <select className="form-input" value={routeName} onChange={(e) => setRouteName(e.target.value)}>
               <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
               <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Origin Stop</label>
              <select className="form-input" value={originStopId} onChange={(e) => setOriginStopId(e.target.value)} required>
                <option value="">Select Origin...</option>
                {stops.filter(s => s.route === routeName).map(s => <option key={s.id} value={s.id}>{s.name || s.location_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Destination Stop</label>
              <select className="form-input" value={destinationStopId} onChange={(e) => setDestinationStopId(e.target.value)} required>
                <option value="">Select Destination...</option>
                {stops.filter(s => s.route === routeName).map(s => <option key={s.id} value={s.id}>{s.name || s.location_name}</option>)}
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Regular Fare (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={regularFare}
                onChange={(e) => setRegularFare(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label">Discounted Fare (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={discountedFare}
                onChange={(e) => setDiscountedFare(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Distance (Km)</label>
              <input 
                type="number" 
                step="1" 
                className="form-input" 
                value={distanceKm}
                onChange={(e) => setDistanceKm(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Base Regular (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="form-input" 
                value={baseRegularFare}
                onChange={(e) => setBaseRegularFare(e.target.value)}
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
          Are you sure you want to remove this fare configuration from the matrix?
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
