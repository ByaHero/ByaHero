import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface ActiveBus {
  Bus_ID: number;
  code: string;
  status: string;
  conductor_email: string;
}

export default function AdminActiveBuses() {
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulse, setPulse] = useState(true);

  const fetchActiveBuses = async () => {
    try {
      const data = await adminService.listActiveBuses();
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
  };

  useEffect(() => {
    fetchActiveBuses();
    
    // Pulse animation simulation
    const pulseInterval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(pulseInterval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveBuses();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="ACTIVE BUSES" />

      <View style={tw`p-5 pb-3 flex-row justify-between items-center`}>
        <View>
          <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight mb-1`}>Active Buses</Text>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-1.5 h-1.5 rounded-full bg-blue-500 mr-2`, { opacity: pulse ? 1 : 0.3 }]} />
            <Text style={tw`text-blue-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={onRefresh}
          disabled={refreshing}
          style={tw`p-2.5 rounded-full bg-white shadow-sm border border-slate-200`}
        >
          <Ionicons name="refresh" size={20} color="#0f3878" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0f3878" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`p-5 pt-2 pb-10`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f3878" />}
        >
          {buses.length > 0 ? (
            buses.map((bus) => {
              const isUnavailable = bus.status?.toLowerCase() === 'unavailable';
              return (
                <View key={bus.Bus_ID} style={tw`bg-white rounded-3xl p-4 mb-4 shadow-sm border border-slate-100 flex-row items-center`}>
                  <View style={tw`w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mr-4 border border-blue-100`}>
                    <Ionicons name="bus" size={28} color="#1d4ed8" />
                  </View>
                  <View style={tw`flex-1`}>
                    
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Code</Text>
                      <Text style={tw`text-slate-800 font-extrabold text-[15px]`}>{bus.code}</Text>
                    </View>

                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Status</Text>
                      <View style={tw`px-3 py-1 rounded-full ${isUnavailable ? 'bg-[#ffccd5]' : 'bg-green-100'}`}>
                        <Text style={tw`${isUnavailable ? 'text-[#c1121f]' : 'text-green-700'} text-[9px] font-bold uppercase tracking-wider`}>
                          {bus.status || 'AVAILABLE'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={tw`flex-row justify-between items-center`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Conductor</Text>
                      <Text style={tw`text-slate-600 text-[12px] font-medium max-w-[60%]`} numberOfLines={1}>
                        {bus.conductor_email || 'N/A'}
                      </Text>
                    </View>

                  </View>
                </View>
              );
            })
          ) : (
            <View style={tw`items-center py-12 bg-white rounded-3xl border border-dashed border-slate-300`}>
              <Ionicons name="bus-outline" size={48} color="#cbd5e1" style={tw`mb-3`} />
              <Text style={tw`text-slate-500 font-medium text-[14px]`}>No active buses right now.</Text>
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
