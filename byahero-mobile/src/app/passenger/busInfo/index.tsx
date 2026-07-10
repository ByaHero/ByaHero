import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { sendFcmPushes } from '../../../services/notificationService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function BusInfoScreen() {
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');
  const [schedules, setSchedules] = useState<any[]>([]);
  const [fareStops, setFareStops] = useState<any[]>([]);
  const [fareRules, setFareRules] = useState<any[]>([]);
  
  const [pickupStop, setPickupStop] = useState<any>(null);
  const [dropoffStop, setDropoffStop] = useState<any>(null);
  const [discountType, setDiscountType] = useState<'regular' | 'discounted'>('regular');
  const [calculatedFare, setCalculatedFare] = useState<string>('0.00');
  const [fareError, setFareError] = useState<string>('');

  const [showPickupDropdown, setShowPickupDropdown] = useState(false);
  const [showDropoffDropdown, setShowDropoffDropdown] = useState(false);
  const [showDiscountDropdown, setShowDiscountDropdown] = useState(false);

  const [pickupLayout, setPickupLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [dropoffLayout, setDropoffLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);
  const [discountLayout, setDiscountLayout] = useState<{ x: number, y: number, width: number, height: number } | null>(null);

  useEffect(() => {
    let active = true;

    const fetchSyncData = async () => {
      try {
        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);

        let responseData: any = null;
        try {
          const syncRes = await fetch(`${currentBaseUrl}/api/buses/sync`);
          if (syncRes.ok) {
            const data = await syncRes.json();
            if (data && data.success) {
              responseData = data;
            }
          }
        } catch (e: any) {
          if (e.message !== 'Network request failed') {
            console.warn(`Failed to fetch sync data from configured server URL: ${currentBaseUrl}`, e);
          }
        }

        // Fallback to alwaysdata if configured URL failed or was offline
        if (!responseData && currentBaseUrl !== 'https://byahero.alwaysdata.net') {
          try {
            const fallbackRes = await fetch(`https://byahero.alwaysdata.net/api/buses/sync`);
            if (fallbackRes.ok) {
              const data = await fallbackRes.json();
              if (data && data.success) {
                responseData = data;
              }
            }
          } catch (e) {
            console.error('Fallback to alwaysdata failed:', e);
          }
        }

        if (responseData && active) {
          setSchedules(responseData.bus_schedule || []);
          setFareStops(responseData.bus_stops || []);
          setFareRules(responseData.bus_fares || []);
        }
      } catch (err: any) {
        if (err.message !== 'Network request failed') {
          console.error('Error fetching sync data:', err);
        }
      }
    };

    fetchSyncData();
    const interval = setInterval(fetchSyncData, 15000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

  const calculateFare = (pickup: any, dropoff: any, discount: 'regular' | 'discounted') => {
    setFareError('');
    if (!pickup || !dropoff) {
      setCalculatedFare('0.00');
      return;
    }
    if (pickup.stop_id === dropoff.stop_id) {
      setFareError('Pick-up and drop-off cannot be the same');
      setCalculatedFare('0.00');
      return;
    }

    let regularFare: number | null = null;
    let discountedFare: number | null = null;

    const pId = parseInt(pickup.stop_id, 10);
    const dId = parseInt(dropoff.stop_id, 10);

    // Check direct fares first with consistent integer comparisons
    const match = fareRules.find(f => {
      const originId = parseInt(f.origin_stop_id, 10);
      const destId = parseInt(f.destination_stop_id, 10);
      return (originId === pId && destId === dId) || (originId === dId && destId === pId);
    });

    if (match) {
      regularFare = parseFloat(match.regular_fare);
      discountedFare = parseFloat(match.discounted_fare);
    } else {
      // Calculate distance based on km markers
      const distance = Math.abs(parseFloat(pickup.km_marker || 0) - parseFloat(dropoff.km_marker || 0));

      if (distance <= 4) {
        regularFare = 14.00;
        discountedFare = 11.25;
      } else {
        regularFare = 14.00 + ((distance - 1) * 2.25);
        discountedFare = regularFare * 0.80;

        regularFare = Math.round(regularFare * 4) / 4;
        discountedFare = Math.round(discountedFare * 4) / 4;
      }
    }

    const fare = (discount === 'discounted') ? discountedFare : regularFare;
    setCalculatedFare(fare.toFixed(2));
  };

  const handleTriggerSOS = () => {
    Alert.alert(
      'Emergency Center',
      'Trigger Panic Alert? This will broadcast your SOS alert to emergency contacts.',
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
                  lat: null,
                  lng: null
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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', height: '100%', width: '100%' }}>
      <PassengerHeader onTriggerSOS={handleTriggerSOS} pageTitle="Bus Information" />

      <View style={{ flex: 1, height: '100%' }}>
        {/* Main Content Area */}
        <ScrollView
          nestedScrollEnabled={true}
          keyboardShouldPersistTaps="handled"
          style={{ flex: 1, backgroundColor: '#ffffff' }}
          contentContainerStyle={{ padding: 20, paddingBottom: 60 }}
        >
          {/* Schedules Section */}
          <Text style={tw`text-[15px] font-bold text-[#103d7c] mt-6 mb-4 text-center`}>Bus Operation Schedule</Text>
          {schedules.length === 0 ? (
            <View style={tw`bg-white rounded-xl p-4 mb-5 border border-[#e2e8f0] items-center`}>
              <Text style={tw`text-xs text-[#64748b] italic`}>No schedules available.</Text>
            </View>
          ) : (
            schedules.map((row, idx) => {
              const formatTime = (timeStr: string) => {
                if (!timeStr) return '';
                const [h, m] = timeStr.split(':');
                const hr = parseInt(h, 10);
                const ampm = hr >= 12 ? 'PM' : 'AM';
                const displayHr = hr % 12 || 12;
                return `${displayHr}:${m} ${ampm}`;
              };
              const open = formatTime(row.time_open);
              const close = formatTime(row.time_close);
              const timeText = (open && close) ? `${open} - ${close}` : 'Schedule not set';
              const isSusp = parseInt(row.is_suspended) === 1;

              return (
                <View key={idx} style={tw`bg-white p-4 rounded-xl mb-3 border border-[#e2e8f0] flex-row justify-between items-center`}>
                  <View style={tw`flex-1 mr-2`}>
                    <Text style={tw`text-sm font-extrabold text-[#103d7c]`}>{row.terminal_name}</Text>
                    {isSusp ? (
                      <Text style={tw`text-xs text-red-500 font-bold mt-1`}>SUSPENDED{row.suspend_message ? `: ${row.suspend_message}` : ''}</Text>
                    ) : null}
                  </View>
                  <Text style={[tw`text-xs font-black`, isSusp ? tw`text-red-500` : tw`text-[#475569]`]}>
                    {isSusp ? 'No Operations' : timeText}
                  </Text>
                </View>
              );
            })
          )}

          {/* Fare Check Section */}
          <Text style={tw`text-[15px] font-bold text-[#103d7c] mt-6 mb-3 text-center`}>Bus Fare Check</Text>
          
          <View style={[tw`flex-row justify-between mb-4 px-2`, { zIndex: 9999, elevation: 9999 }]}>
            {/* Pick Up Stop Picker */}
            <View style={[tw`flex-1 mr-2 relative`, { zIndex: 100, elevation: 100 }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowPickupDropdown(!showPickupDropdown);
                  setShowDropoffDropdown(false);
                  setShowDiscountDropdown(false);
                }}
                style={[tw`bg-white border rounded-xl p-3 flex-row justify-between items-center`, showPickupDropdown ? tw`border-blue-300 bg-blue-50` : tw`border-[#cbd5e1]`]}
              >
                <Text style={[tw`text-sm`, pickupStop ? tw`text-[#1e293b] font-semibold` : tw`text-[#64748b]`]} numberOfLines={1}>
                  {pickupStop ? pickupStop.location_name : 'Pick up'}
                </Text>
                <Text style={tw`text-[#64748b] text-xs font-bold`}>▼</Text>
              </TouchableOpacity>

              {showPickupDropdown && (
                <ScrollView
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  style={[tw`mt-1.5 bg-white border border-[#cbd5e1] rounded-xl shadow-inner`, { maxHeight: 150, zIndex: 1000, elevation: 1000 }]}
                  contentContainerStyle={tw`p-1`}
                >
                  {fareStops.map((stop) => (
                    <TouchableOpacity
                      key={stop.stop_id}
                      onPress={() => {
                        setPickupStop(stop);
                        setShowPickupDropdown(false);
                        calculateFare(stop, dropoffStop, discountType);
                      }}
                      style={tw`py-2.5 px-3 border-b border-[#f1f5f9]`}
                    >
                      <Text style={tw`text-xs text-[#334155] font-semibold`}>{stop.location_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>

            {/* Drop Off Stop Picker */}
            <View style={[tw`flex-1 ml-2 relative`, { zIndex: 90, elevation: 90 }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowDropoffDropdown(!showDropoffDropdown);
                  setShowPickupDropdown(false);
                  setShowDiscountDropdown(false);
                }}
                style={[tw`bg-white border rounded-xl p-3 flex-row justify-between items-center`, showDropoffDropdown ? tw`border-blue-300 bg-blue-50` : tw`border-[#cbd5e1]`]}
              >
                <Text style={[tw`text-sm`, dropoffStop ? tw`text-[#1e293b] font-semibold` : tw`text-[#64748b]`]} numberOfLines={1}>
                  {dropoffStop ? dropoffStop.location_name : 'Drop off'}
                </Text>
                <Text style={tw`text-[#64748b] text-xs font-bold`}>▼</Text>
              </TouchableOpacity>

              {showDropoffDropdown && (
                <ScrollView
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  style={[tw`mt-1.5 bg-white border border-[#cbd5e1] rounded-xl shadow-inner`, { maxHeight: 150, zIndex: 1000, elevation: 1000 }]}
                  contentContainerStyle={tw`p-1`}
                >
                  {fareStops.map((stop) => (
                    <TouchableOpacity
                      key={stop.stop_id}
                      onPress={() => {
                        setDropoffStop(stop);
                        setShowDropoffDropdown(false);
                        calculateFare(pickupStop, stop, discountType);
                      }}
                      style={tw`py-2.5 px-3 border-b border-[#f1f5f9]`}
                    >
                      <Text style={tw`text-xs text-[#334155] font-semibold`}>{stop.location_name}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          </View>

          {/* Passenger Class Row */}
          <View style={[tw`mt-3 items-center`, { zIndex: 80, elevation: 80 }]}>
            <View style={[tw`w-1/2 relative`, { zIndex: 80, elevation: 80 }]}>
              <TouchableOpacity
                onPress={() => {
                  setShowDiscountDropdown(!showDiscountDropdown);
                  setShowPickupDropdown(false);
                  setShowDropoffDropdown(false);
                }}
                style={tw`bg-white border border-[#cbd5e1] rounded-xl p-3 flex-row justify-between items-center`}
              >
                <Text style={tw`text-sm text-[#1e293b] font-semibold`} numberOfLines={1}>
                  {discountType === 'regular' ? 'Regular' : 'S/E/D'}
                </Text>
                <Text style={tw`text-[#64748b] text-xs font-bold ml-2`}>▼</Text>
              </TouchableOpacity>

              {showDiscountDropdown && (
                <ScrollView
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="handled"
                  style={[tw`mt-1.5 bg-white border border-[#cbd5e1] rounded-xl shadow-inner`, { maxHeight: 110, zIndex: 1000, elevation: 1000 }]}
                  contentContainerStyle={tw`p-1`}
                >
                  <TouchableOpacity
                    onPress={() => {
                      setDiscountType('regular');
                      setShowDiscountDropdown(false);
                      calculateFare(pickupStop, dropoffStop, 'regular');
                    }}
                    style={tw`py-2.5 px-3 border-b border-[#f1f5f9]`}
                  >
                    <Text style={tw`text-sm text-[#334155] font-semibold`}>Regular</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setDiscountType('discounted');
                      setShowDiscountDropdown(false);
                      calculateFare(pickupStop, dropoffStop, 'discounted');
                    }}
                    style={tw`py-2.5 px-3`}
                  >
                    <Text style={tw`text-sm text-[#334155] font-semibold`}>S/E/D</Text>
                  </TouchableOpacity>
                </ScrollView>
              )}
            </View>
          </View>

          {/* Calculated Fare Row */}
          <View style={tw`items-center justify-center mt-8 mb-4`}>
            <Text style={tw`text-xs font-bold text-[#64748b] mb-1`}>CALCULATED FARE</Text>
            <View style={tw`flex-row items-baseline`}>
              <Text style={tw`text-xl font-bold text-[#103d7c] mr-1`}>Php</Text>
              <Text style={tw`text-6xl font-black text-[#103d7c]`}>{calculatedFare}</Text>
            </View>
          </View>

          {fareError ? (
            <Text style={tw`text-xs font-bold text-red-500 text-center my-4`}>{fareError}</Text>
          ) : null}
        </ScrollView>

        <PassengerFooter activeTab="info" onTriggerSOS={handleTriggerSOS} />
      </View>
    </SafeAreaView>
  );
}
