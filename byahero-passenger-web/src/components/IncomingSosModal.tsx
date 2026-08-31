import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, MapPin, X, Bell, ExternalLink, ShieldAlert } from 'lucide-react';

export interface IncomingSosData {
  id?: number | string;
  sender_name?: string;
  sender_email?: string;
  location_text?: string;
  created_at?: string;
  lat?: number | null;
  lng?: number | null;
}

interface IncomingSosModalProps {
  alert: IncomingSosData | null;
  onClose: () => void;
}

export const IncomingSosModal: React.FC<IncomingSosModalProps> = ({ alert, onClose }) => {
  const navigate = useNavigate();

  if (!alert) return null;

  const sender = alert.sender_name || alert.sender_email || 'A family circle member';
  const location = alert.location_text || 'Live coordinates shared';
  const timeStr = alert.created_at
    ? new Date(alert.created_at.replace(/-/g, '/')).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    : 'Just now';

  const handleViewNotifications = () => {
    onClose();
    navigate('/notifications');
  };

  const handleViewMap = () => {
    onClose();
    navigate('/');
  };

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-900/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border-2 border-red-500 overflow-hidden">
        {/* Animated Emergency Top Bar */}
        <div className="bg-red-600 px-6 py-4 flex items-center justify-between text-white shadow-inner animate-pulse">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-full">
              <ShieldAlert className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="text-base font-black tracking-wider uppercase">EMERGENCY SOS ALERT</h3>
              <p className="text-xs text-red-100 font-semibold">Immediate assistance requested</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/20 text-white transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-4">
          <div className="flex items-start gap-4 p-4 rounded-2xl bg-red-50/80 border border-red-100">
            <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center shrink-0 text-red-600">
              <AlertTriangle className="w-6 h-6 animate-bounce" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex justify-between items-baseline">
                <h4 className="text-base font-extrabold text-slate-900 truncate">{sender}</h4>
                <span className="text-xs font-bold text-red-600">{timeStr}</span>
              </div>
              <p className="text-xs font-semibold text-slate-600 mt-0.5">
                Broadcasted an emergency distress panic alert to responders and your circle!
              </p>
            </div>
          </div>

          {/* Location Block */}
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 flex items-start gap-3">
            <MapPin className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Reported Location</div>
              <div className="text-sm font-extrabold text-slate-800 break-words">{location}</div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="grid grid-cols-2 gap-3 pt-2">
            <button
              type="button"
              onClick={handleViewNotifications}
              className="py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Bell className="w-4 h-4 text-slate-600" />
              <span>All Alerts</span>
            </button>

            <button
              type="button"
              onClick={handleViewMap}
              className="py-3 px-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-red-600/30 transition-all cursor-pointer"
            >
              <ExternalLink className="w-4 h-4 text-white" />
              <span>Track on Map</span>
            </button>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 text-center text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            Dismiss Alert Banner
          </button>
        </div>
      </div>
    </div>
  );
};
