import React, { useEffect, useState, useMemo } from 'react';
import { Loader2, Users, RefreshCw, XCircle, MapPin, Filter } from 'lucide-react';
import { adminService } from '../services/admin';
import { WaitingPassenger } from '../types';

export default function WaitingPassengers() {
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');

  const fetchPassengers = async () => {
    try {
      const data = await adminService.listWaitingPassengers();
      if (data && data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (e) {
      console.error(e);
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

  const handleDismissLocation = async (location: string) => {
    if (!window.confirm(`Dismiss all waiting passenger signals for ${location}?`)) return;
    try {
      setRefreshing(true);
      const data = await adminService.manageWaitingPassengers({
        action: 'cancel_location',
        location
      });
      if (data && data.success) {
        fetchPassengers();
      } else {
        alert(data?.error || 'Failed to dismiss signals.');
      }
    } catch (e) {
      alert('Network error while dismissing signals.');
    } finally {
      setRefreshing(false);
    }
  };

  // Grouping / Location Counts
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    waitingList.forEach(wp => {
      counts[wp.location_name] = (counts[wp.location_name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [waitingList]);

  // Unique list of locations for filtering dropdown
  const uniqueLocations = useMemo(() => {
    const locations = new Set<string>();
    waitingList.forEach(wp => locations.add(wp.location_name));
    return ['All Stop Locations', ...Array.from(locations)];
  }, [waitingList]);

  // Filtered List
  const filteredList = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return waitingList;
    return waitingList.filter(wp => wp.location_name === filterLocation);
  }, [waitingList, filterLocation]);

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
                <span>Live Signal</span>
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

        {/* Busiest Locations Section */}
        <div className="mt-5 pt-4 border-t border-slate-100">
          <span className="text-[11px] font-bold uppercase text-slate-500 tracking-wider block mb-2">Busiest Passenger Terminals</span>
          {locationCounts.length === 0 ? (
            <p className="text-xs text-slate-400 italic">No active passenger queue signals.</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {locationCounts.slice(0, 5).map(([location, count], idx) => (
                <div key={idx} className="inline-flex items-center gap-2 bg-blue-50 text-blue-700 border border-blue-200/70 py-1.5 px-3 rounded-full text-xs font-bold">
                  <MapPin size={12} className="text-blue-600" />
                  <span>{location.split(',')[0]}: <strong>{count}</strong> waiting</span>
                  <button 
                    onClick={() => handleDismissLocation(location)}
                    className="text-red-500 hover:text-red-700 transition cursor-pointer p-0.5"
                    title="Dismiss entire queue"
                  >
                    <XCircle size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Directory and filtering */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex flex-wrap justify-between items-center gap-4 mb-6">
          <div>
            <h2 className="text-xl font-black text-slate-800 tracking-tight">Waiting Passengers Directory</h2>
            <p className="text-xs text-slate-500 font-medium mt-1">Live passenger density reports categorized by terminal pickup points.</p>
          </div>
          
          {/* Filtering Dropdown */}
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-slate-400" />
            <select 
              className="py-2 px-3.5 rounded-xl border border-slate-200 text-xs font-semibold bg-slate-50 text-slate-700 focus:outline-none focus:border-[#4C85C5] focus:bg-white min-w-[200px]" 
              value={filterLocation}
              onChange={(e) => setFilterLocation(e.target.value)}
            >
              {uniqueLocations.map((loc, idx) => (
                <option key={idx} value={loc}>{loc}</option>
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
            <p className="text-xs font-semibold">No waiting passenger reports match the selected filters.</p>
          </div>
        ) : (
          <div className="w-full overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full border-collapse text-left text-xs">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4">Passenger</th>
                  <th className="py-3.5 px-4">Location / Terminal</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4">Signal Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredList.map((wp) => (
                  <tr key={wp.id} className="hover:bg-slate-50/70 transition">
                    <td className="py-3.5 px-4">
                      <div className="flex flex-col">
                        <span className="font-bold text-slate-900">{wp.registered_name || wp.user_name || 'Passenger'}</span>
                        <span className="text-[11px] text-slate-400 font-medium">{wp.registered_email || 'No email info'}</span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-semibold text-slate-800">
                      {wp.location_name}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center py-1 px-2.5 rounded-full text-[10px] font-extrabold uppercase tracking-wider bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {wp.status || 'waiting'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-500 font-medium">
                      {wp.created_at ? new Date(wp.created_at).toLocaleString() : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
