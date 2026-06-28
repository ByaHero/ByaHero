import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, SafeAreaView, ScrollView, StatusBar, Animated } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function AdminDashboard() {
  const insets = useSafeAreaInsets();
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true })
      ])
    ).start();
  }, []);

  const sections = [
    {
      title: 'Fleet & Operations',
      items: [
        { label: 'Total Buses', count: 0, route: '/admin/buses', action: 'Manage' },
        { label: 'Active Buses', count: 0, route: '/admin/active-buses', action: 'Manage' },
        { label: 'Schedules', count: 0, route: '/admin/operation-schedule', action: 'Manage' },
        { label: 'Waiting Pax', count: 0, route: '/admin/waiting-passengers', action: 'Manage' },
      ],
    },
    {
      title: 'Personnel & Infrastructure',
      items: [
        { label: 'Drivers', count: 0, route: '/admin/conductors', action: 'Manage' },
        { label: 'Conductors', count: 0, route: '/admin/conductors', action: 'Manage' },
        { label: 'Bus Stops', count: 0, route: '/admin/stops', action: 'Manage' },
      ],
    },
    {
      title: 'Passenger Experience',
      items: [
        { label: 'Lost & Found', count: 0, route: '/admin/lost-and-found', action: 'Manage' },
        { label: 'Reports', count: 0, route: '/admin/reports', action: 'Manage' },
        { label: 'Feedbacks', count: 0, route: '/admin/feedbacks', action: 'Manage' },
      ],
    },
    {
      title: 'Revenue & Insights',
      items: [
        { label: 'Bus Fares', count: 0, route: '/admin/bus-fare', action: 'Manage' },
        { label: 'Analytics (Boarded)', count: 0, route: '/admin/analytics', action: 'View' },
      ],
    }
  ];

  return (
    <SafeAreaView style={tw`flex-1 bg-[#f8f9fa]`}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      

      <ScrollView contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 54 + 16 }]} showsVerticalScrollIndicator={false}>

        {/* Control Center Header */}
        <View style={tw`flex-col mb-4 border-b border-gray-200 pb-4 mt-2`}>
          <View style={tw`mb-3`}>
            <Text style={tw`text-2xl font-extrabold text-gray-900 mb-1 tracking-tight`}>Control Center</Text>
            <Text style={tw`text-gray-500 text-xs leading-relaxed`}>
              Monitor and manage real-time transport fleet, personnel, and passenger analytics.
            </Text>
          </View>
          <View style={tw`self-start flex-row items-center bg-white px-3 py-2 rounded-full border border-gray-200 shadow-sm`}>
            <Animated.View style={[tw`w-2 h-2 rounded-full bg-green-500 mr-2`, { opacity: pulseAnim }]} />
            <Text style={tw`text-xs text-gray-600 font-semibold`}>
              Live System: <Text style={tw`text-green-600`}>Operational</Text>
            </Text>
          </View>
        </View>

        {/* Sections */}
        {sections.map((sec, sIdx) => (
          <View key={sIdx} style={tw`mb-5`}>
            <Text style={tw`text-sm font-bold text-[#0f3878] mb-3 border-l-4 border-[#0f3878] pl-2 uppercase tracking-widest`}>
              {sec.title}
            </Text>
            <View style={tw`flex-row flex-wrap justify-between`}>
              {sec.items.map((item, iIdx) => (
                <View key={iIdx} style={tw`w-[48%] bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-3`}>
                  <Text style={tw`text-gray-500 text-[10px] font-bold mb-2 uppercase tracking-wider`}>
                    {item.label}
                  </Text>
                  <Text style={tw`text-3xl font-extrabold text-gray-800 mb-3`}>
                    {item.count}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push(item.route as any)}
                    style={tw`bg-slate-100 py-2 rounded-full items-center border border-slate-200`}
                  >
                    <Text style={tw`text-slate-700 text-xs font-bold`}>{item.action}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        ))}

        {/* Map Tracker UI Placeholder */}
        <View style={tw`bg-white rounded-2xl shadow-sm border border-gray-200 mb-6 overflow-hidden`}>
          <View style={tw`flex-row justify-between items-center bg-white border-b border-gray-100 p-4`}>
            <View style={tw`flex-row items-center`}>
              <Image
                source={require('../../../assets/images/byaheroLogo.png')}
                style={tw`w-5 h-5 mr-2`}
                contentFit="contain"
              />
              <Text style={tw`text-[#0f3878] font-bold text-sm tracking-wide`}>BUS TRACKER</Text>
            </View>
            <View style={tw`flex-row items-center`}>
              <Animated.View style={[tw`w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5`, { opacity: pulseAnim }]} />
              <Text style={tw`text-gray-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
            </View>
          </View>
          <View style={tw`h-64 bg-slate-100 items-center justify-center`}>
            <Ionicons name="location-outline" size={48} color="#94a3b8" />
            <Text style={tw`text-slate-400 mt-2 font-medium text-sm`}>Interactive Map Loading...</Text>
          </View>
        </View>

        <View style={tw`h-6`} />

      </ScrollView>
    </SafeAreaView>
  );
}
