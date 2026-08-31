import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToastNotification, useNotifications } from '../context/NotificationContext';
import { AlertTriangle, Bus, Bell, X, ArrowRight } from 'lucide-react';

export const NotificationToast: React.FC = () => {
  const { activeToast, dismissToast } = useNotifications();
  const navigate = useNavigate();

  useEffect(() => {
    if (activeToast) {
      const timer = setTimeout(() => {
        dismissToast();
      }, 7000);
      return () => clearTimeout(timer);
    }
  }, [activeToast, dismissToast]);

  if (!activeToast) return null;

  const isSos = activeToast.type === 'sos';
  const isSchedule = activeToast.type === 'admin' || activeToast.title.toLowerCase().includes('schedule');

  const handleAction = () => {
    dismissToast();
    if (activeToast.route) {
      navigate(activeToast.route);
    } else if (isSos) {
      navigate('/notifications');
    } else {
      navigate('/bus-info');
    }
  };

  return (
    <div className="fixed top-16 left-0 right-0 z-[3000] px-4 pointer-events-none flex justify-center animate-in slide-in-from-top-4 duration-300">
      <div
        className={`pointer-events-auto max-w-md w-full rounded-2xl p-4 shadow-2xl border flex items-start gap-3.5 transition-all ${
          isSos
            ? 'bg-red-600 border-red-700 text-white shadow-red-600/30'
            : isSchedule
            ? 'bg-[#103d7c] border-blue-900 text-white shadow-blue-950/30'
            : 'bg-slate-900 border-slate-800 text-white shadow-slate-950/30'
        }`}
      >
        <div
          className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
            isSos ? 'bg-white/20 text-white' : 'bg-white/10 text-white'
          }`}
        >
          {isSos ? (
            <AlertTriangle className="w-5 h-5 animate-pulse" />
          ) : isSchedule ? (
            <Bus className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
        </div>

        <div className="flex-1 min-w-0" onClick={handleAction} role="button" tabIndex={0}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-black uppercase tracking-wider truncate">{activeToast.title}</h4>
          </div>
          <p className="text-xs font-medium opacity-90 mt-0.5 line-clamp-2 leading-relaxed">
            {activeToast.message}
          </p>
          <div className="mt-2 flex items-center gap-1 text-[11px] font-extrabold underline cursor-pointer">
            <span>{isSos ? 'View Emergency Alert' : 'View Timetable'}</span>
            <ArrowRight className="w-3 h-3" />
          </div>
        </div>

        <button
          type="button"
          onClick={dismissToast}
          className="p-1 rounded-lg hover:bg-white/20 transition-colors cursor-pointer shrink-0 text-white/80 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

export default NotificationToast;
