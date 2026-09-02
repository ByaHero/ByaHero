import React, { useState, useEffect } from 'react';
import PassengerHeader from '../../../components/PassengerNavbar';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import AlertModal from '../../../components/AlertModal';
import { sendLocalTestNotification } from '../../../services/notificationService';
import { playNotificationPing } from '../../../services/soundEffects';

export const SmartNotification: React.FC = () => {
  const { user, serverUrl } = useAuth();
  const { isPushEnabled, permission, requestPermissionAndEnablePush } = useNotifications();

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
    // 1. Fetch local settings
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

    if (isPushEnabled || permission === 'granted') {
      setPushEnabled(true);
    }

    // 2. Fetch server settings
    const fetchServerSettings = async () => {
      try {
        const emailParam = user?.email ? `?email=${encodeURIComponent(user.email)}` : '';
        const headers: Record<string, string> = user?.email ? { 'X-User-Email': user.email } : {};

        const res = await fetch(`${serverUrl}/api/settings/fetch${emailParam}`, {
          headers,
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.success && data.settings) {
            const s = data.settings;
            if (s.notify_bus_schedule !== undefined) setNotifySchedule(s.notify_bus_schedule == 1);
            if (s.notify_bus_arrival !== undefined) setNotifyArrival(s.notify_bus_arrival == 1);
            if (s.notify_seat_availability !== undefined) setNotifySeat(s.notify_seat_availability == 1);
          }
        }
      } catch (e) {}
    };

    fetchServerSettings();
  }, [serverUrl, isPushEnabled, permission, user?.email]);

  const updateSetting = async (key: string, val: boolean) => {
    let newSched = notifySchedule;
    let newArr = notifyArrival;
    let newSeat = notifySeat;

    if (key === 'notifySchedule') { setNotifySchedule(val); newSched = val; }
    if (key === 'notifyArrival') { setNotifyArrival(val); newArr = val; }
    if (key === 'notifySeat') { setNotifySeat(val); newSeat = val; }

    const updated = {
      notifySchedule: newSched,
      notifyArrival: newArr,
      notifySeat: newSeat,
      pushEnabled,
    };
    localStorage.setItem('byahero_smart_notifs', JSON.stringify(updated));

    // Sync with backend /api/settings/update
    try {
      const formData = new FormData();
      formData.append('notify_bus_schedule', newSched ? '1' : '0');
      formData.append('notify_bus_arrival', newArr ? '1' : '0');
      formData.append('notify_seat_availability', newSeat ? '1' : '0');
      if (user?.email) {
        formData.append('email', user.email);
      }

      const headers: Record<string, string> = user?.email ? { 'X-User-Email': user.email } : {};

      await fetch(`${serverUrl}/api/settings/update`, {
        method: 'POST',
        body: formData,
        headers,
        credentials: 'include'
      });
    } catch (e) {
      console.warn('[SmartNotification] Failed to sync settings to server:', e);
    }
  };

  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    try {
      const success = await requestPermissionAndEnablePush();
      setIsSubscribing(false);

      if (success || Notification.permission === 'granted') {
        setPushEnabled(true);
        const updated = { notifySchedule, notifyArrival, notifySeat, pushEnabled: true };
        localStorage.setItem('byahero_smart_notifs', JSON.stringify(updated));
        showAlert(
          'Push Notifications Active',
          'Your web browser is registered to receive real-time bus schedule changes, SOS alerts, and live transit notifications!',
          'success'
        );
      } else if (Notification.permission === 'denied') {
        showAlert(
          'Permission Blocked',
          'Notifications are blocked in your browser settings. Please allow notifications for this site to receive push alerts.',
          'warning'
        );
      } else {
        showAlert(
          'Subscription Pending',
          'Notification permission was not confirmed. Please click Allow when prompted by your browser.',
          'info'
        );
      }
    } catch (err) {
      setIsSubscribing(false);
      showAlert('Error', 'Failed to enable push notifications. Please check your browser permissions.', 'error');
    }
  };

  const handleTestNotification = async () => {
    try {
      playNotificationPing();
      const sent = await sendLocalTestNotification(
        'ByaHero Test Notification',
        'Web push and audio alerts are working properly on your browser!'
      );
      if (sent) {
        showAlert(
          'Test Notification Dispatched',
          'A desktop notification was sent to your browser. If you did not see a popup banner, please check your operating system / browser notification settings.',
          'success'
        );
      } else {
        showAlert(
          'Permission Required',
          'Please click "Enable" to grant browser notification permissions before testing.',
          'info'
        );
      }
    } catch (e) {
      showAlert('Error', 'Unable to trigger test notification.', 'error');
    }
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
                Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and emergency SOS broadcasts.
              </p>
            </div>

            {/* Subscribe Trigger */}
            <div className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4">
              <div className="flex justify-between items-center">
                <div className="flex-1 mr-4">
                  <h3 className="text-sm font-bold text-slate-800">Enable Push Notifications</h3>
                  <p className="text-xs text-slate-400 mt-1 font-semibold">
                    {pushEnabled
                      ? 'Push notifications are active on this device.'
                      : 'Allow browser push alerts for admin schedule updates and SOS alarms.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleSubscribePush}
                  disabled={isSubscribing || pushEnabled}
                  className={`px-4 py-2.5 rounded-full text-xs font-bold transition-colors cursor-pointer ${
                    pushEnabled
                      ? 'bg-emerald-50 border border-emerald-200 text-emerald-600 font-extrabold'
                      : 'bg-[#1e3a8a] text-white shadow-sm hover:bg-blue-900'
                  }`}
                >
                  {pushEnabled ? 'Active ✓' : (isSubscribing ? 'Registering...' : 'Enable')}
                </button>
              </div>

              <div className="pt-3.5 mt-2 border-t border-slate-100 flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-slate-700">Test Notification</p>
                  <p className="text-[11px] text-slate-400 font-medium">Verify system banner and audio ping</p>
                </div>
                <button
                  type="button"
                  onClick={handleTestNotification}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-blue-50 hover:bg-blue-100 text-[#1e3a8a] border border-blue-200 transition-all flex items-center gap-1.5 cursor-pointer active:scale-95"
                >
                  <MaterialIcons name="notifications_active" size={16} color="#1e3a8a" />
                  <span>Send Test</span>
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

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={() => setAlertConfig((p) => ({ ...p, visible: false }))}
      />
    </div>
  );
};

export default SmartNotification;
