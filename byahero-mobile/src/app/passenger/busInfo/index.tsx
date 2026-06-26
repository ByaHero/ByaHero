import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Platform,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';

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

  useEffect(() => {
    let active = true;

    const fetchSyncData = async () => {
      try {
        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);

        const syncRes = await fetch(`${currentBaseUrl}/public/api.php?action=get_sync_data`);
        if (syncRes.ok && active) {
          const syncData = await syncRes.json();
          if (syncData && syncData.success) {
            setSchedules(syncData.bus_schedule || []);
            setFareStops(syncData.bus_stops || []);
            setFareRules(syncData.bus_fares || []);
          }
        }
      } catch (err) {
        console.error('Error fetching sync data:', err);
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

    // Check direct fares first
    const match = fareRules.find(f => 
      (parseInt(f.origin_stop_id, 10) === pickup.stop_id && parseInt(f.destination_stop_id, 10) === dropoff.stop_id) ||
      (parseInt(f.origin_stop_id, 10) === dropoff.stop_id && parseInt(f.destination_stop_id, 10) === pickup.stop_id)
    );

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
              const res = await fetch(`${baseUrl}/backend/sendSosAlert.php`, {
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

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Top Header Bar */}
      <View style={tw`h-14 bg-[#103d7c] flex-row items-center justify-between px-4 rounded-b-2xl shadow-sm`}>
        <View style={tw`w-15`}>
          <Image
            source={require('../../../../assets/images/topBarLogo.svg')}
            style={tw`w-8 h-8`}
            contentFit="contain"
          />
        </View>
        
        <View style={tw`absolute left-1/2 -translate-x-1/2`}>
          <Image
            source={require('../../../../assets/images/ByaHero.svg')}
            style={tw`w-[100px] h-[30px]`}
            contentFit="contain"
          />
        </View>

        <View style={tw`flex-row items-center gap-3`}>
          <TouchableOpacity style={tw`p-1`}>
            <Image
              source={require('../../../../assets/images/notification bell.svg')}
              style={tw`w-[22px] h-[22px]`}
              contentFit="contain"
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.replace('/')} style={tw`p-1`}>
            <Image
              source={require('../../../../assets/images/HAMBURGER.svg')}
              style={tw`w-[18px] h-[18px]`}
              contentFit="contain"
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Content Area */}
      <ScrollView style={tw`flex-1 bg-white`} contentContainerStyle={{ padding: 20, paddingBottom: 60 }}>
        <Text style={tw`text-2xl font-bold text-[#103d7c] mt-2 text-center`}>Bus Information</Text>
        <Text style={tw`text-xs text-[#64748b] text-center mt-1 mb-6`}>Check schedules, terminal locations, and calculate fares.</Text>

        {/* Schedules Section */}
        <Text style={tw`text-[13px] font-extrabold text-black tracking-wider mb-3`}>BUS OPERATION SCHEDULE</Text>
        {schedules.length === 0 ? (
          <View style={tw`bg-[#f8fafc] rounded-2xl p-4 mb-5 border border-[#e2e8f0] items-center`}>
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
              <View key={idx} style={tw`bg-[#f8fafc] p-4 rounded-2xl mb-3 border border-[#e2e8f0] flex-row justify-between items-center shadow-sm`}>
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
        <Text style={tw`text-[13px] font-extrabold text-black tracking-wider mt-4 mb-3`}>BUS FARE CHECK</Text>
        
        <View style={tw`bg-[#f8fafc] p-4 rounded-2xl border border-[#e2e8f0] mb-5`}>
          {/* Pick Up Stop Picker */}
          <Text style={tw`text-xs font-bold text-[#64748b] mb-1.5`}>Pick Up Location</Text>
          <TouchableOpacity
            onPress={() => {
              setShowPickupDropdown(!showPickupDropdown);
              setShowDropoffDropdown(false);
              setShowDiscountDropdown(false);
            }}
            style={tw`bg-white border border-[#cbd5e1] rounded-xl p-3 flex-row justify-between items-center mb-3`}
          >
            <Text style={[tw`text-sm`, pickupStop ? tw`text-[#1e293b] font-semibold` : tw`text-[#9ca3af]`]}>
              {pickupStop ? `${pickupStop.location_name}` : 'Select pick up stop'}
            </Text>
            <Text style={tw`text-[#64748b] font-bold`}>▼</Text>
          </TouchableOpacity>

          {showPickupDropdown && (
            <View style={tw`bg-white border border-[#e2e8f0] rounded-xl p-2 mb-3 max-h-40 overflow-hidden`}>
              <ScrollView nestedScrollEnabled={true}>
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
            </View>
          )}

          {/* Drop Off Stop Picker */}
          <Text style={tw`text-xs font-bold text-[#64748b] mb-1.5`}>Drop Off Location</Text>
          <TouchableOpacity
            onPress={() => {
              setShowDropoffDropdown(!showDropoffDropdown);
              setShowPickupDropdown(false);
              setShowDiscountDropdown(false);
            }}
            style={tw`bg-white border border-[#cbd5e1] rounded-xl p-3 flex-row justify-between items-center mb-3`}
          >
            <Text style={[tw`text-sm`, dropoffStop ? tw`text-[#1e293b] font-semibold` : tw`text-[#9ca3af]`]}>
              {dropoffStop ? `${dropoffStop.location_name}` : 'Select drop off stop'}
            </Text>
            <Text style={tw`text-[#64748b] font-bold`}>▼</Text>
          </TouchableOpacity>

          {showDropoffDropdown && (
            <View style={tw`bg-white border border-[#e2e8f0] rounded-xl p-2 mb-3 max-h-40 overflow-hidden`}>
              <ScrollView nestedScrollEnabled={true}>
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
            </View>
          )}

          {/* Discount Selector */}
          <Text style={tw`text-xs font-bold text-[#64748b] mb-1.5`}>Passenger Class</Text>
          <TouchableOpacity
            onPress={() => {
              setShowDiscountDropdown(!showDiscountDropdown);
              setShowPickupDropdown(false);
              setShowDropoffDropdown(false);
            }}
            style={tw`bg-white border border-[#cbd5e1] rounded-xl p-3 flex-row justify-between items-center mb-3`}
          >
            <Text style={tw`text-sm text-[#1e293b] font-semibold`}>
              {discountType === 'regular' ? 'Regular Passenger' : 'Discounted (Student/Senior/PWD)'}
            </Text>
            <Text style={tw`text-[#64748b] font-bold`}>▼</Text>
          </TouchableOpacity>

          {showDiscountDropdown && (
            <View style={tw`bg-white border border-[#e2e8f0] rounded-xl p-1 mb-3`}>
              <TouchableOpacity
                onPress={() => {
                  setDiscountType('regular');
                  setShowDiscountDropdown(false);
                  calculateFare(pickupStop, dropoffStop, 'regular');
                }}
                style={tw`py-2.5 px-3 border-b border-[#f1f5f9]`}
              >
                <Text style={tw`text-xs text-[#334155] font-semibold`}>Regular Passenger</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => {
                  setDiscountType('discounted');
                  setShowDiscountDropdown(false);
                  calculateFare(pickupStop, dropoffStop, 'discounted');
                }}
                style={tw`py-2.5 px-3`}
                  >
                <Text style={tw`text-xs text-[#334155] font-semibold`}>Discounted (Student/Senior/PWD)</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error / Result Display */}
          {fareError ? (
            <Text style={tw`text-xs font-bold text-red-500 text-center my-2`}>{fareError}</Text>
          ) : null}

          <View style={tw`items-center mt-3 pt-3 border-t border-[#e2e8f0]`}>
            <Text style={tw`text-xs font-bold text-[#64748b]`}>CALCULATED FARE</Text>
            <View style={tw`flex-row items-baseline mt-1`}>
              <Text style={tw`text-lg font-bold text-[#103d7c] mr-1`}>Php</Text>
              <Text style={tw`text-3xl font-extrabold text-[#103d7c]`}>{calculatedFare}</Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Premium Bottom Navigation Bar */}
      <View style={tw`h-[75px] border-t border-[#e2e8f0] flex-row items-center bg-white relative`}>
        <TouchableOpacity
          onPress={() => router.replace('/passenger')}
          style={tw`flex-grow items-center justify-center h-full`}
        >
          <Image
            source={require('../../../../assets/images/icons/locationIdle.svg')}
            style={tw`w-6 h-6`}
            contentFit="contain"
          />
          <Text style={tw`text-[9px] font-extrabold text-[#64748b] mt-1 tracking-widest`}>LOCATION</Text>
        </TouchableOpacity>

        {/* Central Rising SOS Button */}
        <View style={tw`w-[100px] items-center justify-center h-full relative`}>
          <TouchableOpacity 
            style={tw`w-[100px] h-[76px] rounded-t-[50px] bg-[#2563eb] absolute bottom-0 justify-start items-center pt-3.5 shadow-lg`} 
            onPress={handleTriggerSOS}
          >
            <Image
              source={require('../../../../assets/images/icons/SOS.svg')}
              style={tw`w-8 h-8`}
              contentFit="contain"
            />
            <Text style={tw`text-white text-[10px] font-extrabold mt-0.5 tracking-wider`}>SOS</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={tw`flex-grow items-center justify-center h-full`}
        >
          <Image
            source={require('../../../../assets/images/icons/busActive.svg')}
            style={tw`w-6 h-6`}
            contentFit="contain"
          />
          <Text style={tw`text-[9px] font-extrabold text-[#1856b0] mt-1 tracking-widest`}>BUS INFO</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
