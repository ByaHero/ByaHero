import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Calculator, RotateCcw, Save, Search, Table as TableIcon } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface Origin {
  stop_id: string;
  location_name: string;
}

interface Snapshot {
  snapshot_id: string;
  label: string;
  created_at: string;
}

interface FareRow {
  distance_km: number;
  dest_name: string;
  regular_fare: number;
  discounted_fare: number;
}

interface FareData {
  originsList: Origin[];
  filterOrigin: string;
  snapshots: Snapshot[];
  originName: string;
  farthestDestName: string;
  fares: FareRow[];
}

export default function Fares() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FareData | null>(null);
  
  // Filters
  const [currentOrigin, setCurrentOrigin] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');

  // Matrix Form State
  const [matrixParams, setMatrixParams] = useState({
    base_km: '4',
    reg_base: '14.00',
    disc_base: '11.25',
    reg_rate: '2.20',
    disc_rate: '1.76'
  });

  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState('');

  // Modals
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [confirmModal, setConfirmModal] = useState<{ 
    isOpen: boolean; 
    title: string; 
    message: string; 
    action: () => void; 
    danger?: boolean 
  }>({ isOpen: false, title: '', message: '', action: () => {} });

  const fetchData = useCallback(async (originId = '', query = '') => {
    setLoading(true);
    try {
      let url = '/api/admin/fares'; // Or busFare.php?json=1
      const params = new URLSearchParams();
      if (originId) params.append('origin', originId);
      if (query) params.append('q', query);
      
      const resData = await apiRequest(`${url}?${params.toString()}`);
      if (resData.success !== false) {
        setData(resData as FareData);
        if (!currentOrigin) setCurrentOrigin(resData.filterOrigin);
      } else {
        setErrorModal({ isOpen: true, message: resData.error || 'Failed to fetch data.' });
      }
    } catch (error) {
      console.error(error);
      setErrorModal({ isOpen: true, message: 'Network error while fetching data.' });
    } finally {
      setLoading(false);
    }
  }, [currentOrigin]);

  useEffect(() => {
    window.scrollTo(0, 0);
    fetchData();
  }, [fetchData]);

  const handleFilterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData(currentOrigin, currentQuery);
  };

  const handleAction = async (actionName: string, bodyData: any) => {
    try {
      const res = await apiRequest('/api/admin/fares', {
        method: 'POST',
        body: JSON.stringify({ action: actionName, ...bodyData })
      });
      if (res.success) {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setSuccessModal({ isOpen: true, message: res.message || 'Action successful.' });
        fetchData(currentOrigin, currentQuery);
      } else {
        setConfirmModal({ ...confirmModal, isOpen: false });
        setErrorModal({ isOpen: true, message: res.error || 'Action failed.' });
      }
    } catch (error) {
      setConfirmModal({ ...confirmModal, isOpen: false });
      setErrorModal({ isOpen: true, message: 'Server connection failed.' });
    }
  };

  return (
    <div className="p-4 pt-6 max-w-[1400px] mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6 flex items-center">
        <div className="bg-blue-100 p-2.5 rounded-2xl mr-4">
          <TableIcon size={28} className="text-[#0f3878]" />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Manage Bus Fares</h1>
          <p className="text-slate-500 text-[14px] mt-1">Configure fare matrix and routing snapshots</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column (Actions) */}
        <div className="lg:col-span-4 space-y-6">
          
          {/* Matrix Generator */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Calculator className="text-[#1d4ed8]" size={20} />
              Matrix Generator
            </h5>
            
            <form onSubmit={(e) => {
              e.preventDefault();
              setConfirmModal({
                isOpen: true,
                title: 'Generate Matrix',
                message: 'WARNING: This will instantly overwrite all rows with mathematical matrix calculations. Proceed?',
                action: () => handleAction('generate_matrix', matrixParams),
                danger: true
              });
            }}>
              <div className="mb-4">
                <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Base Distance (km)</label>
                <input 
                  type="number" 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                  value={matrixParams.base_km}
                  onChange={e => setMatrixParams({...matrixParams, base_km: e.target.value})}
                  required 
                />
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Reg. Base (₱)</label>
                  <input 
                    type="number" step="0.01" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={matrixParams.reg_base}
                    onChange={e => setMatrixParams({...matrixParams, reg_base: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Disc. Base (₱)</label>
                  <input 
                    type="number" step="0.01" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={matrixParams.disc_base}
                    onChange={e => setMatrixParams({...matrixParams, disc_base: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-6">
                <div>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Reg. Rate / km</label>
                  <input 
                    type="number" step="0.01" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={matrixParams.reg_rate}
                    onChange={e => setMatrixParams({...matrixParams, reg_rate: e.target.value})}
                    required 
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Disc. Rate / km</label>
                  <input 
                    type="number" step="0.01" 
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30"
                    value={matrixParams.disc_rate}
                    onChange={e => setMatrixParams({...matrixParams, disc_rate: e.target.value})}
                    required 
                  />
                </div>
              </div>

              <button type="submit" className="w-full bg-[#1d4ed8] text-white font-bold py-3 rounded-xl shadow-sm hover:bg-blue-800 transition-colors">
                Generate Matrix
              </button>
            </form>

            <div className="border-t border-slate-100 my-5"></div>

            <button 
              className="w-full border-2 border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
              onClick={() => {
                setConfirmModal({
                  isOpen: true,
                  title: 'Reset to Base',
                  message: 'Revoke changes by resetting ALL fares back to their original base values?',
                  action: () => handleAction('reset_to_base', {}),
                  danger: true
                });
              }}
            >
              <RotateCcw size={18} />
              Undo (Reset to Base)
            </button>
          </div>

          {/* Snapshots */}
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
            <h5 className="font-bold mb-4 text-slate-800 flex items-center gap-2">
              <Save className="text-[#1d4ed8]" size={20} />
              Snapshots (Rollback)
            </h5>

            <form className="mb-5" onSubmit={(e) => {
              e.preventDefault();
              setConfirmModal({
                isOpen: true,
                title: 'Create Snapshot',
                message: 'Create snapshot of ALL current fares now?',
                action: () => {
                  handleAction('snapshot_create', { snapshot_label: snapshotLabel });
                  setSnapshotLabel('');
                }
              });
            }}>
              <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Snapshot label</label>
              <input 
                type="text" 
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-3"
                placeholder="e.g. Before April rate change"
                value={snapshotLabel}
                onChange={e => setSnapshotLabel(e.target.value)}
                required 
              />
              <button type="submit" className="w-full border-2 border-[#1d4ed8] text-[#1d4ed8] font-bold py-2.5 rounded-xl hover:bg-blue-50 transition-colors">
                Create Snapshot
              </button>
            </form>

            <form onSubmit={(e) => {
              e.preventDefault();
              setConfirmModal({
                isOpen: true,
                title: 'Restore Snapshot',
                message: 'Restore selected snapshot? This overwrites all current fares.',
                action: () => handleAction('snapshot_restore', { snapshot_id: selectedSnapshot }),
                danger: true
              });
            }}>
              <label className="block text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Restore snapshot</label>
              <select 
                className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-3 disabled:opacity-50"
                value={selectedSnapshot}
                onChange={e => setSelectedSnapshot(e.target.value)}
                disabled={!data?.snapshots || data.snapshots.length === 0}
                required
              >
                {!data?.snapshots || data.snapshots.length === 0 ? (
                  <option value="">No snapshots found</option>
                ) : (
                  <>
                    <option value="" disabled>Select snapshot</option>
                    {data.snapshots.map(s => (
                      <option key={s.snapshot_id} value={s.snapshot_id}>
                        #{s.snapshot_id} — {s.label} ({s.created_at})
                      </option>
                    ))}
                  </>
                )}
              </select>
              <button 
                type="submit" 
                disabled={!data?.snapshots || data.snapshots.length === 0 || !selectedSnapshot}
                className="w-full border-2 border-slate-200 text-slate-600 font-bold py-2.5 rounded-xl hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Restore Snapshot
              </button>
            </form>
          </div>
        </div>

        {/* Right Column (Table) */}
        <div className="lg:col-span-8">
          <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 h-full flex flex-col">
            
            {/* Table Controls */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
              <h5 className="font-bold text-slate-800 flex items-center gap-2 m-0 text-lg">
                <TableIcon className="text-[#1d4ed8]" size={24} />
                Route Fare Matrix
              </h5>
              
              <form onSubmit={handleFilterSubmit} className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
                <div className="relative">
                  <select 
                    className="appearance-none bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-10 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 w-full font-bold text-[14px] min-w-[200px]"
                    value={currentOrigin}
                    onChange={e => {
                      setCurrentOrigin(e.target.value);
                      fetchData(e.target.value, currentQuery);
                    }}
                  >
                    {data?.originsList?.map(o => (
                      <option key={o.stop_id} value={o.stop_id}>From: {o.location_name}</option>
                    )) || <option>Loading origins...</option>}
                  </select>
                  <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                  </div>
                </div>

                <div className="flex gap-2">
                  <div className="relative flex-grow">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="Search destination..." 
                      className="bg-slate-50 border border-slate-200 rounded-xl pl-10 pr-4 py-2.5 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 w-full"
                      value={currentQuery}
                      onChange={e => setCurrentQuery(e.target.value)}
                    />
                  </div>
                  <button type="submit" className="bg-[#1d4ed8] text-white font-bold px-6 py-2.5 rounded-xl shadow-sm hover:bg-blue-800 transition-colors">
                    Filter
                  </button>
                </div>
              </form>
            </div>

            {/* The Table */}
            <div className="border-2 border-slate-800 rounded-2xl bg-white overflow-hidden flex-grow shadow-inner">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr>
                      <th colSpan={4} className="text-center bg-slate-50 text-[18px] py-4 font-black text-[#0f3878] border-b-2 border-slate-800 uppercase tracking-widest">
                        {loading ? 'LOADING...' : data ? `${data.originName} - ${data.farthestDestName}` : 'SELECT ORIGIN'}
                      </th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-800">
                      <th rowSpan={2} className="border-r border-slate-800 text-center font-bold text-slate-600 uppercase text-[12px] p-2 w-[70px]">KM</th>
                      <th rowSpan={2} className="border-r border-slate-800 font-bold text-slate-600 uppercase text-[12px] p-3">Particulars</th>
                      <th colSpan={2} className="text-center font-bold text-slate-600 uppercase text-[12px] py-2 border-b border-slate-800">Fare</th>
                    </tr>
                    <tr className="bg-slate-50 border-b border-slate-800">
                      <th className="border-r border-slate-800 text-center font-bold text-slate-600 uppercase text-[12px] py-2 w-[130px]">Regular</th>
                      <th className="text-center font-bold text-slate-600 uppercase text-[12px] py-2 w-[130px]">S / E / D</th>
                    </tr>
                  </thead>
                  <tbody>
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12">
                          <Loader2 size={32} className="text-[#1d4ed8] animate-spin mx-auto" />
                        </td>
                      </tr>
                    ) : !data || data.fares.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center py-12 text-slate-500 font-medium bg-slate-50">
                          {data ? 'No fares found for this search.' : 'Waiting for data...'}
                        </td>
                      </tr>
                    ) : (
                      <>
                        <tr className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                          <td className="text-center border-r border-slate-200 font-bold p-2">0</td>
                          <td className="border-r border-slate-200 font-bold p-3 text-slate-800 uppercase">{data.originName}</td>
                          <td className="border-r border-slate-200 text-center text-slate-400 font-bold p-2">-</td>
                          <td className="text-center text-slate-400 font-bold p-2">-</td>
                        </tr>
                        {data.fares.map((f, i) => (
                          <tr key={i} className="border-b border-slate-200 hover:bg-blue-50 transition-colors">
                            <td className="text-center border-r border-slate-200 font-bold p-2 text-slate-600">{Math.round(f.distance_km)}</td>
                            <td className="border-r border-slate-200 font-medium p-3 text-slate-800 uppercase text-[14px]">{f.dest_name}</td>
                            <td className="text-right border-r border-slate-200 font-mono font-bold p-3 text-[15px]">₱{Number(f.regular_fare).toFixed(2)}</td>
                            <td className="text-right font-mono font-bold p-3 text-green-600 text-[15px]">₱{Number(f.discounted_fare).toFixed(2)}</td>
                          </tr>
                        ))}
                      </>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            
          </div>
        </div>

      </div>

      {/* Confirmation and Alert Modals */}
      <Modal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ ...confirmModal, isOpen: false })}
        title={confirmModal.title}
        type={confirmModal.danger ? "warning" : "info"}
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setConfirmModal({ ...confirmModal, isOpen: false })
        }}
        primaryAction={{
          label: 'Confirm',
          danger: confirmModal.danger,
          onClick: confirmModal.action
        }}
      >
        <p>{confirmModal.message}</p>
      </Modal>

      <Modal
        isOpen={successModal.isOpen}
        onClose={() => setSuccessModal({ isOpen: false, message: '' })}
        title="Success"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setSuccessModal({ isOpen: false, message: '' })
        }}
      >
        <p>{successModal.message}</p>
      </Modal>

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Action Failed"
        type="error"
        primaryAction={{
          label: 'Okay',
          onClick: () => setErrorModal({ isOpen: false, message: '' })
        }}
      >
        <p>{errorModal.message}</p>
      </Modal>

    </div>
  );
}
