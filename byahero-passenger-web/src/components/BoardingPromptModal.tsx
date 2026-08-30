import React from 'react';
import { Bus, Check, X } from 'lucide-react';

interface BoardingPromptModalProps {
  visible: boolean;
  busIdentifier?: string;
  onAccept: () => void;
  onReject: () => void;
}

export const BoardingPromptModal: React.FC<BoardingPromptModalProps> = ({
  visible,
  busIdentifier,
  onAccept,
  onReject,
}) => {
  if (!visible) return null;

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center border border-slate-100 transform transition-all my-8">
        <div className="w-16 h-16 rounded-full bg-blue-100 text-[#1d72f8] flex items-center justify-center mx-auto mb-4">
          <Bus className="w-8 h-8 animate-bounce" />
        </div>

        <h3 className="text-lg font-black text-slate-800 mb-1.5">
          Boarding Detected
        </h3>
        <p className="text-xs text-slate-500 font-medium mb-6">
          Are you currently riding on <strong className="text-slate-800 font-bold">Bus {busIdentifier || 'nearby'}</strong>?
        </p>

        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            onClick={onReject}
            className="flex-1 py-3 px-4 rounded-full border border-slate-200 text-slate-600 font-bold text-xs hover:bg-slate-50 transition-colors flex items-center justify-center gap-1.5"
          >
            <X className="w-4 h-4" />
            No, Not Me
          </button>
          <button
            type="button"
            onClick={onAccept}
            className="flex-1 py-3 px-4 rounded-full bg-[#1d72f8] hover:bg-[#1856b0] text-white font-bold text-xs shadow-lg shadow-blue-500/25 transition-colors flex items-center justify-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            Yes, Boarded
          </button>
        </div>
      </div>
    </div>
  );
};
export default BoardingPromptModal;
