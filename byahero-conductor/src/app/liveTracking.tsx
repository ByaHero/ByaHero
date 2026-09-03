import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  StyleSheet,
  ActivityIndicator,
  Platform,
  DeviceEventEmitter,
  AppState,
  Modal,
  ScrollView,
  TextInput,
  Animated,
  Linking
} from 'react-native';
import AlertModal from '../components/AlertModal';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import ConductorNavbar from '../components/ConductorNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getConductorLeafletHTML } from '../components/conductorMapHtml';
import { getServerUrl } from '../services/authService';
import { updateGeoLocation, logPassengerEvent, stopTracking, getMapFeatures, getSyncData, getReceiptConfig } from '../services/conductorService';
import { NativeModules } from 'react-native';
import TourOverlay from '../components/TourOverlay';
import { handleTourLayout } from '../components/TourRegistry';
import { useTourSync } from '../hooks/useTourSync';
import { usePrinter } from '../hooks/usePrinter';
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
  const { activeStep, setActiveStep } = useTourSync('/liveTracking');
  const manualTicketingRef = useRef<any>(null);
  const paxCountsRef = useRef<any>(null);
  const stopTrackingRef = useRef<any>(null);
  const [session, setSession] = useState<any>(null);
  const [seats, setSeats] = useState(0); // available seats (for server status)
  const [boardedCount, setBoardedCount] = useState(0); // total passengers on board (displayed, no cap)
  const [netStatus, setNetStatus] = useState('Active');
  const [locationName, setLocationName] = useState('Waiting for GPS...');
  const [lastUpdate, setLastUpdate] = useState('00:00');
  const [isLoading, setIsLoading] = useState(false);
  const [isStopTrackingModalVisible, setIsStopTrackingModalVisible] = useState(false);
  const [isAdminStopModalVisible, setIsAdminStopModalVisible] = useState(false);

  // Ticketing Mode States
  const [isTicketingModalVisible, setIsTicketingModalVisible] = useState(false);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [busFares, setBusFares] = useState<any[]>([]);
  const [boardingStop, setBoardingStop] = useState<any>(null);
  const [alightingStop, setAlightingStop] = useState<any>(null);
  const [discountType, setDiscountType] = useState('Regular');
  const [discountCounts, setDiscountCounts] = useState({ Regular: 1, Student: 0, Senior: 0, PWD: 0 });
  const [baseRegularFare, setBaseRegularFare] = useState(0);
  const [baseDiscountedFare, setBaseDiscountedFare] = useState(0);
  const [ticketFare, setTicketFare] = useState(0);
  const [isLocationModalVisible, setIsLocationModalVisible] = useState(false);
  const [selectingLocationType, setSelectingLocationType] = useState<'boarding'|'alighting'|null>(null);
  const [locationSearch, setLocationSearch] = useState('');
  const [issuedTicket, setIssuedTicket] = useState<any>(null);
  const [ticketQuantity, setTicketQuantity] = useState(1);
  const [pendingPreDeparture, setPendingPreDeparture] = useState(0);
  const [ticketCounter, setTicketCounter] = useState(1);

  // Printer States
  const printer = usePrinter();
  const [receiptConfig, setReceiptConfig] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);

  // Alert State
  const [alertConfig, setAlertConfig] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'success' | 'error' | 'info' | 'warning' | 'confirm';
    onConfirm: () => void;
    onCancel?: () => void;
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info',
    onConfirm: () => {},
  });

  const showAlert = (title: string, message: string, type: 'success' | 'error' | 'info' | 'warning') => {
    setAlertConfig({
      visible: true,
      title,
      message,
      type,
      onConfirm: () => setAlertConfig(prev => ({ ...prev, visible: false }))
    });
  };

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
  const boardedCountRef = useRef(boardedCount);
  useEffect(() => {
    seatsRef.current = seats;
    boardedCountRef.current = boardedCount;
    if (!session) return; // Wait until session is initialized to avoid writing default/stale 0 values on mount
    AsyncStorage.getItem('byahero_conductor_payload').then(str => {
      if (!str) return;
      try {
        const p = JSON.parse(str);
        p.current_seats = seats;
        p.current_boarded = boardedCount;
        p.pending_pre_departure = pendingPreDeparture;
        p.ticket_counter = ticketCounter;
        AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(p));
      } catch (e) {}
    });
  }, [session, seats, boardedCount, pendingPreDeparture, ticketCounter]);

  useEffect(() => {
    getServerUrl().then(url => setBaseUrl(url));
    openPrinterSetup();
    
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

  // Restore full media session & sync seat count when app comes back to foreground
  useEffect(() => {
    if (Platform.OS !== 'android' || !LocationServiceModule) return;
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        LocationServiceModule.notifyAppForeground();
        try {
          const persisted = await LocationServiceModule.getPersistedSeats();
          if (persisted !== -1) {
            setSeats(persisted);
            // Recompute boarded count from the persisted available seats
            const seatsTotal = sessionRef.current?.seats_total || 0;
            setBoardedCount(Math.max(0, seatsTotal - persisted));
          }
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, []);

  // Stable refs so media button listeners never hold stale closures
  const incrementRef = useRef<(count?: number, isManualUi?: boolean) => void>(() => {});
  const decrementRef = useRef<(isManualUi?: boolean) => void>(() => {});
  const adminStopRef = useRef<() => void>(() => {});
  useEffect(() => { incrementRef.current = incrementPassengers; });
  useEffect(() => { decrementRef.current = decrementPassengers; });
  useEffect(() => { adminStopRef.current = handleAdminStop; });

  // Wire media button events — registered once, never stale
  useEffect(() => {
    if (Platform.OS === 'web') return;
    const nextListener = DeviceEventEmitter.addListener('media-session-next', () => incrementRef.current(1, true));
    const prevListener = DeviceEventEmitter.addListener('media-session-prev', () => decrementRef.current(true));
    const stopListener = DeviceEventEmitter.addListener('admin_stop', () => adminStopRef.current());
    return () => { nextListener.remove(); prevListener.remove(); stopListener.remove(); };
  }, []);

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

    const seatsTotal = payload.seats_total || 0;
    const isResumed = payload.current_seats !== undefined;

    // Compute available seats
    // For a brand new session, seats available = seats_total - pre_departure_count
    // For a resumed session, restore from persisted state
    let restoredSeats = isResumed
      ? payload.current_seats
      : seatsTotal - (payload.pre_departure_count || 0);

    // Compute boarded count
    // For a brand new session: pre_departure_count passengers are already on board
    // For a resumed session: restore persisted boarded count
    let restoredBoarded = isResumed
      ? (payload.current_boarded !== undefined ? payload.current_boarded : seatsTotal - payload.current_seats)
      : (payload.pre_departure_count || 0);

    // Only restore from native module if this is a resumed active session.
    // For new sessions, always use the freshly computed values to prevent ghost
    // passengers from a previous unclean session bleeding in.
    if (!payload.isSimulation && Platform.OS === 'android' && LocationServiceModule && isResumed) {
      try {
        const persisted = await LocationServiceModule.getPersistedSeats();
        if (persisted !== -1) {
          restoredSeats = persisted;
          restoredBoarded = Math.max(0, seatsTotal - persisted);
        }
      } catch (_) {}
    }

    setSeats(restoredSeats);
    setBoardedCount(restoredBoarded);

    if (payload.isSimulation) {
      return; // SIMULATION MODE: Do not connect to background location services or real backend tracking
    }

    if (Platform.OS === 'android' && LocationServiceModule) {
      getServerUrl().then(async baseUrl => {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
        LocationServiceModule.updateSessionData({
          bus_id: String(payload.bus_id),
          code: payload.code || '',
          route: payload.route || '',
          seats_total: seatsTotal,
          seats_available: restoredSeats,
          force_seats: true,
          server_url: baseUrl,
          email: cachedEmail
        });
      });
    }
    
    let restoredPending = payload.pending_pre_departure !== undefined
      ? payload.pending_pre_departure
      : (payload.pre_departure_count || 0);
    setPendingPreDeparture(restoredPending);

    let restoredCounter = payload.ticket_counter !== undefined ? payload.ticket_counter : 1;
    setTicketCounter(restoredCounter);

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
    // Start the Android foreground service to keep GPS alive when backgrounded
    if (Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.startService();
      const s = sessionRef.current;
      if (s) LocationServiceModule.updateMetadata(
        `Seats: ${seatsRef.current}`,
        `Bus ${s.code} - Route: ${s.route}`
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
    if (sessionRef.current?.isSimulation) return;
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

    if (Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        lat,
        lng,
        speed,
        location_name: resolved
      });
      setNetStatus('Live');
    }
    
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
      const res = await updateGeoLocation(payload);
      if (res && res.success === false && res.error && res.error.includes('403')) {
        handleAdminStop();
        return;
      }
      setNetStatus('Live');
    } catch (e) {
      if (e instanceof Error && e.message.includes('403')) {
        handleAdminStop();
        return;
      }
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
    if (sessionRef.current?.isSimulation) return;
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
      } else if (res && res.success === false && res.error && res.error.includes('403')) {
        handleAdminStop();
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

  const incrementPassengers = (count = 1, isManualUi = false, skipPending = false) => {
    if (!sessionRef.current) return;
    // No upper cap — count all boarding passengers for analytics
    const newBoarded = boardedCountRef.current + count;
    const seatsTotal = sessionRef.current.seats_total || 0;
    const newSeats = seatsTotal - newBoarded;
    setBoardedCount(newBoarded);
    setSeats(newSeats);
    pendingBoards.current += count;

    scheduleSync();
    if (isManualUi && Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        seats_available: newSeats,
        force_seats: true
      });
    }
  };

  const decrementPassengers = (isManualUi = false) => {
    if (!sessionRef.current) return;
    // Don't go below 0 boarded passengers
    if (boardedCountRef.current <= 0) return;
    const newBoarded = boardedCountRef.current - 1;
    const seatsTotal = sessionRef.current.seats_total || 0;
    const newSeats = Math.min(seatsTotal, seatsRef.current + 1);
    setBoardedCount(newBoarded);
    setSeats(newSeats);
    pendingDeparts.current++;
    scheduleSync();
    if (isManualUi && Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        seats_available: newSeats,
        force_seats: true
      });
    }
  };

  const performStopTracking = async () => {
    setIsLoading(true);
    cleanup();
    flushPendingEvents();

    if (session && !session.isSimulation) {
      const endLocName = lastResolvedLocation.current?.name || null;
      await stopTracking({
        bus_id: session.bus_id,
        end_location: endLocName
      });
    }

    // Reset native module persisted seats so the next session starts clean
    if (Platform.OS === 'android' && LocationServiceModule) {
      try {
        LocationServiceModule.updateSessionData({
          seats_available: 0,
          force_seats: true
        });
      } catch (_) {}
    }

    await AsyncStorage.removeItem('byahero_conductor_payload');
    setIsLoading(false);
    router.replace('/dashboard');
  };

  const handleAdminStop = () => {
    cleanup();
    // Reset native module persisted seats so the next session starts clean
    if (Platform.OS === 'android' && LocationServiceModule) {
      try {
        LocationServiceModule.updateSessionData({
          seats_available: 0,
          force_seats: true
        });
      } catch (_) {}
    }
    AsyncStorage.removeItem('byahero_conductor_payload').then(() => {
      setIsAdminStopModalVisible(true);
    });
  };

  const confirmAdminStop = () => {
    setIsAdminStopModalVisible(false);
    router.replace('/dashboard');
  };

  const handleStopTracking = () => {
    setIsStopTrackingModalVisible(true);
  };

  const confirmStopTracking = () => {
    setIsStopTrackingModalVisible(false);
    performStopTracking();
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
      const pKm = Math.round(parseFloat(boardingStop.km_marker || 0));
      const dKm = Math.round(parseFloat(alightingStop.km_marker || 0));
      const distance = Math.abs(dKm - pKm);
      const direction = dKm >= pKm ? 'LT' : 'TL';

      const fareObj = busFares.find(f => f.direction === direction && parseInt(f.distance_km) === distance);

      let rFare = 0, dFare = 0;
      if (fareObj) {
        rFare = parseFloat(fareObj.regular_fare);
        dFare = parseFloat(fareObj.discounted_fare);
      } else {
        // Fallback LTFRB
        if (distance <= 4) {
          rFare = 14.00;
          dFare = 11.25;
        } else {
          rFare = Math.round((14.00 + (distance - 4) * 2.20) * 4) / 4;
          dFare = Math.round((11.25 + (distance - 4) * 1.76) * 4) / 4;
        }
      }
      setBaseRegularFare(rFare);
      setBaseDiscountedFare(dFare);
      
      const total = (discountCounts.Regular * rFare) + ((discountCounts.Student + discountCounts.Senior + discountCounts.PWD) * dFare);
      setTicketFare(total);
    } else {
      setBaseRegularFare(0);
      setBaseDiscountedFare(0);
      setTicketFare(0);
    }
  }, [boardingStop, alightingStop, discountCounts, busFares]);


  const handleIncreaseQuantity = () => {
    setTicketQuantity(q => q + 1);
    setDiscountCounts(prev => ({ ...prev, Regular: prev.Regular + 1 }));
  };

  const handleDecreaseQuantity = () => {
    setTicketQuantity(q => {
      if (q <= 1) return 1;
      setDiscountCounts(prev => {
        const next = { ...prev };
        if (next.Regular > 0) next.Regular--;
        else if (next.Student > 0) next.Student--;
        else if (next.Senior > 0) next.Senior--;
        else if (next.PWD > 0) next.PWD--;
        return next;
      });
      return q - 1;
    });
  };

  const updateDiscountCount = (type: string, delta: number) => {
    setDiscountCounts(prev => {
      const next = { ...prev };
      const current = next[type as keyof typeof next];
      if (delta > 0) {
         const availableType = Object.keys(next).find(k => k !== type && next[k as keyof typeof next] > 0);
         if (availableType) {
           next[availableType as keyof typeof next]--;
           next[type as keyof typeof next]++;
         }
      } else if (delta < 0) {
         if (current > 0) {
            next[type as keyof typeof next]--;
            next['Regular']++; 
         }
      }
      return next;
    });
  };

  const handleIssueTicket = () => {
    if (!boardingStop || !alightingStop) {
      showAlert('Incomplete', 'Please select boarding and alighting locations.', 'warning');
      return;
    }
    if (ticketFare <= 0) {
      showAlert('Invalid Fare', 'No fare matrix available for these locations.', 'warning');
      return;
    }
    
    let remainingToDeduct = ticketQuantity;
    let preDepartureDeducted = 0;
    // Use up pending pre-departure queue first
    if (pendingPreDeparture > 0) {
      preDepartureDeducted = Math.min(remainingToDeduct, pendingPreDeparture);
      setPendingPreDeparture(prev => prev - preDepartureDeducted);
      remainingToDeduct -= preDepartureDeducted;
    }
    if (remainingToDeduct > 0) {
      incrementPassengers(remainingToDeduct, true);
    }

    const ticketData = {
      busNumber: session ? session.code : '-',
      date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      boarding: boardingStop.location_name,
      alighting: alightingStop.location_name,
      fare: ticketFare,
      discount: ticketQuantity > 1 ? 'Mixed' : discountType,
      quantity: ticketQuantity,
      ticketNumber: String(ticketCounter).padStart(5, '0'),
      breakdown: discountCounts,
      baseRegularFare: baseRegularFare,
      baseDiscountedFare: baseDiscountedFare
    };
    setIssuedTicket(ticketData);
    setTicketCounter(prev => prev + 1);
    
    // Close modal and reset
    setIsTicketingModalVisible(false);
    setBoardingStop(null);
    setAlightingStop(null);
    setDiscountType('Regular');
    setDiscountCounts({ Regular: 1, Student: 0, Senior: 0, PWD: 0 });
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

  const openPrinterSetup = async () => {
    // Already setup in dashboard, just fetch config if missing
    if (!receiptConfig) {
      try {
        const res = await getReceiptConfig();
        if (res && res.success) {
          setReceiptConfig(res.config);
        }
      } catch(e) {
        console.warn('Failed to fetch receipt config', e);
      }
    }
  };

  const executePrint = async () => {
    setIsPrinting(true);
    try {
      await printer.printReceipt(issuedTicket, receiptConfig);
      showAlert('Print Successful', 'Ticket has been printed via PT-210.', 'success');
      closeReceipt();
    } catch (e: any) {
      console.error(e);
      showAlert('Print Error', e.message || 'Failed to print receipt.', 'error');
    } finally {
      setIsPrinting(false);
    }
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
          <View ref={manualTicketingRef} onLayout={() => handleTourLayout('manual-ticketing', manualTicketingRef)} style={tw`flex-row items-center gap-6`}>
            {/* Minus */}
            <TouchableOpacity onPress={() => decrementPassengers(true)}>
              <Image source={require('../../assets/images/decrease.svg')} style={tw`w-14 h-14`} contentFit="contain" />
            </TouchableOpacity>

            <View ref={paxCountsRef} onLayout={() => handleTourLayout('pax-counts', paxCountsRef)}>
              <Text style={tw`text-5xl font-black text-slate-800 w-16 text-center`}>
                {boardedCount}
              </Text>
            </View>

            {/* Plus */}
            <TouchableOpacity onPress={() => incrementPassengers(1, true)}>
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

        {/* PENDING TERMINAL TICKETS BANNER */}
        {pendingPreDeparture > 0 && (
          <View style={tw`bg-amber-100 border border-amber-300 rounded-xl p-4 mb-4 flex-row items-center`}>
            <Ionicons name="warning" size={24} color="#d97706" />
            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-amber-800 font-bold`}>Pending Terminal Tickets</Text>
              <Text style={tw`text-amber-700 text-xs mt-0.5`}>You have {pendingPreDeparture} pre-departure passenger(s) to ticket.</Text>
            </View>
          </View>
        )}

        {session?.ticketing_mode === 'Automatic' && (
          <TouchableOpacity
            onPress={() => {
              setIsTicketingModalVisible(true);
              if (busStops.length === 0) loadTicketingData();
            }}
            style={tw`bg-blue-600 rounded-full py-4 items-center justify-center shadow-md mb-4`}
          >
            <Text style={tw`text-white font-bold text-sm tracking-wider uppercase`}>Produce Ticket</Text>
          </TouchableOpacity>
        )}

        {/* STOP BUTTON */}
        <TouchableOpacity
          ref={stopTrackingRef}
          onLayout={() => handleTourLayout('stop-tracking', stopTrackingRef)}
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
          <View style={tw`p-5 border-b border-slate-200 flex-row items-center justify-center relative`}>
            <Text style={tw`text-xl font-black text-slate-800 text-center`}>Issue Ticket</Text>
            <TouchableOpacity onPress={() => setIsTicketingModalVisible(false)} style={tw`absolute right-5`}>
              <Ionicons name="close" size={28} color="#64748b" />
            </TouchableOpacity>
          </View>

          <ScrollView style={tw`flex-1 p-5`} keyboardShouldPersistTaps="handled">
            {/* Boarding Stop */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-2 text-center`}>Boarding Location</Text>
            <TouchableOpacity 
              style={tw`bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 items-center`}
              onPress={() => {
                setSelectingLocationType('boarding');
                setLocationSearch('');
                setIsLocationModalVisible(true);
              }}
            >
              <Text style={tw`text-slate-800 font-bold text-center mb-1`}>{boardingStop ? boardingStop.location_name : 'Select Boarding Stop'}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Alighting Stop */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-2 text-center mt-2`}>Alighting Location</Text>
            <TouchableOpacity 
              style={tw`bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4 items-center`}
              onPress={() => {
                setSelectingLocationType('alighting');
                setLocationSearch('');
                setIsLocationModalVisible(true);
              }}
            >
              <Text style={tw`text-slate-800 font-bold text-center mb-1`}>{alightingStop ? alightingStop.location_name : 'Select Alighting Stop'}</Text>
              <Ionicons name="chevron-down" size={20} color="#64748b" />
            </TouchableOpacity>

            {/* Ticket Quantity */}
            <Text style={tw`text-sm font-bold text-slate-500 text-center mb-3 mt-4`}>Ticket Quantity</Text>
            <View style={tw`flex-row justify-center mb-6`}>
              <View style={tw`flex-row items-center border border-slate-200 rounded-full bg-slate-50 overflow-hidden`}>
                <TouchableOpacity 
                  onPress={handleDecreaseQuantity}
                  style={tw`px-5 py-4 bg-slate-100`}
                >
                  <Ionicons name="remove" size={24} color="#64748b" />
                </TouchableOpacity>
                <Text style={tw`px-6 font-black text-slate-800 text-2xl`}>{ticketQuantity}</Text>
                <TouchableOpacity 
                  onPress={handleIncreaseQuantity}
                  style={tw`px-5 py-4 bg-slate-100`}
                >
                  <Ionicons name="add" size={24} color="#64748b" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Discount Type */}
            <Text style={tw`text-sm font-bold text-slate-500 mb-3 mt-4 text-center`}>Discount Type</Text>
            {ticketQuantity === 1 ? (
              <View style={tw`flex-row flex-wrap justify-center gap-2 mb-8`}>
                {['Regular', 'Student', 'Senior', 'PWD'].map(type => (
                  <TouchableOpacity
                    key={type}
                    style={tw`px-5 py-2.5 rounded-full border ${discountType === type ? 'bg-blue-600 border-blue-600' : 'bg-white border-slate-300'}`}
                    onPress={() => {
                      setDiscountType(type);
                      setDiscountCounts({ Regular: 0, Student: 0, Senior: 0, PWD: 0, [type]: 1 });
                    }}
                  >
                    <Text style={tw`font-semibold ${discountType === type ? 'text-white' : 'text-slate-600'}`}>{type}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            ) : (
              <View style={tw`px-4 mb-8`}>
                {['Regular', 'Student', 'Senior', 'PWD'].map(type => (
                  <View key={type} style={tw`flex-row justify-between items-center mb-2 bg-slate-50 p-3 rounded-xl border border-slate-200`}>
                    <Text style={tw`font-bold text-slate-700`}>{type}</Text>
                    <View style={tw`flex-row items-center`}>
                      <TouchableOpacity 
                        onPress={() => updateDiscountCount(type, -1)}
                        style={tw`px-3 py-2 bg-slate-200 rounded-l-lg`}
                      >
                        <Ionicons name="remove" size={16} color="#64748b" />
                      </TouchableOpacity>
                      <Text style={tw`px-4 font-bold text-slate-800`}>{discountCounts[type as keyof typeof discountCounts]}</Text>
                      <TouchableOpacity 
                        onPress={() => updateDiscountCount(type, 1)}
                        style={tw`px-3 py-2 bg-slate-200 rounded-r-lg`}
                      >
                        <Ionicons name="add" size={16} color="#64748b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* Fare Summary */}
            <View style={tw`bg-blue-50 p-6 rounded-3xl border border-blue-100 mb-8 items-center shadow-sm`}>
              <Text style={tw`text-blue-500 font-bold uppercase tracking-widest text-xs mb-2`}>Total Fare</Text>
              <Text style={tw`text-5xl font-black text-blue-600`}>₱{(ticketFare).toFixed(2)}</Text>
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
          <View style={tw`p-5 border-b border-slate-200 flex-row justify-center items-center bg-white relative`}>
            <Text style={tw`text-lg font-black text-slate-800 text-center`}>
              {selectingLocationType === 'boarding' ? 'Select Boarding Stop' : 'Select Alighting Stop'}
            </Text>
            <TouchableOpacity onPress={() => setIsLocationModalVisible(false)} style={tw`absolute right-5`}>
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
            {/* Thermal Receipt Style Ticket */}
            <View style={tw`bg-white p-6 relative`}>
              {/* Jagged edge overlay simulation */}
              <View style={tw`absolute -top-3 left-0 right-0 flex-row justify-between px-2`}>
                {Array.from({length: 20}).map((_, i) => (
                  <View key={i} style={tw`w-3 h-3 bg-white rounded-full border-t border-slate-200`} />
                ))}
              </View>

              <View style={tw`items-center mb-6`}>
                <Text style={tw`font-mono text-slate-800 text-[11px] mb-1`}>
                  {issuedTicket.busNumber} {issuedTicket.ticketNumber}
                </Text>
                <Text style={tw`font-mono text-slate-800 text-sm mb-1`}>
                  {receiptConfig?.company_name || 'ByaHero Transport'}
                </Text>
                <Text style={tw`font-mono text-slate-800 text-[13px] font-bold mb-1`}>
                  Fare Payment
                </Text>
                <Text style={tw`font-mono text-slate-800 text-[11px]`}>
                  {issuedTicket.date}
                </Text>
              </View>

              <View style={tw`flex-col gap-2 mb-6`}>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Route:</Text>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>{session?.route || 'Unknown'}</Text>
                </View>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Board At:</Text>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>{issuedTicket.boarding}</Text>
                </View>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Alight At:</Text>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>{issuedTicket.alighting}</Text>
                </View>

                {issuedTicket.quantity === 1 ? (
                  <>
                    <View style={tw`flex-row justify-between`}>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>Fare Type:</Text>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>{issuedTicket.discount}</Text>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>Fare Amount:</Text>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>P{issuedTicket.fare.toFixed(2)}</Text>
                    </View>
                  </>
                ) : (
                  <>
                    <View style={tw`flex-row justify-between`}>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>Fare Types:</Text>
                      <View style={tw`items-end`}>
                        {['Regular', 'Student', 'Senior', 'PWD'].map(type => {
                          const count = issuedTicket.breakdown?.[type] || 0;
                          if (count === 0) return null;
                          return <Text key={type} style={tw`font-mono text-slate-800 text-[13px]`}>{count}x {type}</Text>;
                        })}
                      </View>
                    </View>
                    <View style={tw`flex-row justify-between`}>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>Fare Amount:</Text>
                      <Text style={tw`font-mono text-slate-800 text-[13px]`}>P{issuedTicket.fare.toFixed(2)}</Text>
                    </View>
                  </>
                )}
              </View>

              <View style={tw`flex-col gap-2 mb-8`}>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Payment:</Text>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Cash</Text>
                </View>
                <View style={tw`flex-row justify-between`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Service Fee:</Text>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>P0.00</Text>
                </View>
                <View style={tw`flex-row justify-between mt-2`}>
                  <Text style={tw`font-mono text-slate-800 text-[13px]`}>Total Amount</Text>
                  <Text style={tw`font-mono text-slate-800 text-[18px] font-bold tracking-widest`}>P{issuedTicket.fare.toFixed(2)}</Text>
                </View>
              </View>

              <View style={tw`items-center`}>
                <Text style={tw`font-mono text-slate-800 text-[11px]`}>
                  {session?.code || 'MTC T013'}
                </Text>
              </View>

              {/* Close / Print Button */}
              <View style={tw`flex-row gap-3 mt-6`}>
                <TouchableOpacity
                  onPress={closeReceipt}
                  style={tw`flex-1 bg-slate-100 rounded-full py-4 items-center justify-center`}
                >
                  <Text style={tw`text-slate-600 font-bold text-sm tracking-wider uppercase`}>Close Ticket</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={executePrint}
                  disabled={isPrinting}
                  style={tw`flex-1 bg-blue-600 rounded-full py-4 items-center justify-center flex-row`}
                >
                  {isPrinting ? (
                    <ActivityIndicator color="white" />
                  ) : (
                    <>
                      <Ionicons name="print" size={18} color="white" style={tw`mr-2`} />
                      <Text style={tw`text-white font-bold text-sm tracking-wider uppercase`}>Print Ticket</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </Animated.View>
        </View>
      )}

      {/* Custom Stop Tracking Modal */}
      <Modal
        visible={isStopTrackingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStopTrackingModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            <TouchableOpacity
              onPress={() => setIsStopTrackingModalVisible(false)}
              style={tw`absolute top-4 right-4 p-1 z-10`}
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4`}>
              <MaterialIcons name="bus-alert" size={32} color="#ef4444" />
            </View>

            <Text style={tw`text-lg font-black text-slate-800 text-center mb-1.5`}>
              End Transit Session?
            </Text>
            <Text style={tw`text-xs text-slate-500 text-center leading-relaxed mb-6`}>
              Are you sure you want to end live transit tracking for this bus? Passengers will no longer see live GPS updates.
            </Text>

            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setIsStopTrackingModalVisible(false)}
                style={tw`flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmStopTracking}
                style={tw`flex-1 bg-red-600 py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                <Text style={tw`text-white font-bold text-sm`}>End Session</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Admin Terminated Modal */}
      <Modal
        visible={isAdminStopModalVisible}
        transparent
        animationType="fade"
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            
            <View style={tw`w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4`}>
              <MaterialIcons name="gpp-bad" size={32} color="#ef4444" />
            </View>

            <Text style={tw`text-lg font-black text-slate-800 text-center mb-1.5`}>
              Session Terminated
            </Text>
            <Text style={tw`text-sm text-slate-500 text-center leading-relaxed mb-6`}>
              Your tracking session was forcefully stopped by an Administrator.
            </Text>

            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={confirmAdminStop}
                style={tw`flex-1 bg-red-600 py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                <Text style={tw`text-white font-bold text-sm`}>OK</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>



      {/* Tour Overlay */}
      {activeStep !== null && (
        <TourOverlay 
          currentStep={activeStep} 
          onStepChange={setActiveStep} 
          onClose={() => setActiveStep(null)} 
        />
      )}

      <AlertModal
        visible={alertConfig.visible}
        title={alertConfig.title}
        message={alertConfig.message}
        type={alertConfig.type}
        onConfirm={alertConfig.onConfirm}
        onCancel={alertConfig.onCancel}
      />
    </SafeAreaView>
  );
}
