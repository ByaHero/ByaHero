import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, Modal, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import { WaitingPassenger } from '@/types';

const LOCATION_WHITELIST = [
  "All Stop Locations",
  "J. Leviste, Laurel", "Sampaloc, Talisay", "Caloocan, Talisay", "Buco, Talisay",
  "Balas, Talisay", "Ambulong, Tanauan", "Banadero, Tanauan", "Talaga, Tanauan",
  "Sambat, Tanauan", "Tanauan", "Sto. Tomas", "Bugaan West, Laurel", "Laurel",
  "Balakilong, Laurel", "Berinayan, Laurel", "Leynes, Talisay", "Santa Maria, Talisay",
  "Banga, Talisay", "Talisay", "Tumaway, Talisay", "Quiling, Talisay", "Aya, Talisay",
  "Santor, Tanauan", "Bugaan East, Laurel", "Looc, Calamba", "San Isidro"
];

export default function AdminWaitingPax() {
  const [waitingList, setWaitingList] = useState<WaitingPassenger[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [countdown, setCountdown] = useState(30);
  
  const [filterLocation, setFilterLocation] = useState('All Stop Locations');
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  const fetchPassengers = useCallback(async () => {
    try {
      const data = await adminService.listWaitingPassengers();
      if (data.success) {
        setWaitingList(data.waitingList || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load waiting passengers from the server.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPassengers();
  }, [fetchPassengers]);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          setRefreshing(true);
          fetchPassengers();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [fetchPassengers]);

  const handleManualRefresh = () => {
    setRefreshing(true);
    setCountdown(30);
    fetchPassengers();
  };

  const executeCancel = async (location: string) => {
    try {
      const data = await adminService.manageWaitingPassengers({ action: 'cancel_location', location });
      if (data.success) {
        fetchPassengers();
      } else {
        Alert.alert('Error', data.error || 'Failed to cancel signals.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while cancelling signals.');
    }
  };

  const handleCancelClick = (location: string) => {
    Alert.alert(
      'Dismiss Signals',
      `Are you sure you want to dismiss all waiting signals for ${location}?\nThis will clear the queue.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Yes, dismiss them', style: 'destructive', onPress: () => executeCancel(location) }
      ]
    );
  };

  // Aggregation
  const locationCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    waitingList.forEach(wp => {
      counts[wp.location_name] = (counts[wp.location_name] || 0) + 1;
    });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [waitingList]);

  // Filtering
  const filteredLocationCounts = useMemo(() => {
    if (filterLocation === 'All Stop Locations') return locationCounts;
    return locationCounts.filter(([loc]) => loc === filterLocation);
  }, [locationCounts, filterLocation]);

  const totalWaiting = waitingList.length;

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <View style={tw`p-4 pt-2`}>
        <Text style={tw`text-[#0f3878] text-lg font-extrabold tracking-wide mb-4 ml-1`}>
          Waiting Passengers
        </Text>

        {loading && !refreshing ? (
          <View style={tw`flex-1 mt-10 justify-center items-center`}>
            <ActivityIndicator size="large" color="#0f3878" />
          </View>
        ) : (
          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw`pb-20`}>
            {/* Top Stats Card */}
            <View style={tw`bg-white rounded-3xl p-5 mb-5 shadow-sm border border-slate-100`}>
              <View style={tw`mb-4 pb-4 border-b border-slate-100 flex-row items-center justify-between`}>
                <View>
                  <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1`}>Total Waiting</Text>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-3xl font-extrabold text-slate-900 mr-3`}>{totalWaiting}</Text>
                    <View style={tw`bg-green-100 px-3 py-1 rounded-full flex-row items-center border border-green-200`}>
                      <View style={tw`w-1.5 h-1.5 rounded-full bg-green-600 mr-1.5`} />
                      <Text style={tw`text-green-700 text-[11px] font-bold tracking-wider`}>ACTIVE</Text>
                    </View>
                  </View>
                </View>
              </View>

              <View>
                <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-2`}>Busiest Locations</Text>
                {locationCounts.length === 0 ? (
                  <Text style={tw`text-slate-400 text-[13px]`}>No passenger waiting signals registered right now.</Text>
                ) : (
                  <View style={tw`flex-row flex-wrap gap-2`}>
                    {locationCounts.slice(0, 4).map(([loc, count], idx) => {
                      const shortLoc = loc.split(',')[0];
                      return (
                        <View key={idx} style={tw`bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex-row items-center shadow-sm`}>
                          <Ionicons name="bus-outline" size={14} color="#1d4ed8" style={tw`mr-1.5`} />
                          <Text style={tw`text-slate-800 text-[12px]`}>
                            <Text style={tw`font-bold`}>{shortLoc}:</Text> {count} waiting
                          </Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            </View>

            {/* Main Interactive Card */}
            <View style={tw`bg-white rounded-3xl overflow-hidden shadow-sm border border-slate-100 mb-8`}>
              {/* Header */}
              <View style={tw`p-4 border-b border-slate-100`}>
                <View style={tw`flex-row items-center mb-4`}>
                  <Ionicons name="people-outline" size={24} color="#1d4ed8" style={tw`mr-2`} />
                  <Text style={tw`text-[18px] font-bold text-[#1d4ed8]`}>Waiting Passengers Directory</Text>
                </View>
                
                <View style={tw`flex-row justify-between items-center`}>
                  <TouchableOpacity 
                    style={[tw`border border-slate-200 bg-white rounded-full px-4 py-1.5 flex-row items-center shadow-sm`, refreshing && tw`opacity-70`]}
                    onPress={handleManualRefresh}
                    disabled={refreshing}
                  >
                    <Ionicons name="refresh" size={14} color="#64748b" style={tw`mr-1.5`} />
                    <Text style={tw`text-slate-600 text-[12px] font-bold`}>{refreshing ? 'Syncing...' : 'Refresh Now'}</Text>
                  </TouchableOpacity>

                  <View style={tw`bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex-row items-center shadow-sm`}>
                    <Ionicons name="time-outline" size={14} color="#64748b" style={tw`mr-1.5`} />
                    <Text style={tw`text-slate-600 text-[12px]`}>
                      Auto-refresh: <Text style={tw`font-bold`}>{countdown}s</Text>
                    </Text>
                  </View>
                </View>
              </View>

              {/* Progress bar */}
              <View style={tw`w-full h-1 bg-slate-100 overflow-hidden`}>
                <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${((30 - countdown) / 30) * 100}%` }]} />
              </View>

              <View style={tw`p-5`}>
                {/* Filter */}
                <TouchableOpacity 
                  style={tw`w-full border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center bg-slate-50 mb-6 shadow-sm`}
                  onPress={() => setFilterModalVisible(true)}
                >
                  <Text style={tw`text-[14px] ${filterLocation !== 'All Stop Locations' ? 'font-bold text-[#1d4ed8]' : 'text-slate-800'}`}>
                    {filterLocation}
                  </Text>
                  <Ionicons name="chevron-down" size={18} color="#64748b" />
                </TouchableOpacity>

                {/* List */}
                {waitingList.length === 0 ? (
                  <View style={tw`flex-col items-center py-10`}>
                    <Ionicons name="people" size={64} color="#e2e8f0" style={tw`mb-3`} />
                    <Text style={tw`text-[16px] font-bold text-slate-500 mb-2`}>No Waiting Signals Registered</Text>
                    <Text style={tw`text-slate-400 text-center text-[13px] px-4`}>
                      There are currently no passengers active at any of the ByaHero transit stops. Real-time updates will dynamically populate here when they signal.
                    </Text>
                  </View>
                ) : (
                  <View>
                    {filteredLocationCounts.map(([locName, count], idx) => (
                      <View key={idx} style={tw`border border-slate-200 rounded-2xl bg-white p-5 shadow-sm mb-4`}>
                        <View style={tw`flex-row justify-between items-start border-b border-slate-100 pb-3 mb-4`}>
                          <View style={tw`flex-row items-start flex-1 pr-3`}>
                            <Ionicons name="location" size={18} color="#1d4ed8" style={tw`mr-2 mt-0.5`} />
                            <Text style={tw`font-bold text-[#1d4ed8] text-[15px] uppercase`}>{locName}</Text>
                          </View>
                          <View style={tw`flex-row items-center bg-green-50 px-2.5 py-1 rounded-full border border-green-100`}>
                            <View style={tw`w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5`} />
                            <Text style={tw`text-green-700 text-[10px] font-bold tracking-wider`}>ACTIVE</Text>
                          </View>
                        </View>
                        
                        <View style={tw`mb-5`}>
                          <Text style={tw`text-slate-500 font-bold text-[11px] uppercase tracking-wider mb-2`}>Passengers Waiting</Text>
                          <View style={tw`bg-blue-50 rounded-xl p-4 border border-blue-100 flex-row items-baseline`}>
                            <Text style={tw`font-extrabold text-[28px] text-[#1d4ed8] mr-2`}>{count}</Text>
                            <Text style={tw`text-[#1d4ed8] font-medium`}>passenger{count !== 1 ? 's' : ''}</Text>
                          </View>
                        </View>

                        <View style={tw`flex-row justify-end`}>
                          <TouchableOpacity 
                            style={tw`bg-red-50 rounded-full px-5 py-2.5 flex-row items-center shadow-sm`}
                            onPress={() => handleCancelClick(locName)}
                          >
                            <Ionicons name="close-circle-outline" size={16} color="#dc2626" style={tw`mr-1.5`} />
                            <Text style={tw`text-[12px] font-bold text-red-600`}>Dismiss Signals</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ))}

                    {filteredLocationCounts.length === 0 && (
                      <View style={tw`flex-col items-center py-12 bg-slate-50 rounded-2xl border border-dashed border-slate-300`}>
                        <Ionicons name="search" size={48} color="#cbd5e1" style={tw`mb-3`} />
                        <Text style={tw`font-bold text-slate-500 mb-1`}>No Matching Waiting Passengers</Text>
                        <Text style={tw`text-slate-400 text-[13px]`}>Try adjusting your filters to see active locations.</Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            </View>
          </ScrollView>
        )}
      </View>

      {/* Filter Modal */}
      <Modal visible={filterModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/40 justify-end sm:justify-center`}>
          <View style={tw`bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl w-full max-h-[85%] flex-col`}>
            <View style={tw`p-5 border-b border-slate-100 flex-row justify-between items-center bg-slate-50 rounded-t-3xl`}>
              <Text style={tw`text-slate-900 font-extrabold text-[16px]`}>Filter Location</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)} style={tw`bg-white rounded-full p-1.5 shadow-sm`}>
                <Ionicons name="close" size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={tw`p-2`}>
              {LOCATION_WHITELIST.map((loc, idx) => {
                const count = loc === 'All Stop Locations' 
                  ? totalWaiting 
                  : (locationCounts.find(([l]) => l === loc)?.[1] || 0);
                const isSelected = filterLocation === loc;
                  
                return (
                  <TouchableOpacity 
                    key={idx} 
                    style={tw`w-full px-5 py-4 flex-row justify-between items-center ${isSelected ? 'bg-blue-50' : 'bg-white border-b border-slate-50'}`}
                    onPress={() => {
                      setFilterLocation(loc);
                      setFilterModalVisible(false);
                    }}
                  >
                    <Text style={tw`text-[15px] ${isSelected ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>
                      {loc} {count > 0 && loc !== 'All Stop Locations' && <Text style={tw`text-slate-400 font-normal ml-1`}>({count} waiting)</Text>}
                    </Text>
                    {isSelected && <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
