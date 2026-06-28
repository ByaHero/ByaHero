import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Switch, KeyboardAvoidingView, Platform, Modal, Pressable } from 'react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';

interface ScheduleData {
  time_open: string;
  time_close: string;
  is_suspended: boolean;
  suspend_message: string;
}

const generateTimeOptions = () => {
  const times = [];
  const ampm = ['AM', 'PM'];
  for (let m = 0; m < 2; m++) {
    for (let h = 0; h < 12; h++) {
      const hour = h === 0 ? 12 : h;
      const hourStr = hour < 10 ? `0${hour}` : hour;
      times.push(`${hourStr}:00 ${ampm[m]}`);
      times.push(`${hourStr}:30 ${ampm[m]}`);
    }
  }
  // Move 12:xx PM to exactly after 11:30 AM
  const formattedTimes = [];
  for (let h = 1; h <= 11; h++) {
    const hourStr = h < 10 ? `0${h}` : h;
    formattedTimes.push(`${hourStr}:00 AM`);
    formattedTimes.push(`${hourStr}:30 AM`);
  }
  formattedTimes.unshift('12:00 AM', '12:30 AM');
  formattedTimes.push('12:00 PM', '12:30 PM');
  for (let h = 1; h <= 11; h++) {
    const hourStr = h < 10 ? `0${h}` : h;
    formattedTimes.push(`${hourStr}:00 PM`);
    formattedTimes.push(`${hourStr}:30 PM`);
  }
  return formattedTimes;
};

const TIME_OPTIONS = generateTimeOptions();

export default function OperationSchedulePage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [ltSchedule, setLtSchedule] = useState<ScheduleData>({
    time_open: '04:00 AM',
    time_close: '08:00 PM',
    is_suspended: false,
    suspend_message: ''
  });

  const [tlSchedule, setTlSchedule] = useState<ScheduleData>({
    time_open: '05:00 AM',
    time_close: '10:00 PM',
    is_suspended: false,
    suspend_message: ''
  });

  const [pickerVisible, setPickerVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [currentPickerValue, setCurrentPickerValue] = useState('');
  const [onPickerSelect, setOnPickerSelect] = useState<{ fn: (val: string) => void }>({ fn: () => {} });

  const openTimePicker = (currentVal: string, onSelect: (val: string) => void) => {
    setCurrentPickerValue(currentVal);
    setOnPickerSelect({ fn: onSelect });
    setPickerVisible(true);
  };

  const fetchSchedules = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/schedules`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.schedules) {
        data.schedules.forEach((sch: any) => {
          const mappedData = {
            time_open: sch.time_open || '',
            time_close: sch.time_close || '',
            is_suspended: sch.is_suspended === 1,
            suspend_message: sch.suspend_message || ''
          };
          if (sch.terminal_name === 'LAUREL - TANAUAN') {
            setLtSchedule(mappedData);
          } else if (sch.terminal_name === 'TANAUAN - LAUREL') {
            setTlSchedule(mappedData);
          }
        });
      }
    } catch (error) {
      console.error('Error fetching schedules:', error);
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
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/schedules`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
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
      
      const data = await response.json();
      if (data.success) {
        setSuccessModalVisible(true);
      } else {
        Alert.alert('Error', data.message || 'Failed to update schedules.');
      }
    } catch (error) {
      console.error('Error saving schedules:', error);
      Alert.alert('Error', 'Network error occurred while saving schedules.');
    } finally {
      setSaving(false);
    }
  };

  const renderScheduleCard = (title: string, data: ScheduleData, setter: React.Dispatch<React.SetStateAction<ScheduleData>>) => {
    return (
      <View style={tw`bg-white rounded-2xl p-5 mb-5 shadow-sm border border-slate-200`}>
        <View style={tw`flex-row justify-between items-center mb-5`}>
          <Text style={tw`text-slate-900 font-extrabold text-[15px] uppercase tracking-wider`}>{title}</Text>
          <View style={tw`flex-row items-center`}>
            <Switch
              value={data.is_suspended}
              onValueChange={(val) => setter({ ...data, is_suspended: val })}
              trackColor={{ false: '#e2e8f0', true: '#ffccd5' }}
              thumbColor={data.is_suspended ? '#e11d48' : '#cbd5e1'}
              style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] } : {}}
            />
            <Text style={tw`text-slate-700 text-[12px] font-bold ml-2`}>Suspend</Text>
          </View>
        </View>

        <View style={tw`flex-row justify-between mb-5`}>
          <View style={tw`w-[48%]`}>
            <Text style={tw`text-slate-700 text-[11px] font-bold uppercase mb-2 ml-1 tracking-wider`}>OPEN</Text>
            <TouchableOpacity 
              style={tw`border border-slate-300 rounded-xl flex-row items-center bg-white px-3 py-1 h-[46px]`}
              onPress={() => openTimePicker(data.time_open, (val) => setter({ ...data, time_open: val }))}
              activeOpacity={0.7}
            >
              <Text style={tw`flex-1 text-slate-900 text-[15px] font-bold`}>
                {data.time_open || 'Select Time'}
              </Text>
              <Ionicons name="time-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
          <View style={tw`w-[48%]`}>
            <Text style={tw`text-slate-700 text-[11px] font-bold uppercase mb-2 ml-1 tracking-wider`}>CLOSE</Text>
            <TouchableOpacity 
              style={tw`border border-slate-300 rounded-xl flex-row items-center bg-white px-3 py-1 h-[46px]`}
              onPress={() => openTimePicker(data.time_close, (val) => setter({ ...data, time_close: val }))}
              activeOpacity={0.7}
            >
              <Text style={tw`flex-1 text-slate-900 text-[15px] font-bold`}>
                {data.time_close || 'Select Time'}
              </Text>
              <Ionicons name="time-outline" size={18} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>

        <View>
          <Text style={tw`text-slate-700 text-[11px] font-bold uppercase mb-2 ml-1 tracking-wider`}>SUSPEND MESSAGE (OPTIONAL)</Text>
          <TextInput 
            style={tw`border border-slate-300 rounded-xl p-3 px-4 text-slate-900 bg-white min-h-[46px] text-[14px] font-medium`}
            value={data.suspend_message}
            onChangeText={(val) => setter({ ...data, suspend_message: val })}
            placeholder="e.g. Suspended due to bad weather"
            placeholderTextColor="#94a3b8"
          />
        </View>
      </View>
    );
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : undefined} 
      style={tw`flex-1 bg-white`}
    >
      <ScrollView 
        contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 70, paddingBottom: 60, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={tw`text-[#0f3878] text-[17px] font-extrabold tracking-wide mb-5 ml-1 mt-2`}>
          Operation Schedule
        </Text>

        {loading ? (
          <ActivityIndicator size="large" color="#0f3878" style={tw`mt-10`} />
        ) : (
          <>
            {renderScheduleCard('LAUREL - TANAUAN', ltSchedule, setLtSchedule)}
            {renderScheduleCard('TANAUAN - LAUREL', tlSchedule, setTlSchedule)}
            
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] mt-2 py-3.5 rounded-full shadow-sm flex-row justify-center items-center`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="#ffffff" style={tw`mr-2`} /> : null}
              <Text style={tw`text-white font-bold text-[14px]`}>Save Schedules</Text>
            </TouchableOpacity>
          </>
        )}

      </ScrollView>

      {/* Time Picker Modal */}
      <Modal visible={pickerVisible} transparent animationType="fade">
        <Pressable style={tw`flex-1 bg-black/50 justify-center items-center p-6`} onPress={() => setPickerVisible(false)}>
          <Pressable style={tw`bg-white rounded-3xl w-full max-w-sm max-h-[70%] overflow-hidden`}>
            <View style={tw`p-5 border-b border-slate-100 flex-row justify-between items-center`}>
              <Text style={tw`text-slate-900 font-extrabold text-[16px]`}>Select Time</Text>
              <TouchableOpacity onPress={() => setPickerVisible(false)}>
                <Ionicons name="close-circle" size={24} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={tw`px-2`} showsVerticalScrollIndicator={true}>
              {TIME_OPTIONS.map((time, idx) => (
                <TouchableOpacity 
                  key={idx} 
                  style={tw`py-4 px-5 border-b border-slate-50 flex-row justify-between items-center ${currentPickerValue === time ? 'bg-blue-50/50' : ''}`}
                  onPress={() => {
                    onPickerSelect.fn(time);
                    setPickerVisible(false);
                  }}
                >
                  <Text style={tw`text-[15px] ${currentPickerValue === time ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>
                    {time}
                  </Text>
                  {currentPickerValue === time && <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <Pressable style={tw`flex-1 bg-black/50 justify-center items-center p-6`} onPress={() => setSuccessModalVisible(false)}>
          <View style={tw`bg-white rounded-3xl w-full max-w-xs p-6 items-center shadow-lg`}>
            <View style={tw`bg-green-100 p-4 rounded-full mb-4`}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={tw`text-slate-900 font-extrabold text-[18px] mb-2 text-center`}>Schedule Updated!</Text>
            <Text style={tw`text-slate-500 text-[13px] text-center mb-6`}>
              The operation schedule has been successfully saved to the database.
            </Text>
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] py-3 px-8 rounded-full w-full`}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={tw`text-white font-bold text-center text-[14px]`}>Awesome</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>

    </KeyboardAvoidingView>
  );
}
