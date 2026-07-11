import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function LoginActivityScreen() {
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadActivity() {
      try {
        const serverUrl = await getServerUrl();
        const res = await fetch(`${serverUrl}/api/passenger/profile/login-activity`, {
          credentials: 'include'
        });
        const data = await res.json();
        const list = data.activity || data.activities;
        if (data && data.success && Array.isArray(list)) {
          setActivities(list);
        }
      } catch (err) {
        console.warn('Failed to load online login activity:', err);
        setActivities([
          {
            browser: 'Expo Mobile App',
            device: 'Mobile',
            event_type: 'login',
            ip_address: '127.0.0.1',
            created_at: new Date().toISOString()
          }
        ]);
      } finally {
        setIsLoading(false);
      }
    }
    loadActivity();
  }, []);

  const getDeviceIcon = (device: string) => {
    const dev = (device || '').toLowerCase();
    if (dev.includes('mobile') || dev.includes('phone') || dev.includes('android') || dev.includes('ios')) return 'smartphone';
    if (dev.includes('tablet') || dev.includes('ipad')) return 'tablet';
    return 'computer';
  };

  const formatTimeAgo = (dateStr: string) => {
    const timestamp = new Date(dateStr).getTime();
    if (isNaN(timestamp)) return dateStr;
    
    const diffSeconds = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
    if (diffSeconds < 60) return 'Just now';
    
    const diffMinutes = Math.floor(diffSeconds / 60);
    if (diffMinutes < 60) return `${diffMinutes}m ago`;
    
    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const renderStatusBadge = (act: any, isCurrent: boolean) => {
    if (isCurrent) {
      return (
        <View style={tw`bg-emerald-50 border border-emerald-100 rounded-full px-2.5 py-0.5`}>
          <Text style={tw`text-[10px] font-bold text-emerald-600`}>Active Now</Text>
        </View>
      );
    }

    const type = (act.event_type || 'login').toLowerCase();
    if (type === 'logout') {
      return (
        <View style={tw`bg-slate-100 border border-slate-200 rounded-full px-2.5 py-0.5`}>
          <Text style={tw`text-[10px] font-bold text-slate-500`}>Logged Out</Text>
        </View>
      );
    } else if (type === 'session_expired') {
      return (
        <View style={tw`bg-rose-50 border border-rose-100 rounded-full px-2.5 py-0.5`}>
          <Text style={tw`text-[10px] font-bold text-rose-500`}>Expired</Text>
        </View>
      );
    }

    return (
      <View style={tw`bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5`}>
        <Text style={tw`text-[10px] font-bold text-blue-600`}>Logged In</Text>
      </View>
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Login Activity" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <Text style={tw`text-lg font-black text-slate-800 mb-1 px-1`}>Login Activity</Text>
          <Text style={tw`text-xs text-slate-400 font-medium mb-5 px-1`}>Recent sessions where your account was accessed</Text>

          {isLoading ? (
            <View style={tw`py-16 items-center`}>
              <ActivityIndicator size="large" color="#1e3a8a" />
            </View>
          ) : activities.length === 0 ? (
            <View style={tw`bg-white rounded-3xl p-8 items-center border border-slate-100 shadow-sm`}>
              <MaterialIcons name="history" size={48} color="#cbd5e1" />
              <Text style={tw`text-sm font-semibold text-slate-400 mt-3`}>No session logs available</Text>
            </View>
          ) : (
            <View style={tw`gap-3`}>
              {activities.map((act, index) => {
                const isCurrent = index === 0 && act.event_type !== 'logout';
                return (
                  <View 
                    key={index}
                    style={[
                      tw`bg-white rounded-2xl p-4 flex-row items-center border border-slate-100 shadow-sm`,
                      isCurrent && tw`border-l-4 border-blue-500`
                    ]}
                  >
                    <View style={[
                      tw`w-12 h-12 rounded-xl justify-center items-center mr-4 flex-shrink-0`,
                      isCurrent ? tw`bg-blue-50` : tw`bg-slate-50`
                    ]}>
                      <MaterialIcons 
                        name={getDeviceIcon(act.device)} 
                        size={22} 
                        color={isCurrent ? '#3b82f6' : '#64748b'} 
                      />
                    </View>

                    <View style={tw`flex-grow mr-2`}>
                      <View style={tw`flex-row items-center justify-between flex-wrap gap-1 mb-1.5`}>
                        <Text style={tw`text-sm font-bold text-slate-700`}>
                          {act.browser || 'Browser'} on {act.device || 'Unknown Device'}
                        </Text>
                        {renderStatusBadge(act, isCurrent)}
                      </View>

                      <View style={tw`flex-row items-center flex-wrap gap-y-1`}>
                        <View style={tw`flex-row items-center mr-3`}>
                          <MaterialIcons name="schedule" size={13} color="#94a3b8" style={tw`mr-1`} />
                          <Text style={tw`text-[11px] text-slate-400 font-semibold`}>
                            {formatTimeAgo(act.created_at)}
                          </Text>
                        </View>
                        
                        <View style={tw`flex-row items-center`}>
                          <MaterialIcons name="location-on" size={13} color="#94a3b8" style={tw`mr-0.5`} />
                          <Text style={tw`text-[11px] text-slate-400 font-semibold`}>
                            {act.ip_address || 'Unknown IP'}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                );
              })}
            </View>
          )}

          {/* Security Tip Banner */}
          <View style={tw`bg-blue-50 border border-blue-100 rounded-3xl p-4.5 mt-5 flex-row items-start`}>
            <MaterialIcons name="security" size={20} color="#2563eb" style={tw`mr-3 mt-0.5`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-bold text-blue-800 mb-0.5`}>Security Reminder</Text>
              <Text style={tw`text-[11px] text-blue-700/80 leading-relaxed`}>
                If you notice any unfamiliar devices or locations in your session history, please change your account password immediately to protect your account.
              </Text>
            </View>
          </View>

          {/* Return Button */}
          <TouchableOpacity 
            onPress={() => router.back()}
            style={tw`mt-5 bg-white py-4 rounded-3xl items-center border border-slate-200/80 shadow-sm`}
          >
            <Text style={tw`text-sm font-bold text-slate-600`}>Back to Settings</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
