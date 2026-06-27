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
import TourOverlay, { tourSteps } from '../../components/TourOverlay';
import { handleTourLayout } from '../../components/TourRegistry';

export default function PassengerDashboard() {
  const [activeStep, setActiveStep] = useState<number | null>(null);

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

  const webViewRef = useRef<any>(null);
  const recenterRef = useRef<any>(null);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
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

  // Watch device location and update state + backend
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;
    let isMounted = true;

    async function startTracking() {
      try {
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status !== 'granted') {
          console.warn('Foreground location permission denied.');
          return;
        }

        // Get initial location
        const initialLoc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        if (initialLoc && isMounted) {
          const lat = initialLoc.coords.latitude;
          const lng = initialLoc.coords.longitude;
          setUserLocation({ lat, lng });

          postToMap({
            type: 'UPDATE_USER_LOCATION',
            lat,
            lng,
            initial: userInitial,
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
            setUserLocation({ lat, lng });

            postToMap({
              type: 'UPDATE_USER_LOCATION',
              lat,
              lng,
              initial: userInitial,
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
        subscription.remove();
      }
    };
  }, []);

  const filteredBuses = buses.filter(bus => !selectedRoute || bus.route === selectedRoute);
  const filteredStops = busStops.filter(stop => stop.route === stopsRoute);

  // Cross-platform helper to send messages to the Leaflet map (WebView or iframe)
  const postToMap = (message: any) => {
    const payload = JSON.stringify(message);
    if (Platform.OS === 'web') {
      webViewRef.current?.contentWindow?.postMessage(payload, '*');
    } else {
      webViewRef.current?.postMessage(payload);
    }
  };

  // Sync stops to map whenever filteredStops or sheetTab changes (only show stops when busstops tab is active)
  useEffect(() => {
    postToMap({
      type: 'UPDATE_STOPS',
      stops: sheetTab === 'busstops' ? filteredStops : []
    });
  }, [filteredStops, sheetTab]);

  // Sync filtered buses to map whenever buses or selectedRoute changes
  useEffect(() => {
    postToMap({
      type: 'UPDATE_BUSES',
      buses: filteredBuses
    });
  }, [buses, selectedRoute]);

  // Sync user location marker to map whenever location or profile details update
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
  }, [userLocation, userInitial, userProfilePic]);

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
            friends: friendsOnly
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
              friends: friendsOnly
            });
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
              friends: circles
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
          stops: sheetTab === 'busstops' ? filteredStops : []
        });
        postToMap({
          type: 'UPDATE_FRIENDS',
          friends: circles
        });
      }
    } catch (e) {
      console.error(e);
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
  const leafletHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
      <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
      <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body { padding: 0; margin: 0; }
        html, body, #map { height: 100%; width: 100vw; background: #e5e7eb; }
        
        .waiting-badge {
          background: #ffffff;
          border: 2px solid #10b981;
          border-radius: 12px;
          color: #10b981;
          font-family: sans-serif;
          font-size: 10px;
          font-weight: 800;
          padding: 2px 6px;
          white-space: nowrap;
          position: absolute;
          bottom: 34px;
          left: 50%;
          transform: translateX(-50%);
          box-shadow: 0 2px 4px rgba(0,0,0,0.15);
        }
        
        .user-avatar-circle {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: #3b82f6;
          border: 2.5px solid #ffffff;
          color: #ffffff;
          font-family: sans-serif;
          font-weight: 900;
          font-size: 13px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 0 0 2px #3b82f6, 0 3px 8px rgba(0,0,0,0.3);
        }

        .bus-marker-icon {
          background: #1856b0;
          border: 2px solid #ffffff;
          border-radius: 50%;
          color: white;
          font-family: sans-serif;
          font-weight: bold;
          font-size: 11px;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
        
        .bus-stop-icon {
          background: #ef4444;
          border: 2px solid #ffffff;
          border-radius: 50%;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
        }
      </style>
    </head>
    <body>
      <div id="map"></div>
      <script>
        var map = L.map('map', { zoomControl: false }).setView([14.2137, 121.1620], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        var userMarker = null;
        var busMarkers = {};
        var stopMarkers = {};
        window.groupMarkers = [];

        // Custom listener for RN postMessage
        window.addEventListener('message', function(event) {
          try {
            var data = JSON.parse(event.data);
            if (data.type === 'SET_CENTER') {
              map.setView([data.lat, data.lng], data.zoom || 14);
            } 
            else if (data.type === 'FOCUS_STOP') {
              var m = stopMarkers[data.stop_id || data.name];
              if (m) {
                map.setView(m.getLatLng(), 16);
                m.openPopup();
              }
            }
            else if (data.type === 'UPDATE_USER_LOCATION') {
              var avatarHtml = (data.profilePic && data.profilePic !== '') 
                ? '<img src="' + data.profilePic + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\\'none\\';" />'
                : data.initial;

              var userIcon = L.divIcon({
                className: 'user-marker-container',
                html: '<div style="position: relative; width: 30px; height: 30px;"><div class="waiting-badge">Waiting?</div><div class="user-avatar-circle" style="overflow: hidden; display: flex; align-items: center; justify-content: center;">' + avatarHtml + '</div></div>',
                iconSize: [30, 45],
                iconAnchor: [15, 30],
                popupAnchor: [0, -30]
              });

              if (userMarker) {
                userMarker.setLatLng([data.lat, data.lng]);
                userMarker.setIcon(userIcon);
              } else {
                userMarker = L.marker([data.lat, data.lng], { icon: userIcon }).addTo(map);
              }
              if (data.center) {
                map.setView([data.lat, data.lng], 14);
              }
            } 
            else if (data.type === 'UPDATE_BUSES') {
              Object.keys(busMarkers).forEach(function(key) {
                map.removeLayer(busMarkers[key]);
              });
              busMarkers = {};
              var busIconUrl = "${baseUrl}/assets/images/icons/marker.svg";
              data.buses.forEach(function(bus) {
                var lat = bus.lat || bus.latitude;
                var lng = bus.lng || bus.longitude;
                if (lat && lng) {
                  var busIcon = L.icon({
                    iconUrl: busIconUrl,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14],
                    popupAnchor: [0, -14]
                  });
                  var m = L.marker([parseFloat(lat), parseFloat(lng)], { icon: busIcon })
                    .bindPopup('<b>Bus Plate:</b> ' + (bus.plate_number || 'N/A') + '<br/><b>Route:</b> ' + (bus.route || 'N/A'))
                    .addTo(map);
                  busMarkers[bus.bus_id || bus.plate_number] = m;
                }
              });
            }
            else if (data.type === 'UPDATE_STOPS') {
              Object.keys(stopMarkers).forEach(function(key) {
                map.removeLayer(stopMarkers[key]);
              });
              stopMarkers = {};
              data.stops.forEach(function(stop) {
                var lat = stop.lat || stop.latitude;
                var lng = stop.lng || stop.longitude;
                if (lat && lng) {
                  var stopIcon = L.divIcon({
                    className: 'bus-stop-marker-svg-container',
                    html: '<div style="width:26px;height:33px;">' +
                          '<svg width="26" height="33" viewBox="0 0 3287 4203" fill="none" xmlns="http://www.w3.org/2000/svg">' +
                          '<rect x="750.834" y="1205.59" width="229.82" height="500.548" rx="59" fill="#1856b0"/>' +
                          '<rect x="959.037" y="2172.48" width="350.418" height="367.144" rx="59" fill="#1856b0"/>' +
                          '<rect x="2304.96" y="1205.59" width="229.82" height="500.548" rx="59" fill="#1856b0"/>' +
                          '<rect x="1981.85" y="2227.21" width="350.418" height="312.415" rx="59" fill="#1856b0"/>' +
                          '<path d="M2167.12 754.076C2294.14 754.076 2397.12 857.051 2397.12 984.076V2289.92H888.5V984.076C888.5 857.051 991.475 754.076 1118.5 754.076H2167.12ZM1134.82 1886.29C1062.87 1886.29 1004.55 1944.74 1004.55 2016.85C1004.55 2088.95 1062.87 2147.4 1134.82 2147.4C1206.76 2147.4 1265.09 2088.95 1265.09 2016.85C1265.09 1944.74 1206.76 1886.29 1134.82 1886.29ZM2174.69 1886.29C2102.75 1886.29 2044.42 1944.74 2044.42 2016.85C2044.42 2088.95 2102.75 2147.4 2174.69 2147.4C2246.64 2147.4 2304.96 2088.95 2304.96 2016.85C2304.96 1944.74 2246.64 1886.29 2174.69 1886.29ZM1026.16 1706.14H1552.93V1089.29H1026.16V1706.14ZM1748.62 1706.14H2275.38V1089.29H1748.62V1706.14Z" fill="#1856b0"/>' +
                          '<path d="M2355.03 0C2869.2 0.000252381 3286.03 416.823 3286.03 931V2362.18C3286.03 2876.36 2869.2 3293.18 2355.03 3293.18H931C416.823 3293.18 0 2876.36 0 2362.18V931.001C0 416.824 416.823 0 931 0H2355.03ZM1277.99 304.562C763.81 304.562 346.987 721.385 346.987 1235.56V1972.12C346.987 2486.29 763.809 2903.12 1277.99 2903.12H2008.89C2523.07 2903.12 2939.89 2486.29 2939.89 1972.12V1235.56C2939.89 721.385 2523.07 304.563 2008.89 304.562H1277.99Z" fill="#1856b0"/>' +
                          '<path d="M1755.22 4081C1697.77 4136.99 1606.57 4138.29 1547.56 4083.97L522.862 3140.71C412.608 3039.22 501.579 2856.44 649.478 2880.59L1569.22 3030.79C1586.3 3033.57 1603.73 3033.41 1620.75 3030.29L2626.15 2846.24C2772.84 2819.38 2865.52 2998.81 2758.72 3102.9L1755.22 4081Z" fill="#1856b0"/>' +
                          '</svg>' +
                          '</div>',
                    iconSize: [26, 33],
                    iconAnchor: [13, 33],
                    popupAnchor: [0, -33]
                  });
                  var labelType = (stop.type || 'stop').toUpperCase() === 'TERMINAL' ? 'Bus Stop' : 'Pickup Point';
                  var popupContent = '<div>' +
                    '<strong style="font-size:13px;color:#1e293b;display:block;margin-bottom:2px;">' + (stop.name || '') + '</strong>' +
                    '<span style="font-size:11px;color:#475569;display:block;">' + (stop.location_name || '') + '</span>' +
                    (stop.location_landmark ? '<span style="font-size:11px;color:#475569;display:block;">' + stop.location_landmark + '</span>' : '') +
                    '<span style="font-size:10px;color:#64748b;font-weight:bold;display:block;margin-top:4px;">' + labelType + '</span>' +
                    '</div>';
                  var m = L.marker([parseFloat(lat), parseFloat(lng)], { icon: stopIcon })
                    .bindPopup(popupContent)
                    .addTo(map);
                  stopMarkers[stop.id || stop.name] = m;
                }
              });
            }
            else if (data.type === 'UPDATE_FRIENDS') {
              if (window.groupMarkers) {
                window.groupMarkers.forEach(function(m) {
                  map.removeLayer(m);
                });
              }
              window.groupMarkers = [];

              data.friends.forEach(function(friend) {
                if (friend.latitude && friend.longitude) {
                  var initials = (friend.name || friend.email || '?').substring(0, 2).toUpperCase();
                  var isWaiting = friend.waiting_status === 'waiting';
                  var isBoarded = friend.ride_status === 'active';
                  
                  var profilePicUrl = '';
                  if (friend.profile_picture) {
                    profilePicUrl = (friend.profile_picture.indexOf('http') === 0 || friend.profile_picture.indexOf('data:') === 0)
                      ? friend.profile_picture 
                      : '${baseUrl.endsWith("/") ? baseUrl.slice(0, -1) : baseUrl}/' + friend.profile_picture.replace(/^\\//, '');
                  }

                  var avatarHtml = (profilePicUrl && profilePicUrl !== '')
                    ? '<img src="' + profilePicUrl + '" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;" onerror="this.style.display=\\'none\\';" />'
                    : initials;

                  var friendIcon = L.divIcon({
                    className: 'friend-marker-container',
                    html: '<div style="position: relative; width: 30px; height: 30px;">' +
                          '<div class="user-avatar-circle" style="background: #10b981; border-color: white; overflow: hidden; display: flex; align-items: center; justify-content: center;">' + avatarHtml + '</div>' +
                          '</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15],
                    popupAnchor: [0, -15]
                  });

                  var popupHtml = '<div><strong>' + (friend.name || friend.email) + '</strong></div>';
                  if (isWaiting) {
                    popupHtml += '<div style="font-size:11px;color:#d97706;">Waiting at <b>' + (friend.waiting_location || '') + '</b></div>';
                  } else if (isBoarded) {
                    popupHtml += '<div style="font-size:11px;color:#15803d;">Onboard Bus <b>' + (friend.boarded_bus_code || '') + '</b></div>';
                  } else {
                    popupHtml += '<div style="font-size:11px;color:#64748b;">Live location available</div>';
                  }

                  var m = L.marker([parseFloat(friend.latitude), parseFloat(friend.longitude)], { icon: friendIcon })
                    .bindPopup(popupHtml)
                    .addTo(map);
                  window.groupMarkers.push(m);
                }
              });
            }
          } catch(e) {
            // fail silently
          }
        });

        var postMessageFn = (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) 
          ? window.ReactNativeWebView.postMessage.bind(window.ReactNativeWebView) 
          : (window.parent && window.parent.postMessage) ? function(msg) { window.parent.postMessage(msg, '*'); } : null;

        if (postMessageFn) {
          postMessageFn(JSON.stringify({ type: 'MAP_READY' }));
        }
      </script>
    </body>
    </html>
  `;

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

            {/* Floating absolute header so map shows behind bottom rounded corners */}
            <View style={tw`absolute top-0 left-0 right-0 z-[2002]`}>
              <PassengerHeader onTriggerSOS={handleTriggerSOS} activeStep={activeStep} />
            </View>

            {/* GPS locate button (Rides alongside the bottom sheet using translateY) */}
            <Animated.View
              ref={recenterRef}
              onLayout={() => handleTourLayout('recenter', recenterRef)}
              style={[
                tw`absolute right-4 bg-white w-12 h-12 rounded-full justify-center items-center shadow-lg z-[1060]`,
                {
                  bottom: (SCREEN_HEIGHT * 0.7) + 12,
                  transform: [{ translateY }],
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
            />
          </View>
        )}

        <PassengerFooter activeTab={activeTab} setActiveTab={setActiveTab} onTriggerSOS={handleTriggerSOS} />

        {activeStep !== null && (
          <TourOverlay 
            currentStep={activeStep} 
            onStepChange={setActiveStep} 
            onClose={() => setActiveStep(null)} 
          />
        )}
      </View>
    </SafeAreaView>
  );
}
