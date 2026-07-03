import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { apiRequest } from '@/services/api';
import AdminNavbar from '@/components/AdminNavbar';

interface Destination {
  stop_id: string;
  location_name: string;
}

interface Snapshot {
  snapshot_id: string;
  label: string;
  created_at: string;
}

interface FareRow {
  distance_km: number;
  origin_name: string;
  regular_fare: number;
  discounted_fare: number;
}

interface FareData {
  destinationsList: Destination[];
  filterDestination: string;
  snapshots: Snapshot[];
  destName: string;
  farthestOriginName: string;
  fares: FareRow[];
}

export default function AdminFares() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FareData | null>(null);
  
  // Filters
  const [currentDestination, setCurrentDestination] = useState('');
  const [currentQuery, setCurrentQuery] = useState('');

  // Matrix Generator form
  const [baseKm, setBaseKm] = useState('4');
  const [regBase, setRegBase] = useState('14.00');
  const [discBase, setDiscBase] = useState('11.25');
  const [regRate, setRegRate] = useState('2.20');
  const [discRate, setDiscRate] = useState('1.76');

  // Snapshots
  const [snapshotLabel, setSnapshotLabel] = useState('');
  const [selectedSnapshot, setSelectedSnapshot] = useState('');
  const [isSnapshotDropdownOpen, setIsSnapshotDropdownOpen] = useState(false);
  const [isDestinationModalVisible, setIsDestinationModalVisible] = useState(false);

  const fetchData = useCallback(async (destinationId = '', query = '') => {
    setLoading(true);
    try {
      let url = '/api/admin/fares';
      const params = new URLSearchParams();
      if (destinationId) params.append('destination', destinationId);
      if (query) params.append('q', query);
      
      const resData = await apiRequest(`${url}?${params.toString()}`);
      if (resData.success !== false) {
        setData(resData as FareData);
        if (!currentDestination) setCurrentDestination(resData.filterDestination);
      } else {
        Alert.alert('Error', resData.error || 'Failed to fetch data.');
      }
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Network error while fetching data.');
    } finally {
      setLoading(false);
    }
  }, [currentDestination]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleFilterSubmit = () => {
    fetchData(currentDestination, currentQuery);
  };

  const handleAction = async (actionName: string, bodyData: any) => {
    try {
      const res = await apiRequest('/api/admin/fares', {
        method: 'POST',
        body: JSON.stringify({ action: actionName, ...bodyData })
      });
      if (res.success) {
        Alert.alert('Success', res.message || 'Action successful.');
        fetchData(currentDestination, currentQuery);
      } else {
        Alert.alert('Error', res.error || 'Action failed.');
      }
    } catch (error) {
      Alert.alert('Error', 'Server connection failed.');
    }
  };

  const confirmGenerateMatrix = () => {
    Alert.alert(
      'Generate Matrix',
      'WARNING: This will instantly overwrite all rows with mathematical matrix calculations. Proceed?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Proceed', 
          style: 'destructive',
          onPress: () => handleAction('generate_matrix', { 
            base_km: baseKm, 
            reg_base: regBase, 
            disc_base: discBase, 
            reg_rate: regRate, 
            disc_rate: discRate 
          })
        }
      ]
    );
  };

  const confirmResetToBase = () => {
    Alert.alert(
      'Reset to Base',
      'Revoke changes by resetting ALL fares back to their original base values?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => handleAction('reset_to_base', {})
        }
      ]
    );
  };

  const confirmCreateSnapshot = () => {
    if (!snapshotLabel) {
      Alert.alert('Error', 'Please enter a snapshot label.');
      return;
    }
    Alert.alert(
      'Create Snapshot',
      'Create snapshot of ALL current fares now?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Create', 
          onPress: () => {
            handleAction('snapshot_create', { snapshot_label: snapshotLabel });
            setSnapshotLabel('');
          }
        }
      ]
    );
  };

  const confirmRestoreSnapshot = () => {
    if (!selectedSnapshot) {
      Alert.alert('Error', 'Please select a snapshot first.');
      return;
    }
    Alert.alert(
      'Restore Snapshot',
      'Restore selected snapshot? This overwrites all current fares.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Restore', 
          style: 'destructive',
          onPress: () => handleAction('snapshot_restore', { snapshot_id: selectedSnapshot })
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Bus Fares" />

      <View style={tw`p-5 pb-2`}>
        <Text style={tw`text-2xl font-extrabold text-[#0f3878] tracking-tight`}>Manage Bus Fares</Text>
        <Text style={tw`text-slate-500 text-[13px] mt-0.5 mb-5`}>Configure fare matrix and snapshots</Text>
      </View>

      <ScrollView contentContainerStyle={tw`pb-10`}>
        {/* Matrix Generator */}
        <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
          <View style={tw`flex-row items-center mb-4`}>
            <Ionicons name="calculator" size={20} color="#1d4ed8" style={tw`mr-2`} />
            <Text style={tw`font-bold text-slate-800 text-[15px]`}>Matrix Generator</Text>
          </View>
          
          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Base Distance (km)</Text>
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`}
              value={baseKm} onChangeText={setBaseKm} keyboardType="numeric"
            />
          </View>

          <View style={tw`flex-row gap-3 mb-4`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Reg. Base (₱)</Text>
              <TextInput style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={regBase} onChangeText={setRegBase} keyboardType="numeric" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Disc. Base (₱)</Text>
              <TextInput style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={discBase} onChangeText={setDiscBase} keyboardType="numeric" />
            </View>
          </View>

          <View style={tw`flex-row gap-3 mb-6`}>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Reg. Rate / km</Text>
              <TextInput style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={regRate} onChangeText={setRegRate} keyboardType="numeric" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Disc. Rate / km</Text>
              <TextInput style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium`} value={discRate} onChangeText={setDiscRate} keyboardType="numeric" />
            </View>
          </View>

          <TouchableOpacity onPress={confirmGenerateMatrix} style={tw`bg-[#1d4ed8] rounded-xl py-3.5 items-center shadow-sm`}>
            <Text style={tw`text-white font-bold text-[14px]`}>Generate Matrix</Text>
          </TouchableOpacity>

          <View style={tw`h-[1px] bg-slate-100 my-5`} />

          <TouchableOpacity onPress={confirmResetToBase} style={tw`border-2 border-slate-200 rounded-xl py-3.5 items-center flex-row justify-center bg-slate-50`}>
            <Ionicons name="refresh" size={16} color="#475569" style={tw`mr-2`} />
            <Text style={tw`text-slate-600 font-bold text-[13px]`}>Undo (Reset to Base)</Text>
          </TouchableOpacity>
        </View>

        {/* Snapshots */}
        <View style={tw`bg-white rounded-3xl p-5 mx-5 mb-6 shadow-sm border border-slate-200`}>
          <View style={tw`flex-row items-center mb-4`}>
            <Ionicons name="save" size={20} color="#1d4ed8" style={tw`mr-2`} />
            <Text style={tw`font-bold text-slate-800 text-[15px]`}>Snapshots (Rollback)</Text>
          </View>

          <View style={tw`mb-5`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Snapshot Label</Text>
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 font-medium mb-3`}
              placeholder="e.g. Before April rate change"
              value={snapshotLabel} onChangeText={setSnapshotLabel}
            />
            <TouchableOpacity onPress={confirmCreateSnapshot} style={tw`border-2 border-[#1d4ed8] rounded-xl py-3 items-center bg-blue-50`}>
              <Text style={tw`text-[#1d4ed8] font-bold text-[13px]`}>Create Snapshot</Text>
            </TouchableOpacity>
          </View>

          <View>
            <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Restore Snapshot</Text>
            {data?.snapshots && data.snapshots.length > 0 ? (
              <View style={tw`border border-slate-200 rounded-xl mb-3 overflow-hidden`}>
                <TouchableOpacity onPress={() => setIsSnapshotDropdownOpen(!isSnapshotDropdownOpen)} style={tw`p-3 bg-slate-50 flex-row justify-between items-center`}>
                  <Text style={tw`text-slate-800 text-[13px]`}>
                    {selectedSnapshot ? data.snapshots.find(s => s.snapshot_id === selectedSnapshot)?.label : 'Select snapshot...'}
                  </Text>
                  <Ionicons name={isSnapshotDropdownOpen ? "chevron-up" : "chevron-down"} size={16} color="#94a3b8" />
                </TouchableOpacity>
                {isSnapshotDropdownOpen && (
                  <View style={tw`bg-white max-h-40`}>
                    <ScrollView nestedScrollEnabled>
                      {data.snapshots.map(s => (
                        <TouchableOpacity 
                          key={s.snapshot_id} 
                          style={tw`p-3 border-t border-slate-100 ${selectedSnapshot === s.snapshot_id ? 'bg-blue-50' : ''}`}
                          onPress={() => {
                            setSelectedSnapshot(s.snapshot_id);
                            setIsSnapshotDropdownOpen(false);
                          }}
                        >
                          <Text style={tw`text-slate-800 text-[12px] font-medium`}>#{s.snapshot_id} — {s.label}</Text>
                          <Text style={tw`text-slate-400 text-[10px] mt-0.5`}>{s.created_at}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            ) : (
              <Text style={tw`text-slate-400 text-sm mb-3 px-1 font-medium`}>No snapshots found</Text>
            )}
            
            <TouchableOpacity 
              onPress={confirmRestoreSnapshot} 
              disabled={!selectedSnapshot}
              style={tw`border-2 border-slate-200 rounded-xl py-3 items-center ${selectedSnapshot ? 'bg-slate-50' : 'opacity-50'}`}
            >
              <Text style={tw`text-slate-600 font-bold text-[13px]`}>Restore Snapshot</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Route Fare Matrix */}
        <View style={tw`bg-white rounded-3xl overflow-hidden mb-6 shadow-sm border border-slate-200 mx-5`}>
          <View style={tw`bg-slate-50 p-5 border-b border-slate-200`}>
            <View style={tw`flex-row items-center mb-4`}>
              <Ionicons name="list" size={20} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`font-bold text-slate-800 text-[15px]`}>Route Fare Matrix</Text>
            </View>

            {/* Filter Inputs */}
            <View style={tw`mb-3`}>
              <View style={tw`mb-3 relative`}>
                <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5`}>Destination</Text>
                <TouchableOpacity 
                  onPress={() => setIsDestinationModalVisible(true)}
                  style={tw`bg-white border border-slate-200 rounded-xl px-4 py-3 flex-row justify-between items-center`}
                >
                  <Text style={tw`font-bold text-[13px] text-slate-800`}>
                    {data?.destinationsList?.find(d => String(d.stop_id) === String(currentDestination))?.location_name || 'Select Destination...'}
                  </Text>
                  <Ionicons name="chevron-down" size={16} color="#64748b" />
                </TouchableOpacity>

                <Modal visible={isDestinationModalVisible} transparent={true} animationType="fade">
                  <TouchableOpacity 
                    style={tw`flex-1 bg-black/50 justify-center items-center p-5`} 
                    activeOpacity={1} 
                    onPress={() => setIsDestinationModalVisible(false)}
                  >
                    <TouchableOpacity activeOpacity={1} style={tw`bg-white w-full rounded-2xl overflow-hidden max-h-[80%]`}>
                      <View style={tw`p-4 border-b border-slate-100 flex-row justify-between items-center bg-slate-50`}>
                        <Text style={tw`font-bold text-slate-800 text-[15px]`}>Select Destination</Text>
                        <TouchableOpacity onPress={() => setIsDestinationModalVisible(false)}>
                          <Ionicons name="close-circle" size={24} color="#94a3b8" />
                        </TouchableOpacity>
                      </View>
                      <ScrollView>
                        {data?.destinationsList?.map(d => (
                          <TouchableOpacity 
                            key={d.stop_id} 
                            onPress={() => {
                              setCurrentDestination(d.stop_id);
                              fetchData(d.stop_id, currentQuery);
                              setIsDestinationModalVisible(false);
                            }}
                            style={tw`px-5 py-4 border-b border-slate-100 flex-row justify-between items-center ${String(currentDestination) === String(d.stop_id) ? 'bg-blue-50' : 'bg-white'}`}
                          >
                            <Text style={tw`font-bold text-[14px] ${String(currentDestination) === String(d.stop_id) ? 'text-[#1d4ed8]' : 'text-slate-700'}`}>
                              {d.location_name}
                            </Text>
                            {String(currentDestination) === String(d.stop_id) && (
                              <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />
                            )}
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </TouchableOpacity>
                  </TouchableOpacity>
                </Modal>
              </View>

              <View style={tw`flex-row gap-2`}>
                <View style={tw`flex-1 relative justify-center`}>
                  <Ionicons name="search" size={16} color="#94a3b8" style={tw`absolute left-3 z-10`} />
                  <TextInput 
                    style={tw`bg-white border border-slate-200 rounded-xl pl-9 pr-3 py-2.5 text-[13px] text-slate-800 w-full`}
                    placeholder="Search origin..."
                    value={currentQuery} onChangeText={setCurrentQuery}
                  />
                </View>
                <TouchableOpacity onPress={handleFilterSubmit} style={tw`bg-[#1d4ed8] px-5 py-3 rounded-xl justify-center items-center`}>
                  <Text style={tw`text-white font-bold text-[13px]`}>Filter</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Table */}
          <View style={tw`bg-white`}>
            <View>
              {/* Header Row 1 */}
              <View style={tw`bg-slate-800 py-3 px-4 w-full items-center justify-center border-b border-slate-700`}>
                <Text style={tw`text-white font-black uppercase tracking-widest text-[14px]`}>
                  {loading ? 'LOADING...' : data ? `${data.farthestOriginName} - ${data.destName}` : 'SELECT DESTINATION'}
                </Text>
              </View>
              {/* Header Row 2 */}
              <View style={tw`flex-row bg-slate-100 border-b border-slate-300 w-full`}>
                <View style={tw`w-[12%] p-2 justify-center items-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>KM</Text>
                </View>
                <View style={tw`flex-1 p-2 justify-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Origin</Text>
                </View>
                <View style={tw`w-[22%] p-2 justify-center items-center border-r border-slate-300`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Reg. (₱)</Text>
                </View>
                <View style={tw`w-[22%] p-2 justify-center items-center`}>
                  <Text style={tw`text-[10px] font-bold text-slate-600 uppercase`}>Disc. (₱)</Text>
                </View>
              </View>

              {/* Rows */}
              {loading ? (
                <View style={tw`py-10 items-center justify-center w-full`}>
                  <ActivityIndicator size="small" color="#1d4ed8" />
                </View>
              ) : !data || data.fares.length === 0 ? (
                <View style={tw`py-10 items-center justify-center w-full bg-slate-50`}>
                  <Text style={tw`text-slate-500 font-medium text-[13px]`}>
                    {data ? 'No fares found for this search.' : 'Waiting for data...'}
                  </Text>
                </View>
              ) : (
                <>
                  <View style={tw`flex-row border-b border-slate-200 w-full`}>
                    <View style={tw`w-[12%] p-3 justify-center items-center border-r border-slate-200`}>
                      <Text style={tw`font-bold text-slate-600 text-[12px]`}>0</Text>
                    </View>
                    <View style={tw`flex-1 p-3 justify-center border-r border-slate-200`}>
                      <Text style={tw`font-bold text-slate-800 text-[12px] uppercase`} numberOfLines={1}>{data.destName}</Text>
                    </View>
                    <View style={tw`w-[22%] p-3 items-end justify-center border-r border-slate-200`}>
                      <Text style={tw`font-bold text-slate-400 text-[12px]`}>-</Text>
                    </View>
                    <View style={tw`w-[22%] p-3 items-end justify-center`}>
                      <Text style={tw`font-bold text-slate-400 text-[12px]`}>-</Text>
                    </View>
                  </View>
                  {data.fares.map((f, i) => (
                    <View key={i} style={tw`flex-row border-b border-slate-100 w-full`}>
                      <View style={tw`w-[12%] p-3 justify-center items-center border-r border-slate-100`}>
                        <Text style={tw`font-medium text-slate-600 text-[12px]`}>{Math.round(f.distance_km)}</Text>
                      </View>
                      <View style={tw`flex-1 p-3 justify-center border-r border-slate-100`}>
                        <Text style={tw`font-bold text-slate-700 text-[12px] uppercase`} numberOfLines={1}>{f.origin_name}</Text>
                      </View>
                      <View style={tw`w-[22%] p-3 items-end justify-center border-r border-slate-100 bg-slate-50/50`}>
                        <Text style={tw`font-mono font-bold text-slate-800 text-[12px]`} numberOfLines={1}>{Number(f.regular_fare).toFixed(2)}</Text>
                      </View>
                      <View style={tw`w-[22%] p-3 items-end justify-center bg-green-50/30`}>
                        <Text style={tw`font-mono font-bold text-green-700 text-[12px]`} numberOfLines={1}>{Number(f.discounted_fare).toFixed(2)}</Text>
                      </View>
                    </View>
                  ))}
                </>
              )}
            </View>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
