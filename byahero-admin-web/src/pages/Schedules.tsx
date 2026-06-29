import React, { useEffect, useState } from 'react';
import { Loader2, Calendar, Save, ShieldAlert, CheckCircle } from 'lucide-react';
import { adminService } from '../services/admin';

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
      
      if (data.success && data.schedules) {
        data.schedules.forEach((sch: any) => {
          // Helper to convert time format to standard AM/PM if raw 24h
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
      alert('Failed to load schedules from the server.');
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

      if (data.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 3000);
      } else {
        alert(data.message || 'Failed to update schedules.');
      }
    } catch (err) {
      console.error(err);
      alert('Network error occurred while saving schedules.');
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
      <div className="card" style={{ flex: 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h3 className="card-title" style={{ border: 'none', padding: 0, margin: 0 }}>{title}</h3>
          
          {/* Suspension Checkbox Toggle */}
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.85rem', fontWeight: 600 }}>
            <input 
              type="checkbox" 
              checked={data.is_suspended}
              onChange={(e) => setter({ ...data, is_suspended: e.target.checked })}
              style={{
                width: '18px',
                height: '18px',
                accentColor: 'var(--error)',
                cursor: 'pointer'
              }}
            />
            <span style={{ color: data.is_suspended ? 'var(--error)' : 'var(--text-main)' }}>
              Suspend Route
            </span>
          </label>
        </div>

        {data.is_suspended && (
          <div style={{
            display: 'flex', gap: '8px', alignItems: 'center',
            backgroundColor: 'var(--error-light)', color: 'var(--error)',
            padding: '10px 14px', borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem', fontWeight: 600, marginBottom: '16px'
          }}>
            <ShieldAlert size={16} />
            <span>This route operations are currently suspended. Passengers will be notified.</span>
          </div>
        )}

        <div className="form-row">
          <div className="form-group">
            <label className="form-label">Opening Time</label>
            <select 
              className="form-input" 
              value={data.time_open} 
              onChange={(e) => setter({ ...data, time_open: e.target.value })}
            >
              {TIME_OPTIONS.map((time, idx) => (
                <option key={idx} value={time}>{time}</option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Closing Time</label>
            <select 
              className="form-input" 
              value={data.time_close} 
              onChange={(e) => setter({ ...data, time_close: e.target.value })}
            >
              {TIME_OPTIONS.map((time, idx) => (
                <option key={idx} value={time}>{time}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="form-group" style={{ marginTop: '8px' }}>
          <label className="form-label">Suspension Message (If Suspended)</label>
          <textarea 
            className="form-input" 
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
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      <div className="page-header-actions">
        <h2 className="page-title">Operations schedules & suspensions</h2>
      </div>

      {loading ? (
        <div className="card" style={{ display: 'flex', justifyContent: 'center', padding: '60px' }}>
          <Loader2 className="animate-spin" size={32} color="var(--primary-color)" />
        </div>
      ) : (
        <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {savedSuccess && (
            <div style={{
              display: 'flex', gap: '8px', alignItems: 'center',
              backgroundColor: 'var(--success-light)', color: 'var(--success)',
              padding: '12px 16px', borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem', fontWeight: 600, border: '1px solid rgba(16, 185, 129, 0.15)'
            }}>
              <CheckCircle size={18} />
              <span>Operating route schedules updated successfully!</span>
            </div>
          )}

          <div style={{ display: 'flex', gap: '24px', flexWrap: 'wrap' }}>
            {renderScheduleCard('Laurel - Tanauan Route', ltSchedule, setLtSchedule)}
            {renderScheduleCard('Tanauan - Laurel Route', tlSchedule, setTlSchedule)}
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
            <button type="submit" className="btn btn-primary" style={{ padding: '12px 24px', minWidth: '160px' }} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 size={16} className="animate-spin" style={{ marginRight: '6px' }} />
                  Saving schedules...
                </>
              ) : (
                <>
                  <Save size={16} style={{ marginRight: '6px' }} />
                  Save Settings
                </>
              )}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
