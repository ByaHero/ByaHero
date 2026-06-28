import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Image } from 'expo-image';
import tw from 'twrnc';
import { FontAwesome5, Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';

interface Bus {
  Bus_ID?: number | string;
  id?: number | string;
  code?: string;
  status?: string;
}

export default function BusesPage() {
  const insets = useSafeAreaInsets();
  
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newBusCode, setNewBusCode] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchBuses = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/buses`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success && data.buses) {
        setBuses(data.buses);
      } else {
        setBuses([]);
      }
    } catch (error) {
      console.error('Error fetching buses:', error);
      Alert.alert('Error', 'Failed to load buses from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchBuses();
  }, [fetchBuses]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchBuses();
  };

  const handleAddBus = async () => {
    if (!newBusCode.trim()) {
      Alert.alert('Validation Error', 'Please enter a bus code.');
      return;
    }
    setSaving(true);
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/buses`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'add_bus', code: newBusCode.trim() })
      });
      const data = await response.json();
      if (data.success) {
        setNewBusCode('');
        fetchBuses();
      } else {
        Alert.alert('Error', data.message || 'Failed to add bus.');
      }
    } catch (error) {
      console.error('Error adding bus:', error);
      Alert.alert('Error', 'Network error occurred while adding bus.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = async (id: string | number) => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/buses`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete_bus', id })
      });
      
      if (!response.ok) {
        const text = await response.text();
        Alert.alert('Server Error', `Status ${response.status}: ${text}`);
        return;
      }

      const data = await response.json();
      if (data.success) {
        fetchBuses();
      } else {
        Alert.alert('Error', data.error || data.message || 'Failed to delete bus.');
      }
    } catch (error) {
      console.error('Error deleting bus:', error);
      Alert.alert('Network Error', error instanceof Error ? error.message : String(error));
    }
  };

  const handleDeleteBus = (id: string | number, code: string) => {
    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete bus ${code}? (ID: ${id})`)) {
        executeDelete(id);
      }
    } else {
      Alert.alert('Delete Bus', `Are you sure you want to delete bus ${code}? (ID: ${id})`, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: () => executeDelete(id) }
      ]);
    }
  };

  const handleToggleStatus = async (id: string | number, currentStatus: string) => {
    const newStatus = currentStatus.toLowerCase() === 'available' ? 'unavailable' : 'available';
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/buses`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'update_bus', id, status: newStatus })
      });
      const data = await response.json();
      if (data.success) {
        fetchBuses();
      } else {
        Alert.alert('Error', data.message || 'Failed to update status.');
      }
    } catch (error) {
      console.error('Error updating bus status:', error);
      Alert.alert('Error', 'Network error occurred while updating status.');
    }
  };

  return (
    <ScrollView 
      style={tw`flex-1 bg-[#f8f9fa]`} 
      contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 70, paddingBottom: 60 }]}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f3878" />}
    >
      
      {/* Add Bus Card */}
      <View style={tw`bg-white rounded-2xl p-5 mb-6 border border-slate-100 shadow-sm`}>
        <Text style={tw`text-[#0f3878] text-[17px] font-extrabold mb-4 tracking-wide`}>Add Bus</Text>
        <TextInput 
          style={tw`border border-slate-200 rounded-xl p-3 px-4 text-slate-800 mb-4 bg-white`}
          placeholder="Bus 00001"
          placeholderTextColor="#94a3b8"
          value={newBusCode}
          onChangeText={setNewBusCode}
        />
        <View style={tw`items-end`}>
          <TouchableOpacity 
            style={tw`bg-[#1d4ed8] px-6 py-2 rounded-full shadow-sm flex-row items-center`}
            onPress={handleAddBus}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="#ffffff" style={tw`mr-2`} /> : null}
            <Text style={tw`text-white font-bold text-[13px]`}>Save</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* All Buses Header */}
      <Text style={tw`text-[#0f3878] text-[17px] font-extrabold mb-4 ml-1 tracking-wide`}>All Buses</Text>

      {loading && !refreshing ? (
        <ActivityIndicator size="large" color="#0f3878" style={tw`mt-10`} />
      ) : (
        buses.map((bus) => {
          const isUnavailable = bus.status?.toLowerCase() === 'unavailable';
          return (
            <View key={bus.Bus_ID || bus.id} style={tw`bg-white rounded-2xl p-4 pb-5 mb-4 shadow-sm border border-slate-100 flex-row`}>
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

                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <Text style={tw`text-slate-400 text-[13px]`}>Status</Text>
                  <View style={isUnavailable ? tw`bg-[#ffccd5] px-3 py-1 rounded-full` : tw`bg-green-100 px-3 py-1 rounded-full`}>
                    <Text style={isUnavailable ? tw`text-[#c1121f] text-[10px] font-bold uppercase` : tw`text-green-700 text-[10px] font-bold uppercase`}>
                      {bus.status || 'AVAILABLE'}
                    </Text>
                  </View>
                </View>

                <View style={tw`flex-row justify-between items-center mb-4`}>
                  <Text style={tw`text-slate-400 text-[13px]`}>Actions</Text>
                  <TouchableOpacity 
                    onPress={() => handleToggleStatus((bus.Bus_ID || bus.id) as string | number, bus.status || 'available')}
                    style={tw`border border-slate-200 rounded-full px-3 py-1.5 flex-row items-center`}
                  >
                    <Text style={tw`text-slate-700 text-[11px] mr-2`}>
                      {isUnavailable ? 'Set Available' : 'Set Unavailable'}
                    </Text>
                    <Ionicons name="swap-horizontal" size={14} color="#64748b" />
                  </TouchableOpacity>
                </View>

                <View style={tw`flex-row justify-end gap-2`}>
                  <TouchableOpacity style={tw`bg-[#b91c1c] px-5 py-2 rounded-full`} onPress={() => handleDeleteBus((bus.Bus_ID || bus.id) as string | number, bus.code || '')}>
                    <Text style={tw`text-white font-bold text-[12px]`}>Delete</Text>
                  </TouchableOpacity>
                </View>

              </View>
            </View>
          );
        })
      )}
      
      {!loading && buses.length === 0 && (
        <Text style={tw`text-center text-slate-500 mt-10`}>No buses found. Add one above.</Text>
      )}

    </ScrollView>
  );
}
