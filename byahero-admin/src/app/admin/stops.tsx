import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, TextInput, Modal, Alert, Platform, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { WebView } from 'react-native-webview';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';
import { getStopMapHTML } from '@/components/stopMapHtml';

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

  // Map state
  const [currentFilter, setCurrentFilter] = useState('ALL ROUTES');
  const [iconSize, setIconSize] = useState(42);
  const webViewRef = useRef<WebView>(null);
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  // Modals
  const [isFormOpen, setIsFormOpen] = useState(false);

  // Form State
  const [isFilterOpen, setIsFilterOpen] = useState(false);
  const [name, setName] = useState('');
  const [type, setType] = useState('bus_stop');
  const [route, setRoute] = useState('LAUREL - TANAUAN');
  const [locationName, setLocationName] = useState('');
  const [locationLandmark, setLocationLandmark] = useState('');
  const [lat, setLat] = useState('');
  const [lng, setLng] = useState('');

  const stopsRef = useRef<BusStop[]>([]);
  const filterRef = useRef('ALL ROUTES');
  const iconSizeRef = useRef(42);

  useEffect(() => {
    stopsRef.current = stops;
    filterRef.current = currentFilter;
    iconSizeRef.current = iconSize;
  }, [stops, currentFilter, iconSize]);

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
    import('@/services/authService').then(m => m.getServerUrl().then(url => setBaseUrl(url)));
    
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MAP_CLICK') {
            setLat(data.lat.toFixed(6));
            setLng(data.lng.toFixed(6));
            if (data.locName) setLocationName(data.locName);
          } else if (data.type === 'MAP_READY') {
             updateMapData(stopsRef.current, filterRef.current, iconSizeRef.current);
          }
        } catch (e) { }
      };
      window.addEventListener('message', handleWebMessage);
      return () => {
        window.removeEventListener('message', handleWebMessage);
      };
    }
  }, []);

  useEffect(() => {
    updateMapData(stops, currentFilter, iconSize);
  }, [stops, currentFilter, iconSize]);

  const updateMapData = (stopsData: BusStop[], routeFilter: string, size: number) => {
    const payload = JSON.stringify({
      type: 'UPDATE_DATA',
      stops: stopsData,
      filterRoute: routeFilter,
      iconSize: size
    });
    if (Platform.OS === 'web') {
      (webViewRef.current as any)?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  };

  const openAddModal = () => {
    setName('');
    setType('bus_stop');
    setRoute('LAUREL - TANAUAN');
    setLocationName('');
    setLocationLandmark('');
    // keep lat/lng if selected from map, otherwise use defaults
    if (!lat || !lng) {
      setLat('14.0833');
      setLng('121.0333');
    }
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
    <View style={tw`bg-white mt-6`}>
      <Text style={tw`text-[#1d4ed8] font-bold text-[13px] px-5`}>{routeName} (Bus Stops & Pick up Points)</Text>
      <View style={tw`px-5 mt-2`}>
        {listData.length === 0 ? (
          <Text style={tw`text-slate-400 text-[12px] py-2`}>No stops yet for this route.</Text>
        ) : (
          <View style={tw`flex-col`}>
            {listData.map((s, idx) => (
              <View key={s.id} style={tw`flex-row items-center justify-between py-3 border-b border-slate-100`}>
                <View style={tw`flex-1 pr-2`}>
                  <Text style={tw`font-bold text-slate-800 text-[12px]`}>
                    {s.name} <Text style={tw`font-normal text-slate-600`}>— {s.location_name} {s.location_landmark ? `(${s.location_landmark})` : ''}</Text>
                  </Text>
                  <Text style={tw`text-[10px] text-slate-500 font-bold uppercase mt-1`}>{s.type.replace('_', ' ')}</Text>
                </View>
                <View style={tw`flex-row items-center gap-2`}>
                  <TouchableOpacity onPress={() => handleMoveOrder(listData, setListData, idx, 'up')} disabled={idx === 0}>
                    <Ionicons name="arrow-up" size={16} color={idx === 0 ? '#cbd5e1' : '#1d4ed8'} />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => handleMoveOrder(listData, setListData, idx, 'down')} disabled={idx === listData.length - 1}>
                    <Ionicons name="arrow-down" size={16} color={idx === listData.length - 1 ? '#cbd5e1' : '#1d4ed8'} />
                  </TouchableOpacity>
                </View>
              </View>
            ))}
          </View>
        )}
        {listData.length > 0 && (
          <TouchableOpacity 
            style={tw`mt-3 self-start bg-blue-50 px-4 py-2 rounded-lg`}
            onPress={() => saveOrder(routeName, listData)}
          >
            <Text style={tw`text-[#1d4ed8] font-bold text-[11px]`}>Save Order</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Bus Pick up Points" />

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`pb-10 pt-4 bg-white`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
            <View style={tw`lg:flex-row flex-col gap-4 mx-5 mb-6 z-50`}>
              {/* Left Column: Map */}
              <View style={tw`flex-[2] bg-white rounded-[14px] shadow-sm border border-slate-200 overflow-hidden`}>
                <View style={tw`bg-white px-5 py-4 border-b border-slate-100 flex-row justify-between items-center`}>
                  <Text style={tw`font-extrabold text-slate-800 text-[15px]`}>Stops Map</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>Click map to pick</Text>
                </View>

                {/* Filter */}
                <View style={tw`bg-[#e5e7eb] py-3 px-4 mx-4 mt-4 rounded-[16px] items-center mb-4 relative z-50`}>
                  <Text style={tw`text-slate-800 font-bold text-[11px] uppercase mb-2 tracking-wide`}>Filter Bus Pick up and Terminal</Text>
                  <TouchableOpacity
                    onPress={() => setIsFilterOpen(!isFilterOpen)}
                    style={tw`bg-white rounded-full border border-slate-200 px-4 py-2 flex-row items-center justify-between w-[220px]`}
                  >
                    <Text style={tw`text-[10px] font-bold text-slate-800`}>
                      {currentFilter === 'ALL ROUTES' ? 'ALL PICK UP & TERMINAL' : currentFilter}
                    </Text>
                    <Ionicons name={isFilterOpen ? "chevron-up" : "chevron-down"} size={14} color="#64748b" />
                  </TouchableOpacity>
                  
                  {isFilterOpen && (
                    <View style={tw`absolute top-[70px] bg-white border border-slate-200 rounded-xl shadow-lg w-[220px] overflow-hidden z-50`}>
                      {['ALL ROUTES', 'LAUREL - TANAUAN', 'TANAUAN - LAUREL'].map(f => (
                        <TouchableOpacity
                          key={f}
                          onPress={() => { setCurrentFilter(f); setIsFilterOpen(false); }}
                          style={tw`px-4 py-3 border-b border-slate-100 ${currentFilter === f ? 'bg-slate-50' : ''}`}
                        >
                          <Text style={tw`text-[10px] font-bold ${currentFilter === f ? 'text-slate-800' : 'text-slate-500'}`}>
                            {f === 'ALL ROUTES' ? 'ALL PICK UP & TERMINAL' : f}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

            {/* Map Area */}
            <View style={{ height: 320 }}>
              {Platform.OS === 'web' ? (
                <iframe
                  ref={webViewRef as any}
                  srcDoc={getStopMapHTML(baseUrl)}
                  style={{ width: '100%', height: '100%', border: 'none' }}
                />
              ) : (
                <WebView
                  ref={webViewRef}
                  originWhitelist={['*']}
                  source={{ html: getStopMapHTML(baseUrl) }}
                  style={StyleSheet.absoluteFillObject}
                  onMessage={(event) => {
                    try {
                      const data = JSON.parse(event.nativeEvent.data);
                      if (data.type === 'MAP_CLICK') {
                        setLat(data.lat.toFixed(6));
                        setLng(data.lng.toFixed(6));
                        if (data.locName) setLocationName(data.locName);
                      } else if (data.type === 'MAP_READY') {
                        updateMapData(stops, currentFilter, iconSize);
                      }
                    } catch (e) {}
                  }}
                />
              )}
            </View>

            {/* Slider */}
            <View style={tw`px-4 py-4 bg-white z-0`}>
              <View style={tw`border border-dashed border-slate-300 bg-slate-50 rounded-[14px] p-3`}>
                <View style={tw`flex-row justify-between items-center mb-2`}>
                  <Text style={tw`font-bold text-slate-800 text-[14px]`}>Marker Icon Size</Text>
                  <Text style={tw`font-bold text-slate-500 text-[12px]`}>
                    <Text style={tw`text-slate-800 text-[14px]`}>{iconSize}</Text>px
                  </Text>
                </View>
                {Platform.OS === 'web' ? (
                  <input 
                    type="range" 
                    min={22} 
                    max={80} 
                    value={iconSize} 
                    onChange={(e) => setIconSize(parseInt(e.target.value, 10))} 
                    style={{ width: '100%', cursor: 'pointer', height: '4px', background: '#cbd5e1', appearance: 'none', borderRadius: '4px', outline: 'none', marginTop: 8 } as React.CSSProperties}
                  />
                ) : (
                  <View style={tw`flex-row items-center gap-2 mt-1`}>
                    <TouchableOpacity onPress={() => setIconSize(Math.max(22, iconSize - 5))} style={tw`bg-slate-200 p-1.5 rounded-full`}><Ionicons name="remove" size={14}/></TouchableOpacity>
                    <View style={tw`flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden`}>
                      <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${((iconSize - 22) / (80 - 22)) * 100}%` }]} />
                    </View>
                    <TouchableOpacity onPress={() => setIconSize(Math.min(80, iconSize + 5))} style={tw`bg-slate-200 p-1.5 rounded-full`}><Ionicons name="add" size={14}/></TouchableOpacity>
                  </View>
                )}
                <View style={tw`flex-row justify-between items-center mt-1.5`}>
                  <Text style={tw`text-slate-400 text-[11px]`}>Small</Text>
                  <Text style={tw`text-slate-400 text-[11px]`}>Large</Text>
                </View>
                <Text style={tw`text-slate-500 text-[11px] mt-2`}>Tip: adjust to make bus stop / pick-up / terminal icons bigger on the map.</Text>
              </View>
              
              <Text style={tw`text-slate-500 text-[12px] mt-3`}>
                Selected: <Text style={tw`font-bold text-slate-800`}>{lat && lng ? `${lat}, ${lng}` : 'None'}</Text>
              </Text>
            </View>
          </View>

          {/* Right Column: Add Stop Form */}
          <View style={tw`flex-1 bg-white rounded-[14px] shadow-sm border border-slate-200`}>
            <View style={tw`px-5 pt-4 pb-3 border-b border-slate-100 flex-row items-center gap-2`}>
              <Ionicons name="add-circle" size={18} color="#1d4ed8" />
              <Text style={tw`font-bold text-[#1d4ed8] text-[15px]`}>Add Stop / Terminal</Text>
            </View>
              
            <View style={tw`p-5 bg-white`}>
              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-800 mb-1.5 uppercase`}>NAME</Text>
                <TextInput style={tw`bg-white border border-slate-300 rounded-xl p-3 text-slate-800 font-medium text-[13px]`} value={name} onChangeText={setName} placeholder="e.g. TALISAY" placeholderTextColor="#94a3b8" />
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-800 mb-1.5 uppercase`}>TYPE</Text>
                <View style={tw`border border-slate-300 rounded-xl bg-white overflow-hidden`}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={type}
                      onChange={(e) => setType(e.target.value)}
                      style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b' }}
                    >
                      <option value="bus_stop">Bus Stop</option>
                      <option value="pickup_point">Pickup Point</option>
                      <option value="terminal">Terminal</option>
                    </select>
                  ) : (
                    <View style={tw`flex-row`}>
                      {(['bus_stop', 'pickup_point', 'terminal'] as const).map(t => (
                        <TouchableOpacity key={t} onPress={() => setType(t)} style={tw`flex-1 p-3 items-center justify-center border-r border-slate-200 ${type === t ? 'bg-slate-100' : ''}`}>
                          <Text style={tw`text-[11px] uppercase font-bold ${type === t ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>{t.replace('_', ' ')}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-800 mb-1.5 uppercase`}>ROUTE</Text>
                <View style={tw`border border-slate-300 rounded-xl bg-white overflow-hidden`}>
                  {Platform.OS === 'web' ? (
                    <select
                      value={route}
                      onChange={(e) => setRoute(e.target.value)}
                      style={{ width: '100%', padding: '12px', backgroundColor: 'transparent', border: 'none', outline: 'none', fontSize: '13px', color: '#1e293b' }}
                    >
                      <option value="LAUREL - TANAUAN">LAUREL - TANAUAN</option>
                      <option value="TANAUAN - LAUREL">TANAUAN - LAUREL</option>
                    </select>
                  ) : (
                    <View style={tw`flex-row`}>
                      {(['LAUREL - TANAUAN', 'TANAUAN - LAUREL'] as const).map(r => (
                        <TouchableOpacity key={r} onPress={() => setRoute(r)} style={tw`flex-1 p-3 items-center justify-center border-r border-slate-200 ${route === r ? 'bg-slate-100' : ''}`}>
                          <Text style={tw`text-[10px] uppercase font-bold ${route === r ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>{r}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={tw`mb-4`}>
                <Text style={tw`text-[11px] font-bold text-slate-800 mb-1.5 uppercase`}>LOCATION NAME</Text>
                <TextInput style={tw`bg-white border border-slate-300 rounded-xl p-3 text-slate-800 font-medium text-[13px]`} value={locationName} onChangeText={setLocationName} placeholder="e.g. Mototrade" placeholderTextColor="#94a3b8" />
              </View>

              <View style={tw`mb-5`}>
                <Text style={tw`text-[11px] font-bold text-slate-800 mb-1.5 uppercase`}>LOCATION LANDMARK (OPTIONAL)</Text>
                <TextInput style={tw`bg-white border border-slate-300 rounded-xl p-3 text-slate-800 font-medium text-[13px]`} value={locationLandmark} onChangeText={setLocationLandmark} placeholder="e.g. Near public market" placeholderTextColor="#94a3b8" />
              </View>

              <TouchableOpacity onPress={handleSaveStop} disabled={saving} style={tw`bg-[#1d4ed8] rounded-full py-3 items-center flex-row justify-center mt-1`}>
                {saving && <ActivityIndicator color="white" style={tw`mr-2`} size="small" />}
                <Text style={tw`text-white font-extrabold tracking-wide text-[14px]`}>{saving ? 'Saving...' : 'Save'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

          <View style={tw`lg:flex-row flex-col gap-4 mx-5`}>
            <View style={tw`flex-1`}>
              {renderRouteList('LAUREL - TANAUAN', stopsForward, setStopsForward)}
            </View>
            <View style={tw`flex-1`}>
              {renderRouteList('TANAUAN - LAUREL', stopsReverse, setStopsReverse)}
            </View>
          </View>

          <View style={tw`bg-white rounded-[14px] overflow-hidden mb-6 shadow-sm border border-slate-200 mx-5 mt-4`}>
            <View style={tw`bg-white px-5 py-4 border-b border-slate-100 flex-row justify-between items-center`}>
              <Text style={tw`font-extrabold text-slate-800 text-[15px]`}>Existing Stops (All Routes)</Text>
              <Text style={tw`text-slate-500 text-[12px]`}>Rows: {stops.length}</Text>
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

    </SafeAreaView>
  );
}
