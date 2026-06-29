import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, RefreshCw, Clock, MapPin, XCircle, Search, Bus, CheckCircle, ChevronDown, X } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface WaitingPassenger {
  id: number;
  user_id: number;
  user_name: string;
  location_name: string;
  created_at: string;
  status: string;
  registered_name: string;
  registered_email: string;
}

const LOCATION_WHITELIST = [
  "All Stop Locations",
  "J. Leviste, Laurel", "Sampaloc, Talisay", "Caloocan, Talisay", "Buco, Talisay",
  "Balas, Talisay", "Ambulong, Tanauan", "Banadero, Tanauan", "Talaga, Tanauan",
  "Sambat, Tanauan", "Tanauan", "Sto. Tomas", "Bugaan West, Laurel", "Laurel",
  "Balakilong, Laurel", "Berinayan, Laurel", "Leynes, Talisay", "Santa Maria, Talisay",
  "Banga, Talisay", "Talisay", "Tumaway, Talisay", "Quiling, Talisay", "Aya, Talisay",
  "Santor, Tanauan", "Bugaan East, Laurel", "Looc, Calamba", "San Isidro"
];

export default function WaitingPassengers() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [countdown, setCountdown] = useState(30);
  
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  // Custom Modal States
  const [cancelConfirmModal, setCancelConfirmModal] = useState({ isOpen: false, location: '' });
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const fetchWaitingPassengers = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/waiting-passengers');
      if (data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (error) {
      console.error('Error fetching waiting passengers:', error);
      setErrorModal({ isOpen: true, message: 'Failed to load waiting passengers from the server.' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitingPassengers();
  }, [fetchWaitingPassengers]);

  // Auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchWaitingPassengers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchWaitingPassengers]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(30);
    fetchWaitingPassengers();
  };

  const executeCancel = async (location: string) => {
    try {
      const data = await apiRequest('/api/admin/waiting-passengers', {
        method: 'POST',
        body: JSON.stringify({ action: 'cancel_location', location })
      });
      if (data.success) {
        setCancelConfirmModal({ isOpen: false, location: '' });
        fetchWaitingPassengers();
      } else {
        setErrorModal({ isOpen: true, message: data.error || 'Failed to cancel signals.' });
      }
    } catch (error) {
      console.error('Error cancelling signals:', error);
      setErrorModal({ isOpen: true, message: 'Network error while cancelling signals.' });
    }
  };

  const handleCancelClick = (location: string) => {
    setCancelConfirmModal({ isOpen: true, location });
  };

  // Aggregation
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    waitingList.forEach(wp => {
      counts[wp.location_name] = (counts[wp.location_name] || 0) + 1;
    });
    // Sort descending
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [waitingList]);

  // Filtering
  const filteredLocationCounts = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return locationCounts;
    return locationCounts.filter(([loc]) => loc === filterLocation);
  }, [locationCounts, filterLocation]);

  const totalWaiting = waitingList.length;

  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto w-full pb-16 font-sans relative bg-slate-50 min-h-screen">
      
      <h1 className="text-[#0f3878] text-[17px] font-extrabold tracking-wide mb-5 ml-1 mt-2">
        Waiting Passengers
      </h1>

      {loading && !refreshing ? (
        <div className="flex justify-center mt-10">
          <RefreshCw size={32} className="text-[#0f3878] animate-spin" />
        </div>
      ) : (
        <>
          {/* Top Stats Card */}
          <div className="bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-100">
            <div className="mb-4 pb-4 border-b border-slate-100 flex items-center justify-between">
              <div>
                <h2 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1">Total Waiting</h2>
                <div className="flex items-center">
                  <span className="text-3xl font-extrabold text-slate-900 mr-3">{totalWaiting}</span>
                  <div className="bg-green-100 px-3 py-1 rounded-full flex items-center border border-green-200">
                    <div className="w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5 animate-pulse" />
                    <span className="text-green-700 text-[11px] font-bold tracking-wider">ACTIVE</span>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <h2 className="text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2">Busiest Locations</h2>
              {locationCounts.length === 0 ? (
                <p className="text-slate-400 text-[13px]">No passenger waiting signals registered right now.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {locationCounts.slice(0, 4).map(([loc, count], idx) => {
                    const shortLoc = loc.split(',')[0];
                    return (
                      <div key={idx} className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex items-center shadow-sm">
                        <Bus size={14} className="text-[#1d4ed8] mr-1.5" />
                        <span className="text-slate-800 text-[12px]"><strong className="font-bold">{shortLoc}:</strong> {count} waiting</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Main Interactive Card */}
          <div className="bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-8">
            {/* Header */}
            <div className="p-4 border-b border-slate-100">
              <div className="flex items-center mb-4">
                <Users size={24} className="text-[#1d4ed8] mr-2" />
                <h2 className="text-[18px] font-bold text-[#1d4ed8]">Waiting Passengers Directory</h2>
              </div>
              
              <div className="flex justify-between items-center">
                <button 
                  className={`border border-slate-200 bg-white rounded-full px-4 py-1.5 flex items-center hover:bg-slate-50 transition-colors shadow-sm ${refreshing ? 'opacity-70 cursor-not-allowed' : ''}`}
                  onClick={handleManualRefresh}
                  disabled={refreshing}
                >
                  <RefreshCw size={14} className={`text-slate-500 mr-1.5 ${refreshing ? 'animate-spin' : ''}`} />
                  <span className="text-slate-600 text-[12px] font-bold">Refresh Now</span>
                </button>

                <div className="bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex items-center shadow-sm">
                  <Clock size={14} className="text-slate-500 mr-1.5" />
                  <span className="text-slate-600 text-[12px]">Auto-refresh: <strong className="font-bold">{countdown}s</strong></span>
                </div>
              </div>
            </div>

            {/* Progress bar */}
            <div className="w-full h-1 bg-slate-100 overflow-hidden">
              <div 
                className="h-full bg-[#1d4ed8] transition-all duration-1000 ease-linear" 
                style={{ width: `${((30 - countdown) / 30) * 100}%` }} 
              />
            </div>

            <div className="p-5">
              {/* Filter */}
              <button 
                className="w-full border border-slate-200 rounded-xl px-4 py-3 flex justify-between items-center bg-slate-50 hover:bg-slate-100 transition-colors mb-6 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                onClick={() => setFilterModalVisible(true)}
              >
                <span className={`text-[14px] ${filterLocation !== 'All Stop Locations' ? 'font-bold text-[#1d4ed8]' : 'text-slate-800'}`}>
                  {filterLocation}
                </span>
                <ChevronDown size={18} className="text-slate-500" />
              </button>

              {/* List */}
              {waitingList.length === 0 ? (
                <div className="flex flex-col items-center py-10">
                  <Users size={64} className="text-slate-200 mb-3" />
                  <h3 className="text-[16px] font-bold text-slate-500 mb-2">No Waiting Signals Registered</h3>
                  <p className="text-slate-400 text-center text-[13px] px-4 max-w-sm">There are currently no passengers active at any of the ByaHero transit stops. Real-time updates will dynamically populate here when they signal.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredLocationCounts.map(([locName, count], idx) => (
                    <div key={idx} className="border border-slate-200 rounded-2xl bg-white p-5 shadow-sm hover:shadow-md transition-shadow">
                      <div className="flex justify-between items-start border-b border-slate-100 pb-3 mb-4">
                        <div className="flex items-start flex-1 pr-3">
                          <MapPin size={18} className="text-[#1d4ed8] mr-2 mt-0.5 shrink-0" />
                          <h3 className="font-bold text-[#1d4ed8] text-[15px] uppercase leading-tight">{locName}</h3>
                        </div>
                        <div className="flex items-center bg-green-50 px-2.5 py-1 rounded-full border border-green-100 shrink-0">
                          <div className="w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5 animate-pulse" />
                          <span className="text-green-700 text-[10px] font-bold tracking-wider">ACTIVE</span>
                        </div>
                      </div>
                      
                      <div className="mb-5">
                        <h4 className="text-slate-500 font-bold text-[11px] uppercase tracking-wider mb-2">Passengers Waiting</h4>
                        <div className="bg-blue-50/50 rounded-xl p-4 border border-blue-100 flex items-baseline">
                          <span className="font-extrabold text-[28px] text-[#1d4ed8] mr-2">{count}</span>
                          <span className="text-[#1d4ed8] font-medium">passenger{count !== 1 ? 's' : ''}</span>
                        </div>
                      </div>

                      <div className="flex justify-end">
                        <button 
                          className="bg-red-50 hover:bg-red-100 text-red-600 rounded-full px-5 py-2.5 flex items-center transition-colors shadow-sm"
                          onClick={() => handleCancelClick(locName)}
                        >
                          <XCircle size={16} className="mr-1.5" />
                          <span className="text-[12px] font-bold">Dismiss Signals</span>
                        </button>
                      </div>
                    </div>
                  ))}

                  {filteredLocationCounts.length === 0 && (
                    <div className="flex flex-col items-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300">
                      <Search size={48} className="text-slate-300 mb-3" />
                      <h3 className="font-bold text-slate-500 mb-1">No Matching Waiting Passengers</h3>
                      <p className="text-slate-400 text-[13px]">Try adjusting your filters to see active locations.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Filter Modal using generic Modal component approach but customized for full list */}
      {filterModalVisible && (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={() => setFilterModalVisible(false)} />
          
          <div className="bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-w-md relative z-10 max-h-[85vh] flex flex-col animate-in slide-in-from-bottom sm:zoom-in-95 duration-300">
            <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50 sm:rounded-t-3xl">
              <h3 className="text-slate-900 font-extrabold text-[16px]">Filter Location</h3>
              <button onClick={() => setFilterModalVisible(false)} className="text-slate-400 hover:text-slate-700 bg-white hover:bg-slate-100 rounded-full p-1.5 transition-colors shadow-sm">
                <X size={20} />
              </button>
            </div>
            
            <div className="overflow-y-auto p-2">
              {LOCATION_WHITELIST.map((loc, idx) => {
                const count = loc === 'All Stop Locations' 
                  ? totalWaiting 
                  : (locationCounts.find(([l]) => l === loc)?.[1] || 0);
                  
                const isSelected = filterLocation === loc;
                  
                return (
                  <button 
                    key={idx} 
                    className={`w-full text-left px-5 py-4 border-b border-slate-50 flex justify-between items-center transition-colors hover:bg-slate-50 ${isSelected ? 'bg-blue-50/50' : ''}`}
                    onClick={() => {
                      setFilterLocation(loc);
                      setFilterModalVisible(false);
                    }}
                  >
                    <span className={`text-[15px] ${isSelected ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>
                      {loc} {count > 0 && loc !== 'All Stop Locations' ? <span className="text-slate-400 font-normal ml-1">({count} waiting)</span> : null}
                    </span>
                    {isSelected && <CheckCircle size={20} className="text-[#1d4ed8]" />}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Confirmation and Error Modals */}
      <Modal
        isOpen={cancelConfirmModal.isOpen}
        onClose={() => setCancelConfirmModal({ isOpen: false, location: '' })}
        title="Dismiss Signals"
        type="warning"
        secondaryAction={{
          label: 'Cancel',
          onClick: () => setCancelConfirmModal({ isOpen: false, location: '' })
        }}
        primaryAction={{
          label: 'Yes, dismiss them',
          danger: true,
          onClick: () => executeCancel(cancelConfirmModal.location)
        }}
      >
        <p>Are you sure you want to dismiss all waiting signals for <strong className="text-slate-800">{cancelConfirmModal.location}</strong>?</p>
        <p className="mt-2 text-sm text-amber-600 font-medium">This will clear the queue and passengers will need to re-signal.</p>
      </Modal>

      <Modal
        isOpen={errorModal.isOpen}
        onClose={() => setErrorModal({ isOpen: false, message: '' })}
        title="Action Failed"
        type="error"
        primaryAction={{
          label: 'Okay',
          onClick: () => setErrorModal({ isOpen: false, message: '' })
        }}
      >
        <p>{errorModal.message}</p>
      </Modal>

    </div>
  );
}
