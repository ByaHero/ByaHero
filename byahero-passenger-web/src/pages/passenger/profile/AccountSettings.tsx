import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import AlertModal from '../../../components/AlertModal';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';

export const AccountSettings: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, serverUrl } = useAuth();

  const [email, setEmail] = useState(user?.email || 'guest@byahero.app');
  const [name, setName] = useState(user?.name || '');
  const [originalName, setOriginalName] = useState(user?.name || '');
  const [profilePic, setProfilePic] = useState(user?.profile_picture || '');
  const [avatarInitial, setAvatarInitial] = useState(user?.name ? user.name.charAt(0).toUpperCase() : 'G');

  const [newImageData, setNewImageData] = useState('');
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // AlertModal State
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
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    if (user) {
      setEmail(user.email || 'guest@byahero.app');
      setName(user.name || '');
      setOriginalName(user.name || '');
      setProfilePic(user.profile_picture || '');
      setAvatarInitial((user.name || 'G').charAt(0).toUpperCase());
    }
  }, [user]);

  const handlePickImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    const reader = new FileReader();
    reader.onload = (event) => {
      if (event.target?.result) {
        const base64Data = event.target.result as string;
        setNewImageData(base64Data);
        setProfilePic(base64Data);
        setRemoveImageFlag(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleRemoveImage = () => {
    setNewImageData('');
    setProfilePic('');
    setRemoveImageFlag(true);
  };

  const handleSaveChanges = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      showAlert('Validation Error', 'Full Name is required.', 'warning');
      return;
    }

    setIsSaving(true);
    try {
      const updatedProfilePic = removeImageFlag ? '' : (newImageData || profilePic);
      updateUserProfile({ name: trimmedName, profile_picture: updatedProfilePic });

      const formData = new FormData();
      formData.append('action', 'update_profile');
      formData.append('name', trimmedName);
      formData.append('email', email);
      if (newImageData) {
        formData.append('profile_image_data', newImageData);
      }
      if (removeImageFlag) {
        formData.append('remove_image', '1');
      }

      const res = await fetch(`${serverUrl}/api/passenger/profile/account-settings`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSaving(false);

      if (data && data.success) {
        showAlert('Success', 'Profile updated successfully on server!', 'success');
        setOriginalName(trimmedName);
        setNewImageData('');
        setRemoveImageFlag(false);
      } else {
        showAlert('Saved Locally', `Notice: ${data.message || 'Profile saved locally.'}`, 'info');
      }
    } catch (err) {
      setIsSaving(false);
      showAlert('Saved Locally', 'Saved locally.', 'info');
    }
  };

  const isChanged = name.trim() !== originalName || newImageData !== '' || removeImageFlag;

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Account Settings" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <h1 className="text-lg font-black text-slate-800 mb-1">Profile Details</h1>
            <p className="text-xs text-slate-400 font-medium mb-5">
              Manage your account security and preferences
            </p>

            {/* Profile Details Card */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
              {/* Avatar Area */}
              <div className="flex items-center gap-4 mb-5">
                <div className="w-18 h-18 rounded-full border border-slate-200 bg-[#dbeafe] flex justify-center items-center overflow-hidden shadow-sm">
                  {profilePic ? (
                    <img
                      src={
                        profilePic.startsWith('http') || profilePic.startsWith('data:')
                          ? profilePic
                          : `${serverUrl.replace(/\/$/, '')}/${profilePic.replace(/^\//, '')}`
                      }
                      alt={name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-2xl font-black text-[#1e3a8a]">{avatarInitial}</span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="text-base font-bold text-slate-800 leading-tight">
                    {originalName || 'Guest User'}
                  </div>
                  <div className="text-xs text-slate-400 font-medium mb-3">{email}</div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200 cursor-pointer hover:bg-slate-200 transition-colors">
                      <MaterialIcons name="add_a_photo" size={14} color="#1e3a8a" className="mr-1" />
                      <span className="text-xs font-bold text-[#1e3a8a]">Add Photo</span>
                      <input type="file" accept="image/*" onChange={handlePickImage} className="hidden" />
                    </label>

                    {profilePic !== '' && (
                      <button
                        type="button"
                        onClick={handleRemoveImage}
                        className="flex items-center text-[#ef4444] text-xs font-bold hover:underline"
                      >
                        <MaterialIcons name="delete" size={14} color="#ef4444" className="mr-0.5" />
                        <span>Remove</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Form Fields */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#1e3a8a]"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Email Address</label>
                  <input
                    type="email"
                    value={email}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400 cursor-not-allowed"
                  />
                </div>
              </div>

              {/* Save Button */}
              <button
                type="button"
                onClick={handleSaveChanges}
                disabled={!isChanged || isSaving}
                className={`w-full flex justify-center items-center mt-5 py-3 rounded-2xl font-bold text-sm transition-all ${
                  isChanged ? 'bg-[#1e3a8a] text-white shadow-md hover:bg-blue-900' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                <MaterialIcons name="save" size={18} color={isChanged ? '#ffffff' : '#94a3b8'} className="mr-1.5" />
                <span>{isSaving ? 'Saving Changes...' : 'Save Changes'}</span>
              </button>
            </div>

            {/* Security Options */}
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 mt-2 px-1">
              Security
            </h2>
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5 divide-y divide-slate-100">
              <div
                onClick={() => navigate('/profile/change-password')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center">
                  <MaterialIcons name="lock" size={22} color="#1e3a8a" className="mr-3.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Change Password</div>
                    <div className="text-xs text-slate-400 mt-0.5">Update your password details</div>
                  </div>
                </div>
                <MaterialIcons name="chevron_right" size={24} color="#cbd5e1" />
              </div>

              <div
                onClick={() => navigate('/profile/login-activity')}
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-slate-50 transition-colors"
              >
                <div className="flex items-center">
                  <MaterialIcons name="history" size={22} color="#1e3a8a" className="mr-3.5" />
                  <div>
                    <div className="text-sm font-semibold text-slate-700">Login Activity</div>
                    <div className="text-xs text-slate-400 mt-0.5">Recent login sessions</div>
                  </div>
                </div>
                <MaterialIcons name="chevron_right" size={24} color="#cbd5e1" />
              </div>
            </div>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />

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
export default AccountSettings;
