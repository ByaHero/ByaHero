import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../../components/PassengerNavbar';
import PassengerFooter from '../../../components/PassengerFooter';
import { useAuth } from '../../../context/AuthContext';
import { useNotifications } from '../../../context/NotificationContext';
import { MaterialIcons } from '../../../components/ui/MaterialIcons';
import { Loader2, RefreshCw } from 'lucide-react';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const { user, serverUrl } = useAuth();
  const { clearUnreadCount } = useNotifications();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [smartNotifications, setSmartNotifications] = useState<any[]>([]);
  const [notifyBusSchedule, setNotifyBusSchedule] = useState(false);
  const [notifyBusArrival, setNotifyBusArrival] = useState(false);
  const [notifySeatAvailability, setNotifySeatAvailability] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const fetchNotifications = async (isManual = false) => {
    if (isManual) setRefreshing(true);
    try {
      let data: any = null;
      try {
        const emailParam = user?.email
          ? `email=${encodeURIComponent(user.email)}&mark_read=1`
          : 'mark_read=1';
        const authHeaders: Record<string, string> = user?.email
          ? { 'X-User-Email': user.email }
          : {};

        const res = await fetch(`${serverUrl}/api/notifications?${emailParam}`, {
          headers: authHeaders,
          credentials: 'include',
          cache: 'no-store',
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {}

      setLoading(false);
      setRefreshing(false);

      if (data && data.success) {
        setSosAlerts(data.sos_alerts || []);
        setSmartNotifications(data.notifications || []);
        setNotifyBusSchedule(!!data.notify_bus_schedule);
        setNotifyBusArrival(!!data.notify_bus_arrival);
        setNotifySeatAvailability(!!data.notify_seat_availability);
        clearUnreadCount();
      } else {
        // Fallback default notifications
        setSmartNotifications([
          {
            title: 'Welcome to ByaHero Web',
            message: 'Live bus tracking and passenger services are active for Laurel - Tanauan routes.',
            created_at: new Date().toISOString(),
            type: 'bus_arrival',
          },
        ]);
      }
    } catch (err) {
      setLoading(false);
      setRefreshing(false);
      setErrorText('An unexpected network error occurred.');
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [serverUrl, user?.email]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(/-/g, '/'));
    if (isNaN(date.getTime())) return dateStr;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getIconDetails = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t === 'schedule_update' || t === 'schedule') {
      return { icon: 'schedule', color: '#0284c7' };
    }
    if (t === 'bus_arrival') {
      return { icon: 'place', color: '#103d7c' };
    }
    if (t === 'seat_full') {
      return { icon: 'event_seat', color: '#ef4444' };
    }
    return { icon: 'notifications', color: '#64748b' };
  };

  const handleNotificationClick = (notif: any) => {
    const t = String(notif?.type || '').toLowerCase();
    if (t === 'schedule_update' || t === 'schedule') {
      navigate('/bus-info');
    }
  };

  const hasSettings = notifyBusSchedule || notifyBusArrival || notifySeatAvailability;
  const hasHistory = sosAlerts.length > 0 || smartNotifications.length > 0;
  const showEmptyState = !loading && !hasSettings && !hasHistory;

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Notifications" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          {/* Quick Refresh Bar */}
          <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 flex items-center justify-between text-xs text-slate-500 font-semibold">
            <span>Updates synced in real-time</span>
            <button
              type="button"
              onClick={() => fetchNotifications(true)}
              disabled={refreshing || loading}
              className="flex items-center gap-1 text-[#103d7c] font-bold hover:underline cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-[#103d7c]" />
            </div>
          ) : errorText ? (
            <div className="flex flex-col justify-center items-center px-8 py-20 text-center">
              <MaterialIcons name="cloud_off" size={64} color="#64748b" className="mb-4" />
              <h2 className="text-lg font-bold text-[#103d7c] mb-2">Connection Error</h2>
              <p className="text-sm text-[#64748b] text-center mb-6">{errorText}</p>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="bg-[#103d7c] text-white font-bold text-sm px-6 py-2.5 rounded-full cursor-pointer"
              >
                Go Back
              </button>
            </div>
          ) : showEmptyState ? (
            <div className="flex flex-col justify-center items-center px-8 py-20 text-center">
              <MaterialIcons name="notifications_off" size={64} color="#64748b" className="mb-4" />
              <h2 className="text-lg font-bold text-[#103d7c] mb-2">Notifications Disabled</h2>
              <p className="text-sm text-[#64748b] text-center mb-6 leading-5">
                You haven't enabled any notifications yet. Turn on Smart Notifications to stay updated about bus schedules, arrivals, and seat availability.
              </p>
              <button
                type="button"
                onClick={() => navigate('/settings/smart-notifications')}
                className="bg-[#103d7c] px-6 py-3 rounded-full flex items-center gap-2 text-white font-extrabold text-sm cursor-pointer"
              >
                <MaterialIcons name="notifications_active" size={18} color="white" />
                <span>Enable Notifications</span>
              </button>
            </div>
          ) : (
            <div className="bg-white">
              {/* SOS Alerts Section */}
              {sosAlerts.length > 0 && (
                <div className="mb-4">
                  <div className="bg-red-50 px-4 py-2 border-y border-red-100 flex items-center justify-between">
                    <span className="text-xs font-black text-red-600 tracking-wider">🚨 SOS EMERGENCY ALERTS</span>
                    <span className="text-[10px] bg-red-200 text-red-800 font-extrabold px-1.5 py-0.5 rounded-full">
                      {sosAlerts.length}
                    </span>
                  </div>
                  <div>
                    {sosAlerts.map((alert, index) => {
                      const isUnread = alert.status === 'active';
                      return (
                        <div
                          key={index}
                          className={`px-4 py-4 border-b border-slate-100 flex gap-3.5 items-start ${
                            isUnread ? 'bg-red-50/50' : ''
                          }`}
                        >
                          <div className="w-10 h-10 rounded-full bg-red-100 flex justify-center items-center shrink-0">
                            <MaterialIcons name="warning" size={20} color="#ef4444" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-sm font-extrabold text-slate-800 flex-1 mr-2 truncate">
                                SOS from {alert.sender_name || alert.sender_email || 'Unknown'}
                              </span>
                              <span className="text-[10px] text-[#64748b] font-semibold">
                                {formatDate(alert.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748b] leading-4">
                              {alert.location_text || 'Location not provided'}
                            </p>
                          </div>
                          {isUnread && (
                            <div className="w-2.5 h-2.5 rounded-full bg-red-500 self-center shrink-0 animate-ping" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Smart Notifications Section */}
              <div>
                <div className="bg-[#103d7c]/5 px-4 py-2 border-y border-[#103d7c]/10 flex items-center justify-between">
                  <span className="text-xs font-black text-[#103d7c] tracking-wider">
                    ADMIN & SMART NOTIFICATIONS
                  </span>
                  <span className="text-[10px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded-full">
                    {smartNotifications.length}
                  </span>
                </div>
                {smartNotifications.length === 0 ? (
                  <div className="px-4 py-6 text-center">
                    <span className="text-xs text-[#64748b] italic">
                      No smart notifications yet. Open the map to generate alerts.
                    </span>
                  </div>
                ) : (
                  <div>
                    {smartNotifications.map((notif, index) => {
                      const iconDetails = getIconDetails(notif.type);
                      const isUnread = !notif.read_at;
                      return (
                        <div
                          key={index}
                          onClick={() => handleNotificationClick(notif)}
                          className="px-4 py-4 border-b border-slate-100 flex gap-3.5 items-start cursor-pointer hover:bg-slate-50 transition-colors"
                        >
                          <div
                            className="w-10 h-10 rounded-2xl flex justify-center items-center shrink-0"
                            style={{ backgroundColor: `${iconDetails.color}15` }}
                          >
                            <MaterialIcons name={iconDetails.icon} size={20} color={iconDetails.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex justify-between items-baseline mb-1">
                              <span className="text-sm font-extrabold text-slate-800 flex-1 mr-2 truncate">
                                {notif.title}
                              </span>
                              <span className="text-[10px] text-[#64748b] font-semibold">
                                {formatDate(notif.created_at)}
                              </span>
                            </div>
                            <p className="text-xs text-[#64748b] leading-4">
                              {notif.message}
                            </p>
                          </div>
                          {isUnread && (
                            <div className="w-2.5 h-2.5 rounded-full bg-blue-500 self-center shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default Notifications;
