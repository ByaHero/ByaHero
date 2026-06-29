import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Loader2, ChevronDown, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { apiRequest } from '../services/api';
import StopsMap from '../components/StopsMap';
import Modal from '../components/Modal';

interface BusStop {
  id: number;
  name: string;
  type: string;
  route: string;
  location_name: string;
  location_landmark: string | null;
  lat: number | string;
  lng: number | string;
  sort_order: number;
}

export default function Stops() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [stops, setStops] = useState<BusStop[]>([]);
  const [stopsForward, setStopsForward] = useState<BusStop[]>([]);
  const [stopsReverse, setStopsReverse] = useState<BusStop[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('bus_stop');
  const [route, setRoute] = useState('LAUREL - TANAUAN');
  const [locationName, setLocationName] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  // Modals
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });
  const [successModal, setSuccessModal] = useState({ isOpen: false, message: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, id: 0, name: '' });

  const fetchStops = useCallback(async () => {
    try {
      setLoading(true);
      const data = await apiRequest('/api/admin/stops');
      if (data.success) {
        setStops(data.stops || []);
        setStopsForward(data.stopsForward || []);
        setStopsReverse(data.stopsReverse || []);
      }
    } catch (error) {
      console.error('Error fetching stops', error);
      setErrorModal({ isOpen: true, message: 'Failed to load stops from server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  const handleMapClick = useCallback((newLat: string, newLng: string, newLocName: string) => {
    setLat(newLat);
    setLng(newLng);
    if (newLocName) {
      setLocationName(newLocName);
    }
  }, []);

  const handleSaveStop = async () => {
    if (!name || !locationName) {
      setErrorModal({ isOpen: true, message: 'Name and Location Name are required.' });
      return;
    }
    if (!lat || !lng || lat === '0' || lng === '0') {
      setErrorModal({ isOpen: true, message: 'Please click on the map to pick a location.' });
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/stops', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_stop',
          name, type, route,
          location_name: locationName,
          location_landmark: locationLandmark,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        })
      });
      
      if (data.success) {
        setSuccessModal({ isOpen: true, message: 'Stop saved successfully.' });
        setName('');
        setLocationName('');
        setLocationLandmark('');
        setLat('');
        setLng('');
        fetchStops();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to add stop.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error occurred while saving.' });
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id: number) => {
    try {
      const data = await apiRequest('/api/admin/stops', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_stop', id })
      });
      if (data.success) {
        setDeleteConfirmModal({ isOpen: false, id: 0, name: '' });
        fetchStops();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to delete stop.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error occurred while deleting.' });
    }
  };

  const handleMoveOrder = (listData: BusStop[], setListData: React.Dispatch<React.SetStateAction<BusStop[]>>, index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === listData.length - 1) return;

    const newList = [...listData];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newList[index];
    newList[index] = newList[swapIndex];
    newList[swapIndex] = temp;
    
    setListData(newList);
  };

  const saveOrder = async (routeName: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL', list: BusStop[]) => {
    const orderStr = list.map(s => s.id).join(',');
    const action = routeName === 'LAUREL - TANAUAN' ? 'save_forward_order' : 'save_reverse_order';

    try {
      const data = await apiRequest('/api/admin/stops', {
        method: 'POST',
        body: JSON.stringify({ action, order: orderStr })
      });
      if (data.success) {
        setSuccessModal({ isOpen: true, message: `Order saved for ${routeName}.` });
        fetchStops();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to save order.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error while saving order.' });
    }
  };

  const renderRouteList = (routeName: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL', listData: BusStop[], setListData: React.Dispatch<React.SetStateAction<BusStop[]>>) => (
    <div className="bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200">
      <div className="bg-slate-50 p-4 border-b border-slate-200">
        <h3 className="text-[#1d4ed8] font-extrabold text-[15px]">{routeName} (Stops & Pick-up Points)</h3>
      </div>
      <div className="p-4">
        {listData.length === 0 ? (
          <p className="text-slate-400 text-sm text-center py-4">No stops yet for this route.</p>
        ) : (
          <div className="space-y-2">
            {listData.map((s, idx) => (
              <div key={s.id} className="flex items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100 hover:shadow-sm transition-shadow">
                <div className="flex-1">
                  <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                    <span className="font-bold text-slate-800 text-[14px]">{s.name}</span>
                    <span className="text-slate-500 text-[13px]">— {s.location_name}</span>
                  </div>
                  {!!s.location_landmark && <span className="text-slate-400 text-xs block mb-1.5">({s.location_landmark})</span>}
                  <div className="bg-slate-200 inline-flex px-2 py-0.5 rounded-full mt-1 border border-slate-300">
                    <span className="text-[10px] text-slate-700 font-bold uppercase tracking-wider">{s.type.replace('_', ' ')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 ml-4">
                  <button 
                    onClick={() => handleMoveOrder(listData, setListData, idx, 'up')}
                    disabled={idx === 0}
                    className={`p-2 rounded-full transition-colors ${idx === 0 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50 text-[#1d4ed8]'}`}
                  >
                    <ArrowUp size={20} />
                  </button>
                  <button 
                    onClick={() => handleMoveOrder(listData, setListData, idx, 'down')}
                    disabled={idx === listData.length - 1}
                    className={`p-2 rounded-full transition-colors ${idx === listData.length - 1 ? 'opacity-30 cursor-not-allowed' : 'hover:bg-blue-50 text-[#1d4ed8]'}`}
                  >
                    <ArrowDown size={20} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        {listData.length > 0 && (
          <button 
            className="mt-5 border-2 border-[#1d4ed8] text-[#1d4ed8] hover:bg-blue-50 rounded-full py-2 px-6 font-bold text-xs transition-colors shadow-sm"
            onClick={() => saveOrder(routeName, listData)}
          >
            Save Order ({routeName})
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Bus Pick up Points</h1>
        <p className="text-slate-500 text-[14px] mt-1">Manage Stops & Terminals</p>
      </div>

      {/* Map Section */}
      <div className="bg-white rounded-3xl overflow-hidden mb-8 shadow-sm border border-slate-200 flex flex-col h-[400px]">
        <div className="bg-white border-b border-slate-200 p-3.5 flex justify-between items-center z-10 shrink-0">
          <h2 className="font-extrabold text-slate-800 text-[15px]">Stops Map</h2>
          <span className="text-slate-400 text-xs font-medium">Click map to pick</span>
        </div>
        
        <div className="flex-1 bg-slate-100 relative">
          <StopsMap stops={stops} onMapClick={handleMapClick} />
        </div>
        
        <div className="bg-white border-t border-slate-200 p-3 flex justify-between items-center shrink-0">
          <span className="text-slate-500 text-xs font-medium uppercase tracking-wider">Selected coordinates:</span>
          <span className="text-slate-800 font-mono text-[13px] bg-slate-100 px-3 py-1 rounded-lg">
            {lat && lng ? `${lat}, ${lng}` : 'None'}
          </span>
        </div>
      </div>

      {/* Add Stop Form */}
      <div className="bg-white rounded-3xl overflow-hidden mb-10 shadow-sm border border-slate-200">
        <div className="bg-slate-50 border-b border-slate-200 p-4 flex items-center">
          <MapPin size={20} className="text-[#1d4ed8] mr-2" />
          <h2 className="font-extrabold text-[#1d4ed8] text-[15px]">Add Stop / Terminal</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Name</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px] bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm"
                placeholder="e.g. TALISAY"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Type</label>
              <div className="relative">
                <select
                  className="w-full appearance-none border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px] bg-white cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm pr-10"
                  value={type}
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="bus_stop">Bus Stop</option>
                  <option value="pickup_point">Pick-up Point</option>
                  <option value="terminal">Terminal</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Route</label>
              <div className="relative">
                <select
                  className="w-full appearance-none border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px] bg-white cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm pr-10"
                  value={route}
                  onChange={(e) => setRoute(e.target.value)}
                >
                  <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                  <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                </select>
                <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              </div>
            </div>

            <div>
              <label className="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Location Name</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px] bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm"
                placeholder="e.g. Mototrade"
                value={locationName}
                onChange={(e) => setLocationName(e.target.value)}
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-slate-500 text-xs font-bold mb-2 uppercase tracking-wider">Location Landmark (optional)</label>
              <input
                type="text"
                className="w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px] bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm"
                placeholder="e.g. Near public market"
                value={locationLandmark}
                onChange={(e) => setLocationLandmark(e.target.value)}
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button 
              className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white rounded-full py-3 px-8 font-bold text-[15px] transition-colors shadow-sm flex items-center justify-center min-w-[120px] disabled:opacity-70"
              onClick={handleSaveStop}
              disabled={saving}
            >
              {saving ? <Loader2 size={20} className="animate-spin" /> : 'Save Stop'}
            </button>
          </div>
        </div>
      </div>

      {/* Route Lists */}
      {renderRouteList('LAUREL - TANAUAN', stopsForward, setStopsForward)}
      {renderRouteList('TANAUAN - LAUREL', stopsReverse, setStopsReverse)}

      {/* All Existing Stops Table */}
      <div className="bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200">
        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
          <h3 className="font-extrabold text-slate-800 text-[15px]">Existing Stops (All Routes)</h3>
          <span className="text-slate-500 text-xs font-medium uppercase bg-slate-200 px-3 py-1 rounded-full">Total: {stops.length}</span>
        </div>
        
        <div className="p-3">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 size={32} className="text-[#1d4ed8] animate-spin" />
            </div>
          ) : stops.length === 0 ? (
            <p className="text-slate-400 text-center py-8">No stops have been added yet.</p>
          ) : (
            <div className="space-y-1">
              {stops.map((s) => (
                <div key={s.id} className="flex items-center justify-between p-3 hover:bg-slate-50 rounded-xl transition-colors border border-transparent hover:border-slate-100">
                  <div className="flex-1 pr-4">
                    <span className="font-bold text-slate-800 text-[14px] block mb-1">{s.name}</span>
                    <span className="text-slate-500 text-[13px] block mb-1">{s.location_name}</span>
                    {!!s.location_landmark && <span className="text-slate-400 text-[11px] block">Landmark: {s.location_landmark}</span>}
                    <span className="text-[#1d4ed8] font-bold text-[10px] uppercase tracking-wider block mt-1.5">{s.type.replace('_', ' ')} • {s.route}</span>
                  </div>
                  <button 
                    className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-full px-4 py-1.5 transition-colors flex items-center shrink-0"
                    onClick={() => setDeleteConfirmModal({ isOpen: true, id: s.id, name: s.name })}
                  >
                    <Trash2 size={14} className="mr-1.5" />
                    <span className="font-bold text-[11px]">Delete</span>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, id: 0, name: '' })}
        title="Delete Stop"
        type="warning"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setDeleteConfirmModal({ isOpen: false, id: 0, name: '' })
        }}
        primaryAction={{
          label: 'Yes, delete it',
          danger: true,
          onClick: () => executeDelete(deleteConfirmModal.id)
        }}
      >
        <p>Are you sure you want to permanently delete the stop <strong className="text-slate-800">{deleteConfirmModal.name}</strong>?</p>
        <p className="mt-2 text-sm text-amber-600 font-medium">This action cannot be undone.</p>
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
