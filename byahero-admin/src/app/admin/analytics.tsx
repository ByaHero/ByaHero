import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';

interface AnalyticsData {
  summary: {
    total_trips: number;
    total_passengers: number;
    total_departed: number;
    avg_trip_minutes: number;
  };
  boarding_locations: any[];
  hourly_flow: any[];
  routes: any[];
  buses: any[];
  conductors: any[];
  recent_operations: any[];
  location_logs: any[];
}

export default function AdminAnalytics() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [period, setPeriod] = useState('today');

  const [expandedBuses, setExpandedBuses] = useState<Record<string, boolean>>({});
  const [seeMoreOps, setSeeMoreOps] = useState(false);
  const [seeMoreLogs, setSeeMoreLogs] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      const resData = await apiRequest(`/api/admin/analytics?period=${period}`);
      if (resData.success !== false) {
        setData(resData as AnalyticsData);
      }
    } catch (e) {
      console.warn("Analytics API failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period]);

  useEffect(() => {
    setLoading(true);
    fetchAnalytics();
  }, [fetchAnalytics]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchAnalytics();
  };

  const toggleBusDetails = (code: string) => {
    setExpandedBuses(prev => ({ ...prev, [code]: !prev[code] }));
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="ANALYTICS" />

      <View style={tw`p-5 pb-3`}>
        <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Analytics Dashboard</Text>
        
        <View style={tw`flex-row mt-3 bg-slate-200/60 p-1 rounded-xl self-start`}>
          {['today', 'week', 'month'].map(p => (
            <TouchableOpacity 
              key={p}
              onPress={() => setPeriod(p)}
              style={tw`px-4 py-2 rounded-lg ${period === p ? 'bg-white shadow-sm' : ''}`}
            >
              <Text style={tw`font-bold text-[13px] capitalize ${period === p ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
                {p === 'today' ? 'Today' : `This ${p}`}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : data ? (
        <ScrollView 
          contentContainerStyle={tw`pb-10 pt-2`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
          
          {/* Summary Stats Grid */}
          <View style={tw`flex-row flex-wrap px-3 mb-5`}>
            {[
              { label: 'Total Trips', val: Number(data.summary?.total_trips || 0).toLocaleString() },
              { label: 'Pax Boarded', val: Number(data.summary?.total_passengers || 0).toLocaleString() },
              { label: 'Pax Departed', val: Number(data.summary?.total_departed || 0).toLocaleString() },
              { label: 'Avg Trip', val: `${Math.round(Number(data.summary?.avg_trip_minutes || 0))}m` }
            ].map((stat, i) => (
              <View key={i} style={tw`w-[50%] p-2`}>
                <View style={tw`bg-white rounded-3xl p-5 items-center shadow-sm border border-slate-200 justify-center h-[100px]`}>
                  <Text style={tw`text-[26px] font-extrabold text-[#1d4ed8] mb-1`}>{stat.val}</Text>
                  <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>{stat.label}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Boarding Hotspots */}
          <View style={tw`bg-white rounded-3xl p-6 mx-5 mb-6 shadow-sm border border-slate-200 items-center`}>
            <Text style={tw`text-slate-400 text-[11px] font-bold uppercase tracking-wider mb-2`}>Total Boarded Passengers</Text>
            <Text style={tw`text-5xl font-black text-emerald-500 mb-2`}>{Number(data.summary?.total_passengers || 0).toLocaleString()}</Text>
            <Text style={tw`text-slate-500 text-[12px] font-medium text-center mb-5`}>Activity across all tracked terminals & stops</Text>
            
            <View style={tw`border-t border-slate-100 pt-5 w-full items-center`}>
              <Text style={tw`text-slate-400 text-[10px] font-bold uppercase tracking-wider mb-4`}>Boarding Locations</Text>
              <View style={tw`flex-row flex-wrap justify-center`}>
                {data.boarding_locations?.length ? data.boarding_locations.map((loc, i) => (
                  <View key={i} style={tw`bg-slate-50 border border-slate-200 rounded-full px-3 py-1.5 flex-row items-center m-1`}>
                    <Text style={tw`font-bold text-slate-700 text-[12px] mr-1`}>{loc.location_name}</Text>
                    <Text style={tw`text-emerald-500 font-black text-[12px] mr-1`}>— {Number(loc.total).toLocaleString()}</Text>
                    <Text style={tw`text-slate-400 text-[9px] uppercase tracking-wider`}>Boarded</Text>
                  </View>
                )) : <Text style={tw`text-slate-400 text-[12px] italic`}>No boarding data yet</Text>}
              </View>
            </View>
          </View>

          {/* Route Breakdown */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="map" size={18} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Route Breakdown</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`min-w-[300px]`}>
                <View style={tw`flex-row border-b border-slate-200 pb-2`}>
                  <Text style={tw`w-[150px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Route</Text>
                  <Text style={tw`w-[60px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Trips</Text>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-right`}>Passengers</Text>
                </View>
                {data.routes?.map((r, i) => (
                  <View key={i} style={tw`flex-row border-b border-slate-100 py-3`}>
                    <Text style={tw`w-[150px] font-bold text-slate-700 text-[13px]`}>{r.route}</Text>
                    <Text style={tw`w-[60px] text-slate-600 font-medium text-[13px] text-center`}>{r.trips}</Text>
                    <Text style={tw`w-[80px] text-[#1d4ed8] font-bold text-[13px] text-right`}>{Number(r.passengers).toLocaleString()}</Text>
                  </View>
                ))}
                {!data.routes?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No route data yet</Text>}
              </View>
            </ScrollView>
          </View>

          {/* Bus Performance */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-1`}>
              <Ionicons name="bus" size={18} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Bus Performance</Text>
            </View>
            <Text style={tw`text-slate-400 text-[11px] font-medium mb-4`}>Tap a bus to view hotspots.</Text>
            
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`min-w-[300px]`}>
                <View style={tw`flex-row border-b border-slate-200 pb-2`}>
                  <Text style={tw`w-[100px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Bus Code</Text>
                  <Text style={tw`w-[60px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Trips</Text>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-right`}>Passengers</Text>
                </View>
                {data.buses?.map((b, i) => {
                  const expanded = expandedBuses[b.code];
                  return (
                    <View key={i} style={tw`border-b border-slate-100`}>
                      <TouchableOpacity 
                        style={tw`flex-row py-3`}
                        onPress={() => toggleBusDetails(b.code)}
                      >
                        <View style={tw`w-[100px] flex-row items-center`}>
                          <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={14} color="#94a3b8" style={tw`mr-1`} />
                          <Text style={tw`font-bold text-slate-700 text-[13px]`}>{b.code}</Text>
                        </View>
                        <Text style={tw`w-[60px] text-slate-600 font-medium text-[13px] text-center`}>{b.trips}</Text>
                        <Text style={tw`w-[80px] text-[#1d4ed8] font-bold text-[13px] text-right`}>{Number(b.passengers).toLocaleString()}</Text>
                      </TouchableOpacity>
                      
                      {expanded && (
                        <View style={tw`bg-slate-50 border-l-2 border-[#1d4ed8] p-3 mb-2 rounded-r-xl`}>
                          <View style={tw`flex-row mb-3`}>
                            <View style={tw`flex-1`}>
                              <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5`}>Routes Taken</Text>
                              <Text style={tw`text-slate-700 font-bold text-[11px]`}>{b.routes || 'N/A'}</Text>
                            </View>
                            <View style={tw`flex-1`}>
                              <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-0.5`}>Conductors</Text>
                              <Text style={tw`text-slate-700 font-bold text-[11px]`}>
                                {(b.conductors || '').split(', ').map((email: string) => email.split('@')[0]).join(', ') || 'N/A'}
                              </Text>
                            </View>
                          </View>
                          <Text style={tw`text-slate-400 text-[9px] font-bold uppercase tracking-wider mb-1.5`}>Departure Hotspots</Text>
                          {!b.hotspots?.length ? (
                            <Text style={tw`text-slate-500 italic text-[11px]`}>No departure data recorded.</Text>
                          ) : (
                            b.hotspots.slice(0, 3).map((h: any, hi: number) => {
                              const maxVal = Math.max(...b.hotspots.map((hl: any) => Number(hl.total)));
                              const pct = maxVal > 0 ? (Number(h.total) / maxVal * 100) : 0;
                              return (
                                <View key={hi} style={tw`flex-row items-center mb-1`}>
                                  <Text style={tw`text-slate-600 font-bold text-[10px] w-[80px]`} numberOfLines={1}>{h.location_name}</Text>
                                  <View style={tw`flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden mx-2`}>
                                    <View style={[tw`h-full bg-[#1d4ed8]`, { width: `${pct}%` }]} />
                                  </View>
                                  <Text style={tw`text-[#1d4ed8] font-black text-[11px] w-[30px] text-right`}>{Number(h.total).toLocaleString()}</Text>
                                </View>
                              );
                            })
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
                {!data.buses?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No bus data yet</Text>}
              </View>
            </ScrollView>
          </View>

          {/* Conductor Activity */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="person-circle" size={18} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Conductor Activity</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`min-w-[300px]`}>
                <View style={tw`flex-row border-b border-slate-200 pb-2`}>
                  <Text style={tw`w-[150px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Conductor</Text>
                  <Text style={tw`w-[50px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Trips</Text>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-right`}>Passengers</Text>
                </View>
                {data.conductors?.map((c, i) => (
                  <View key={i} style={tw`flex-row border-b border-slate-100 py-3`}>
                    <Text style={tw`w-[150px] font-bold text-slate-700 text-[12px]`} numberOfLines={1}>{c.email}</Text>
                    <Text style={tw`w-[50px] text-slate-600 font-medium text-[12px] text-center`}>{c.trips}</Text>
                    <Text style={tw`w-[80px] text-[#1d4ed8] font-bold text-[12px] text-right`}>{Number(c.passengers).toLocaleString()}</Text>
                  </View>
                ))}
                {!data.conductors?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No conductor data yet</Text>}
              </View>
            </ScrollView>
          </View>

          {/* Recent Operations */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="time" size={18} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Recent Operations</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`min-w-[450px]`}>
                <View style={tw`flex-row border-b border-slate-200 pb-2`}>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Bus</Text>
                  <Text style={tw`w-[120px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Route</Text>
                  <Text style={tw`w-[100px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Conductor</Text>
                  <Text style={tw`w-[60px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Boarded</Text>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-right`}>Status</Text>
                </View>
                {(seeMoreOps ? data.recent_operations : data.recent_operations?.slice(0, 10))?.map((o, i) => (
                  <View key={i} style={tw`flex-row border-b border-slate-100 py-3 items-center`}>
                    <Text style={tw`w-[80px] font-bold text-slate-700 text-[12px]`}>{o.bus_code}</Text>
                    <Text style={tw`w-[120px] text-slate-600 font-medium text-[11px]`} numberOfLines={1}>{o.route}</Text>
                    <Text style={tw`w-[100px] text-slate-600 font-medium text-[11px]`} numberOfLines={1}>{(o.conductor_email || '').split('@')[0]}</Text>
                    <Text style={tw`w-[60px] text-[#1d4ed8] font-bold text-[12px] text-center`}>{Number(o.total_boarded || 0)}</Text>
                    <View style={tw`w-[80px] items-end`}>
                      <View style={tw`px-2 py-0.5 rounded-full ${o.status === 'active' ? 'bg-emerald-100' : 'bg-blue-100'}`}>
                        <Text style={tw`text-[9px] font-black uppercase ${o.status === 'active' ? 'text-emerald-700' : 'text-blue-700'}`}>{o.status}</Text>
                      </View>
                    </View>
                  </View>
                ))}
                {!data.recent_operations?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No operations recorded yet</Text>}
              </View>
            </ScrollView>
            {data.recent_operations?.length > 10 && (
              <TouchableOpacity 
                onPress={() => setSeeMoreOps(!seeMoreOps)}
                style={tw`mt-4 py-2 bg-slate-50 items-center rounded-xl`}
              >
                <Text style={tw`text-[#1d4ed8] font-bold text-[11px] uppercase tracking-wider`}>
                  {seeMoreOps ? 'Show Less' : `See More (${data.recent_operations.length - 10})`}
                </Text>
              </TouchableOpacity>
            )}
          </View>

        </ScrollView>
      ) : (
        <View style={tw`flex-1 justify-center items-center`}>
          <Text style={tw`text-slate-500`}>Failed to load analytics data.</Text>
        </View>
      )}

    </SafeAreaView>
  );
}
