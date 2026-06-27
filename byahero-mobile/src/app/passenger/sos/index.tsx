import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  Dimensions,
  Animated,
  PanResponder,
  Linking,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import * as Location from 'expo-location';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../../../services/authService';
import { sendFcmPushes } from '../../../services/notificationService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Preseeded Static Emergency Contacts
const EMERGENCY_CONTACTS = [
  { name: "Laurel Police Station", phone: "0998-598-5678", type: "Police" },
  { name: "Laurel Fire Station", phone: "0917-534-2244", type: "Fire" },
  { name: "Laurel Municipal Health Office", phone: "0920-911-3829", type: "Medical" },
  { name: "Talisay Police Station", phone: "0998-598-5679", type: "Police" },
  { name: "Talisay Fire Station", phone: "0917-534-2245", type: "Fire" },
  { name: "Talisay Disaster Operations (MDRRMO)", phone: "0939-911-2384", type: "Disaster" },
  { name: "Tanauan Police Station", phone: "0998-598-5680", type: "Police" },
  { name: "Tanauan Fire Station", phone: "0917-534-2246", type: "Fire" },
  { name: "Tanauan Red Cross", phone: "0920-911-3831", type: "Medical" },
  { name: "National Emergency Hotline", phone: "911", type: "General" }
];

export default function SOSScreen() {
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');
  const [locationText, setLocationText] = useState('Locating...');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [friends, setFriends] = useState<any[]>([]);
  const [loadingFriends, setLoadingFriends] = useState(true);
  const [isOffline, setIsOffline] = useState(false);

  // Countdown States
  const [showCountdown, setShowCountdown] = useState(false);
  const [timeLeft, setTimeLeft] = useState(5);
  const countdownIntervalRef = useRef<any>(null);
  const [countdownStatus, setCountdownStatus] = useState('After 5 seconds, your SOS alert and location will be sent.');

  // Pan responder for Slide to Cancel
  const sliderWidth = SCREEN_WIDTH * 0.9 - 16; // 90% of screen minus padding
  const handleWidth = 64;
  const maxSlide = sliderWidth - handleWidth - 8;
  const pan = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    async function init() {
      try {
        const url = await getServerUrl();
        setBaseUrl(url);

        // Fetch location
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          });
          const lat = loc.coords.latitude;
          const lng = loc.coords.longitude;
          setCoords({ lat, lng });

          try {
            const geocode = await Location.reverseGeocodeAsync({ latitude: lat, longitude: lng });
            if (geocode && geocode.length > 0) {
              const address = geocode[0];
              const parts = [address.street, address.district, address.city, address.region].filter(Boolean);
              setLocationText(parts.join(', ') || `${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            } else {
              setLocationText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
            }
          } catch (e) {
            setLocationText(`${lat.toFixed(4)}, ${lng.toFixed(4)}`);
          }
        } else {
          setLocationText('Location permission denied.');
        }

        // Fetch group/friends count
        try {
          const res = await fetch(`${url}/api/group/view`, { credentials: 'include' });
          if (res.ok) {
            const groupData = await res.json();
            if (groupData.success && Array.isArray(groupData.friends)) {
              setFriends(groupData.friends);
            }
          }
        } catch (e) {
          console.warn('Failed to load friend circle details:', e);
        } finally {
          setLoadingFriends(false);
        }
      } catch (err) {
        console.error('SOS initialization error:', err);
      }
    }
    init();
  }, []);

  const handleCall = (phone: string) => {
    Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Error', 'Unable to initiate call.');
    });
  };

  const triggerSOSAlert = async () => {
    setShowCountdown(false);
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    try {
      const email = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
      const res = await fetch(`${baseUrl}/api/sos/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          recipients: [],
          location_text: locationText,
          lat: coords ? coords.lat : null,
          lng: coords ? coords.lng : null
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
  };

  const startSOSCountdown = () => {
    setShowCountdown(true);
    setTimeLeft(5);
    setCountdownStatus('After 5 seconds, your SOS alert and location will be sent.');
    pan.setValue(0);

    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);

    let counter = 5;
    countdownIntervalRef.current = setInterval(() => {
      counter--;
      setTimeLeft(counter);
      if (counter <= 0) {
        if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
        triggerSOSAlert();
      }
    }, 1000);
  };

  const cancelSOSAlert = () => {
    if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    setCountdownStatus('SOS Alert Cancelled.');
    setTimeLeft(5);
    setTimeout(() => {
      setShowCountdown(false);
    }, 800);
  };

  // Pan Responder gesture handling for Slide to Cancel
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderMove: Animated.event([null, { dx: pan }], { useNativeDriver: false }),
      onPanResponderRelease: (e, gestureState) => {
        if (gestureState.dx >= maxSlide - 15) {
          // Slide completed -> cancel SOS
          Animated.timing(pan, {
            toValue: maxSlide,
            duration: 100,
            useNativeDriver: false,
          }).start(() => {
            cancelSOSAlert();
          });
        } else {
          // Slide incomplete -> spring back
          Animated.spring(pan, {
            toValue: 0,
            useNativeDriver: false,
          }).start();
        }
      },
    })
  ).current;

  // Pulse animation for SOS button rings
  const pulseAnim1 = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity1 = useRef(new Animated.Value(0.8)).current;
  const pulseAnim2 = useRef(new Animated.Value(0.8)).current;
  const pulseOpacity2 = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    const pulse1 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim1, {
          toValue: 2.0,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity1, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    const pulse2 = Animated.loop(
      Animated.parallel([
        Animated.timing(pulseAnim2, {
          toValue: 2.0,
          duration: 2500,
          useNativeDriver: true,
        }),
        Animated.timing(pulseOpacity2, {
          toValue: 0,
          duration: 2500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse1.start();
    // delay pulse2
    const timer = setTimeout(() => {
      pulse2.start();
    }, 800);

    return () => {
      pulse1.stop();
      pulse2.stop();
      clearTimeout(timer);
    };
  }, []);

  const renderContactIcon = (type: string) => {
    switch (type) {
      case 'Fire':
        return 'local-fire-department';
      case 'Medical':
        return 'local-hospital';
      case 'Disaster':
        return 'tsunami';
      case 'Police':
        return 'local-police';
      default:
        return 'phone';
    }
  };

  const getContactColorClass = (type: string) => {
    switch (type) {
      case 'Fire':
        return 'bg-red-50 border-red-200';
      case 'Medical':
        return 'bg-green-50 border-green-200';
      case 'Disaster':
        return 'bg-amber-50 border-amber-200';
      case 'Police':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', height: '100%', width: '100%' }}>
      <PassengerHeader onTriggerSOS={startSOSCountdown} pageTitle="Emergency Center" />

      <View style={{ flex: 1, height: '100%' }}>
        <ScrollView style={{ flex: 1, backgroundColor: '#ffffff' }} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
          
          {/* Location status bar */}
          <View style={tw`bg-[#f8fafc] rounded-2xl p-4 mb-6 border border-[#e2e8f0] flex-row items-center gap-4`}>
            <View style={tw`bg-[#103d7c]/10 w-10 h-10 rounded-full justify-center items-center`}>
              <Image source={require('../../../../assets/images/icons/my_location.svg')} style={tw`w-5 h-5`} contentFit="contain" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-[10px] font-extrabold text-[#64748b] tracking-wider`}>YOUR CURRENT LOCATION</Text>
              <Text style={tw`text-sm font-bold text-[#1e293b] mt-0.5`} numberOfLines={1}>{locationText}</Text>
            </View>
          </View>

          {/* SOS Pulsing Main Button */}
          <View style={tw`items-center justify-center py-6 relative`}>
            <View style={tw`w-[220px] h-[220px] items-center justify-center`}>
              <Animated.View
                style={[
                  tw`absolute w-[200px] h-[200px] rounded-full border-2 border-red-500`,
                  {
                    transform: [{ scale: pulseAnim1 }],
                    opacity: pulseOpacity1,
                  },
                ]}
              />
              <Animated.View
                style={[
                  tw`absolute w-[200px] h-[200px] rounded-full border-2 border-red-500`,
                  {
                    transform: [{ scale: pulseAnim2 }],
                    opacity: pulseOpacity2,
                  },
                ]}
              />

              <TouchableOpacity
                onPress={startSOSCountdown}
                activeOpacity={0.9}
                style={[
                  tw`w-[200px] h-[200px] rounded-full items-center justify-center border-4 border-white shadow-2xl`,
                  {
                    backgroundColor: '#ef4444',
                    elevation: 10,
                  },
                ]}
              >
                <Text style={tw`text-white text-5xl font-black tracking-widest`}>SOS</Text>
                <Text style={tw`text-white text-[11px] font-extrabold mt-1 tracking-wider`}>ALERT CIRCLE</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Friend Circle Info Section */}
          <View style={tw`items-center mt-2 mb-6`}>
            {loadingFriends ? (
              <Text style={tw`text-xs text-[#64748b] italic`}>Checking circle contacts...</Text>
            ) : friends.length > 0 ? (
              <Text style={tw`text-xs text-[#64748b] font-bold`}>
                Your SOS will be sent to {friends.length} people in your circle.
              </Text>
            ) : (
              <Text style={tw`text-xs text-[#64748b] italic`}>No friends in your circle yet.</Text>
            )}
            <Text style={tw`text-[10px] text-[#94a3b8] text-center mt-2 px-6`}>
              Alerts will broadcast your live coordinates immediately to your circle members.
            </Text>
          </View>

          {/* Emergency Municipal Hotlines */}
          <Text style={tw`text-[13px] font-extrabold text-black tracking-wider mb-3`}>MUNICIPAL EMERGENCY HOTLINES</Text>

          <View style={tw`gap-2.5`}>
            {EMERGENCY_CONTACTS.map((contact, idx) => (
              <TouchableOpacity
                key={idx}
                onPress={() => handleCall(contact.phone)}
                style={tw`border rounded-2xl p-4 flex-row justify-between items-center bg-white shadow-sm`}
              >
                <View style={tw`flex-row items-center gap-3.5 flex-1`}>
                  <View style={tw`w-10 h-10 rounded-full bg-slate-100 justify-center items-center`}>
                    <MaterialIcons name={renderContactIcon(contact.type) as any} size={20} color="#103d7c" />
                  </View>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-sm font-extrabold text-[#1e293b]`}>{contact.name}</Text>
                    <Text style={tw`text-xs text-[#64748b] font-semibold mt-0.5`}>{contact.phone}</Text>
                  </View>
                </View>
                <View style={tw`bg-[#103d7c]/10 w-9 h-9 rounded-full justify-center items-center`}>
                  <MaterialIcons name="phone" size={16} color="#103d7c" />
                </View>
              </TouchableOpacity>
            ))}
          </View>

        </ScrollView>

        <PassengerFooter activeTab="sos" />
      </View>

      {/* Countdown Overlay */}
      {showCountdown && (
        <View style={[tw`absolute inset-0 bg-white items-center justify-center z-[5000] px-6`, { width: SCREEN_WIDTH, height: SCREEN_HEIGHT }]}>
          <Text style={tw`text-red-500 font-extrabold text-2xl mb-1`}>Slide to cancel</Text>
          <Text style={tw`text-xs text-[#64748b] text-center mb-10 px-8`}>{countdownStatus}</Text>

          {/* Circle Timer */}
          <View style={tw`w-[170px] h-[170px] bg-red-500 rounded-full justify-center items-center shadow-2xl mb-12`}>
            <Text style={tw`text-white text-6xl font-black`}>{timeLeft > 0 ? timeLeft : '✓'}</Text>
          </View>

          {/* Slider Cancel Track */}
          <View style={[tw`bg-slate-100 border border-[#e2e8f0] relative justify-center`, { width: sliderWidth, height: 76, borderRadius: 38 }]}>
            <Text style={tw`absolute w-full text-center text-red-500 font-extrabold text-xs pl-8`}>
              Slide right to cancel SOS
            </Text>

            <Animated.View
              {...panResponder.panHandlers}
              style={[
                tw`absolute bg-red-600 justify-center items-center shadow-lg`,
                {
                  width: handleWidth,
                  height: 64,
                  borderRadius: 32,
                  left: pan.interpolate({
                    inputRange: [0, maxSlide],
                    outputRange: [6, maxSlide],
                    extrapolate: 'clamp',
                  }),
                },
              ]}
            >
              <Text style={tw`text-white text-2xl font-bold`}>➔</Text>
            </Animated.View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}
