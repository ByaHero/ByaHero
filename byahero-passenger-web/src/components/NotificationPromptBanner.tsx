import React, { useState } from 'react';
import { useNotifications } from '../context/NotificationContext';
import { Bell, X, Check } from 'lucide-react';

export const NotificationPromptBanner: React.FC = () => {
  const { permission, isPushEnabled, requestPermissionAndEnablePush } = useNotifications();
  const [dismissed, setDismissed] = useState(false);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // If permission is already granted/denied or user dismissed, don't show
  if (permission === 'granted' || permission === 'denied' || isPushEnabled || dismissed) {
    return null;
  }

  const handleEnable = async () => {
    setIsSubscribing(true);
    try {
      await requestPermissionAndEnablePush();
    } catch (e) {
      console.warn('[NotificationPromptBanner] Error requesting permission:', e);
    } finally {
      setIsSubscribing(false);
    }
  };

  return (
    <div className="absolute top-20 left-4 right-4 md:left-6 md:right-auto md:max-w-md z-[1045] animate-in fade-in slide-in-from-top duration-300">
      <div className="bg-[#103d7c]/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-blue-400/30 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-amber-400/20 flex items-center justify-center flex-shrink-0 text-amber-300">
            <Bell className="w-5 h-5 animate-pulse" />
          </div>
          <div className="min-w-0">
            <p className="font-black text-xs uppercase tracking-wider text-amber-200">Push Notifications</p>
            <p className="text-xs text-white/90 truncate">Get schedule updates & SOS emergency alerts</p>
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={handleEnable}
            disabled={isSubscribing}
            className="bg-amber-500 hover:bg-amber-600 active:scale-95 text-slate-950 font-black text-xs px-3 py-1.5 rounded-xl shadow-md transition-all whitespace-nowrap flex items-center gap-1 disabled:opacity-75 cursor-pointer"
          >
            {isSubscribing ? 'Prompting...' : 'Enable'}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="text-blue-300 hover:text-white p-1 cursor-pointer"
            title="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default NotificationPromptBanner;
