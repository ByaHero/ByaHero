import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { apiRequest } from '../services/api';
import busIcon from '../../assets/images/busonallbuses.svg';

interface ActiveBus {
  Bus_ID: number;
  code: string;
  status: string;
  conductor_email: string;
}

export default function ActiveBuses() {
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchActiveBuses = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/active-buses');
      if (data.success && data.activeBuses) {
        setBuses(data.activeBuses);
      } else {
        setBuses([]);
      }
    } catch (error) {
      console.error('Error fetching active buses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveBuses();
  }, [fetchActiveBuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveBuses();
  };

  return (
    <div className="p-4 pt-6 max-w-4xl mx-auto w-full pb-16 font-sans">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight mb-1">Active Buses</h1>
          <div className="flex items-center">
            <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mr-2 animate-pulse" />
            <span className="text-blue-500 text-[10px] uppercase font-bold tracking-wider">Live Updates</span>
          </div>
        </div>
        <button 
          onClick={onRefresh}
          className={`p-2 rounded-full bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors ${refreshing ? 'opacity-50' : ''}`}
          disabled={refreshing}
        >
          <RefreshCw size={20} className={`text-[#0f3878] ${refreshing ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {loading && !refreshing ? (
        <div className="flex justify-center mt-10">
          <Loader2 size={32} className="text-[#0f3878] animate-spin" />
        </div>
      ) : buses.length > 0 ? (
        <div className="space-y-4">
          {buses.map((bus) => {
            const isUnavailable = bus.status?.toLowerCase() === 'unavailable';
            return (
              <div key={bus.Bus_ID} className="bg-white rounded-2xl p-4 pb-5 shadow-sm border border-slate-100 flex items-center hover:shadow-md transition-shadow">
                <div className="w-[80px] flex justify-center items-center shrink-0 pr-2">
                  <img src={busIcon} alt="Bus" className="w-[50px] h-[50px] object-contain" />
                </div>
                <div className="flex-1">
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-[12px]">Code</span>
                    <span className="text-slate-800 font-bold text-[14px]">{bus.code}</span>
                  </div>

                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-[12px]">Status</span>
                    <div className={`${isUnavailable ? 'bg-[#ffccd5]' : 'bg-green-100'} px-3 py-1 rounded-full`}>
                      <span className={`${isUnavailable ? 'text-[#c1121f]' : 'text-green-700'} text-[10px] font-bold uppercase tracking-wider`}>
                        {bus.status || 'AVAILABLE'}
                      </span>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-slate-500 text-[12px]">Conductor</span>
                    <span className="text-slate-600 text-[13px] font-medium truncate max-w-[200px]" title={bus.conductor_email || 'N/A'}>
                      {bus.conductor_email || 'N/A'}
                    </span>
                  </div>

                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
          <span className="text-slate-500 font-medium">No active buses right now.</span>
        </div>
      )}

    </div>
  );
}
