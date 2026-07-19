import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import ConductorNavbar from '../components/ConductorNavbar';
import { getOperationHistory } from '../services/conductorService';

export default function OperationHistoryScreen() {
  const [history, setHistory] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    fetchHistory();
  }, []);

  const fetchHistory = async () => {
    setIsLoading(true);
    try {
      const res = await getOperationHistory();
      if (res && res.success) {
        setHistory(res.history || []);
      }
    } catch (e) {
      console.error('Error fetching operation history:', e);
    } finally {
      setIsLoading(false);
    }
  };

  const formatDuration = (start: string, end: string) => {
    if (!start || !end) return 'N/A';
    const s = new Date(start).getTime();
    const e = new Date(end).getTime();
    const diff = Math.abs(e - s);
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric'
    });
  };

  const formatTime = (dateString: string) => {
    if (!dateString) return '';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ConductorNavbar title="Operation History" />

      <ScrollView contentContainerStyle={tw`p-5 pb-10`} style={tw`flex-1`}>
        <View style={tw`mb-5 flex-row justify-between items-center`}>
          <Text style={tw`text-lg font-extrabold text-slate-800`}>Your Travel History</Text>
          <TouchableOpacity onPress={fetchHistory} style={tw`bg-slate-200 p-2 rounded-full`}>
            <Ionicons name="refresh" size={18} color="#475569" />
          </TouchableOpacity>
        </View>

        {isLoading ? (
          <View style={tw`py-10 items-center justify-center`}>
            <ActivityIndicator color="#0f3878" size="large" />
            <Text style={tw`text-slate-400 mt-3 font-semibold`}>Loading history...</Text>
          </View>
        ) : history.length === 0 ? (
          <View style={tw`bg-white rounded-2xl p-8 border border-slate-200 shadow-sm items-center py-10`}>
            <MaterialCommunityIcons name="bus-clock" size={48} color="#94a3b8" style={tw`mb-2`} />
            <Text style={tw`text-slate-500 font-bold text-sm`}>No history found.</Text>
            <Text style={tw`text-slate-400 text-xs mt-1 text-center`}>Your completed operations will appear here.</Text>
          </View>
        ) : (
          <View style={tw`gap-4`}>
            {history.map((item, idx) => (
              <View key={idx} style={tw`bg-white rounded-2xl p-4 border border-slate-200 shadow-sm`}>
                {/* Header: Date & Route */}
                <View style={tw`flex-row justify-between items-center mb-3 border-b border-slate-100 pb-3`}>
                  <View>
                    <Text style={tw`text-xs font-bold text-slate-400 uppercase tracking-widest`}>
                      {formatDate(item.started_at)}
                    </Text>
                    <Text style={tw`text-[#0f3878] font-black text-base mt-0.5`}>
                      {item.route || 'Unknown Route'}
                    </Text>
                  </View>
                  <View style={tw`bg-green-100 px-3 py-1.5 rounded-lg`}>
                    <Text style={tw`text-green-700 font-extrabold text-xs uppercase`}>Completed</Text>
                  </View>
                </View>

                {/* Details: Start / End */}
                <View style={tw`flex-row mb-4`}>
                  <View style={tw`flex-1`}>
                    <Text style={tw`text-[10px] text-slate-400 font-bold uppercase`}>Start Location</Text>
                    <Text style={tw`text-slate-800 font-semibold text-sm mt-0.5`} numberOfLines={1}>
                      {item.start_location || 'N/A'}
                    </Text>
                    <Text style={tw`text-xs text-slate-500 mt-1`}>
                      {formatTime(item.started_at)}
                    </Text>
                  </View>
                  <View style={tw`w-8 items-center justify-center`}>
                    <MaterialCommunityIcons name="arrow-right-thin" size={24} color="#94a3b8" />
                  </View>
                  <View style={tw`flex-1 items-end`}>
                    <Text style={tw`text-[10px] text-slate-400 font-bold uppercase`}>End Location</Text>
                    <Text style={tw`text-slate-800 font-semibold text-sm mt-0.5 text-right`} numberOfLines={1}>
                      {item.end_location || 'N/A'}
                    </Text>
                    <Text style={tw`text-xs text-slate-500 mt-1 text-right`}>
                      {item.ended_at ? formatTime(item.ended_at) : 'N/A'}
                    </Text>
                  </View>
                </View>

                {/* Stats: Travel Time & Passengers */}
                <View style={tw`bg-slate-50 rounded-xl p-3 flex-row justify-between border border-slate-100`}>
                  <View style={tw`flex-row items-center gap-2`}>
                    <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center`}>
                      <Ionicons name="time" size={16} color="#0f3878" />
                    </View>
                    <View>
                      <Text style={tw`text-[10px] font-bold text-slate-400 uppercase`}>Travel Time</Text>
                      <Text style={tw`text-slate-800 font-bold text-xs`}>
                        {formatDuration(item.started_at, item.ended_at)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={tw`flex-row items-center gap-2`}>
                    <View style={tw`w-8 h-8 rounded-full bg-blue-100 items-center justify-center`}>
                      <Ionicons name="people" size={16} color="#0f3878" />
                    </View>
                    <View>
                      <Text style={tw`text-[10px] font-bold text-slate-400 uppercase`}>Pax Served</Text>
                      <Text style={tw`text-slate-800 font-bold text-xs`}>
                        {item.total_boarded || 0}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
