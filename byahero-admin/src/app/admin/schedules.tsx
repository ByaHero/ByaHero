import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Switch } from 'react-native';
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

// Convert "04:00 AM" to "04:00" for input handling, or keep standard 24h depending on how we build the UI
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

export default function AdminSchedules() {
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
        Alert.alert('Success', 'The operation schedule has been successfully saved.');
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
          <Text style={tw`text-slate-900 font-extrabold text-[15px] uppercase tracking-wider`}>{title}</Text>
          
          <View style={tw`flex-row items-center`}>
            <Text style={tw`text-slate-500 text-[11px] font-bold mr-2 uppercase tracking-wider`}>Suspend</Text>
            <Switch
              value={data.is_suspended}
              onValueChange={(val) => setter({ ...data, is_suspended: val })}
              trackColor={{ false: '#e2e8f0', true: '#fecaca' }}
              thumbColor={data.is_suspended ? '#dc2626' : '#94a3b8'}
            />
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-5 gap-4`}>
          <View style={tw`flex-1`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2`}>OPEN (HH:mm)</Text>
            <TextInput 
              style={tw`w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-[15px] font-bold bg-slate-50`}
              value={data.time_open}
              onChangeText={(val) => setter({ ...data, time_open: val })}
              placeholder="04:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
          <View style={tw`flex-1`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2`}>CLOSE (HH:mm)</Text>
            <TextInput 
              style={tw`w-full border border-slate-300 rounded-xl px-4 py-3 text-slate-900 text-[15px] font-bold bg-slate-50`}
              value={data.time_close}
              onChangeText={(val) => setter({ ...data, time_close: val })}
              placeholder="22:00"
              keyboardType="numbers-and-punctuation"
            />
          </View>
        </View>

        <View>
          <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2`}>SUSPEND MESSAGE (OPTIONAL)</Text>
          <TextInput 
            style={tw`w-full border border-slate-300 rounded-xl p-4 text-slate-900 bg-slate-50 text-[14px]`}
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
      <AdminNavbar title="OPERATION HOURS" />

      <View style={tw`flex-row items-center p-5 pb-3`}>
        <Ionicons name="time" size={28} color="#0f3878" style={tw`mr-3`} />
        <View>
          <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Schedule</Text>
          <Text style={tw`text-slate-500 text-[13px] mt-0.5`}>Manage daily routing times</Text>
        </View>
      </View>

      {loading ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0f3878" />
        </View>
      ) : (
        <ScrollView contentContainerStyle={tw`pb-10 pt-2`}>
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
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
