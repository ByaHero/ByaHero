import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, TouchableOpacity, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface ActiveBus {
  Bus_ID: number;
  code: string;
  status: string;
  conductor_email: string;
}

export default function AdminActiveBuses() {
  const [buses, setBuses] = useState<ActiveBus[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pulse, setPulse] = useState(true);
  const [stoppingId, setStoppingId] = useState<number | null>(null);
  const [stopModalVisible, setStopModalVisible] = useState(false);
  const [selectedBusToStop, setSelectedBusToStop] = useState<ActiveBus | null>(null);
  
  // Custom Error Modal State
  const [errorModalVisible, setErrorModalVisible] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");

  const fetchActiveBuses = async () => {
    try {
      const data = await adminService.listActiveBuses();
      if (data.success && data.activeBuses) {
        setBuses(data.activeBuses);
      } else {
        setBuses([]);
      }
    } catch (error) {
      console.error('Error fetching active buses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const confirmStopBus = (bus: ActiveBus) => {
    setSelectedBusToStop(bus);
    setStopModalVisible(true);
  };

  const handleStop = async () => {
    if (!selectedBusToStop) return;
    const busId = selectedBusToStop.Bus_ID;
    try {
      setStopModalVisible(false);
      setStoppingId(busId);
      const res = await adminService.stopActiveBus(busId);
      if (res.success) {
        await fetchActiveBuses();
        setSuccessMessage(`Tracking session for Bus ${selectedBusToStop.code} was successfully terminated.`);
        setSuccessModalVisible(true);
      } else {
        setErrorMessage(res.error || "Failed to stop tracking");
        setErrorModalVisible(true);
      }
    } catch (e: any) {
      console.error(e);
      setErrorMessage(e.message || "An error occurred");
      setErrorModalVisible(true);
    } finally {
      setStoppingId(null);
      setSelectedBusToStop(null);
    }
  };

  useEffect(() => {
    fetchActiveBuses();
    
    // Pulse animation simulation
    const pulseInterval = setInterval(() => {
      setPulse(p => !p);
    }, 800);
    return () => clearInterval(pulseInterval);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchActiveBuses();
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="ACTIVE BUSES" />

      <View style={tw`p-5 pb-3 flex-row justify-between items-center`}>
        <View>
          <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight mb-1`}>Active Buses</Text>
          <View style={tw`flex-row items-center`}>
            <View style={[tw`w-1.5 h-1.5 rounded-full bg-blue-500 mr-2`, { opacity: pulse ? 1 : 0.3 }]} />
            <Text style={tw`text-blue-500 text-[10px] uppercase font-bold tracking-wider`}>Live Updates</Text>
          </View>
        </View>
        <TouchableOpacity 
          onPress={onRefresh}
          disabled={refreshing}
          style={tw`p-2.5 rounded-full bg-white shadow-sm border border-slate-200`}
        >
          <Ionicons name="refresh" size={20} color="#0f3878" />
        </TouchableOpacity>
      </View>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#0f3878" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`p-5 pt-2 pb-10`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f3878" />}
        >
          {buses.length > 0 ? (
            buses.map((bus) => {
              const isUnavailable = bus.status?.toLowerCase() === 'unavailable';
              const isStopping = stoppingId === bus.Bus_ID;
              
              return (
                <View key={bus.Bus_ID} style={tw`bg-white rounded-3xl p-4 mb-4 shadow-sm border border-slate-100 flex-row items-center`}>
                  <View style={tw`w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center mr-4 border border-blue-100`}>
                    <Ionicons name="bus" size={28} color="#1d4ed8" />
                  </View>
                  <View style={tw`flex-1`}>
                    
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Code</Text>
                      <Text style={tw`text-slate-800 font-extrabold text-[15px]`}>{bus.code}</Text>
                    </View>

                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Status</Text>
                      <View style={tw`px-3 py-1 rounded-full ${isUnavailable ? 'bg-[#ffccd5]' : 'bg-green-100'}`}>
                        <Text style={tw`${isUnavailable ? 'text-[#c1121f]' : 'text-green-700'} text-[9px] font-bold uppercase tracking-wider`}>
                          {bus.status || 'AVAILABLE'}
                        </Text>
                      </View>
                    </View>
                    
                    <View style={tw`flex-row justify-between items-center mb-2`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider`}>Conductor</Text>
                      <Text style={tw`text-slate-600 text-[12px] font-medium max-w-[60%]`} numberOfLines={1}>
                        {bus.conductor_email || 'N/A'}
                      </Text>
                    </View>
                    
                    <View style={tw`mt-2 pt-2 border-t border-slate-100 flex-row justify-end`}>
                      <TouchableOpacity 
                        style={tw`bg-red-50 px-4 py-1.5 rounded-full flex-row items-center border border-red-100`}
                        onPress={() => confirmStopBus(bus)}
                        disabled={isStopping}
                      >
                        {isStopping ? (
                          <ActivityIndicator size="small" color="#ef4444" style={tw`mr-1`} />
                        ) : (
                          <Ionicons name="stop-circle" size={14} color="#ef4444" style={tw`mr-1`} />
                        )}
                        <Text style={tw`text-red-500 font-bold text-[11px] tracking-wider uppercase`}>Stop Tracking</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                </View>
              );
            })
          ) : (
            <View style={tw`items-center py-12 bg-white rounded-3xl border border-dashed border-slate-300`}>
              <Ionicons name="bus-outline" size={48} color="#cbd5e1" style={tw`mb-3`} />
              <Text style={tw`text-slate-500 font-medium text-[14px]`}>No active buses right now.</Text>
            </View>
          )}
        </ScrollView>
      )}

      <Modal visible={stopModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-xl`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="warning" size={24} color="#ef4444" />
              </View>
              <Text style={tw`text-lg font-extrabold text-slate-800 text-center tracking-tight`}>Authorization Required</Text>
            </View>

            <Text style={tw`text-slate-600 text-sm text-center mb-3 leading-5`}>
              By proceeding, you authorize the system to forcefully terminate the current tracking session for <Text style={tw`font-bold text-slate-800`}>{selectedBusToStop?.code}</Text>.
            </Text>
            <Text style={tw`text-slate-600 text-sm text-center mb-6 leading-5`}>
              This will mark all ongoing rides as completed and unassign the conductor. Are you sure you want to continue?
            </Text>

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity 
                style={tw`flex-1 py-3 px-4 rounded-xl border border-slate-200 bg-white`}
                onPress={() => setStopModalVisible(false)}
              >
                <Text style={tw`text-slate-600 font-bold text-center`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`flex-1 py-3 px-4 rounded-xl bg-red-500`}
                onPress={handleStop}
              >
                <Text style={tw`text-white font-bold text-center`}>Confirm</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* ERROR MODAL */}
      <Modal visible={errorModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-xl`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-12 h-12 bg-red-100 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="close-circle" size={28} color="#ef4444" />
              </View>
              <Text style={tw`text-lg font-extrabold text-slate-800 text-center tracking-tight`}>Error Encountered</Text>
            </View>

            <Text style={tw`text-slate-600 text-sm text-center mb-6 leading-5`}>
              {errorMessage}
            </Text>

            <TouchableOpacity 
              style={tw`w-full py-3 px-4 rounded-xl bg-[#0f3878]`}
              onPress={() => setErrorModalVisible(false)}
            >
              <Text style={tw`text-white font-bold text-center`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* SUCCESS MODAL */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center p-4`}>
          <View style={tw`bg-white w-full max-w-[340px] rounded-3xl p-6 shadow-xl`}>
            <View style={tw`items-center mb-4`}>
              <View style={tw`w-12 h-12 bg-green-100 rounded-full items-center justify-center mb-3`}>
                <Ionicons name="checkmark-circle" size={28} color="#16a34a" />
              </View>
              <Text style={tw`text-lg font-extrabold text-slate-800 text-center tracking-tight`}>Session Terminated</Text>
            </View>

            <Text style={tw`text-slate-600 text-sm text-center mb-6 leading-5`}>
              {successMessage}
            </Text>

            <TouchableOpacity 
              style={tw`w-full py-3 px-4 rounded-xl bg-[#0f3878]`}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={tw`text-white font-bold text-center`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
