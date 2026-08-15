import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Loader2, 
  AlertCircle, 
  StopCircle, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2,
  Bus as BusIcon
} from 'lucide-react';
import { adminService } from '../services/admin';
import { Bus, ActiveBus } from '../types';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Buses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [activeBusesMap, setActiveBusesMap] = useState<{ [busId: number]: ActiveBus }>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const { alertConfig, showAlert, showConfirm } = useAlertModal();

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentBus, setCurrentBus] = useState<Bus | null>(null);

  // Force Stop Tracking Modal
  const [isStopModalOpen, setIsStopModalOpen] = useState(false);
  const [selectedBusToStop, setSelectedBusToStop] = useState<Bus | null>(null);
  const [stoppingBusId, setStoppingBusId] = useState<number | null>(null);

  // Success / Error Modals
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Form inputs
  const [busNo, setBusNo] = useState('');
  const [plateNo, setPlateNo] = useState('');
  const [capacity, setCapacity] = useState(50);
  const [status, setStatus] = useState<'active' | 'inactive' | 'maintenance'>('active');
  const [description, setDescription] = useState('');

  const fetchBusesAndActive = async () => {
    try {
      setLoading(true);
      const [data, activeData] = await Promise.all([
        adminService.listBuses(),
        adminService.listActiveBuses().catch(() => null)
      ]);

      if (data && data.success) {
        const mapped = (data.buses || []).map((b: any) => ({
          ...b,
          id: b.Bus_ID || b.id,
          bus_no: b.code || b.bus_no || '',
          plate_no: b.plate_no || b.code || 'N/A',
          capacity: b.total_seats || b.capacity || 25,
          status: b.status || 'inactive'
        }));
        setBuses(mapped);
      }

      if (activeData && activeData.success) {
        const map: { [busId: number]: ActiveBus } = {};
        (activeData.activeBuses || activeData.active_buses || []).forEach((ab: ActiveBus) => {
          const id = ab.Bus_ID || ab.id;
          if (id) map[id] = ab;
        });
        setActiveBusesMap(map);
      }
    } catch (e) {
      setError('Failed to load buses.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBusesAndActive();
  }, []);

  const openAddModal = () => {
    setCurrentBus(null);
    setBusNo('');
    setPlateNo('');
    setCapacity(25);
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

  const confirmForceStop = (bus: Bus) => {
    setSelectedBusToStop(bus);
    setIsStopModalOpen(true);
  };

  const handleForceStop = async () => {
    if (!selectedBusToStop) return;
    const busId = selectedBusToStop.id || selectedBusToStop.Bus_ID;
    if (!busId) return;

    try {
      setStoppingBusId(busId);
      setIsStopModalOpen(false);
      const res = await adminService.stopActiveBus(busId);

      if (res && res.success) {
        await fetchBusesAndActive();
        setSuccessMessage(`Live tracking session for Bus ${selectedBusToStop.bus_no} was successfully terminated.`);
        setSuccessModalVisible(true);
      } else {
        setErrorMessage(res?.error || 'Failed to stop tracking for this bus.');
        setErrorModalVisible(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || 'An unexpected error occurred while stopping tracking.');
      setErrorModalVisible(true);
    } finally {
      setStoppingBusId(null);
      setSelectedBusToStop(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!busNo.trim() || !plateNo.trim() || !capacity) {
      showAlert('Validation Error', 'Please fill out all required fields.', 'error');
      return;
    }

    setSaving(true);
    try {
      let data;
      if (currentBus) {
        data = await adminService.updateBus({
          id: currentBus.id,
          code: busNo,
          plate_no: plateNo,
          total_seats: capacity,
          status,
          description
        });
      } else {
        data = await adminService.addBus({
          code: busNo,
          plate_no: plateNo,
          total_seats: capacity,
          status,
          description
        });
      }

      if (data.success) {
        setIsFormOpen(false);
        fetchBusesAndActive();
      } else {
        showAlert('Error', data.error || 'Failed to save bus info.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while saving bus.', 'error');
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
        fetchBusesAndActive();
      } else {
        showAlert('Error', data.error || 'Failed to delete bus.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while deleting bus.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Bus Directory</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Manage fleet inventory, seating capacities, assignments, and active tracking overrides.
          </p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
          onClick={openAddModal}
        >
          <Plus size={16} /> Register New Bus
        </button>
      </div>

      {error && (
        <div className="p-3.5 text-xs font-bold text-red-700 bg-red-50 border border-red-200 rounded-xl mb-4">
          {error}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : buses.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <AlertCircle size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No registered buses found. Click the button above to add one.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Bus No.</th>
                <th className="py-3.5 px-4">Plate Number</th>
                <th className="py-3.5 px-4">Capacity</th>
                <th className="py-3.5 px-4">Conductor Assignment</th>
                <th className="py-3.5 px-4">Live Status</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {buses.map((bus) => {
                const busId = bus.id || bus.Bus_ID;
                const isLiveTracking = Boolean(busId && activeBusesMap[busId]);
                const isStopping = stoppingBusId === busId;

                return (
                  <tr key={bus.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                          <BusIcon size={15} />
                        </div>
                        <span className="font-extrabold text-slate-900">Bus {bus.bus_no}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold bg-slate-100 text-slate-700 px-2 py-1 rounded-md text-[11px]">
                        {bus.plate_no}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-700 font-semibold">{bus.capacity} seats</td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {bus.conductor_name || (bus.conductor_email ? bus.conductor_email.split('@')[0] : <span className="text-slate-400 text-xs italic">None Assigned</span>)}
                    </td>
                    <td className="py-3.5 px-4">
                      {isLiveTracking ? (
                        <div className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200/80 py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                          <span>Tracking Active</span>
                        </div>
                      ) : (
                        <span className={`inline-flex items-center py-1 px-2.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                          bus.status === 'active' 
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' 
                            : bus.status === 'inactive' 
                            ? 'bg-red-50 text-red-700 border border-red-200' 
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {bus.status}
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex justify-end items-center gap-2">
                        {isLiveTracking && (
                          <button 
                            className="inline-flex items-center gap-1 bg-red-50 text-red-600 border border-red-200 hover:bg-red-600 hover:text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer disabled:opacity-60"
                            onClick={() => confirmForceStop(bus)}
                            disabled={isStopping}
                            title={`Force stop tracking for Bus ${bus.bus_no}`}
                          >
                            {isStopping ? (
                              <Loader2 size={12} className="animate-spin" />
                            ) : (
                              <StopCircle size={12} />
                            )}
                            Force Stop
                          </button>
                        )}
                        <button 
                          className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer" 
                          onClick={() => openEditModal(bus)} 
                          title="Edit Bus"
                        >
                          <Edit2 size={13} />
                        </button>
                        <button 
                          className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer" 
                          onClick={() => openDeleteModal(bus)} 
                          title="Delete Bus"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
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
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Bus Number</label>
            <input 
              type="text" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="e.g. 101" 
              value={busNo} 
              onChange={(e) => setBusNo(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Plate Number</label>
            <input 
              type="text" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="e.g. ABC 1234" 
              value={plateNo} 
              onChange={(e) => setPlateNo(e.target.value)}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Max Seating Capacity</label>
              <input 
                type="number" 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                value={capacity} 
                onChange={(e) => setCapacity(parseInt(e.target.value))}
                required
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Operations Status</label>
              <select 
                className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
                value={status} 
                onChange={(e) => setStatus(e.target.value as any)}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Description / Remarks</label>
            <textarea 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              rows={3} 
              placeholder="Operational routing or configuration notes..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
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
        <div className="space-y-3">
          <p className="text-xs text-slate-600">
            Are you sure you want to deregister <strong>Bus {currentBus?.bus_no}</strong> ({currentBus?.plate_no})?
          </p>
          <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100">
            This operation is permanent and will clear all current conductor allocations.
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

      {/* Force Stop Tracking Confirmation Modal */}
      <Modal 
        isOpen={isStopModalOpen} 
        onClose={() => setIsStopModalOpen(false)} 
        title="Force Stop Tracking Authorization"
      >
        <div className="space-y-4">
          <div className="bg-red-50 border border-red-200 rounded-2xl p-4">
            <div className="flex items-center gap-2.5 text-red-600 font-extrabold text-sm">
              <ShieldAlert size={20} />
              <span>Administrative Force Stop Tracking</span>
            </div>
            <p className="text-xs text-red-800 mt-1.5 leading-relaxed font-medium">
              You are authorizing the system to forcefully terminate live tracking for <strong>Bus {selectedBusToStop?.bus_no}</strong> ({selectedBusToStop?.plate_no}).
            </p>
          </div>

          <ul className="space-y-2 text-xs text-red-800">
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <span><strong>Live Telemetry Terminated:</strong> Bus coordinates and tracking streams will immediately end.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <span><strong>Conductor Unassigned:</strong> Active conductor session will be closed.</span>
            </li>
            <li className="flex items-start gap-2">
              <AlertTriangle size={14} className="text-red-600 shrink-0 mt-0.5" />
              <span><strong>Passenger Rides Finalized:</strong> In-progress passenger rides will be marked completed.</span>
            </li>
          </ul>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100">
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 transition cursor-pointer" 
              onClick={() => setIsStopModalOpen(false)}
              disabled={stoppingBusId !== null}
            >
              Cancel
            </button>
            <button 
              type="button" 
              className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition cursor-pointer inline-flex items-center gap-2 disabled:opacity-60 shadow-md shadow-red-500/20" 
              onClick={handleForceStop}
              disabled={stoppingBusId !== null}
            >
              {stoppingBusId !== null ? (
                <>
                  <Loader2 size={14} className="animate-spin" />
                  Terminating Session...
                </>
              ) : (
                <>
                  <StopCircle size={14} />
                  Confirm Force Stop
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Error Modal */}
      <Modal isOpen={errorModalVisible} onClose={() => setErrorModalVisible(false)} title="Force Stop Failed">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="text-red-600 bg-red-50 p-2.5 rounded-full shrink-0 border border-red-100">
            <AlertTriangle size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Action Could Not Be Completed</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{errorMessage}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition cursor-pointer" 
            onClick={() => setErrorModalVisible(false)}
          >
            Acknowledge
          </button>
        </div>
      </Modal>

      {/* Success Modal */}
      <Modal isOpen={successModalVisible} onClose={() => setSuccessModalVisible(false)} title="Tracking Terminated">
        <div className="flex items-start gap-3.5 mb-5">
          <div className="text-emerald-600 bg-emerald-50 p-2.5 rounded-full shrink-0 border border-emerald-100">
            <CheckCircle2 size={24} />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 mb-1">Tracking Forcefully Stopped</h4>
            <p className="text-xs text-slate-600 leading-relaxed">{successMessage}</p>
          </div>
        </div>
        <div className="flex justify-end">
          <button 
            className="py-2 px-4 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition cursor-pointer" 
            onClick={() => setSuccessModalVisible(false)}
          >
            Close
          </button>
        </div>
      </Modal>
      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        confirmText={alertConfig.confirmText}
        cancelText={alertConfig.cancelText}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
