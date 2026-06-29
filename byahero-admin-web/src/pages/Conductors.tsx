import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Loader2, UserCheck, ShieldAlert } from 'lucide-react';
import { adminService } from '../services/admin';
import { StaffMember } from '../types';
import Modal from '../components/Modal';

export default function Conductors() {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

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
      if (data.success) {
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
      alert('Email and Password are required.');
      return;
    }

    setSaving(true);
    try {
      const data = await adminService.addStaff({ email: email.trim(), password, role });
      if (data.success) {
        setIsFormOpen(false);
        fetchStaff();
      } else {
        alert(data.error || 'Failed to add staff member.');
      }
    } catch (e) {
      alert('Network error while registering staff.');
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
        alert(data.error || 'Failed to delete staff member.');
      }
    } catch (e) {
      alert('Network error while deleting staff.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="card">
      <div className="page-header-actions">
        <h2 className="card-title">Operations Personnel Directory</h2>
        <button className="btn btn-primary" onClick={openAddModal}>
          <Plus size={16} /> Register New Staff
        </button>
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: '40px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : staff.length === 0 ? (
        <div className="empty-state">
          <UserCheck size={48} className="empty-state-icon" />
          <p>No registered personnel accounts found.</p>
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table">
            <thead>
              <tr>
                <th>Personnel User</th>
                <th>Role Designation</th>
                <th>Contact details</th>
                <th>Registered Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((member) => (
                <tr key={`${member.role}-${member.id}`}>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontWeight: 700 }}>{member.name || member.email.split('@')[0]}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{member.email}</span>
                    </div>
                  </td>
                  <td>
                    <span className={`badge badge-${member.role === 'driver' ? 'primary' : 'warning'}`}>
                      {member.role}
                    </span>
                  </td>
                  <td>{member.contacts || <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem' }}>No phone recorded</span>}</td>
                  <td>{member.created_at ? new Date(member.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="btn btn-danger" style={{ padding: '6px 10px' }} onClick={() => openDeleteModal(member)}>
                      <Trash2 size={12} />
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
        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input 
              type="email" 
              className="form-input" 
              placeholder="e.g. conductor@byahero.com" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Temporary Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Min. 8 characters" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Operations Role</label>
            <select className="form-input" value={role} onChange={(e) => setRole(e.target.value as any)}>
              <option value="conductor">Conductor</option>
              <option value="driver">Driver</option>
            </select>
          </div>

          <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
            <button type="button" className="btn btn-secondary" onClick={() => setIsFormOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Register User'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Staff Modal */}
      <Modal isOpen={isDeleteOpen} onClose={() => setIsDeleteOpen(false)} title="Deregister User Account">
        <div style={{ textAlign: 'center', padding: '12px 0' }}>
          <ShieldAlert size={48} color="var(--error)" style={{ marginBottom: '16px' }} />
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
            Are you sure you want to revoke account access for <strong>{currentStaff?.email}</strong>?
          </p>
          <p style={{ fontSize: '0.75rem', color: 'var(--error)', marginTop: '8px', fontWeight: 600 }}>
            This will immediately disconnect any active bus sessions associated with this user.
          </p>
        </div>
        <div className="modal-footer" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <button type="button" className="btn btn-secondary" onClick={() => setIsDeleteOpen(false)} disabled={saving}>
            Cancel
          </button>
          <button type="button" className="btn btn-danger" onClick={handleDelete} disabled={saving}>
            {saving ? 'Revoking...' : 'Revoke Account Access'}
          </button>
        </div>
      </Modal>
    </div>
  );
}
