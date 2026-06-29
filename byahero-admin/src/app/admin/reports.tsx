import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';
import { IncidentReport } from '@/types';

export default function AdminReports() {
  const [reports, setReports] = useState<IncidentReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchReports = async () => {
    try {
      const data = await adminService.listReports();
      if (data.success) {
        setReports(data.reports || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch reports.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchReports();
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const data = await adminService.manageReports({
        action: 'update_status',
        id,
        status: newStatus
      });

      if (data.success) {
        Alert.alert('Success', data.message || 'Report status updated.');
        fetchReports();
      } else {
        Alert.alert('Error', data.error || 'Failed to update report status.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating status.');
    }
  };

  const executeDelete = async (id: number) => {
    Alert.alert(
      'Delete Report',
      'Are you sure you want to permanently delete this passenger report? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.manageReports({ action: 'delete_report', id });
              if (data.success) {
                Alert.alert('Success', data.message || 'Report deleted successfully.');
                fetchReports();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete report.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting report.');
            }
          }
        }
      ]
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true
    });
  };

  const promptStatusUpdate = (report: IncidentReport) => {
    Alert.alert(
      'Update Status',
      'Select new status for this report:',
      [
        { text: 'Pending', onPress: () => updateStatus(report.id, 'pending') },
        { text: 'Resolved', onPress: () => updateStatus(report.id, 'resolved') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="REPORTS" />

      <View style={tw`p-5 pb-2 flex-row items-center mb-2`}>
        <View style={tw`bg-blue-100 p-3 rounded-2xl mr-4`}>
          <Ionicons name="document-text" size={24} color="#0f3878" />
        </View>
        <View>
          <Text style={tw`text-xl font-extrabold text-[#0f3878] tracking-tight`}>Passenger Reports</Text>
          <Text style={tw`text-slate-500 text-[13px] mt-0.5`}>Review feedback and incident reports</Text>
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={tw`flex-1 justify-center items-center`}>
          <ActivityIndicator size="large" color="#1d4ed8" />
        </View>
      ) : (
        <ScrollView 
          contentContainerStyle={tw`p-5 pt-2`}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
        >
          {reports.length === 0 ? (
            <View style={tw`items-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm`}>
              <Ionicons name="warning-outline" size={48} color="#e2e8f0" style={tw`mb-4`} />
              <Text style={tw`text-slate-500 font-medium`}>No passenger reports submitted yet.</Text>
            </View>
          ) : (
            reports.map((report) => {
              const firstName = (report.reporter_name || report.user_name || 'Unknown User').split(' ')[0];
              const isResolved = report.status === 'resolved';

              return (
                <View key={report.id} style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 overflow-hidden`}>
                  {/* Status Indicator Bar */}
                  <View style={tw`absolute top-0 left-0 w-1.5 h-full ${isResolved ? 'bg-green-500' : 'bg-amber-500'}`} />
                  
                  {/* Header */}
                  <View style={tw`flex-row justify-between items-center border-b border-slate-100 pb-3 mb-4 pl-2`}>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name="warning" size={16} color="#1d4ed8" style={tw`mr-1.5`} />
                      <Text style={tw`text-[#1d4ed8] font-bold uppercase tracking-wider text-[13px]`}>
                        REPORT #{report.id}
                      </Text>
                    </View>
                    <Text style={tw`text-slate-500 text-[11px] font-medium`}>{formatDate(report.created_at)}</Text>
                  </View>

                  {/* Details Grid */}
                  <View style={tw`flex-col mb-5 pl-2`}>
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Reporter</Text>
                      <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100`}>
                        <Text style={tw`text-slate-800 text-[13px] font-bold`}>#{report.user_id || '?'} - {firstName}</Text>
                        <Text style={tw`text-slate-500 text-[11px] mt-0.5`}>{report.reporter_email || report.user_email || 'No email'}</Text>
                      </View>
                    </View>

                    <View style={tw`flex-row gap-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Bus Number</Text>
                        <View style={tw`bg-blue-50 rounded-xl p-3 border border-blue-100 flex-row items-center h-12`}>
                          <Ionicons name="bus" size={16} color="#1d4ed8" style={tw`mr-1.5 opacity-80`} />
                          <Text style={tw`text-[#1d4ed8] text-[14px] font-bold`}>{report.bus_number || 'N/A'}</Text>
                        </View>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Contact</Text>
                        <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center h-12`}>
                          {report.contact_number ? (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${report.contact_number}`)} style={tw`flex-row items-center`}>
                              <Ionicons name="call" size={14} color="#1d4ed8" style={tw`mr-1.5`} />
                              <Text style={tw`text-[#1d4ed8] font-bold text-[12px]`}>{report.contact_number}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={tw`text-slate-400 italic text-[12px]`}>None provided</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Report Reason */}
                  <View style={tw`mb-4 pl-2`}>
                    <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Report Reason / Category</Text>
                    <View style={tw`bg-red-50 rounded-xl p-3 border border-red-100`}>
                      <Text style={tw`text-red-700 text-[13px] font-bold`}>{report.report_reason || report.category || report.title}</Text>
                    </View>
                  </View>

                  {/* Additional Details */}
                  {(report.others_details || report.description) && (
                    <View style={tw`mb-5 pl-2`}>
                      <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Additional Details</Text>
                      <View style={tw`bg-slate-50 rounded-xl p-4 border border-slate-100`}>
                        <Text style={tw`text-slate-700 text-[13px] leading-5`}>{report.others_details || report.description}</Text>
                      </View>
                    </View>
                  )}

                  <View style={tw`h-[1px] bg-slate-100 my-4`} />

                  {/* Footer Actions */}
                  <View style={tw`flex-row justify-between items-center pl-2`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mr-2`}>Status:</Text>
                      <TouchableOpacity 
                        onPress={() => promptStatusUpdate(report)}
                        style={tw`flex-row items-center px-3 py-1.5 rounded-full border ${isResolved ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}
                      >
                        <Text style={tw`text-[12px] font-bold mr-1 ${isResolved ? 'text-green-700' : 'text-amber-700'}`}>
                          {isResolved ? 'Resolved' : 'Pending'}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color={isResolved ? '#15803d' : '#b45309'} />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      onPress={() => executeDelete(report.id)}
                      style={tw`bg-red-50 px-4 py-2 rounded-full flex-row items-center border border-red-100`}
                    >
                      <Ionicons name="trash" size={14} color="#dc2626" style={tw`mr-1`} />
                      <Text style={tw`text-red-600 font-bold text-[12px]`}>Delete</Text>
                    </TouchableOpacity>
                  </View>

                </View>
              );
            })
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
