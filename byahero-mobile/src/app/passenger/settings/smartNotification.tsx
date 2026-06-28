import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import * as Notifications from 'expo-notifications';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function SmartNotificationScreen() {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [pushEnabled, setPushEnabled] = useState(false);
  
  const [notifySchedule, setNotifySchedule] = useState(true);
  const [notifyArrival, setNotifyArrival] = useState(true);
  const [notifySeat, setNotifySeat] = useState(true);

  const [isSubscribing, setIsSubscribing] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
        const loggedIn = cachedEmail !== 'Guest' && cachedEmail !== 'guest@byahero.app';
        setIsLoggedIn(loggedIn);

        const storedToken = await AsyncStorage.getItem('sos_fcm_active_token');
        if (storedToken) setPushEnabled(true);

        const scheduleVal = await AsyncStorage.getItem('notify_bus_schedule');
        const arrivalVal = await AsyncStorage.getItem('notify_bus_arrival');
        const seatVal = await AsyncStorage.getItem('notify_seat_availability');

        if (scheduleVal !== null) setNotifySchedule(scheduleVal === '1');
        if (arrivalVal !== null) setNotifyArrival(arrivalVal === '1');
        if (seatVal !== null) setNotifySeat(seatVal === '1');

        if (loggedIn) {
          const serverUrl = await getServerUrl();
          const res = await fetch(`${serverUrl}/api/settings/fetch`, { credentials: 'include' });
          const data = await res.json();
          if (data && data.success && data.settings) {
            const s = data.settings;
            setNotifySchedule(parseInt(s.notify_bus_schedule) === 1);
            setNotifyArrival(parseInt(s.notify_bus_arrival) === 1);
            setNotifySeat(parseInt(s.notify_seat_availability) === 1);

            await AsyncStorage.setItem('notify_bus_schedule', s.notify_bus_schedule);
            await AsyncStorage.setItem('notify_bus_arrival', s.notify_bus_arrival);
            await AsyncStorage.setItem('notify_seat_availability', s.notify_seat_availability);
          }
        }
      } catch (err) {
        console.warn('Failed to load settings:', err);
      }
    }
    loadSettings();
  }, []);

  const updateSetting = async (settingName: string, value: boolean) => {
    const valStr = value ? '1' : '0';
    if (settingName === 'notify_bus_schedule') setNotifySchedule(value);
    else if (settingName === 'notify_bus_arrival') setNotifyArrival(value);
    else if (settingName === 'notify_seat_availability') setNotifySeat(value);

    try {
      await AsyncStorage.setItem(settingName, valStr);
      
      if (isLoggedIn) {
        const serverUrl = await getServerUrl();
        const formData = new FormData();
        formData.append('setting_name', settingName);
        formData.append('setting_value', valStr);

        const res = await fetch(`${serverUrl}/api/settings/update`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.success) {
          console.warn('Failed to save settings on server:', data.message);
        }
      }
    } catch (e) {
      console.error('Error updating setting:', e);
    }
  };

  const handleSubscribePush = async () => {
    setIsSubscribing(true);
    try {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      if (finalStatus !== 'granted') {
        setIsSubscribing(false);
        Alert.alert('Permission Denied', 'Please enable notifications in system settings.');
        return;
      }

      const tokenData = await Notifications.getDevicePushTokenAsync();
      const token = tokenData.data;
      
      await AsyncStorage.setItem('sos_fcm_active_token', token);
      setPushEnabled(true);

      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('fcm_token', token);

      const res = await fetch(`${serverUrl}/api/fcm/register`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSubscribing(false);

      if (data && data.success) {
        Alert.alert('Subscribed', 'Your device registered successfully for push notifications!');
      } else {
        Alert.alert('Notice', 'Registered locally. Server failed to register device.');
      }
    } catch (e) {
      setIsSubscribing(false);
      console.error('[FCM Registration Error]', e);
      Alert.alert('Error', `Failed to register push token: ${(e as any).message || e}`);
    }
  };

  const notificationOptions = [
    {
      key: 'notify_bus_schedule',
      title: 'Bus Schedule Update',
      desc: 'Receive alerts when bus timetables change',
      icon: 'schedule',
      color: '#3b82f6',
      value: notifySchedule,
    },
    {
      key: 'notify_bus_arrival',
      title: 'Bus Arrival Alerts',
      desc: 'Notify when tracking bus approaches stops',
      icon: 'directions-bus',
      color: '#10b981',
      value: notifyArrival,
    },
    {
      key: 'notify_seat_availability',
      title: 'Seat Availability',
      desc: 'Alert when target seats open up on routes',
      icon: 'event-seat',
      color: '#f59e0b',
      value: notifySeat,
    },
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Smart Notifications" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {/* Intro */}
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4`}>
            <Text style={tw`text-sm font-semibold text-slate-700 leading-relaxed`}>
              Stay informed about the most relevant updates while tracking buses. Enable Smart Notifications to receive alerts for bus schedule changes, arrivals, and seat availability.
            </Text>
          </View>

          {/* Subscribe Trigger */}
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4`}>
            <View style={tw`flex-row justify-between items-center`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-sm font-bold text-slate-800`}>Enable Push Notifications</Text>
                <Text style={tw`text-xs text-slate-400 mt-1 font-semibold`}>
                  Allow alerts on this device and sync your notification ID.
                </Text>
              </View>
              <TouchableOpacity 
                onPress={handleSubscribePush}
                disabled={isSubscribing || pushEnabled}
                style={[
                  tw`px-4 py-2.5 rounded-full shadow-sm`,
                  pushEnabled ? tw`bg-slate-100 border border-slate-200` : tw`bg-[#1e3a8a]`
                ]}
              >
                <Text style={[tw`text-xs font-bold`, pushEnabled ? tw`text-slate-400` : tw`text-white`]}>
                  {pushEnabled ? 'Enabled' : (isSubscribing ? 'Registering...' : 'Enable')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Guest Warning */}
          {!isLoggedIn && (
            <View style={tw`bg-yellow-50 border border-yellow-100 rounded-3xl p-4 mb-4 flex-row items-center`}>
              <MaterialIcons name="warning" size={20} color="#b45309" style={tw`mr-2`} />
              <Text style={tw`text-xs text-amber-800/90 leading-relaxed flex-1`}>
                Settings are saved locally. Log in to synchronize notifications across devices.
              </Text>
            </View>
          )}

          {/* Switches */}
          <Text style={tw`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1`}>
            Notification Channels
          </Text>
          <View style={tw`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden`}>
            {notificationOptions.map((opt, idx) => (
              <View 
                key={idx}
                style={[
                  tw`flex-row items-center justify-between p-4`,
                  idx < notificationOptions.length - 1 && tw`border-b border-slate-100`
                ]}
              >
                <View style={tw`flex-row items-center flex-1 mr-4`}>
                  <View style={[tw`w-10 h-10 rounded-2xl justify-center items-center mr-3.5`, { backgroundColor: opt.color + '15' }]}>
                    <MaterialIcons name={opt.icon as any} size={20} color={opt.color} />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-sm font-semibold text-slate-700`}>{opt.title}</Text>
                    <Text style={tw`text-xs text-slate-400 mt-0.5`} numberOfLines={1}>{opt.desc}</Text>
                  </View>
                </View>

                <Switch
                  value={opt.value}
                  onValueChange={(val) => updateSetting(opt.key, val)}
                  trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                  thumbColor={opt.value ? '#1e3a8a' : '#f4f3f4'}
                />
              </View>
            ))}
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
