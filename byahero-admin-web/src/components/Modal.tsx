import React, { ReactNode } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}

export default function Modal({ isOpen, onClose, title, children, footer }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-200" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-[520px] p-6 shadow-2xl border border-slate-200 animate-modal-enter flex flex-col max-h-[90vh] overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
          <h2 className="text-lg font-extrabold text-slate-800 tracking-tight">{title}</h2>
          <button className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1.5 rounded-lg transition cursor-pointer" onClick={onClose}>
            <X size={18} />
          </button>
        </div>
        <div className="overflow-y-auto flex-1 pr-1 text-sm text-slate-600">
          {children}
        </div>
        {footer && (
          <div className="flex justify-end gap-3 mt-5 pt-3 border-t border-slate-100">
            {footer}
          </div>
        )}
      </div>
    </div>
  );
}
