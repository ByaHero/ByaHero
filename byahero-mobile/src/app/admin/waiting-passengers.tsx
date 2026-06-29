import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Modal, Pressable, Platform } from 'react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';

interface WaitingPassenger {
  id: number;
  user_id: number;
  user_name: string;
  location_name: string;
  created_at: string;
  status: string;
  registered_name: string;
  registered_email: string;
}

const LOCATION_WHITELIST = [
  "All Stop Locations",
  "J. Leviste, Laurel", "Sampaloc, Talisay", "Caloocan, Talisay", "Buco, Talisay",
  "Balas, Talisay", "Ambulong, Tanauan", "Banadero, Tanauan", "Talaga, Tanauan",
  "Sambat, Tanauan", "Tanauan", "Sto. Tomas", "Bugaan West, Laurel", "Laurel",
  "Balakilong, Laurel", "Berinayan, Laurel", "Leynes, Talisay", "Santa Maria, Talisay",
  "Banga, Talisay", "Talisay", "Tumaway, Talisay", "Quiling, Talisay", "Aya, Talisay",
  "Santor, Tanauan", "Bugaan East, Laurel", "Looc, Calamba", "San Isidro"
];

export default function WaitingPassengersPage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [countdown, setCountdown] = useState(30);
  
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchWaitingPassengers = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/waiting-passengers`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (error) {
      console.error('Error fetching waiting passengers:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchWaitingPassengers();
  }, [fetchWaitingPassengers]);

  // Auto-refresh timer
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchWaitingPassengers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchWaitingPassengers]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(30);
    fetchWaitingPassengers();
  };

  const handleCancelLocation = async (location: string) => {
    const doCancel = async () => {
      try {
        const baseUrl = await getServerUrl();
        const response = await fetch(`${baseUrl}/api/admin/waiting-passengers`, {
          method: 'POST',
          headers: { 
            'Accept': 'application/json',
            'Content-Type': 'application/json'
          },
          credentials: 'include',
          body: JSON.stringify({ action: 'cancel_location', location })
        });
        const data = await response.json();
        if (data.success) {
          fetchWaitingPassengers();
        } else {
          Alert.alert('Error', data.error || 'Failed to cancel signals.');
        }
      } catch (error) {
        Alert.alert('Error', 'Network error while cancelling signals.');
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Dismiss all waiting signals for ${location}?`)) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Confirm',
        `Dismiss all waiting signals for ${location}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Dismiss', 
            style: 'destructive',
            onPress: doCancel
          }
        ]
      );
    }
  };

  // Aggregation
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    waitingList.forEach(wp => {
      counts[wp.location_name] = (counts[wp.location_name] || 0) + 1;
    });
    // Sort descending
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [waitingList]);

  // Filtering
  const filteredLocationCounts = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return locationCounts;
    return locationCounts.filter(([loc]) => loc === filterLocation);
  }, [locationCounts, filterLocation]);

  const totalWaiting = waitingList.length;

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      <ScrollView 
        contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 70, paddingBottom: 60, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={tw`text-[#0f3878] text-[17px] font-extrabold tracking-wide mb-5 ml-1 mt-2`}>
          Waiting Passengers
        </Text>

        {loading && !refreshing ? (
          <ActivityIndicator size="large" color="#0f3878" style={tw`mt-10`} />
        ) : (
          <>
            {/* Top Stats Card */}
            <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-100`}>
              <View style={tw`mb-4 pb-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <View>
                  <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1`}>Total Waiting</Text>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-3xl font-extrabold text-slate-900 mr-3`}>{totalWaiting}</Text>
                    <View style={tw`bg-green-100 px-3 py-1 rounded-full flex-row items-center border border-green-200`}>
                      <View style={tw`w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5`} />
                      <Text style={tw`text-green-700 text-[11px] font-bold`}>Active</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View>
                <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2`}>Busiest Locations</Text>
                {locationCounts.length === 0 ? (
                  <Text style={tw`text-slate-400 text-[13px]`}>No passenger waiting signals registered right now.</Text>
                ) : (
                  <View style={tw`flex-row flex-wrap`}>
                    {locationCounts.slice(0, 4).map(([loc, count], idx) => {
                      const shortLoc = loc.split(',')[0];
                      return (
                        <View key={idx} style={tw`bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 mr-2 mb-2 flex-row items-center`}>
                          <Ionicons name="bus" size={14} color="#1d4ed8" style={tw`mr-1.5`} />
                          <Text style={tw`text-slate-800 text-[12px]`}><Text style={tw`font-bold`}>{shortLoc}:</Text> {count} waiting</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Main Interactive Card */}
            <View style={tw`bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100`}>
              {/* Header */}
              <View style={tw`p-4 border-b border-slate-100`}>
                <View style={tw`flex-row items-center mb-3`}>
                  <Ionicons name="people" size={24} color="#1d4ed8" style={tw`mr-2`} />
                  <Text style={tw`text-[18px] font-bold text-[#1d4ed8]`}>Waiting Passengers Directory</Text>
                </View>
                
                <View style={tw`flex-row justify-between items-center`}>
                  <TouchableOpacity 
                    style={tw`border border-slate-200 bg-white rounded-full px-3 py-1.5 flex-row items-center`}
                    onPress={handleManualRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <ActivityIndicator size="small" color="#64748b" style={tw`mr-1`} />
                    ) : (
                      <Ionicons name="refresh" size={14} color="#64748b" style={tw`mr-1`} />
                    )}
                    <Text style={tw`text-slate-600 text-[12px] font-bold`}>Refresh Now</Text>
                  </TouchableOpacity>

                  <View style={tw`bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex-row items-center`}>
                    <Ionicons name="time-outline" size={14} color="#64748b" style={tw`mr-1`} />
                    <Text style={tw`text-slate-600 text-[12px]`}>Auto-refresh: <Text style={tw`font-bold`}>{countdown}s</Text></Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={tw`w-full h-1 bg-slate-100`}>
                <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${((30 - countdown) / 30) * 100}%` }]} />
              </View>

              <View style={tw`p-4`}>
                {/* Filter */}
                <TouchableOpacity 
                  style={tw`border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center bg-slate-50 mb-5`}
                  onPress={() => setFilterModalVisible(true)}
                  activeOpacity={0.7}
                >
                  <Text style={tw`text-slate-800 text-[14px] ${filterLocation !== 'All Stop Locations' ? 'font-bold' : ''}`}>
                    {filterLocation}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>

                {/* List */}
                {waitingList.length === 0 ? (
                  <View style={tw`items-center py-10`}>
                    <Ionicons name="people-outline" size={64} color="#cbd5e1" style={tw`mb-3`} />
                    <Text style={tw`text-[16px] font-bold text-slate-500 mb-1`}>No Waiting Signals Registered</Text>
                    <Text style={tw`text-slate-400 text-center text-[13px] px-4`}>There are currently no passengers active at any of the ByaHero transit stops. Real-time updates will dynamically populate here when they signal.</Text>
                  </View>
                ) : (
                  <>
                    {filteredLocationCounts.map(([locName, count], idx) => (
                      <View key={idx} style={tw`border border-slate-200 rounded-2xl bg-white p-4 mb-4 shadow-sm`}>
                        <View style={tw`flex-row justify-between items-center border-b border-slate-100 pb-3 mb-3`}>
                          <View style={tw`flex-row items-center flex-1 pr-2`}>
                            <Ionicons name="location" size={20} color="#1d4ed8" style={tw`mr-1.5`} />
                            <Text style={tw`font-bold text-[#1d4ed8] text-[15px] uppercase flex-shrink`}>{locName}</Text>
                          </View>
                          <View style={tw`flex-row items-center`}>
                            <View style={tw`w-2 h-2 rounded-full bg-green-500 mr-1.5`} />
                            <Text style={tw`text-slate-500 text-[11px] font-bold`}>Active</Text>
                          </View>
                        </View>
                        
                        <View style={tw`mb-3`}>
                          <Text style={tw`text-[#1d4ed8] font-bold text-[12px] mb-1.5`}>Passengers Waiting</Text>
                          <View style={tw`bg-blue-50 rounded-lg p-3 border border-blue-100`}>
                            <Text style={tw`font-bold text-[20px] text-[#1d4ed8]`}>{count} <Text style={tw`text-[14px] font-medium`}>passenger{count !== 1 ? 's' : ''}</Text></Text>
                          </View>
                        </View>

                        <View style={tw`items-end`}>
                          <TouchableOpacity 
                            style={tw`bg-red-500 rounded-full px-4 py-2 flex-row items-center shadow-sm`}
                            onPress={() => handleCancelLocation(locName)}
                          >
                            <Ionicons name="close-circle" size={16} color="white" style={tw`mr-1.5`} />
                            <Text style={tw`text-white text-[12px] font-bold`}>Dismiss All Signals Here</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {filteredLocationCounts.length === 0 && (
                      <View style={tw`items-center py-8`}>
                        <Ionicons name="search" size={48} color="#cbd5e1" style={tw`mb-2`} />
                        <Text style={tw`font-bold text-slate-500 mb-1`}>No Matching Waiting Passengers</Text>
                        <Text style={tw`text-slate-400 text-[12px]`}>Try adjusting your filters.</Text>
                      </View>
                    )}
                  </>
                )}
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="slide">
        <View style={tw`flex-1 justify-end bg-black/40`}>
          <Pressable style={tw`flex-1`} onPress={() => setFilterModalVisible(false)} />
          <View style={tw`bg-white rounded-t-3xl max-h-[70%] overflow-hidden pb-8`}>
            <View style={tw`p-5 border-b border-slate-100 flex-row justify-between items-center bg-slate-50`}>
              <Text style={tw`text-slate-900 font-extrabold text-[16px]`}>Filter Location</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={tw`p-1`}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <ScrollView style={tw`px-4`} showsVerticalScrollIndicator={true}>
              {LOCATION_WHITELIST.map((loc, idx) => {
                const count = loc === 'All Stop Locations' 
                  ? totalWaiting 
                  : (locationCounts.find(([l]) => l === loc)?.[1] || 0);
                  
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={tw`py-4 border-b border-slate-100 flex-row justify-between items-center ${filterLocation === loc ? 'bg-blue-50/30' : ''}`}
                    onPress={() => {
                      setFilterLocation(loc);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text style={tw`text-[15px] flex-1 ${filterLocation === loc ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>
                      {loc} {count > 0 && loc !== 'All Stop Locations' ? `(${count} waiting)` : ''}
                    </Text>
                    {filterLocation === loc && <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>

    </View>
  );
}
