import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { getWaitingPassengerCount } from '../services/conductorService';

export default function WaitingPaxScreen() {
  const [totalCount, setTotalCount] = useState(0);
  const [locations, setLocations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchWaitCount();
    const interval = setInterval(fetchWaitCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const fetchWaitCount = async () => {
    setIsLoading(true);
    try {
      const res = await getWaitingPassengerCount();
      if (res && res.success) {
        setTotalCount(res.total || 0);
        setLocations(res.locations || []);
      }
    } catch (e) {
      console.error('Error fetching waiting passengers count:', e);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      {/* Header */}
      <View style={tw`bg-[#0f3878] px-5 py-3.5 flex-row items-center gap-3 shadow-md`}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="close" size={24} color="white" />
        </TouchableOpacity>
        <Text style={tw`text-white text-base font-extrabold`}>Wait Count</Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-5`} style={tw`flex-1`}>
        {/* Total waiting count badge container */}
        <View style={tw`bg-white rounded-3xl p-6 border border-slate-200 shadow-sm items-center mb-6`}>
          <Text style={tw`text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2`}>
            Total Passengers Waiting
          </Text>
          <View style={tw`bg-[#0f3878] rounded-full px-6 py-2.5 flex-row items-center gap-2`}>
            <Text style={tw`text-white text-2xl font-black`}>{totalCount}</Text>
            <Text style={tw`text-white text-sm font-semibold`}>passengers</Text>
          </View>
        </View>

        {/* Wait list per stop */}
        <View style={tw`gap-3`}>
          {locations.map((loc, idx) => (
            <View
              key={idx}
              style={tw`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex-row justify-between items-center`}
            >
              <View style={tw`flex-row items-center gap-2.5 flex-1`}>
                <Ionicons name="location" size={20} color="#0f3878" />
                <Text style={tw`text-slate-800 font-bold text-sm flex-1`} numberOfLines={1}>
                  {loc.location_name}
                </Text>
              </View>
              <View style={tw`bg-[#0f3878] rounded-full px-3.5 py-1.5`}>
                <Text style={tw`text-white text-xs font-extrabold`}>{loc.count} waiting</Text>
              </View>
            </View>
          ))}

          {locations.length === 0 && !isLoading && (
            <View style={tw`bg-white rounded-2xl p-8 border border-slate-200 shadow-sm items-center py-10`}>
              <Ionicons name="people-outline" size={48} color="#94a3b8" style={tw`mb-2`} />
              <Text style={tw`text-slate-500 font-bold text-sm`}>No passengers waiting right now.</Text>
              <Text style={tw`text-slate-400 text-xs mt-1`}>Waiting lists update in real-time.</Text>
            </View>
          )}

          {isLoading && locations.length === 0 && (
            <View style={tw`py-10`}>
              <ActivityIndicator color="#0f3878" size="large" />
            </View>
          )}
        </View>

        {/* Auto Refresh Info */}
        <View style={tw`mt-8 items-center`}>
          <View style={tw`flex-row items-center gap-1.5`}>
            <Ionicons name="sync" size={14} color="#94a3b8" />
            <Text style={tw`text-slate-400 text-xs font-semibold`}>Auto-refreshes every 15 seconds</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
