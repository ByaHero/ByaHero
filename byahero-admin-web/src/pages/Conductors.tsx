import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, UserCheck, ShieldAlert } from 'lucide-react';
import { adminService } from '../services/admin';
import { StaffMember } from '../types';
import Modal from '../components/Modal';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function Conductors() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { alertConfig, showAlert } = useAlertModal();

  // Form states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [currentStaff, setCurrentStaff] = useState<StaffMember | null>(null);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'conductor' | 'driver'>('conductor');

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await adminService.listStaff();
      if (data && data.success) {
        setStaff(data.staff || []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const openAddModal = () => {
    setEmail('');
    setPassword('');
    setRole('conductor');
    setIsFormOpen(true);
  };

  const openDeleteModal = (member: StaffMember) => {
    setCurrentStaff(member);
    setIsDeleteOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      showAlert('Validation Error', 'Email and Password are required.', 'error');
      return;
    }

    setSaving(true);
    try {
      const data = await adminService.addStaff({ email: email.trim(), password, role });
      if (data.success) {
        setIsFormOpen(false);
        fetchStaff();
      } else {
        showAlert('Error', data.error || 'Failed to add staff member.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while registering staff.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!currentStaff) return;
    setSaving(true);
    try {
      const data = await adminService.deleteStaff(currentStaff.id, currentStaff.role);
      if (data.success) {
        setIsDeleteOpen(false);
        fetchStaff();
      } else {
        showAlert('Error', data.error || 'Failed to delete staff member.', 'error');
      }
    } catch (e) {
      showAlert('Network Error', 'Network error while deleting staff.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
      <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
        <div>
          <h2 className="text-xl font-black text-slate-800 tracking-tight">Operations Personnel Directory</h2>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Create, inspect, and remove conductor and driver accounts with role-based access.
          </p>
        </div>
        <button 
          className="inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-bold rounded-xl bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer" 
          onClick={openAddModal}
        >
          <Plus size={16} /> Register New Staff
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 className="animate-spin text-[#0f3878]" size={32} />
        </div>
      ) : staff.length === 0 ? (
        <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
          <UserCheck size={48} className="mx-auto mb-3 text-slate-300" />
          <p className="text-xs font-semibold">No registered personnel accounts found.</p>
        </div>
      ) : (
        <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Personnel User</th>
                <th className="py-3.5 px-4">Role Designation</th>
                <th className="py-3.5 px-4">Contact details</th>
                <th className="py-3.5 px-4">Registered Date</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={`${member.role}-${member.id}`} className="hover:bg-slate-50/70 transition">
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <span className="font-extrabold text-slate-900">{member.name || member.email.split('@')[0]}</span>
                      <span className="text-[11px] text-slate-400 font-medium">{member.email}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-flex items-center py-1 px-2.5 text-[10px] font-extrabold rounded-full uppercase tracking-wider ${
                      member.role === 'driver' 
                        ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}>
                      {member.role}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 text-slate-700 font-medium">
                    {member.contacts || <span className="text-slate-400 text-xs italic">No phone recorded</span>}
                  </td>
                  <td className="py-3.5 px-4 text-slate-500 font-medium">
                    {member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <button 
                      className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition cursor-pointer" 
                      onClick={() => openDeleteModal(member)}
                      title="Revoke Account"
                    >
                      <Trash2 size={13} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Register Staff Modal */}
      <Modal isOpen={isFormOpen} onClose={() => setIsFormOpen(false)} title="Register Operations Staff">
        <form onSubmit={handleSave} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Email Address</label>
            <input 
              type="email" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="e.g. conductor@byahero.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Temporary Password</label>
            <input 
              type="password" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="Min. 8 characters" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Operations Role</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={role} 
              onChange={(e) => setRole(e.target.value as any)}
            >
              <option value="conductor">Conductor</option>
              <option value="driver">Driver</option>
            </select>
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
              {saving ? 'Creating...' : 'Register User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Deregister User Account">
        <div className="text-center py-3">
          <ShieldAlert size={48} className="text-red-500 mx-auto mb-3" />
          <p className="text-xs text-slate-600 leading-relaxed">
            Are you sure you want to revoke account access for <strong>{currentStaff?.email}</strong>?
          </p>
          <p className="text-xs text-red-600 font-bold bg-red-50 p-3 rounded-xl border border-red-100 mt-3">
            This will immediately disconnect any active bus sessions associated with this user.
          </p>
        </div>
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
            {saving ? 'Revoking...' : 'Revoke Account Access'}
          </button>
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
