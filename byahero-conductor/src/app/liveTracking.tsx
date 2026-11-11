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
  Linking,
  Alert
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
import { updateGeoLocation, logPassengerEvent, stopTracking, getMapFeatures, getSyncData, getReceiptConfig, printTicket, getTripSummary } from '../services/conductorService';
import { NativeModules } from 'react-native';
import TourOverlay from '../components/TourOverlay';
import { handleTourLayout } from '../components/TourRegistry';
import { useTourSync } from '../hooks/useTourSync';
import { usePrinter } from '../hooks/usePrinter';
import PrinterModal from '../components/PrinterModal';
import AutoTicketingDrawer, { ISessionReceipt } from '../components/AutoTicketingDrawer';
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
  const [totalServed, setTotalServed] = useState(0); // cumulative passengers served for the trip
  const [netStatus, setNetStatus] = useState('Active');
  const [locationName, setLocationName] = useState('Waiting for GPS...');
  const [lastUpdate, setLastUpdate] = useState('00:00');
  const [isLoading, setIsLoading] = useState(false);
  const [isStopTrackingModalVisible, setIsStopTrackingModalVisible] = useState(false);
  const [isAdminStopModalVisible, setIsAdminStopModalVisible] = useState(false);
  
  // Trip Summary States
  const [tripSummary, setTripSummary] = useState<any>(null);
  const [summaryConfig, setSummaryConfig] = useState<any>({ summary_title: 'TRIP SUMMARY', show_conductor: true, show_route: true, show_breakdown: true, show_trip_id: true, show_signatures: true });
  const [isSummaryLoading, setIsSummaryLoading] = useState(false);
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
  const [pendingConfirmCount, setPendingConfirmCount] = useState(0);
  const [confirmSecondsLeft, setConfirmSecondsLeft] = useState(0);
  const [ticketCounter, setTicketCounter] = useState(1);
  const [sessionInitialized, setSessionInitialized] = useState(false);
  const [activePassengers, setActivePassengers] = useState<any[]>([]);
  const [isInTraffic, setIsInTraffic] = useState(false);
  const [trafficDelayMins, setTrafficDelayMins] = useState(0);

  // Printer States (active only in Automatic Ticketing mode)
  const isAutoTicketing = session?.ticketing_mode === 'Automatic';
  const printer = usePrinter(isAutoTicketing);
  const [receiptConfig, setReceiptConfig] = useState<any>(null);
  const [isPrinting, setIsPrinting] = useState(false);
  const [isInterimModalVisible, setIsInterimModalVisible] = useState(false);
  const [isPrinterModalVisible, setIsPrinterModalVisible] = useState(false);
  const [isSessionDrawerVisible, setIsSessionDrawerVisible] = useState(false);
  const [sessionReceipts, setSessionReceipts] = useState<ISessionReceipt[]>([]);
  const [reprintingReceiptId, setReprintingReceiptId] = useState<string | null>(null);

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
  
  // Traffic detection
  const speedBuffer = useRef<{speed_kmh: number, ts: number}[]>([]);
  const sustainedSlowSeconds = useRef(0);

  // Passenger event accumulation
  const pendingBoards = useRef(0);
  const pendingDeparts = useRef(0);
  const syncTimer = useRef<any>(null);
  const pendingPreDepartureRef = useRef(0);
  const pendingConfirmCountRef = useRef(0);
  const pendingConfirmTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    if (!session || !sessionInitialized) return; // Wait until session is initialized to avoid writing default/stale 0 values on mount
    AsyncStorage.getItem('byahero_conductor_payload').then(str => {
      if (!str) return;
      try {
        const p = JSON.parse(str);
        p.current_seats = seats;
        p.current_boarded = boardedCount;
        p.total_served = totalServed;
        p.pending_pre_departure = p.ticketing_mode === 'Automatic' ? pendingPreDeparture : 0;
        p.active_passengers = activePassengers;
        p.session_receipts = sessionReceipts;
        delete p.is_new_session;
        AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(p));
        AsyncStorage.setItem('byahero_conductor_ticket_counter', JSON.stringify(ticketCounter));
      } catch (e) {}
    });
  }, [session, sessionInitialized, seats, boardedCount, totalServed, pendingPreDeparture, ticketCounter, activePassengers, sessionReceipts]);

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

  // Restore full media session & sync seat count when app comes back to foreground
  useEffect(() => {
    if (Platform.OS !== 'android' || !LocationServiceModule) return;
    const sub = AppState.addEventListener('change', async state => {
      if (state === 'active') {
        LocationServiceModule.notifyAppForeground();
        try {
          const isRunning = await LocationServiceModule.isRunning();
          if (isRunning && sessionInitialized && !sessionRef.current?.is_new_session) {
            const persisted = await LocationServiceModule.getPersistedSeats();
            if (persisted !== -1) {
              const seatsTotal = sessionRef.current?.seats_total || 0;
              if (seatsTotal > 0) {
                setSeats(persisted);
                // Recompute boarded count from the persisted available seats
                const newBoarded = Math.max(0, seatsTotal - persisted);
                setBoardedCount(prev => {
                  if (newBoarded > prev) {
                    setTotalServed(ts => ts + (newBoarded - prev));
                  }
                  return newBoarded;
                });
              }
            }
          }
        } catch (_) {}
      }
    });
    return () => sub.remove();
  }, [sessionInitialized]);

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
    if (pendingConfirmTimerRef.current) {
      clearInterval(pendingConfirmTimerRef.current);
      pendingConfirmTimerRef.current = null;
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
    const isResumed = !payload.is_new_session;
    const preDep = payload.pre_departure_count || 0;
    const initialAvailable = payload.initial_available_seats !== undefined
      ? payload.initial_available_seats
      : Math.max(0, seatsTotal - preDep);

    // Compute available seats
    // For a brand new session, seats available = seats_total - pre_departure_count
    // For a resumed session, restore from persisted state
    let restoredSeats = isResumed && payload.current_seats !== undefined
      ? payload.current_seats
      : initialAvailable;

    // Compute boarded count
    // For a brand new session: pre_departure_count passengers are already on board
    // For a resumed session: restore persisted boarded count
    let restoredBoarded = isResumed && payload.current_boarded !== undefined
      ? payload.current_boarded
      : preDep;

    // Only restore from native module if this is a resumed active session AND service is running.
    // For new sessions, always use the freshly computed values to prevent ghost
    // passengers from a previous unclean session bleeding in.
    if (!payload.isSimulation && Platform.OS === 'android' && LocationServiceModule && isResumed) {
      try {
        const isRunning = await LocationServiceModule.isRunning();
        if (isRunning) {
          const persisted = await LocationServiceModule.getPersistedSeats();
          if (persisted !== -1) {
            restoredSeats = persisted;
            restoredBoarded = Math.max(0, seatsTotal - persisted);
          }
        }
      } catch (_) {}
    }

    setSeats(restoredSeats);
    boardedCountRef.current = restoredBoarded;
    setBoardedCount(restoredBoarded);
    const restoredServed = isResumed && payload.total_served !== undefined
      ? Math.max(payload.total_served, restoredBoarded)
      : restoredBoarded;
    setTotalServed(restoredServed);

    if (payload.isSimulation) {
      setSessionInitialized(true);
      return; // SIMULATION MODE: Do not connect to background location services or real backend tracking
    }

    if (Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        bus_id: String(payload.bus_id),
        code: payload.code || '',
        route: payload.route || '',
        seats_total: seatsTotal,
        seats_available: restoredSeats,
        force_seats: true
      });

      getServerUrl().then(async baseUrl => {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
        LocationServiceModule.updateSessionData({
          server_url: baseUrl,
          email: cachedEmail
        });
      });
    }
    
    const isAutoMode = payload.ticketing_mode === 'Automatic';
    if (isAutoMode) {
      openPrinterSetup();
    }
    let restoredPending = (isAutoMode && payload.pending_pre_departure !== undefined)
      ? payload.pending_pre_departure
      : (isAutoMode ? preDep : 0);
    pendingConfirmCountRef.current = 0;
    setPendingConfirmCount(0);
    setConfirmSecondsLeft(0);
    clearPendingConfirmTimer();
    syncPendingPreDeparture(isAutoMode ? restoredPending : 0);

    try {
      const ticketStr = await AsyncStorage.getItem('byahero_conductor_ticket_counter');
      if (ticketStr) {
        setTicketCounter(JSON.parse(ticketStr));
      } else {
        setTicketCounter(1);
      }
    } catch (e) {
      setTicketCounter(1);
    }
    
    setActivePassengers(payload.active_passengers || []);
    setSessionReceipts(Array.isArray(payload.session_receipts) ? payload.session_receipts : []);
    setSessionInitialized(true);

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

    // Update speed buffer
    const nowTs = Date.now();
    speedBuffer.current.push({ speed_kmh: speed * 3.6, ts: nowTs });
    speedBuffer.current = speedBuffer.current.filter(entry => nowTs - entry.ts <= 120000); // last 2 minutes

    // Calculate sustained slow seconds
    let slowTime = 0;
    for (let i = speedBuffer.current.length - 1; i >= 0; i--) {
      if (speedBuffer.current[i].speed_kmh <= 5) {
        if (i === 0) slowTime = (nowTs - speedBuffer.current[0].ts) / 1000;
      } else {
        if (i < speedBuffer.current.length - 1) {
          slowTime = (nowTs - speedBuffer.current[i + 1].ts) / 1000;
        }
        break;
      }
    }
    
    // Calculate clear condition
    let fastTime = 0;
    for (let i = speedBuffer.current.length - 1; i >= 0; i--) {
      if (speedBuffer.current[i].speed_kmh > 10) {
        if (i === 0) fastTime = (nowTs - speedBuffer.current[0].ts) / 1000;
      } else {
        if (i < speedBuffer.current.length - 1) {
          fastTime = (nowTs - speedBuffer.current[i + 1].ts) / 1000;
        }
        break;
      }
    }
    
    sustainedSlowSeconds.current = slowTime;
    
    if (slowTime >= 90) {
      setIsInTraffic(true);
    } else if (fastTime >= 30) {
      setIsInTraffic(false);
      setTrafficDelayMins(0);
    }

    // Resolve Location Name
    let resolved = resolvedLocationNameCached(lat, lng);
    setLocationName(resolved);

    // Auto-Depart Logic
    if (sessionRef.current?.ticketing_mode === 'Automatic' && resolved && !resolved.includes(',')) {
      setActivePassengers(prev => {
        const matchingGroup = prev.find(p => p.alightingStop === resolved);
        if (matchingGroup && matchingGroup.count > 0) {
          const count = matchingGroup.count;
          
          setSeats(s => s + count);
          setBoardedCount(b => b - count);
          pendingDeparts.current += count;
          flushPendingEvents();
          showAlert('Auto-Depart', `${count} passenger(s) arrived at ${resolved}`, 'success');
          
          return prev.filter(p => p.alightingStop !== resolved);
        }
        return prev;
      });
    }

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
      current_location_name: locName,
      sustained_slow_seconds: sustainedSlowSeconds.current
    };

    try {
      const res = await updateGeoLocation(payload);
      if (res && res.success === false && res.error && res.error.includes('403')) {
        handleAdminStop();
        return;
      }
      if (res && res.success) {
        if (res.is_in_traffic !== undefined) {
          setIsInTraffic(res.is_in_traffic);
          setTrafficDelayMins(res.traffic_extra_delay_minutes || 0);
        }
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

  const flushPendingEvents = async () => {
    const activeSession = sessionRef.current || session;
    if (activeSession?.isSimulation) return;
    const netBoards = pendingBoards.current;
    const netDeparts = pendingDeparts.current;
    pendingBoards.current = 0;
    pendingDeparts.current = 0;

    const net = netBoards - netDeparts;
    if (net === 0 || !activeSession?.operation_id) return;

    const eventType = net > 0 ? 'board' : 'depart';
    const count = Math.abs(net);
    const locName = lastResolvedLocation.current?.name || null;
    const lat = lastCoords.current?.lat || null;
    const lng = lastCoords.current?.lng || null;

    try {
      const res = await logPassengerEvent({
        operation_id: activeSession.operation_id,
        event_type: eventType,
        count,
        location_name: locName,
        lat,
        lng
      });
      if (res && res.success) {
        console.log(`Passenger ${eventType} event logged successfully.`);
      } else if (res && res.success === false && res.error && res.error.includes('403')) {
        handleAdminStop();
      }
    } catch (err) {
      console.warn('Failed to flush passenger event:', err);
    }
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

  const clearPendingConfirmTimer = () => {
    if (pendingConfirmTimerRef.current) {
      clearInterval(pendingConfirmTimerRef.current);
      pendingConfirmTimerRef.current = null;
    }
  };

  const syncPendingPreDeparture = (nextCount: number) => {
    const clamped = Math.max(0, nextCount);
    pendingPreDepartureRef.current = clamped;
    setPendingPreDeparture(clamped);
  };

  const startPendingConfirmCountdown = () => {
    clearPendingConfirmTimer();
    if (pendingConfirmCountRef.current <= 0) {
      pendingConfirmCountRef.current = 0;
      setPendingConfirmCount(0);
      setConfirmSecondsLeft(0);
      return;
    }

    let secondsRemaining = 5;
    setConfirmSecondsLeft(secondsRemaining);
    pendingConfirmTimerRef.current = setInterval(() => {
      secondsRemaining -= 1;
      if (secondsRemaining <= 0) {
        clearPendingConfirmTimer();
        const confirmed = pendingConfirmCountRef.current;
        pendingConfirmCountRef.current = 0;
        setPendingConfirmCount(0);
        setConfirmSecondsLeft(0);
        if (confirmed > 0 && sessionRef.current?.ticketing_mode === 'Automatic') {
          syncPendingPreDeparture(pendingPreDepartureRef.current + confirmed);
        }
      } else {
        setConfirmSecondsLeft(secondsRemaining);
      }
    }, 1000);
  };

  useEffect(() => {
    return () => {
      clearPendingConfirmTimer();
    };
  }, []);

  const incrementPassengers = (count = 1, isManualUi = false, skipPending = false) => {
    if (!sessionRef.current) return;

    const newBoarded = boardedCountRef.current + count;
    boardedCountRef.current = newBoarded;
    const seatsTotal = sessionRef.current.seats_total || 0;
    const newSeats = Math.max(0, seatsTotal - newBoarded);

    setBoardedCount(prevBoarded => prevBoarded + count);
    setSeats(newSeats);

    if (isManualUi && Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        seats_available: newSeats,
        force_seats: true
      });
    }
    setTotalServed(prev => prev + count);

    if (!skipPending && sessionRef.current.ticketing_mode === 'Automatic') {
      pendingConfirmCountRef.current += count;
      setPendingConfirmCount(pendingConfirmCountRef.current);
      startPendingConfirmCountdown();
    }

    pendingBoards.current += count;
    scheduleSync();
  };

  const decrementPassengers = (isManualUi = false) => {
    if (!sessionRef.current || boardedCountRef.current <= 0) return;

    const newBoarded = Math.max(0, boardedCountRef.current - 1);
    boardedCountRef.current = newBoarded;
    const seatsTotal = sessionRef.current.seats_total || 0;
    const newSeats = Math.max(0, seatsTotal - newBoarded);

    setBoardedCount(prevBoarded => Math.max(0, prevBoarded - 1));
    setSeats(newSeats);

    if (sessionRef.current?.ticketing_mode === 'Automatic') {
      if (pendingConfirmCountRef.current > 0) {
        pendingConfirmCountRef.current -= 1;
        if (pendingConfirmCountRef.current <= 0) {
          pendingConfirmCountRef.current = 0;
          clearPendingConfirmTimer();
          setPendingConfirmCount(0);
          setConfirmSecondsLeft(0);
        } else {
          setPendingConfirmCount(pendingConfirmCountRef.current);
          startPendingConfirmCountdown();
        }
      } else {
        syncPendingPreDeparture(Math.min(pendingPreDepartureRef.current, newBoarded));
      }
    }

    if (isManualUi && Platform.OS === 'android' && LocationServiceModule) {
      LocationServiceModule.updateSessionData({
        seats_available: newSeats,
        force_seats: true
      });
    }

    pendingDeparts.current++;
    scheduleSync();
  };

  const performStopTracking = async () => {
    setIsLoading(true);
    cleanup();
    await flushPendingEvents();

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
        LocationServiceModule.clearPersistedSeats?.();
        LocationServiceModule.updateSessionData({
          seats_available: -1,
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
        LocationServiceModule.clearPersistedSeats?.();
        LocationServiceModule.updateSessionData({
          seats_available: -1,
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

  const getRemainingPendingTickets = () => {
    const activeSession = sessionRef.current || session;
    if (activeSession?.ticketing_mode !== 'Automatic') return 0;
    return pendingPreDepartureRef.current + pendingConfirmCountRef.current;
  };

  const ensureNoPendingTickets = () => {
    const remainingPending = getRemainingPendingTickets();
    if (remainingPending > 0) {
      showAlert(
        'Pending Tickets Remaining',
        `You still have ${remainingPending} pending passenger(s) to ticket. Please issue their tickets or adjust the passenger count before ending the session.`,
        'warning'
      );
      return false;
    }
    return true;
  };

  const handleStopTracking = async () => {
    if (!ensureNoPendingTickets()) return;

    setIsStopTrackingModalVisible(true);
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
      syncTimer.current = null;
    }
    await flushPendingEvents();

    const activeSession = sessionRef.current || session;
    const isAuto = activeSession?.ticketing_mode === 'Automatic';

    if (!isAuto) {
      const opId = activeSession?.operation_id || activeSession?.id;
      if (opId && !String(opId).startsWith('offline_op_')) {
        try {
          const res = await getTripSummary(opId);
          if (res && res.success && res.summary) {
            setTripSummary(res.summary);
            if (typeof res.summary.total_boarded === 'number') {
              setTotalServed(prev => Math.max(prev, res.summary.total_boarded));
            }
          }
        } catch (e) {
          console.warn('Failed to load manual trip summary', e);
        }
      }
      return;
    }

    setIsSummaryLoading(true);
    try {
      const opId = activeSession?.operation_id || activeSession?.id;
      if (opId) {
        const res = await getTripSummary(opId);
        if (res && res.success) {
          setTripSummary(res.summary);
        }
      }
    } catch(e) {
      console.warn('Failed to load trip summary', e);
    } finally {
      setIsSummaryLoading(false);
    }
  };

  const openPrinterSettingsModal = () => {
    if (isSessionDrawerVisible) {
      setIsSessionDrawerVisible(false);
      setTimeout(() => setIsPrinterModalVisible(true), 250);
    } else {
      setIsPrinterModalVisible(true);
    }
  };

  const presentPrintFailureRecovery = (
    err: any,
    options: {
      itemLabel: string;
      setBusy: (busy: boolean) => void;
      retryPrint: (wasReconnect?: boolean) => Promise<void>;
      extraOutOfPaperNote?: string;
    }
  ) => {
    const code = err?.code;
    const { itemLabel, setBusy, retryPrint, extraOutOfPaperNote = '' } = options;

    if (code === 'OUT_OF_PAPER' || code === 'OUT_OF_PAPER_MID_PRINT') {
      const msg =
        code === 'OUT_OF_PAPER_MID_PRINT'
          ? `The printer ran out of paper while printing ${itemLabel}. Load a new 58mm roll, then tap "Retry Print"${extraOutOfPaperNote}.`
          : `The printer is out of paper. Load a new 58mm thermal roll, then tap "Retry Print" to print ${itemLabel}${extraOutOfPaperNote}.`;
      Alert.alert('Printer Out of Paper', msg, [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Retry Print',
          onPress: async () => {
            setBusy(true);
            try {
              printer.clearPaperWarning();
              await retryPrint(false);
            } catch (retryErr: any) {
              if (retryErr?.code === 'OUT_OF_PAPER' || retryErr?.code === 'OUT_OF_PAPER_MID_PRINT') {
                showAlert('Still Out of Paper', 'No paper detected yet. Make sure the thermal roll is loaded properly and cover is closed.', 'error');
              } else {
                showAlert('Print Error', retryErr?.message || 'Failed to print. Check paper and power.', 'error');
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ]);
      return;
    }

    if (code === 'COVER_OPEN') {
      Alert.alert(
        'Printer Cover Open',
        'Please close the thermal printer paper cover firmly, then tap "Retry Print".',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Retry Print',
            onPress: async () => {
              setBusy(true);
              try {
                await retryPrint(false);
              } catch (retryErr: any) {
                showAlert('Print Error', retryErr?.message || 'Failed to print. Check printer cover and paper.', 'error');
              } finally {
                setBusy(false);
              }
            },
          },
        ]
      );
      return;
    }

    Alert.alert(
      'Printer Not Responding',
      'The printer did not respond. Check the paper roll and power, then tap "Reconnect & Retry" to refresh the Bluetooth link.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reconnect & Retry',
          onPress: async () => {
            setBusy(true);
            try {
              const ok = await printer.reconnectPrinter();
              if (ok) {
                await retryPrint(true);
              }
            } catch (retryErr: any) {
              showAlert('Print Error', retryErr?.message || 'Failed to print. Check paper and power.', 'error');
            } finally {
              setBusy(false);
            }
          },
        },
        { text: 'Printer Settings', onPress: openPrinterSettingsModal },
      ]
    );
  };

  const handlePrintSummary = async (isInterim = false) => {
    if (!tripSummary) return;

    if (!printer.connectedPrinter) {
      Alert.alert(
        'Printer Required',
        'No Bluetooth printer is connected. Please connect your printer first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect Printer', onPress: () => setIsPrinterModalVisible(true) }
        ]
      );
      return;
    }

    const doPrint = async (wasReconnect = false) => {
      await printer.printSummary(tripSummary, summaryConfig, receiptConfig, false, isInterim);
      showAlert('Print Successful', wasReconnect ? 'Summary printed after reconnecting.' : 'Summary has been printed.', 'success');
    };

    setIsPrinting(true);
    try {
      await doPrint(false);
    } catch (e: any) {
      console.error(e);
      presentPrintFailureRecovery(e, {
        itemLabel: 'Trip Summary',
        setBusy: setIsPrinting,
        retryPrint: doPrint,
      });
    } finally {
      setIsPrinting(false);
    }
  };

  const handlePrintInterimSummary = async () => {
    if (!printer.connectedPrinter) {
      Alert.alert(
        'Printer Required',
        'No Bluetooth printer is connected. Please connect your printer first.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Connect Printer', onPress: () => setIsPrinterModalVisible(true) }
        ]
      );
      return;
    }

    const doPrintInterim = async (wasReconnect = false) => {
      const opId = session?.operation_id || session?.id;
      if (!opId) {
        showAlert('Error', 'Missing active operation ID.', 'error');
        return;
      }
      const res = await getTripSummary(opId);
      if (res && res.success) {
        await printer.printSummary(res.summary, summaryConfig, receiptConfig, false, true);
        showAlert('Print Successful', wasReconnect ? 'Interim Summary printed after reconnecting.' : 'Interim Summary has been printed.', 'success');
      } else {
        showAlert('Error', 'Failed to load summary data.', 'error');
      }
    };

    setIsPrinting(true);
    try {
      await doPrintInterim(false);
    } catch (e: any) {
      console.error(e);
      presentPrintFailureRecovery(e, {
        itemLabel: 'Interim Summary',
        setBusy: setIsPrinting,
        retryPrint: doPrintInterim,
      });
    } finally {
      setIsPrinting(false);
    }
  };


  const confirmStopTracking = () => {
    if (!ensureNoPendingTickets()) {
      setIsStopTrackingModalVisible(false);
      return;
    }
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

  const handleIssueTicket = async () => {
    if (!boardingStop || !alightingStop) {
      showAlert('Incomplete', 'Please select boarding and alighting locations.', 'warning');
      return;
    }
    if (ticketFare <= 0) {
      showAlert('Invalid Fare', 'No fare matrix available for these locations.', 'warning');
      return;
    }
    
    setIsLoading(true);

    try {
      const payload = {
        operation_id: session?.operation_id,
        fare: ticketFare,
        discount_type: ticketQuantity > 1 ? 'Mixed' : discountType,
        quantity: ticketQuantity,
        boarding_location: boardingStop.location_name,
        alighting_location: alightingStop.location_name
      };
      
      const res = await printTicket(payload);
      let realTicketNumber = String(ticketCounter).padStart(5, '0');
      
      if (res && res.success && res.ticket_number) {
        realTicketNumber = res.ticket_number;
        setTicketCounter(parseInt(realTicketNumber, 10) + 1);
      } else {
        console.warn('Network unavailable for live ticket sync, using offline ticket:', res?.error);
        realTicketNumber = String(ticketCounter).padStart(5, '0');
        setTicketCounter(prev => prev + 1);
        try {
          const offlineTickets = JSON.parse(await AsyncStorage.getItem('byahero_offline_pending_tickets') || '[]');
          offlineTickets.push({
            ...payload,
            offline_ticket_number: realTicketNumber,
            created_at: new Date().toISOString()
          });
          await AsyncStorage.setItem('byahero_offline_pending_tickets', JSON.stringify(offlineTickets));
        } catch (_) {}
      }

      // Consume confirmed and staged manual pending tickets before boarding new passengers
      clearPendingConfirmTimer();
      const stagedPending = pendingConfirmCountRef.current;
      pendingConfirmCountRef.current = 0;
      setPendingConfirmCount(0);
      setConfirmSecondsLeft(0);

      const availablePending = pendingPreDepartureRef.current + stagedPending;
      let remainingToDeduct = ticketQuantity;
      if (availablePending > 0) {
        const deducted = Math.min(remainingToDeduct, availablePending);
        syncPendingPreDeparture(availablePending - deducted);
        remainingToDeduct -= deducted;
      }
      if (remainingToDeduct > 0) {
        incrementPassengers(remainingToDeduct, true, true);
      }

      const ticketData: ISessionReceipt = {
        id: `${realTicketNumber}_${Date.now()}`,
        busNumber: session ? session.code : '-',
        date: new Date().toLocaleDateString() + ' ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        boarding: boardingStop.location_name,
        alighting: alightingStop.location_name,
        fare: ticketFare,
        discount: ticketQuantity > 1 ? 'Mixed' : discountType,
        quantity: ticketQuantity,
        ticketNumber: realTicketNumber,
        breakdown: discountCounts,
        baseRegularFare: baseRegularFare,
        baseDiscountedFare: baseDiscountedFare,
        printStatus: 'pending',
        reprintCount: 0,
      };
      setSessionReceipts(prev => [ticketData, ...prev]);
      setIssuedTicket(ticketData);
      
      // Track active passengers for auto-departure if in Automatic mode
    if (session?.ticketing_mode === 'Automatic') {
      setActivePassengers(prev => {
        const alighting = ticketData.alighting;
        const existing = prev.find(p => p.alightingStop === alighting);
        if (existing) {
          return prev.map(p => p.alightingStop === alighting ? { ...p, count: p.count + ticketData.quantity } : p);
        }
        return [...prev, { alightingStop: alighting, count: ticketData.quantity }];
      });
    }

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
    } catch (e: any) {
      console.error('Failed to issue ticket', e);
      showAlert('Error', e.message || 'Failed to issue ticket.', 'error');
    } finally {
      setIsLoading(false);
    }
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

  const updateReceiptStatus = (
    receiptId: string | undefined,
    ticketNumber: string | undefined,
    printStatus: 'printed' | 'failed',
    incrementReprint = false
  ) => {
    setSessionReceipts(prev =>
      prev.map(r => {
        const matches = receiptId ? r.id === receiptId : r.ticketNumber === ticketNumber;
        if (!matches) return r;
        return {
          ...r,
          printStatus,
          reprintCount: incrementReprint ? (r.reprintCount || 0) + 1 : (r.reprintCount || 0),
        };
      })
    );
  };

  /**
   * Prints (or locally reprints) a stored receipt via Bluetooth with reconnect recovery,
   * without calling the server print-ticket endpoint again.
   */
  const printReceiptWithRecovery = async (
    ticket: ISessionReceipt,
    { isReprint, onComplete }: { isReprint: boolean; onComplete?: () => void }
  ) => {
    if (!printer.connectedPrinter) {
      Alert.alert(
        'Printer Required',
        'No Bluetooth printer is currently connected.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Connect Printer',
            onPress: () => {
              if (isSessionDrawerVisible) {
                setIsSessionDrawerVisible(false);
                setTimeout(() => setIsPrinterModalVisible(true), 250);
              } else {
                setIsPrinterModalVisible(true);
              }
            },
          },
        ]
      );
      return;
    }

    const setPrintBusy = (busy: boolean) => {
      if (isReprint) setReprintingReceiptId(busy ? ticket.id : null);
      else setIsPrinting(busy);
    };
    setPrintBusy(true);

    const markSuccess = (wasRetry: boolean) => {
      updateReceiptStatus(ticket.id, ticket.ticketNumber, 'printed', isReprint && ticket.printStatus === 'printed');
      showAlert(
        isReprint ? 'Reprint Successful' : 'Print Successful',
        wasRetry
          ? `Ticket TKT-${ticket.ticketNumber} printed successfully after reconnecting.`
          : `Ticket TKT-${ticket.ticketNumber} has been printed.`,
        'success'
      );
      onComplete?.();
    };

    try {
      await printer.printReceipt(ticket, receiptConfig);
      markSuccess(false);
    } catch (e: any) {
      console.error('printReceiptWithRecovery error:', e);
      updateReceiptStatus(ticket.id, ticket.ticketNumber, 'failed');
      presentPrintFailureRecovery(e, {
        itemLabel: `Ticket TKT-${ticket.ticketNumber}`,
        setBusy: setPrintBusy,
        extraOutOfPaperNote: ' (or reprint later from Receipts in the menu)',
        retryPrint: async (wasReconnect = false) => {
          await printer.printReceipt(ticket, receiptConfig);
          markSuccess(wasReconnect);
        },
      });
    } finally {
      setPrintBusy(false);
    }
  };

  const executePrint = async () => {
    if (!issuedTicket) return;
    await printReceiptWithRecovery(issuedTicket, { isReprint: false, onComplete: closeReceipt });
  };

  const handleReprintReceipt = async (receipt: ISessionReceipt) => {
    await printReceiptWithRecovery(receipt, { isReprint: true });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ConductorNavbar 
        title="Bus Live" 
        rightIcon={isAutoTicketing ? require('../../assets/images/HAMBURGER.svg') : undefined} 
        onRightIconPress={
          isAutoTicketing
            ? () => {
                printer.checkPaperStatus(true).catch(() => {});
                setIsSessionDrawerVisible(true);
              }
            : undefined
        } 
      />

      {/* Printer Offline Sudden Drop Warning Banner */}
      {isAutoTicketing && printer.connectedPrinter && printer.isPrinterOffline && !printer.offlineDismissed && (
        <View style={tw`mx-4 mt-2 mb-1 p-3 bg-rose-50 border border-rose-300 rounded-2xl flex-row items-center justify-between shadow-xs z-40`}>
          <View style={tw`flex-row items-center flex-1 mr-2`}>
            <View style={tw`w-8 h-8 rounded-xl bg-rose-500/10 items-center justify-center mr-2.5`}>
              <Ionicons name="alert-circle" size={20} color="#e11d48" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-black text-rose-900`}>Printer Went Offline</Text>
              <Text style={tw`text-[11px] text-rose-700`}>Bluetooth link lost or printer turned off.</Text>
            </View>
          </View>
          <View style={tw`flex-row items-center gap-1.5`}>
            <TouchableOpacity
              onPress={() => printer.reconnectPrinter()}
              style={tw`px-3 py-1.5 bg-rose-600 rounded-xl`}
            >
              <Text style={tw`text-xs font-bold text-white`}>Reconnect</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => printer.dismissOfflineWarning()}
              style={tw`p-1.5`}
            >
              <Ionicons name="close" size={16} color="#9f1239" />
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Hardware Paper Out / Cover Warning Banner */}
      {isAutoTicketing && printer.connectedPrinter && (printer.paperWarning === 'out_of_paper' || printer.paperWarning === 'out_or_jammed') && (
        <View style={tw`mx-4 mt-2 mb-1 p-3 bg-rose-50 border-rose-300 border rounded-2xl flex-row items-center justify-between shadow-xs z-40`}>
          <View style={tw`flex-row items-center flex-1 mr-2`}>
            <View style={tw`w-8 h-8 rounded-xl bg-rose-500/10 items-center justify-center mr-2.5`}>
              <Ionicons name="newspaper-outline" size={18} color="#e11d48" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-xs font-black text-rose-900`}>
                {printer.paperWarning === 'out_of_paper'
                  ? 'Printer Out of Paper'
                  : 'Check Paper / Cover Open'}
              </Text>
              <Text style={tw`text-[11px] text-rose-700`}>
                {printer.paperWarning === 'out_of_paper'
                  ? 'No paper detected. Load a new 58mm roll, then reprint any failed receipt from Receipts.'
                  : 'Printer cover may be open or paper stopped feeding.'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            onPress={() => printer.checkPaperStatus(false, true)}
            style={tw`px-2.5 py-1.5 bg-rose-600 rounded-xl`}
          >
            <Text style={tw`text-[11px] font-bold text-white`}>Check Paper</Text>
          </TouchableOpacity>
        </View>
      )}

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
          <View style={tw`flex-row justify-between border-b border-slate-200 pb-2 items-center`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Current Location</Text>
            <View style={tw`flex-row items-center gap-2 max-w-[60%] justify-end flex-wrap`}>
              {isInTraffic && trafficDelayMins > 0 && (
                <View style={[tw`px-2 py-1 rounded-full`, { backgroundColor: '#F97316' }]}>
                  <Text style={tw`text-white font-bold text-[9px] tracking-wider`}>TRAFFIC +{trafficDelayMins}MINS</Text>
                </View>
              )}
              <Text style={tw`text-xs font-bold text-slate-800 text-right`}>{locationName}</Text>
            </View>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Last Update</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{lastUpdate}</Text>
          </View>
        </View>

        {/* PENDING CONFIRMATION COUNTDOWN BANNER (5s double-click guard) */}
        {session?.ticketing_mode === 'Automatic' && pendingConfirmCount > 0 && (
          <View style={tw`bg-blue-50 border border-blue-200 rounded-xl p-3.5 mb-3 flex-row items-center`}>
            <Ionicons name="time-outline" size={22} color="#2563eb" />
            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-blue-800 font-bold text-xs`}>
                Confirming +{pendingConfirmCount} manual passenger(s)...
              </Text>
              <Text style={tw`text-blue-600 text-[11px] mt-0.5`}>
                Adding to pending tickets in {confirmSecondsLeft}s (tap - to undo if double-clicked).
              </Text>
            </View>
          </View>
        )}

        {/* PENDING PASSENGER TICKETS BANNER */}
        {session?.ticketing_mode === 'Automatic' && pendingPreDeparture > 0 && (
          <View style={tw`bg-amber-100 border border-amber-300 rounded-xl p-4 mb-4 flex-row items-center`}>
            <Ionicons name="warning" size={24} color="#d97706" />
            <View style={tw`ml-3 flex-1`}>
              <Text style={tw`text-amber-800 font-bold`}>Pending Passenger Tickets</Text>
              <Text style={tw`text-amber-700 text-xs mt-0.5`}>You have {pendingPreDeparture} pending passenger(s) to ticket.</Text>
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

        {/* ACTION BUTTONS */}
        <View style={tw`flex-row gap-3`}>
          <TouchableOpacity
            ref={stopTrackingRef}
            onLayout={() => handleTourLayout('stop-tracking', stopTrackingRef)}
            onPress={handleStopTracking}
            disabled={isLoading}
            style={tw`flex-1 bg-red-500 rounded-full py-4 items-center justify-center shadow-md`}
          >
            {isLoading ? (
              <ActivityIndicator color="white" />
            ) : (
              <Text style={tw`text-white font-bold text-[11px] tracking-wider uppercase text-center`}>Stop tracking</Text>
            )}
          </TouchableOpacity>
        </View>
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

      {/* Trip Summary & Stop Tracking Modal */}
      <Modal
        visible={isStopTrackingModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setIsStopTrackingModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[360px] bg-white rounded-3xl p-6 shadow-2xl relative max-h-[85%]`}>
            <TouchableOpacity
              onPress={() => setIsStopTrackingModalVisible(false)}
              style={tw`absolute top-4 right-4 p-1 z-10`}
            >
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-14 h-14 rounded-full ${isAutoTicketing ? 'bg-red-100' : 'bg-blue-100'} items-center justify-center mb-4 self-center`}>
              {isAutoTicketing ? (
                <MaterialIcons name="receipt-long" size={28} color="#ef4444" />
              ) : (
                <Ionicons name="people" size={28} color="#0f3878" />
              )}
            </View>

            <Text style={tw`text-lg font-black text-slate-800 text-center mb-1.5`}>
              Trip Summary
            </Text>
            <Text style={tw`text-xs text-slate-500 text-center leading-relaxed mb-4`}>
              {isAutoTicketing
                ? 'Review your current trip details before ending the session.'
                : 'Review how many passengers were served before ending the session.'}
            </Text>

            {!isAutoTicketing ? (
              <View style={tw`bg-slate-50 rounded-2xl p-5 mb-5 border border-slate-100 items-center`}>
                <Text style={tw`text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-1`}>
                  Passengers Served
                </Text>
                <Text style={tw`text-4xl font-black text-[#0f3878]`}>
                  {Math.max(totalServed, tripSummary?.total_boarded || 0, boardedCount)}
                </Text>
                {session && (
                  <Text style={tw`text-xs font-semibold text-slate-500 mt-2 text-center`}>
                    {[session.code, session.route].filter(Boolean).join(' • ')}
                  </Text>
                )}
              </View>
            ) : isSummaryLoading ? (
              <View style={tw`items-center justify-center py-6`}>
                <ActivityIndicator size="small" color="#0f3878" />
                <Text style={tw`text-xs text-slate-400 mt-2`}>Loading summary data...</Text>
              </View>
            ) : tripSummary ? (
              <ScrollView style={tw`bg-slate-50 rounded-xl p-4 mb-4 border border-slate-100`} nestedScrollEnabled>
                <View style={tw`flex-row justify-between mb-2`}>
                  <Text style={tw`text-xs text-slate-500 font-medium`}>Total Tickets</Text>
                  <Text style={tw`text-xs font-black text-slate-800`}>{tripSummary.total_tickets}</Text>
                </View>
                <View style={tw`flex-row justify-between mb-2`}>
                  <Text style={tw`text-xs text-slate-500 font-medium`}>Total Passengers</Text>
                  <Text style={tw`text-xs font-black text-slate-800`}>{tripSummary.total_passengers}</Text>
                </View>
                <View style={tw`flex-row justify-between mb-3 border-b border-slate-200 pb-3`}>
                  <Text style={tw`text-xs text-slate-500 font-bold`}>TOTAL REVENUE</Text>
                  <Text style={tw`text-sm font-black text-emerald-600`}>PHP {Number(tripSummary.total_revenue).toFixed(2)}</Text>
                </View>
                
                {tripSummary.breakdown && Object.keys(tripSummary.breakdown).length > 0 && (
                  <View>
                    <Text style={tw`text-[10px] font-bold text-slate-400 mb-2 uppercase tracking-wider`}>Breakdown</Text>
                    {Object.keys(tripSummary.breakdown).map(type => (
                      <View key={type} style={tw`flex-row justify-between mb-1.5`}>
                        <Text style={tw`text-[11px] text-slate-600`}>{type}</Text>
                        <View style={tw`flex-row gap-3`}>
                          <Text style={tw`text-[11px] font-bold text-slate-500`}>{tripSummary.breakdown[type].passengers} pax</Text>
                          <Text style={tw`text-[11px] font-bold text-slate-800 w-16 text-right`}>PHP {Number(tripSummary.breakdown[type].revenue).toFixed(2)}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={tw`items-center justify-center py-6 bg-slate-50 rounded-xl mb-4 border border-slate-100`}>
                <Text style={tw`text-xs text-slate-400`}>No summary available.</Text>
              </View>
            )}

            {isAutoTicketing && (
              <TouchableOpacity
                onPress={() => handlePrintSummary(false)}
                disabled={!tripSummary || isPrinting}
                style={tw`w-full bg-slate-800 py-3.5 rounded-2xl items-center justify-center flex-row shadow-sm mb-3 ${(!tripSummary || isPrinting) ? 'opacity-60' : ''}`}
              >
                {isPrinting ? <ActivityIndicator size="small" color="#fff" style={tw`mr-2`} /> : <Ionicons name="print" size={16} color="white" style={tw`mr-2`} />}
                <Text style={tw`text-white font-bold text-sm`}>Print Summary</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              onPress={confirmStopTracking}
              disabled={isAutoTicketing && (pendingPreDeparture + pendingConfirmCount) > 0}
              style={tw`w-full border-2 border-red-500 bg-red-50 py-3.5 rounded-2xl items-center justify-center shadow-sm ${(isAutoTicketing && (pendingPreDeparture + pendingConfirmCount) > 0) ? 'opacity-50' : ''}`}
            >
              <Text style={tw`text-red-600 font-bold text-sm`}>Confirm & End Trip</Text>
            </TouchableOpacity>
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

      {/* Interim Summary Modal */}
      {isAutoTicketing && (
        <Modal
          visible={isInterimModalVisible}
          transparent
          animationType="fade"
          onRequestClose={() => setIsInterimModalVisible(false)}
        >
          <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
            <View style={tw`w-full max-w-[320px] bg-white rounded-3xl p-6 shadow-2xl relative`}>
              <Text style={tw`text-base font-black text-slate-800 text-center uppercase tracking-widest mb-6 mt-2`}>
                Print Interim Summary
              </Text>
              <View style={tw`gap-3`}>
                <TouchableOpacity
                  onPress={() => {
                    setIsInterimModalVisible(false);
                    handlePrintInterimSummary();
                  }}
                  disabled={isPrinting}
                  style={tw`bg-slate-800 py-4 rounded-full items-center shadow-md`}
                >
                  <Text style={tw`text-white font-bold uppercase tracking-wider`}>Print Now</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setIsInterimModalVisible(false)}
                  disabled={isPrinting}
                  style={tw`bg-red-500 py-4 rounded-full items-center shadow-md`}
                >
                  <Text style={tw`text-white font-bold uppercase tracking-wider`}>Cancel</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      )}

      {/* Auto Ticketing Hamburger Session Drawer */}
      {isAutoTicketing && (
        <AutoTicketingDrawer
          visible={isSessionDrawerVisible}
          onClose={() => setIsSessionDrawerVisible(false)}
          busCode={session?.code}
          route={session?.route}
          connectedPrinter={printer.connectedPrinter}
          isPrinterOffline={printer.isPrinterOffline}
          isScanning={printer.isScanning}
          paperWarning={printer.paperWarning}
          onReconnect={() => printer.reconnectPrinter()}
          onOpenPrinterModal={() => setTimeout(() => setIsPrinterModalVisible(true), 250)}
          onPressInterimSummary={() => setTimeout(() => setIsInterimModalVisible(true), 250)}
          receipts={sessionReceipts}
          reprintingReceiptId={reprintingReceiptId}
          onReprintReceipt={handleReprintReceipt}
        />
      )}

      {/* Bluetooth Printer Modal */}
      {isAutoTicketing && (
        <PrinterModal 
          visible={isPrinterModalVisible}
          onClose={() => setIsPrinterModalVisible(false)}
          devices={printer.devices}
          pairedDevices={printer.pairedDevices}
          isScanning={printer.isScanning}
          onScan={printer.scanDevices}
          onConnect={(device) => {
            printer.connectPrinter(device);
            setIsPrinterModalVisible(false);
          }}
          connectedPrinter={printer.connectedPrinter}
          onTestPrint={printer.testPrint}
          onDisconnect={printer.disconnectPrinter}
          onReconnect={() => printer.reconnectPrinter()}
          isPrinterOffline={printer.isPrinterOffline}
          paperWarning={printer.paperWarning}
        />
      )}

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
