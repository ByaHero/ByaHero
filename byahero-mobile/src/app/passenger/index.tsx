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
} from 'react-native';
import { router } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../services/authService';
import * as Location from 'expo-location';

export default function PassengerDashboard() {
  const [activeTab, setActiveTab] = useState<'location' | 'sos' | 'info'>('location');
  const [sheetTab, setSheetTab] = useState<'location' | 'routes' | 'groups' | 'busstops'>('location');
  const [isLoading, setIsLoading] = useState(true);
  const [buses, setBuses] = useState<any[]>([]);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [selectedRoute, setSelectedRoute] = useState<string>(''); // empty means All
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  const [inviteCode, setInviteCode] = useState('------');
  const [joinCode, setJoinCode] = useState('');
  const [circles, setCircles] = useState<any[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  const webViewRef = useRef<any>(null);

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
            initial: 'P',
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
              initial: 'P',
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
        await fetch(`${currentBaseUrl}/backend/updateUserLocation.php`, {
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

  const fetchInviteCode = async (reset = false) => {
    try {
      const url = reset
        ? `${baseUrl}/backend/getInviteCode.php?reset=1`
        : `${baseUrl}/backend/getInviteCode.php`;
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
      const res = await fetch(`${baseUrl}/backend/groupView.php`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.friends)) {
          setCircles(data.friends);
          postToMap({
            type: 'UPDATE_FRIENDS',
            friends: data.friends
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
        const busesRes = await fetch(`${currentBaseUrl}/public/api.php?action=get_buses`);
        if (busesRes.ok && active) {
          const busesData = await busesRes.json();
          if (busesData && busesData.success && Array.isArray(busesData.buses)) {
            // Filter only available/active buses with valid coordinates
            const activeBuses = busesData.buses.filter((bus: any) =>
              (bus.status === 'available' || bus.status === 'active') &&
              bus.lat !== null && bus.lat !== undefined && bus.lat !== '' &&
              bus.lng !== null && bus.lng !== undefined && bus.lng !== ''
            );
            setBuses(activeBuses);
            postToMap({
              type: 'UPDATE_BUSES',
              buses: activeBuses
            });
          }
        }

        // Fetch bus stops
        const stopsRes = await fetch(`${currentBaseUrl}/public/api.php?action=get_bus_stops_terminal`);
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
        const groupRes = await fetch(`${currentBaseUrl}/backend/groupView.php`, { credentials: 'include', cache: 'no-store' });
        if (groupRes.ok && active) {
          const groupData = await groupRes.json();
          if (groupData.success && Array.isArray(groupData.friends)) {
            setCircles(groupData.friends);
            postToMap({
              type: 'UPDATE_FRIENDS',
              friends: groupData.friends
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
                initial: 'P',
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
            initial: 'P',
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

  const getDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // km
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
      const res = await fetch(`${baseUrl}/backend/joinCircleByCode.php`, {
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
              const res = await fetch(`${baseUrl}/backend/sendSosAlert.php`, {
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
                Alert.alert('SOS Broadcasted', 'Help is on the way! Your circle has been notified.');
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
              if (userMarker) {
                userMarker.setLatLng([data.lat, data.lng]);
              } else {
                var userIcon = L.divIcon({
                  className: 'user-marker-container',
                  html: '<div style="position: relative; width: 30px; height: 30px;"><div class="waiting-badge">Waiting?</div><div class="user-avatar-circle">' + data.initial + '</div></div>',
                  iconSize: [30, 45],
                  iconAnchor: [15, 30]
                });
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
              var busIconUrl = "${baseUrl}/assets/images/icons/busActive.svg";
              data.buses.forEach(function(bus) {
                var lat = bus.lat || bus.latitude;
                var lng = bus.lng || bus.longitude;
                if (lat && lng) {
                  var busIcon = L.icon({
                    iconUrl: busIconUrl,
                    iconSize: [28, 28],
                    iconAnchor: [14, 14]
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
                    iconAnchor: [13, 33]
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
                  
                  var friendIcon = L.divIcon({
                    className: 'friend-marker-container',
                    html: '<div style="position: relative; width: 30px; height: 30px;">' +
                          '<div class="user-avatar-circle" style="background: #10b981; border-color: white;">' + initials + '</div>' +
                          '</div>',
                    iconSize: [30, 30],
                    iconAnchor: [15, 15]
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
      {/* Top Header Bar */}
      <View style={tw`h-14 bg-[#103d7c] flex-row items-center justify-between px-4 rounded-b-2xl shadow-sm`}>
        <View style={tw`w-15`}>
          <Image
            source={require('../../../assets/images/topBarLogo.svg')}
            style={tw`w-8 h-8`}
            contentFit="contain"
          />
        </View>

        <View style={tw`absolute left-1/2 -translate-x-1/2`}>
          <Image
            source={require('../../../assets/images/ByaHero.svg')}
            style={tw`w-[100px] h-[30px]`}
            contentFit="contain"
          />
        </View>

        <View style={tw`flex-row items-center gap-3`}>
          <TouchableOpacity style={tw`p-1`}>
            <Image
              source={require('../../../assets/images/notification bell.svg')}
              style={tw`w-[22px] h-[22px]`}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={tw`p-1`}>
            <Image
              source={require('../../../assets/images/HAMBURGER.svg')}
              style={tw`w-[18px] h-[18px]`}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <View style={tw`flex-1 relative`}>
        {activeTab === 'location' && (
          <View style={tw`flex-1`}>
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

            {/* GPS locate button */}
            <TouchableOpacity style={tw`absolute right-4 bottom-[42%] bg-white w-12 h-12 rounded-full justify-center items-center shadow-lg z-[1060]`} onPress={centerToMyLocation}>
              <Image
                source={require('../../../assets/images/icons/my_location.svg')}
                style={tw`w-6 h-6`}
                contentFit="contain"
              />
            </TouchableOpacity>

            {/* Draggable bottom panel / Bottom Sheet */}
            <View style={tw`absolute left-0 right-0 bottom-0 h-[40%] bg-white rounded-t-2xl shadow-2xl z-[1050]`}>
              {/* Drag Handle indicator */}
              <View style={tw`w-20 h-1.5 bg-[#e2e8f0] rounded-full self-center mt-2.5`} />

              {/* Bottom Sheet Header Quick Filter Tabs */}
              <View style={tw`flex-row justify-around px-4 py-3.5 border-b border-[#f1f5f9]`}>
                <TouchableOpacity
                  onPress={() => setSheetTab('location')}
                  style={[tw`w-12 h-9 rounded-full bg-[#f1f5f9] justify-center items-center`, sheetTab === 'location' && tw`bg-[#103d7c]`]}
                >
                  <Image
                    source={sheetTab === 'location'
                      ? require('../../../assets/images/icons/busStopWhiteIcon.png')
                      : require('../../../assets/images/icons/busStopBlueIcon.png')
                    }
                    style={tw`w-5 h-5`}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSheetTab('routes')}
                  style={[tw`w-12 h-9 rounded-full bg-[#f1f5f9] justify-center items-center`, sheetTab === 'routes' && tw`bg-[#103d7c]`]}
                >
                  <Image
                    source={sheetTab === 'routes'
                      ? require('../../../assets/images/icons/routes active.svg')
                      : require('../../../assets/images/icons/routes idle.svg')
                    }
                    style={tw`w-5 h-5`}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSheetTab('groups')}
                  style={[tw`w-12 h-9 rounded-full bg-[#f1f5f9] justify-center items-center`, sheetTab === 'groups' && tw`bg-[#103d7c]`]}
                >
                  <Image
                    source={sheetTab === 'groups'
                      ? require('../../../assets/images/icons/groupsActive.svg')
                      : require('../../../assets/images/icons/groupsIdle.svg')
                    }
                    style={tw`w-5 h-5`}
                    contentFit="contain"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSheetTab('busstops')}
                  style={[tw`w-12 h-9 rounded-full bg-[#f1f5f9] justify-center items-center`, sheetTab === 'busstops' && tw`bg-[#103d7c]`]}
                >
                  <Image
                    source={sheetTab === 'busstops'
                      ? require('../../../assets/images/icons/busStopMarkerFinalWhite.svg')
                      : require('../../../assets/images/icons/busStopMarkerFinalBlue.svg')
                    }
                    style={tw`w-5 h-5`}
                    contentFit="contain"
                  />
                </TouchableOpacity>
              </View>

              {/* Bottom Sheet Body Content */}
              <ScrollView style={tw`flex-1 px-4`} contentContainerStyle={{ paddingBottom: 24 }}>
                {sheetTab === 'location' && (
                  <View>
                    <Text style={tw`text-[13px] font-extrabold text-black tracking-wider my-3`}>BUS LOCATION</Text>
                    {filteredBuses.length === 0 ? (
                      <View style={tw`items-center justify-center py-8`}>
                        <Image
                          source={require('../../../assets/images/icons/noBusBig.svg')}
                          style={tw`w-[72px] h-[72px]`}
                          contentFit="contain"
                        />
                        <Text style={tw`text-sm text-[#64748b] font-semibold mt-3`}>No Available Bus</Text>
                      </View>
                    ) : (
                      filteredBuses.map((bus, idx) => (
                        <View key={idx} style={tw`flex-row items-center bg-[#f8fafc] p-3 rounded-2xl mb-2`}>
                          <View style={tw`w-10 h-10 rounded-full bg-[#e0f2fe] justify-center items-center mr-3`}>
                            <Image
                              source={require('../../../assets/images/icons/busActive.svg')}
                              style={tw`w-6 h-6`}
                              contentFit="contain"
                            />
                          </View>
                          <View style={tw`flex-1`}>
                            <Text style={tw`text-sm font-bold text-[#1e293b]`}>Plate: {bus.plate_number || 'N/A'}</Text>
                            <Text style={tw`text-xs text-[#64748b]`}>{bus.route || 'All Routes'}</Text>
                          </View>
                          <View style={tw`px-2 py-1 rounded-xl bg-[#dcfce7]`}>
                            <Text style={tw`text-[10px] text-[#15803d] font-bold`}>Active</Text>
                          </View>
                        </View>
                      ))
                    )}
                  </View>
                )}

                {sheetTab === 'routes' && (
                  <View>
                    <Text style={tw`text-[13px] font-extrabold text-black tracking-wider my-3`}>FILTER ROUTES</Text>
                    <TouchableOpacity
                      onPress={() => setSelectedRoute('TANAUAN - LAUREL')}
                      style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === 'TANAUAN - LAUREL' && tw`bg-[#103d7c]`]}
                    >
                      <Text style={[tw`text-sm font-semibold text-[#1e293b]`, selectedRoute === 'TANAUAN - LAUREL' && tw`text-white`]}>
                        Tanauan - Laurel
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedRoute('LAUREL - TANAUAN')}
                      style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === 'LAUREL - TANAUAN' && tw`bg-[#103d7c]`]}
                    >
                      <Text style={[tw`text-sm font-semibold text-[#1e293b]`, selectedRoute === 'LAUREL - TANAUAN' && tw`text-white`]}>
                        Laurel - Tanauan
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => setSelectedRoute('')}
                      style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === '' && tw`bg-[#103d7c]`]}
                    >
                      <Text style={[tw`text-sm font-semibold text-[#1e293b]`, selectedRoute === '' && tw`text-white`]}>
                        All Routes
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}

                {sheetTab === 'groups' && (
                  <View>
                    <Text style={tw`text-[13px] font-extrabold text-black tracking-wider my-3`}>CIRCLES</Text>
                    <View style={tw`bg-[#f8fafc] p-4 rounded-2xl mb-3`}>
                      <Text style={tw`text-xs text-[#64748b] font-bold`}>Your Invite Code</Text>
                      <View style={tw`flex-row items-center my-2`}>
                        <Text style={tw`text-2xl font-extrabold text-[#1856b0] tracking-widest`}>{inviteCode}</Text>
                        <TouchableOpacity onPress={generateInviteCode} style={tw`ml-auto p-2`}>
                          <Image
                            source={require('../../../assets/images/REFRESH.svg')}
                            style={tw`w-7 h-7`}
                            contentFit="contain"
                          />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={tw`bg-[#f8fafc] p-4 rounded-2xl mb-4`}>
                      <Text style={tw`text-xs text-[#64748b] font-bold`}>Join a Circle</Text>
                      <View style={tw`flex-row gap-2 mt-2`}>
                        <TextInput
                          value={joinCode}
                          onChangeText={setJoinCode}
                          placeholder="Enter 6-digit code"
                          placeholderTextColor="#9ca3af"
                          maxLength={6}
                          style={tw`flex-grow bg-white border border-[#cbd5e1] rounded-2xl px-4 py-2 text-sm text-[#333333]`}
                        />
                        <TouchableOpacity onPress={handleJoinCircle} style={tw`bg-[#1856b0] rounded-2xl justify-center px-5`}>
                          <Text style={tw`color-white font-bold`}>Join</Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {circles.length === 0 ? (
                      <View style={tw`py-4 items-center`}>
                        <Text style={tw`text-xs text-[#64748b] italic`}>No circle members yet.</Text>
                      </View>
                    ) : (
                      circles.map(friend => {
                        const isWaiting = friend.waiting_status === 'waiting';
                        const isBoarded = friend.ride_status === 'active';
                        let statusText = 'Location unavailable';
                        if (isWaiting) {
                          statusText = `Waiting at ${friend.waiting_location}`;
                        } else if (isBoarded) {
                          statusText = `Onboard Bus ${friend.boarded_bus_code || ''}`;
                        } else if (friend.latitude && friend.longitude) {
                          statusText = 'Live location available';
                        }
                        const initials = (friend.name || friend.email || '?').substring(0, 2).toUpperCase();

                        return (
                          <View key={friend.id || friend.email} style={tw`flex-row items-center py-3 border-b border-[#f1f5f9]`}>
                            {friend.profile_picture ? (
                              <Image
                                source={{ uri: friend.profile_picture.startsWith('http') ? friend.profile_picture : `${baseUrl}/${friend.profile_picture}` }}
                                style={tw`w-9 h-9 rounded-full mr-3`}
                                contentFit="cover"
                              />
                            ) : (
                              <View style={tw`w-9 h-9 rounded-full bg-[#1856b0] justify-center items-center mr-3`}>
                                <Text style={tw`text-white font-bold text-xs`}>{initials}</Text>
                              </View>
                            )}
                            <View style={tw`flex-1`}>
                              <Text style={tw`text-sm font-bold text-[#1e293b]`}>{friend.name || friend.email}</Text>
                              <Text style={tw`text-xs text-[#64748b]`}>{statusText}</Text>
                            </View>
                            {(isWaiting || isBoarded) && (
                              <View style={[tw`px-2 py-0.5 rounded-xl ml-2`, isWaiting ? tw`bg-[#fef3c7]` : tw`bg-[#dcfce7]`]}>
                                <Text style={[tw`text-[9px] font-bold`, isWaiting ? tw`text-[#d97706]` : tw`text-[#15803d]`]}>
                                  {isWaiting ? 'Waiting' : 'Boarded'}
                                </Text>
                              </View>
                            )}
                          </View>
                        );
                      })
                    )}
                  </View>
                )}

                {sheetTab === 'busstops' && (
                  <View>
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-[13px] font-extrabold text-black tracking-wider my-3`}>BUS PICK UP POINTS</Text>
                      <TouchableOpacity
                        onPress={() => setStopsRoute(prev => prev === 'LAUREL - TANAUAN' ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN')}
                        style={tw`flex-row items-center bg-[#f1f5f9] px-3 py-1.5 rounded-full gap-1`}
                      >
                        <Text style={tw`text-[10px] font-bold text-black`}>{stopsRoute}</Text>
                        <Image
                          source={require('../../../assets/images/swap.svg')}
                          style={tw`w-4 h-4`}
                          contentFit="contain"
                        />
                      </TouchableOpacity>
                    </View>

                    {filteredStops.length === 0 ? (
                      <View style={tw`items-center justify-center py-8`}>
                        <Image
                          source={require('../../../assets/images/icons/busStopMarkerFinalBlue.svg')}
                          style={tw`w-9 h-9`}
                          contentFit="contain"
                        />
                        <Text style={tw`text-sm text-[#64748b] font-semibold mt-3`}>No stops defined</Text>
                      </View>
                    ) : (
                      filteredStops.map((stop, idx) => {
                        const lat = parseFloat(stop.lat || stop.latitude);
                        const lng = parseFloat(stop.lng || stop.longitude);
                        let distanceStr = '';
                        if (lat && lng && userLocation) {
                          const dist = getDistance(userLocation.lat, userLocation.lng, lat, lng);
                          distanceStr = `${dist.toFixed(1)} km away`;
                        }

                        const labelType = (stop.type || 'stop').toUpperCase() === 'TERMINAL' ? 'BUS STOP' : 'PICKUP POINT';

                        return (
                          <TouchableOpacity
                            key={idx}
                            onPress={() => handleStopPress(stop)}
                            style={tw`bg-white border border-[#f1f5f9] rounded-2xl p-4 mb-3 flex-row justify-between items-center shadow-sm`}
                          >
                            <View style={tw`flex-1 mr-2`}>
                              <Text style={tw`text-sm font-extrabold text-[#1e293b]`}>{stop.name}</Text>
                              <Text style={tw`text-xs text-[#64748b] mt-1`}>
                                {stop.location_name || 'No location name'}{stop.location_landmark ? ` • ${stop.location_landmark}` : ''}
                              </Text>
                            </View>
                            <View style={tw`items-end`}>
                              <View style={tw`bg-[#e2e8f0] px-2.5 py-1 rounded-full mb-1`}>
                                <Text style={tw`text-[9px] text-[#475569] font-black`}>{labelType}</Text>
                              </View>
                              {distanceStr ? (
                                <Text style={tw`text-[11px] text-[#475569] font-bold mt-1`}>🚶 {distanceStr}</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        );
                      })
                    )}
                  </View>
                )}
              </ScrollView>
            </View>
          </View>
        )}

        {/* SOS Center Screen Tab view */}
        {activeTab === 'sos' && (
          <View style={tw`flex-1 justify-center items-center px-8 bg-white`}>
            <Image
              source={require('../../../assets/images/icons/SOS.svg')}
              style={tw`w-30 h-30`}
              contentFit="contain"
            />
            <Text style={tw`text-2xl font-bold text-[#103d7c] mt-4 text-center`}>Emergency Center</Text>
            <Text style={tw`text-sm text-[#64748b] text-center mt-2 mb-8 leading-5`}>
              By triggering SOS, you will alert your circle and share your live tracking location for faster dispatch.
            </Text>
            <TouchableOpacity style={tw`bg-[#ef4444] py-4 px-8 rounded-full shadow-lg`} onPress={handleTriggerSOS}>
              <Text style={tw`text-white font-extrabold text-base tracking-wider`}>TRIGGER PANIC ALERT</Text>
            </TouchableOpacity>
          </View>
        )}
 
       {/* Premium Bottom Navigation Bar */}
       <View style={tw`h-[75px] border-t border-[#e2e8f0] flex-row items-center bg-white relative`}>
         <TouchableOpacity
           onPress={() => setActiveTab('location')}
           style={tw`flex-grow items-center justify-center h-full`}
         >
           <Image
             source={activeTab === 'location'
               ? require('../../../assets/images/icons/locationBlack.svg')
               : require('../../../assets/images/icons/locationIdle.svg')
             }
             style={tw`w-6 h-6`}
             contentFit="contain"
           />
           <Text style={[tw`text-[9px] font-extrabold text-[#64748b] mt-1 tracking-widest`, activeTab === 'location' && tw`text-[#1856b0]`]}>LOCATION</Text>
         </TouchableOpacity>
 
         {/* Central Rising SOS Button */}
         <View style={tw`w-[100px] items-center justify-center h-full relative`}>
           <TouchableOpacity 
             style={tw`w-[100px] h-[76px] rounded-t-[50px] bg-[#2563eb] absolute bottom-0 justify-start items-center pt-3.5 shadow-lg`} 
             onPress={handleTriggerSOS}
           >
             <Image
               source={require('../../../assets/images/icons/SOS.svg')}
               style={tw`w-8 h-8`}
               contentFit="contain"
             />
             <Text style={tw`text-white text-[10px] font-extrabold mt-0.5 tracking-wider`}>SOS</Text>
           </TouchableOpacity>
         </View>
 
         <TouchableOpacity
           onPress={() => router.replace('/passenger/busInfo' as any)}
           style={tw`flex-grow items-center justify-center h-full`}
         >
           <Image
             source={require('../../../assets/images/icons/busIdle.svg')}
             style={tw`w-6 h-6`}
             contentFit="contain"
           />
           <Text style={tw`text-[9px] font-extrabold text-[#64748b] mt-1 tracking-widest`}>BUS INFO</Text>
         </TouchableOpacity>
       </View>
      </View>
    </SafeAreaView>
  );
}
