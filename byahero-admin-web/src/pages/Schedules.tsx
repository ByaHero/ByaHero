import React, { useEffect, useState } from 'react';
import { Loader2, Save, ShieldAlert, CheckCircle } from 'lucide-react';
import { adminService } from '../services/admin';
import AlertModal from '../components/AlertModal';
import { useAlertModal } from '../hooks/useAlertModal';

interface RouteSchedule {
  time_open: string;
  time_close: string;
  is_suspended: boolean;
  suspend_message: string;
}

// Generate 30-minute interval times matching the mobile app
const generateTimeOptions = () => {
  const formattedTimes: string[] = [];
  
  // Morning times (12:00 AM to 11:30 AM)
  formattedTimes.push('12:00 AM', '12:30 AM');
  for (let h = 1; h <= 11; h++) {
    const hourStr = h < 10 ? `0${h}` : h;
    formattedTimes.push(`${hourStr}:00 AM`, `${hourStr}:30 AM`);
  }

  // Afternoon times (12:00 PM to 11:30 PM)
  formattedTimes.push('12:00 PM', '12:30 PM');
  for (let h = 1; h <= 11; h++) {
    const hourStr = h < 10 ? `0${h}` : h;
    formattedTimes.push(`${hourStr}:00 PM`, `${hourStr}:30 PM`);
  }
  
  return formattedTimes;
};

const TIME_OPTIONS = generateTimeOptions();

export default function Schedules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const { alertConfig, showAlert } = useAlertModal();

  const [ltSchedule, setLtSchedule] = useState<RouteSchedule>({
    time_open: '04:00 AM',
    time_close: '08:00 PM',
    is_suspended: false,
    suspend_message: ''
  });

  const [tlSchedule, setTlSchedule] = useState<RouteSchedule>({
    time_open: '05:00 AM',
    time_close: '10:00 PM',
    is_suspended: false,
    suspend_message: ''
  });

  const fetchSchedules = async () => {
    try {
      setLoading(true);
      const data = await adminService.listSchedules();
      
      if (data && data.success && data.schedules) {
        data.schedules.forEach((sch: any) => {
          const formatTime = (timeStr: string) => {
            if (!timeStr) return '';
            if (timeStr.includes('AM') || timeStr.includes('PM')) return timeStr;
            const parts = timeStr.split(':');
            if (parts.length < 2) return timeStr;
            const [h, m] = parts;
            let hour = parseInt(h, 10);
            const ampm = hour >= 12 ? 'PM' : 'AM';
            hour = hour % 12;
            hour = hour ? hour : 12;
            const hourStr = hour < 10 ? `0${hour}` : hour;
            return `${hourStr}:${m} ${ampm}`;
          };

          const mappedData = {
            time_open: formatTime(sch.time_open) || '05:00 AM',
            time_close: formatTime(sch.time_close) || '09:00 PM',
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
    } catch (e) {
      console.error(e);
      showAlert('Error', 'Failed to load schedules from the server.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSchedules();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setSavedSuccess(false);

    try {
      const data = await adminService.saveRoutes({
        lt_open: ltSchedule.time_open,
        lt_close: ltSchedule.time_close,
        lt_suspended: ltSchedule.is_suspended,
        lt_message: ltSchedule.suspend_message,
        tl_open: tlSchedule.time_open,
        tl_close: tlSchedule.time_close,
        tl_suspended: tlSchedule.is_suspended,
        tl_message: tlSchedule.suspend_message
      });

      if (data && data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data?.message || 'Failed to update schedules.');
      }
    } catch (err) {
      console.error(err);
      showAlert('Network Error', 'Network error occurred while saving schedules.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const renderScheduleCard = (
    title: string,
    data: RouteSchedule,
    setter: React.Dispatch<React.SetStateAction<RouteSchedule>>
  ) => {
    return (
      <div className="flex-1 min-w-[320px] bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <div className="flex justify-between items-center mb-5 pb-3 border-b border-slate-100">
          <h3 className="text-base font-extrabold text-slate-800 tracking-tight">{title}</h3>
          
          {/* Suspension Checkbox Toggle */}
          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold">
            <input 
              type="checkbox" 
              checked={data.is_suspended}
              onChange={(e) => setter({ ...data, is_suspended: e.target.checked })}
              className="w-4 h-4 accent-red-600 rounded cursor-pointer"
            />
            <span className={data.is_suspended ? 'text-red-600' : 'text-slate-700'}>
              Suspend Route
            </span>
          </label>
        </div>

        {data.is_suspended && (
          <div className="flex items-center gap-2 bg-red-50 text-red-700 p-3 rounded-xl text-xs font-bold mb-4 border border-red-200/80">
            <ShieldAlert size={16} className="shrink-0" />
            <span>This route is currently suspended. Passengers will be alerted in real-time.</span>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Opening Time</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={data.time_open} 
              onChange={(e) => setter({ ...data, time_open: e.target.value })}
            >
              {TIME_OPTIONS.map((time, idx) => (
                <option key={idx} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Closing Time</label>
            <select 
              className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20" 
              value={data.time_close} 
              onChange={(e) => setter({ ...data, time_close: e.target.value })}
            >
              {TIME_OPTIONS.map((time, idx) => (
                <option key={idx} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] font-bold uppercase text-slate-600 tracking-wider">Suspension Broadcast Reason</label>
          <textarea 
            className="w-full py-2.5 px-3.5 rounded-xl border border-slate-200 text-xs bg-slate-50 focus:outline-none focus:border-[#4C85C5] focus:bg-white focus:ring-2 focus:ring-[#4C85C5]/20 disabled:opacity-50 disabled:cursor-not-allowed" 
            rows={3} 
            placeholder="e.g. Operation suspended due to heavy rain and road blockage." 
            value={data.suspend_message}
            onChange={(e) => setter({ ...data, suspend_message: e.target.value })}
            disabled={!data.is_suspended}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
        <h2 className="text-xl font-black text-slate-800 tracking-tight">Operations Schedules & Suspensions</h2>
        <p className="text-xs text-slate-500 font-medium mt-1">Configure operating operational hours, service alerts, and route suspensions.</p>
      </div>

      {loading ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-16 flex justify-center shadow-sm">
          <Loader2 className="animate-spin text-[#0f3878]" size={36} />
        </div>
      ) : (
        <form onSubmit={handleSave} className="space-y-6">
          {savedSuccess && (
            <div className="flex items-center gap-2.5 bg-emerald-50 text-emerald-700 p-4 rounded-2xl text-xs font-bold border border-emerald-200 shadow-sm animate-modal-enter">
              <CheckCircle size={18} />
              <span>Operating route schedules updated successfully!</span>
            </div>
          )}

          <div className="flex flex-wrap gap-6">
            {renderScheduleCard('Laurel - Tanauan Route', ltSchedule, setLtSchedule)}
            {renderScheduleCard('Tanauan - Laurel Route', tlSchedule, setTlSchedule)}
          </div>

          <div className="flex justify-end">
            <button 
              type="submit" 
              className="inline-flex items-center justify-center gap-2 py-3 px-6 rounded-xl text-xs font-extrabold text-white bg-[#0f3878] hover:bg-[#0a2958] transition shadow-md cursor-pointer disabled:opacity-60 min-w-[160px]" 
              disabled={saving}
            >
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Saving schedules...
                </>
              ) : (
                <>
                  <Save size={16} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}
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
