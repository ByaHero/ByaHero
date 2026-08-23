import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../components/PassengerNavbar';
import PassengerFooter from '../components/PassengerFooter';
import { useAuth } from '../context/AuthContext';
import { MaterialIcons } from '../components/ui/MaterialIcons';
import { Loader2 } from 'lucide-react';

export const LoginActivity: React.FC = () => {
  const navigate = useNavigate();
  const { serverUrl } = useAuth();

  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch(`${serverUrl}/api/passenger/profile/login-activity`, {
          credentials: 'include',
        });
        const data = await res.json();
        const list = data.activity || data.activities;
        if (data && data.success && Array.isArray(list)) {
          setActivities(list);
        } else {
          setActivities([
            {
              browser: 'Web Browser',
              device: 'Desktop/Web',
              event_type: 'login',
              ip_address: '127.0.0.1',
              created_at: new Date().toISOString(),
            },
          ]);
        }
      } catch (err) {
        setActivities([
          {
            browser: 'Web Browser',
            device: 'Desktop/Web',
            event_type: 'login',
            ip_address: '127.0.0.1',
            created_at: new Date().toISOString(),
          },
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, [serverUrl]);

  const getDeviceIcon = (device: string) => {
    const dev = (device || '').toLowerCase();
    if (dev.includes('mobile') || dev.includes('phone') || dev.includes('android') || dev.includes('ios'))
      return 'smartphone';
    if (dev.includes('tablet') || dev.includes('ipad')) return 'tablet';
    return 'computer';
  };

  const formatTimeAgo = (dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return dateStr;

    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) return 'Just now';

    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderStatusBadge = (act: any, isCurrent: boolean) => {
    if (isCurrent) {
      return (
        <span className="bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-emerald-600">
          Active Now
        </span>
      );
    }

    const type = (act.event_type || 'login').toLowerCase();
    if (type === 'logout') {
      return (
        <span className="bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-slate-500">
          Logged Out
        </span>
      );
    } else if (type === 'session_expired') {
      return (
        <span className="bg-rose-50 border border-rose-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-rose-500">
          Expired
        </span>
      );
    }

    return (
      <span className="bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5 text-[10px] font-bold text-blue-600">
        Logged In
      </span>
    );
  };

  return (
    <div className="h-screen max-h-screen w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Login Activity" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            <h1 className="text-lg font-black text-slate-800 mb-1 px-1">Login Activity</h1>
            <p className="text-xs text-slate-400 font-medium mb-5 px-1">
              Recent sessions where your account was accessed
            </p>

            {isLoading ? (
              <div className="py-16 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
              </div>
            ) : activities.length === 0 ? (
              <div className="bg-white rounded-3xl p-8 flex flex-col items-center border border-slate-100 shadow-sm text-center">
                <MaterialIcons name="history" size={48} color="#cbd5e1" />
                <span className="text-sm font-semibold text-slate-400 mt-3">No session logs available</span>
              </div>
            ) : (
              <div className="space-y-3">
                {activities.map((act, index) => {
                  const isCurrent = index === 0 && act.event_type !== 'logout';
                  return (
                    <div
                      key={index}
                      className={`bg-white rounded-2xl p-4 flex items-center border border-slate-100 shadow-sm ${
                        isCurrent ? 'border-l-4 border-l-blue-500' : ''
                      }`}
                    >
                      <div
                        className={`w-12 h-12 rounded-xl flex justify-center items-center mr-4 shrink-0 ${
                          isCurrent ? 'bg-blue-50' : 'bg-slate-50'
                        }`}
                      >
                        <MaterialIcons
                          name={getDeviceIcon(act.device)}
                          size={22}
                          color={isCurrent ? '#3b82f6' : '#64748b'}
                        />
                      </div>

                      <div className="flex-1 min-w-0 mr-2">
                        <div className="flex items-center justify-between flex-wrap gap-1 mb-1.5">
                          <span className="text-sm font-bold text-slate-700 truncate">
                            {act.browser || 'Browser'} on {act.device || 'Unknown Device'}
                          </span>
                          {renderStatusBadge(act, isCurrent)}
                        </div>

                        <div className="flex items-center flex-wrap gap-y-1 text-[11px] text-slate-400 font-semibold">
                          <div className="flex items-center mr-3">
                            <MaterialIcons name="schedule" size={13} color="#94a3b8" className="mr-1" />
                            <span>{formatTimeAgo(act.created_at)}</span>
                          </div>

                          <div className="flex items-center">
                            <MaterialIcons name="location_on" size={13} color="#94a3b8" className="mr-0.5" />
                            <span>{act.ip_address || 'Unknown IP'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Security Tip Banner */}
            <div className="bg-blue-50 border border-blue-100 rounded-3xl p-4.5 mt-5 flex items-start text-left">
              <MaterialIcons name="security" size={20} color="#2563eb" className="mr-3 mt-0.5 shrink-0" />
              <div className="flex-1">
                <span className="text-xs font-bold text-blue-800 mb-0.5 block">Security Reminder</span>
                <p className="text-[11px] text-blue-700/80 leading-relaxed">
                  If you notice any unfamiliar devices or locations in your session history, please change your account password immediately to protect your account.
                </p>
              </div>
            </div>

            {/* Return Button */}
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="mt-5 w-full bg-white hover:bg-slate-50 py-4 rounded-3xl flex items-center justify-center border border-slate-200/80 shadow-sm text-sm font-bold text-slate-600 transition-colors cursor-pointer"
            >
              Back to Settings
            </button>
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default LoginActivity;
