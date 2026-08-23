import React from 'react';
import { LogOut, Check, X } from 'lucide-react';

interface DepartingPromptModalProps {
  visible: boolean;
  onAccept: () => void;
  onReject: () => void;
}

export const DepartingPromptModal: React.FC<DepartingPromptModalProps> = ({
  visible,
  onAccept,
  onReject,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 transform transition-all">
        <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-8 h-8" />
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-1.5">
          End of Trip?
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Did you already arrive at your destination and alight from the bus?
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 py-3 px-4 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Still Riding
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Yes, Departed
          </button>
        </div>
      </div>
    </div>
  );
};
export default DepartingPromptModal;
