import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Alert, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';

interface Snapshot {
  snapshot_id: string;
  label: string;
  created_at: string;
}

interface FareRow {
  fare_id: number;
  direction: string;
  distance_km: number;
  stop_name: string;
  regular_fare: number;
  discounted_fare: number;
}

interface FareData {
  fares: FareRow[];
  snapshots: Snapshot[];
}

export default function AdminFares() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FareData | null>(null);
  const [directionFilter, setDirectionFilter] = useState<'LT' | 'TL'>('LT');

  // Matrix Generator form
  const [baseKm, setBaseKm] = useState('4');
  const [regBase, setRegBase] = useState('14.00');
  const [discBase, setDiscBase] = useState('11.25');
  const [regRate, setRegRate] = useState('2.20');
  const [discRate, setDiscRate] = useState('1.76');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const resData = await apiRequest('/api/admin/fares');
      if (resData.success !== false) {
        setData(resData as FareData);
      } else {
        Alert.alert('Error', resData.error || 'Failed to fetch data.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error while fetching data.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleAction = async (actionName: string, bodyData: any) => {
    try {
      const res = await apiRequest('/api/admin/fares', {
        method: 'POST',
        body: JSON.stringify({ action: actionName, ...bodyData })
      });
      if (res.success) {
        Alert.alert('Success', res.message || 'Action successful.');
        fetchData();
      } else {
        Alert.alert('Error', res.error || 'Action failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Server connection failed.');
    }
  };

  const confirmGenerateMatrix = () => {
    Alert.alert(
      'Generate Matrix',
      'WARNING: This will instantly overwrite all rows with mathematical matrix calculations. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: () => handleAction('generate_matrix', { 
            base_km: baseKm, 
            reg_base: regBase, 
            disc_base: discBase, 
            reg_rate: regRate, 
            disc_rate: discRate 
          })
        }
      ]
    );
  };

  // Extract fares for current direction
  const displayFares = data?.fares?.filter(f => f.direction === directionFilter) || [];

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Bus Fares" />

      <View style={tw`p-5 pb-2`}>
        <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Manage Bus Fares</Text>
        <Text style={tw`text-slate-500 text-[13px] mt-0.5 mb-5`}>Configure compact fare matrix (62 rows)</Text>
      </View>

      <ScrollView contentContainerStyle={tw`pb-10`}>
        {/* Matrix Generator */}
        <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
          <View style={tw`flex-row items-center mb-4`}>
            <Ionicons name="calculator" size={20} color="#1d4ed8" style={tw`mr-2`} />
            <Text style={tw`font-bold text-slate-800 text-[15px]`}>Matrix Generator (LTFRB)</Text>
          </View>
          
          <View style={tw`flex-row flex-wrap justify-between`}>
            <View style={tw`w-[48%] mb-4`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Base Distance (km)</Text>
              <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={baseKm} onChangeText={setBaseKm} keyboardType="numeric" />
            </View>
            <View style={tw`w-[48%] mb-4`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Reg Base Fare (₱)</Text>
              <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={regBase} onChangeText={setRegBase} keyboardType="numeric" />
            </View>
            <View style={tw`w-[48%] mb-4`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Reg Exceed Rate</Text>
              <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={regRate} onChangeText={setRegRate} keyboardType="numeric" />
            </View>
            <View style={tw`w-[48%] mb-4`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Disc Exceed Rate</Text>
              <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={discRate} onChangeText={setDiscRate} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity onPress={confirmGenerateMatrix} style={tw`bg-[#1d4ed8] w-full py-4 rounded-xl items-center flex-row justify-center`}>
            <Ionicons name="flash" size={16} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-bold text-[14px]`}>Generate All Rows</Text>
          </TouchableOpacity>
        </View>

        {/* Route Fare Matrix */}
        <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200 mx-5`}>
          <View style={tw`bg-slate-50 p-5 border-b border-slate-200 flex-row justify-between items-center`}>
            <View style={tw`flex-row items-center`}>
              <Ionicons name="list" size={20} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[15px]`}>Fare Matrix Rules</Text>
            </View>
            
            <View style={tw`flex-row bg-slate-200 rounded-lg p-1`}>
              <TouchableOpacity onPress={() => setDirectionFilter('LT')} style={tw`px-3 py-1.5 rounded-md ${directionFilter === 'LT' ? 'bg-white shadow-sm' : ''}`}>
                <Text style={tw`font-bold text-[12px] ${directionFilter === 'LT' ? 'text-blue-700' : 'text-slate-500'}`}>LRL ➔ TAN</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => setDirectionFilter('TL')} style={tw`px-3 py-1.5 rounded-md ${directionFilter === 'TL' ? 'bg-white shadow-sm' : ''}`}>
                <Text style={tw`font-bold text-[12px] ${directionFilter === 'TL' ? 'text-blue-700' : 'text-slate-500'}`}>TAN ➔ LRL</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Table */}
          <View style={tw`bg-white`}>
            <View>
              {/* Header Row */}
              <View style={tw`flex-row bg-slate-100 border-b border-slate-300 w-full`}>
                <View style={tw`w-[15%] p-3 justify-center items-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>KM</Text>
                </View>
                <View style={tw`flex-1 p-3 justify-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Particulars</Text>
                </View>
                <View style={tw`w-[22%] p-3 justify-center items-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Reg (₱)</Text>
                </View>
                <View style={tw`w-[22%] p-3 justify-center items-center`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Disc (₱)</Text>
                </View>
              </View>

              {/* Rows */}
              {loading ? (
                <View style={tw`py-10 items-center justify-center w-full`}>
                  <ActivityIndicator size="small" color="#1d4ed8" />
                </View>
              ) : displayFares.length === 0 ? (
                <View style={tw`py-10 items-center justify-center w-full bg-slate-50`}>
                  <Text style={tw`text-slate-500 font-medium text-[13px]`}>
                    No fares found for this direction.
                  </Text>
                </View>
              ) : (
                displayFares.map((f, i) => (
                  <View key={f.fare_id} style={tw`flex-row border-b border-slate-100 w-full`}>
                    <View style={tw`w-[15%] p-3 justify-center items-center border-r border-slate-100`}>
                      <Text style={tw`font-medium text-slate-600 text-[12px]`}>{f.distance_km}</Text>
                    </View>
                    <View style={tw`flex-1 p-3 justify-center border-r border-slate-100`}>
                      <Text style={tw`font-bold text-slate-700 text-[12px] uppercase`} numberOfLines={1}>{f.stop_name}</Text>
                    </View>
                    <View style={tw`w-[22%] p-3 items-end justify-center border-r border-slate-100 bg-slate-50/50`}>
                      <Text style={tw`font-mono font-bold text-slate-800 text-[12px]`} numberOfLines={1}>{Number(f.regular_fare).toFixed(2)}</Text>
                    </View>
                    <View style={tw`w-[22%] p-3 items-end justify-center bg-green-50/30`}>
                      <Text style={tw`font-mono font-bold text-green-700 text-[12px]`} numberOfLines={1}>{Number(f.discounted_fare).toFixed(2)}</Text>
                    </View>
                  </View>
                ))
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
