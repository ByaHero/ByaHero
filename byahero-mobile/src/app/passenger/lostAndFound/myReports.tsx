import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function MyReportsScreen() {
  const [reports, setReports] = useState<any[]>([]);
  const [pendingQueue, setPendingQueue] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const email = await AsyncStorage.getItem('byahero_cached_email');
      const loggedIn = !!email;
      setIsLoggedIn(loggedIn);

      const pendingStored = await AsyncStorage.getItem('byahero_pending_lost_found') || '[]';
      const parsedPending = JSON.parse(pendingStored);
      setPendingQueue(parsedPending);

      let serverReports: any[] = [];
      const serverUrl = await getServerUrl();

      if (loggedIn) {
        try {
          const res = await fetch(`${serverUrl}/api/lost-and-found/my-reports`, {
            credentials: 'include'
          });
          const data = await res.json();
          if (data && data.reports) {
            serverReports = data.reports;
            await AsyncStorage.setItem('byahero_cached_my_reports', JSON.stringify(serverReports));
          }
        } catch (err) {
          console.warn('Error loading from server:', err);
          const cached = await AsyncStorage.getItem('byahero_cached_my_reports') || '[]';
          serverReports = JSON.parse(cached);
        }
      } else {
        const cached = await AsyncStorage.getItem('byahero_cached_my_reports') || '[]';
        serverReports = JSON.parse(cached);
      }

      setReports(serverReports);
    } catch (e) {
      console.warn('Failed to load reports:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResolveReport = async (ticketId: number, itemType: string) => {
    Alert.alert(
      'Resolve Case',
      'Do you want to permanently mark this case as successfully closed?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: async () => {
            setIsLoading(true);
            try {
              const serverUrl = await getServerUrl();
              const res = await fetch(`${serverUrl}/api/lost-and-found/my-reports`, {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                  'Accept': 'application/json',
                },
                body: JSON.stringify({
                  action: 'resolve',
                  ticket_id: ticketId,
                }),
                credentials: 'include',
              });
              
              const data = await res.json();
              setIsLoading(false);
              
              if (data && data.success) {
                Alert.alert('Success', data.message || 'Report marked as resolved!');
                loadReports();
              } else {
                Alert.alert('Error', data.error || 'Action failed.');
              }
            } catch (err) {
              setIsLoading(false);
              Alert.alert('Error', 'Failed to communicate with the server.');
            }
          }
        }
      ]
    );
  };

  const formatDisplayDate = (dateStr: string) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const options: any = { month: 'short', day: 'numeric', year: 'numeric' };
    return d.toLocaleDateString('en-US', options);
  };

  const getStatusStyle = (status: string) => {
    const s = status.toLowerCase();
    if (s === 'resolved') return { bg: tw`bg-green-50`, border: tw`border-green-100`, text: tw`text-green-700` };
    if (s === 'closed') return { bg: tw`bg-red-50`, border: tw`border-red-100`, text: tw`text-red-700` };
    if (s === 'open') return { bg: tw`bg-yellow-50`, border: tw`border-yellow-100`, text: tw`text-amber-700` };
    return { bg: tw`bg-slate-100`, border: tw`border-slate-200`, text: tw`text-slate-500` };
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="My Reports" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {isLoading ? (
            <View style={tw`py-20`}>
              <ActivityIndicator size="large" color="#1e3a8a" />
            </View>
          ) : pendingQueue.length === 0 && reports.length === 0 ? (
            <View style={tw`items-center py-20`}>
              <MaterialIcons name="description" size={64} color="#cbd5e1" />
              <Text style={tw`text-sm font-bold text-slate-400 mt-4`}>No active reports found.</Text>
            </View>
          ) : (
            <View style={tw`gap-4`}>
              {/* Render Pending Offline Items */}
              {pendingQueue.map((item, idx) => {
                const statusStyle = getStatusStyle('pending');
                return (
                  <View 
                    key={`pending-${idx}`}
                    style={[tw`bg-white rounded-3xl p-5 border shadow-sm`, statusStyle.border]}
                  >
                    <View style={tw`flex-row justify-between items-center pb-2 border-b border-slate-100 mb-3`}>
                      <View style={tw`flex-row items-center`}>
                        <MaterialIcons 
                          name={item.type === 'lost' ? 'search' : 'inventory'} 
                          size={18} 
                          color={item.type === 'lost' ? '#ef4444' : '#10b981'} 
                          style={tw`mr-1.5`}
                        />
                        <Text style={tw`text-xs font-black text-slate-800 uppercase`}>
                          {item.type} ITEM (PENDING SYNC)
                        </Text>
                      </View>
                      <View style={[tw`px-2.5 py-0.5 rounded-full`, statusStyle.bg]}>
                        <Text style={[tw`text-[10px] font-bold`, statusStyle.text]}>PENDING</Text>
                      </View>
                    </View>

                    <Text style={tw`text-sm font-semibold text-slate-700 leading-relaxed mb-3`}>
                      {item.description}
                    </Text>

                    <View style={tw`flex-row items-center`}>
                      <MaterialIcons name="calendar-month" size={14} color="#94a3b8" style={tw`mr-1`} />
                      <Text style={tw`text-xs text-slate-400 font-semibold mr-3`}>
                        {formatDisplayDate(new Date(item.timestamp).toISOString())}
                      </Text>
                      {item.bus_number !== '' && (
                        <Text style={tw`text-xs text-slate-400 font-semibold`}>
                          • Bus {item.bus_number}
                        </Text>
                      )}
                    </View>
                  </View>
                );
              })}

              {/* Render Server Reports */}
              {reports.map((item, idx) => {
                const statusStyle = getStatusStyle(item.status || 'open');
                const isLost = (item.type || 'lost').toLowerCase() === 'lost';
                return (
                  <View 
                    key={`server-${idx}`}
                    style={[tw`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm`, statusStyle.border]}
                  >
                    <View style={tw`flex-row justify-between items-center pb-2 border-b border-slate-100 mb-3`}>
                      <View style={tw`flex-row items-center`}>
                        <MaterialIcons 
                          name={isLost ? 'search' : 'inventory'} 
                          size={18} 
                          color={isLost ? '#ef4444' : '#10b981'} 
                          style={tw`mr-1.5`}
                        />
                        <Text style={tw`text-xs font-black text-slate-800 uppercase`}>
                          {item.type || 'LOST'} ITEM
                        </Text>
                      </View>
                      <View style={[tw`px-2.5 py-0.5 rounded-full`, statusStyle.bg]}>
                        <Text style={[tw`text-[10px] font-bold`, statusStyle.text]}>
                          {item.status ? item.status.toUpperCase() : 'OPEN'}
                        </Text>
                      </View>
                    </View>

                    <Text style={tw`text-sm font-semibold text-slate-700 leading-relaxed mb-3`}>
                      {item.item_description}
                    </Text>

                    <View style={tw`flex-row items-center`}>
                      <MaterialIcons name="calendar-month" size={14} color="#94a3b8" style={tw`mr-1`} />
                      <Text style={tw`text-xs text-slate-400 font-semibold mr-3`}>
                        {formatDisplayDate(item.created_at)}
                      </Text>
                      {item.bus_number !== '' && (
                        <Text style={tw`text-xs text-slate-400 font-semibold`}>
                          • Bus {item.bus_number}
                        </Text>
                      )}
                    </View>

                    {(item.status || 'open').toLowerCase() === 'open' && (
                      <TouchableOpacity 
                        onPress={() => handleResolveReport(item.id, item.type || 'lost')}
                        style={tw`flex-row justify-center items-center mt-4 bg-[#1e3a8a] py-2 px-4 rounded-xl shadow-sm align-self-end`}
                      >
                        <MaterialIcons name="check-circle" size={14} color="#ffffff" style={tw`mr-1`} />
                        <Text style={tw`text-xs font-bold text-white`}>
                          Mark as {isLost ? 'Found' : 'Returned'}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                );
              })}
            </View>
          )}
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
