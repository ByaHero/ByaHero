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

      if (data && data.success) {
        const userStr = localStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          localStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, name, contacts }));
        }
        alert('Profile information updated successfully.');
      } else {
        alert(data?.error || 'Failed to update profile.');
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

      if (data && data.success) {
        setPassword('');
        setConfirmPassword('');
        alert('Password changed successfully.');
      } else {
        alert(data?.error || 'Failed to change password.');
      }
    } catch (e) {
      alert('Network error while changing password.');
    } finally {
      setSavingPass(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Profile info card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
            <User size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Account Profile Details</h2>
            <p className="text-xs text-slate-400 font-medium">Update account name and primary contact details.</p>
          </div>
        </div>

        <form onSubmit={handleUpdateProfile} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Full Name</label>
            <input 
              type="text" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Admin Email Address (Read-only)</label>
            <input 
              type="email" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-100 text-slate-500 cursor-not-allowed opacity-80" 
              value={email}
              disabled
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Contact Number</label>
            <input 
              type="text" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="e.g. 09171234567"
              maxLength={11}
              value={contacts}
              onChange={(e) => setContacts(e.target.value.replace(/\D/g, '').slice(0, 11))}
            />
          </div>

          <button 
            type="submit" 
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-sm cursor-pointer disabled:opacity-60 mt-2" 
            disabled={savingProfile}
          >
            {savingProfile ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
            Save Information
          </button>
        </form>
      </div>

      {/* Password changes card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex items-center gap-3 mb-6 pb-3 border-b border-slate-100">
          <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <Key size={20} />
          </div>
          <div>
            <h2 className="text-base font-extrabold text-slate-800">Change Password</h2>
            <p className="text-xs text-slate-400 font-medium">Protect your administration portal with a secure key.</p>
          </div>
        </div>

        <form onSubmit={handleUpdatePassword} className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">New Password</label>
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
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Confirm New Password</label>
            <input 
              type="password" 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              placeholder="Re-enter password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
            />
          </div>

          <button 
            type="submit" 
            className="inline-flex items-center gap-2 py-2.5 px-5 rounded-xl text-xs font-bold text-white bg-red-600 hover:bg-red-700 transition shadow-sm cursor-pointer disabled:opacity-60 mt-2" 
            disabled={savingPass}
          >
            {savingPass ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
            Change Password
          </button>
        </form>
      </div>
    </div>
  );
}
