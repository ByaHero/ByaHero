import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';

interface BusStop {
  id: number;
  name: string;
  type: string;
  route: string;
  location_name: string;
  location_landmark: string | null;
  lat: number | string;
  lng: number | string;
  sort_order: number;
}

export default function AdminStops() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [stops, setStops] = useState<BusStop[]>([]);
  const [stopsForward, setStopsForward] = useState<BusStop[]>([]);
  const [stopsReverse, setStopsReverse] = useState<BusStop[]>([]);

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('bus_stop');
  const [route, setRoute] = useState('LAUREL - TANAUAN');
  const [locationName, setLocationName] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const fetchStops = async () => {
    try {
      const data = await adminService.listStops();
      if (data.success) {
        setStops(data.stops || []);
        setStopsForward(data.stopsForward || []);
        setStopsReverse(data.stopsReverse || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch stops.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStops();
  };

  useEffect(() => {
    fetchStops();
  }, []);

  const openAddModal = () => {
    setName('');
    setType('bus_stop');
    setRoute('LAUREL - TANAUAN');
    setLocationName('');
    setLocationLandmark('');
    setLat('14.0833'); // Default somewhat near Tanauan/Laurel
    setLng('121.0333');
    setIsFormOpen(true);
  };

  const handleSaveStop = async () => {
    if (!name || !locationName) {
      Alert.alert('Error', 'Name and Location Name are required.');
      return;
    }
    if (!lat || !lng) {
      Alert.alert('Error', 'Latitude and Longitude are required.');
      return;
    }

    setSaving(true);
    try {
      const data = await apiRequest('/api/admin/stops', {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_stop',
          name, type, route,
          location_name: locationName,
          location_landmark: locationLandmark,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        })
      });
      
      if (data.success) {
        Alert.alert('Success', 'Stop saved successfully.');
        setIsFormOpen(false);
        fetchStops();
      } else {
        Alert.alert('Error', data.error || 'Failed to add stop.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while saving.');
    } finally {
      setSaving(false);
    }
  };

  const executeDelete = (id: number, stopName: string) => {
    Alert.alert(
      'Delete Stop',
      `Are you sure you want to permanently delete ${stopName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.deleteStop(id);
              if (data.success) {
                Alert.alert('Success', 'Stop deleted.');
                fetchStops();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete stop.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error.');
            }
          }
        }
      ]
    );
  };

  const handleMoveOrder = (listData: BusStop[], setListData: React.Dispatch<React.SetStateAction<BusStop[]>>, index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === listData.length - 1) return;

    const newList = [...listData];
    const swapIndex = direction === 'up' ? index - 1 : index + 1;
    
    const temp = newList[index];
    newList[index] = newList[swapIndex];
    newList[swapIndex] = temp;
    
    setListData(newList);
  };

  const saveOrder = async (routeName: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL', list: BusStop[]) => {
    const orderStr = list.map(s => s.id).join(',');
    const action = routeName === 'LAUREL - TANAUAN' ? 'save_forward_order' : 'save_reverse_order';

    try {
      const data = await apiRequest('/api/admin/stops', {
        method: 'POST',
        body: JSON.stringify({ action, order: orderStr })
      });
      if (data.success) {
        Alert.alert('Success', `Order saved for ${routeName}.`);
        fetchStops();
      } else {
        Alert.alert('Error', data.error || 'Failed to save order.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while saving order.');
    }
  };

  const renderRouteList = (routeName: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL', listData: BusStop[], setListData: React.Dispatch<React.SetStateAction<BusStop[]>>) => (
    <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200 mx-5`}>
      <View style={tw`bg-slate-50 p-4 border-b border-slate-200`}>
        <Text style={tw`text-[#1d4ed8] font-extrabold text-[15px]`}>{routeName}</Text>
      </View>
      <View style={tw`p-4`}>
        {listData.length === 0 ? (
          <Text style={tw`text-slate-400 text-[13px] text-center py-4`}>No stops yet for this route.</Text>
        ) : (
          <View style={tw`flex-col gap-2`}>
            {listData.map((s, idx) => (
              <View key={s.id} style={tw`flex-row items-center justify-between bg-slate-50 p-3 rounded-xl border border-slate-100`}>
                <View style={tw`flex-1 pr-2`}>
                  <Text style={tw`font-bold text-slate-800 text-[13px]`}>{s.name} <Text style={tw`text-slate-500 font-normal`}>— {s.location_name}</Text></Text>
                  {!!s.location_landmark && <Text style={tw`text-slate-400 text-[10px] mt-0.5`}>({s.location_landmark})</Text>}
                  <View style={tw`bg-slate-200 px-2 py-0.5 rounded-full mt-1 border border-slate-300 self-start`}>
                    <Text style={tw`text-[9px] text-slate-700 font-bold uppercase tracking-wider`}>{s.type.replace('_', ' ')}</Text>
                  </View>
                </View>
                <View style={tw`flex-row items-center gap-1`}>
                  <TouchableOpacity 
                    onPress={() => handleMoveOrder(listData, setListData, idx, 'up')}
                    disabled={idx === 0}
                    style={tw`p-2 rounded-full ${idx === 0 ? 'opacity-30' : 'bg-blue-50'}`}
                  >
                    <Ionicons name="arrow-up" size={16} color="#1d4ed8" />
                  </TouchableOpacity>
                  <TouchableOpacity 
                    onPress={() => handleMoveOrder(listData, setListData, idx, 'down')}
                    disabled={idx === listData.length - 1}
                    style={tw`p-2 rounded-full ${idx === listData.length - 1 ? 'opacity-30' : 'bg-blue-50'}`}
                  >
                    <Ionicons name="arrow-down" size={16} color="#1d4ed8" />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        {listData.length > 0 && (
          <TouchableOpacity 
            style={tw`mt-4 border border-[#1d4ed8] rounded-full py-2.5 items-center bg-blue-50`}
            onPress={() => saveOrder(routeName, listData)}
          >
            <Text style={tw`text-[#1d4ed8] font-bold text-[12px]`}>Save Order ({routeName})</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="PICK-UP POINTS" />

      <View style={tw`flex-row justify-between items-center p-5 pb-2`}>
        <View>
          <Text style={tw`text-xl font-extrabold text-[#0f3878] tracking-tight`}>Transit Stops</Text>
          <Text style={tw`text-slate-500 text-[13px] mt-0.5`}>Manage Routes & Terminals</Text>
        </View>
        <TouchableOpacity onPress={openAddModal} style={tw`bg-[#1d4ed8] px-4 py-2 rounded-full flex-row items-center gap-1.5 shadow-sm`}>
          <Ionicons name="add" size={16} color="white" />
          <Text style={tw`text-white text-[12px] font-bold`}>New</Text>
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`pb-10 pt-2`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
          {renderRouteList('LAUREL - TANAUAN', stopsForward, setStopsForward)}
          {renderRouteList('TANAUAN - LAUREL', stopsReverse, setStopsReverse)}

          <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200 mx-5`}>
            <View style={tw`bg-slate-50 p-4 border-b border-slate-200 flex-row justify-between items-center`}>
              <Text style={tw`font-extrabold text-slate-800 text-[15px]`}>All Existing Stops</Text>
              <View style={tw`bg-slate-200 px-3 py-1 rounded-full`}>
                <Text style={tw`text-slate-500 text-[10px] font-bold uppercase`}>Total: {stops.length}</Text>
              </View>
            </View>
            
            <View style={tw`p-3`}>
              {stops.length === 0 ? (
                <Text style={tw`text-slate-400 text-center py-6 text-[13px]`}>No stops added.</Text>
              ) : (
                <View style={tw`flex-col gap-1`}>
                  {stops.map((s) => (
                    <View key={s.id} style={tw`flex-row items-center justify-between p-3 bg-slate-50 rounded-xl mb-2 border border-slate-100`}>
                      <View style={tw`flex-1 pr-3`}>
                        <Text style={tw`font-bold text-slate-800 text-[13px] mb-0.5`}>{s.name}</Text>
                        <Text style={tw`text-slate-500 text-[12px] mb-0.5`}>{s.location_name}</Text>
                        {!!s.location_landmark && <Text style={tw`text-slate-400 text-[10px]`}>Landmark: {s.location_landmark}</Text>}
                        <Text style={tw`text-[#1d4ed8] font-bold text-[9px] uppercase tracking-wider mt-1.5`}>
                          {s.type.replace('_', ' ')} • {s.route}
                        </Text>
                      </View>
                      <TouchableOpacity 
                        style={tw`bg-red-50 px-3 py-1.5 rounded-full flex-row items-center border border-red-100`}
                        onPress={() => executeDelete(s.id, s.name)}
                      >
                        <Ionicons name="trash" size={12} color="#dc2626" style={tw`mr-1`} />
                        <Text style={tw`font-bold text-[10px] text-red-600`}>Delete</Text>
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}

      {/* Form Modal */}
      <Modal visible={isFormOpen} transparent animationType="slide">
        <View style={tw`flex-1 bg-black/50 justify-end`}>
          <View style={tw`bg-white rounded-t-3xl p-6 h-[85%]`}>
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="location" size={20} color="#1d4ed8" style={tw`mr-2`} />
                <Text style={tw`text-lg font-bold text-[#1d4ed8]`}>Add Stop / Terminal</Text>
              </View>
              <TouchableOpacity onPress={() => setIsFormOpen(false)} style={tw`bg-slate-100 p-2 rounded-full`}>
                <Ionicons name="close" size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw`pb-10`}>
              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Name</Text>
                <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium`} value={name} onChangeText={setName} placeholder="e.g. TALISAY" />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Type</Text>
                <View style={tw`flex-row bg-slate-50 rounded-xl border border-slate-200 overflow-hidden`}>
                  {(['bus_stop', 'pickup_point', 'terminal'] as const).map(t => (
                    <TouchableOpacity key={t} onPress={() => setType(t)} style={tw`flex-1 p-2.5 items-center justify-center ${type === t ? 'bg-[#1d4ed8]' : ''}`}>
                      <Text style={tw`text-[10px] uppercase font-bold ${type === t ? 'text-white' : 'text-slate-500'}`}>{t.replace('_', ' ')}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Route</Text>
                <View style={tw`flex-row bg-slate-50 rounded-xl border border-slate-200 overflow-hidden`}>
                  {(['LAUREL - TANAUAN', 'TANAUAN - LAUREL'] as const).map(r => (
                    <TouchableOpacity key={r} onPress={() => setRoute(r)} style={tw`flex-1 p-3 items-center justify-center ${route === r ? 'bg-blue-100' : ''}`}>
                      <Text style={tw`text-[10px] uppercase font-bold ${route === r ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>{r}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Location Name</Text>
                <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium`} value={locationName} onChangeText={setLocationName} placeholder="e.g. Mototrade" />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Location Landmark (optional)</Text>
                <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-medium`} value={locationLandmark} onChangeText={setLocationLandmark} placeholder="e.g. Near public market" />
              </View>

              <View style={tw`flex-row justify-between mb-6`}>
                <View style={tw`w-[48%]`}>
                  <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Latitude</Text>
                  <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-[12px]`} value={lat} onChangeText={setLat} keyboardType="numbers-and-punctuation" />
                </View>
                <View style={tw`w-[48%]`}>
                  <Text style={tw`text-[11px] font-bold text-slate-500 mb-1.5 uppercase tracking-wider`}>Longitude</Text>
                  <TextInput style={tw`bg-slate-50 border border-slate-200 rounded-xl p-3 text-slate-800 font-mono text-[12px]`} value={lng} onChangeText={setLng} keyboardType="numbers-and-punctuation" />
                </View>
              </View>

              <TouchableOpacity onPress={handleSaveStop} disabled={saving} style={tw`bg-[#1d4ed8] rounded-full py-4 items-center flex-row justify-center mb-6 shadow-sm`}>
                {saving && <ActivityIndicator color="white" style={tw`mr-2`} />}
                <Text style={tw`text-white font-bold text-[14px]`}>{saving ? 'Saving...' : 'Save Stop'}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
