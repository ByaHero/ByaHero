import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Platform,
  DeviceEventEmitter,
  AppState,
  Modal,
  ScrollView,
  TextInput,
  Animated
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ConductorNavbar from '../components/ConductorNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConductorLeafletHTML } from '../components/conductorMapHtml';
import { getServerUrl } from '../services/authService';
import { updateGeoLocation, logPassengerEvent, stopTracking, getMapFeatures, getSyncData } from '../services/conductorService';
import { NativeModules } from 'react-native';
const { LocationServiceModule } = NativeModules;

// Geofence point-in-polygon helper
function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / ((yj - yi) || 1) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

// Distance helper
function distanceMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function LiveTrackingScreen() {
  const [session, setSession] = useState<any>(null);
  const [seats, setSeats] = useState(0);
  const [netStatus, setNetStatus] = useState('Active');
  const [locationName, setLocationName] = useState('Waiting for GPS...');
  const [lastUpdate, setLastUpdate] = useState('00:00');
  const [isLoading, setIsLoading] = useState(false);

  // Ticketing Mode States
  const [isTicketingModalVisible, setIsTicketingModalVisible] = useState(false);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [busFares, setBusFares] = useState<any[]>([]);
  const [boardingStop, setBoardingStop] = useState<any>(null);
  const [alightingStop, setAlightingStop] = useState<any>(null);
  const [discountType, setDiscountType] = useState('Regular');
  const [ticketFare, setTicketFare] = useState(0);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [selectingLocationType, setSelectingLocationType] = useState<'boarding'|'alighting'|null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<any>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [pendingTickets, setPendingTickets] = useState(0);

  // References & Tracking states
  const slideAnim = useRef(new Animated.Value(800)).current;
  const webViewRef = useRef<WebView>(null);
  const [baseUrl, setBaseUrl] = useState('http://localhost:8000');
  const locationSubscription = useRef<Location.LocationSubscription | null>(null);
  const routeFeatures = useRef<any[]>([]);
  const sessionRef = useRef<any>(null);

  // Passenger event accumulation
  const pendingBoards = useRef(0);
  const pendingDeparts = useRef(0);
  const syncTimer = useRef<any>(null);

  // Last known coordinate caches for status computation
  const lastCoords = useRef<{ lat: number; lng: number; speed: number } | null>(null);
  const lastMoveCheck = useRef<{ time: number; lat: number; lng: number } | null>(null);
  const lastResolvedLocation = useRef<{ lat: number; lng: number; name: string } | null>(null);

  // Sync seats count to ref to avoid effect recreation churn
  const seatsRef = useRef(seats);
  useEffect(() => {
    seatsRef.current = seats;
    AsyncStorage.getItem('byahero_conductor_payload').then(str => {
      if (!str) return;
      try {
        const p = JSON.parse(str);
        p.current_seats = seats;
        p.pending_tickets = pendingTickets;
        AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(p));
      } catch (e) {}
    });
  }, [seats, pendingTickets]);

  useEffect(() => {
    getServerUrl().then(url => setBaseUrl(url));
    
    initSession().then(() => {
      if (Platform.OS === 'web') {
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              onLocationUpdate({
                coords: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  altitude: null,
                  accuracy: position.coords.accuracy,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              } as any);
            },
            (error) => {
              console.warn('Browser geolocation failed:', error);
            }
          );
        }

        const handleWebMessage = (e: MessageEvent) => {
          try {
            const data = JSON.parse(e.data);
            if (data.type === 'MAP_CLICK') {
              onLocationUpdate({
                coords: {
                  latitude: data.lat,
                  longitude: data.lng,
                  altitude: null,
                  accuracy: 1,
                  altitudeAccuracy: null,
                  heading: null,
                  speed: null,
                },
                timestamp: Date.now(),
              } as any);
            }
          } catch (err) {}
        };
        window.addEventListener('message', handleWebMessage);
        return () => {
          window.removeEventListener('message', handleWebMessage);
          cleanup();
        };
      } else {
        startLocationTracking();
      }
    });
  }, []);

  // Restore full media session when app comes back to foreground after being swiped
  useEffect(() => {
    if (Platform.OS !== 'android' || !LocationServiceModule) return;
    const sub = AppState.addEventListener('change', state => {
      if (state === 'active') LocationServiceModule.notifyAppForeground();
    });
    return () => sub.remove();
  }, []);

  // Stable refs so media button listeners never hold stale closures
  const incrementRef = useRef<() => void>(() => {});
  const decrementRef = useRef<() => void>(() => {});
  useEffect(() => { incrementRef.current = incrementPassengers; });
  useEffect(() => { decrementRef.current = decrementPassengers; });

  // Wire media button events — registered once, never stale
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const nextListener = DeviceEventEmitter.addListener('media-session-next', () => incrementRef.current());
    const prevListener = DeviceEventEmitter.addListener('media-session-prev', () => decrementRef.current());
    return () => { nextListener.remove(); prevListener.remove(); };
  }, []);

  // Update service notification metadata whenever session or seats change
  useEffect(() => {
    if (!session || Platform.OS !== 'android' || !LocationServiceModule) return;
    LocationServiceModule.updateMetadata(
      `Bus ${session.code} | Seats: ${seatsRef.current}`,
      `Route: ${session.route}`
    );
  }, [session, seats]);

  const cleanup = () => {
    if (locationSubscription.current) {
      try {
        (locationSubscription.current as any)._bgSub?.remove();
        locationSubscription.current.remove();
      } catch (err) {
        console.warn('Failed to remove location subscription:', err);
      }
      locationSubscription.current = null;
    }
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    if (Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.stopService();
    }
  };

  const initSession = async () => {
    const payloadStr = await AsyncStorage.getItem('byahero_conductor_payload');
    if (!payloadStr) {
      router.replace('/dashboard');
      return;
    }
    const payload = JSON.parse(payloadStr);
    setSession(payload);
    sessionRef.current = payload;

    // Check if service mutated seats while JS was dead (app was swiped)
    let restoredSeats = payload.current_seats !== undefined
      ? payload.current_seats
      : payload.seats_total - payload.pre_departure_count;

    if (Platform.OS === 'android' && LocationServiceModule) {
      try {
        const persisted = await LocationServiceModule.getPersistedSeats();
        if (persisted !== -1) restoredSeats = persisted;
      } catch (_) {}
    }

    setSeats(restoredSeats);
    
    let restoredPending = payload.pending_tickets !== undefined
      ? payload.pending_tickets
      : (payload.pending_pre_departure !== undefined 
          ? payload.pending_pre_departure 
          : (payload.pre_departure_count || 0));
    setPendingTickets(restoredPending);

    // Load route features for geofenced location parsing
    try {
      const res = await getMapFeatures();
      if (res && Array.isArray(res.features)) {
        routeFeatures.current = res.features.filter((f: any) => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
      }
    } catch (e) {
      console.error('Failed to load geofencing route details', e);
    }
  };

  const resolveLocationName = (lat: number, lng: number): string | null => {
    if (!routeFeatures.current || routeFeatures.current.length === 0) return null;
    for (const f of routeFeatures.current) {
      if (!f.geometry) continue;
      if (f.geometry.type === 'Polygon' && Array.isArray(f.geometry.coordinates) && f.geometry.coordinates[0]) {
        if (pointInRing(lng, lat, f.geometry.coordinates[0])) {
          return f.properties?.['Current Location'] || f.properties?.name || null;
        }
      }
      if (f.geometry.type === 'MultiPolygon' && Array.isArray(f.geometry.coordinates)) {
        for (const poly of f.geometry.coordinates) {
          if (poly && poly[0] && pointInRing(lng, lat, poly[0])) {
            return f.properties?.['Current Location'] || f.properties?.name || null;
          }
        }
      }
    }
    return null;
  };

  const autoComputeStatus = (currentLat: number, currentLng: number, currentSeats: number): string => {
    if (currentSeats <= 0) return 'full';

    const now = Date.now();
    if (!lastMoveCheck.current) {
      lastMoveCheck.current = { time: now, lat: currentLat, lng: currentLng };
      return 'available';
    }

    const dist = distanceMeters(lastMoveCheck.current.lat, lastMoveCheck.current.lng, currentLat, currentLng);
    if (dist > 3) {
      lastMoveCheck.current = { time: now, lat: currentLat, lng: currentLng };
      return 'available';
    }

    if (now - lastMoveCheck.current.time >= 5000) {
      return 'on_stop';
    }
    return 'available';
  };

  const startLocationTracking = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Denied', 'Foreground location permission is required for bus tracking.');
      return;
    }

    // Request background location permission (Android 10+)
    const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
    if (bgStatus !== 'granted') {
      Alert.alert(
        'Background Location Required',
        'Please allow "Allow all the time" location access so tracking continues when the screen is off.',
        [{ text: 'OK' }]
      );
    }

    // Start the Android foreground service to keep GPS alive when backgrounded
    if (Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.startService();
      const s = sessionRef.current;
      if (s) LocationServiceModule.updateMetadata(
        `Bus ${s.code} | Seats: ${seatsRef.current}`,
        `Route: ${s.route}`
      );
    }

    // Get current position immediately to show the bus on the map on start
    try {
      const initialLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      onLocationUpdate(initialLocation);
    } catch (e) {
      console.warn('Failed to get initial location:', e);
    }

    locationSubscription.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.High,
        timeInterval: 2000,
        distanceInterval: 3
      },
      (location) => {
        onLocationUpdate(location);
      }
    );

    // Also listen to background service location events
    if (Platform.OS === 'android' && LocationServiceModule) {
      const bgSub = DeviceEventEmitter.addListener('onBackgroundLocation', (data: { lat: number; lng: number; accuracy: number }) => {
        onLocationUpdate({
          coords: {
            latitude: data.lat,
            longitude: data.lng,
            altitude: null,
            accuracy: data.accuracy,
            altitudeAccuracy: null,
            heading: null,
            speed: null,
          },
          timestamp: Date.now(),
        } as any);
      });
      // Store so we can remove on cleanup
      (locationSubscription.current as any)._bgSub = bgSub;
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

  const onLocationUpdate = (location: Location.LocationObject) => {
    const lat = location.coords.latitude;
    const lng = location.coords.longitude;
    const speed = location.coords.speed || 0;
    lastCoords.current = { lat, lng, speed };

    // Resolve Location Name
    let resolved = resolvedLocationNameCached(lat, lng);
    setLocationName(resolved);

    // Update map marker
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUpdate(nowTimeStr);

    const currentSeats = seatsRef.current;
    const computedStatus = autoComputeStatus(lat, lng, currentSeats);
    postToMap({
      type: 'UPDATE_MY_LOCATION',
      lat,
      lng,
      status: computedStatus,
      pan: true
    });

    sendDataToServer(lat, lng, speed, resolved, computedStatus);
  };

  const resolvedLocationNameCached = (lat: number, lng: number): string => {
    if (lastResolvedLocation.current) {
      const dist = distanceMeters(lastResolvedLocation.current.lat, lastResolvedLocation.current.lng, lat, lng);
      if (dist <= 10 && lastResolvedLocation.current.name) {
        return lastResolvedLocation.current.name;
      }
    }
    const resolved = resolveLocationName(lat, lng) || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    lastResolvedLocation.current = { lat, lng, name: resolved };
    return resolved;
  };

  const sendDataToServer = async (lat: number, lng: number, speed: number, locName: string, status: string) => {
    const activeSession = sessionRef.current || session;
    if (!activeSession) return;
    setNetStatus('Saving...');

    const currentSeats = seatsRef.current;
    const payload = {
      bus_id: parseInt(activeSession.bus_id),
      geojson: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          bus_id: activeSession.bus_id,
          code: activeSession.code,
          route: activeSession.route,
          seats_available: currentSeats,
          status: status,
          timestamp: new Date().toISOString(),
          current_location_name: locName
        }
      },
      route: activeSession.route,
      seats_available: currentSeats,
      status: status,
      speed: speed,
      current_location_name: locName
    };

    try {
      await updateGeoLocation(payload);
      setNetStatus('Live');
    } catch (e) {
      setNetStatus('Offline');
    }
  };

  const triggerManualUpdate = () => {
    const activeSession = sessionRef.current || session;
    if (lastCoords.current && activeSession) {
      const lat = lastCoords.current.lat;
      const lng = lastCoords.current.lng;
      const speed = lastCoords.current.speed || 0;
      const resolved = lastResolvedLocation.current?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const computedStatus = autoComputeStatus(lat, lng, seatsRef.current);
      sendDataToServer(lat, lng, speed, resolved, computedStatus);
    }
  };

  const flushPendingEvents = () => {
    const netBoards = pendingBoards.current;
    const netDeparts = pendingDeparts.current;
    pendingBoards.current = 0;
    pendingDeparts.current = 0;

    const net = netBoards - netDeparts;
    if (net === 0 || !session) return;

    const eventType = net > 0 ? 'board' : 'depart';
    const count = Math.abs(net);
    const locName = lastResolvedLocation.current?.name || null;
    const lat = lastCoords.current?.lat || null;
    const lng = lastCoords.current?.lng || null;

    logPassengerEvent({
      operation_id: session.operation_id,
      event_type: eventType,
      count,
      location_name: locName,
      lat,
      lng
    }).then(res => {
      if (res && res.success) {
        console.log(`Passenger ${eventType} event logged successfully.`);
      }
    });
  };

  const scheduleSync = () => {
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    syncTimer.current = setTimeout(() => {
      triggerManualUpdate();
      flushPendingEvents();
      syncTimer.current = null;
    }, 3000);
  };

  const incrementPassengers = (count = 1) => {
    const currentSeats = seatsRef.current;
    if (sessionRef.current && currentSeats > 0) {
      const actualCount = Math.min(count, currentSeats);
      setSeats(currentSeats - actualCount);
      pendingBoards.current += actualCount;
      scheduleSync();
    }
  };

  const decrementPassengers = () => {
    const currentSeats = seatsRef.current;
    if (sessionRef.current && currentSeats < sessionRef.current.seats_total) {
      setSeats(currentSeats + 1);
      pendingDeparts.current++;
      setPendingTickets(prev => Math.max(0, prev - 1));
      scheduleSync();
    }
  };

  const performStopTracking = async () => {
    setIsLoading(true);
    cleanup();
    flushPendingEvents();

    if (session) {
      const endLocName = lastResolvedLocation.current?.name || null;
      await stopTracking({
        bus_id: session.bus_id,
        end_location: endLocName
      });
    }

    await AsyncStorage.removeItem('byahero_conductor_payload');
    setIsLoading(false);
    router.replace('/dashboard');
  };

  const handleStopTracking = () => {
    if (Platform.OS === 'web') {
      const confirmStop = window.confirm('Are you sure you want to end this transit tracking session?');
      if (confirmStop) {
        performStopTracking();
      }
    } else {
      Alert.alert('Stop Tracking', 'Are you sure you want to end this transit tracking session?', [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Stop Tracking',
          style: 'destructive',
          onPress: performStopTracking
        }
      ]);
    }
  };

  const loadTicketingData = async () => {
    try {
      const res = await getSyncData();
      if (res && res.success) {
        setBusStops(res.bus_stops || []);
        setBusFares(res.bus_fares || []);
      }
    } catch(e) {
      console.warn('Failed to load ticketing data', e);
    }
  };

  useEffect(() => {
    if (boardingStop && alightingStop) {
      let fareObj = busFares.find(
        (f) => f.origin_stop_id === boardingStop.stop_id && f.destination_stop_id === alightingStop.stop_id
      );
      if (!fareObj) {
        fareObj = busFares.find(
          (f) => f.origin_stop_id === alightingStop.stop_id && f.destination_stop_id === boardingStop.stop_id
        );
      }
      if (fareObj) {
        const fare = discountType === 'Regular' ? parseFloat(fareObj.regular_fare) : parseFloat(fareObj.discounted_fare);
        setTicketFare(fare);
      } else {
        setTicketFare(0);
      }
    } else {
      setTicketFare(0);
    }
  }, [boardingStop, alightingStop, discountType, busFares]);

  const handleIssueTicket = () => {
    if (!boardingStop || !alightingStop) {
      Alert.alert('Incomplete', 'Please select boarding and alighting locations.');
      return;
    }
    if (ticketFare <= 0) {
      Alert.alert('Invalid Fare', 'No fare matrix available for these locations.');
      return;
    }
    
    let remainingToDeduct = ticketQuantity;
    let pendingDeducted = 0;

    // Use up pending tickets queue first
    if (pendingTickets > 0) {
      pendingDeducted = Math.min(remainingToDeduct, pendingTickets);
      setPendingTickets(prev => prev - pendingDeducted);
      remainingToDeduct -= pendingDeducted;
    }

    // Only increment new passengers (deducts seats) if not from pending queue
    if (remainingToDeduct > 0) {
      incrementPassengers(remainingToDeduct);
    }

    const ticketData = {
      busNumber: session ? session.code : '-',
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      boarding: boardingStop.location_name,
      alighting: alightingStop.location_name,
      fare: ticketFare * ticketQuantity,
      discount: discountType,
      quantity: ticketQuantity
    };
    setIssuedTicket(ticketData);
    
    // Close modal and reset
    setIsTicketingModalVisible(false);
    setBoardingStop(null);
    setAlightingStop(null);
    setDiscountType('Regular');
    setTicketQuantity(1);
    
    Animated.spring(slideAnim, {
      toValue: 0,
      useNativeDriver: true,
      friction: 6,
      tension: 50
    }).start();
  };

  const closeReceipt = () => {
    Animated.timing(slideAnim, {
      toValue: 800,
      duration: 300,
      useNativeDriver: true,
    }).start(() => setIssuedTicket(null));
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ConductorNavbar title="Bus Live" />

      {/* Map Segment */}
      <View style={tw`flex-1 p-4`}>
        <View style={tw`flex-1 rounded-[28px] overflow-hidden border border-slate-200 shadow-sm relative`}>
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
              onMessage={() => { }}
            />
          )}
        </View>
      </View>

      {/* Control Details Panel */}
      <View style={tw`bg-white rounded-t-[28px] border-t border-slate-200 p-5 shadow-2xl`}>
        {/* Passenger Seats Increment Counter */}
        <View style={tw`items-center mb-5`}>
          <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3`}>Passenger Count</Text>
          <View style={tw`flex-row items-center gap-6`}>
            {/* Minus */}
            <TouchableOpacity onPress={decrementPassengers}>
              <Image source={require('../../assets/images/decrease.svg')} style={tw`w-14 h-14`} contentFit="contain" />
            </TouchableOpacity>

            <Text style={tw`text-5xl font-black text-slate-800 w-16 text-center`}>
              {session ? session.seats_total - seats : 0}
            </Text>

            {/* Plus */}
            <TouchableOpacity onPress={() => incrementPassengers(1)}>
              <Image source={require('../../assets/images/increase.svg')} style={tw`w-14 h-14`} contentFit="contain" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Informative Stats */}
        <View style={tw`bg-slate-50 rounded-2xl p-4 border border-slate-200 gap-3 mb-5`}>
          <View style={tw`flex-row justify-between border-b border-slate-200 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Bus Number</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{session ? session.code : '-'}</Text>
          </View>
          <View style={tw`flex-row justify-between border-b border-slate-200 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Route</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{session ? session.route : '-'}</Text>
          </View>
          <View style={tw`flex-row justify-between border-b border-slate-200 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Current Location</Text>
            <Text style={tw`text-xs font-bold text-slate-800 max-w-[60%] text-right`}>{locationName}</Text>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Last Update</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{lastUpdate}</Text>
          </View>
        </View>


        {/* STOP BUTTON */}
        <TouchableOpacity
          onPress={handleStopTracking}
          disabled={isLoading}
          style={tw`bg-red-500 rounded-full py-4 items-center justify-center shadow-md`}
        >
          {isLoading ? (
            <ActivityIndicator color="white" />
          ) : (
            <Text style={tw`text-white font-bold text-sm tracking-wider uppercase`}>Stop tracking</Text>
          )}
        </TouchableOpacity>
      </View>
      {/* TICKETING MODAL */}
      <Modal
        visible={isTicketingModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsTicketingModalVisible(false)}
      >
        <SafeAreaView style={tw`flex-1 bg-white`}>
          <View style={tw`p-5 border-b border-slate-200 flex-row justify-between items-center`}>
            <Text style={tw`text-xl font-black text-slate-800`}>Issue Ticket</Text>
            <TouchableOpacity onPress={() => setIsTicketingModalVisible(false)}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`flex-1 p-5`} keyboardShouldPersistTaps="handled">
            {/* Boarding Stop */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-2`}>Boarding Location</Text>
            <TouchableOpacity 
              style={tw`bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex-row justify-between items-center`}
              onPress={() => {
                setSelectingLocationType('boarding');
                setLocationSearch('');
                setIsLocationModalVisible(true);
              }}
            >
              <Text style={tw`text-slate-800 font-medium`}>{boardingStop ? boardingStop.location_name : 'Select Boarding Stop'}</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Alighting Stop */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-2`}>Alighting Location</Text>
            <TouchableOpacity 
              style={tw`bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 flex-row justify-between items-center`}
              onPress={() => {
                setSelectingLocationType('alighting');
                setLocationSearch('');
                setIsLocationModalVisible(true);
              }}
            >
              <Text style={tw`text-slate-800 font-medium`}>{alightingStop ? alightingStop.location_name : 'Select Alighting Stop'}</Text>
              <Ionicons name="chevron-forward" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Discount Type */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-2 mt-2`}>Discount Type</Text>
            <View style={tw`flex-row flex-wrap gap-2 mb-6`}>
              {['Regular', 'Student', 'Senior', 'PWD'].map(type => (
                <TouchableOpacity
                  key={type}
                  style={tw`px-4 py-2 rounded-full border ${discountType === type ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                  onPress={() => setDiscountType(type)}
                >
                  <Text style={tw`font-semibold ${discountType === type ? 'text-white' : 'text-slate-600'}`}>{type}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Ticket Quantity */}
            <View style={tw`flex-row justify-between items-center mb-6`}>
              <Text style={tw`text-sm font-bold text-slate-500`}>Ticket Quantity</Text>
              <View style={tw`flex-row items-center border border-slate-200 rounded-full bg-slate-50 overflow-hidden`}>
                <TouchableOpacity 
                  onPress={() => setTicketQuantity(q => Math.max(1, q - 1))}
                  style={tw`px-4 py-3 bg-slate-100`}
                >
                  <Ionicons name="remove" size={20} color="#64748b" />
                </TouchableOpacity>
                <Text style={tw`px-4 font-bold text-slate-800 text-lg`}>{ticketQuantity}</Text>
                <TouchableOpacity 
                  onPress={() => setTicketQuantity(q => q + 1)}
                  style={tw`px-4 py-3 bg-slate-100`}
                >
                  <Ionicons name="add" size={20} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Fare Summary */}
            <View style={tw`bg-blue-50 p-5 rounded-2xl border border-blue-100 mb-8 items-center`}>
              <Text style={tw`text-blue-500 font-bold uppercase tracking-widest text-xs mb-1`}>Total Fare</Text>
              <Text style={tw`text-4xl font-black text-blue-600`}>₱{(ticketFare * ticketQuantity).toFixed(2)}</Text>
            </View>
            
          </ScrollView>

          {/* Issue Button */}
          <View style={tw`p-5 border-t border-slate-200 bg-white`}>
            <TouchableOpacity
              onPress={handleIssueTicket}
              style={tw`bg-emerald-500 rounded-full py-4 items-center justify-center shadow-md`}
            >
              <Text style={tw`text-white font-bold text-base tracking-wider uppercase`}>Issue Ticket</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>

      {/* LOCATION SELECTION MODAL */}
      <Modal
        visible={isLocationModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setIsLocationModalVisible(false)}
      >
        <SafeAreaView style={tw`flex-1 bg-slate-50`}>
          <View style={tw`p-5 border-b border-slate-200 flex-row justify-between items-center bg-white`}>
            <Text style={tw`text-lg font-black text-slate-800`}>
              {selectingLocationType === 'boarding' ? 'Select Boarding Stop' : 'Select Alighting Stop'}
            </Text>
            <TouchableOpacity onPress={() => setIsLocationModalVisible(false)}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={tw`p-4 bg-white border-b border-slate-200`}>
            <View style={tw`flex-row items-center bg-slate-100 rounded-xl px-4 py-3`}>
              <Ionicons name="search" size={20} color="#94a3b8" />
              <TextInput 
                placeholder="Search locations..."
                style={tw`flex-1 ml-2 text-slate-800`}
                onChangeText={setLocationSearch}
                value={locationSearch}
              />
            </View>
          </View>

          <ScrollView style={tw`flex-1 p-4`} keyboardShouldPersistTaps="handled">
            <View style={tw`flex-row flex-wrap justify-between`}>
              {busStops
                .filter(s => (s?.location_name || '').toLowerCase().includes(locationSearch.toLowerCase()))
                .map(stop => {
                  const isSelected = selectingLocationType === 'boarding' 
                    ? boardingStop?.stop_id === stop.stop_id 
                    : alightingStop?.stop_id === stop.stop_id;
                    
                  return (
                    <TouchableOpacity 
                      key={stop.stop_id}
                      style={tw`w-[48%] mb-4 p-4 rounded-2xl border ${isSelected ? 'border-blue-500 bg-blue-50' : 'border-slate-200 bg-white'} shadow-sm items-center justify-center`}
                      onPress={() => {
                        if (selectingLocationType === 'boarding') {
                          setBoardingStop(stop);
                        } else {
                          setAlightingStop(stop);
                        }
                        setIsLocationModalVisible(false);
                      }}
                    >
                      <Text style={tw`text-center font-medium ${isSelected ? 'text-blue-600' : 'text-slate-700'}`}>
                        {stop.location_name}
                      </Text>
                      {isSelected && (
                        <View style={tw`absolute top-2 right-2`}>
                          <Ionicons name="checkmark-circle" size={16} color="#2563eb" />
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })}
            </View>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ANIMATED RECEIPT TICKET OVERLAY */}
      {issuedTicket && (
        <View style={[StyleSheet.absoluteFillObject, tw`justify-end p-5`, { backgroundColor: 'rgba(0,0,0,0.6)', zIndex: 100 }]}>
          <Animated.View 
            style={[
              tw`bg-white rounded-t-3xl rounded-b-md w-full overflow-hidden shadow-2xl`, 
              { transform: [{ translateY: slideAnim }] }
            ]}
          >
            {/* Ticket Header */}
            <View style={tw`bg-blue-600 p-6 items-center`}>
              <Ionicons name="bus" size={32} color="white" />
              <Text style={tw`text-white font-black text-xl tracking-widest mt-2`}>BYAHERO</Text>
              <Text style={tw`text-blue-200 text-xs font-bold uppercase mt-1 tracking-wider`}>E-Ticket Receipt</Text>
            </View>

            {/* Ticket Details */}
            <View style={tw`p-6 bg-white relative`}>
              {/* Jagged edge overlay simulation */}
              <View style={tw`absolute -top-3 left-0 right-0 flex-row justify-between px-2`}>
                {Array.from({length: 20}).map((_, i) => (
                  <View key={i} style={tw`w-3 h-3 bg-blue-600 rounded-full`} />
                ))}
              </View>

              <View style={tw`items-center border-b border-dashed border-slate-300 pb-5 mb-5 mt-2`}>
                <Text style={tw`text-slate-500 font-bold text-xs uppercase mb-1`}>Total Fare Paid</Text>
                <Text style={tw`text-5xl font-black text-slate-800`}>₱{issuedTicket.fare.toFixed(2)}</Text>
                <View style={tw`flex-row gap-2 mt-2`}>
                  <View style={tw`bg-blue-50 px-3 py-1 rounded-full`}>
                    <Text style={tw`text-blue-600 font-bold text-xs uppercase`}>{issuedTicket.discount} Fare</Text>
                  </View>
                  {issuedTicket.quantity > 1 && (
                    <View style={tw`bg-indigo-50 px-3 py-1 rounded-full`}>
                      <Text style={tw`text-indigo-600 font-bold text-xs uppercase`}>{issuedTicket.quantity}x Tickets</Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={tw`flex-row justify-between mb-4`}>
                <View>
                  <Text style={tw`text-xs font-bold text-slate-400 uppercase mb-1`}>Boarding</Text>
                  <Text style={tw`text-sm font-bold text-slate-800`}>{issuedTicket.boarding}</Text>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-xs font-bold text-slate-400 uppercase mb-1`}>Alighting</Text>
                  <Text style={tw`text-sm font-bold text-slate-800`}>{issuedTicket.alighting}</Text>
                </View>
              </View>

              <View style={tw`flex-row justify-between mb-6`}>
                <View>
                  <Text style={tw`text-xs font-bold text-slate-400 uppercase mb-1`}>Bus Number</Text>
                  <Text style={tw`text-sm font-bold text-slate-800`}>{issuedTicket.busNumber}</Text>
                </View>
                <View style={tw`items-end`}>
                  <Text style={tw`text-xs font-bold text-slate-400 uppercase mb-1`}>Date & Time</Text>
                  <Text style={tw`text-sm font-bold text-slate-800`}>{issuedTicket.date}</Text>
                </View>
              </View>

              {/* Close Button */}
              <TouchableOpacity
                onPress={closeReceipt}
                style={tw`bg-slate-100 rounded-full py-4 items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm tracking-wider uppercase`}>Close Ticket</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      )}
    </SafeAreaView>
  );
}
