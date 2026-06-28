import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../../services/authService';
import { sendFcmPushes } from '../../services/notificationService';
import * as Location from 'expo-location';
import { PassengerHeader, PassengerFooter } from '../../components/passenger-navbar';
import PassengerBottomSheet from '../../components/passenger-bottomsheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TourOverlay, { tourSteps } from '../../components/TourOverlay';
import { handleTourLayout } from '../../components/TourRegistry';
import { getLeafletHTML } from '../../components/passengerMapHtml';

export default function PassengerDashboard() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const [menuVisible, setMenuVisible] = useState(false);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);

          // Verify that this step actually belongs to the dashboard screen
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === '/passenger') {
            setActiveStep(stepIdx);

            // Adjust sheetTab dynamically based on target step highlight
            if (stepInfo.highlight === 'tab-location') setSheetTab('location');
            else if (stepInfo.highlight === 'tab-routes') setSheetTab('routes');
            else if (stepInfo.highlight === 'tab-groups') setSheetTab('groups');
            else if (stepInfo.highlight === 'tab-busstops') setSheetTab('busstops');
          } else {
            setActiveStep(null);
          }
        } else {
          setActiveStep(null);
        }
      }
      checkTour();
      return () => {
        setActiveStep(null);
      };
    }, [])
  );

  const [activeTab, setActiveTab] = useState<'location' | 'sos' | 'info'>('location');
  const [sheetTab, setSheetTab] = useState<'location' | 'routes' | 'groups' | 'busstops'>('location');

  // Sync the bottom sheet tab whenever the active tour step changes
  useEffect(() => {
    if (activeStep === null) return;
    const stepInfo = tourSteps[activeStep];
    if (!stepInfo) return;
    if (stepInfo.highlight === 'tab-location') setSheetTab('location');
    else if (stepInfo.highlight === 'tab-routes') setSheetTab('routes');
    else if (stepInfo.highlight === 'tab-groups') setSheetTab('groups');
    else if (stepInfo.highlight === 'tab-busstops') setSheetTab('busstops');
  }, [activeStep]);
  const [isLoading, setIsLoading] = useState(true);
  const [buses, setBuses] = useState<any[]>([]);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>(''); // empty means All
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  const [inviteCode, setInviteCode] = useState('------');
  const [joinCode, setJoinCode] = useState('');
  const [circles, setCircles] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [baseUrl, setBaseUrl] = useState('');

  // Waiting Status States
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingModalVisible, setWaitingModalVisible] = useState(false);
  const [isUpdatingWaiting, setIsUpdatingWaiting] = useState(false);

  const webViewRef = useRef<any>(null);
  const recenterRef = useRef<any>(null);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.3)).current;

  const [userProfilePic, setUserProfilePic] = useState<string>('');
  const [userInitial, setUserInitial] = useState<string>('P');

  // Load user profile picture and name initial
  useEffect(() => {
    async function loadUserProfile() {
      try {
        const cachedPic = await AsyncStorage.getItem('byahero_cached_profile_picture') || '';
        setUserProfilePic(cachedPic);

        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || 'Guest';
        let name = cachedName;
        if (name.includes('@')) {
          name = name.split('@')[0];
        }
        const initial = name.charAt(0).toUpperCase() || 'P';
        setUserInitial(initial);
      } catch (e) {
        console.error('Error loading user profile details for map:', e);
      }
    }
    loadUserProfile();
  }, []);

  const getFullProfilePicUrl = () => {
    if (!userProfilePic || userProfilePic === 'null' || userProfilePic === 'undefined') {
      return '';
    }
    if (userProfilePic.startsWith('data:') || userProfilePic.startsWith('http')) {
      return userProfilePic;
    }
    return baseUrl.replace(/\/$/, '') + '/' + userProfilePic.replace(/^\//, '');
  };

  // Use refs to prevent stale closures in location tracking callbacks
  const userInitialRef = useRef(userInitial);
  const userProfilePicRef = useRef(userProfilePic);
  const baseUrlRef = useRef(baseUrl);

  useEffect(() => {
    userInitialRef.current = userInitial;
  }, [userInitial]);

  useEffect(() => {
    userProfilePicRef.current = userProfilePic;
  }, [userProfilePic]);

  useEffect(() => {
    baseUrlRef.current = baseUrl;
  }, [baseUrl]);

  // Watch device location and update state + backend
  useFocusEffect(
    React.useCallback(() => {
      let subscription: Location.LocationSubscription | null = null;
      let isMounted = true;

      async function startTracking() {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Foreground location permission denied.');
            return;
          }

          // 1. Get quick last known location instantly
          const lastKnownLoc = await Location.getLastKnownPositionAsync();
          if (lastKnownLoc && isMounted) {
            const lat = lastKnownLoc.coords.latitude;
            const lng = lastKnownLoc.coords.longitude;
            console.log(`[Location GPS] Quick last-known coordinates acquired: Lat ${lat}, Lng ${lng}`);
            setUserLocation({ lat, lng });

            postToMap({
              type: 'UPDATE_USER_LOCATION',
              lat,
              lng,
              initial: userInitialRef.current,
              profilePic: getFullProfilePicUrl(),
              center: true
            });
          }

          // 2. Fetch precise initial location in the background
          const initialLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);

          if (initialLoc && isMounted) {
            const lat = initialLoc.coords.latitude;
            const lng = initialLoc.coords.longitude;
            console.log(`[Location GPS] Initial coordinates acquired: Lat ${lat}, Lng ${lng} (Accuracy: ${initialLoc.coords.accuracy}m)`);
            setUserLocation({ lat, lng });

            postToMap({
              type: 'UPDATE_USER_LOCATION',
              lat,
              lng,
              initial: userInitialRef.current,
              profilePic: getFullProfilePicUrl(),
              center: true
            });

            sendLocationToBackend(lat, lng, initialLoc.coords.accuracy || 0);
          }

          // Start watching position
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 10000, // every 10s
              distanceInterval: 5, // or 5 meters
            },
            (location) => {
              if (!isMounted) return;
              const lat = location.coords.latitude;
              const lng = location.coords.longitude;
              console.log(`[Location GPS] Watched coordinates updated: Lat ${lat}, Lng ${lng}`);
              setUserLocation({ lat, lng });

              postToMap({
                type: 'UPDATE_USER_LOCATION',
                lat,
                lng,
                initial: userInitialRef.current,
                profilePic: getFullProfilePicUrl(),
                center: false
              });

              sendLocationToBackend(lat, lng, location.coords.accuracy || 0);
            }
          );
        } catch (err) {
          console.error('Error starting location tracking:', err);
        }
      }

      async function sendLocationToBackend(lat: number, lng: number, accuracy: number) {
        try {
          const email = await AsyncStorage.getItem('byahero_cached_email') || '';
          const currentBaseUrl = await getServerUrl();
          await fetch(`${currentBaseUrl}/api/location/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              accuracy,
              email
            }),
            credentials: 'include'
          });
        } catch (err) {
          console.warn('Failed to send user location to backend:', err);
        }
      }

      startTracking();

      return () => {
        isMounted = false;
        if (subscription) {
          try {
            subscription.remove();
          } catch (err) {
            console.warn('Failed to remove location subscription:', err);
          }
        }
      };
    }, [])
  );

  const filteredBuses = buses.filter(bus => !selectedRoute || bus.route === selectedRoute);
  const filteredStops = busStops.filter(stop => stop.route === stopsRoute);

  // Cross-platform helper to send messages to the Leaflet map (WebView or iframe)
  const postToMap = (message: any) => {
    let finalMessage = message;
    if (message && message.type === 'UPDATE_USER_LOCATION') {
      finalMessage = { ...message, isWaiting: isWaiting };
    }
    const payload = JSON.stringify(finalMessage);
    if (Platform.OS === 'web') {
      webViewRef.current?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  };

  // Sync stops to map whenever busStops, filteredStops or sheetTab changes
  useEffect(() => {
    postToMap({
      type: 'UPDATE_STOPS',
      stops: sheetTab === 'busstops' ? filteredStops : busStops
    });
  }, [busStops, filteredStops, sheetTab]);

  // Sync filtered buses to map whenever buses or selectedRoute changes
  useEffect(() => {
    postToMap({
      type: 'UPDATE_BUSES',
      buses: filteredBuses
    });
  }, [buses, selectedRoute]);

  // Sync user location marker to map whenever location, profile details or waiting status update
  useEffect(() => {
    if (userLocation) {
      postToMap({
        type: 'UPDATE_USER_LOCATION',
        lat: userLocation.lat,
        lng: userLocation.lng,
        initial: userInitial,
        profilePic: getFullProfilePicUrl(),
        center: false
      });
    }
  }, [userLocation, userInitial, userProfilePic, isWaiting]);

  const fetchInviteCode = async (reset = false) => {
    try {
      const url = reset
        ? `${baseUrl}/api/group/invite-code?reset=1`
        : `${baseUrl}/api/group/invite-code`;
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invite_code) {
          setInviteCode(data.invite_code);
          if (reset) {
            Alert.alert('New Code Generated', `Your new circle invite code is: ${data.invite_code}`);
          }
        }
      }
    } catch (err) {
      console.error('Error fetching invite code:', err);
    }
  };

  const fetchGroupMembers = async () => {
    try {
      const res = await fetch(`${baseUrl}/api/group/view`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.friends)) {
          const loggedInEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
          const friendsOnly = data.friends.filter((friend: any) => friend.email?.toLowerCase() !== loggedInEmail.toLowerCase());

          setCircles(friendsOnly);
          postToMap({
            type: 'UPDATE_FRIENDS',
            friends: friendsOnly,
            user: userLocation ? {
              lat: userLocation.lat,
              lng: userLocation.lng,
              initial: userInitial,
              profilePic: getFullProfilePicUrl()
            } : null
          });
        }
      }
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  // Poll live buses, bus stops, and group members from backend API
  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);

        // Fetch live buses
        const busesRes = await fetch(`${currentBaseUrl}/api/buses`);
        if (busesRes.ok && active) {
          const busesData = await busesRes.json();
          if (busesData && busesData.success && Array.isArray(busesData.buses)) {
            // Filter only available/active buses with valid coordinates
            const activeBuses = busesData.buses.filter((bus: any) =>
              bus.status !== 'unavailable' &&
              bus.lat !== null && bus.lat !== undefined && bus.lat !== '' &&
              bus.lng !== null && bus.lng !== undefined && bus.lng !== ''
            );
            setBuses(activeBuses);
          }
        }

        // Fetch bus stops
        const stopsRes = await fetch(`${currentBaseUrl}/api/buses/stops-terminal`);
        if (stopsRes.ok && active) {
          const stopsData = await stopsRes.json();
          if (stopsData && stopsData.success && Array.isArray(stopsData.data)) {
            setBusStops(stopsData.data);
            postToMap({
              type: 'UPDATE_STOPS',
              stops: stopsData.data
            });
          }
        }

        // Fetch group members
        const groupRes = await fetch(`${currentBaseUrl}/api/group/view`, { credentials: 'include', cache: 'no-store' });
        if (groupRes.ok && active) {
          const groupData = await groupRes.json();
          if (groupData.success && Array.isArray(groupData.friends)) {
            const loggedInEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
            const friendsOnly = groupData.friends.filter((friend: any) => friend.email?.toLowerCase() !== loggedInEmail.toLowerCase());

            setCircles(friendsOnly);
            postToMap({
              type: 'UPDATE_FRIENDS',
              friends: friendsOnly,
              user: userLocation ? {
                lat: userLocation.lat,
                lng: userLocation.lng,
                initial: userInitial,
                profilePic: getFullProfilePicUrl()
              } : null
            });
          }
        }

        // Fetch my waiting status
        const loggedInEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
        if (loggedInEmail && active) {
          const waitStatusRes = await fetch(`${currentBaseUrl}/api/waiting/status?email=${encodeURIComponent(loggedInEmail)}`);
          if (waitStatusRes.ok) {
            const waitData = await waitStatusRes.json();
            if (waitData.success) {
              setIsWaiting(!!waitData.is_waiting);
              setWaitingLocation(waitData.location_name || '');
            }
          }
        }
      } catch (err) {
        console.error('Error fetching tracking data:', err);
      } finally {
        if (active) {
          setIsLoading(false);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // refresh every 10s

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  // Fetch invite code on load
  useEffect(() => {
    if (baseUrl) {
      fetchInviteCode(false);
    }
  }, [baseUrl]);

  // Web-specific listener for iframe communication
  useEffect(() => {
    if (Platform.OS === 'web') {
      const handleWebMessage = (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          if (data.type === 'MAP_READY') {
            if (userLocation) {
              postToMap({
                type: 'UPDATE_USER_LOCATION',
                lat: userLocation.lat,
                lng: userLocation.lng,
                initial: userInitial,
                profilePic: getFullProfilePicUrl(),
                center: true
              });
            }
            postToMap({
              type: 'UPDATE_BUSES',
              buses: buses
            });
            postToMap({
              type: 'UPDATE_STOPS',
              stops: sheetTab === 'busstops' ? filteredStops : []
            });
            postToMap({
              type: 'UPDATE_FRIENDS',
              friends: circles,
              user: userLocation ? {
                lat: userLocation.lat,
                lng: userLocation.lng,
                initial: userInitial,
                profilePic: getFullProfilePicUrl()
              } : null
            });
          }
        } catch (e) { }
      };
      window.addEventListener('message', handleWebMessage);
      return () => window.removeEventListener('message', handleWebMessage);
    }
  }, [userLocation, buses, filteredStops, sheetTab, circles]);

  const handleWebViewMessage = (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      if (data.type === 'MAP_READY') {
        if (userLocation) {
          postToMap({
            type: 'UPDATE_USER_LOCATION',
            lat: userLocation.lat,
            lng: userLocation.lng,
            initial: userInitial,
            profilePic: getFullProfilePicUrl(),
            center: true
          });
        }
        postToMap({
          type: 'UPDATE_BUSES',
          buses: buses
        });
        postToMap({
          type: 'UPDATE_STOPS',
          stops: sheetTab === 'busstops' ? filteredStops : busStops
        });
        postToMap({
          type: 'UPDATE_FRIENDS',
          friends: circles,
          user: userLocation ? {
            lat: userLocation.lat,
            lng: userLocation.lng,
            initial: userInitial,
            profilePic: getFullProfilePicUrl()
          } : null
        });
      }
      else if (data.type === 'USER_MARKER_CLICKED') {
        setWaitingModalVisible(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to resolve nearest stop within 150m geofence
  const resolveNearestStop = () => {
    if (!userLocation || busStops.length === 0) return null;

    let nearestStop: any = null;
    let minDistance = 0.15; // recognized within 150 meters (0.15 km)

    busStops.forEach(stop => {
      const stopLat = parseFloat(stop.latitude || stop.lat);
      const stopLng = parseFloat(stop.longitude || stop.lng);
      if (!isNaN(stopLat) && !isNaN(stopLng)) {
        const R = 6371; // km
        const dLat = (userLocation.lat - stopLat) * Math.PI / 180;
        const dLon = (userLocation.lng - stopLng) * Math.PI / 180;
        const a =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.cos(stopLat * Math.PI / 180) *
          Math.cos(userLocation.lat * Math.PI / 180) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const distance = R * c;

        if (distance < minDistance) {
          minDistance = distance;
          nearestStop = stop;
        }
      }
    });

    return nearestStop;
  };

  const handleSetWaiting = async (stopName: string) => {
    setIsUpdatingWaiting(true);
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/waiting/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          location_name: stopName
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsWaiting(true);
        setWaitingLocation(stopName);
        setWaitingModalVisible(false);
        Alert.alert('Waiting Status Set', `🚌 You are now marked as waiting at ${stopName}!`);
      } else {
        Alert.alert('Error', data.message || 'Failed to update waiting status.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Failed to set waiting status.');
    } finally {
      setIsUpdatingWaiting(false);
    }
  };

  const handleCancelWaiting = async () => {
    setIsUpdatingWaiting(true);
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/waiting/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsWaiting(false);
        setWaitingLocation('');
        setWaitingModalVisible(false);
        Alert.alert('Success', 'Waiting status cancelled successfully.');
      } else {
        Alert.alert('Error', data.message || 'Failed to cancel waiting status.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error. Failed to cancel waiting status.');
    } finally {
      setIsUpdatingWaiting(false);
    }
  };

  const centerToMyLocation = () => {
    if (userLocation) {
      postToMap({
        type: 'SET_CENTER',
        lat: userLocation.lat,
        lng: userLocation.lng,
        zoom: 16
      });
    }
  };

  const handleStopPress = (stop: any) => {
    const lat = parseFloat(stop.lat || stop.latitude);
    const lng = parseFloat(stop.lng || stop.longitude);
    if (lat && lng) {
      postToMap({
        type: 'FOCUS_STOP',
        stop_id: stop.id,
        name: stop.name
      });
    }
  };

  const generateInviteCode = () => {
    fetchInviteCode(true);
  };

  const handleJoinCircle = async () => {
    if (joinCode.trim().length !== 6) {
      Alert.alert('Error', 'Invite code must be 6 alphanumeric characters.');
      return;
    }
    try {
      const res = await fetch(`${baseUrl}/api/group/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: joinCode }),
        credentials: 'include'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          Alert.alert('Success', data.message || `Successfully joined circle with code: ${joinCode}`);
          setJoinCode('');
          fetchGroupMembers();
        } else {
          Alert.alert('Error', data.message || 'Failed to join circle.');
        }
      } else {
        Alert.alert('Error', 'Server error joining circle.');
      }
    } catch (err) {
      console.error('Error joining circle:', err);
      Alert.alert('Error', 'Network error joining circle.');
    }
  };

  const handleRemoveCircleMember = async (friendId: number, friendName: string) => {
    const performRemove = async () => {
      try {
        const currentBaseUrl = await getServerUrl();
        const res = await fetch(`${currentBaseUrl}/api/group/remove`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ friend_id: friendId }),
          credentials: 'include'
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            Alert.alert('Success', data.message || `Successfully removed ${friendName} from circle.`);
            fetchGroupMembers();
          } else {
            Alert.alert('Error', data.message || 'Failed to remove member.');
          }
        } else {
          Alert.alert('Error', 'Server error removing member.');
        }
      } catch (err) {
        console.error('Error removing member:', err);
        Alert.alert('Error', 'Network error removing member.');
      }
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm(`Are you sure you want to remove ${friendName} from your circle?`);
      if (confirm) {
        performRemove();
      }
    } else {
      Alert.alert(
        'Remove Member',
        `Are you sure you want to remove ${friendName} from your circle?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Remove', style: 'destructive', onPress: performRemove }
        ]
      );
    }
  };

  const handleTriggerSOS = () => {
    Alert.alert(
      'Emergency Center',
      'Trigger Panic Alert? This will broadcast your live location to emergency contacts and nearby buses.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'TRIGGER SOS',
          style: 'destructive',
          onPress: async () => {
            try {
              const email = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
              const res = await fetch(`${baseUrl}/api/sos/send`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  email: email,
                  recipients: [],
                  location_text: 'Mobile Device',
                  lat: userLocation ? userLocation.lat : null,
                  lng: userLocation ? userLocation.lng : null
                }),
                credentials: 'include'
              });
              const data = await res.json();
              if (data.success) {
                if (data.fcm_tokens && data.fcm_tokens.length > 0 && data.jwt && data.project_id) {
                  try {
                    await sendFcmPushes(data);
                    Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been notified via Push Notifications.');
                  } catch (pushErr) {
                    Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been registered on the server, but push notification broadcast failed.');
                  }
                } else {
                  Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been notified on the server.');
                }
              } else {
                Alert.alert('SOS Failed', data.message || 'Failed to send SOS.');
              }
            } catch (err) {
              console.error('SOS Alert send error:', err);
              Alert.alert('SOS Failed', 'Network error. Failed to broadcast SOS.');
            }
          }
        }
      ]
    );
  };

  // Map HTML using LeafletJS loaded via CDN
  const leafletHTML = getLeafletHTML(baseUrl);

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Main Content Area */}
      <View style={tw`flex-1 relative`}>
        {activeTab === 'location' && (
          <View style={tw`flex-1 relative`}>
            {/* Conditional Map rendering (iframe for Web, WebView for Mobile) */}
            {Platform.OS === 'web' ? (
              <iframe
                ref={webViewRef}
                srcDoc={leafletHTML}
                style={{ flex: 1, border: 'none', width: '100%', height: '100%' }}
              />
            ) : (
              <WebView
                ref={webViewRef}
                originWhitelist={['*']}
                source={{ html: leafletHTML }}
                onMessage={handleWebViewMessage}
                style={tw`flex-1`}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            )}

            <PassengerBottomSheet
              sheetTab={sheetTab}
              setSheetTab={setSheetTab}
              filteredBuses={filteredBuses}
              selectedRoute={selectedRoute}
              setSelectedRoute={setSelectedRoute}
              inviteCode={inviteCode}
              generateInviteCode={fetchInviteCode}
              joinCode={joinCode}
              setJoinCode={setJoinCode}
              handleJoinCircle={handleJoinCircle}
              circles={circles}
              stopsRoute={stopsRoute}
              setStopsRoute={setStopsRoute}
              filteredStops={filteredStops}
              handleStopPress={handleStopPress}
              userLocation={userLocation}
              baseUrl={baseUrl}
              translateY={translateY}
              handleRemoveCircleMember={handleRemoveCircleMember}
              activeStep={activeStep}
              menuVisible={menuVisible}
            />

            {/* GPS locate button (Rides alongside the bottom sheet using translateY) */}
            <Animated.View
              ref={recenterRef}
              onLayout={() => handleTourLayout('recenter', recenterRef)}
              style={[
                tw`absolute right-4 bg-white w-12 h-12 rounded-full justify-center items-center shadow-lg z-[1080]`,
                {
                  bottom: 110 + insets.bottom + 12,
                  transform: [{ translateY: translateY.interpolate({ inputRange: [0, (SCREEN_HEIGHT * 0.7) - 120], outputRange: [-((SCREEN_HEIGHT * 0.7) - 120), 0] }) }],
                  elevation: 30,
                }
              ]}
            >
              <TouchableOpacity
                onPress={centerToMyLocation}
                style={tw`w-full h-full justify-center items-center`}
              >
                <MaterialIcons name="my-location" size={24} color="#103d7c" />
              </TouchableOpacity>
            </Animated.View>
          </View>
        )}

        <PassengerFooter activeTab={activeTab} setActiveTab={setActiveTab} onTriggerSOS={handleTriggerSOS} />

        {/* Floating absolute header rendered at root level to properly layer on top of all screens/footers */}
        <View style={[tw`absolute top-0 left-0 right-0 z-[2002]`, menuVisible && { bottom: 0 }]}>
          <PassengerHeader
            onTriggerSOS={handleTriggerSOS}
            activeStep={activeStep}
            menuVisible={menuVisible}
            setMenuVisible={setMenuVisible}
          />
        </View>

        {activeStep !== null && (
          <TourOverlay
            key={activeStep}
            currentStep={activeStep}
            onStepChange={setActiveStep}
            onClose={() => setActiveStep(null)}
            translateY={translateY}
          />
        )}

        {/* Native Waiting Status Modal */}
        <Modal
          visible={waitingModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setWaitingModalVisible(false)}
        >
          <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
            <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
              {/* Close Button */}
              <TouchableOpacity
                onPress={() => setWaitingModalVisible(false)}
                style={tw`absolute top-4 right-4 p-1 z-10`}
              >
                <MaterialIcons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>

              {/* Waiting Icon */}
              <Image
                source={require('../../../assets/images/waitingMark.svg')}
                style={tw`w-[80px] h-[80px] mb-4`}
                contentFit="contain"
              />

              <Text style={[tw`text-lg font-black text-slate-800 text-center mb-1.5`, { fontFamily: 'Inter_900Black' }]}>
                Are you waiting for a bus?
              </Text>

              {isWaiting ? (
                <>
                  {/* Status Indicator: Waiting */}
                  <View style={tw`bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                    <Text style={[tw`text-xs font-black text-emerald-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                      STATUS: WAITING
                    </Text>
                    <Text style={[tw`text-[13px] text-emerald-600 font-semibold text-center`, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                      At {waitingLocation}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={handleCancelWaiting}
                    disabled={isUpdatingWaiting}
                    style={tw`w-full bg-red-500 py-3 rounded-full flex-row justify-center items-center gap-2 shadow-md mb-2`}
                  >
                    <Image
                      source={require('../../../assets/images/EKS.svg')}
                      style={tw`w-4 h-4`}
                      contentFit="contain"
                    />
                    <Text style={[tw`text-white font-black text-sm`, { fontFamily: 'Inter_900Black' }]}>
                      {isUpdatingWaiting ? 'Cancelling...' : 'Cancel Waiting'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  {/* Status Indicator: Not Waiting */}
                  {resolveNearestStop() ? (
                    <>
                      <View style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          RECOGNIZED LOCATION
                        </Text>
                        <Text style={[tw`text-[15px] font-black text-[#1e3a8a] text-center`, { fontFamily: 'Inter_900Black' }]} numberOfLines={2}>
                          {resolveNearestStop()?.name}
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => handleSetWaiting(resolveNearestStop()?.name)}
                        disabled={isUpdatingWaiting}
                        style={tw`w-full bg-[#103d7c] py-3 rounded-full flex-row justify-center items-center gap-2 shadow-md mb-2`}
                      >
                        <Image
                          source={require('../../../assets/images/waitingButton.svg')}
                          style={tw`w-[120px] h-[22px]`}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    </>
                  ) : (
                    <>
                      <View style={tw`bg-red-50 border border-red-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-[10px] font-black text-red-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          UNRECOGNIZED LOCATION
                        </Text>
                        <Text style={[tw`text-xs text-red-500 font-semibold text-center leading-relaxed`, { fontFamily: 'Inter_500Medium' }]}>
                          Waiting can only be activated at designated pickup points or stops.
                        </Text>
                      </View>

                      <TouchableOpacity
                        onPress={() => setWaitingModalVisible(false)}
                        style={tw`w-full bg-slate-100 py-3 rounded-full justify-center items-center mb-2`}
                      >
                        <Text style={[tw`text-slate-500 font-black text-sm`, { fontFamily: 'Inter_900Black' }]}>
                          Close
                        </Text>
                      </TouchableOpacity>
                    </>
                  )}
                </>
              )}
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
