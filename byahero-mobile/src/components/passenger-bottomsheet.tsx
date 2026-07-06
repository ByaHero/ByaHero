import React, { useRef, useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Animated,
  PanResponder,
  Dimensions,
  Clipboard,
  Share,
  Alert,
  Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { handleTourLayout } from './TourRegistry';

interface PassengerBottomSheetProps {
  sheetTab: 'location' | 'routes' | 'groups' | 'busstops';
  setSheetTab: (tab: 'location' | 'routes' | 'groups' | 'busstops') => void;
  filteredBuses: any[];
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  inviteCode: string;
  generateInviteCode: () => void;
  joinCode: string;
  setJoinCode: (code: string) => void;
  handleJoinCircle: () => void;
  circles: any[];
  stopsRoute: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL';
  setStopsRoute: (route: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL') => void;
  filteredStops: any[];
  handleStopPress: (stop: any) => void;
  handleBusPress?: (bus: any) => void;
  userLocation: { lat: number; lng: number } | null;
  baseUrl: string;
  translateY: Animated.Value;
  handleRemoveCircleMember: (friendId: number, name: string) => void;
  activeStep?: number | null;
  menuVisible: boolean;
}

const SCREEN_HEIGHT = Dimensions.get('window').height;
const MAX_UP = 0; // Fully expanded (70% of screen height)
const MED_UP = SCREEN_HEIGHT * 0.3; // Half-expanded (40% of screen height)
const MIN_UP = (SCREEN_HEIGHT * 0.7) - 120; // Collapsed (exactly 120px visible height)

// Haversine formula to compute distance in km
function getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371; // Radius of the earth in km
  const dLat = deg2rad(lat2 - lat1);
  const dLon = deg2rad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat2)) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
}

function deg2rad(deg: number) {
  return deg * (Math.PI / 180);
}

export default function PassengerBottomSheet({
  sheetTab,
  setSheetTab,
  filteredBuses,
  selectedRoute,
  setSelectedRoute,
  inviteCode,
  generateInviteCode,
  joinCode,
  setJoinCode,
  handleJoinCircle,
  circles,
  stopsRoute,
  setStopsRoute,
  filteredStops,
  handleStopPress,
  handleBusPress,
  userLocation,
  baseUrl,
  translateY,
  handleRemoveCircleMember,
  activeStep,
  menuVisible,
}: PassengerBottomSheetProps) {

  const lastTranslatedY = useRef(MED_UP);
  const scrollOffset = useRef(0);
  const [isExpanded, setIsExpanded] = useState(false);
  const [qrModalVisible, setQrModalVisible] = useState(false);

  const tabLocationRef = useRef<any>(null);
  const tabRoutesRef = useRef<any>(null);
  const tabGroupsRef = useRef<any>(null);
  const tabBusstopsRef = useRef<any>(null);

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => false,
      onMoveShouldSetPanResponder: (e, gestureState) => {
        const isVerticalDrag = Math.abs(gestureState.dy) > 5 && Math.abs(gestureState.dy) > Math.abs(gestureState.dx);
        if (!isVerticalDrag) return false;

        // If the touch started in the header area (top 50px of the sheet), we ALWAYS allow dragging
        const sheetTop = (SCREEN_HEIGHT * 0.3) + lastTranslatedY.current;
        if (gestureState.y0 - sheetTop < 50) {
          return true;
        }

        // If the sheet is not fully expanded and user drags UP, drag the sheet instead of scrolling
        if (gestureState.dy < 0 && lastTranslatedY.current > MAX_UP) {
          return true;
        }

        // If dragging down and the scroll view is at the top, we drag the sheet
        if (gestureState.dy > 0 && scrollOffset.current <= 0) {
          return true;
        }

        return false;
      },
      onPanResponderGrant: () => {
        translateY.setOffset(lastTranslatedY.current);
        translateY.setValue(0);
      },
      onPanResponderMove: (e, gestureState) => {
        const clampedDy = Math.max(MAX_UP - lastTranslatedY.current, Math.min(MIN_UP - lastTranslatedY.current, gestureState.dy));
        translateY.setValue(clampedDy);
      },
      onPanResponderRelease: (e, gestureState) => {
        translateY.flattenOffset();
        const finalY = lastTranslatedY.current + gestureState.dy;

        let snapTo = MED_UP;
        const distToMax = Math.abs(finalY - MAX_UP);
        const distToMed = Math.abs(finalY - MED_UP);
        const distToMin = Math.abs(finalY - MIN_UP);

        const minDist = Math.min(distToMax, distToMed, distToMin);
        if (minDist === distToMax) {
          snapTo = MAX_UP;
          setIsExpanded(true);
        } else if (minDist === distToMin) {
          snapTo = MIN_UP;
          setIsExpanded(false);
        } else {
          snapTo = MED_UP;
          setIsExpanded(false);
        }

        lastTranslatedY.current = snapTo;
        Animated.spring(translateY, {
          toValue: snapTo,
          useNativeDriver: true,
          tension: 75,
          friction: 12,
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      {...panResponder.panHandlers}
      style={[
        tw`absolute left-0 right-0 bottom-0 bg-white rounded-t-2xl shadow-2xl z-[1050]`,
        {
          height: SCREEN_HEIGHT * 0.7,
          transform: [{ translateY }],
        }
      ]}
    >
      <View style={tw`flex-1 rounded-t-2xl overflow-hidden`}>
        {/* Drag Handle indicator */}
      <View style={tw`w-full py-3.5 items-center bg-white rounded-t-3xl`}>
        <View style={tw`w-20 h-1.5 bg-[#e2e8f0] rounded-full`} />
      </View>

      {/* Bottom Sheet Header Quick Filter Tabs */}
      <View style={tw`flex-row justify-center px-4 py-3 bg-white`}>
        <TouchableOpacity
          ref={tabLocationRef}
          onLayout={() => handleTourLayout('tab-location', tabLocationRef)}
          onPress={() => setSheetTab('location')}
          style={[
            tw`flex-1 h-[45px] mx-1.5 rounded-[22px] bg-[#dbeafe] justify-center items-center`,
            sheetTab === 'location' && tw`bg-[#1e3a8a]`
          ]}
        >
          <Image
            source={sheetTab === 'location'
              ? require('../../assets/images/icons/busStopWhiteIcon.png')
              : require('../../assets/images/icons/busStopBlueIcon.png')
            }
            style={tw`w-[26px] h-[26px]`}
            contentFit="contain"
          />
        </TouchableOpacity>

        <TouchableOpacity
          ref={tabRoutesRef}
          onLayout={() => handleTourLayout('tab-routes', tabRoutesRef)}
          onPress={() => setSheetTab('routes')}
          style={[
            tw`flex-1 h-[45px] mx-1.5 rounded-[22px] bg-[#dbeafe] justify-center items-center`,
            sheetTab === 'routes' && tw`bg-[#1e3a8a]`
          ]}
        >
          <View style={tw`w-[26px] h-[26px] justify-center items-center`}>
            <Image
              source={require('../../assets/images/icons/routes active.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'routes' ? 1 : 0 }]}
              contentFit="contain"
            />
            <Image
              source={require('../../assets/images/icons/routes idle.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'routes' ? 0 : 1 }]}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          ref={tabGroupsRef}
          onLayout={() => handleTourLayout('tab-groups', tabGroupsRef)}
          onPress={() => setSheetTab('groups')}
          style={[
            tw`flex-1 h-[45px] mx-1.5 rounded-[22px] bg-[#dbeafe] justify-center items-center`,
            sheetTab === 'groups' && tw`bg-[#1e3a8a]`
          ]}
        >
          <View style={tw`w-[26px] h-[26px] justify-center items-center`}>
            <Image
              source={require('../../assets/images/icons/groupsActive.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'groups' ? 1 : 0 }]}
              contentFit="contain"
            />
            <Image
              source={require('../../assets/images/icons/groupsIdle.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'groups' ? 0 : 1 }]}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>

        <TouchableOpacity
          ref={tabBusstopsRef}
          onLayout={() => handleTourLayout('tab-busstops', tabBusstopsRef)}
          onPress={() => setSheetTab('busstops')}
          style={[
            tw`flex-1 h-[45px] mx-1.5 rounded-[22px] bg-[#dbeafe] justify-center items-center`,
            sheetTab === 'busstops' && tw`bg-[#1e3a8a]`
          ]}
        >
          <View style={tw`w-[26px] h-[26px] justify-center items-center`}>
            <Image
              source={require('../../assets/images/icons/busStopMarkerFinalWhite.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'busstops' ? 1 : 0 }]}
              contentFit="contain"
            />
            <Image
              source={require('../../assets/images/icons/busStopMarkerFinalBlue.svg')}
              style={[tw`w-[26px] h-[26px] absolute`, { opacity: sheetTab === 'busstops' ? 0 : 1 }]}
              contentFit="contain"
            />
          </View>
        </TouchableOpacity>
      </View>

      {/* Bottom Sheet Body Content */}
      <ScrollView
        onScroll={(e) => {
          scrollOffset.current = e.nativeEvent.contentOffset.y;
        }}
        scrollEventThrottle={16}
        style={tw`flex-1 px-4`}
        contentContainerStyle={{ paddingBottom: 250 }}
      >
        {sheetTab === 'location' && (
          <View>
            <Text style={tw`text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1`}>BUS LOCATION</Text>
            {filteredBuses.length === 0 ? (
              <View style={tw`items-center justify-center py-8`}>
                <Image
                  source={require('../../assets/images/icons/noBusBig.svg')}
                  style={tw`w-[72px] h-[72px]`}
                  contentFit="contain"
                />
                <Text style={tw`text-sm text-slate-500 font-bold mt-3`}>No Available Bus</Text>
              </View>
            ) : (
              filteredBuses.map((bus, idx) => {
                const status = bus.status || 'available';
                let statusLabel = 'AVAILABLE';
                let statusColor = '#10b981'; // emerald green
                let statusTextColor = '#047857'; // dark green

                if (status === 'on_stop') {
                  statusLabel = 'ON STOP';
                  statusColor = '#f59e0b'; // amber
                  statusTextColor = '#b45309'; // dark amber
                } else if (status === 'full') {
                  statusLabel = 'FULL';
                  statusColor = '#ef4444'; // red
                  statusTextColor = '#7f1d1d'; // dark red
                } else if (status === 'unavailable') {
                  statusLabel = 'UNAVAILABLE';
                  statusColor = '#64748b'; // slate
                  statusTextColor = '#1e293b';
                }

                // Format seats
                const seatAvail = (bus.seat_availability !== null && bus.seat_availability !== undefined) ? Number(bus.seat_availability) : null;
                const totalSeats = (bus.total_seats !== null && bus.total_seats !== undefined) ? Number(bus.total_seats) : 25;
                const seatsText = seatAvail !== null ? `${seatAvail}/${totalSeats} Available` : `${totalSeats} seats`;

                // Calculate a real dynamic ETA based on current coordinates & user coordinates
                const getCalculatedETA = () => {
                  if (bus.eta) return `Arriving by ${bus.eta}`;

                  const busLat = parseFloat(bus.lat);
                  const busLng = parseFloat(bus.lng);
                  if (!busLat || !busLng || !userLocation) {
                    return 'Arriving soon';
                  }

                  // Haversine formula to calculate distance in km
                  const R = 6371; // radius of Earth in km
                  const dLat = (userLocation.lat - busLat) * Math.PI / 180;
                  const dLon = (userLocation.lng - busLng) * Math.PI / 180;
                  const a =
                    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                    Math.cos(busLat * Math.PI / 180) *
                    Math.cos(userLocation.lat * Math.PI / 180) *
                    Math.sin(dLon / 2) *
                    Math.sin(dLon / 2);
                  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
                  const distanceKm = R * c;

                  if (distanceKm < 0.15) {
                    return 'Arriving now';
                  }

                  // Average speed of 30 km/h is 0.5 km per minute.
                  // Include a 2-minute buffer for stops/traffic.
                  const travelTimeMinutes = Math.round((distanceKm / 30) * 60) + 2;

                  const now = new Date();
                  const etaTime = new Date(now.getTime() + travelTimeMinutes * 60000);

                  let hours = etaTime.getHours();
                  const minutes = etaTime.getMinutes();
                  const ampm = hours >= 12 ? 'PM' : 'AM';
                  hours = hours % 12;
                  hours = hours ? hours : 12; // hour '0' should be '12'
                  const minutesStr = minutes < 10 ? '0' + minutes : minutes;

                  return `Arriving by ${hours}:${minutesStr} ${ampm}`;
                };

                const etaText = getCalculatedETA();

                // Progress for the timeline track (default 90% if not set)
                const progress = bus.progress || 90;

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleBusPress?.(bus)}
                    style={tw`border-b border-[#e2e8f0] py-4`}
                    activeOpacity={0.7}
                  >
                    {/* Top Row: Code & Status Badge */}
                    <View style={tw`flex-row justify-between items-center mb-1.5`}>
                      <View style={[tw`px-2.5 py-1 rounded-[6px]`, { backgroundColor: '#103d7c' }]}>
                        <Text style={tw`text-white text-[11px] font-black tracking-widest uppercase`}>
                          {bus.code || bus.plate_number || 'T-00002'}
                        </Text>
                      </View>
                      <View style={[tw`px-3 py-0.5 rounded-full`, { backgroundColor: statusColor }]}>
                        <Text style={[tw`text-[9px] font-black tracking-widest`, { color: '#000000' }]}>
                          {statusLabel}
                        </Text>
                      </View>
                    </View>

                    {/* Middle Row: Location & Availability */}
                    <View style={tw`flex-row justify-between items-start mb-0.5`}>
                      <Text style={tw`text-sm font-semibold text-slate-700 flex-1 mr-2`}>
                        {bus.current_location_name || 'Unknown Location'}
                      </Text>
                      <Text style={tw`text-xs text-slate-400 font-bold`}>
                        {seatsText}
                      </Text>
                    </View>

                    {/* ETA Row */}
                    <Text style={tw`text-xs text-slate-400 mb-4`}>
                      {etaText}
                    </Text>

                    {/* Bottom Row: Timeline Track with Bus Icon */}
                    <View style={tw`h-6 justify-center relative mt-1 mb-2 mx-1`}>
                      {/* Dotted/Dashed Line */}
                      <View
                        style={{
                          height: 1,
                          borderStyle: 'dashed',
                          borderWidth: 1,
                          borderColor: '#cbd5e1',
                          borderRadius: 1,
                          marginRight: 8
                        }}
                      />

                      {/* Floating Bus Icon circle */}
                      <View
                        style={[
                          tw`absolute w-6 h-6 rounded-full bg-white border border-[#103d7c] items-center justify-center shadow-sm`,
                          {
                            left: `${progress}%`,
                            marginLeft: -12,
                            top: 0
                          }
                        ]}
                      >
                        <Image
                          source={require('../../assets/images/icons/marker.svg')}
                          style={tw`w-[80%] h-[80%]`}
                          contentFit="contain"
                        />
                      </View>

                      {/* Floating Destination Location Pin on the far right */}
                      <View
                        style={[
                          tw`absolute w-5 h-5 rounded-full bg-white border border-red-500 items-center justify-center shadow-sm`,
                          {
                            right: 0,
                            marginRight: -4,
                            top: 2
                          }
                        ]}
                      >
                        <MaterialIcons name="place" size={11} color="#ef4444" />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}

        {sheetTab === 'routes' && (
          <View>
            <Text style={tw`text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1`}>FILTER ROUTES</Text>
            <TouchableOpacity
              onPress={() => setSelectedRoute('TANAUAN - LAUREL')}
              style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === 'TANAUAN - LAUREL' && tw`bg-[#103d7c]`]}
            >
              <Text style={[tw`text-sm font-black text-slate-700`, selectedRoute === 'TANAUAN - LAUREL' && tw`text-white`]}>
                Tanauan - Laurel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedRoute('LAUREL - TANAUAN')}
              style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === 'LAUREL - TANAUAN' && tw`bg-[#103d7c]`]}
            >
              <Text style={[tw`text-sm font-black text-slate-700`, selectedRoute === 'LAUREL - TANAUAN' && tw`text-white`]}>
                Laurel - Tanauan
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setSelectedRoute('')}
              style={[tw`bg-[#f1f5f9] py-3 px-4 rounded-full mb-2`, selectedRoute === '' && tw`bg-[#103d7c]`]}
            >
              <Text style={[tw`text-sm font-black text-slate-700`, selectedRoute === '' && tw`text-white`]}>
                All Routes
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {sheetTab === 'groups' && (
          <View>
            <Text style={tw`text-[13px] font-bold text-black uppercase tracking-widest mt-4 mb-3.5 px-1`}>CIRCLES</Text>

            {/* Your Invite Code Container */}
            <View style={tw`bg-[#f8fafc] p-4 rounded-3xl mb-4 border border-[#e2e8f0]/40 shadow-sm`}>
              <View style={tw`flex-row justify-between items-start`}>
                <View>
                  <Text style={tw`text-[15px] font-black text-slate-800`}>Your Invite Code</Text>
                  <Text style={tw`text-xs text-slate-400 font-semibold mt-0.5`}>Invite friends to your circle</Text>
                </View>
                <TouchableOpacity onPress={generateInviteCode} style={tw`p-1`}>
                  <MaterialIcons name="sync" size={24} color="#103d7c" />
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row items-center mt-3.5 mb-3`}>
                <View style={tw`flex-grow bg-white border border-[#e2e8f0] rounded-2xl py-3 px-4 justify-center items-center mr-2.5 shadow-sm`}>
                  <Text style={tw`text-lg font-black text-[#1e3a8a] tracking-widest font-mono`}>{inviteCode}</Text>
                </View>
                <TouchableOpacity
                  onPress={() => {
                    Clipboard.setString(inviteCode);
                    Alert.alert('Copied', 'Invite code copied to clipboard!');
                  }}
                  style={tw`w-14 h-12 bg-[#103d7c] rounded-2xl justify-center items-center shadow-md`}
                >
                  <MaterialIcons name="content-copy" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View style={tw`flex-row gap-2 mt-1.5`}>
                <TouchableOpacity
                  onPress={() => {
                    setQrModalVisible(true);
                  }}
                  style={tw`flex-row flex-1 bg-[#1d72f8] rounded-full py-3 justify-center items-center gap-2 shadow-sm`}
                >
                  <MaterialIcons name="qr-code" size={16} color="white" />
                  <Text style={tw`text-white font-black text-xs`}>QR Code</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await Share.share({
                        message: `Join my ByaHero Circle! Use my invite code: ${inviteCode}`,
                      });
                    } catch (error) {
                      console.error('Error sharing:', error);
                    }
                  }}
                  style={tw`flex-row flex-1 bg-white border border-[#1d72f8] rounded-full py-3 justify-center items-center gap-2`}
                >
                  <MaterialIcons name="share" size={16} color="#1d72f8" />
                  <Text style={tw`text-[#1d72f8] font-black text-xs`}>Share Link</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Join a Circle Container */}
            <View style={tw`bg-[#f8fafc] p-4 rounded-3xl mb-4 border border-[#e2e8f0]/40 shadow-sm`}>
              <View style={tw`flex-row justify-between items-center mb-3`}>
                <Text style={tw`text-[15px] font-black text-slate-800`}>Join a Circle</Text>
                <TouchableOpacity
                  onPress={() => {
                    Alert.alert('Scan QR Code', 'Camera QR code scanner is currently available on native devices.');
                  }}
                  style={tw`flex-row bg-[#1d72f8] rounded-full px-3 py-1.5 justify-center items-center gap-1.5 shadow-sm`}
                >
                  <MaterialIcons name="qr-code-scanner" size={13} color="white" />
                  <Text style={tw`text-white font-black text-[10px]`}>Scan</Text>
                </TouchableOpacity>
              </View>
              <View style={tw`flex-row gap-2 mt-1`}>
                <TextInput
                  value={joinCode}
                  onChangeText={setJoinCode}
                  placeholder="Enter 6-digit code"
                  placeholderTextColor="#9ca3af"
                  maxLength={6}
                  style={tw`flex-grow bg-white border border-[#cbd5e1] rounded-2xl px-4 py-2.5 text-sm text-[#333333] shadow-sm`}
                />
                <TouchableOpacity onPress={handleJoinCircle} style={tw`bg-[#1d72f8] rounded-full justify-center px-6 shadow-sm`}>
                  <Text style={tw`text-white font-black text-sm`}>Join</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Circle Members List Container */}
            {circles.length === 0 ? (
              <View style={tw`bg-[#f8fafc] rounded-3xl p-5 border border-[#e2e8f0]/40 items-center justify-center`}>
                <Text style={tw`text-xs text-slate-400 font-medium italic`}>No circle members yet.</Text>
              </View>
            ) : (
              <View style={tw`bg-[#f8fafc] rounded-3xl p-4 border border-[#e2e8f0]/40 shadow-sm mb-6`}>
                {circles.map((friend, index) => {
                  const initials = (friend.name || friend.email || '?').substring(0, 2).toUpperCase();

                  // Compute live online status from updated_at timestamp
                  let isOnline = false;
                  let relativeSeenText = 'Location unavailable';

                  if (friend.updated_at) {
                    // Ensure the date string is treated as UTC if it doesn't already have a timezone indicator
                    const dateString = friend.updated_at.includes('T') ? friend.updated_at : friend.updated_at.replace(' ', 'T') + 'Z';
                    const date = new Date(dateString);
                    if (!isNaN(date.getTime())) {
                      const diffMs = new Date().getTime() - date.getTime();
                      const diffMin = Math.floor(diffMs / 60000);
                      const diffHrs = Math.floor(diffMin / 60);
                      const diffDays = Math.floor(diffHrs / 24);

                      if (diffMin < 5) {
                        isOnline = true;
                        relativeSeenText = 'Active now';
                      } else if (diffMin < 60) {
                        relativeSeenText = `Last seen ${diffMin}m ago`;
                      } else if (diffHrs < 24) {
                        relativeSeenText = `Last seen ${diffHrs}h ago`;
                      } else {
                        relativeSeenText = `Last seen ${diffDays} days ago`;
                      }
                    }
                  }

                  // Customize location status text if they are online
                  let statusText = relativeSeenText;
                  if (isOnline) {
                    const isWaiting = friend.waiting_status === 'waiting';
                    const isBoarded = friend.ride_status === 'active';
                    if (isWaiting) {
                      statusText = `Waiting at ${friend.waiting_location}`;
                    } else if (isBoarded) {
                      statusText = `Onboard Bus ${friend.boarded_bus_code || ''}`;
                    } else if (friend.latitude && friend.longitude) {
                      statusText = 'Live location available';
                    }
                  }

                  return (
                    <View
                      key={friend.id || friend.email}
                      style={[
                        tw`flex-row items-center py-3.5`,
                        index < circles.length - 1 && tw`border-b border-[#e2e8f0]/50`
                      ]}
                    >
                      {/* Avatar with Status Dot Overlay */}
                      <View style={tw`relative mr-3.5`}>
                        {friend.profile_picture ? (
                          <Image
                            source={{ uri: (friend.profile_picture.startsWith('http') || friend.profile_picture.startsWith('data:')) ? friend.profile_picture : `${baseUrl}/${friend.profile_picture}` }}
                            style={tw`w-12 h-12 rounded-full border border-slate-200`}
                            contentFit="cover"
                          />
                        ) : (
                          <View style={tw`w-12 h-12 rounded-full bg-[#dbeafe] justify-center items-center`}>
                            <Text style={tw`text-[#1e3a8a] font-bold text-sm`}>{initials}</Text>
                          </View>
                        )}
                        <View
                          style={[
                            tw`absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white`,
                            { backgroundColor: isOnline ? '#10b981' : '#94a3b8' }
                          ]}
                        />
                      </View>

                      {/* Details: Name and Status Badge / Info */}
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-[15px] font-black text-slate-800`}>{friend.name || friend.email}</Text>
                        <View style={tw`flex-row items-center mt-1`}>
                          <View style={[
                            tw`px-2 py-0.5 rounded-md`,
                            { backgroundColor: isOnline ? '#dcfce7' : '#f1f5f9' }
                          ]}>
                            <Text style={[
                              tw`text-[9px] font-black tracking-wider`,
                              { color: isOnline ? '#15803d' : '#64748b' }
                            ]}>
                              {isOnline ? 'ONLINE' : 'OFFLINE'}
                            </Text>
                          </View>
                          <Text style={tw`text-[10px] text-[#64748b] font-bold ml-2 flex-1`} numberOfLines={1}>
                            {statusText}
                          </Text>
                        </View>
                      </View>

                      {/* Action: Unlink/Remove circle member button */}
                      <TouchableOpacity
                        onPress={() => handleRemoveCircleMember(friend.id, friend.name || friend.email)}
                        style={tw`p-2`}
                      >
                        <MaterialIcons name="person-remove-alt-1" size={22} color="#103d7c" />
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </View>
        )}

        {sheetTab === 'busstops' && (
          <View>
            <View style={tw`flex-row justify-between items-center mb-2`}>
              <Text style={tw`text-[13px] font-bold text-black uppercase tracking-widest my-3 px-1`}>BUS PICK UP POINTS</Text>
              <TouchableOpacity
                onPress={() => setStopsRoute(stopsRoute === 'LAUREL - TANAUAN' ? 'TANAUAN - LAUREL' : 'LAUREL - TANAUAN')}
                style={tw`flex-row items-center bg-[#f1f5f9] px-3 py-1.5 rounded-full gap-1`}
              >
                <Text style={tw`text-[10px] font-black text-slate-700 uppercase tracking-wider`}>{stopsRoute}</Text>
                <Image
                  source={require('../../assets/images/swap.svg')}
                  style={tw`w-4 h-4`}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            {filteredStops.length === 0 ? (
              <View style={tw`items-center justify-center py-8`}>
                <Image
                  source={require('../../assets/images/icons/busStopMarkerFinalBlue.svg')}
                  style={tw`w-9 h-9`}
                  contentFit="contain"
                />
                <Text style={tw`text-sm text-slate-500 font-bold mt-3`}>No stops defined</Text>
              </View>
            ) : (
              filteredStops.map((stop, idx) => {
                const lat = parseFloat(stop.lat || stop.latitude);
                const lng = parseFloat(stop.lng || stop.longitude);
                let distanceStr = '-- m away';
                if (lat && lng && userLocation) {
                  const dist = getDistance(userLocation.lat, userLocation.lng, lat, lng);
                  if (dist < 1) {
                    distanceStr = `${Math.round(dist * 1000)} m away`;
                  } else {
                    distanceStr = `${dist.toFixed(1)} km away`;
                  }
                }

                const labelType = (stop.type || 'stop').toUpperCase() === 'TERMINAL' ? 'BUS STOP' : 'PICKUP POINT';

                return (
                  <TouchableOpacity
                    key={idx}
                    onPress={() => handleStopPress(stop)}
                    style={tw`bg-white border border-[#f1f5f9] rounded-2xl p-4 mb-3 flex-row justify-between items-start shadow-sm`}
                  >
                    <View style={tw`flex-1 mr-2`}>
                      <Text style={tw`text-[15px] font-black text-slate-800 uppercase`}>{stop.name}</Text>
                      <Text style={tw`text-xs text-slate-400 font-semibold mt-1`}>
                        {stop.location_name || 'No location name'}{stop.location_landmark ? ` • ${stop.location_landmark}` : ''}
                      </Text>
                    </View>
                    <View style={tw`items-end`}>
                      <View style={tw`bg-[#e2e8f0] px-2.5 py-1 rounded-full mb-1.5`}>
                        <Text style={tw`text-[9px] text-black font-black tracking-widest`}>{labelType}</Text>
                      </View>
                      <View style={tw`flex-row items-center`}>
                        <Image
                          source={require('../../assets/images/KM_AWAY.svg')}
                          style={tw`w-3.5 h-3.5 mr-1`}
                          contentFit="contain"
                        />
                        <Text style={tw`text-[11px] text-[#1e3a8a] font-bold`}>{distanceStr}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        )}
      </ScrollView>

      {/* QR Code Viewer Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={qrModalVisible}
        onRequestClose={() => setQrModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[320px] bg-white rounded-3xl p-6 items-center shadow-2xl`}>
            <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1.5`}>SCAN TO JOIN</Text>
            <Text style={tw`text-lg font-black text-slate-800 mb-4`}>Circle Invite Code</Text>

            <Image
              source={{ uri: `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${inviteCode}` }}
              style={tw`w-[200px] h-[200px] border border-slate-200 rounded-2xl p-2 bg-white`}
              contentFit="contain"
            />

            <Text style={tw`text-xl font-black text-[#1e3a8a] tracking-widest font-mono mt-4`}>{inviteCode}</Text>
            <Text style={tw`text-xs text-slate-400 font-semibold text-center mt-2 px-2 leading-relaxed`}>
              Have your friend scan this QR code or enter the code manually to join your circle.
            </Text>

            <TouchableOpacity
              onPress={() => setQrModalVisible(false)}
              style={tw`mt-6 w-full bg-[#103d7c] py-3 rounded-full justify-center items-center shadow-md`}
            >
              <Text style={tw`text-white font-extrabold text-sm`}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      </View>
    </Animated.View>
  );
}
