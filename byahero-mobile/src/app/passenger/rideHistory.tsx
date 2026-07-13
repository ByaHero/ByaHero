import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../components/passenger-navbar';
import TourOverlay, { tourSteps } from '../../components/TourOverlay';
import { handleTourLayout } from '../../components/TourRegistry';

export default function RideHistoryScreen() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const firstItemRef = useRef<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === '/passenger/rideHistory') {
            setActiveStep(stepIdx);
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

  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [totalRides, setTotalRides] = useState(0);
  const [totalDurationText, setTotalDurationText] = useState('0m');
  const [favRoute, setFavRoute] = useState('N/A');

  useEffect(() => {
    async function loadHistory() {
      try {
        const serverUrl = await getServerUrl();
        const res = await fetch(`${serverUrl}/api/buses/history`, {
          credentials: 'include'
        });
        const data = await res.json();
        setIsLoading(false);

        if (data.success && data.history) {
          setHistory(data.history);
          await AsyncStorage.setItem('byahero_cached_ride_history', JSON.stringify(data.history));
          processStats(data.history);
        } else {
          loadOfflineData();
        }
      } catch (err) {
        console.warn('Network error loading ride history:', err);
        setIsLoading(false);
        loadOfflineData();
      }
    }
    loadHistory();
  }, []);

  const loadOfflineData = async () => {
    try {
      const cached = await AsyncStorage.getItem('byahero_cached_ride_history');
      if (cached) {
        const parsed = JSON.parse(cached);
        setHistory(parsed);
        processStats(parsed);
      }
    } catch (e) {
      console.warn('Failed to load cached ride history:', e);
    }
  };

  const parseDateInUTC = (dateStr: string | null) => {
    if (!dateStr) return new Date();
    let normalized = dateStr;
    if (!dateStr.includes('T') && !dateStr.includes('Z') && !dateStr.includes('+')) {
      normalized = dateStr.replace(' ', 'T') + 'Z';
    }
    return new Date(normalized);
  };

  const processStats = (rideList: any[]) => {
    setTotalRides(rideList.length);
    let totalMins = 0;
    const routes: Record<string, number> = {};

    rideList.forEach((r) => {
      if (r.departed_at && r.boarded_at) {
        totalMins += Math.floor((parseDateInUTC(r.departed_at).getTime() - parseDateInUTC(r.boarded_at).getTime()) / 60000);
      }
      if (r.route) {
        routes[r.route] = (routes[r.route] || 0) + 1;
      }
    });

    const durationText = totalMins > 60 
      ? `${Math.floor(totalMins / 60)}h ${totalMins % 60}m` 
      : `${totalMins}m`;
    
    setTotalDurationText(durationText);

    const sortedRoutes = Object.entries(routes).sort((a, b) => b[1] - a[1]);
    setFavRoute(sortedRoutes[0]?.[0] || 'N/A');
  };

  const formatDuration = (start: string, end: string | null) => {
    if (!end) return 'Ongoing';
    const diff = parseDateInUTC(end).getTime() - parseDateInUTC(start).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return `${hrs}h ${remainingMins}m`;
  };

  const getGroupLabel = (date: string) => {
    const now = new Date();
    const manilaNowStr = now.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const manilaNow = new Date(manilaNowStr);
    manilaNow.setHours(0,0,0,0);

    const rideDate = parseDateInUTC(date);
    const manilaRideStr = rideDate.toLocaleString('en-US', { timeZone: 'Asia/Manila' });
    const manilaRideDate = new Date(manilaRideStr);
    const rideDateDay = new Date(manilaRideDate);
    rideDateDay.setHours(0,0,0,0);

    const diffDays = Math.floor((manilaNow.getTime() - rideDateDay.getTime()) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return 'This Week';
    
    return manilaRideDate.toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  };

  const getDisplayTime = (dateStr: string | null) => {
    if (!dateStr) return 'Ongoing';
    return parseDateInUTC(dateStr).toLocaleTimeString('en-US', {
      timeZone: 'Asia/Manila',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Ride History" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          
          {/* Journey Stats Header */}
          {history.length > 0 && (
            <View style={tw`bg-[#1e3a8a] rounded-3xl p-5 shadow-md mb-5`}>
              <Text style={tw`text-[10px] font-bold text-blue-200 uppercase tracking-wider mb-1`}>Journey Stats</Text>
              <Text style={tw`text-2xl font-black text-white mb-4`}>{totalRides} Rides</Text>
              
              <View style={tw`flex-row border-t border-blue-800/80 pt-3`}>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-semibold text-blue-200 uppercase mb-0.5`}>Total Duration</Text>
                  <Text style={tw`text-base font-bold text-white`}>{totalDurationText}</Text>
                </View>
                <View style={tw`flex-1`}>
                  <Text style={tw`text-[10px] font-semibold text-blue-200 uppercase mb-0.5`}>Fav Route</Text>
                  <Text style={tw`text-base font-bold text-white`} numberOfLines={1}>{favRoute}</Text>
                </View>
              </View>
            </View>
          )}

          {isLoading ? (
            <View style={tw`py-20`}>
              <ActivityIndicator size="large" color="#1e3a8a" />
            </View>
          ) : history.length === 0 ? (
            <View style={tw`items-center py-16 px-4`}>
              <View style={tw`w-24 h-24 bg-white rounded-full justify-center items-center mb-5 shadow-sm border border-slate-100`}>
                <MaterialIcons name="commute" size={48} color="#1e3a8a" />
              </View>
              <Text style={tw`text-lg font-black text-slate-800 mb-2`}>No Rides Yet</Text>
              <Text style={tw`text-xs text-slate-400 font-semibold text-center leading-relaxed mb-6`}>
                Your journey starts here! Take your first ride and see your history grow.
              </Text>
              <TouchableOpacity 
                onPress={() => router.replace('/passenger')}
                style={tw`bg-[#1e3a8a] px-8 py-3 rounded-full shadow-md`}
              >
                <Text style={tw`text-sm font-bold text-white`}>Start a Trip</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              {(() => {
                let currentGroup = '';
                return history.map((ride, idx) => {
                  const group = getGroupLabel(ride.boarded_at);
                  const isNewGroup = group !== currentGroup;
                  if (isNewGroup) {
                    currentGroup = group;
                  }
                  const isActive = ride.status === 'active';

                  return (
                    <View key={idx}>
                      {isNewGroup && (
                        <View style={tw`flex-row items-center my-3 px-1`}>
                          <Text style={tw`text-[11px] font-bold text-slate-400 uppercase tracking-wider mr-2`}>
                            {group}
                          </Text>
                          <View style={tw`flex-1 h-[1px] bg-slate-200`} />
                        </View>
                      )}

                      <View 
                        ref={idx === 0 ? firstItemRef : undefined}
                        onLayout={idx === 0 ? () => handleTourLayout('history-list', firstItemRef) : undefined}
                        style={[
                          tw`bg-white rounded-3xl p-5 border shadow-sm mb-3.5`,
                          isActive ? tw`border-blue-500 bg-blue-50/20` : tw`border-slate-100`
                        ]}
                      >
                        <View style={tw`flex-row justify-between items-center mb-3`}>
                          <View style={tw`bg-blue-50 border border-blue-100 rounded-full px-2.5 py-0.5`}>
                            <Text style={tw`text-[10px] font-bold text-[#1e3a8a]`}>Bus {ride.bus_code}</Text>
                          </View>
                          <View style={[
                            tw`px-2.5 py-0.5 rounded-full`,
                            isActive ? tw`bg-green-100` : tw`bg-slate-100`
                          ]}>
                            <Text style={[
                              tw`text-[9px] font-extrabold uppercase`,
                              isActive ? tw`text-green-700` : tw`text-slate-500`
                            ]}>
                              {isActive ? 'On Ride' : 'Completed'}
                            </Text>
                          </View>
                        </View>

                        <Text style={tw`text-base font-black text-slate-800 mb-4`}>
                          {ride.route || 'Express Route'}
                        </Text>

                        {/* Custom Route Timeline styling */}
                        <View style={tw`pl-6 relative`}>
                          {/* Dotted path line */}
                          <View style={[tw`absolute left-[7px] top-2 bottom-2 w-[1px] border-l border-dashed border-slate-300`]} />

                          {/* Boarded Dot & Info */}
                          <View style={tw`relative mb-4`}>
                            <View style={[tw`absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full bg-blue-500 border border-white`]} />
                            <View style={tw`flex-row justify-between items-center`}>
                              <Text style={tw`text-xs font-bold text-slate-800`}>Boarded</Text>
                              <Text style={tw`text-xs text-slate-400 font-semibold`}>{getDisplayTime(ride.boarded_at)}</Text>
                            </View>
                          </View>

                          {/* Duration Badge */}
                          <View style={tw`flex-row items-center bg-slate-50 border border-slate-200/50 rounded-xl px-2.5 py-1.5 self-start mb-4`}>
                            <MaterialIcons name="schedule" size={14} color="#64748b" style={tw`mr-1`} />
                            <Text style={tw`text-[10px] font-bold text-slate-500`}>
                              {formatDuration(ride.boarded_at, ride.departed_at)}
                            </Text>
                          </View>

                          {/* Departed Dot & Info */}
                          <View style={tw`relative`}>
                            <View style={[tw`absolute -left-[24px] top-1 w-2.5 h-2.5 rounded-full bg-slate-400 border border-white`]} />
                            <View style={tw`flex-row justify-between items-center`}>
                              <Text style={tw`text-xs font-bold text-slate-800`}>Departed</Text>
                              <Text style={tw`text-xs text-slate-400 font-semibold`}>{getDisplayTime(ride.departed_at)}</Text>
                            </View>
                          </View>
                        </View>

                        {/* Report Issue Action Button */}
                        <View style={tw`border-t border-slate-100 mt-4 pt-3 flex-row justify-end`}>
                          <TouchableOpacity 
                            onPress={() => router.push(`/passenger/report?bus_number=${ride.bus_code}` as any)}
                            style={tw`flex-row items-center`}
                          >
                            <MaterialIcons name="report" size={16} color="#ef4444" style={tw`mr-1`} />
                            <Text style={tw`text-xs font-bold text-[#ef4444]`}>Report Issue</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  );
                });
              })()}
            </View>
          )}

        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />

      {activeStep !== null && (
        <TourOverlay 
          currentStep={activeStep} 
          onStepChange={setActiveStep} 
          onClose={() => setActiveStep(null)} 
        />
      )}
    </SafeAreaView>
  );
}
