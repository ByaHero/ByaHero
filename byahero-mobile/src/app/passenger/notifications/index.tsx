import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  SafeAreaView,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Platform,
  Alert,
  RefreshControl,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader } from '../../../components/passenger-navbar';

export default function NotificationsScreen() {
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');
  const [loading, setLoading] = useState(true);
  const [sosAlerts, setSosAlerts] = useState<any[]>([]);
  const [smartNotifications, setSmartNotifications] = useState<any[]>([]);
  
  // Settings indicators from api
  const [notifyBusSchedule, setNotifyBusSchedule] = useState(false);
  const [notifyBusArrival, setNotifyBusArrival] = useState(false);
  const [notifySeatAvailability, setNotifySeatAvailability] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  const [refreshing, setRefreshing] = useState(false);

  const fetchNotifications = useCallback(async (isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    }
    try {
      const currentBaseUrl = await getServerUrl();
      setBaseUrl(currentBaseUrl);

      const cachedEmail = (await AsyncStorage.getItem('byahero_cached_email') || '').trim();
      const emailParam = cachedEmail ? `?email=${encodeURIComponent(cachedEmail)}&mark_read=1` : '?mark_read=1';
      const authHeaders: Record<string, string> = cachedEmail ? { 'X-User-Email': cachedEmail } : {};

      let data: any = null;
      try {
        const res = await fetch(`${currentBaseUrl}/api/notifications${emailParam}`, {
          headers: authHeaders,
          credentials: 'include',
          cache: 'no-store'
        });
        if (res.ok) {
          data = await res.json();
        }
      } catch (e) {
        console.warn(`Failed fetching notifications from ${currentBaseUrl}, trying alwaysdata fallback...`, e);
      }

      // Fallback to alwaysdata if configured URL fails
      if (!data && currentBaseUrl !== 'https://byahero.alwaysdata.net') {
        try {
          const fallbackRes = await fetch(`https://byahero.alwaysdata.net/api/notifications${emailParam}`, {
            headers: authHeaders,
            credentials: 'include',
            cache: 'no-store'
          });
          if (fallbackRes.ok) {
            data = await fallbackRes.json();
          }
        } catch (e) {
          console.error('Fallback notifications fetch failed:', e);
        }
      }

      setLoading(false);
      setRefreshing(false);
      if (data) {
        if (data.success) {
          setSosAlerts(data.sos_alerts || []);
          setSmartNotifications(data.notifications || []);
          setNotifyBusSchedule(!!data.notify_bus_schedule);
          setNotifyBusArrival(!!data.notify_bus_arrival);
          setNotifySeatAvailability(!!data.notify_seat_availability);
          setErrorText(null);
        } else {
          setErrorText(data.message || 'Failed to load notifications.');
        }
      } else {
        setErrorText('Unable to connect to the notifications server.');
      }
    } catch (err) {
      console.error('Error loading notifications:', err);
      setLoading(false);
      setRefreshing(false);
      setErrorText('An unexpected network error occurred.');
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr.replace(/-/g, "/"));
    if (isNaN(date.getTime())) return dateStr;
    
    const options: Intl.DateTimeFormatOptions = { 
      month: 'short', 
      day: 'numeric', 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    };
    return date.toLocaleDateString('en-US', options);
  };

  const getIconDetails = (type: string) => {
    const t = String(type || '').toLowerCase();
    if (t === 'schedule_update' || t === 'schedule') {
      return { icon: 'schedule', color: '#0284c7' };
    }
    if (t === 'bus_arrival') {
      return { icon: 'place', color: '#103d7c' };
    }
    if (t === 'seat_full') {
      return { icon: 'event-seat', color: '#ef4444' };
    }
    return { icon: 'notifications', color: '#64748b' };
  };

  const handleNotificationPress = (notif: any) => {
    const t = String(notif?.type || '').toLowerCase();
    if (t === 'schedule_update' || t === 'schedule') {
      router.push('/passenger/busInfo' as any);
    }
  };

  const handleClearAll = () => {
    Alert.alert(
      'Clear Notifications',
      'Are you sure you want to clear all notifications?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Clear', 
          style: 'destructive',
          onPress: async () => {
            try {
              const cachedEmail = (await AsyncStorage.getItem('byahero_cached_email') || '').trim();
              const emailParam = cachedEmail ? `?email=${encodeURIComponent(cachedEmail)}` : '';
              const authHeaders: Record<string, string> = cachedEmail ? { 'X-User-Email': cachedEmail } : {};

              const res = await fetch(`${baseUrl}/api/notifications/clear${emailParam}`, {
                method: 'DELETE',
                headers: authHeaders,
                credentials: 'include'
              });
              const data = await res.json().catch(() => null);
              if (res.ok && data?.success) {
                setSosAlerts([]);
                setSmartNotifications([]);
              } else {
                Alert.alert('Error', data?.message || 'Failed to clear notifications.');
              }
            } catch (err) {
              console.error('Failed to clear notifications', err);
              Alert.alert('Error', 'Unable to connect to the server.');
            }
          }
        }
      ]
    );
  };

  const hasSettings = notifyBusSchedule || notifyBusArrival || notifySeatAvailability;
  const hasHistory = sosAlerts.length > 0 || smartNotifications.length > 0;
  const showEmptyState = !loading && !hasSettings && !hasHistory;

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', height: '100%', width: '100%' }}>
      <PassengerHeader pageTitle="Notifications" />

      <View style={{ flex: 1 }}>
        {loading ? (
          <View style={tw`flex-1 justify-center items-center`}>
            <ActivityIndicator size="large" color="#103d7c" />
          </View>
        ) : errorText ? (
          <View style={tw`flex-1 justify-center items-center px-8`}>
            <MaterialIcons name="cloud-off" size={64} color="#64748b" style={tw`mb-4`} />
            <Text style={tw`text-lg font-bold text-[#103d7c] mb-2`}>Connection Error</Text>
            <Text style={tw`text-sm text-[#64748b] text-center mb-6`}>{errorText}</Text>
            <TouchableOpacity 
              onPress={() => router.back()}
              style={tw`bg-[#103d7c] px-6 py-2.5 rounded-full`}
            >
              <Text style={tw`text-white font-bold text-sm`}>Go Back</Text>
            </TouchableOpacity>
          </View>
        ) : showEmptyState ? (
          <View style={tw`flex-1 justify-center items-center px-8`}>
            <MaterialIcons name="notifications-off" size={64} color="#64748b" style={tw`mb-4`} />
            <Text style={tw`text-lg font-bold text-[#103d7c] mb-2`}>Notifications Disabled</Text>
            <Text style={tw`text-sm text-[#64748b] text-center mb-6 leading-5`}>
              You haven't enabled any notifications yet. Turn on Smart Notifications to stay updated about bus schedules, arrivals, and seat availability.
            </Text>
            <TouchableOpacity 
              onPress={() => router.push('/passenger/passengerSettings/smartNotification' as any)}
              style={tw`bg-[#103d7c] px-6 py-3 rounded-full flex-row items-center gap-2`}
            >
              <MaterialIcons name="notifications-active" size={18} color="#white" />
              <Text style={tw`text-white font-extrabold text-sm`}>Enable Notifications</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={tw`flex-1`}>
            {hasHistory && (
              <View style={tw`bg-white px-4 py-2 border-b border-slate-100 flex-row justify-end`}>
                <TouchableOpacity onPress={handleClearAll} style={tw`flex-row items-center`}>
                  <MaterialIcons name="clear-all" size={20} color="#64748b" />
                  <Text style={tw`text-slate-500 font-bold ml-1`}>Clear All</Text>
                </TouchableOpacity>
              </View>
            )}
            <ScrollView 
              style={tw`flex-1 bg-white`}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={() => fetchNotifications(true)}
                  colors={['#103d7c']}
                  tintColor="#103d7c"
                />
              }
            >
            
            {/* SOS Alerts Section */}
            {sosAlerts.length > 0 && (
              <View style={tw`mb-4`}>
                <View style={tw`bg-red-50 px-4 py-2 border-y border-red-100`}>
                  <Text style={tw`text-xs font-black text-red-600 tracking-wider`}>SOS ALERTS</Text>
                </View>
                <View>
                  {sosAlerts.map((alert, index) => {
                    const isUnread = alert.status === 'active';
                    return (
                      <View key={index} style={tw`px-4 py-4 border-b border-slate-100 flex-row gap-3.5 items-start`}>
                        <View style={tw`w-10 h-10 rounded-full bg-red-100 justify-center items-center`}>
                          <MaterialIcons name="warning" size={20} color="#ef4444" />
                        </View>
                        <View style={tw`flex-1`}>
                          <View style={tw`flex-row justify-between items-baseline mb-1`}>
                            <Text style={tw`text-sm font-extrabold text-slate-800 flex-1 mr-2`} numberOfLines={1}>
                              SOS from {alert.sender_name || alert.sender_email || 'Unknown'}
                            </Text>
                            <Text style={tw`text-[10px] text-[#64748b] font-semibold`}>
                              {formatDate(alert.created_at)}
                            </Text>
                          </View>
                          <Text style={tw`text-xs text-[#64748b] leading-4`}>
                            {alert.location_text || 'Location not provided'}
                          </Text>
                        </View>
                        {isUnread && (
                          <View style={tw`w-2.5 h-2.5 rounded-full bg-red-500 self-center`} />
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Smart Notifications Section */}
            <View>
              <View style={tw`bg-[#103d7c]/5 px-4 py-2 border-y border-[#103d7c]/10`}>
                <Text style={tw`text-xs font-black text-[#103d7c] tracking-wider`}>SMART NOTIFICATIONS</Text>
              </View>
              {smartNotifications.length === 0 ? (
                <View style={tw`px-4 py-6 items-center`}>
                  <Text style={tw`text-xs text-[#64748b] italic`}>No smart notifications yet. Open the map to generate alerts.</Text>
                </View>
              ) : (
                <View>
                  {smartNotifications.map((notif, index) => {
                    const iconDetails = getIconDetails(notif.type);
                    const isUnread = !notif.read_at;
                    return (
                      <TouchableOpacity 
                        key={index} 
                        activeOpacity={0.7}
                        onPress={() => handleNotificationPress(notif)}
                        style={tw`px-4 py-4 border-b border-slate-100 flex-row gap-3.5 items-start`}
                      >
                        <View style={[tw`w-10 h-10 rounded-full justify-center items-center`, { backgroundColor: `${iconDetails.color}15` }]}>
                          <MaterialIcons name={iconDetails.icon as any} size={20} color={iconDetails.color} />
                        </View>
                        <View style={tw`flex-1`}>
                          <View style={tw`flex-row justify-between items-baseline mb-1`}>
                            <Text style={tw`text-sm font-extrabold text-slate-800 flex-1 mr-2`} numberOfLines={1}>
                              {notif.title}
                            </Text>
                            <Text style={tw`text-[10px] text-[#64748b] font-semibold`}>
                              {formatDate(notif.created_at)}
                            </Text>
                          </View>
                          <Text style={tw`text-xs text-[#64748b] leading-4`}>
                            {notif.message}
                          </Text>
                        </View>
                        {isUnread && (
                          <View style={tw`w-2.5 h-2.5 rounded-full bg-blue-500 self-center`} />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

          </ScrollView>
        </View>
        )}
      </View>
    </SafeAreaView>
  );
}
