import React, { useState, useEffect } from 'react';
import { Mail, KeyRound, Edit2 } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface ProfileProps {
  adminEmail: string;
}

export default function Profile({ adminEmail }: ProfileProps) {
  const [email, setEmail] = useState(adminEmail);
  const [name, setName] = useState('Admin');
  
  // Modals
  const [emailModal, setEmailModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  const [alert, setAlert] = useState<{ type: 'success' | 'error', message: string } | null>(null);

  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  useEffect(() => {
    window.scrollTo(0, 0);
    const cachedName = localStorage.getItem('byahero_cached_name');
    const cachedEmail = localStorage.getItem('byahero_cached_email') || adminEmail;
    
    if (cachedEmail) setEmail(cachedEmail);
    if (cachedName) {
      setName(cachedName);
    } else if (cachedEmail) {
      setName(cachedEmail.split('@')[0]);
    }
  }, [adminEmail]);

  const displayHeaderName = name.charAt(0).toUpperCase() + name.slice(1);
  const initial = displayHeaderName.charAt(0).toUpperCase() || '?';

  const showAlert = (message: string, type: 'success' | 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 4000);
  };

  const handleUpdateEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await apiRequest('/api/admin/profile', {
        method: 'POST',
        body: JSON.stringify({ update_email: 1, new_email: newEmail })
      });
      
      if (res.success) {
        const updatedEmail = res.email || newEmail;
        const updatedName = res.name || updatedEmail.split('@')[0];
        
        localStorage.setItem('byahero_cached_email', updatedEmail);
        localStorage.setItem('byahero_cached_name', updatedName);
        
        setEmail(updatedEmail);
        setName(updatedName);
        setEmailModal(false);
        setNewEmail('');
        showAlert('Email updated successfully.', 'success');
      } else {
        showAlert(res.message || res.error || 'Failed to update email.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to connect to the server.', 'error');
    }
  };

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showAlert('New passwords do not match!', 'error');
      return;
    }
    
    try {
      const res = await apiRequest('/api/admin/profile', {
        method: 'POST',
        body: JSON.stringify({
          update_password: 1,
          current_password: currentPassword,
          new_password: newPassword,
          confirm_new_password: confirmPassword
        })
      });
      
      if (res.success) {
        setPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        showAlert('Password successfully updated!', 'success');
      } else {
        showAlert(res.message || res.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      console.error(err);
      showAlert('Failed to connect to the server.', 'error');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-white font-sans max-w-2xl mx-auto w-full shadow-sm">
      
      <div className="flex flex-col items-center gap-2 pt-8 px-4 pb-6">
        <div className="flex items-center justify-center rounded-full font-bold text-slate-800 bg-slate-200" style={{ width: '110px', height: '110px', fontSize: '52px' }}>
          {initial}
        </div>
        <h2 className="font-bold text-[#1d4ed8] text-xl mb-0">{displayHeaderName}</h2>
      </div>

      <div className="flex-grow p-6 pb-20 bg-slate-50 rounded-t-[32px] min-h-0 relative shadow-inner">
        
        {alert && (
          <div className={`p-3 mb-5 font-bold text-center text-sm rounded-2xl ${alert.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}`}>
            {alert.message}
          </div>
        )}

        <div className="font-bold text-slate-800 mt-2 mb-4 ml-1 text-xs uppercase tracking-wider">Account Details</div>

        {/* Email Card */}
        <div className="p-4 mb-4 shadow-sm border-0 grid items-center rounded-3xl bg-slate-200/50" style={{ gridTemplateColumns: '40px 1fr 40px', gap: '16px' }}>
          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm">
            <Mail className="text-[#1d4ed8]" size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">Email Address</p>
            <p className="font-bold text-slate-800 mb-0 text-sm truncate">{email || 'Not set'}</p>
          </div>

          <button 
            type="button" 
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-blue-50 transition-colors text-slate-600 hover:text-[#1d4ed8]"
            onClick={() => setEmailModal(true)}
          >
            <Edit2 size={16} />
          </button>
        </div>

        {/* Password Card */}
        <div className="p-4 mb-4 shadow-sm border-0 grid items-center rounded-3xl bg-slate-200/50" style={{ gridTemplateColumns: '40px 1fr 40px', gap: '16px' }}>
          <div className="flex items-center justify-center w-10 h-10 bg-white rounded-full shadow-sm">
            <KeyRound className="text-[#1d4ed8]" size={18} />
          </div>

          <div className="min-w-0">
            <p className="text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider">Password</p>
            <p className="font-bold text-slate-800 mb-0 text-sm truncate">••••••••••••</p>
          </div>

          <button 
            type="button" 
            className="w-10 h-10 flex items-center justify-center bg-white rounded-full shadow-sm hover:bg-blue-50 transition-colors text-slate-600 hover:text-[#1d4ed8]"
            onClick={() => setPasswordModal(true)}
          >
            <Edit2 size={16} />
          </button>
        </div>

      </div>

      {/* Email Modal */}
      <Modal
        isOpen={emailModal}
        onClose={() => setEmailModal(false)}
        title="Edit Email"
      >
        <p className="text-slate-500 text-sm mb-4">Enter your new email address below.</p>
        <form onSubmit={handleUpdateEmail}>
          <input 
            type="email" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-6 font-medium"
            placeholder="New email address" 
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            required 
          />
          <div className="flex justify-center gap-3">
            <button 
              type="button" 
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              onClick={() => setEmailModal(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="w-full bg-[#1d4ed8] text-white font-bold py-3 rounded-xl shadow-sm hover:bg-blue-800 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

      {/* Password Modal */}
      <Modal
        isOpen={passwordModal}
        onClose={() => setPasswordModal(false)}
        title="Edit Password"
      >
        <p className="text-slate-500 text-sm mb-4">Enter your current and new password below.</p>
        <form onSubmit={handleUpdatePassword}>
          <input 
            type="password" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-3 font-medium"
            placeholder="Current password" 
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required 
          />
          <input 
            type="password" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-3 font-medium"
            placeholder="New password" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required 
          />
          <input 
            type="password" 
            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/30 mb-6 font-medium"
            placeholder="Confirm new password" 
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required 
          />
          <div className="flex justify-center gap-3">
            <button 
              type="button" 
              className="w-full bg-slate-100 text-slate-700 font-bold py-3 rounded-xl hover:bg-slate-200 transition-colors"
              onClick={() => setPasswordModal(false)}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="w-full bg-[#1d4ed8] text-white font-bold py-3 rounded-xl shadow-sm hover:bg-blue-800 transition-colors"
            >
              Save
            </button>
          </div>
        </form>
      </Modal>

    </div>
  );
}
