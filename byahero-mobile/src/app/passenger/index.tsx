import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  NativeModules,
  DeviceEventEmitter,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { WebView } from 'react-native-webview';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../../services/authService';
import { sendFcmPushes } from '../../services/notificationService';
import { PassengerHeader, PassengerFooter } from '../../components/passenger-navbar';
import PassengerBottomSheet from '../../components/passenger-bottomsheet';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import TourOverlay, { tourSteps } from '../../components/TourOverlay';
import { handleTourLayout } from '../../components/TourRegistry';
import { getLeafletHTML } from '../../components/passengerMapHtml';
import routeGeoJSON from '../../../assets/data/laurel-talisay-tanauan.json';
import { resolveBusLocationName } from '../../utils/locationUtils';

// Custom Hooks
import { usePassengerProfile } from '../../hooks/passenger/usePassengerProfile';
import { useTourState } from '../../hooks/passenger/useTourState';
import { usePushNotifications } from '../../hooks/passenger/usePushNotifications';
import { useLocationTracking } from '../../hooks/passenger/useLocationTracking';
import { useTrackingData } from '../../hooks/passenger/useTrackingData';
import { useAutoBoarding } from '../../hooks/passenger/useAutoBoarding';

const { LocationServiceModule } = NativeModules;
const LOCATION_TASK_NAME = 'background-location-task';

export default function PassengerDashboard() {
  const [menuVisible, setMenuVisible] = useState(false);
  const [activeTab, setActiveTab] = useState<'location' | 'sos' | 'info'>('location');
  const [sheetTab, setSheetTab] = useState<'location' | 'routes' | 'groups' | 'busstops'>('location');
  const [isFollowingUser, setIsFollowingUser] = useState(true);

  const { activeStep, setActiveStep } = useTourState(setSheetTab);
  const { userProfilePic, userInitial, getFullProfilePicUrl } = usePassengerProfile();

  usePushNotifications();

  const [isLoading, setIsLoading] = useState(true);
  const [selectedRoute, setSelectedRoute] = useState<string>(''); // empty means All
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  const [inviteCode, setInviteCode] = useState('------');
  const [joinCode, setJoinCode] = useState('');

  // Waiting modal internal states
  const [waitingModalVisible, setWaitingModalVisible] = useState(false);
  const [isUpdatingWaiting, setIsUpdatingWaiting] = useState(false);
  const [waitingFeedback, setWaitingFeedback] = useState<'waiting' | 'cancelled' | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(null);

  const webViewRef = useRef<any>(null);
  const recenterRef = useRef<any>(null);

  const SCREEN_HEIGHT = Dimensions.get('window').height;
  const insets = useSafeAreaInsets();
  const translateY = useRef(new Animated.Value(SCREEN_HEIGHT * 0.3)).current;

  const handleCenterLocationRef = useRef<((lat: number, lng: number) => void) | null>(null);

  const { userLocation } = useLocationTracking({ 
    onCenterLocation: React.useCallback((lat: number, lng: number) => {
      handleCenterLocationRef.current?.(lat, lng);
    }, [])
  });

  const {
    buses, busStops, circles, baseUrl,
    isWaiting, setIsWaiting, waitingLocation, setWaitingLocation,
    waitingExpiresAt, setWaitingExpiresAt,
    isBoarded, setIsBoarded, boardedBus, setBoardedBus, boardedRoute, setBoardedRoute,
    fetchGroupMembers, isInitialFetchDone
  } = useTrackingData(userLocation);

  const postToMap = React.useCallback((message: any) => {
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
  }, [isWaiting]);

  const handleCenterLocation = React.useCallback((lat: number, lng: number) => {
    postToMap({
      type: 'UPDATE_USER_LOCATION',
      lat,
      lng,
      initial: userInitial,
      profilePic: getFullProfilePicUrl(baseUrl),
      center: true
    });
  }, [postToMap, userInitial, getFullProfilePicUrl, baseUrl]);

  React.useEffect(() => {
    handleCenterLocationRef.current = handleCenterLocation;
  }, [handleCenterLocation]);

  const {
    pendingBoardBus,
    pendingDepartBus,
    acceptBoard,
    rejectBoard,
    acceptDepart,
    rejectDepart
  } = useAutoBoarding({
    userLocation,
    buses,
    isBoarded,
    setIsWaiting,
    setWaitingLocation,
    setIsBoarded,
    setBoardedBus,
    setBoardedRoute,
    boardedBus,
    isInitialFetchDone
  });

  const filteredBuses = buses.filter(bus => !selectedRoute || bus.route === selectedRoute);
  const filteredStops = React.useMemo(() => {
    return busStops.filter(stop => stop.route === stopsRoute);
  }, [busStops, stopsRoute]);

  // Sync stops to map whenever filteredStops or sheetTab changes
  useEffect(() => {
    postToMap({
      type: 'UPDATE_STOPS',
      stops: sheetTab === 'busstops' ? filteredStops : []
    });
  }, [filteredStops, sheetTab, postToMap]);

  // Sync filtered buses to map whenever buses or selectedRoute changes
  useEffect(() => {
    postToMap({
      type: 'UPDATE_BUSES',
      buses: filteredBuses
    });
  }, [buses, selectedRoute, postToMap]);

  // Sync user location marker to map whenever location, profile details or waiting status update
  useEffect(() => {
    if (userLocation) {
      postToMap({
        type: 'UPDATE_USER_LOCATION',
        lat: userLocation.lat,
        lng: userLocation.lng,
        initial: userInitial,
        profilePic: getFullProfilePicUrl(baseUrl),
        center: isFollowingUser
      });
    }
  }, [userLocation, userInitial, userProfilePic, isWaiting, postToMap, getFullProfilePicUrl, baseUrl, isFollowingUser]);
  
  // Sync circles to map (only when on Circles tab)
  useEffect(() => {
    postToMap({
      type: 'UPDATE_FRIENDS',
      friends: sheetTab === 'groups' ? circles : [],
      user: userLocation ? {
        lat: userLocation.lat,
        lng: userLocation.lng,
        initial: userInitial,
        profilePic: getFullProfilePicUrl(baseUrl)
      } : null
    });
  }, [circles, userLocation, userInitial, getFullProfilePicUrl, baseUrl, postToMap, sheetTab]);

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



  // Live countdown timer for waiting expiry
  useEffect(() => {
    if (!isWaiting || !waitingExpiresAt) {
      setWaitingSecondsLeft(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(waitingExpiresAt).getTime() - Date.now()) / 1000));
      setWaitingSecondsLeft(diff);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [isWaiting, waitingExpiresAt]);

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
                profilePic: getFullProfilePicUrl(baseUrl),
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
                profilePic: getFullProfilePicUrl(baseUrl)
              } : null
            });
          }
          else if (data.type === 'MAP_DRAGGED') {
            setIsFollowingUser(false);
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
            profilePic: getFullProfilePicUrl(baseUrl),
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
            profilePic: getFullProfilePicUrl(baseUrl)
          } : null
        });
      }
      else if (data.type === 'USER_MARKER_CLICKED') {
        setWaitingModalVisible(true);
      }
      else if (data.type === 'MAP_DRAGGED') {
        setIsFollowingUser(false);
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Helper to resolve recognized location from GeoJSON polygons or proximity to database stops
  const resolveNearestStop = React.useCallback(() => {
    if (!userLocation) return { name: 'Roadside Pickup Point' };

    // 1. Check GeoJSON polygons first (supports Polygon & MultiPolygon)
    const polygonName = resolveBusLocationName(userLocation.lat, userLocation.lng);
    if (polygonName) {
      return { name: polygonName };
    }

    // 2. Proximity check: check nearest bus stop/terminal
    let closestStop: any = null;
    let minDistance = Infinity;

    if (busStops && busStops.length > 0) {
      for (let stop of busStops) {
        const stopLat = parseFloat(stop.lat || stop.latitude);
        const stopLng = parseFloat(stop.lng || stop.longitude);
        if (!isNaN(stopLat) && !isNaN(stopLng)) {
          const R = 6371; // Earth radius in km
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
            closestStop = stop;
          }
        }
      }

      if (closestStop) {
        const stopName = closestStop.name || closestStop.location_name;
        if (minDistance <= 0.15) {
          return { name: stopName };
        }
        if (minDistance <= 5.0) {
          return { name: `Near ${stopName}` };
        }
      }
    }

    // 3. Fallback: Allow waiting anywhere with a roadside pickup label
    const fallbackName = closestStop
      ? `Near ${closestStop.name || closestStop.location_name}`
      : 'Roadside Pickup Point';
    return { name: fallbackName };
  }, [userLocation, busStops]);


  const handleSetWaiting = async (stopName: string, silent: boolean = false) => {
    setIsUpdatingWaiting(true);
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/waiting/set`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email,
          location_name: stopName
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsWaiting(true);
        setWaitingLocation(stopName);
        if (data.expires_at) setWaitingExpiresAt(data.expires_at);
        if (!silent) {
          setWaitingFeedback('waiting');
          setTimeout(() => {
            setWaitingFeedback(null);
            setWaitingModalVisible(false);
          }, 2200);
        } else {
          setWaitingModalVisible(false);
        }
      } else {
        if (!silent) {
          Alert.alert('Error', data.message || 'Failed to update waiting status.');
        }
      }
    } catch (e) {
      if (!silent) {
        Alert.alert('Error', 'Network error. Failed to set waiting status.');
      }
    } finally {
      setIsUpdatingWaiting(false);
    }
  };

  const handleCancelWaiting = async (silent: boolean = false) => {
    setIsUpdatingWaiting(true);
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/waiting/cancel`, {
        method: 'POST',
        credentials: 'include',
        headers: { 
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: email
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsWaiting(false);
        setWaitingLocation('');
        if (!silent) {
          setWaitingFeedback('cancelled');
          setTimeout(() => {
            setWaitingFeedback(null);
            setWaitingModalVisible(false);
          }, 2200);
        } else {
          setWaitingModalVisible(false);
        }
      } else {
        if (!silent) {
          Alert.alert('Error', data.message || 'Failed to cancel waiting status.');
        }
      }
    } catch (e) {
      if (!silent) {
        Alert.alert('Error', 'Network error. Failed to cancel waiting status.');
      }
    } finally {
      setIsUpdatingWaiting(false);
    }
  };

  const centerToMyLocation = () => {
    setIsFollowingUser(true);
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
    setIsFollowingUser(false);
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

  const handleBusPress = (bus: any) => {
    setIsFollowingUser(false);
    const lat = parseFloat(bus.lat || bus.latitude);
    const lng = parseFloat(bus.lng || bus.longitude);
    if (lat && lng) {
      postToMap({
        type: 'FOCUS_BUS',
        bus_id: bus.Bus_ID || bus.bus_id || bus.plate_number,
        plate_number: bus.plate_number
      });
    }
  };

  const handleFriendPress = React.useCallback((friend: any) => {
    setIsFollowingUser(false);
    const lat = parseFloat(friend.latitude);
    const lng = parseFloat(friend.longitude);
    if (!isNaN(lat) && !isNaN(lng)) {
      postToMap({
        type: 'SET_CENTER',
        lat,
        lng,
        zoom: 16
      });
    } else {
      Alert.alert('Location Unavailable', `${friend.name || friend.email}'s location is currently unavailable.`);
    }
  }, [postToMap]);

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
          fetchGroupMembers(baseUrl);
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
            fetchGroupMembers(baseUrl);
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



  // Geolocation-based waiting status automatic cancel when moving away
  useEffect(() => {
    if (!userLocation || isUpdatingWaiting || isBoarded) return;

    if (isWaiting && waitingLocation) {
      let stopLat = NaN;
      let stopLng = NaN;

      // Try to find matching stop coordinates in the database list
      const currentWaitingStop = busStops.find(s => s.name === waitingLocation || s.location_name === waitingLocation);
      if (currentWaitingStop) {
        stopLat = parseFloat(currentWaitingStop.lat || currentWaitingStop.latitude);
        stopLng = parseFloat(currentWaitingStop.lng || currentWaitingStop.longitude);
      } else if (routeGeoJSON && routeGeoJSON.features) {
        // Fallback: find centroid of matching polygon location from GeoJSON
        const feature = routeGeoJSON.features.find(f => {
          const props = f.properties as any;
          return props && (props['Current Location'] === waitingLocation || props['name'] === waitingLocation);
        });
        if (feature && feature.geometry && feature.geometry.type === 'Polygon' && feature.geometry.coordinates[0]) {
          const ring = feature.geometry.coordinates[0];
          let sumLat = 0;
          let sumLng = 0;
          ring.forEach((coord: number[]) => {
            sumLng += coord[0];
            sumLat += coord[1];
          });
          stopLat = sumLat / ring.length;
          stopLng = sumLng / ring.length;
        }
      }

      let shouldCancel = true;
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

        // Only auto-cancel if they walk more than 300 meters away
        if (distance < 0.3) {
          shouldCancel = false;
        }
      }

      if (shouldCancel) {
        handleCancelWaiting(true); // true for silent
      }
    }
  }, [userLocation, isBoarded, isWaiting, waitingLocation, busStops]);

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
                source={{ html: leafletHTML, baseUrl: baseUrl || 'https://byahero.alwaysdata.net/' }}
                onMessage={handleWebViewMessage}
                onConsoleMessage={(e: any) => console.log('WebView Console:', e.nativeEvent.message)}
                style={[tw`flex-1`, { width: '100%', height: '100%' }]}
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
              handleBusPress={handleBusPress}
              handleFriendPress={handleFriendPress}
              userLocation={userLocation}
              baseUrl={baseUrl}
              isBoarded={isBoarded}
              boardedBus={boardedBus}
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
                  bottom: 110 + insets.bottom + 30,
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
          {isBoarded && !menuVisible && (
            <View style={[tw`bg-blue-600 px-4 py-1.5 flex-row items-center justify-center rounded-b-2xl shadow-sm`, { marginTop: -15, paddingTop: 18, zIndex: -1 }]}>
              <Text style={tw`text-white text-[11px] font-black tracking-widest uppercase`}>
                BOARDED: BUS {boardedBus}
              </Text>
            </View>
          )}
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
                onPress={() => {
                  setWaitingFeedback(null);
                  setWaitingModalVisible(false);
                }}
                style={tw`absolute top-4 right-4 p-1 z-10`}
              >
                <MaterialIcons name="close" size={22} color="#94a3b8" />
              </TouchableOpacity>

              {/* ── Feedback state: show after set/cancel ── */}
              {waitingFeedback !== null ? (
                <View style={tw`w-full items-center py-2`}>
                  <View style={tw`w-16 h-16 rounded-full items-center justify-center mb-4 ${waitingFeedback === 'waiting' ? 'bg-emerald-100' : 'bg-slate-100'}`}>
                    <MaterialIcons
                      name={waitingFeedback === 'waiting' ? 'check-circle' : 'remove-circle'}
                      size={40}
                      color={waitingFeedback === 'waiting' ? '#10b981' : '#94a3b8'}
                    />
                  </View>
                  <Text style={[tw`text-base font-black text-slate-800 text-center mb-2`, { fontFamily: 'Inter_900Black' }]}>
                    {waitingFeedback === 'waiting'
                      ? 'You are now registered as a waiting passenger'
                      : 'You are currently not waiting for a bus'}
                  </Text>
                  <Text style={[tw`text-xs text-slate-400 text-center`, { fontFamily: 'Inter_400Regular' }]}>
                    {waitingFeedback === 'waiting'
                      ? 'Conductors can see you are waiting nearby.'
                      : 'Your waiting status has been removed.'}
                  </Text>
                </View>
              ) : (
                <>
                  {/* Waiting Icon */}
                  <Image
                    source={require('../../../assets/images/waitingMark.svg')}
                    style={tw`w-[80px] h-[80px] mb-4`}
                    contentFit="contain"
                  />

                  <Text style={[tw`text-lg font-black text-slate-800 text-center mb-1.5`, { fontFamily: 'Inter_900Black' }]}>
                    Are you waiting for a bus?
                  </Text>

                  {isBoarded ? (
                    <>
                      {/* Status Indicator: Boarded */}
                      <View style={tw`bg-blue-50 border border-blue-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-xs font-black text-blue-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          STATUS: BOARDED
                        </Text>
                        <Text style={[tw`text-[15px] font-black text-[#1e3a8a] text-center mb-1`, { fontFamily: 'Inter_900Black' }]}>
                          Bus {boardedBus}
                        </Text>
                        <Text style={[tw`text-[11px] text-blue-600 font-semibold text-center uppercase tracking-wider`, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                          Route: {boardedRoute}
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
                  ) : isWaiting ? (
                    <>
                      {/* Status Indicator: Waiting */}
                      <View style={tw`bg-emerald-50 border border-emerald-100 rounded-2xl p-4 w-full mb-6 items-center`}>
                        <Text style={[tw`text-xs font-black text-emerald-800 uppercase tracking-widest mb-1`, { fontFamily: 'Inter_700Bold' }]}>
                          STATUS: WAITING
                        </Text>
                        <Text style={[tw`text-[13px] text-emerald-600 font-semibold text-center`, { fontFamily: 'Inter_500Medium' }]} numberOfLines={2}>
                          At {waitingLocation}
                        </Text>
                        {waitingSecondsLeft !== null && (
                          <View style={tw`mt-2 flex-row items-center`}>
                            <Text style={[tw`text-[11px] text-emerald-500`, { fontFamily: 'Inter_500Medium' }]}>
                              {waitingSecondsLeft > 0
                                ? `Expires in ${Math.floor(waitingSecondsLeft / 60)}m ${waitingSecondsLeft % 60}s`
                                : 'Expired — refreshing...'}
                            </Text>
                          </View>
                        )}
                      </View>

                      <TouchableOpacity
                        onPress={() => handleCancelWaiting()}
                        disabled={isUpdatingWaiting}
                        activeOpacity={0.85}
                        style={tw`w-full mb-2 items-center ${isUpdatingWaiting ? 'opacity-60' : ''}`}
                      >
                        <Image
                          source={require('../../../assets/images/stopWaiting.svg')}
                          style={{ width: '100%', height: 62, maxWidth: 276 }}
                          contentFit="contain"
                        />
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
                            onPress={() => handleSetWaiting(resolveNearestStop()?.name || '')}
                            disabled={isUpdatingWaiting}
                            activeOpacity={0.85}
                            style={tw`w-full mb-2 items-center ${isUpdatingWaiting ? 'opacity-60' : ''}`}
                          >
                            <Image
                              source={require('../../../assets/images/waitingButtonPill.svg')}
                              style={{ width: '100%', height: 62, maxWidth: 276 }}
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
                </>
              )}
            </View>
          </View>
        </Modal>

        {/* Boarding Prompt Modal */}
        <Modal
          visible={!!pendingBoardBus}
          transparent={true}
          animationType="fade"
        >
          <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
            <View style={tw`bg-white w-full rounded-3xl p-6 shadow-xl`}>
              <View style={tw`items-center mb-4`}>
                <View style={tw`w-16 h-16 bg-blue-100 rounded-full items-center justify-center mb-4`}>
                  <MaterialIcons name="directions-bus" size={32} color="#1e3a8a" />
                </View>
                <Text style={[tw`text-xl text-center text-slate-800 mb-2`, { fontFamily: 'Inter_900Black' }]}>
                  Boarding Bus?
                </Text>
                <Text style={[tw`text-sm text-center text-slate-500`, { fontFamily: 'Inter_500Medium' }]}>
                  Are you boarding Bus {pendingBoardBus?.code || pendingBoardBus?.plate_number}?
                </Text>
              </View>
              
              <View style={tw`flex-row justify-between gap-3`}>
                <TouchableOpacity
                  onPress={rejectBoard}
                  style={tw`flex-1 bg-slate-100 py-4 rounded-xl items-center`}
                >
                  <Text style={[tw`text-slate-600`, { fontFamily: 'Inter_700Bold' }]}>No</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={acceptBoard}
                  style={tw`flex-1 bg-blue-600 py-4 rounded-xl items-center`}
                >
                  <Text style={[tw`text-white`, { fontFamily: 'Inter_700Bold' }]}>Yes, Board</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Departing Prompt Modal */}
        <Modal
          visible={!!pendingDepartBus}
          transparent={true}
          animationType="fade"
        >
          <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
            <View style={tw`bg-white w-full rounded-3xl p-6 shadow-xl`}>
              <View style={tw`items-center mb-4`}>
                <View style={tw`w-16 h-16 bg-red-100 rounded-full items-center justify-center mb-4`}>
                  <MaterialIcons name="directions-run" size={32} color="#ef4444" />
                </View>
                <Text style={[tw`text-xl text-center text-slate-800 mb-2`, { fontFamily: 'Inter_900Black' }]}>
                  Bus Moving Away
                </Text>
                <Text style={[tw`text-sm text-center text-slate-500`, { fontFamily: 'Inter_500Medium' }]}>
                  Did you depart from the bus? (Auto-departs in 10 minutes)
                </Text>
              </View>
              
              <View style={tw`flex-row justify-between gap-3`}>
                <TouchableOpacity
                  onPress={rejectDepart}
                  style={tw`flex-1 bg-slate-100 py-4 rounded-xl items-center`}
                >
                  <Text style={[tw`text-slate-600`, { fontFamily: 'Inter_700Bold' }]}>No, I'm still here</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={acceptDepart}
                  style={tw`flex-1 bg-red-500 py-4 rounded-xl items-center`}
                >
                  <Text style={[tw`text-white`, { fontFamily: 'Inter_700Bold' }]}>Yes, Departed</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </SafeAreaView>
  );
}
