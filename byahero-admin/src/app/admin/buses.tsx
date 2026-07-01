import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, RefreshControl, Image, Modal } from 'react-native';
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

  // Modal states
  const [successModal, setSuccessModal] = useState({ visible: false, message: '', type: 'add' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ visible: false, busId: '', busCode: '' });

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
        setSuccessModal({ visible: true, message: `Bus ${newBusCode.trim()} has been added.`, type: 'add' });
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
    setDeleteConfirmModal({ visible: true, busId: id.toString(), busCode: code });
  };

  const confirmDelete = async () => {
    const { busId, busCode } = deleteConfirmModal;
    setDeleteConfirmModal({ visible: false, busId: '', busCode: '' });
    try {
      const data = await adminService.deleteBus(Number(busId));
      if (data.success) {
        setSuccessModal({ visible: true, message: `Bus ${busCode} has been deleted.`, type: 'delete' });
        fetchBuses();
      } else {
        Alert.alert('Error', data.error || data.message || 'Failed to delete bus.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while deleting bus.');
    }
  };

  const handleToggleStatus = async (busId: string, currentStatus: string) => {
    if (updatingId === busId) return;
    
    const newStatus = currentStatus === 'unavailable' ? 'available' : 'unavailable';
    
    // Optimistically update the UI
    setEditedStatuses(prev => ({ ...prev, [busId]: newStatus }));
    setUpdatingId(busId);
    
    try {
      const data = await adminService.updateBus({
        id: Number(busId),
        status: newStatus
      });
      if (data.success) {
        // Refetch to sync if needed, but UI is already updated
        // fetchBuses();
      } else {
        // Revert on failure
        setEditedStatuses(prev => ({ ...prev, [busId]: currentStatus }));
        Alert.alert('Error', data.message || data.error || 'Failed to update status.');
      }
    } catch (e) {
      setEditedStatuses(prev => ({ ...prev, [busId]: currentStatus }));
      Alert.alert('Error', 'Network error while updating status.');
    } finally {
      setUpdatingId(null);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Total Buses" />

      {/* Success Modal */}
      <Modal visible={successModal.visible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-5`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-lg`}>
            <View style={tw`w-16 h-16 ${successModal.type === 'delete' ? 'bg-red-100' : 'bg-green-100'} rounded-full items-center justify-center mb-4`}>
              <Ionicons name={successModal.type === 'delete' ? 'trash' : 'checkmark-circle'} size={40} color={successModal.type === 'delete' ? '#dc2626' : '#16a34a'} />
            </View>
            <Text style={tw`text-[#0f3878] text-xl font-black mb-2 text-center`}>
              {successModal.type === 'delete' ? 'Bus Deleted' : 'Bus Added'}
            </Text>
            <Text style={tw`text-slate-500 text-sm text-center font-medium mb-6`}>
              {successModal.message}
            </Text>
            <TouchableOpacity 
              onPress={() => setSuccessModal({ ...successModal, visible: false })} 
              style={tw`bg-[#1d4ed8] w-full py-3.5 rounded-full items-center shadow-sm`}
            >
              <Text style={tw`text-white font-bold tracking-wide`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleteConfirmModal.visible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-5`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-lg`}>
            <View style={tw`w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4`}>
              <Ionicons name="warning" size={40} color="#ea580c" />
            </View>
            <Text style={tw`text-[#0f3878] text-xl font-black mb-2 text-center`}>Delete Bus?</Text>
            <Text style={tw`text-slate-500 text-sm text-center font-medium mb-6`}>
              Are you sure you want to permanently delete {deleteConfirmModal.busCode}? This action cannot be undone.
            </Text>
            <View style={tw`flex-row w-full gap-3`}>
              <TouchableOpacity 
                onPress={() => setDeleteConfirmModal({ visible: false, busId: '', busCode: '' })} 
                style={tw`flex-1 py-3.5 bg-slate-200 rounded-full items-center shadow-sm`}
              >
                <Text style={tw`text-slate-700 font-bold tracking-wide`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmDelete} 
                style={tw`flex-1 py-3.5 bg-red-600 rounded-full items-center shadow-sm`}
              >
                <Text style={tw`text-white font-bold tracking-wide`}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

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
                        onPress={() => handleToggleStatus(busId, currentEditedStatus)}
                        disabled={isUpdating}
                        style={tw`flex-row items-center px-3 py-1 rounded-full border ${isUnavailable ? 'bg-[#ffccd5] border-[#ffb3c1]' : 'bg-green-100 border-green-200'} ${isUpdating ? 'opacity-50' : ''}`}
                      >
                        <Text style={tw`text-[10px] font-bold uppercase mr-1 ${isUnavailable ? 'text-[#c1121f]' : 'text-green-700'}`}>
                          {currentEditedStatus}
                        </Text>
                        {/* We use Image here to import swap.svg, applying tintColor if supported or just the default SVG colors */}
                        <Image source={require('../../../assets/images/swap.svg')} style={[tw`w-3 h-3`, { tintColor: isUnavailable ? '#c1121f' : '#15803d' }]} />
                      </TouchableOpacity>
                    </View>

                    <View style={tw`flex-row justify-between items-center mt-1`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Actions</Text>
                      <View style={tw`flex-row gap-2`}>
                        {isUpdating && <ActivityIndicator size="small" color="#1d4ed8" style={tw`mr-2`} />}
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
