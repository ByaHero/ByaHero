import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, RefreshControl, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface Bus {
  Bus_ID?: number | string;
  id?: number | string;
  code?: string;
  status?: string;
}

export default function AdminBuses() {
  const [buses, setBuses] = useState<Bus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [newBusCode, setNewBusCode] = useState('');
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);

  // Local state for dropdown edits
  const [editedStatuses, setEditedStatuses] = useState<Record<string, string>>({});

  const fetchBuses = async () => {
    try {
      const data = await adminService.listBuses();
      if (data.success && data.buses) {
        setBuses(data.buses);
        const initialStatuses: Record<string, string> = {};
        data.buses.forEach((b: Bus) => {
          const id = (b.Bus_ID || b.id)?.toString();
          if (id) {
            initialStatuses[id] = b.status?.toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
          }
        });
        setEditedStatuses(initialStatuses);
      } else {
        setBuses([]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch buses.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchBuses();
  };

  useEffect(() => {
    fetchBuses();
  }, []);

  const handleAddBus = async () => {
    if (!newBusCode.trim()) {
      Alert.alert('Error', 'Please enter a bus code before saving.');
      return;
    }
    setSaving(true);
    try {
      const data = await adminService.addBus({
        code: newBusCode.trim()
      });
      if (data.success) {
        Alert.alert('Success', `Bus ${newBusCode.trim()} added successfully.`);
        setNewBusCode('');
        fetchBuses();
      } else {
        Alert.alert('Error', data.message || data.error || 'Failed to add bus.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while adding bus.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = (id: string | number, code: string) => {
    Alert.alert(
      'Delete Bus',
      `Are you sure you want to permanently delete ${code}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.deleteBus(Number(id));
              if (data.success) {
                Alert.alert('Success', 'Bus deleted successfully.');
                fetchBuses();
              } else {
                Alert.alert('Error', data.error || data.message || 'Failed to delete bus.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting bus.');
            }
          }
        }
      ]
    );
  };

  const handleSaveStatus = async (id: string | number) => {
    const stringId = id.toString();
    const newStatus = editedStatuses[stringId];
    
    const bus = buses.find(b => (b.Bus_ID || b.id)?.toString() === stringId);
    const originalStatus = bus?.status?.toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
    
    if (newStatus === originalStatus) return; // No change

    setUpdatingId(id);
    try {
      const data = await adminService.updateBus({
        id,
        status: newStatus
      });
      if (data.success) {
        fetchBuses();
        Alert.alert('Success', 'Bus status updated.');
      } else {
        Alert.alert('Error', data.message || data.error || 'Failed to update status.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  const promptStatusUpdate = (busId: string, currentStatus: string) => {
    if (updatingId === busId) return;
    Alert.alert(
      'Change Status',
      'Select new status:',
      [
        { text: 'Available', onPress: () => {
          setEditedStatuses(prev => ({ ...prev, [busId]: 'available' }));
        }},
        { text: 'Unavailable', onPress: () => {
          setEditedStatuses(prev => ({ ...prev, [busId]: 'unavailable' }));
        }},
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="BUS FLEET" />

      {/* Add Bus Card */}
      <View style={tw`bg-white rounded-3xl p-5 mx-5 mt-5 mb-6 shadow-sm border border-slate-100`}>
        <Text style={tw`text-slate-900 text-[16px] font-extrabold mb-3`}>Add New Bus</Text>
        <TextInput 
          style={tw`w-full border border-slate-200 rounded-xl p-3 px-4 text-slate-800 mb-4 bg-slate-50`}
          placeholder="e.g. Bus 00001"
          value={newBusCode}
          onChangeText={setNewBusCode}
        />
        <View style={tw`flex-row justify-end`}>
          <TouchableOpacity 
            style={tw`bg-[#1d4ed8] px-6 py-2.5 rounded-full flex-row items-center justify-center shadow-sm ${saving ? 'opacity-70' : ''}`}
            onPress={handleAddBus}
            disabled={saving}
          >
            {saving ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
            <Text style={tw`text-white font-bold text-[13px]`}>Save Bus</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={tw`text-slate-900 text-[16px] font-extrabold mb-3 mx-6`}>All Buses</Text>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`px-5 pb-10`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
          {buses.length === 0 ? (
            <View style={tw`items-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm`}>
              <Ionicons name="bus-outline" size={48} color="#e2e8f0" style={tw`mb-4`} />
              <Text style={tw`text-slate-500 font-medium`}>No buses found. Add one above.</Text>
            </View>
          ) : (
            buses.map((bus) => {
              const busId = (bus.Bus_ID || bus.id)?.toString() || '';
              const currentEditedStatus = editedStatuses[busId] || 'available';
              const isUnavailable = currentEditedStatus === 'unavailable';
              const isUpdating = updatingId === busId;
              const originalStatus = bus.status?.toLowerCase() === 'unavailable' ? 'unavailable' : 'available';
              const hasChanges = currentEditedStatus !== originalStatus;

              return (
                <View key={busId} style={tw`bg-white rounded-3xl p-4 shadow-sm border border-slate-200 mb-4 flex-row items-center`}>
                  <View style={tw`w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mr-3 border border-blue-100`}>
                    <Ionicons name="bus" size={28} color="#1d4ed8" />
                  </View>
                  
                  <View style={tw`flex-1`}>
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Code</Text>
                      <Text style={tw`text-slate-800 font-extrabold text-[15px]`}>{bus.code}</Text>
                    </View>

                    <View style={tw`flex-row justify-between items-center mb-3`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Status</Text>
                      <TouchableOpacity 
                        onPress={() => promptStatusUpdate(busId, currentEditedStatus)}
                        disabled={isUpdating}
                        style={tw`flex-row items-center px-3 py-1 rounded-full border ${isUnavailable ? 'bg-[#ffccd5] border-[#ffb3c1]' : 'bg-green-100 border-green-200'}`}
                      >
                        <Text style={tw`text-[10px] font-bold uppercase mr-1 ${isUnavailable ? 'text-[#c1121f]' : 'text-green-700'}`}>
                          {currentEditedStatus}
                        </Text>
                        <Ionicons name="chevron-down" size={12} color={isUnavailable ? '#c1121f' : '#15803d'} />
                      </TouchableOpacity>
                    </View>

                    <View style={tw`flex-row justify-between items-center mt-1`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Actions</Text>
                      <View style={tw`flex-row gap-2`}>
                        {hasChanges && (
                          <TouchableOpacity 
                            onPress={() => handleSaveStatus(busId)}
                            disabled={isUpdating}
                            style={tw`bg-[#1d4ed8] px-4 py-1.5 rounded-full flex-row items-center shadow-sm`}
                          >
                            {isUpdating ? <ActivityIndicator size="small" color="white" style={tw`mr-1`} /> : null}
                            <Text style={tw`text-white font-bold text-[11px]`}>Save</Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity 
                          onPress={() => executeDelete(busId, bus.code || '')}
                          disabled={isUpdating}
                          style={tw`bg-red-50 border border-red-100 px-3 py-1.5 rounded-full shadow-sm`}
                        >
                          <Text style={tw`text-red-600 font-bold text-[11px]`}>Delete</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
