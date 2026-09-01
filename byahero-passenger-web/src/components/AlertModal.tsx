import React from 'react';
import { createPortal } from 'react-dom';
import { AlertTriangle, CheckCircle, Info, XCircle, X } from 'lucide-react';

export interface AlertModalConfig {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface AlertModalProps extends AlertModalConfig {
  onClose?: () => void;
}

export const AlertModal: React.FC<AlertModalProps> = ({
  visible,
  title,
  message,
  type = 'info',
  confirmText = 'OK',
  cancelText = 'Cancel',
  onConfirm,
  onCancel,
}) => {
  if (!visible) return null;

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircle className="w-12 h-12 text-emerald-500" />;
      case 'error':
        return <XCircle className="w-12 h-12 text-rose-500" />;
      case 'warning':
      case 'confirm':
        return <AlertTriangle className="w-12 h-12 text-amber-500" />;
      default:
        return <Info className="w-12 h-12 text-blue-500" />;
    }
  };

  const getHeaderBg = () => {
    switch (type) {
      case 'success':
        return 'bg-emerald-50 text-emerald-900';
      case 'error':
        return 'bg-rose-50 text-rose-900';
      case 'warning':
      case 'confirm':
        return 'bg-amber-50 text-amber-900';
      default:
        return 'bg-blue-50 text-blue-900';
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full overflow-hidden border border-slate-100 transform transition-all text-center my-8">
        <div className={`p-6 flex flex-col items-center justify-center ${getHeaderBg()}`}>
          <div className="mb-2">{getIcon()}</div>
          <h3 className="text-lg font-bold text-slate-800 tracking-tight">{title}</h3>
        </div>

        <div className="p-6">
          <p className="text-sm text-slate-600 font-medium leading-relaxed mb-6">{message}</p>

          <div className="flex items-center justify-center gap-3">
            {type === 'confirm' && onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 py-3 px-5 rounded-full border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 transition-colors"
              >
                {cancelText}
              </button>
            )}

            <button
              type="button"
              onClick={onConfirm}
              className={`flex-1 py-3 px-5 rounded-full text-white font-bold text-sm shadow-md transition-all ${
                type === 'error'
                  ? 'bg-rose-600 hover:bg-rose-700 shadow-rose-600/20'
                  : type === 'warning' || type === 'confirm'
                  ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-600/20'
                  : type === 'success'
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/20'
                  : 'bg-[#1d72f8] hover:bg-[#1856b0] shadow-blue-500/20'
              }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};
export default AlertModal;
