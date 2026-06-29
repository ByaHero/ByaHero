import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, Clock } from 'lucide-react';
import { apiRequest } from '../services/api';
import Modal from '../components/Modal';

interface ScheduleData {
  time_open: string;
  time_close: string;
  is_suspended: boolean;
  suspend_message: string;
}

// Convert "04:00 AM" to "04:00" for input[type="time"]
const toInputTime = (timeStr: string) => {
  if (!timeStr) return '';
  const match = timeStr.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!match) return timeStr;
  let [, h, m, ampm] = match;
  let hours = parseInt(h, 10);
  if (ampm.toUpperCase() === 'PM' && hours < 12) hours += 12;
  if (ampm.toUpperCase() === 'AM' && hours === 12) hours = 0;
  const hoursStr = hours < 10 ? `0${hours}` : hours.toString();
  return `${hoursStr}:${m}`;
};

// Convert "04:00" to "04:00 AM" for API
const fromInputTime = (timeStr: string) => {
  if (!timeStr) return '';
  const match = timeStr.match(/(\d+):(\d+)/);
  if (!match) return timeStr;
  let [, h, m] = match;
  let hours = parseInt(h, 10);
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  const hoursStr = hours < 10 ? `0${hours}` : hours.toString();
  return `${hoursStr}:${m} ${ampm}`;
};

export default function Schedules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ltSchedule, setLtSchedule] = useState<ScheduleData>({
    time_open: '04:00',
    time_close: '20:00',
    is_suspended: false,
    suspend_message: ''
  });

  const [tlSchedule, setTlSchedule] = useState<ScheduleData>({
    time_open: '05:00',
    time_close: '22:00',
    is_suspended: false,
    suspend_message: ''
  });

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [errorModal, setErrorModal] = useState({ isOpen: false, message: '' });

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/schedules');
      if (data.success && data.schedules) {
        data.schedules.forEach((sch: any) => {
          const mappedData = {
            time_open: toInputTime(sch.time_open) || '',
            time_close: toInputTime(sch.time_close) || '',
            is_suspended: sch.is_suspended === 1 || sch.is_suspended === true,
            suspend_message: sch.suspend_message || ''
          };
          const tName = sch.terminal_name ? sch.terminal_name.toUpperCase() : '';
          if (tName === 'LAUREL - TANAUAN') {
            setLtSchedule(mappedData);
          } else if (tName === 'TANAUAN - LAUREL') {
            setTlSchedule(mappedData);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
      setErrorModal({ isOpen: true, message: 'Failed to load schedules from the server.' });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/schedules', {
        method: 'POST',
        body: JSON.stringify({
          action: 'save_routes',
          lt_open: fromInputTime(ltSchedule.time_open),
          lt_close: fromInputTime(ltSchedule.time_close),
          lt_suspended: ltSchedule.is_suspended,
          lt_message: ltSchedule.suspend_message,
          tl_open: fromInputTime(tlSchedule.time_open),
          tl_close: fromInputTime(tlSchedule.time_close),
          tl_suspended: tlSchedule.is_suspended,
          tl_message: tlSchedule.suspend_message
        })
      });
      
      if (data.success) {
        setSuccessModalVisible(true);
      } else {
        setErrorModal({ isOpen: true, message: data.message || 'Failed to update schedules.' });
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      setErrorModal({ isOpen: true, message: 'Network error occurred while saving schedules.' });
    } finally {
      setSaving(false);
    }
  };

  const renderScheduleCard = (title: string, data: ScheduleData, setter: React.Dispatch<React.SetStateAction<ScheduleData>>) => {
    return (
      <div className="bg-white rounded-3xl p-6 mb-6 shadow-sm border border-slate-200 hover:shadow-md transition-shadow">
        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
          <h2 className="text-slate-900 font-extrabold text-[16px] uppercase tracking-wider">{title}</h2>
          
          <label className="flex items-center cursor-pointer group">
            <span className="text-slate-700 text-[13px] font-bold mr-3 group-hover:text-slate-900 transition-colors">Suspend</span>
            <div className="relative">
              <input 
                type="checkbox" 
                className="sr-only" 
                checked={data.is_suspended}
                onChange={(e) => setter({ ...data, is_suspended: e.target.checked })}
              />
              <div className={`block w-14 h-8 rounded-full transition-colors ${data.is_suspended ? 'bg-red-200' : 'bg-slate-200'}`}></div>
              <div className={`absolute left-1 top-1 bg-white w-6 h-6 rounded-full transition-transform transform ${data.is_suspended ? 'translate-x-6 bg-red-600' : 'bg-slate-400'}`}></div>
            </div>
          </label>
        </div>

        <div className="grid grid-cols-2 gap-5 mb-6">
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">OPEN</label>
            <div className="relative">
              <input 
                type="time" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 h-[46px] text-slate-900 text-[15px] font-bold bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-shadow shadow-sm cursor-pointer"
                value={data.time_open}
                onChange={(e) => setter({ ...data, time_open: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">CLOSE</label>
            <div className="relative">
              <input 
                type="time" 
                className="w-full border border-slate-300 rounded-xl px-4 py-3 h-[46px] text-slate-900 text-[15px] font-bold bg-white focus:ring-2 focus:ring-blue-500/30 outline-none transition-shadow shadow-sm cursor-pointer"
                value={data.time_close}
                onChange={(e) => setter({ ...data, time_close: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-slate-500 text-xs font-bold uppercase mb-2 tracking-wider">SUSPEND MESSAGE (OPTIONAL)</label>
          <input 
            type="text"
            className="w-full border border-slate-300 rounded-xl p-4 text-slate-900 bg-slate-50 focus:bg-white text-[15px] font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all shadow-sm"
            value={data.suspend_message}
            onChange={(e) => setter({ ...data, suspend_message: e.target.value })}
            placeholder="e.g. Suspended due to bad weather"
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-4 pt-6 max-w-3xl mx-auto w-full pb-16 font-sans bg-slate-50 min-h-screen">
      
      <div className="mb-6 flex items-center">
        <Clock size={28} className="text-[#0f3878] mr-3" />
        <h1 className="text-2xl font-extrabold text-[#0f3878] tracking-tight">Operation Schedule</h1>
      </div>

      {loading ? (
        <div className="flex justify-center mt-12">
          <Loader2 size={32} className="text-[#0f3878] animate-spin" />
        </div>
      ) : (
        <>
          {renderScheduleCard('LAUREL - TANAUAN', ltSchedule, setLtSchedule)}
          {renderScheduleCard('TANAUAN - LAUREL', tlSchedule, setTlSchedule)}
          
          <button 
            className="bg-[#1d4ed8] hover:bg-[#1e40af] mt-4 w-full py-4 rounded-full shadow-md flex justify-center items-center transition-colors disabled:opacity-70"
            onClick={handleSave}
            disabled={saving}
          >
            {saving && <Loader2 size={18} className="text-white mr-2 animate-spin" />}
            <span className="text-white font-bold text-[16px] tracking-wide">Save Schedules</span>
          </button>
        </>
      )}

      {/* Success Modal */}
      <Modal
        isOpen={successModalVisible}
        onClose={() => setSuccessModalVisible(false)}
        title="Schedule Updated!"
        type="success"
        primaryAction={{
          label: 'Okay',
          onClick: () => setSuccessModalVisible(false)
        }}
      >
        <p>The operation schedule has been successfully saved to the database and is now active.</p>
      </Modal>

      {/* Error Modal */}
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
