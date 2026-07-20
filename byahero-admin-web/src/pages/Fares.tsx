import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Loader2, DollarSign } from 'lucide-react';
import { adminService } from '../services/admin';
import Modal from '../components/Modal';

export default function Fares() {
  const [fares, setFares] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentFare, setCurrentFare] = useState<any | null>(null);

  // Form Inputs
  const [direction, setDirection] = useState('LT');
  const [distanceKm, setDistanceKm] = useState('0');
  const [stopId, setStopId] = useState('');
  const [regularFare, setRegularFare] = useState('');
  const [discountedFare, setDiscountedFare] = useState('');

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
    setDirection('LT');
    setDistanceKm('0');
    setStopId('');
    setRegularFare('0.00');
    setDiscountedFare('0.00');
    setIsFormOpen(true);
  };

  const openEditModal = (fare: any) => {
    setCurrentFare(fare);
    setDirection(fare.direction);
    setDistanceKm(fare.distance_km?.toString() || '0');
    setStopId(fare.stop_id?.toString() || '');
    setRegularFare(fare.regular_fare?.toString() || '0.00');
    setDiscountedFare(fare.discounted_fare?.toString() || '0.00');
    setIsFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!regularFare || !discountedFare || !stopId) {
      alert('Please fill out all required fields.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        direction,
        distance_km: parseInt(distanceKm),
        stop_id: parseInt(stopId),
        regular_fare: parseFloat(regularFare),
        discounted_fare: parseFloat(discountedFare),
      };

      let data;
      if (currentFare) {
        data = await adminService.updateFare({ fare_id: currentFare.fare_id, ...payload });
      } else {
        data = await adminService.addFare(payload);
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchInitialData();
      } else {
        alert(data.error || 'Failed to save fare rules.');
      }
    } catch (e) {
      alert('Network error while saving fares.');
    } finally {
      setSaving(false);
    }
  };

  const faresLT = fares.filter(f => f.direction === 'LT');
  const faresTL = fares.filter(f => f.direction === 'TL');

  const renderTable = (title: string, directionFares: any[]) => (
    <div style={{ flex: 1, minWidth: '350px' }}>
      <h3 style={{ marginBottom: '16px', color: 'var(--text-color)', fontWeight: 600, textAlign: 'center' }}>{title}</h3>
      <div className="table-responsive">
        <table className="table" style={{ fontSize: '0.9rem' }}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>KM</th>
              <th>PARTICULARS</th>
              <th style={{ textAlign: 'right' }}>REGULAR</th>
              <th style={{ textAlign: 'right' }}>S/E/D</th>
              <th style={{ textAlign: 'right', width: '50px' }}>Acts</th>
            </tr>
          </thead>
          <tbody>
            {directionFares.map((fare) => (
              <tr key={fare.fare_id}>
                <td style={{ fontWeight: 500 }}>{fare.distance_km}</td>
                <td>{fare.stop_name}</td>
                <td style={{ textAlign: 'right', fontWeight: 600 }}>{parseFloat(fare.regular_fare).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>{parseFloat(fare.discounted_fare).toFixed(2)}</td>
                <td style={{ textAlign: 'right' }}>
                  <button className="btn btn-secondary" style={{ padding: '4px 8px' }} onClick={() => openEditModal(fare)}>
                    <Edit2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {directionFares.length === 0 && (
              <tr>
                <td colSpan={5} style={{ textAlign: 'center', padding: '24px' }}>No fares found for this direction.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="card">
      <div className="page-header-actions" style={{ marginBottom: '24px' }}>
        <h2 className="card-title">Fare Matrices</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Add Fare Row
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : fares.length === 0 ? (
        <div className="empty-state">
          <DollarSign size={48} className="empty-state-icon" />
          <p>No fare matrices configured. Please generate matrix first or add manually.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '32px', flexWrap: 'wrap' }}>
          {renderTable('LAUREL - TANAUAN', faresLT)}
          {renderTable('TANAUAN - LAUREL', faresTL)}
        </div>
      )}

      {/* Save Fare Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentFare ? 'Edit Fare Config' : 'Create Fare Config'}>
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Direction</label>
            <select className="form-input" value={direction} onChange={(e) => setDirection(e.target.value)} required>
              <option value="LT">LAUREL - TANAUAN</option>
              <option value="TL">TANAUAN - LAUREL</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Distance (KM)</label>
            <input type="number" className="form-input" value={distanceKm} onChange={(e) => setDistanceKm(e.target.value)} required />
          </div>
          <div className="form-group">
            <label className="form-label">Stop</label>
            <select className="form-input" value={stopId} onChange={(e) => setStopId(e.target.value)} required>
              <option value="">Select Stop</option>
              {stops.map(s => (
                <option key={s.stop_id} value={s.stop_id}>{s.location_name} (KM {s.km_marker})</option>
              ))}
            </select>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div className="form-group">
              <label className="form-label">Regular Fare (₱)</label>
              <input type="number" step="0.01" className="form-input" value={regularFare} onChange={(e) => setRegularFare(e.target.value)} required />
            </div>
            <div className="form-group">
              <label className="form-label">Discounted Fare (₱)</label>
              <input type="number" step="0.01" className="form-input" value={discountedFare} onChange={(e) => setDiscountedFare(e.target.value)} required />
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Saving...' : 'Save Fare'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
