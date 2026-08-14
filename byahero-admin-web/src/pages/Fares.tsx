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
      if (faresData && faresData.success) {
        setFares(faresData.fares || []);
      }
      if (stopsData && stopsData.success) {
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
    <div className="flex-1 min-w-[320px] bg-slate-50/50 p-4 rounded-2xl border border-slate-200">
      <h3 className="text-xs font-black text-[#0f3878] uppercase tracking-wider text-center mb-3.5 pb-2 border-b border-slate-200/80">
        {title}
      </h3>
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">KM</th>
              <th className="py-3 px-3">Particulars</th>
              <th className="py-3 px-3 text-right">Regular</th>
              <th className="py-3 px-3 text-right">S/E/D</th>
              <th className="py-3 px-3 text-right w-14">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {directionFares.map((fare) => (
              <tr key={fare.fare_id} className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-700">{fare.distance_km}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-800">{fare.stop_name}</td>
                <td className="py-2.5 px-3 text-right font-extrabold text-emerald-700">₱{parseFloat(fare.regular_fare).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right font-semibold text-slate-600">₱{parseFloat(fare.discounted_fare).toFixed(2)}</td>
                <td className="py-2.5 px-3 text-right">
                  <button 
                    className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" 
                    onClick={() => openEditModal(fare)}
                    title="Edit Fare"
                  >
                    <Edit2 size={12} />
                  </button>
                </td>
              </tr>
            ))}
            {directionFares.length === 0 && (
              <tr>
                <td colSpan={5} className="text-center py-8 text-xs text-slate-400 italic">No fares configured for this direction.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Bus Fares Matrix</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Update base fare values, distance-based incremental rates, and statutory discount tariffs.
          </p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
          onClick={openAddModal}
        >
          <Plus size={16} /> Add Fare Row
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : fares.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <DollarSign size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No fare matrices configured. Please add rows or generate matrix.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {renderTable('LAUREL - TANAUAN', faresLT)}
          {renderTable('TANAUAN - LAUREL', faresTL)}
        </div>
      )}

      {/* Save Fare Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentFare ? 'Edit Fare Config' : 'Create Fare Config'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Direction</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={direction} 
              onChange={(e) => setDirection(e.target.value)} 
              required
            >
              <option value="LT">LAUREL - TANAUAN</option>
              <option value="TL">TANAUAN - LAUREL</option>
            </select>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Distance (KM)</label>
            <input 
              type="number" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={distanceKm} 
              onChange={(e) => setDistanceKm(e.target.value)} 
              required 
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Stop Destination</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={stopId} 
              onChange={(e) => setStopId(e.target.value)} 
              required
            >
              <option value="">Select Stop</option>
              {stops.map(s => (
                <option key={s.id || s.stop_id} value={s.id || s.stop_id}>
                  {s.location_name || s.name} (KM {s.km_marker || 0})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Regular Fare (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                value={regularFare} 
                onChange={(e) => setRegularFare(e.target.value)} 
                required 
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Discounted Fare (₱)</label>
              <input 
                type="number" 
                step="0.01" 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                value={discountedFare} 
                onChange={(e) => setDiscountedFare(e.target.value)} 
                required 
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsFormOpen(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-md cursor-pointer disabled:opacity-60" 
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Fare'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
