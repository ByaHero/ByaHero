import React, { useEffect, useState } from 'react';
import { Save, User, Loader2, Key } from 'lucide-react';
import { adminService } from '../services/admin';

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
        alert('Profile information updated successfully.');
      } else {
        alert(data.error || 'Failed to update profile.');
      }
    } catch (e) {
      alert('Network error while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password || password !== confirmPassword) {
      alert('Passwords do not match.');
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
        alert('Password changed successfully.');
      } else {
        alert(data.error || 'Failed to change password.');
      }
    } catch (e) {
      alert('Network error while changing password.');
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
              placeholder="e.g. +63 900 000 0000"
              value={contacts}
              onChange={(e) => setContacts(e.target.value)}
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
            />
          </div>

          <button type="submit" className="btn btn-danger" style={{ marginTop: '16px' }} disabled={savingPass}>
            {savingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
