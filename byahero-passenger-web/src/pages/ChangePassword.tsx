import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../components/PassengerNavbar';
import PassengerFooter from '../components/PassengerFooter';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '../components/ui/MaterialIcons';
import AlertModal from '../components/AlertModal';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

export const ChangePassword: React.FC = () => {
  const navigate = useNavigate();
  const { serverUrl } = useAuth();

  const [hasPassword, setHasPassword] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  // Alert Modal state
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
    async function checkPasswordStatus() {
      try {
        const res = await fetch(`${serverUrl}/api/passenger/profile/change-password`, {
          credentials: 'include',
        });
        const data = await res.json();
        if (data && data.success) {
          setHasPassword(data.hasPassword);
        }
      } catch (e) {}
    }
    checkPasswordStatus();
  }, [serverUrl]);

  const handleUpdatePassword = async () => {
    if (hasPassword && !currentPassword) {
      showAlert('Validation Error', 'Current password is required.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showAlert('Validation Error', 'New password must be at least 6 characters.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showAlert('Validation Error', 'Passwords do not match.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const payload: any = {
        new_password: newPassword,
        confirm_password: confirmPassword,
      };
      if (hasPassword) {
        payload.current_password = currentPassword;
      }

      const res = await fetch(`${serverUrl}/api/passenger/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      setIsLoading(false);

      if (data && data.success) {
        showAlert('Success', data.message || 'Password updated successfully!', 'success', () => {
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
          setHasPassword(true);
          navigate('/profile');
        });
      } else {
        showAlert('Error', data.error || 'Failed to update password.', 'error');
      }
    } catch (err) {
      setIsLoading(false);
      showAlert('Error', 'Failed to communicate with server.', 'error');
    }
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle={hasPassword ? 'Change Password' : 'Set Password'} showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100">
              <div className="w-16 h-16 rounded-full bg-[#dbeafe] flex justify-center items-center mx-auto mb-4">
                <MaterialIcons name="lock" size={32} color="#1e3a8a" />
              </div>

              <h2 className="text-lg font-black text-center text-slate-800 mb-1">
                {hasPassword ? 'Password Settings' : 'Create a Password'}
              </h2>
              <p className="text-xs text-center text-slate-400 font-medium mb-6">
                {hasPassword
                  ? 'Update your password to keep your account secure'
                  : 'Create a password so you can log in directly'}
              </p>

              {/* Current Password */}
              {hasPassword && (
                <div className="mb-4">
                  <label className="text-xs font-bold text-slate-400 mb-1.5 block">Current Password</label>
                  <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                    <input
                      type={secureCurrent ? 'password' : 'text'}
                      placeholder="Enter current password"
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setSecureCurrent(!secureCurrent)}
                      className="text-slate-400 hover:text-slate-600 focus:outline-none"
                    >
                      {secureCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* New Password */}
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">New Password</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <input
                    type={secureNew ? 'password' : 'text'}
                    placeholder="Enter new password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSecureNew(!secureNew)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {secureNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div className="mb-5">
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">Confirm New Password</label>
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3">
                  <input
                    type={secureConfirm ? 'password' : 'text'}
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 text-sm font-semibold text-slate-800 bg-transparent focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setSecureConfirm(!secureConfirm)}
                    className="text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {secureConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Requirements Banner */}
              <div className="bg-blue-50/70 border border-blue-100 rounded-2xl p-4 mb-5 text-left">
                <span className="text-xs font-bold text-blue-700 mb-1 block">Password Requirements:</span>
                <span className="text-xs text-blue-600/90 leading-relaxed block">• At least 6 characters long</span>
                <span className="text-xs text-blue-600/90 leading-relaxed block">
                  • Mix of letters and numbers recommended
                </span>
              </div>

              {/* Buttons */}
              <button
                type="button"
                onClick={handleUpdatePassword}
                disabled={isLoading}
                className="w-full bg-[#1e3a8a] hover:bg-blue-900 py-3.5 rounded-2xl font-bold text-sm text-white mb-3 shadow-md transition-colors cursor-pointer flex justify-center items-center"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Updating...</span>
                  </div>
                ) : (
                  'Update Password'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full bg-slate-100 hover:bg-slate-200 py-3.5 rounded-2xl font-bold text-sm text-slate-500 border border-slate-200 transition-colors cursor-pointer"
              >
                Cancel
              </button>
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
export default ChangePassword;
