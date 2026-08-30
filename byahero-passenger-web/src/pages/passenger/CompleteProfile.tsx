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

    const digits = phone.trim().replace(/[^0-9]/g, '');
    if (digits.length < 10) {
      showAlert('Invalid Phone Number', 'Please enter a valid 10-digit mobile number (e.g. 9123456789).', 'warning');
      return;
    }

    let clean10 = digits.slice(-10);
    const fullPhone = '+63' + clean10;

    setIsLoading(true);
    try {
      // Save phone on backend
      const res = await fetch(`${serverUrl}/api/profile/update-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: user?.email || '',
          phone: fullPhone,
        }),
        credentials: 'include'
      });

      // Update local auth context
      updateUserProfile({ phone: fullPhone });
      setIsLoading(false);

      showAlert('Profile Completed', 'Your contact number has been saved for emergency alerts.', 'success', () => {
        navigate('/');
      });
    } catch (e: any) {
      // Even if network update fails, save in local profile
      updateUserProfile({ phone: fullPhone });
      setIsLoading(false);
      navigate('/');
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
            Please enter your Philippine mobile number to enable emergency SOS features and family circle notifications.
          </p>

          <form onSubmit={handleComplete} className="space-y-4">
            <div className="relative flex items-center">
              <div className="absolute left-4 flex items-center gap-1 text-slate-500 font-bold text-sm border-r pr-2 border-slate-300">
                <span>🇵🇭</span>
                <span>+63</span>
              </div>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="912 345 6789"
                required
                maxLength={12}
                className="w-full pl-24 pr-4 py-3.5 rounded-full bg-slate-50 border border-slate-200 text-slate-800 font-mono text-sm font-bold placeholder:font-sans placeholder:font-normal focus:outline-none focus:ring-2 focus:ring-[#1d72f8]"
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
                <span>SAVE & GET STARTED</span>
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
