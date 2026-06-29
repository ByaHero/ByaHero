import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal } from 'react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import { getMapHtml } from './mapHtml';

interface BusStop {
  id: number;
  name: string;
  type: string;
  route: string;
  location_name: string;
  location_landmark: string | null;
  lat: number;
  lng: number;
  sort_order: number;
}

export default function ManageStopsPage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const [baseUrl, setBaseUrl] = useState('');
  const [stops, setStops] = useState<BusStop[]>([]);
  const [stopsForward, setStopsForward] = useState<BusStop[]>([]);
  const [stopsReverse, setStopsReverse] = useState<BusStop[]>([]);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState('bus_stop');
  const [route, setRoute] = useState('LAUREL - TANAUAN');
  const [locationName, setLocationName] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');
  
  const [typeModalVisible, setTypeModalVisible] = useState(false);
  const [routeModalVisible, setRouteModalVisible] = useState(false);

  const fetchStops = useCallback(async () => {
    try {
      setLoading(true);
      const url = await getServerUrl();
      setBaseUrl(url);
      
      const response = await fetch(`${url}/api/admin/stops`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include'
      });
      const data = await response.json();
      if (data.success) {
        setStops(data.stops || []);
        setStopsForward(data.stopsForward || []);
        setStopsReverse(data.stopsReverse || []);
      }
    } catch (error) {
      console.error('Error fetching stops', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStops();
  }, [fetchStops]);

  const onMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'map_click') {
        setLat(data.lat);
        setLng(data.lng);
        if (data.location_name) {
          setLocationName(data.location_name);
        }
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveStop = async () => {
    if (!name || !locationName) {
      Alert.alert('Error', 'Name and Location Name are required.');
      return;
    }
    if (!lat || !lng || lat === '0' || lng === '0') {
      Alert.alert('Error', 'Please click on the map to pick a location.');
      return;
    }

    setSaving(true);
    try {
      const url = await getServerUrl();
      const response = await fetch(`${url}/api/admin/stops`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          action: 'add_stop',
          name, type, route,
          location_name: locationName,
          location_landmark: locationLandmark,
          lat: parseFloat(lat),
          lng: parseFloat(lng)
        })
      });
      const data = await response.json();
      if (data.success) {
        Alert.alert('Success', 'Stop saved successfully.');
        setName('');
        setLocationName('');
        setLocationLandmark('');
        setLat('');
        setLng('');
        fetchStops();
      } else {
        Alert.alert('Error', data.error || 'Failed to add stop.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error.');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteStop = (id: number, stopName: string) => {
    Alert.alert(
      'Confirm',
      `Delete stop "${stopName}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const url = await getServerUrl();
              const response = await fetch(`${url}/api/admin/stops`, {
                method: 'POST',
                headers: { 
                  'Accept': 'application/json',
                  'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ action: 'delete_stop', id })
              });
              const data = await response.json();
              if (data.success) {
                fetchStops();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete stop.');
              }
            } catch (error) {
              Alert.alert('Error', 'Network error.');
            }
          }
        }
      ]
    );
  };

  const handleMoveOrder = (listData: BusStop[], setListData: any, index: number, direction: 'up' | 'down') => {
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
      const url = await getServerUrl();
      const response = await fetch(`${url}/api/admin/stops`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action, order: orderStr })
      });
      const data = await response.json();
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

  const renderRouteList = (routeName: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL', listData: BusStop[], setListData: any) => (
    <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200`}>
      <View style={tw`bg-slate-100 p-4 border-b border-slate-200`}>
        <Text style={tw`text-[#1d4ed8] font-bold`}>{routeName} (Stops & Pick-up Points)</Text>
      </View>
      <View style={tw`p-4`}>
        {listData.length === 0 ? (
          <Text style={tw`text-slate-400 text-sm text-center py-4`}>No stops yet for this route.</Text>
        ) : (
          listData.map((s, idx) => (
            <View key={s.id} style={tw`flex-row items-center justify-between bg-slate-50 p-3 rounded-xl mb-2 border border-slate-100`}>
              <View style={tw`flex-1`}>
                <View style={tw`flex-row items-center flex-wrap gap-1`}>
                  <Text style={tw`font-bold text-slate-800`}>{s.name}</Text>
                  <Text style={tw`text-slate-500`}>— {s.location_name}</Text>
                </View>
                {!!s.location_landmark && <Text style={tw`text-slate-400 text-xs`}>({s.location_landmark})</Text>}
                <View style={tw`bg-slate-200 self-start px-2 py-0.5 rounded-full mt-1`}>
                  <Text style={tw`text-[10px] text-slate-600 font-bold uppercase`}>{s.type.replace('_', ' ')}</Text>
                </View>
              </View>
              <View style={tw`flex-row items-center ml-2`}>
                <TouchableOpacity 
                  onPress={() => handleMoveOrder(listData, setListData, idx, 'up')}
                  disabled={idx === 0}
                  style={tw`p-2 ${idx === 0 ? 'opacity-30' : ''}`}
                >
                  <Ionicons name="chevron-up" size={24} color="#1d4ed8" />
                </TouchableOpacity>
                <TouchableOpacity 
                  onPress={() => handleMoveOrder(listData, setListData, idx, 'down')}
                  disabled={idx === listData.length - 1}
                  style={tw`p-2 ${idx === listData.length - 1 ? 'opacity-30' : ''}`}
                >
                  <Ionicons name="chevron-down" size={24} color="#1d4ed8" />
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
        {listData.length > 0 && (
          <TouchableOpacity 
            style={tw`mt-4 border border-[#1d4ed8] rounded-full py-2 px-4 self-start`}
            onPress={() => saveOrder(routeName, listData)}
          >
            <Text style={tw`text-[#1d4ed8] font-bold text-xs`}>Save Order ({routeName})</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <View style={[tw`flex-1 bg-slate-50`, { paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={[tw`bg-[#1d4ed8] px-4 pb-4 rounded-b-[2rem] shadow-lg`, { paddingTop: insets.top + 20 }]}>
        <Text style={tw`text-white text-[24px] font-extrabold text-center tracking-tight`}>
          Bus Pick up Points
        </Text>
        <Text style={tw`text-blue-100 text-[14px] text-center mt-1`}>Manage Stops & Terminals</Text>
      </View>

      <ScrollView contentContainerStyle={tw`p-4`} showsVerticalScrollIndicator={false}>
        
        {/* Map Section */}
        <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200 h-80`}>
          <View style={tw`bg-white border-b border-slate-200 p-3 flex-row justify-between items-center z-10`}>
            <Text style={tw`font-bold text-slate-800`}>Stops Map</Text>
            <Text style={tw`text-slate-400 text-xs`}>Click map to pick</Text>
          </View>
          {baseUrl ? (
            <WebView
              source={{ html: getMapHtml(baseUrl, stops) }}
              onMessage={onMessage}
              style={tw`flex-1`}
              scrollEnabled={false}
            />
          ) : (
            <View style={tw`flex-1 justify-center items-center bg-slate-100`}>
              <ActivityIndicator size="large" color="#1d4ed8" />
            </View>
          )}
          <View style={tw`bg-white border-t border-slate-200 p-2 flex-row justify-between items-center`}>
            <Text style={tw`text-slate-500 text-xs`}>Selected coordinates:</Text>
            <Text style={tw`text-slate-800 font-mono text-xs`}>
              {lat && lng ? `${lat}, ${lng}` : 'None'}
            </Text>
          </View>
        </View>

        {/* Add Stop Form */}
        <View style={tw`bg-white rounded-3xl overflow-hidden mb-8 shadow-sm border border-slate-200`}>
          <View style={tw`bg-slate-50 border-b border-slate-200 p-4 flex-row items-center`}>
            <Ionicons name="location" size={20} color="#1d4ed8" style={tw`mr-2`} />
            <Text style={tw`font-bold text-[#1d4ed8]`}>Add Stop / Terminal</Text>
          </View>
          <View style={tw`p-5`}>
            <View style={tw`mb-4`}>
              <Text style={tw`text-slate-500 text-xs font-bold mb-1.5 uppercase`}>Name</Text>
              <TextInput
                style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px]`}
                placeholder="e.g. TALISAY"
                placeholderTextColor="#94a3b8"
                value={name}
                onChangeText={setName}
              />
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-slate-500 text-xs font-bold mb-1.5 uppercase`}>Type</Text>
              <TouchableOpacity 
                style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 flex-row justify-between items-center`}
                onPress={() => setTypeModalVisible(true)}
              >
                <Text style={tw`text-slate-800 text-[15px]`}>
                  {type === 'bus_stop' ? 'Bus Stop' : type === 'pickup_point' ? 'Pick-up Point' : 'Terminal'}
                </Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-slate-500 text-xs font-bold mb-1.5 uppercase`}>Route</Text>
              <TouchableOpacity 
                style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 flex-row justify-between items-center`}
                onPress={() => setRouteModalVisible(true)}
              >
                <Text style={tw`text-slate-800 text-[15px]`}>{route}</Text>
                <Ionicons name="chevron-down" size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={tw`mb-4`}>
              <Text style={tw`text-slate-500 text-xs font-bold mb-1.5 uppercase`}>Location Name</Text>
              <TextInput
                style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px]`}
                placeholder="e.g. Mototrade"
                placeholderTextColor="#94a3b8"
                value={locationName}
                onChangeText={setLocationName}
              />
            </View>

            <View style={tw`mb-6`}>
              <Text style={tw`text-slate-500 text-xs font-bold mb-1.5 uppercase`}>Location Landmark (optional)</Text>
              <TextInput
                style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 text-[15px]`}
                placeholder="e.g. Near public market"
                placeholderTextColor="#94a3b8"
                value={locationLandmark}
                onChangeText={setLocationLandmark}
              />
            </View>

            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full py-3.5 items-center ${saving ? 'opacity-70' : ''}`}
              onPress={handleSaveStop}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={tw`text-white font-bold text-[16px]`}>Save</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Lists */}
        {renderRouteList('LAUREL - TANAUAN', stopsForward, setStopsForward)}
        {renderRouteList('TANAUAN - LAUREL', stopsReverse, setStopsReverse)}

        {/* All Existing Stops Table */}
        <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200`}>
          <View style={tw`bg-slate-50 p-4 border-b border-slate-200 flex-row justify-between items-center`}>
            <Text style={tw`font-bold text-slate-800`}>Existing Stops (All Routes)</Text>
            <Text style={tw`text-slate-400 text-xs`}>Rows: {stops.length}</Text>
          </View>
          <View style={tw`p-2`}>
            {loading ? (
              <ActivityIndicator style={tw`p-6`} color="#1d4ed8" />
            ) : stops.length === 0 ? (
              <Text style={tw`text-slate-400 text-center py-6`}>No stops yet.</Text>
            ) : (
              stops.map((s, idx) => (
                <View key={s.id} style={tw`flex-row items-center justify-between p-3 border-b border-slate-100 ${idx === stops.length - 1 ? 'border-b-0' : ''}`}>
                  <View style={tw`flex-1 pr-3`}>
                    <Text style={tw`font-bold text-slate-800 text-sm`}>{s.name}</Text>
                    <Text style={tw`text-slate-500 text-xs`}>{s.location_name}</Text>
                    {!!s.location_landmark && <Text style={tw`text-slate-400 text-[10px]`}>Landmark: {s.location_landmark}</Text>}
                    <Text style={tw`text-slate-400 text-[10px] uppercase mt-1`}>{s.type.replace('_', ' ')} • {s.route}</Text>
                  </View>
                  <TouchableOpacity 
                    style={tw`border border-red-500 rounded-full px-3 py-1`}
                    onPress={() => handleDeleteStop(s.id, s.name)}
                  >
                    <Text style={tw`text-red-500 font-bold text-[10px]`}>Delete</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}
          </View>
        </View>

      </ScrollView>

      {/* Type Modal */}
      <Modal visible={typeModalVisible} transparent animationType="slide">
        <TouchableOpacity style={tw`flex-1 bg-black/40 justify-end`} activeOpacity={1} onPress={() => setTypeModalVisible(false)}>
          <View style={tw`bg-white rounded-t-3xl p-6`}>
            <Text style={tw`text-slate-900 font-bold text-[18px] mb-4 text-center`}>Select Type</Text>
            {[
              { label: 'Bus Stop', value: 'bus_stop' },
              { label: 'Pick-up Point', value: 'pickup_point' },
              { label: 'Terminal', value: 'terminal' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={tw`py-4 border-b border-slate-100`}
                onPress={() => {
                  setType(item.value);
                  setTypeModalVisible(false);
                }}
              >
                <Text style={tw`text-center text-[16px] ${type === item.value ? 'text-[#1d4ed8] font-bold' : 'text-slate-700'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

      {/* Route Modal */}
      <Modal visible={routeModalVisible} transparent animationType="slide">
        <TouchableOpacity style={tw`flex-1 bg-black/40 justify-end`} activeOpacity={1} onPress={() => setRouteModalVisible(false)}>
          <View style={tw`bg-white rounded-t-3xl p-6`}>
            <Text style={tw`text-slate-900 font-bold text-[18px] mb-4 text-center`}>Select Route</Text>
            {[
              { label: 'LAUREL - TANAUAN', value: 'LAUREL - TANAUAN' },
              { label: 'TANAUAN - LAUREL', value: 'TANAUAN - LAUREL' },
            ].map((item) => (
              <TouchableOpacity
                key={item.value}
                style={tw`py-4 border-b border-slate-100`}
                onPress={() => {
                  setRoute(item.value);
                  setRouteModalVisible(false);
                }}
              >
                <Text style={tw`text-center text-[16px] ${route === item.value ? 'text-[#1d4ed8] font-bold' : 'text-slate-700'}`}>
                  {item.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>

    </View>
  );
}
