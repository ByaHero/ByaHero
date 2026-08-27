import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import AlertModal from '../../../components/AlertModal';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';

export const Profile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, serverUrl } = useAuth();

  const [email, setEmail] = useState(user?.email || 'guest@byahero.app');
  const [name, setName] = useState(user?.name || 'Guest User');
  const [phone, setPhone] = useState(user?.phone || '');
  const [avatarInitial, setAvatarInitial] = useState(user?.name ? user.name.charAt(0).toUpperCase() : 'G');
  const [profilePicture, setProfilePicture] = useState(user?.profile_picture || '');

  // Edit Phone Modal State
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // AlertModal state
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'error',
    onConfirm: () => {},
  });

  const showAlert = (
    title: string,
    message: string,
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm' = 'error',
    onConfirm?: () => void
  ) => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => {
        setAlertConfig((p) => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    if (user) {
      setEmail(user.email || 'guest@byahero.app');
      setName(user.name || user.email?.split('@')[0] || 'Guest User');
      setPhone(user.phone || '');
      setAvatarInitial((user.name || user.email || 'G').charAt(0).toUpperCase());
      setProfilePicture(user.profile_picture || '');

      if (user.phone) {
        const clean = user.phone.replace(/[^0-9]/g, '');
        if (clean.startsWith('63')) {
          setInputPhone(clean.substring(2));
        } else if (clean.startsWith('0')) {
          setInputPhone(clean.substring(1));
        } else {
          setInputPhone(clean.substring(Math.max(0, clean.length - 10)));
        }
      }
    }
  }, [user]);

  const handleUpdatePhone = async () => {
    const digits = inputPhone.trim();
    if (digits.length !== 10 || !/^\d+$/.test(digits)) {
      showAlert('Validation Error', 'Please enter exactly 10 digits.', 'warning');
      return;
    }

    const fullPhone = '+63' + digits;
    setIsSaving(true);
    try {
      updateUserProfile({ phone: fullPhone });
      setPhone(fullPhone);

      await fetch(`${serverUrl}/api/passenger/profile/update-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, email: email }),
        credentials: 'include',
      });
      setIsSaving(false);
      setPhoneModalVisible(false);
      showAlert('Success', 'Mobile number updated successfully!', 'success');
    } catch (err) {
      setIsSaving(false);
      setPhoneModalVisible(false);
      showAlert('Saved Locally', 'Mobile number saved locally.', 'info');
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="My Profile" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          {/* Profile Card Header */}
          <div className="flex flex-col items-center py-8 bg-white text-center">
            <div className="w-24 h-24 rounded-full border border-slate-300 flex justify-center items-center mb-3 bg-slate-50 overflow-hidden shadow-sm">
              {profilePicture && profilePicture !== 'null' && profilePicture !== 'undefined' ? (
                <img
                  src={
                    profilePicture.startsWith('http') || profilePicture.startsWith('data:')
                      ? profilePicture
                      : `${serverUrl.replace(/\/$/, '')}/${profilePicture.replace(/^\//, '')}`
                  }
                  alt={name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-3xl font-black text-slate-800">{avatarInitial}</span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-800">{name}</h1>
          </div>

          {/* Profile Details Sheet */}
          <div className="px-4 pt-6 bg-slate-100/70 min-h-[480px] rounded-t-[32px] space-y-4">
            <h2 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1">
              Account Details
            </h2>

            {/* Phone Card */}
            <div
              onClick={() => setPhoneModalVisible(true)}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center flex-1">
                <MaterialIcons name="phone" size={24} color="#103d7c" className="mr-3.5" />
                <div>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                    Phone Number
                  </span>
                  <span className="text-[15px] font-black text-slate-800 mt-1 block">
                    {phone || 'Not set'}
                  </span>
                </div>
              </div>
              <MaterialIcons name="edit" size={20} color="#103d7c" />
            </div>

            {/* Email Card */}
            <div className="flex items-center p-4 bg-white rounded-2xl shadow-sm">
              <MaterialIcons name="email" size={24} color="#103d7c" className="mr-3.5" />
              <div className="flex-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
                  Email Address
                </span>
                <span className="text-[15px] font-black text-slate-800 mt-1 block truncate">
                  {email}
                </span>
              </div>
            </div>

            <h2 className="text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1 pt-2">
              Account Management
            </h2>

            {/* Account Settings */}
            <div
              onClick={() => navigate('/profile/account-settings')}
              className="flex items-center justify-between p-4 bg-white rounded-2xl shadow-sm cursor-pointer hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center">
                <MaterialIcons name="settings" size={24} color="#103d7c" className="mr-3.5" />
                <span className="text-[15px] font-black text-slate-800">Account Settings</span>
              </div>
              <MaterialIcons name="chevron_right" size={24} color="#94a3b8" />
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />

      {/* Edit Phone Modal */}
      {phoneModalVisible && (
        <div className="fixed inset-0 z-[4000] flex items-center justify-center p-5 bg-black/50 animate-fade-in">
          <div className="w-full max-w-sm bg-white rounded-3xl p-6 shadow-xl text-left">
            <h3 className="text-lg font-bold text-slate-800 mb-4">Update Phone Number</h3>

            <label className="text-xs text-slate-400 font-semibold mb-1.5 block">
              Mobile Number
            </label>
            <div className="flex items-center bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 mb-4">
              <div className="px-4 py-3.5 bg-slate-200/70 border-r border-slate-200">
                <span className="font-bold text-slate-500">+63</span>
              </div>
              <input
                type="tel"
                value={inputPhone}
                onChange={(e) => setInputPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="9123456789"
                maxLength={10}
                className="flex-1 px-4 py-3.5 font-bold text-slate-700 bg-transparent focus:outline-none font-mono"
              />
            </div>

            <p className="text-xs text-slate-400 mb-6">
              Enter the remaining 10 digits of your mobile number.
            </p>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPhoneModalVisible(false)}
                className="px-5 py-2.5 rounded-full bg-slate-100 text-sm font-semibold text-slate-500 hover:bg-slate-200"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleUpdatePhone}
                disabled={isSaving}
                className="px-5 py-2.5 rounded-full bg-[#1e3a8a] text-sm font-semibold text-white hover:bg-blue-900"
              >
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default Profile;
