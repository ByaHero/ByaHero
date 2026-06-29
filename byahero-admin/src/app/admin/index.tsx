import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Image } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

export default function AdminDashboard() {
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pulse, setPulse] = useState(true);

  const [stats, setStats] = useState({
    total_buses: 0,
    active_buses: 0,
    schedules: 0,
    waiting_pax: 0,
    drivers: 0,
    conductors: 0,
    bus_stops: 0,
    lost_and_found: 0,
    reports: 0,
    feedbacks: 0,
    bus_fares: 0,
  });

  const fetchStats = async () => {
    try {
      const data = await adminService.getDashboardStats();
      if (data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard stats', e);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchStats();
    setRefreshing(false);
  };

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
    
    const statsInterval = setInterval(fetchStats, 30000); // refresh every 30s
    return () => clearInterval(statsInterval);
  }, []);

  useEffect(() => {
    // Pulse animation simulation
    const pulseInterval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(pulseInterval);
  }, []);

  const sections = [
    {
      title: 'Fleet & Operations',
      items: [
        { label: 'Total Buses', count: stats.total_buses, route: '/admin/buses', action: 'Manage' },
        { label: 'Active Buses', count: stats.active_buses, route: '/admin/activeBuses', action: 'Manage' },
        { label: 'Schedules', count: stats.schedules, route: '/admin/schedules', action: 'Manage' },
        { label: 'Waiting Pax', count: stats.waiting_pax, route: '/admin/waitingPax', action: 'Manage' },
      ],
    },
    {
      title: 'Personnel & Infrastructure',
      items: [
        { label: 'Drivers', count: stats.drivers, route: '/admin/conductors', action: 'Manage' },
        { label: 'Conductors', count: stats.conductors, route: '/admin/conductors', action: 'Manage' },
        { label: 'Bus Stops', count: stats.bus_stops, route: '/admin/stops', action: 'Manage' },
      ],
    },
    {
      title: 'Passenger Experience',
      items: [
        { label: 'Lost & Found', count: stats.lost_and_found, route: '/admin/lostFound', action: 'Manage' },
        { label: 'Reports', count: stats.reports, route: '/admin/reports', action: 'Manage' },
        { label: 'Feedbacks', count: stats.feedbacks, route: '/admin/feedback', action: 'Manage' },
      ],
    },
    {
      title: 'Revenue & Insights',
      items: [
        { label: 'Bus Fares', count: stats.bus_fares, route: '/admin/fares', action: 'Manage' },
        { label: 'Analytics (Boarded)', count: 0, route: '/admin/analytics', action: 'View' },
      ],
    }
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <AdminNavbar title="DASHBOARD" />
      
      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#4C85C5" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`p-4 pb-10`} 
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4C85C5" />}
        >
          {/* Control Center Header */}
          <View style={tw`mb-4 pb-4 border-b border-gray-200 mt-2 flex-col`}>
            <View style={tw`mb-3`}>
              <Text style={tw`text-2xl font-black text-slate-900 mb-1 tracking-tight`}>Control Center</Text>
              <Text style={tw`text-slate-500 text-sm`}>
                Monitor and manage real-time transport fleet, personnel, and passenger analytics.
              </Text>
            </View>
            <View style={tw`self-start flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200 shadow-sm`}>
              <View style={[tw`w-2 h-2 rounded-full bg-green-500 mr-2`, { opacity: pulse ? 1 : 0.3 }]} />
              <Text style={tw`text-xs text-gray-600 font-semibold`}>
                Live System: <Text style={tw`text-green-600`}>Operational</Text>
              </Text>
            </View>
          </View>

          {/* Sections */}
          {sections.map((sec, sIdx) => (
            <View key={sIdx} style={tw`mb-6`}>
              <View style={tw`mb-4 pl-3 border-l-4 border-[#4C85C5]`}>
                <Text style={tw`text-sm font-bold text-[#0f3878] uppercase tracking-wider`}>
                  {sec.title}
                </Text>
              </View>
              
              <View style={tw`flex-row flex-wrap justify-between`}>
                {sec.items.map((item, iIdx) => (
                  <TouchableOpacity
                    key={iIdx}
                    onPress={() => router.push(item.route as any)}
                    style={tw`w-[48%] bg-[#4C85C5] p-4 rounded-2xl flex-col justify-between min-h-[120px] mb-4 shadow-sm`}
                  >
                    <Text style={tw`text-white text-[15px] font-bold`}>{item.label}</Text>
                    <View style={tw`flex-row justify-between items-end mt-2`}>
                      <Text style={tw`text-[32px] font-bold text-white leading-tight`}>{item.count}</Text>
                      <View style={tw`bg-white/20 px-3 py-1 rounded-full border border-white/20`}>
                        <Text style={tw`text-white text-[11px] font-medium`}>{item.action}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ))}

          {/* Map Tracker UI Placeholder */}
          <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden`}>
            <View style={tw`flex-row justify-between items-center bg-white border-b border-gray-100 p-4`}>
              <View style={tw`flex-row items-center`}>
                <Ionicons name="map-outline" size={18} color="#0f3878" style={tw`mr-2`} />
                <Text style={tw`text-[#0f3878] font-bold text-sm tracking-wide`}>BUS TRACKER</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <View style={[tw`w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5`, { opacity: pulse ? 1 : 0.3 }]} />
                <Text style={tw`text-gray-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
              </View>
            </View>
            <View style={tw`h-64 bg-slate-100 flex-col items-center justify-center`}>
              <Ionicons name="location-outline" size={48} color="#94a3b8" />
              <Text style={tw`text-slate-400 mt-2 font-medium text-sm`}>Interactive Map Loading...</Text>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
