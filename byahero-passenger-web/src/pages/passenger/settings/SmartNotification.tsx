import React, { useState, useEffect } from 'react';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import AlertModal from '../../../components/AlertModal';

export const SmartNotification: React.FC = () => {
  const { user, serverUrl } = useAuth();

  const [pushEnabled, setPushEnabled] = useState(false);
  const [notifySchedule, setNotifySchedule] = useState(true);
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifySeat, setNotifySeat] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // AlertModal state
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
        setAlertConfig((p) => ({ ...p, visible: false }));
        if (onConfirm) onConfirm();
      },
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('byahero_smart_notifs');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (parsed.notifySchedule !== undefined) setNotifySchedule(parsed.notifySchedule);
        if (parsed.notifyArrival !== undefined) setNotifyArrival(parsed.notifyArrival);
        if (parsed.notifySeat !== undefined) setNotifySeat(parsed.notifySeat);
        if (parsed.pushEnabled !== undefined) setPushEnabled(parsed.pushEnabled);
      } catch (e) {}
    }
  }, []);

  const updateSetting = (key: string, val: boolean) => {
    if (key === 'notifySchedule') setNotifySchedule(val);
    if (key === 'notifyArrival') setNotifyArrival(val);
    if (key === 'notifySeat') setNotifySeat(val);

    const updated = {
      notifySchedule: key === 'notifySchedule' ? val : notifySchedule,
      notifyArrival: key === 'notifyArrival' ? val : notifyArrival,
      notifySeat: key === 'notifySeat' ? val : notifySeat,
      pushEnabled,
    };
    localStorage.setItem('byahero_smart_notifs', JSON.stringify(updated));
  };

  const handleSubscribePush = () => {
    setIsSubscribing(true);
    setTimeout(() => {
      setIsSubscribing(false);
      setPushEnabled(true);
      const updated = { notifySchedule, notifyArrival, notifySeat, pushEnabled: true };
      localStorage.setItem('byahero_smart_notifs', JSON.stringify(updated));
      showAlert('Subscribed', 'Your device registered successfully for push notifications!', 'success');
    }, 600);
  };

  const notificationOptions = [
    {
      key: 'notifySchedule',
      title: 'Bus Schedule Update',
      desc: 'Receive alerts when bus timetables change',
      icon: 'schedule',
      color: '#3b82f6',
      value: notifySchedule,
    },
    {
      key: 'notifyArrival',
      title: 'Bus Arrival Alerts',
      desc: 'Notify when tracking bus approaches stops',
      icon: 'directions_bus',
      color: '#10b981',
      value: notifyArrival,
    },
    {
      key: 'notifySeat',
      title: 'Seat Availability',
      desc: 'Alert when target seats open up on routes',
      icon: 'event_seat',
      color: '#f59e0b',
      value: notifySeat,
    },
  ];

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Smart Notifications" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            {/* Intro */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
              <p className="text-sm font-semibold text-slate-700 leading-relaxed">
                Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and seat availability.
              </p>
            </div>

            {/* Subscribe Trigger */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <h3 className="text-sm font-bold text-slate-800">Enable Push Notifications</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    Allow alerts on this device and sync your notification ID.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubscribePush}
                  disabled={isSubscribing || pushEnabled}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    pushEnabled
                      ? 'bg-slate-100 border border-slate-200 text-slate-400'
                      : 'bg-[#1e3a8a] text-white shadow-sm hover:bg-blue-900'
                  }`}
                >
                  {pushEnabled ? 'Enabled' : (isSubscribing ? 'Registering...' : 'Enable')}
                </button>
              </div>
            </div>

            {/* Switches */}
            <h2 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1">
              Notification Channels
            </h2>

            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden divide-y divide-slate-100">
              {notificationOptions.map((opt, idx) => (
                <div key={idx} className="flex items-center justify-between p-4">
                  <div className="flex items-center flex-1 mr-3">
                    <div
                      className="w-10 h-10 rounded-2xl flex justify-center items-center mr-3.5 shrink-0"
                      style={{ backgroundColor: `${opt.color}15` }}
                    >
                      <MaterialIcons name={opt.icon} size={20} color={opt.color} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-slate-700">{opt.title}</div>
                      <div className="text-xs text-slate-400 mt-0.5 truncate">{opt.desc}</div>
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={opt.value}
                    onChange={(e) => updateSetting(opt.key, e.target.checked)}
                    className="w-5 h-5 accent-[#1e3a8a] rounded cursor-pointer shrink-0"
                  />
                </div>
              ))}
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
        onConfirm={alertConfig.onConfirm}
      />
    </div>
  );
};
export default SmartNotification;
