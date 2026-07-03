import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Switch, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';

interface ScheduleData {
  time_open: string;
  time_close: string;
  is_suspended: boolean;
  suspend_message: string;
}

// Format "HH:mm:ss" to "12:00 AM" for display
const formatTime12h = (time24: string) => {
  if (!time24) return '';
  const parts = time24.split(':');
  if (parts.length >= 2) {
    let hours = parseInt(parts[0], 10);
    const mins = parts[1];
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hoursStr = hours < 10 ? `0${hours}` : hours.toString();
    return `${hoursStr}:${mins} ${ampm}`;
  }
  return time24;
};

// Custom Modal Time Picker Component
const CustomTimePickerModal = ({ visible, onClose, value, onSelect, label }: any) => {
  const getInitialState = () => {
    let h = 12;
    let m = 0;
    let p = 'AM';
    if (value) {
      const parts = value.split(':');
      if (parts.length >= 2) {
        let hours24 = parseInt(parts[0], 10);
        m = parseInt(parts[1], 10);
        p = hours24 >= 12 ? 'PM' : 'AM';
        h = hours24 % 12;
        h = h ? h : 12;
      }
    }
    return { hour: h, minute: m, period: p };
  };

  const [hour, setHour] = useState(12);
  const [minute, setMinute] = useState(0);
  const [period, setPeriod] = useState('AM');

  useEffect(() => {
    if (visible) {
      const init = getInitialState();
      setHour(init.hour);
      setMinute(init.minute);
      setPeriod(init.period);
    }
  }, [visible, value]);

  const handleConfirm = () => {
    let h24 = hour;
    if (period === 'PM' && hour < 12) h24 += 12;
    if (period === 'AM' && hour === 12) h24 = 0;
    const hStr = h24 < 10 ? `0${h24}` : h24.toString();
    const mStr = minute < 10 ? `0${minute}` : minute.toString();
    onSelect(`${hStr}:${mStr}:00`);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <View style={tw`flex-1 bg-black/50 justify-center items-center px-4`}>
        <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] shadow-lg`}>
          <Text style={tw`text-[#0f3878] text-lg font-black text-center ${label ? 'mb-1' : 'mb-6'}`}>Set Time</Text>
          {label && (
            <Text style={tw`text-slate-500 text-[10px] font-bold text-center uppercase tracking-wider mb-6`}>
              {label}
            </Text>
          )}
          
          <View style={tw`flex-row justify-center items-center gap-3 mb-8`}>
            {/* Hour Column */}
            <View style={tw`items-center`}>
              <TouchableOpacity onPress={() => setHour(h => h === 12 ? 1 : h + 1)} style={tw`p-2 bg-slate-100 rounded-full mb-2`}>
                <Ionicons name="chevron-up" size={24} color="#0f3878" />
              </TouchableOpacity>
              <View style={tw`bg-slate-50 border border-slate-200 rounded-xl w-16 h-16 items-center justify-center`}>
                <Text style={tw`text-2xl font-black text-[#0f3878]`}>{hour < 10 ? `0${hour}` : hour}</Text>
              </View>
              <TouchableOpacity onPress={() => setHour(h => h === 1 ? 12 : h - 1)} style={tw`p-2 bg-slate-100 rounded-full mt-2`}>
                <Ionicons name="chevron-down" size={24} color="#0f3878" />
              </TouchableOpacity>
            </View>

            <Text style={tw`text-3xl font-black text-[#0f3878] pb-10`}>:</Text>

            {/* Minute Column */}
            <View style={tw`items-center`}>
              <TouchableOpacity onPress={() => setMinute(m => m >= 55 ? 0 : m + 5)} style={tw`p-2 bg-slate-100 rounded-full mb-2`}>
                <Ionicons name="chevron-up" size={24} color="#0f3878" />
              </TouchableOpacity>
              <View style={tw`bg-slate-50 border border-slate-200 rounded-xl w-16 h-16 items-center justify-center`}>
                <Text style={tw`text-2xl font-black text-[#0f3878]`}>{minute < 10 ? `0${minute}` : minute}</Text>
              </View>
              <TouchableOpacity onPress={() => setMinute(m => m <= 0 ? 55 : m - 5)} style={tw`p-2 bg-slate-100 rounded-full mt-2`}>
                <Ionicons name="chevron-down" size={24} color="#0f3878" />
              </TouchableOpacity>
            </View>

            {/* AM/PM Toggle */}
            <View style={tw`items-center justify-center ml-2`}>
              <TouchableOpacity 
                onPress={() => setPeriod('AM')}
                style={tw`px-3 py-2 rounded-lg mb-2 w-14 items-center ${period === 'AM' ? 'bg-[#0f3878]' : 'bg-slate-100'}`}
              >
                <Text style={tw`font-bold ${period === 'AM' ? 'text-white' : 'text-slate-500'}`}>AM</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={() => setPeriod('PM')}
                style={tw`px-3 py-2 rounded-lg w-14 items-center ${period === 'PM' ? 'bg-[#0f3878]' : 'bg-slate-100'}`}
              >
                <Text style={tw`font-bold ${period === 'PM' ? 'text-white' : 'text-slate-500'}`}>PM</Text>
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`flex-row justify-between gap-3`}>
            <TouchableOpacity onPress={onClose} style={tw`flex-1 py-3 bg-slate-200 rounded-full items-center`}>
              <Text style={tw`font-bold text-slate-700`}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleConfirm} style={tw`flex-1 py-3 bg-[#1d4ed8] rounded-full items-center`}>
              <Text style={tw`font-bold text-white`}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const TimeInput = ({ value, onChange, placeholder, label }: any) => {
  const [modalVisible, setModalVisible] = useState(false);

  return (
    <>
      <TouchableOpacity 
        style={tw`flex-1 py-3 flex-row items-center justify-between`}
        onPress={() => setModalVisible(true)}
      >
        <Text style={tw`text-[#0f3878] text-[13px] font-bold`}>
          {value ? formatTime12h(value) : placeholder}
        </Text>
        <Ionicons name="time-outline" size={16} color="#0f3878" />
      </TouchableOpacity>
      
      <CustomTimePickerModal 
        visible={modalVisible} 
        onClose={() => setModalVisible(false)} 
        value={value} 
        label={label}
        onSelect={(newVal: string) => {
          onChange(newVal);
          setModalVisible(false);
        }} 
      />
    </>
  );
};

export default function AdminSchedules() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  const [ltSchedule, setLtSchedule] = useState<ScheduleData>({
    time_open: '04:00:00',
    time_close: '20:00:00',
    is_suspended: false,
    suspend_message: ''
  });

  const [tlSchedule, setTlSchedule] = useState<ScheduleData>({
    time_open: '05:00:00',
    time_close: '22:00:00',
    is_suspended: false,
    suspend_message: ''
  });

  const fetchSchedules = useCallback(async () => {
    try {
      const data = await apiRequest('/api/admin/schedules');
      if (data.success && data.schedules) {
        data.schedules.forEach((sch: any) => {
          const mappedData = {
            time_open: sch.time_open || '00:00:00',
            time_close: sch.time_close || '00:00:00',
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
      console.error(error);
      Alert.alert('Error', 'Failed to load schedules from the server.');
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
          lt_open: ltSchedule.time_open,
          lt_close: ltSchedule.time_close,
          lt_suspended: ltSchedule.is_suspended,
          lt_message: ltSchedule.suspend_message,
          tl_open: tlSchedule.time_open,
          tl_close: tlSchedule.time_close,
          tl_suspended: tlSchedule.is_suspended,
          tl_message: tlSchedule.suspend_message
        })
      });
      
      if (data.success) {
        setShowSuccessModal(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to update schedules.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error occurred while saving schedules.');
    } finally {
      setSaving(false);
    }
  };

  const renderScheduleCard = (title: string, data: ScheduleData, setter: React.Dispatch<React.SetStateAction<ScheduleData>>) => {
    return (
      <View style={tw`bg-white rounded-3xl p-5 mb-5 mx-5 shadow-sm border border-slate-200`}>
        <View style={tw`flex-row justify-between items-center mb-5 pb-4 border-b border-slate-100`}>
          <Text style={tw`text-[#0f3878] font-extrabold text-[15px] uppercase tracking-wider`}>{title}</Text>
          
          <View style={tw`flex-row items-center`}>
            <View style={tw`w-2 h-2 rounded-full ${data.is_suspended ? 'bg-red-500' : 'bg-gray-300'} mr-1.5`} />
            <Text style={tw`text-[#0f3878] text-[11px] font-bold mr-2 uppercase tracking-wider`}>Suspend</Text>
            <Switch
              value={data.is_suspended}
              onValueChange={(val) => setter({ ...data, is_suspended: val })}
              trackColor={{ false: '#e2e8f0', true: '#fecaca' }}
              thumbColor={data.is_suspended ? '#dc2626' : '#94a3b8'}
              style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
            />
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-5 gap-4`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[#0f3878] text-[10px] font-bold uppercase tracking-wider mb-2`}>OPEN</Text>
            <View style={tw`flex-row items-center w-full border border-slate-300 rounded-xl bg-slate-50 px-3`}>
              <TimeInput 
                value={data.time_open} 
                onChange={(val: string) => setter({ ...data, time_open: val })} 
                placeholder="04:00 AM" 
                label={`${title} (OPEN)`}
              />
            </View>
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-[#0f3878] text-[10px] font-bold uppercase tracking-wider mb-2`}>CLOSE</Text>
            <View style={tw`flex-row items-center w-full border border-slate-300 rounded-xl bg-slate-50 px-3`}>
              <TimeInput 
                value={data.time_close} 
                onChange={(val: string) => setter({ ...data, time_close: val })} 
                placeholder="08:00 PM" 
                label={`${title} (CLOSE)`}
              />
            </View>
          </View>
        </View>

        <View>
          <Text style={tw`text-[#0f3878] text-[10px] font-bold uppercase tracking-wider mb-2`}>SUSPEND MESSAGE (OPTIONAL)</Text>
          <TextInput 
            style={tw`w-full border border-slate-300 rounded-xl p-4 text-slate-900 bg-slate-50 text-[13px]`}
            value={data.suspend_message}
            onChangeText={(val) => setter({ ...data, suspend_message: val })}
            placeholder="e.g. Suspended due to bad weather"
            editable={data.is_suspended}
          />
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Bus Operation Schedule" />

      <Modal visible={showSuccessModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-5`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-lg`}>
            <View style={tw`w-16 h-16 bg-green-100 rounded-full items-center justify-center mb-4`}>
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
            </View>
            <Text style={tw`text-[#0f3878] text-xl font-black mb-4 text-center`}>Changes Saved!</Text>
            
            <View style={tw`w-full bg-slate-50 p-4 rounded-xl mb-6 border border-slate-100`}>
              <Text style={tw`text-slate-600 text-[10px] font-bold uppercase tracking-wider mb-3`}>Updated Routes</Text>
              
              <View style={tw`mb-3`}>
                <View style={tw`flex-row items-center mb-1`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full ${ltSchedule.is_suspended ? 'bg-red-500' : 'bg-green-500'} mr-2`} />
                  <Text style={tw`text-[#0f3878] text-xs font-bold`}>LAUREL - TANAUAN</Text>
                </View>
                <Text style={tw`text-slate-500 text-[11px] font-medium ml-3.5`}>
                  {ltSchedule.is_suspended ? 'Currently Suspended' : `${formatTime12h(ltSchedule.time_open)}  —  ${formatTime12h(ltSchedule.time_close)}`}
                </Text>
              </View>

              <View>
                <View style={tw`flex-row items-center mb-1`}>
                  <View style={tw`w-1.5 h-1.5 rounded-full ${tlSchedule.is_suspended ? 'bg-red-500' : 'bg-green-500'} mr-2`} />
                  <Text style={tw`text-[#0f3878] text-xs font-bold`}>TANAUAN - LAUREL</Text>
                </View>
                <Text style={tw`text-slate-500 text-[11px] font-medium ml-3.5`}>
                  {tlSchedule.is_suspended ? 'Currently Suspended' : `${formatTime12h(tlSchedule.time_open)}  —  ${formatTime12h(tlSchedule.time_close)}`}
                </Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={() => setShowSuccessModal(false)} 
              style={tw`bg-[#1d4ed8] w-full py-3.5 rounded-full items-center shadow-sm`}
            >
              <Text style={tw`text-white font-bold tracking-wide`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0f3878" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`pb-10 pt-2 flex-grow`}>
          <View style={tw`max-w-xl w-full self-center`}>
            <View style={tw`flex-row justify-center items-center p-5 pb-3`}>
              <View>
                <Text style={tw`text-xl font-extrabold text-[#0f3878] tracking-tight`}>Operation Schedule</Text>
              </View>
            </View>
            
            {renderScheduleCard('LAUREL - TANAUAN', ltSchedule, setLtSchedule)}
            {renderScheduleCard('TANAUAN - LAUREL', tlSchedule, setTlSchedule)}
            
            <View style={tw`px-5 mt-2`}>
              <TouchableOpacity 
                style={tw`bg-[#1d4ed8] w-full py-4 rounded-full shadow-sm flex-row justify-center items-center ${saving ? 'opacity-70' : ''}`}
                onPress={handleSave}
                disabled={saving}
              >
                {saving && <ActivityIndicator size="small" color="white" style={tw`mr-2`} />}
                <Text style={tw`text-white font-bold text-[15px] tracking-wide`}>Save Schedules</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
