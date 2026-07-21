import React, { useEffect, useState, useRef } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Platform } from 'react-native';
import { Image } from 'expo-image';
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
    analytics_boarded: 0,
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

  const [activeBuses, setActiveBuses] = useState<any[]>([]);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const fetchActiveBuses = async () => {
    try {
      const data = await adminService.listActiveBuses();
      if (data.success && data.buses) {
        setActiveBuses(data.buses);
        if (Platform.OS === 'web' && iframeRef.current?.contentWindow) {
          iframeRef.current.contentWindow.postMessage(JSON.stringify(data.buses), '*');
        }
      }
    } catch (e) {
      console.error('Failed to fetch active buses', e);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchStats().finally(() => setLoading(false));
    fetchActiveBuses();
    
    const statsInterval = setInterval(() => {
      fetchStats();
      fetchActiveBuses();
    }, 10000); // refresh every 10s
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
      title: 'Buses & Operations',
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
        { label: 'Analytics (Boarded)', count: stats.analytics_boarded || 0, route: '/admin/analytics', action: 'View' },
      ],
    }
  ];

  const mapHtmlTemplate = `
  <!DOCTYPE html>
  <html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
    <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.3/dist/leaflet.css" />
    <style>
      body { padding: 0; margin: 0; font-family: sans-serif; }
      #map { height: 100vh; width: 100vw; background: #e2e8f0; }
      .leaflet-popup-content { margin: 10px; font-size: 13px; }
    </style>
  </head>
  <body>
    <div id="map"></div>
    <script src="https://unpkg.com/leaflet@1.9.3/dist/leaflet.js"></script>
    <script>
      const map = L.map('map', { zoomControl: false }).setView([14.0905, 121.0550], 12);
      L.control.zoom({ position: 'topleft' }).addTo(map);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19
      }).addTo(map);

      const busIcon = L.icon({
          iconUrl: 'https://cdn-icons-png.flaticon.com/512/3448/3448339.png',
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          popupAnchor: [0, -17]
      });

      let markers = {};

      window.addEventListener('message', function(event) {
        try {
          const buses = JSON.parse(event.data);
          const currentIds = new Set();
          
          buses.forEach(b => {
            currentIds.add(b.id);
            const coords = [b.latitude || 14.0905, b.longitude || 121.0550];
            
            if (markers[b.id]) {
              markers[b.id].setLatLng(coords);
              markers[b.id].setPopupContent('<b>Bus ' + b.bus_code + '</b><br>' + b.route);
            } else {
              const marker = L.marker(coords, { icon: busIcon }).addTo(map);
              marker.bindPopup('<b>Bus ' + b.bus_code + '</b><br>' + b.route);
              markers[b.id] = marker;
            }
          });

          Object.keys(markers).forEach(id => {
            if (!currentIds.has(Number(id))) {
              map.removeLayer(markers[id]);
              delete markers[id];
            }
          });
        } catch (e) {}
      });
    </script>
  </body>
  </html>
  `;

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
                Monitor and manage real-time transport buses, personnel, and passenger analytics.
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
                <Image source={require('../../../assets/images/byaheroLogoBlue.svg')} style={tw`w-5 h-5 mr-2`} contentFit="contain" />
                <Text style={tw`text-[#0f3878] font-bold text-sm tracking-wide`}>BUS TRACKER</Text>
              </View>
              <View style={tw`flex-row items-center`}>
                <View style={[tw`w-1.5 h-1.5 rounded-full bg-green-500 mr-1.5`, { opacity: pulse ? 1 : 0.3 }]} />
                <Text style={tw`text-gray-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
              </View>
            </View>
            <View style={tw`h-80 bg-slate-100 flex-col`}>
              {Platform.OS === 'web' ? (
                <iframe 
                  ref={iframeRef}
                  srcDoc={mapHtmlTemplate}
                  style={{ width: '100%', height: '100%', border: 0 }} 
                  onLoad={() => {
                    if (iframeRef.current?.contentWindow && activeBuses.length > 0) {
                      iframeRef.current.contentWindow.postMessage(JSON.stringify(activeBuses), '*');
                    }
                  }}
                />
              ) : (
                <View style={tw`flex-1 items-center justify-center`}>
                  <Text style={tw`text-slate-400 font-medium text-sm`}>Map only supported on Web version.</Text>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
