import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { clearCachedSession } from '../../../services/authService';
import { debugLogger } from '../../../utils/debugLogger';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import AlertModal from '../../../components/AlertModal';
import { Loader2 } from 'lucide-react';

export const DeleteAccount: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, serverUrl } = useAuth();

  const [userName] = useState(user?.name || 'User');
  const [inputText, setInputText] = useState('');
  const [understandCheck, setUnderstandCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // AlertModal State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    diagnosticInfo?: any;
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
    diagnosticInfoOrConfirm?: any,
    onConfirm?: () => void
  ) => {
    let diag: any = undefined;
    let confirmCb: (() => void) | undefined = onConfirm;

    if (typeof diagnosticInfoOrConfirm === 'function') {
      confirmCb = diagnosticInfoOrConfirm;
    } else {
      diag = diagnosticInfoOrConfirm;
    }

    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      diagnosticInfo: diag,
      onConfirm: () => {
        setAlertConfig((prev) => ({ ...prev, visible: false }));
        if (confirmCb) confirmCb();
      },
    });
  };

  const handleDeleteAccount = async () => {
    if (inputText.trim().toLowerCase() !== 'delete') {
      showAlert('Validation Error', 'Please type exactly "delete" to confirm.', 'warning');
      return;
    }
    if (!understandCheck) {
      showAlert('Validation Error', 'Please confirm you understand that this action is irreversible.', 'warning');
      return;
    }

    setIsLoading(true);
    debugLogger.log('warn', 'DeleteAccount', 'Requesting permanent account deletion', { email: user?.email });

    try {
      const endpoint = `${serverUrl}/api/passenger/profile/delete-account`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify({
          confirmText: inputText.trim(),
          email: user?.email || '',
        }),
        credentials: 'include',
      });

      const data = await response.json().catch(() => ({}));
      setIsLoading(false);

      if (!response.ok || !data.success) {
        const errorMsg = data.message || `Server responded with error (HTTP ${response.status})`;
        const diag = debugLogger.createDiagnosticReport('delete_account', endpoint, serverUrl, new Error(errorMsg), response.status);
        showAlert('Deletion Failed', errorMsg, 'error', diag);
        return;
      }

      debugLogger.log('success', 'DeleteAccount', 'Account successfully deleted from backend');
      await clearCachedSession();

      let hasRedirected = false;
      const redirectToLogin = () => {
        if (hasRedirected) return;
        hasRedirected = true;
        logout();
        navigate('/login', { replace: true });
      };

      showAlert(
        'Account Deleted',
        'Your account and all associated data have been permanently removed. Redirecting to login...',
        'success',
        redirectToLogin
      );

      // Auto-redirect after 2 seconds in case user doesn't tap the modal button
      setTimeout(() => {
        redirectToLogin();
      }, 2000);
    } catch (err: any) {
      setIsLoading(false);
      const diag = debugLogger.createDiagnosticReport('delete_account', `${serverUrl}/api/passenger/profile/delete-account`, serverUrl, err);
      showAlert('Deletion Failed', err.message || 'Unable to connect to server to delete account.', 'error', diag);
    }
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Delete Account" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-5 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <div className="bg-white rounded-3xl p-6 shadow-sm border border-red-100 text-left">
              <div className="w-16 h-16 rounded-full bg-red-50 flex justify-center items-center mx-auto mb-4">
                <MaterialIcons name="warning" size={32} color="#ef4444" />
              </div>

              <h2 className="text-lg font-black text-center text-slate-800 mb-1">Delete Account?</h2>
              <p className="text-xs text-center text-slate-400 font-medium mb-6">
                We're sorry to see you go, {userName}. Please confirm your decision.
              </p>

              {/* Warning Banner */}
              <div className="bg-red-50 border border-red-100 rounded-2xl p-4 mb-5">
                <div className="flex items-center mb-2">
                  <MaterialIcons name="info" size={18} color="#be123c" className="mr-1.5" />
                  <span className="text-xs font-bold text-[#be123c]">Important Information</span>
                </div>
                <p className="text-xs text-red-700/90 leading-relaxed mb-1">
                  • Your profile and all personal data will be <strong>permanently deleted</strong>.
                </p>
                <p className="text-xs text-red-700/90 leading-relaxed mb-1">
                  • Your SOS history and emergency contacts will be erased.
                </p>
                <p className="text-xs text-red-700/90 leading-relaxed">
                  • This action <strong>cannot be undone</strong>.
                </p>
              </div>

              {/* Text Input Confirmation */}
              <div className="mb-4">
                <label className="text-xs font-bold text-slate-400 mb-1.5 block">
                  Type "delete" to Confirm
                </label>
                <input
                  type="text"
                  placeholder="delete"
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-red-500 font-mono"
                />
              </div>

              {/* Toggle Switch Confirmation */}
              <div className="flex items-center justify-between mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/50">
                <span className="text-xs text-slate-500 font-medium flex-1 mr-3">
                  I understand that my account and all data will be permanently removed.
                </span>
                <input
                  type="checkbox"
                  checked={understandCheck}
                  onChange={(e) => setUnderstandCheck(e.target.checked)}
                  className="w-5 h-5 accent-red-600 rounded cursor-pointer"
                />
              </div>

              {/* Action Buttons */}
              <button
                type="button"
                onClick={handleDeleteAccount}
                disabled={isLoading}
                className="w-full bg-[#dc2626] hover:bg-red-700 py-3.5 rounded-2xl font-bold text-sm text-white mb-3 shadow-md transition-colors cursor-pointer flex justify-center items-center disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Processing Deletion...</span>
                  </div>
                ) : (
                  'Permanently Delete Account'
                )}
              </button>

              <button
                type="button"
                onClick={() => navigate(-1)}
                className="w-full bg-slate-100 hover:bg-slate-200 py-3.5 rounded-2xl font-bold text-sm text-slate-500 border border-slate-200 transition-colors cursor-pointer"
              >
                Keep My Account
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
        diagnosticInfo={alertConfig.diagnosticInfo}
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};

export default DeleteAccount;
