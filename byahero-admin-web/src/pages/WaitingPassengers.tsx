import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Users, RefreshCw, XCircle, MapPin, Filter, Clock } from 'lucide-react';
import { adminService } from '../services/admin';
import { WaitingPassenger } from '../types';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

export default function WaitingPassengers() {
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');
  const [dismissingLoc, setDismissingLoc] = useState<string | null>(null);
  const { alertConfig, showAlert, showConfirm } = useAlertModal();

  const fetchPassengers = async () => {
    try {
      const data = await adminService.listWaitingPassengers();
      if (data && data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (e) {
      console.error('Error fetching waiting passengers:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchPassengers();
  }, []);

  // Auto-refresh countdown timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchPassengers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(30);
    fetchPassengers();
  };

  const handleDismissLocation = (location: string) => {
    showConfirm(
      'Dismiss Queue Signals',
      `Are you sure you want to dismiss all waiting passenger signals for ${location}? This will clear the active queue.`,
      async () => {
        setDismissingLoc(location);
        try {
          const data = await adminService.manageWaitingPassengers({
            action: 'cancel_location',
            location,
          });
          if (data && data.success) {
            showAlert('Success', `Dismissed queue signals for ${location}.`, 'success');
            fetchPassengers();
          } else {
            showAlert('Error', data?.error || 'Failed to dismiss signals.', 'error');
          }
        } catch (e: any) {
          showAlert('Error', e?.message || 'Network error while dismissing signals.', 'error');
        } finally {
          setDismissingLoc(null);
        }
      }
    );
  };

  // Grouping by Location with Earliest Expiry
  const locationGroups = useMemo(() => {
    const groups: Record<string, { count: number; earliestExpiry: string | null }> = {};
    waitingList.forEach((wp) => {
      const loc = wp.location_name || 'Unknown Location';
      if (!groups[loc]) {
        groups[loc] = { count: 0, earliestExpiry: null };
      }
      groups[loc].count += 1;
      if (wp.expires_at) {
        if (!groups[loc].earliestExpiry || wp.expires_at < groups[loc].earliestExpiry!) {
          groups[loc].earliestExpiry = wp.expires_at;
        }
      }
    });

    return Object.entries(groups)
      .map(([loc, data]) => ({ loc, count: data.count, earliestExpiry: data.earliestExpiry }))
      .sort((a, b) => b.count - a.count);
  }, [waitingList]);

  // Unique list of locations for filtering
  const uniqueLocations = useMemo(() => {
    return ['All Stop Locations', ...locationGroups.map((g) => g.loc)];
  }, [locationGroups]);

  // Filtered List
  const filteredList = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return waitingList;
    return waitingList.filter((wp) => wp.location_name === filterLocation);
  }, [waitingList, filterLocation]);

  const formatExpiryTime = (expiryDateStr: string | null) => {
    if (!expiryDateStr) return null;
    const ms = new Date(expiryDateStr).getTime() - Date.now();
    if (ms <= 0) return 'Expiring now';
    const m = Math.floor(ms / 60000);
    const s = Math.floor((ms % 60000) / 1000);
    return `Expires in ${m}m ${s}s`;
  };

  return (
    <div className="space-y-6">
      {/* Top Stats Overview Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">Total Waiting Passengers</span>
            <div className="flex items-center gap-3 mt-1.5">
              <span className="text-4xl font-black text-slate-900 leading-none">
                {waitingList.length}
              </span>
              <span className="inline-flex items-center gap-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full text-xs font-extrabold uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                <span>Live Active Signals</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="bg-slate-50 border border-slate-200 py-2 px-3.5 rounded-xl text-xs font-semibold text-slate-600">
              Auto-refresh in: <strong className="text-slate-900">{countdown}s</strong>
            </div>
            <button
              className="inline-flex items-center gap-2 py-2 px-4 rounded-xl text-xs font-bold bg-[#0f3878] hover:bg-[#0a2958] text-white transition shadow-sm cursor-pointer disabled:opacity-60"
              onClick={handleManualRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={14} className={refreshing ? 'animate-spin' : ''} />
              Sync Now
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden mt-5">
          <div
            className="h-full bg-[#4C85C5] transition-all duration-1000 ease-linear"
            style={{ width: `${((30 - countdown) / 30) * 100}%` }}
          ></div>
        </div>

        {/* Active Locations Overview */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <div className="flex justify-between items-center mb-3">
            <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider">
              Terminal Passenger Density ({locationGroups.length} Active Hotspots)
            </span>
          </div>

          {locationGroups.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No active passenger queue signals registered right now.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {locationGroups.map(({ loc, count, earliestExpiry }, idx) => {
                const expiry = formatExpiryTime(earliestExpiry);
                const isSelected = filterLocation === loc;

                return (
                  <div
                    key={idx}
                    className={`border rounded-2xl p-4 transition-all ${
                      isSelected
                        ? 'border-[#0f3878] bg-blue-50/50 shadow-xs ring-1 ring-[#0f3878]'
                        : 'border-slate-200 bg-white hover:border-slate-300 shadow-xs'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <MapPin size={16} className="text-[#0f3878] shrink-0" />
                        <span className="font-bold text-slate-900 text-xs truncate" title={loc}>
                          {loc}
                        </span>
                      </div>
                      <button
                        onClick={() => handleDismissLocation(loc)}
                        disabled={dismissingLoc === loc}
                        className="text-red-500 hover:text-red-700 transition cursor-pointer p-1 shrink-0 disabled:opacity-50"
                        title="Dismiss all signals for this location"
                      >
                        {dismissingLoc === loc ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={15} />}
                      </button>
                    </div>

                    <div className="flex items-baseline justify-between mt-3">
                      <div className="flex items-baseline gap-1.5">
                        <span className="text-2xl font-black text-[#0f3878]">{count}</span>
                        <span className="text-xs text-slate-500 font-medium">waiting</span>
                      </div>

                      {expiry && (
                        <div className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 border border-amber-200/60 px-2 py-0.5 rounded-full text-[10px] font-semibold">
                          <Clock size={10} />
                          <span>{expiry}</span>
                        </div>
                      )}
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                      <button
                        type="button"
                        onClick={() => setFilterLocation(isSelected ? 'All Stop Locations' : loc)}
                        className="text-blue-600 hover:underline font-semibold cursor-pointer"
                      >
                        {isSelected ? 'Show All' : 'Filter by this stop'}
                      </button>
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px]">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                        Active
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Directory and filtering */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
        <div className="flex flex-wrap justify-between items-center gap-4">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Waiting Passengers Directory</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">
              Real-time commuter telemetry logs sorted by terminal pickup stop.
            </p>
          </div>

          {/* Filtering Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select
              className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-[#4C85C5] focus:bg-white min-w-[220px]"
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              {uniqueLocations.map((loc, idx) => (
                <option key={idx} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading && !refreshing ? (
          <div className="flex justify-center py-16">
            <Loader2 className="animate-spin text-[#0f3878]" size={32} />
          </div>
        ) : filteredList.length === 0 ? (
          <div className="text-center py-12 px-4 text-slate-500 bg-slate-50/50 rounded-2xl border border-dashed border-slate-300">
            <Users size={48} className="mx-auto mb-3 text-slate-300" />
            <p className="text-xs font-semibold">No waiting passenger reports match the selected filter.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Pickup Location / Terminal</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Signal Sent</th>
                  <th className="py-3.5 px-4">Signal Expiry</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((wp) => (
                  <tr key={wp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{wp.registered_name || wp.user_name || 'Passenger'}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{wp.registered_email || 'Anonymous Commuter'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      <div className="flex items-center gap-1.5">
                        <MapPin size={13} className="text-[#0f3878]" />
                        <span>{wp.location_name}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {wp.status || 'waiting'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {wp.created_at ? new Date(wp.created_at).toLocaleString() : 'N/A'}
                    </td>
                    <td className="py-3.5 px-4">
                      {wp.expires_at ? (
                        <span className="text-[11px] font-semibold text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/50">
                          {formatExpiryTime(wp.expires_at) || new Date(wp.expires_at).toLocaleTimeString()}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-xs">Standard (30m)</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <AlertModal
        isOpen={alertConfig.isOpen}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </div>
  );
}
