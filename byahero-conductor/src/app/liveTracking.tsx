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
  DeviceEventEmitter
} from 'react-native';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Capability, Event } from 'react-native-track-player';
import { getConductorLeafletHTML } from '../components/conductorMapHtml';
import { getServerUrl } from '../services/authService';
import { updateGeoLocation, logPassengerEvent, stopTracking, getMapFeatures } from '../services/conductorService';

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

  // References & Tracking states
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
  const lastCoords = useRef<{ lat: number; lng: number } | null>(null);
  const lastMoveCheck = useRef<{ time: number; lat: number; lng: number } | null>(null);
  const lastResolvedLocation = useRef<{ lat: number; lng: number; name: string } | null>(null);

  // Sync seats count to ref to avoid effect recreation churn and update notification
  const seatsRef = useRef(seats);
  const playerReady = useRef(false);
  useEffect(() => {
    seatsRef.current = seats;
    AsyncStorage.setItem('byahero_seats_available', String(seats));
    if (Platform.OS !== 'web' && sessionRef.current && playerReady.current) {
      const metadata = {
        title: `Bus ${sessionRef.current.code} - ${sessionRef.current.route}`,
        artist: `Available Seats: ${seats} / ${sessionRef.current.seats_total}`,
      };
      Promise.all([
        TrackPlayer.updateMetadataForTrack(0, metadata),
        TrackPlayer.updateMetadataForTrack(1, metadata),
        TrackPlayer.updateMetadataForTrack(2, metadata),
      ]).catch(err => console.warn('Failed to update TrackPlayer metadata:', err));
    }
  }, [seats]);

  useEffect(() => {
    getServerUrl().then(url => setBaseUrl(url));

    const incSub = DeviceEventEmitter.addListener('remoteIncrement', () => {
      console.log('liveTracking.tsx: remoteIncrement event received');
      incrementPassengers();
    });

    const decSub = DeviceEventEmitter.addListener('remoteDecrement', () => {
      console.log('liveTracking.tsx: remoteDecrement event received');
      decrementPassengers();
    });

    const trackChangeSub = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      console.log('liveTracking.tsx: PlaybackActiveTrackChanged', event);
      if (event.index === 2) {
        console.log('Skipped to track 2: Incrementing passengers (reducing seats)');
        incrementPassengers();
        TrackPlayer.skip(1).catch(err => console.warn('Failed to skip back to 1:', err));
      } else if (event.index === 0) {
        console.log('Skipped to track 0: Decrementing passengers (increasing seats)');
        decrementPassengers();
        TrackPlayer.skip(1).catch(err => console.warn('Failed to skip back to 1:', err));
      }
    });

    const stateSub = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      console.log('liveTracking.tsx: PlaybackState changed to', event.state);
    });

    const errorSub = TrackPlayer.addEventListener(Event.PlaybackError, (event) => {
      console.error('liveTracking.tsx: PlaybackError occurred', event.message);
    });

    const sub = DeviceEventEmitter.addListener('seatsUpdated', async (newSeats: number) => {
      setSeats(newSeats);
      try {
        const boardsStr = await AsyncStorage.getItem('byahero_pending_boards') || '0';
        const departsStr = await AsyncStorage.getItem('byahero_pending_departs') || '0';
        if (parseInt(boardsStr, 10) > 0) {
          pendingBoards.current += parseInt(boardsStr, 10);
          await AsyncStorage.setItem('byahero_pending_boards', '0');
        }
        if (parseInt(departsStr, 10) > 0) {
          pendingDeparts.current += parseInt(departsStr, 10);
          await AsyncStorage.setItem('byahero_pending_departs', '0');
        }
        scheduleSync();
      } catch (err) {
        console.warn('Failed to sync pending counts on event:', err);
      }
    });
    
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
                timestamp: position.timestamp,
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
          sub.remove();
          incSub.remove();
          decSub.remove();
          trackChangeSub.remove();
          stateSub.remove();
          errorSub.remove();
          cleanup();
        };
      } else {
        startLocationTracking();
        return () => {
          sub.remove();
          incSub.remove();
          decSub.remove();
          trackChangeSub.remove();
          stateSub.remove();
          errorSub.remove();
          cleanup();
        };
      }
    });
  }, []);

  const cleanup = () => {
    if (locationSubscription.current) {
      try {
        locationSubscription.current.remove();
      } catch (err) {
        console.warn('Failed to remove location subscription:', err);
      }
      locationSubscription.current = null;
    }
    if (syncTimer.current) {
      clearTimeout(syncTimer.current);
    }
    if (Platform.OS !== 'web') {
      TrackPlayer.reset().catch(err => {
        console.warn('Failed to reset TrackPlayer:', err);
      });
      playerReady.current = false;
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
    const initialSeats = payload.seats_total - payload.pre_departure_count;
    setSeats(initialSeats);
    await AsyncStorage.setItem('byahero_seats_available', String(initialSeats));
    await AsyncStorage.setItem('byahero_pending_boards', '0');
    await AsyncStorage.setItem('byahero_pending_departs', '0');

    // Initialize TrackPlayer for lock screen MediaSession controls
    if (Platform.OS !== 'web') {
      try {
        try {
          await TrackPlayer.setupPlayer();
        } catch (e) {
          // Already initialized
        }
        await TrackPlayer.updateOptions({
          capabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
          compactCapabilities: [
            Capability.Play,
            Capability.Pause,
            Capability.SkipToNext,
            Capability.SkipToPrevious,
          ],
        });
        const dummyTrack = {
          url: 'https://github.com/anars/blank-audio/raw/master/10-minutes-of-silence.mp3',
          title: `Bus ${payload.code} - ${payload.route}`,
          artist: `Available Seats: ${initialSeats} / ${payload.seats_total}`,
          artwork: 'https://placehold.co/150x150/007bff/ffffff.png?text=ByaHero',
        };
        await TrackPlayer.add([
          { ...dummyTrack, id: 'conductor-prev' },
          { ...dummyTrack, id: 'conductor-controls' },
          { ...dummyTrack, id: 'conductor-next' },
        ]);
        await TrackPlayer.skip(1);
        await TrackPlayer.play();
        playerReady.current = true;
      } catch (tpErr) {
        console.warn('Failed to setup TrackPlayer:', tpErr);
      }
    }

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

    if (Platform.OS !== 'web') {
      try {
        const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
        if (bgStatus !== 'granted') {
          console.warn('Background location permission was not granted. Location tracking might pause when screen is closed.');
        }
      } catch (err) {
        console.warn('Failed to request background location permission:', err);
      }
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
    lastCoords.current = { lat, lng };

    // Resolve Location Name
    let resolved = resolvedLocationNameCached(lat, lng);
    setLocationName(resolved);

    // Update map marker
    const nowTimeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setLastUpdate(nowTimeStr);

    const computedStatus = autoComputeStatus(lat, lng, seats);
    
    // Save last location to AsyncStorage so background tasks can retrieve it
    AsyncStorage.setItem('byahero_last_location', JSON.stringify({
      lat,
      lng,
      resolvedName: resolved,
      status: computedStatus
    })).catch(err => console.warn('Failed to save last location:', err));

    postToMap({
      type: 'UPDATE_MY_LOCATION',
      lat,
      lng,
      status: computedStatus,
      pan: true
    });

    sendDataToServer(lat, lng, resolved, computedStatus);
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

  const sendDataToServer = async (lat: number, lng: number, locName: string, status: string) => {
    const activeSession = sessionRef.current || session;
    if (!activeSession) return;
    setNetStatus('Saving...');

    const payload = {
      bus_id: parseInt(activeSession.bus_id),
      geojson: {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          bus_id: activeSession.bus_id,
          code: activeSession.code,
          route: activeSession.route,
          seats_available: seats,
          status: status,
          timestamp: new Date().toISOString(),
          current_location_name: locName
        }
      },
      route: activeSession.route,
      seats_available: seats,
      status: status,
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
      const resolved = lastResolvedLocation.current?.name || `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
      const computedStatus = autoComputeStatus(lat, lng, seats);
      sendDataToServer(lat, lng, resolved, computedStatus);
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

  const incrementPassengers = () => {
    const activeSession = sessionRef.current || session;
    if (activeSession) {
      setSeats((prevSeats) => {
        if (prevSeats > 0) {
          pendingBoards.current++;
          scheduleSync();
          return prevSeats - 1;
        }
        return prevSeats;
      });
    }
  };

  const decrementPassengers = () => {
    const activeSession = sessionRef.current || session;
    if (activeSession) {
      setSeats((prevSeats) => {
        if (prevSeats < activeSession.seats_total) {
          pendingDeparts.current++;
          scheduleSync();
          return prevSeats + 1;
        }
        return prevSeats;
      });
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

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      {/* Header */}
      <View style={tw`bg-[#0f3878] px-5 py-3.5 flex-row justify-between items-center shadow-md`}>
        <Text style={tw`text-white text-base font-extrabold tracking-widest uppercase`}>Bus Live</Text>
        <View style={tw`bg-emerald-500 rounded-full px-3 py-1`}>
          <Text style={tw`text-white text-xs font-bold`}>{netStatus}</Text>
        </View>
      </View>

      {/* Map Segment */}
      <View style={tw`flex-1 relative`}>
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

      {/* Control Details Panel */}
      <View style={tw`bg-white rounded-t-[28px] border-t border-slate-200 p-5 shadow-2xl`}>
        {/* Passenger Seats Increment Counter */}
        <View style={tw`items-center mb-5`}>
          <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3`}>Passenger Count</Text>
          <View style={tw`flex-row items-center gap-6`}>
            {/* Minus */}
            <TouchableOpacity
              onPress={decrementPassengers}
              style={tw`w-14 h-14 bg-slate-100 rounded-full items-center justify-center border border-slate-200`}
            >
              <Ionicons name="remove" size={28} color="#64748b" />
            </TouchableOpacity>

            <Text style={tw`text-5xl font-black text-slate-800 w-16 text-center`}>
              {session ? session.seats_total - seats : 0}
            </Text>

            {/* Plus */}
            <TouchableOpacity
              onPress={incrementPassengers}
              style={tw`w-14 h-14 bg-[#0f3878] rounded-full items-center justify-center shadow-md`}
            >
              <Ionicons name="add" size={28} color="white" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Informative Stats */}
        <View style={tw`bg-slate-50 rounded-2xl p-4 border border-slate-200 gap-3 mb-5`}>
          <View style={tw`flex-row justify-between border-b border-slate-150 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Bus Number</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{session ? session.code : '-'}</Text>
          </View>
          <View style={tw`flex-row justify-between border-b border-slate-150 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Route</Text>
            <Text style={tw`text-xs font-bold text-slate-800`}>{session ? session.route : '-'}</Text>
          </View>
          <View style={tw`flex-row justify-between border-b border-slate-150 pb-2`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Current Location</Text>
            <Text style={tw`text-xs font-bold text-slate-800 max-w-[60%] text-right`}>{locationName}</Text>
          </View>
          <View style={tw`flex-row justify-between`}>
            <Text style={tw`text-xs font-bold text-slate-500`}>Last Update</Text>
            <Text style={tw`text-xs font-bold text-slate-850`}>{lastUpdate}</Text>
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
    </SafeAreaView>
  );
}
