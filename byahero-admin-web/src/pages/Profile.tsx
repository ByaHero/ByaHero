import React, { useEffect, useState } from 'react';
import { Save, User, Loader2, Key } from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';

interface ProfileProps {
  adminEmail: string;
}

export default function Profile({ adminEmail }: ProfileProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState(adminEmail);
  const [contacts, setContacts] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);

  // Alert Modal state
  const [alertConfig, setAlertConfig] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type?: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      isOpen: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, isOpen: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    // Attempt to load current local details
    const userStr = localStorage.getItem('byahero_admin_user');
    if (userStr) {
      const parsed = JSON.parse(userStr);
      setName(parsed.name || email.split('@')[0]);
      setContacts(parsed.contacts || '');
    }
  }, [email]);

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_info',
        name,
        contacts
      });

      if (data.success) {
        const userStr = localStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          localStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, name, contacts }));
        }
        showAlert('Success', 'Profile information updated successfully.', 'success');
      } else {
        showAlert('Error', data.error || 'Failed to update profile.', 'error');
      }
    } catch (e) {
      showAlert('Error', 'Network error while saving profile.', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match.', 'warning');
      return;
    }

    setSavingPass(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_password',
        password,
        confirm_password: confirmPassword
      });

      if (data.success) {
        setPassword('');
        setConfirmPassword('');
        showAlert('Success', 'Password changed successfully.', 'success');
      } else {
        showAlert('Error', data.error || 'Failed to change password.', 'error');
      }
    } catch (e) {
      showAlert('Error', 'Network error while changing password.', 'error');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="dashboard-grid">
      {/* Profile info card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <User size={20} color="var(--primary-color)" />
          <h2 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Account Profile Details
          </h2>
        </div>

        <form onSubmit={handleUpdateProfile}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input 
              type="text" 
              className="form-input" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label">Admin Email Address (Read-only)</label>
            <input 
              type="email" 
              className="form-input" 
              value={email}
              disabled
            />
          </div>

          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input 
              type="text" 
              className="form-input" 
              placeholder="e.g. 09171234567"
              maxLength={11}
              value={contacts}
              onChange={(e) => setContacts(e.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </div>

          <button type="submit" className="btn btn-primary" style={{ marginTop: '16px' }} disabled={savingProfile}>
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Information
          </button>
        </form>
      </div>

      {/* Password changes card */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <Key size={20} color="var(--primary-color)" />
          <h2 className="card-title" style={{ margin: 0, border: 'none', padding: 0 }}>
            Change Password
          </h2>
        </div>

        <form onSubmit={handleUpdatePassword}>
          <div className="form-group">
            <label className="form-label">New Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Min. 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Confirm New Password</label>
            <input 
              type="password" 
              className="form-input" 
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              style={{ color: '#0f172a', backgroundColor: '#ffffff' }}
            />
          </div>

          <button type="submit" className="btn btn-danger" style={{ marginTop: '16px' }} disabled={savingPass}>
            {savingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Change Password
          </button>
        </form>
      </div>
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
