import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, TouchableOpacity, Alert, RefreshControl, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

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
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  const [expandedBuses, setExpandedBuses] = useState<Record<string, boolean>>({});
  const [seeMoreOps, setSeeMoreOps] = useState(false);
  const [seeMoreLogs, setSeeMoreLogs] = useState(false);

  const fetchAnalytics = useCallback(async () => {
    try {
      let url = `/api/admin/analytics?period=${period}`;
      if (period === 'custom') {
        if (customStart) url += `&start=${customStart}`;
        if (customEnd) url += `&end=${customEnd}`;
      }
      const resData = await apiRequest(url);
      if (resData.success !== false) {
        setData(resData as AnalyticsData);
      }
    } catch (e) {
      console.warn("Analytics API failed", e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [period, customStart, customEnd]);

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

  const generatePDF = async () => {
    if (!data) return;
    try {
      const html = `
        <html>
          <head>
            <style>
              body { font-family: 'Helvetica', 'Arial', sans-serif; color: #333; padding: 20px; }
              h1 { color: #0f3878; margin-bottom: 5px; }
              .header { border-bottom: 2px solid #0f3878; padding-bottom: 10px; margin-bottom: 20px; }
              .period { color: #666; font-size: 14px; }
              .grid { display: flex; flex-wrap: wrap; margin-bottom: 30px; }
              .stat-box { width: 45%; padding: 15px; margin: 5px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; text-align: center; }
              .stat-val { font-size: 24px; font-weight: bold; color: #1d4ed8; }
              .stat-lbl { font-size: 10px; color: #64748b; text-transform: uppercase; font-weight: bold; margin-top: 5px; }
              table { width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 12px; }
              th { background: #f1f5f9; padding: 10px; text-align: left; border-bottom: 2px solid #cbd5e1; }
              td { padding: 10px; border-bottom: 1px solid #e2e8f0; }
              .section-title { font-size: 16px; font-weight: bold; color: #1e293b; margin-bottom: 10px; border-left: 4px solid #1d4ed8; padding-left: 10px; }
            </style>
          </head>
          <body>
            <div class="header">
              <h1>ByaHero Analytics Report</h1>
              <div class="period">Period: ${period === 'custom' ? `${customStart} to ${customEnd}` : period.toUpperCase()}</div>
            </div>
            
            <div class="grid">
              <div class="stat-box">
                <div class="stat-val">${Number(data.summary?.total_trips || 0).toLocaleString()}</div>
                <div class="stat-lbl">Total Trips</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">${Number(data.summary?.total_passengers || 0).toLocaleString()}</div>
                <div class="stat-lbl">Pax Boarded</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">${Number(data.summary?.total_departed || 0).toLocaleString()}</div>
                <div class="stat-lbl">Pax Departed</div>
              </div>
              <div class="stat-box">
                <div class="stat-val">${Math.round(Number(data.summary?.avg_trip_minutes || 0))}m</div>
                <div class="stat-lbl">Avg Trip Time</div>
              </div>
            </div>

            <div class="section-title">Boarding Locations</div>
            <table>
              <tr><th>Location</th><th>Passengers Boarded</th></tr>
              ${data.boarding_locations?.map(l => `<tr><td>${l.location_name}</td><td>${Number(l.total).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="2">No data</td></tr>'}
            </table>

            <div class="section-title">Route Breakdown</div>
            <table>
              <tr><th>Route</th><th>Trips</th><th>Passengers</th></tr>
              ${data.routes?.map(r => `<tr><td>${r.route}</td><td>${r.trips}</td><td>${Number(r.passengers).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No data</td></tr>'}
            </table>

            <div class="section-title">Bus Performance</div>
            <table>
              <tr><th>Bus Code</th><th>Trips</th><th>Passengers</th><th>Conductors</th></tr>
              ${data.buses?.map(b => `<tr><td>${b.code}</td><td>${b.trips}</td><td>${Number(b.passengers).toLocaleString()}</td><td>${(b.conductors || '').substring(0, 30)}${(b.conductors && b.conductors.length > 30) ? '...' : ''}</td></tr>`).join('') || '<tr><td colspan="4">No data</td></tr>'}
            </table>

            <div class="section-title">Conductor Activity</div>
            <table>
              <tr><th>Conductor</th><th>Trips</th><th>Passengers</th></tr>
              ${data.conductors?.map(c => `<tr><td>${c.email}</td><td>${c.trips}</td><td>${Number(c.passengers).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="3">No conductor data yet</td></tr>'}
            </table>

            <div class="section-title">Recent Operations</div>
            <table>
              <tr><th>Bus</th><th>Route</th><th>Conductor</th><th>Boarded</th><th>Status</th></tr>
              ${data.recent_operations?.map(o => `<tr><td>${o.bus_code}</td><td>${o.route}</td><td>${(o.conductor_email || '').split('@')[0]}</td><td>${Number(o.total_boarded || 0)}</td><td>${o.status}</td></tr>`).join('') || '<tr><td colspan="5">No operations recorded yet</td></tr>'}
            </table>

            <div class="section-title">Passenger Flow (Hourly)</div>
            <table>
              <tr><th>Hour</th><th>Passengers Boarded</th></tr>
              ${data.hourly_flow?.map(f => `<tr><td>${f.hr}:00</td><td>${Number(f.total).toLocaleString()}</td></tr>`).join('') || '<tr><td colspan="2">No hourly data</td></tr>'}
            </table>

            <div class="section-title">Location Activity Log</div>
            <table>
              <tr><th>Location</th><th>Time</th><th>Bus</th><th>Route</th><th>Boarded</th><th>Departed</th></tr>
              ${data.location_logs?.map(l => `<tr><td>${l.location_name}</td><td>${new Date(l.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</td><td>${l.bus_code}</td><td>${l.route}</td><td>${l.boarded}</td><td>${l.departed}</td></tr>`).join('') || '<tr><td colspan="6">No location logs recorded</td></tr>'}
            </table>
          </body>
        </html>
      `;

      if (Platform.OS === 'web') {
        const iframe = document.createElement('iframe');
        iframe.style.position = 'fixed';
        iframe.style.right = '0';
        iframe.style.bottom = '0';
        iframe.style.width = '0';
        iframe.style.height = '0';
        iframe.style.border = '0';
        document.body.appendChild(iframe);
        
        iframe.contentDocument?.open();
        iframe.contentDocument?.write(html);
        iframe.contentDocument?.close();
        
        setTimeout(() => {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
          setTimeout(() => {
            if (document.body.contains(iframe)) {
              document.body.removeChild(iframe);
            }
          }, 1000);
        }, 500);
      } else {
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(uri, { UTI: '.pdf', mimeType: 'application/pdf' });
        }
      }
    } catch (err) {
      console.warn('PDF Error:', err);
      Alert.alert('Error', 'Failed to generate PDF');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="ANALYTICS" />

      <View style={tw`p-5 pb-3`}>
        <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Analytics Dashboard</Text>
        
        <View style={tw`flex-row flex-wrap justify-between items-start mt-3 gap-y-3`}>
          <View style={tw`flex-1 min-w-[250px]`}>
            <View style={tw`flex-row flex-wrap bg-slate-200/60 p-1 rounded-xl self-start gap-1`}>
              {['today', 'week', 'month', 'custom'].map(p => (
                <TouchableOpacity 
                  key={p}
                  onPress={() => setPeriod(p)}
                  style={tw`px-4 py-2 rounded-lg ${period === p ? 'bg-white shadow-sm' : ''}`}
                >
                  <Text style={tw`font-bold text-[13px] capitalize ${period === p ? 'text-[#1d4ed8]' : 'text-slate-500'}`}>
                    {p === 'today' ? 'Today' : (p === 'custom' ? 'Custom' : `This ${p}`)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {period === 'custom' && (
              <View style={tw`flex-row flex-wrap items-center mt-3 gap-2`}>
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e: any) => setCustomStart(e.target.value)}
                    style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', minWidth: '130px', outline: 'none' }}
                  />
                ) : (
                  <TextInput
                    style={tw`bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] flex-1 min-w-[100px] max-w-[140px]`}
                    placeholder="YYYY-MM-DD"
                    value={customStart}
                    onChangeText={setCustomStart}
                  />
                )}
                
                <Text style={tw`text-slate-500 font-bold text-[12px]`}>to</Text>
                
                {Platform.OS === 'web' ? (
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e: any) => setCustomEnd(e.target.value)}
                    style={{ backgroundColor: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', fontSize: '13px', minWidth: '130px', outline: 'none' }}
                  />
                ) : (
                  <TextInput
                    style={tw`bg-white border border-slate-200 rounded-lg px-3 py-2 text-[13px] flex-1 min-w-[100px] max-w-[140px]`}
                    placeholder="YYYY-MM-DD"
                    value={customEnd}
                    onChangeText={setCustomEnd}
                  />
                )}
                <TouchableOpacity onPress={fetchAnalytics} style={tw`bg-[#1d4ed8] px-4 py-2 rounded-lg`}>
                  <Text style={tw`text-white font-bold text-[13px]`}>Apply</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          <TouchableOpacity onPress={generatePDF} style={tw`flex-row items-center bg-emerald-500 px-4 py-2 rounded-xl shadow-sm h-[36px] ml-auto`}>
            <Ionicons name="download" size={16} color="white" style={tw`mr-2`} />
            <Text style={tw`text-white font-bold text-[13px]`}>Export PDF</Text>
          </TouchableOpacity>
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

          {/* Passenger Flow */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
               <Ionicons name="stats-chart" size={18} color="#1d4ed8" style={tw`mr-2`} />
               <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Passenger Flow (Hourly)</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`flex-row items-end h-[150px] pt-5`}>
                {data.hourly_flow?.map((f, i) => {
                  const maxVal = Math.max(...data.hourly_flow.map(hl => Number(hl.total)));
                  const hPct = maxVal > 0 ? (Number(f.total) / maxVal * 100) : 0;
                  return (
                    <View key={i} style={tw`items-center mx-2 w-[30px]`}>
                      <Text style={tw`text-[#1d4ed8] font-black text-[10px] mb-1`}>{f.total}</Text>
                      <View style={[tw`w-[20px] bg-[#1d4ed8] rounded-t-sm`, { height: `${hPct}%`, minHeight: 4 }]} />
                      <Text style={tw`text-slate-400 font-bold text-[9px] mt-2`}>{f.hr}:00</Text>
                    </View>
                  );
                })}
                {!data.hourly_flow?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No hourly data yet</Text>}
              </View>
            </ScrollView>
          </View>

          {/* Location Activity Log */}
          <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="list" size={18} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[13px] uppercase tracking-wider`}>Location Activity Log</Text>
            </View>
            <ScrollView horizontal showsHorizontalScrollIndicator={false}>
              <View style={tw`min-w-[500px]`}>
                <View style={tw`flex-row border-b border-slate-200 pb-2`}>
                  <Text style={tw`w-[100px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Time</Text>
                  <Text style={tw`w-[120px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Location</Text>
                  <Text style={tw`w-[80px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Bus</Text>
                  <Text style={tw`w-[120px] text-slate-400 text-[10px] font-bold uppercase tracking-wider`}>Route</Text>
                  <Text style={tw`w-[60px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Boarded</Text>
                  <Text style={tw`w-[60px] text-slate-400 text-[10px] font-bold uppercase tracking-wider text-center`}>Departed</Text>
                </View>
                {(seeMoreLogs ? data.location_logs : data.location_logs?.slice(0, 10))?.map((l, i) => (
                  <View key={i} style={tw`flex-row border-b border-slate-100 py-3 items-center`}>
                    <Text style={tw`w-[100px] font-bold text-slate-600 text-[11px]`}>{new Date(l.recorded_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</Text>
                    <Text style={tw`w-[120px] font-bold text-slate-700 text-[12px]`} numberOfLines={1}>{l.location_name}</Text>
                    <Text style={tw`w-[80px] text-[#1d4ed8] font-bold text-[12px]`}>{l.bus_code}</Text>
                    <Text style={tw`w-[120px] text-slate-600 font-medium text-[11px]`} numberOfLines={1}>{l.route}</Text>
                    <Text style={tw`w-[60px] text-emerald-500 font-black text-[12px] text-center`}>+{Number(l.boarded || 0)}</Text>
                    <Text style={tw`w-[60px] text-rose-500 font-black text-[12px] text-center`}>-{Number(l.departed || 0)}</Text>
                  </View>
                ))}
                {!data.location_logs?.length && <Text style={tw`text-center py-4 text-slate-400 italic text-[12px]`}>No location logs yet</Text>}
              </View>
            </ScrollView>
            {data.location_logs?.length > 10 && (
              <TouchableOpacity 
                onPress={() => setSeeMoreLogs(!seeMoreLogs)}
                style={tw`mt-4 py-2 bg-slate-50 items-center rounded-xl`}
              >
                <Text style={tw`text-[#1d4ed8] font-bold text-[11px] uppercase tracking-wider`}>
                  {seeMoreLogs ? 'Show Less' : `See More (${data.location_logs.length - 10})`}
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
