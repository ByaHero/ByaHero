import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Phone, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import AlertModal from '../../components/AlertModal';

export const CompleteProfile: React.FC = () => {
  const navigate = useNavigate();
  const { user, updateUserProfile, serverUrl } = useAuth();

  const [phone, setPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // AlertModal
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
        setAlertConfig(prev => ({ ...prev, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  const handleComplete = async (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedContact = phone.trim();

    if (!trimmedContact) {
      showAlert('Validation Error', 'Please enter your contact number.', 'warning');
      return;
    }

    // Validate Philippine mobile number (starting with 09 and having 11 digits) matching mobile app
    if (!/^(09)\d{9}$/.test(trimmedContact)) {
      showAlert(
        'Validation Error',
        'Please enter a valid Philippine mobile number starting with 09 (e.g., 09123456789).',
        'warning'
      );
      return;
    }

    const fullPhone = '+63' + trimmedContact.substring(1);

    setIsLoading(true);

    try {
      // Save phone on backend
      await fetch(`${serverUrl}/api/profile/update-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || '',
          phone: fullPhone,
          contacts: trimmedContact,
        }),
        credentials: 'include',
      });

      // Update local auth context
      updateUserProfile({ phone: fullPhone });
      setIsLoading(false);

      showAlert('Profile Completed', 'Profile completed successfully! Redirecting...', 'success', () => {
        navigate('/show-guide');
      });
    } catch (e: any) {
      // Even if network update fails, save in local profile and proceed to showGuide
      updateUserProfile({ phone: fullPhone });
      setIsLoading(false);
      navigate('/show-guide');
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-6">
        <div className="bg-white rounded-3xl p-8 shadow-xl shadow-slate-200/60 border border-slate-100 text-center">
          <div className="w-16 h-16 rounded-full bg-blue-100 text-[#1d72f8] flex items-center justify-center mx-auto mb-4">
            <ShieldCheck className="w-8 h-8" />
          </div>

          <h2 className="text-xl font-black text-[#0f2c59] tracking-tight mb-2">
            Complete Your Profile
          </h2>
          <p className="text-xs text-slate-500 font-medium leading-relaxed mb-6">
            Please provide a contact number to complete your registration.
          </p>

          <form onSubmit={handleComplete} className="space-y-4">
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400">
                <Phone className="w-5 h-5" />
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="e.g. 09123456789"
                required
                maxLength={11}
                className="w-full pl-12 pr-4 py-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm font-bold placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1d72f8]"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 px-6 rounded-full bg-[#1d72f8] hover:bg-[#1856b0] text-white font-extrabold text-sm tracking-wider shadow-lg shadow-blue-500/25 transition-all flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>SAVING...</span>
                </>
              ) : (
                <span>CONTINUE TO DASHBOARD</span>
              )}
            </button>
          </form>
        </div>
      </div>

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
export default CompleteProfile;
