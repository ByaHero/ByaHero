import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import PassengerHeader from '../../components/PassengerNavbar';
import PassengerFooter from '../../components/PassengerFooter';
import { useAuth } from '../../context/AuthContext';
import { MaterialIcons } from '../../components/ui/MaterialIcons';
import { Loader2 } from 'lucide-react';

export const RideHistory: React.FC = () => {
  const navigate = useNavigate();
  const { serverUrl } = useAuth();

  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRides, setTotalRides] = useState(0);
  const [totalDurationText, setTotalDurationText] = useState('0m');
  const [favRoute, setFavRoute] = useState('N/A');

  useEffect(() => {
    async function loadHistory() {
      try {
        const res = await fetch(`${serverUrl}/api/buses/history`, {
          credentials: 'include',
        });
        const data = await res.json();
        setIsLoading(false);

        if (data.success && data.history) {
          setHistory(data.history);
          localStorage.setItem('byahero_cached_ride_history', JSON.stringify(data.history));
          processStats(data.history);
        } else {
          loadOfflineData();
        }
      } catch (err) {
        setIsLoading(false);
        loadOfflineData();
      }
    }
    loadHistory();
  }, [serverUrl]);

  const loadOfflineData = () => {
    const cached = localStorage.getItem('byahero_cached_ride_history');
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        setHistory(parsed);
        processStats(parsed);
      } catch (e) {}
    } else {
      setHistory([]);
    }
  };

  const processStats = (rideList: any[]) => {
    setTotalRides(rideList.length);
    let totalMins = 0;
    const routes: Record<string, number> = {};

    rideList.forEach((r) => {
      if (r.departed_at && r.boarded_at) {
        totalMins += Math.floor((new Date(r.departed_at).getTime() - new Date(r.boarded_at).getTime()) / 60000);
      }
      if (r.route) {
        routes[r.route] = (routes[r.route] || 0) + 1;
      }
    });

    const durationText =
      totalMins > 60 ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` : `${totalMins}m`;

    setTotalDurationText(durationText);
    const sortedRoutes = Object.entries(routes).sort((a, b) => b[1] - a[1]);
    setFavRoute(sortedRoutes[0]?.[0] || 'N/A');
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing';
    const diff = new Date(end).getTime() - new Date(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const getGroupLabel = (date: string) => {
    const now = new Date();
    const rideDate = new Date(date);
    const diffDays = Math.floor((now.getTime() - rideDate.setHours(0, 0, 0, 0)) / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This Week';

    return rideDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const getDisplayTime = (dateStr: string | null) => {
    if (!dateStr) return 'Ongoing';
    return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="h-[100dvh] max-h-[100dvh] w-full flex flex-col bg-white overflow-hidden">
      <PassengerHeader pageTitle="Ride History" showBackButton={true} />

      <div className="flex-1 overflow-y-auto w-full overscroll-contain">
        <div className="max-w-md mx-auto w-full pb-8">
          <div className="p-4 bg-slate-100/70 min-h-[560px] mt-4 rounded-t-[32px]">
            {/* Journey Stats Header */}
            {history.length > 0 && (
              <div className="bg-[#1e3a8a] rounded-3xl p-5 shadow-md mb-5 text-white">
                <span className="text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1 block">
                  Journey Stats
                </span>
                <span className="text-2xl font-black text-white mb-4 block">
                  {totalRides} Rides
                </span>

                <div className="flex border-t border-blue-800/80 pt-3">
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-blue-200 uppercase mb-0.5 block">
                      Total Duration
                    </span>
                    <span className="text-base font-bold text-white block">{totalDurationText}</span>
                  </div>
                  <div className="flex-1">
                    <span className="text-[10px] font-semibold text-blue-200 uppercase mb-0.5 block">
                      Fav Route
                    </span>
                    <span className="text-base font-bold text-white block truncate">{favRoute}</span>
                  </div>
                </div>
              </div>
            )}

            {isLoading ? (
              <div className="py-20 flex justify-center items-center">
                <Loader2 className="w-8 h-8 animate-spin text-[#1e3a8a]" />
              </div>
            ) : history.length === 0 ? (
              <div className="flex flex-col items-center py-16 px-4 text-center">
                <div className="w-24 h-24 bg-white rounded-full flex justify-center items-center mb-5 shadow-sm border border-slate-100">
                  <MaterialIcons name="commute" size={48} color="#1e3a8a" />
                </div>
                <h2 className="text-lg font-black text-slate-800 mb-2">No Rides Yet</h2>
                <p className="text-xs text-slate-400 font-semibold text-center leading-relaxed mb-6 px-4">
                  To build your ride history, you need to ride a bus while keeping your app open. Take your first ride and watch your history grow!
                </p>
                <button
                  type="button"
                  onClick={() => navigate('/')}
                  className="bg-[#1e3a8a] hover:bg-blue-900 px-8 py-3 rounded-full shadow-md text-sm font-bold text-white transition-colors cursor-pointer"
                >
                  Start a Trip
                </button>
              </div>
            ) : (
              <div>
                {(() => {
                  let currentGroup = '';
                  return history.map((ride, idx) => {
                    const group = getGroupLabel(ride.boarded_at);
                    const isNewGroup = group !== currentGroup;
                    if (isNewGroup) {
                      currentGroup = group;
                    }
                    const isActive = ride.status === 'active';

                    return (
                      <div key={idx}>
                        {isNewGroup && (
                          <div className="flex items-center my-3 px-1">
                            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2">
                              {group}
                            </span>
                            <div className="flex-1 h-[1px] bg-slate-200" />
                          </div>
                        )}

                        <div
                          className={`bg-white rounded-3xl p-5 border shadow-sm mb-3.5 ${
                            isActive ? 'border-blue-500 bg-blue-50/20' : 'border-slate-100'
                          }`}
                        >
                          <div className="flex justify-between items-center mb-3">
                            <div className="bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5">
                              <span className="text-[10px] font-bold text-[#1e3a8a]">
                                Bus {ride.bus_code || '—'}
                              </span>
                            </div>
                            <div
                              className={`px-2.5 py-0.5 rounded-full ${
                                isActive ? 'bg-green-100' : 'bg-slate-100'
                              }`}
                            >
                              <span
                                className={`text-[9px] font-extrabold uppercase ${
                                  isActive ? 'text-green-700' : 'text-slate-500'
                                }`}
                              >
                                {isActive ? 'On Ride' : 'Completed'}
                              </span>
                            </div>
                          </div>

                          <h3 className="text-base font-black text-slate-800 mb-4">
                            {ride.route || 'Express Route'}
                          </h3>

                          {/* Custom Route Timeline */}
                          <div className="pl-6 relative">
                            {/* Dotted path line */}
                            <div className="absolute left-[7px] top-2 bottom-2 w-[1px] border-l border-dashed border-slate-300" />

                            {/* Boarded Dot & Info */}
                            <div className="relative mb-4">
                              <div className="absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white" />
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800">Boarded</span>
                                <span className="text-xs text-slate-400 font-semibold">
                                  {getDisplayTime(ride.boarded_at)}
                                </span>
                              </div>
                            </div>

                            {/* Duration Badge */}
                            <div className="flex items-center bg-slate-50 border border-slate-200/50 rounded-xl px-2.5 py-1.5 self-start mb-4 w-fit">
                              <MaterialIcons name="schedule" size={14} color="#64748b" className="mr-1" />
                              <span className="text-[10px] font-bold text-slate-500">
                                {formatDuration(ride.boarded_at, ride.departed_at)}
                              </span>
                            </div>

                            {/* Departed Dot & Info */}
                            <div className="relative">
                              <div className="absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border border-white" />
                              <div className="flex justify-between items-center">
                                <span className="text-xs font-bold text-slate-800">Departed</span>
                                <span className="text-xs text-slate-400 font-semibold">
                                  {getDisplayTime(ride.departed_at)}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            )}
          </div>
        </div>
      </div>

      <PassengerFooter activeTab="location" />
    </div>
  );
};
export default RideHistory;
