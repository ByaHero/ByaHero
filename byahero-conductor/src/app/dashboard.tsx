import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator,
  StyleSheet,
  Platform
} from 'react-native';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConductorLeafletHTML } from '../components/conductorMapHtml';
import { getServerUrl, logout } from '../services/authService';
import { getBusesConductor, getActiveBuses, startOperation } from '../services/conductorService';

export default function DashboardScreen() {
  const [buses, setBuses] = useState<any[]>([]);
  const [selectedBus, setSelectedBus] = useState<any>(null);
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [paxCount, setPaxCount] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  
  // Modals state
  const [isPreDepartureVisible, setIsPreDepartureVisible] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isBusDropdownOpen, setIsBusDropdownOpen] = useState(false);
  const [isRouteDropdownOpen, setIsRouteDropdownOpen] = useState(false);
  
  // Map filter
  const [currentFilter, setCurrentFilter] = useState('ALL ROUTES');
  const [rawBusesList, setRawBusesList] = useState<any[]>([]);

  const webViewRef = useRef<WebView>(null);
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  useEffect(() => {
    getServerUrl().then(url => setBaseUrl(url));
    checkAutoResume();
    loadSetupData();

    // Web-specific listener for iframe communication
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MAP_READY') {
            fetchLiveBusesForMap();
          }
        } catch (e) {}
      };
      window.addEventListener('message', handleWebMessage);
      return () => {
        window.removeEventListener('message', handleWebMessage);
      };
    }

    // Map refresh loop
    const interval = setInterval(fetchLiveBusesForMap, 15000);
    return () => clearInterval(interval);
  }, [currentFilter]);

  const checkAutoResume = async () => {
    const payloadStr = await AsyncStorage.getItem('byahero_conductor_payload');
    if (payloadStr) {
      router.replace('/liveTracking');
    }
  };

  const loadSetupData = async () => {
    setIsLoading(true);
    try {
      const res = await getBusesConductor();
      if (res.success && res.buses) {
        setBuses(res.buses);
      }
      await fetchLiveBusesForMap();
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchLiveBusesForMap = async () => {
    try {
      const res = await getActiveBuses();
      if (res.success && res.buses) {
        setRawBusesList(res.buses);
        sendBusesToMap(res.buses, currentFilter);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const postToMap = (message: any) => {
    const payload = JSON.stringify(message);
    if (Platform.OS === 'web') {
      (webViewRef.current as any)?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  };

  const sendBusesToMap = (busesList: any[], filter: string) => {
    const normalized = busesList.map((bus: any) => {
      let coords = null;
      if (bus.current_location) {
        try {
          const geo = JSON.parse(bus.current_location);
          if (geo.geometry) coords = [geo.geometry.coordinates[1], geo.geometry.coordinates[0]];
        } catch (e) {}
      }
      if (!coords && bus.lat && bus.lng) coords = [parseFloat(bus.lat), parseFloat(bus.lng)];

      return {
        id: bus.Bus_ID || bus.id,
        code: bus.code || 'BUS',
        route: bus.route || '',
        status: bus.status || 'unavailable',
        coords: coords,
        locName: bus.current_location_name || 'Updating...'
      };
    });

    const filtered = normalized.filter(b => 
      (filter === 'ALL ROUTES' || b.route === filter) &&
      b.status !== 'unavailable' &&
      b.coords !== null
    );

    postToMap({
      type: 'UPDATE_BUSES',
      buses: filtered
    });
  };

  const handleFilterChange = (filter: string) => {
    setCurrentFilter(filter);
    sendBusesToMap(rawBusesList, filter);
  };

  const handleStartTracking = () => {
    if (!selectedBus) {
      Alert.alert('Selection Required', 'Please select an active fleet unit.');
      return;
    }
    if (!selectedRoute) {
      Alert.alert('Selection Required', 'Please select a transit route.');
      return;
    }
    setIsPreDepartureVisible(true);
  };

  const handleConfirmStart = async () => {
    const boardingCount = parseInt(paxCount) || 0;
    const seatsTotal = selectedBus.total_seats || 25;
    
    if (boardingCount > seatsTotal) {
      Alert.alert('Error', `Passenger count cannot exceed maximum seats (${seatsTotal})`);
      return;
    }

    setIsLoading(true);
    setIsPreDepartureVisible(false);

    try {
      const startLocName = 'Terminal'; // Default starter loc name
      const res = await startOperation({
        bus_id: selectedBus.id || selectedBus.Bus_ID,
        route: selectedRoute,
        pre_departure_count: boardingCount,
        start_location: startLocName
      });

      if (res.success && res.operation_id) {
        const payload = {
          bus_id: String(selectedBus.id || selectedBus.Bus_ID),
          code: selectedBus.code || `BUS-${selectedBus.id}`,
          seats_total: seatsTotal,
          route: selectedRoute,
          initial_available_seats: Math.max(0, seatsTotal - boardingCount),
          pre_departure_count: boardingCount,
          operation_id: res.operation_id
        };

        await AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(payload));
        router.replace('/liveTracking');
      } else {
        Alert.alert('Dispatch Failed', res.error || 'Failed to start transit tracking.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Could not connect to the server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to log out?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/');
        }
      }
    ]);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      {/* Top Navbar */}
      <View style={tw`bg-[#0f3878] px-5 py-3.5 flex-row justify-between items-center shadow-md`}>
        <View style={tw`flex-row items-center gap-2`}>
          <Text style={tw`text-white text-lg font-black tracking-widest`}>BYAHERO</Text>
        </View>
        <TouchableOpacity onPress={() => setIsMenuOpen(true)}>
          <Ionicons name="menu" size={28} color="white" />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={tw`p-4`} style={tw`flex-1`}>
        {/* Title */}
        <View style={tw`mb-4`}>
          <Text style={tw`text-xl font-bold text-slate-800`}>Route Dispatch Setup</Text>
          <Text style={tw`text-slate-500 text-xs mt-1`}>
            Select your fleet unit and route below to initialize live passenger tracking and GPS coordinates.
          </Text>
        </View>

        {/* Dispatch Map Container */}
        <View style={tw`mb-4 bg-white rounded-2xl p-1 border border-slate-200 shadow-sm overflow-hidden`}>
          <View style={tw`p-3 flex-row justify-between items-center bg-slate-100 rounded-t-xl`}>
            <Text style={tw`text-xs font-bold text-slate-700`}>Dispatch Tracker Map</Text>
            {/* Filter Toggle */}
            <View style={tw`flex-row gap-1`}>
              {['ALL ROUTES', 'LAUREL - TANAUAN', 'TANAUAN - LAUREL'].map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => handleFilterChange(f)}
                  style={tw`px-2.5 py-1 rounded-full ${currentFilter === f ? 'bg-[#0f3878]' : 'bg-white border border-slate-200'}`}
                >
                  <Text style={tw`text-[9px] font-bold ${currentFilter === f ? 'text-white' : 'text-slate-600'}`}>
                    {f === 'ALL ROUTES' ? 'ALL' : f.split(' - ')[0]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
          
          <View style={{ height: 260 }}>
            {Platform.OS === 'web' ? (
              <iframe
                ref={webViewRef as any}
                srcDoc={getConductorLeafletHTML(baseUrl)}
                style={{ width: '100%', height: '100%', border: 'none' }}
              />
            ) : (
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: getConductorLeafletHTML(baseUrl) }}
                style={StyleSheet.absoluteFillObject}
                onMessage={() => {}}
              />
            )}
          </View>
        </View>

        {/* Selector Panel */}
        <View style={tw`bg-white rounded-2xl p-5 border border-slate-200 shadow-sm mb-6`}>
          {/* Active Fleet Select */}
          <View style={tw`mb-4`}>
            <Text style={tw`text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider`}>Active Fleet Unit</Text>
            <TouchableOpacity
              onPress={() => setIsBusDropdownOpen(true)}
              style={tw`flex-row justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3`}
            >
              <Text style={tw`text-sm font-semibold ${selectedBus ? 'text-slate-800' : 'text-slate-400'}`}>
                {selectedBus ? `${selectedBus.code} (${selectedBus.total_seats} seats)` : 'Select Bus'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Scheduled Route Select */}
          <View style={tw`mb-6`}>
            <Text style={tw`text-[11px] font-bold text-slate-400 uppercase mb-2 tracking-wider`}>Scheduled Transit Route</Text>
            <TouchableOpacity
              onPress={() => setIsRouteDropdownOpen(true)}
              style={tw`flex-row justify-between items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3`}
            >
              <Text style={tw`text-sm font-semibold ${selectedRoute ? 'text-slate-800' : 'text-slate-400'}`}>
                {selectedRoute || 'Select Route'}
              </Text>
              <Ionicons name="chevron-down" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Start tracking button */}
          <TouchableOpacity
            onPress={handleStartTracking}
            disabled={isLoading}
            style={tw`bg-[#0f3878] rounded-full py-4 items-center justify-center shadow-md`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold text-sm tracking-wider uppercase`}>Start Operation tracking</Text>
            )}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Select Bus Modal */}
      <Modal visible={isBusDropdownOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-200 max-h-[350px]`}>
            <Text style={tw`text-slate-800 font-bold mb-4`}>Select Active Bus</Text>
            <ScrollView>
              {buses.map((bus: any) => {
                const id = bus.id || bus.Bus_ID;
                const code = bus.code || `BUS-${id}`;
                return (
                  <TouchableOpacity
                    key={id}
                    onPress={() => {
                      setSelectedBus(bus);
                      setIsBusDropdownOpen(false);
                    }}
                    style={tw`py-3 border-b border-slate-100 flex-row justify-between`}
                  >
                    <Text style={tw`font-semibold text-slate-700`}>{code}</Text>
                    <Text style={tw`text-xs text-slate-400`}>{bus.total_seats} seats</Text>
                  </TouchableOpacity>
                );
              })}
              {buses.length === 0 && (
                <Text style={tw`text-slate-400 text-xs py-4 text-center`}>No unassigned buses available</Text>
              )}
            </ScrollView>
            <TouchableOpacity onPress={() => setIsBusDropdownOpen(false)} style={tw`mt-4 bg-slate-100 rounded-xl py-2.5 items-center`}>
              <Text style={tw`text-slate-700 font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Select Route Modal */}
      <Modal visible={isRouteDropdownOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-200`}>
            <Text style={tw`text-slate-800 font-bold mb-4`}>Select Route</Text>
            {['LAUREL - TANAUAN', 'TANAUAN - LAUREL'].map(route => (
              <TouchableOpacity
                key={route}
                onPress={() => {
                  setSelectedRoute(route);
                  setIsRouteDropdownOpen(false);
                }}
                style={tw`py-3 border-b border-slate-100`}
              >
                <Text style={tw`font-semibold text-slate-700`}>{route}</Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setIsRouteDropdownOpen(false)} style={tw`mt-4 bg-slate-100 rounded-xl py-2.5 items-center`}>
              <Text style={tw`text-slate-700 font-bold`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Pre-Departure Modal */}
      <Modal visible={isPreDepartureVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200 items-center`}>
            <Text style={tw`text-slate-800 text-lg font-bold mb-2`}>Pre-Departure Check</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-4`}>
              How many passengers have already boarded?
            </Text>

            <TextInput
              value={paxCount}
              onChangeText={setPaxCount}
              placeholder="0"
              keyboardType="number-pad"
              style={tw`w-28 text-center text-4xl font-extrabold border-0 bg-slate-100 rounded-2xl py-4 mb-4 text-slate-800`}
            />

            <Text style={tw`text-slate-400 text-xs mb-6`}>
              Maximum seats: {selectedBus?.total_seats || 25}
            </Text>

            <View style={tw`flex-row gap-3 w-full`}>
              <TouchableOpacity
                onPress={() => setIsPreDepartureVisible(false)}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleConfirmStart}
                style={tw`flex-1 bg-[#0f3878] rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-white font-bold`}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Hamburger Drawer Menu Overlay */}
      <Modal visible={isMenuOpen} transparent animationType="slide">
        <View style={tw`flex-1 flex-row bg-black/50`}>
          <View style={tw`w-72 bg-slate-50 h-full p-6 border-r border-slate-200 justify-between`}>
            <View>
              {/* Header */}
              <View style={tw`flex-row justify-between items-center mb-6`}>
                <Text style={tw`text-slate-800 text-lg font-black`}>BYAHERO</Text>
                <TouchableOpacity onPress={() => setIsMenuOpen(false)}>
                  <Ionicons name="close" size={24} color="#334155" />
                </TouchableOpacity>
              </View>

              {/* Navigation Items */}
              <View style={tw`gap-4`}>
                <TouchableOpacity
                  onPress={() => {
                    setIsMenuOpen(false);
                    router.push('/profile');
                  }}
                  style={tw`flex-row items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100`}
                >
                  <Ionicons name="person" size={20} color="#0f3878" />
                  <Text style={tw`text-slate-700 font-bold text-sm`}>Profile</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setIsMenuOpen(false);
                    router.push('/waitingPax');
                  }}
                  style={tw`flex-row items-center gap-3 bg-white p-3 rounded-xl shadow-sm border border-slate-100`}
                >
                  <Ionicons name="people" size={20} color="#0f3878" />
                  <Text style={tw`text-slate-700 font-bold text-sm`}>Wait Count</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Logout button */}
            <TouchableOpacity
              onPress={() => {
                setIsMenuOpen(false);
                handleLogout();
              }}
              style={tw`flex-row items-center gap-3 bg-red-50 p-3.5 rounded-xl border border-red-200`}
            >
              <Ionicons name="log-out" size={20} color="#ef4444" />
              <Text style={tw`text-red-600 font-bold text-sm`}>Log Out</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={tw`flex-1`} onPress={() => setIsMenuOpen(false)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
