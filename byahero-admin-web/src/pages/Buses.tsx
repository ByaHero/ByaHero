import React, { useState, useEffect, useCallback } from 'react';
import { Trash2, Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';
import busIcon from '../../assets/images/busonallbuses.svg';
import Modal from '../components/Modal';

interface Bus {
  Bus_ID?: number | string;
  id?: number | string;
  code?: string;
  status?: string;
}

export default function Buses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [newBusCode, setNewBusCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Local state for dropdown edits
  const [editedStatuses, setEditedStatuses] = useState<Record<string, string>>({});

  // Modal States
  const [addSuccessModal, setAddSuccessModal] = useState({ isOpen: false, busCode: '' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ isOpen: false, id: '', code: '' });
  const [deleteSuccessModal, setDeleteSuccessModal] = useState({ isOpen: false, code: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const fetchBuses = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/buses');
      if (data.success && data.buses) {
        setBuses(data.buses);
        
        // Initialize edited statuses
        const initialStatuses: Record<string, string> = {};
        data.buses.forEach((b: Bus) => {
          const id = (b.Bus_ID || b.id)?.toString();
          if (id) {
            initialStatuses[id] = b.status?.toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
          }
        });
        setEditedStatuses(initialStatuses);
      } else {
        setBuses([]);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
      setErrorModal({ isOpen: true, message: 'Failed to load buses from the server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const handleAddBus = async () => {
    if (!newBusCode.trim()) {
      setErrorModal({ isOpen: true, message: 'Please enter a bus code before saving.' });
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/buses', {
        method: 'POST',
        body: JSON.stringify({ action: 'add_bus', code: newBusCode.trim() })
      });
      
      if (data.success) {
        setAddSuccessModal({ isOpen: true, busCode: newBusCode.trim() });
        setNewBusCode('');
        fetchBuses();
      } else {
        setErrorModal({ isOpen: true, message: data.message || 'Failed to add bus.' });
      }
    } catch (error) {
      console.error('Error adding bus:', error);
      setErrorModal({ isOpen: true, message: 'Network error occurred while adding bus.' });
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id: string | number) => {
    try {
      const data = await apiRequest('/api/admin/buses', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_bus', id })
      });
      if (data.success) {
        setDeleteConfirmModal({ isOpen: false, id: '', code: '' });
        setDeleteSuccessModal({ isOpen: true, code: deleteConfirmModal.code });
        fetchBuses();
      } else {
        setErrorModal({ isOpen: true, message: data.error || data.message || 'Failed to delete bus.' });
        setDeleteConfirmModal({ isOpen: false, id: '', code: '' });
      }
    } catch (error) {
      console.error('Error deleting bus:', error);
      setErrorModal({ isOpen: true, message: error instanceof Error ? error.message : String(error) });
      setDeleteConfirmModal({ isOpen: false, id: '', code: '' });
    }
  };

  const handleDeleteBusClick = (id: string | number, code: string) => {
    setDeleteConfirmModal({ isOpen: true, id: id.toString(), code });
  };

  const handleSaveStatus = async (id: string | number) => {
    const stringId = id.toString();
    const newStatus = editedStatuses[stringId];
    
    // Check if it actually changed to avoid unnecessary API calls
    const bus = buses.find(b => (b.Bus_ID || b.id)?.toString() === stringId);
    const originalStatus = bus?.status?.toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
    
    if (newStatus === originalStatus) {
      // No change needed
      return;
    }

    setUpdatingId(id);
    try {
      const data = await apiRequest('/api/admin/buses', {
        method: 'POST',
        body: JSON.stringify({ action: 'update_bus', id, status: newStatus })
      });
      if (data.success) {
        fetchBuses();
      } else {
        setErrorModal({ isOpen: true, message: data.message || 'Failed to update status.' });
      }
    } catch (error) {
      console.error('Error updating bus status:', error);
      setErrorModal({ isOpen: true, message: 'Network error occurred while updating status.' });
    } finally {
      setUpdatingId(null);
    }
  };

  const handleStatusChange = (id: string | number, newStatus: string) => {
    setEditedStatuses(prev => ({
      ...prev,
      [id.toString()]: newStatus
    }));
  };

  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto w-full pb-16 font-sans relative">
      
      {/* Add Bus Card */}
      <div className="bg-white rounded-2xl p-5 mb-8 border border-slate-100 shadow-sm">
        <h2 className="text-black text-[17px] font-extrabold mb-4">Add Bus</h2>
        <input 
          type="text"
          className="w-full border border-slate-200 rounded-xl p-3 px-4 text-slate-800 mb-4 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-shadow text-[13px]"
          placeholder="Bus 00001"
          value={newBusCode}
          onChange={(e) => setNewBusCode(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') handleAddBus();
          }}
        />
        <div className="flex justify-end">
          <button 
            className="bg-[#1d4ed8] hover:bg-[#1e40af] transition-colors px-6 py-2 rounded-full shadow-sm flex items-center disabled:opacity-70"
            onClick={handleAddBus}
            disabled={saving}
          >
            {saving && <Loader2 size={16} className="text-white mr-2 animate-spin" />}
            <span className="text-white font-bold text-[13px]">Save</span>
          </button>
        </div>
      </div>

      {/* All Buses Header */}
      <h2 className="text-black text-[17px] font-extrabold mb-4 ml-1">All Buses</h2>

      {loading ? (
        <div className="flex justify-center mt-10">
          <Loader2 size={32} className="text-[#0f3878] animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {buses.map((bus) => {
            const busId = (bus.Bus_ID || bus.id)?.toString() || '';
            const currentEditedStatus = editedStatuses[busId] || 'available';
            const isUnavailable = currentEditedStatus === 'unavailable';
            const isUpdating = updatingId === busId;

            return (
              <div key={busId} className="bg-white rounded-2xl p-4 pb-5 shadow-sm border border-slate-100 flex items-center hover:shadow-md transition-shadow">
                <div className="w-[80px] flex justify-center items-center shrink-0 pr-2">
                  <img src={busIcon} alt="Bus" className="w-[50px] h-[50px] object-contain" />
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-slate-500 text-[12px]">Code</span>
                    <span className="text-slate-800 font-bold text-[14px]">{bus.code}</span>
                  </div>

                  <div className="flex justify-between items-center mb-4">
                    <span className="text-slate-500 text-[12px]">Status</span>
                    <div className="relative">
                      <select 
                        className={`appearance-none outline-none cursor-pointer px-4 py-1.5 pr-8 rounded-full text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          isUnavailable 
                            ? 'bg-[#ffccd5] text-[#c1121f]' 
                            : 'bg-green-100 text-green-700'
                        }`}
                        value={currentEditedStatus}
                        onChange={(e) => handleStatusChange(busId, e.target.value)}
                        disabled={isUpdating}
                      >
                        <option value="available">Available</option>
                        <option value="unavailable">Unavailable</option>
                      </select>
                      {/* Custom dropdown arrow to match prototype */}
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2">
                        <svg className={`h-3 w-3 ${isUnavailable ? 'fill-[#c1121f]' : 'fill-green-700'}`} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
                          <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-1">
                    <span className="text-slate-500 text-[12px]">Actions</span>
                    <div className="flex gap-2">
                      <button 
                        className="bg-[#1d4ed8] hover:bg-[#1e40af] text-white transition-colors px-5 py-1.5 rounded-full flex items-center disabled:opacity-50 shadow-sm"
                        onClick={() => handleSaveStatus(busId)}
                        disabled={isUpdating}
                      >
                        {isUpdating && <Loader2 size={12} className="text-white mr-1.5 animate-spin" />}
                        <span className="font-bold text-[11px]">Save</span>
                      </button>
                      
                      <button 
                        className="bg-[#b91c1c] hover:bg-[#991b1b] text-white transition-colors px-4 py-1.5 rounded-full flex items-center shadow-sm"
                        onClick={() => handleDeleteBusClick(busId, bus.code || '')}
                        disabled={isUpdating}
                      >
                        <span className="font-bold text-[11px]">Delete</span>
                      </button>
                    </div>
                  </div>

                </div>
              </div>
            );
          })}
          
          {!loading && buses.length === 0 && (
            <div className="text-center text-slate-500 mt-10 py-8 bg-white rounded-2xl border border-dashed border-slate-300">
              No buses found. Add one above.
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <Modal
        isOpen={addSuccessModal.isOpen}
        onClose={() => setAddSuccessModal({ isOpen: false, busCode: '' })}
        title="Bus Added Successfully"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setAddSuccessModal({ isOpen: false, busCode: '' })
        }}
      >
        <p>The bus <strong className="text-slate-800">{addSuccessModal.busCode}</strong> has been successfully added to the system and is now available for assignment.</p>
      </Modal>

      <Modal
        isOpen={deleteConfirmModal.isOpen}
        onClose={() => setDeleteConfirmModal({ isOpen: false, id: '', code: '' })}
        title="Delete Bus"
        type="warning"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setDeleteConfirmModal({ isOpen: false, id: '', code: '' })
        }}
        primaryAction={{
          label: 'Yes, delete it',
          danger: true,
          onClick: () => executeDelete(deleteConfirmModal.id)
        }}
      >
        <p>Are you sure you want to permanently delete <strong className="text-slate-800">{deleteConfirmModal.code}</strong>?</p>
        <p className="mt-2 text-sm text-amber-600 font-medium">This action cannot be undone and will remove all associated records.</p>
      </Modal>

      <Modal
        isOpen={deleteSuccessModal.isOpen}
        onClose={() => setDeleteSuccessModal({ isOpen: false, code: '' })}
        title="Bus Deleted"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setDeleteSuccessModal({ isOpen: false, code: '' })
        }}
      >
        <p>The bus <strong className="text-slate-800">{deleteSuccessModal.code}</strong> has been permanently removed from the system.</p>
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
