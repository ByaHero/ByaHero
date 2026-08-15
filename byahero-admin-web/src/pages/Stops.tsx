import React, { useEffect, useState } from 'react';
import { Plus, Edit2, Trash2, Loader2, MapPin } from 'lucide-react';
import { adminService } from '../services/admin';
import { Stop } from '../types';
import Modal from '../components/Modal';
import StopsMap from '../components/StopsMap';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Stops() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert } = useAlertModal();

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
      if (data && data.success) {
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
      showAlert('Validation Error', 'Please fill out all required fields.', 'error');
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

      if (data && data.success) {
        setIsFormOpen(false);
        fetchStops();
      } else {
        alert(data?.error || 'Failed to save bus stop.');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while saving stop.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStop) return;
    setSaving(true);
    try {
      const data = await adminService.deleteStop(currentStop.id);
      if (data && data.success) {
        setIsDeleteOpen(false);
        fetchStops();
      } else {
        alert(data?.error || 'Failed to delete stop.');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while deleting stop.', 'error');
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
    <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-6">
      {/* Left: Stops Table */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Transit Network Stops</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Maintain coordinates, terminals, and pick-up points.</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <select 
              className="py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-[#4C85C5] focus:bg-white"
              value={routeFilter}
              onChange={(e) => setRouteFilter(e.target.value)}
            >
              <option value="ALL">All Routes</option>
              <option value="LAUREL - TANAUAN">Laurel - Tanauan</option>
              <option value="TANAUAN - LAUREL">Tanauan - Laurel</option>
            </select>
            <button 
              className="inline-flex items-center justify-center gap-2 py-2 px-3.5 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
              onClick={openAddModal}
            >
              <Plus size={16} /> New Pick-up Point
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#0f3878]" size={32} />
          </div>
        ) : filteredStops.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
            <MapPin size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-xs font-semibold">No transit stops mapped for this filter. Add one using the button above.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Stop name</th>
                  <th className="py-3.5 px-4">Route</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Latitude</th>
                  <th className="py-3.5 px-4">Longitude</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStops.map((stop) => (
                  <tr key={stop.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4 font-bold text-slate-900">{stop.name}</td>
                    <td className="py-3.5 px-4 text-[11px] text-slate-500 font-medium">{stop.route || 'LAUREL - TANAUAN'}</td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider ${
                        stop.type === 'TERMINAL' 
                          ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                          : 'bg-slate-100 text-slate-700 border border-slate-200'
                      }`}>
                        {stop.type === 'TERMINAL' ? 'Terminal' : stop.type === 'PICKUP_POINT' ? 'Pickup Point' : 'Bus Stop'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {(stop.latitude ?? (stop as any).lat) ? parseFloat((stop.latitude ?? (stop as any).lat) as any).toFixed(6) : '0.000000'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-600">
                      {(stop.longitude ?? (stop as any).lng) ? parseFloat((stop.longitude ?? (stop as any).lng) as any).toFixed(6) : '0.000000'}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center py-1 px-2.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                        stop.status === 'active' 
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                          : 'bg-red-50 text-red-700 border border-red-200'
                      }`}>
                        {stop.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end gap-1.5 items-center">
                        <button 
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" 
                          onClick={() => openEditModal(stop)}
                          title="Edit Stop"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          className="p-1.5 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer" 
                          onClick={() => openDeleteModal(stop)}
                          title="Delete Stop"
                        >
                          <Trash2 size={13} />
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

      {/* Right: Map Visualizer */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex flex-col min-h-[500px]">
        <div className="mb-4">
          <h3 className="text-base font-extrabold text-slate-800">Stops Visualizer Map</h3>
          <p className="text-xs text-slate-500 font-medium mt-0.5">
            Geographic overview of registered pick-up points and route nodes.
          </p>
        </div>
        <div className="flex-1 rounded-2xl overflow-hidden border border-slate-200 shadow-inner relative min-h-[360px]">
          <StopsMap stops={mapFriendlyStops} />
        </div>
      </div>

      {/* Save Modal with Map Inside */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title={currentStop ? 'Edit Transit Stop' : 'Map New Transit Stop'}>
        <div className="space-y-4">
          <div className="h-[200px] rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
            <StopsMap stops={mapFriendlyStops} onMapClick={handleMapClick} />
          </div>
          <p className="text-[11px] text-slate-400 italic">
            Click on the map above to select and update the latitude/longitude coordinates automatically.
          </p>

          <form onSubmit={handleSave} className="space-y-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Stop / Terminal Name</label>
              <input 
                type="text" 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                placeholder="e.g. Quezon Avenue Terminal" 
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Latitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                  value={latitude}
                  onChange={(e) => setLatitude(e.target.value)}
                  required
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Longitude</label>
                <input 
                  type="number" 
                  step="0.000001" 
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                  value={longitude}
                  onChange={(e) => setLongitude(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Transit Route Segment</label>
              <select 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                value={route} 
                onChange={(e) => setRoute(e.target.value)}
              >
                <option value="LAUREL - TANAUAN">Laurel - Tanauan</option>
                <option value="TANAUAN - LAUREL">Tanauan - Laurel</option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Designation Type</label>
                <select 
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                  value={type} 
                  onChange={(e) => setType(e.target.value)}
                >
                  <option value="PICKUP_POINT">Pickup Point</option>
                  <option value="TERMINAL">Terminal</option>
                  <option value="BUS_STOP">Bus Stop</option>
                </select>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Operational Status</label>
                <select 
                  className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                  value={status} 
                  onChange={(e) => setStatus(e.target.value as any)}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
              <button 
                type="button" 
                className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
                onClick={() => setIsFormOpen(false)} 
                disabled={saving}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-md cursor-pointer disabled:opacity-60" 
                disabled={saving}
              >
                {saving ? 'Saving...' : 'Save Stop'}
              </button>
            </div>
          </form>
        </div>
      </Modal>

      {/* Delete Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Decommission Transit Stop">
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Are you sure you want to remove <strong>{currentStop?.name}</strong> from active transit operations?
          </p>
          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsDeleteOpen(false)} 
              disabled={saving}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer disabled:opacity-60" 
              onClick={handleDelete} 
              disabled={saving}
            >
              {saving ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
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
