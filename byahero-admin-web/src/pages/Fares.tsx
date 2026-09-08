import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Loader2, 
  DollarSign, 
  Calculator, 
  Layers, 
  Zap, 
  TrendingUp, 
  TrendingDown
} from 'lucide-react';
import { adminService } from '../services/admin';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Fares() {
  const [fares, setFares] = useState<any[]>([]);
  const [stops, setStops] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert, showConfirm } = useAlertModal();

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [currentFare, setCurrentFare] = useState<any | null>(null);

  // Direction filter tab
  const [directionTab, setDirectionTab] = useState<'ALL' | 'LT' | 'TL'>('ALL');

  // Matrix Generator form states
  const [baseKm, setBaseKm] = useState('4');
  const [regBase, setRegBase] = useState('15.00');
  const [discBase, setDiscBase] = useState('12.00');
  const [regRate, setRegRate] = useState('2.20');
  const [discRate, setDiscRate] = useState('1.76');
  const [generatingMatrix, setGeneratingMatrix] = useState(false);

  // Flat Adjustment form states
  const [flatAdjustAmount, setFlatAdjustAmount] = useState('1.00');
  const [flatAdjustType, setFlatAdjustType] = useState<'increase' | 'decrease'>('increase');
  const [adjustingFlat, setAdjustingFlat] = useState(false);

  // Manual Form Inputs
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
    } catch (e: any) {
      console.error(e);
      showAlert('Error', 'Failed to load fares data.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitialData();
  }, []);

  const openAddModal = () => {
    setCurrentFare(null);
    setDirection(directionTab === 'TL' ? 'TL' : 'LT');
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
      showAlert('Validation Error', 'Please fill out all required fields.', 'error');
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
        showAlert('Error', data.error || 'Failed to save fare rules.', 'error');
      }
    } catch (e: any) {
      showAlert('Network Error', e.message || 'Network error while saving fares.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleGenerateMatrix = async () => {
    showConfirm(
      'Generate Full Fare Matrix',
      'WARNING: This will automatically calculate and overwrite all rows using LTFRB base parameters. Are you sure you want to proceed?',
      async () => {
        setGeneratingMatrix(true);
        try {
          const res = await apiRequest('/api/admin/fares', {
            method: 'POST',
            body: JSON.stringify({
              action: 'generate_matrix',
              base_km: baseKm,
              reg_base: regBase,
              disc_base: discBase,
              reg_rate: regRate,
              disc_rate: discRate
            })
          });

          if (res && res.success) {
            showAlert('Matrix Generated', res.message || 'Fare matrix successfully recalculated.', 'success');
            fetchInitialData();
          } else {
            showAlert('Error', res?.error || 'Failed to generate fare matrix.', 'error');
          }
        } catch (e: any) {
          showAlert('Error', e.message || 'Server connection failed while generating matrix.', 'error');
        } finally {
          setGeneratingMatrix(false);
        }
      }
    );
  };

  const handleFlatAdjustment = async () => {
    const isDecrease = flatAdjustType === 'decrease';
    const amountVal = parseFloat(flatAdjustAmount) || 0;
    if (amountVal <= 0) {
      showAlert('Invalid Amount', 'Please enter a valid positive adjustment amount.', 'warning');
      return;
    }
    const finalAmount = isDecrease ? `-${flatAdjustAmount}` : flatAdjustAmount;

    showConfirm(
      'Flat Fare Adjustment',
      `This will instantly ${isDecrease ? 'reduce' : 'add'} ₱${flatAdjustAmount} ${isDecrease ? 'from' : 'to'} ALL fare rows (regular and discounted). Continue?`,
      async () => {
        setAdjustingFlat(true);
        try {
          const res = await apiRequest('/api/admin/fares', {
            method: 'POST',
            body: JSON.stringify({
              action: 'adjust_fares_flat',
              amount: finalAmount
            })
          });

          if (res && res.success) {
            showAlert('Adjustment Applied', res.message || 'Flat adjustment applied to all fares.', 'success');
            fetchInitialData();
          } else {
            showAlert('Error', res?.error || 'Failed to adjust fares.', 'error');
          }
        } catch (e: any) {
          showAlert('Error', e.message || 'Server connection failed while adjusting fares.', 'error');
        } finally {
          setAdjustingFlat(false);
        }
      }
    );
  };

  const faresLT = fares.filter(f => f.direction === 'LT');
  const faresTL = fares.filter(f => f.direction === 'TL');

  const renderTable = (title: string, directionFares: any[]) => (
    <div className="flex-1 min-w-[320px] bg-slate-50/50 p-5 rounded-2xl border border-slate-200 shadow-xs">
      <div className="flex justify-between items-center mb-3.5 pb-2 border-b border-slate-200">
        <h3 className="text-xs font-black text-[#0f3878] uppercase tracking-wider">
          {title}
        </h3>
        <span className="text-[11px] font-bold text-slate-400 bg-white px-2.5 py-0.5 rounded-full border border-slate-200">
          {directionFares.length} Stops
        </span>
      </div>
      <div className="w-full overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-xs">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-3 w-12 text-center">KM</th>
              <th className="py-3 px-3">Particulars / Stop</th>
              <th className="py-3 px-3 text-right">Regular</th>
              <th className="py-3 px-3 text-right">Discounted</th>
              <th className="py-3 px-3 text-right w-14">Edit</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {directionFares.map((fare) => (
              <tr key={fare.fare_id} className="hover:bg-slate-50/70 transition">
                <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-700">{fare.distance_km}</td>
                <td className="py-2.5 px-3 font-semibold text-slate-800 uppercase">{fare.stop_name}</td>
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
    <div className="space-y-6">
      {/* Top Header */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-wrap justify-between items-center gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Bus Fares Matrix & Tariff Tools</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Configure LTFRB base parameters, batch adjust tariffs, or update individual distance rows.
          </p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-bold">
            <button 
              onClick={() => setDirectionTab('ALL')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${directionTab === 'ALL' ? 'bg-white shadow-xs text-[#0f3878]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              All Routes
            </button>
            <button 
              onClick={() => setDirectionTab('LT')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${directionTab === 'LT' ? 'bg-white shadow-xs text-[#0f3878]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              LRL ➔ TAN
            </button>
            <button 
              onClick={() => setDirectionTab('TL')}
              className={`py-1.5 px-3 rounded-lg transition cursor-pointer ${directionTab === 'TL' ? 'bg-white shadow-xs text-[#0f3878]' : 'text-slate-500 hover:text-slate-800'}`}
            >
              TAN ➔ LRL
            </button>
          </div>
          <button 
            className="inline-flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
            onClick={openAddModal}
          >
            <Plus size={15} /> Add Fare Row
          </button>
        </div>
      </div>

      {/* Advanced Calculation Tools: Matrix Generator & Flat Adjustment */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LTFRB Matrix Generator Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Calculator size={18} className="text-blue-600" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              LTFRB Formula Matrix Generator
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Automatically computes and updates all fare stages across both directions based on base distance and kilometer rates.
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Base Dist (KM)</label>
              <input 
                type="number"
                step="0.1"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={baseKm}
                onChange={(e) => setBaseKm(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Reg Base (₱)</label>
              <input 
                type="number"
                step="0.01"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={regBase}
                onChange={(e) => setRegBase(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Disc Base (₱)</label>
              <input 
                type="number"
                step="0.01"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={discBase}
                onChange={(e) => setDiscBase(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Reg Rate/KM (₱)</label>
              <input 
                type="number"
                step="0.01"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={regRate}
                onChange={(e) => setRegRate(e.target.value)}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Disc Rate/KM (₱)</label>
              <input 
                type="number"
                step="0.01"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={discRate}
                onChange={(e) => setDiscRate(e.target.value)}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleGenerateMatrix}
            disabled={generatingMatrix}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm cursor-pointer disabled:opacity-60"
          >
            {generatingMatrix ? <Loader2 size={15} className="animate-spin" /> : <Zap size={15} />}
            Generate All Matrix Rows
          </button>
        </div>

        {/* Flat Fare Adjustment Card */}
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 pb-3 mb-4 border-b border-slate-100">
            <Layers size={18} className="text-amber-600" />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Flat Fare Batch Adjustment
            </h3>
          </div>
          <p className="text-xs text-slate-500 mb-4">
            Instantly increment or decrement all fare rows by a fixed peso amount across the entire transport network.
          </p>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Adjustment Type</label>
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200">
                <button
                  type="button"
                  onClick={() => setFlatAdjustType('increase')}
                  className={`flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    flatAdjustType === 'increase' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <TrendingUp size={13} /> + Inc
                </button>
                <button
                  type="button"
                  onClick={() => setFlatAdjustType('decrease')}
                  className={`flex-1 inline-flex items-center justify-center gap-1 py-2 rounded-lg text-xs font-bold transition cursor-pointer ${
                    flatAdjustType === 'decrease' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500'
                  }`}
                >
                  <TrendingDown size={13} /> - Dec
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Amount (₱)</label>
              <input 
                type="number"
                step="0.50"
                className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white font-semibold"
                value={flatAdjustAmount}
                onChange={(e) => setFlatAdjustAmount(e.target.value)}
                placeholder="e.g. 1.00"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={handleFlatAdjustment}
            disabled={adjustingFlat}
            className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-slate-800 hover:bg-slate-900 transition shadow-sm cursor-pointer disabled:opacity-60 mt-1"
          >
            {adjustingFlat ? <Loader2 size={15} className="animate-spin" /> : <Layers size={15} />}
            Apply Flat Adjustment to All Fares
          </button>
        </div>
      </div>

      {/* Tables Section */}
      {loading ? (
        <div className="flex justify-center py-16 bg-white rounded-3xl border border-slate-200">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : fares.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-white rounded-3xl border border-dashed border-slate-300">
          <DollarSign size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No fare matrices configured. Please use the generator above or add rows.</p>
        </div>
      ) : (
        <div className="flex flex-wrap gap-6">
          {(directionTab === 'ALL' || directionTab === 'LT') && renderTable('LAUREL - TANAUAN', faresLT)}
          {(directionTab === 'ALL' || directionTab === 'TL') && renderTable('TANAUAN - LAUREL', faresTL)}
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

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
