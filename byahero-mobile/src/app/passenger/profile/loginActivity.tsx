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
        const res = await fetch(`${serverUrl}/passenger/profile/loginActivity.php?json=1`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data && data.success && Array.isArray(data.activity)) {
          setActivities(data.activity);
        }
      } catch (err) {
        console.warn('Failed to load online login activity:', err);
        setActivities([
          {
            browser: 'Expo Mobile App',
            device: 'Mobile',
            ip_address: 'Local Device',
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
    const dev = device.toLowerCase();
    if (dev.includes('mobile') || dev.includes('phone')) return 'smartphone';
    if (dev.includes('tablet')) return 'tablet';
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

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Login Activity" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-slate-100`}>
            <Text style={tw`text-lg font-black text-slate-800 mb-1`}>Login Activity</Text>
            <Text style={tw`text-xs text-slate-400 font-medium mb-5`}>Recent sessions where your account was accessed</Text>

            {isLoading ? (
              <View style={tw`py-10`}>
                <ActivityIndicator size="large" color="#1e3a8a" />
              </View>
            ) : activities.length === 0 ? (
              <View style={tw`items-center py-10`}>
                <MaterialIcons name="history" size={48} color="#94a3b8" />
                <Text style={tw`text-sm font-semibold text-slate-400 mt-3`}>No login activity to display</Text>
              </View>
            ) : (
              <View style={tw`gap-4`}>
                {activities.map((act, index) => (
                  <View 
                    key={index}
                    style={[
                      tw`flex-row items-start py-3.5`,
                      index < activities.length - 1 && tw`border-b border-slate-100`
                    ]}
                  >
                    <View style={tw`w-11 h-11 rounded-full bg-[#dbeafe] justify-center items-center mr-3.5 flex-shrink-0`}>
                      <MaterialIcons 
                        name={getDeviceIcon(act.device || '')} 
                        size={20} 
                        color="#1e3a8a" 
                      />
                    </View>

                    <View style={tw`flex-grow`}>
                      <View style={tw`flex-row items-center flex-wrap mb-1`}>
                        <Text style={tw`text-sm font-black text-slate-800 mr-2`}>
                          {act.browser} on {act.device || 'Unknown'}
                        </Text>
                        {index === 0 && (
                          <View style={tw`bg-blue-50 border border-blue-100 rounded-full px-2 py-0.5`}>
                            <Text style={tw`text-[10px] font-bold text-blue-700`}>Current Session</Text>
                          </View>
                        )}
                      </View>

                      <View style={tw`flex-row items-center flex-wrap`}>
                        <MaterialIcons name="schedule" size={14} color="#94a3b8" style={tw`mr-1`} />
                        <Text style={tw`text-xs text-slate-400 font-semibold mr-3`}>
                          {formatTimeAgo(act.created_at)}
                        </Text>
                        <MaterialIcons name="location-on" size={14} color="#94a3b8" style={tw`mr-0.5`} />
                        <Text style={tw`text-xs text-slate-400 font-semibold`}>
                          {act.ip_address}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Security Banner */}
            <View style={tw`flex-row items-center bg-blue-50 border border-blue-100 rounded-2xl p-4 mt-5`}>
              <MaterialIcons name="info" size={20} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`text-xs text-blue-700/90 leading-relaxed flex-1`}>
                <Text style={tw`font-bold`}>Security Tip:</Text> If you see suspicious active sessions, change your password immediately.
              </Text>
            </View>

            <TouchableOpacity 
              onPress={() => router.back()}
              style={tw`mt-5 bg-slate-100 py-3.5 rounded-2xl items-center border border-slate-200`}
            >
              <Text style={tw`text-sm font-bold text-slate-500`}>Back to Settings</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
