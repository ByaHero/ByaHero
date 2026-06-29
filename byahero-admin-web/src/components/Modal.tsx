import React from 'react';
import { X, CheckCircle, AlertTriangle, Info } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  type?: 'success' | 'warning' | 'info' | 'error';
  primaryAction?: {
    label: string;
    onClick: () => void;
    danger?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void;
  };
}

export default function Modal({ isOpen, onClose, title, children, type = 'info', primaryAction, secondaryAction }: ModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
        onClick={onClose} 
      />
      
      {/* Modal Dialog */}
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md relative z-10 overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        <div className="p-6">
          <div className="flex justify-between items-start mb-4">
            <div className="flex items-center gap-3">
              {type === 'success' && <CheckCircle className="text-green-500 w-6 h-6 shrink-0" />}
              {type === 'warning' && <AlertTriangle className="text-amber-500 w-6 h-6 shrink-0" />}
              {type === 'error' && <AlertTriangle className="text-red-500 w-6 h-6 shrink-0" />}
              {type === 'info' && <Info className="text-blue-500 w-6 h-6 shrink-0" />}
              <h3 className="text-lg font-extrabold text-slate-800">{title}</h3>
            </div>
            <button 
              onClick={onClose} 
              className="text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-full p-1.5 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
          
          <div className="text-slate-600 mb-6 text-[15px] leading-relaxed pl-9">
            {children}
          </div>

          {(primaryAction || secondaryAction) && (
            <div className="flex justify-center gap-3 pt-4 border-t border-slate-100">
              {secondaryAction && (
                <button 
                  onClick={secondaryAction.onClick}
                  className="px-5 py-2.5 mt-4 rounded-full font-bold text-sm text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  {secondaryAction.label}
                </button>
              )}
              {primaryAction && (
                <button 
                  onClick={primaryAction.onClick}
                  disabled={primaryAction.disabled}
                  className={`px-6 py-2.5 mt-4 rounded-full font-bold text-sm text-white transition-colors shadow-sm disabled:opacity-70 ${
                    primaryAction.danger 
                      ? 'bg-red-600 hover:bg-red-700' 
                      : 'bg-[#0f3878] hover:bg-[#1a4b9c]'
                  }`}
                >
                  {primaryAction.label}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
