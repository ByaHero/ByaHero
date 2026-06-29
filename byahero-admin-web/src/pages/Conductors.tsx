import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, ChevronDown, ChevronUp, Eye, EyeOff, UserPlus, Trash2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface StaffMember {
  id: number;
  email: string;
  name?: string;
  contacts?: string;
  created_at?: string;
  role: string;
}

export default function ConductorsPage() {
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [expanded, setExpanded] = useState(true);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('conductor');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  // Modals
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState({ email: '', role: '' });
  
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [userToDelete, setUserToDelete] = useState<{ id: number, role: string, email: string } | null>(null);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const fetchStaff = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/staff');
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
      setErrorModal({ isOpen: true, message: 'Failed to load staff list.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSave = async () => {
    if (!email.trim() || !password) {
      setErrorModal({ isOpen: true, message: 'Email and password are required.' });
      return;
    }
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ action: 'add_user', email, password, role })
      });
      if (data.success) {
        setSuccessData({ email, role });
        setSuccessModalVisible(true);
        setEmail('');
        setPassword('');
        fetchStaff();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to add user.' });
      }
    } catch (error) {
      setErrorModal({ isOpen: true, message: 'Network error while adding user.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = (id: number, role: string, email: string) => {
    setUserToDelete({ id, role, email });
    setDeleteConfirmVisible(true);
  };

  const executeRemove = async () => {
    if (!userToDelete) return;
    try {
      const data = await apiRequest('/api/admin/staff', {
        method: 'POST',
        body: JSON.stringify({ action: 'delete_user', id: userToDelete.id, role: userToDelete.role })
      });
      if (data.success) {
        setDeleteConfirmVisible(false);
        setDeleteSuccessVisible(true);
        fetchStaff();
      } else {
        setDeleteConfirmVisible(false);
        setErrorModal({ isOpen: true, message: data.error || 'Failed to delete user.' });
      }
    } catch (error) {
      setDeleteConfirmVisible(false);
      setErrorModal({ isOpen: true, message: 'Network error while deleting user.' });
    }
  };

  return (
    <div className="p-4 pt-6 max-w-lg mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <h1 className="text-[#0f172a] text-center text-[20px] font-bold mt-2 mb-4">
        New Conductor & Driver
      </h1>

      {/* Form Card */}
      <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6">
        
        <div className="mb-4">
          <label className="block text-slate-500 text-[12px] font-bold mb-1.5">First Name</label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed outline-none"
            placeholder="First Name"
            disabled
          />
        </div>

        <div className="mb-4">
          <label className="block text-slate-500 text-[12px] font-bold mb-1.5">Last name</label>
          <input
            type="text"
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400 cursor-not-allowed outline-none"
            placeholder="Last name"
            disabled
          />
        </div>

        <div className="mb-4">
          <label className="block text-slate-500 text-[12px] font-bold mb-1.5">Email</label>
          <input
            type="email"
            className="w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/30 outline-none transition-shadow shadow-sm"
            placeholder="staff@byahero.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="mb-4">
          <label className="block text-slate-500 text-[12px] font-bold mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              className="w-full bg-white border border-slate-300 rounded-xl pl-4 pr-12 py-3 text-slate-800 focus:ring-2 focus:ring-blue-500/30 outline-none transition-shadow shadow-sm"
              placeholder="********"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button 
              type="button"
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors p-1"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="mb-6">
          <label className="block text-slate-500 text-[12px] font-bold mb-1.5">Role</label>
          <div className="relative">
            <select
              className="w-full appearance-none bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 cursor-pointer focus:ring-2 focus:ring-blue-500/30 outline-none transition-shadow shadow-sm pr-10"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              <option value="conductor">Conductor</option>
              <option value="driver">Driver</option>
            </select>
            <ChevronDown size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
          </div>
        </div>

        <div className="flex justify-center items-center">
          <button 
            className="bg-[#1d4ed8] rounded-full px-10 py-3 flex flex-row items-center justify-center shadow-sm w-full max-w-[200px] transition-colors disabled:opacity-70"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? (
              <Loader2 size={18} className="animate-spin mr-2 text-white" />
            ) : null}
            <span className="font-bold text-[15px] text-white">Save</span>
          </button>
        </div>

      </div>

      {/* Registered Staff Section */}
      <div className="w-full max-w-[420px] mx-auto">
        <button 
          className="w-full flex justify-between items-center py-2 mb-2"
          onClick={() => setExpanded(!expanded)}
        >
          <span className="font-bold text-[#0f172a] text-[15px]">Registered Staff</span>
          {expanded ? <ChevronUp size={20} className="text-slate-500" /> : <ChevronDown size={20} className="text-slate-500" />}
        </button>

        {expanded && (
          <div className="bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6">
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 size={24} className="text-slate-400 animate-spin" />
              </div>
            ) : staff.length === 0 ? (
              <div className="py-10 flex justify-center">
                <span className="text-slate-400 text-[14px]">No staff accounts found.</span>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {staff.map((u, idx) => (
                  <div key={idx} className="flex justify-between items-center p-4 hover:bg-slate-50 transition-colors">
                    <div className="flex-1 pr-3 truncate">
                      <span className="font-bold text-slate-800 text-[14px] block truncate">{u.email}</span>
                      {(u.name || u.created_at) && (
                        <span className="text-slate-400 text-[12px] mt-0.5 block truncate">{u.name || u.created_at}</span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-full">
                        <span className="text-slate-600 text-[10px] font-bold uppercase tracking-wider">{u.role}</span>
                      </div>
                      
                      <button 
                        className="bg-red-50 hover:bg-red-100 text-red-600 border border-red-100 rounded-full px-3 py-1.5 transition-colors flex items-center"
                        onClick={() => confirmRemove(u.id, u.role, u.email)}
                      >
                        <Trash2 size={12} className="mr-1.5" />
                        <span className="font-bold text-[11px]">Remove</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modals */}
      <Modal
        isOpen={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
        title="Successfully Added!"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setSuccessModalVisible(false)
        }}
      >
        <p>
          <strong className="text-slate-800">{successData.email}</strong> has been added as a <strong className="text-[#1d4ed8] uppercase">{successData.role}</strong>.
        </p>
      </Modal>

      <Modal
        isOpen={deleteConfirmVisible}
        onClose={() => setDeleteConfirmVisible(false)}
        title="Confirm Deletion"
        type="warning"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setDeleteConfirmVisible(false)
        }}
        primaryAction={{
          label: 'Yes, delete',
          danger: true,
          onClick: executeRemove
        }}
      >
        <p>Are you sure you want to remove <strong className="text-slate-800">{userToDelete?.email}</strong>? This action cannot be undone.</p>
      </Modal>

      <Modal
        isOpen={deleteSuccessVisible}
        onClose={() => setDeleteSuccessVisible(false)}
        title="Successfully Removed!"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setDeleteSuccessVisible(false)
        }}
      >
        <p>
          <strong className="text-slate-800">{userToDelete?.email}</strong> has been completely removed from the system.
        </p>
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
