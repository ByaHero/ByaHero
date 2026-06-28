import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, ActivityIndicator, RefreshControl, Animated } from 'react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface ActiveBus {
  Bus_ID: number;
  code: string;
  status: string;
  conductor_email: string;
}

export default function ActiveBusesPage() {
  const insets = useSafeAreaInsets();
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const fetchActiveBuses = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/active-buses`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.activeBuses) {
        setBuses(data.activeBuses);
      } else {
        setBuses([]);
      }
    } catch (error) {
      console.error('Error fetching active buses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchActiveBuses();
  }, [fetchActiveBuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveBuses();
  };

  return (
    <ScrollView 
      style={tw`flex-1 bg-white`} 
      contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 70, paddingBottom: 60, flexGrow: 1 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f3878" />}
    >
      <View style={tw`mb-6 mt-2 ml-1`}>
        <Text style={tw`text-[#0f3878] text-[17px] font-extrabold tracking-wide mb-1`}>Active Buses</Text>
        <View style={tw`flex-row items-center`}>
          <Animated.View style={[tw`w-1.5 h-1.5 rounded-full bg-blue-500 mr-1.5`, { opacity: pulseAnim }]} />
          <Text style={tw`text-blue-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#0f3878" style={tw`mt-10`} />
      ) : buses.length > 0 ? (
        buses.map((bus) => {
          const isUnavailable = bus.status?.toLowerCase() === 'unavailable';
          return (
            <View key={bus.Bus_ID} style={tw`bg-white rounded-2xl p-4 pb-5 mb-4 shadow-sm border border-slate-100 flex-row`}>
              <View style={tw`w-[25%] justify-center items-center`}>
                <Image 
                  source={require('../../../assets/images/images/busonallbuses.svg')} 
                  style={tw`w-[54px] h-[54px]`} 
                  contentFit="contain" 
                />
              </View>
              <View style={tw`w-[75%] pl-2`}>
                
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-slate-400 text-[13px]`}>Code</Text>
                  <Text style={tw`text-slate-800 font-bold text-[13px]`}>{bus.code}</Text>
                </View>

                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-slate-400 text-[13px]`}>Status</Text>
                  <View style={isUnavailable ? tw`bg-[#ffccd5] px-3 py-1 rounded-full` : tw`bg-green-100 px-3 py-1 rounded-full`}>
                    <Text style={isUnavailable ? tw`text-[#c1121f] text-[10px] font-bold uppercase` : tw`text-green-700 text-[10px] font-bold uppercase`}>
                      {bus.status || 'AVAILABLE'}
                    </Text>
                  </View>
                </View>
                
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`text-slate-400 text-[13px]`}>Conductor</Text>
                  <Text style={tw`text-slate-600 text-[12px] font-medium`} numberOfLines={1} ellipsizeMode="tail">
                    {bus.conductor_email || 'N/A'}
                  </Text>
                </View>

              </View>
            </View>
          );
        })
      ) : (
        <View style={tw`flex-1 justify-center items-center pb-20`}>
          <Text style={tw`text-slate-500 font-medium`}>No active buses right now.</Text>
        </View>
      )}

    </ScrollView>
  );
}
