import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Alert, Modal, Image, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface LostFoundTicket {
  id: number;
  type: 'lost' | 'found';
  status: 'open' | 'resolved' | 'closed';
  created_at: string;
  reporter_name?: string;
  user_id?: number;
  reporter_contact?: string;
  bus_number?: string;
  item_description: string;
  image1_path?: string;
  image2_path?: string;
}

// In a real app, this should match your backend config
const SERVER_URL = 'https://byahero.alwaysdata.net';

export default function AdminLostFound() {
  const [tickets, setTickets] = useState<LostFoundTicket[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [imageModal, setImageModal] = useState<{ isOpen: boolean; src: string }>({ isOpen: false, src: '' });

  const fetchTickets = async () => {
    try {
      const data = await adminService.listLostAndFound();
      if (data.success) {
        setTickets(data.tickets || []);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch tickets.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchTickets();
  };

  useEffect(() => {
    fetchTickets();
  }, []);

  const updateStatus = async (id: number, newStatus: string) => {
    try {
      const data = await adminService.manageLostAndFound({
        action: 'update_status',
        id,
        status: newStatus
      });

      if (data.success) {
        Alert.alert('Success', data.message || 'Ticket status updated.');
        fetchTickets();
      } else {
        Alert.alert('Error', data.error || 'Failed to update ticket status.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating status.');
    }
  };

  const executeDelete = (id: number) => {
    Alert.alert(
      'Delete Ticket',
      'Are you sure you want to permanently delete this lost & found ticket? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.manageLostAndFound({ action: 'delete_ticket', id });
              if (data.success) {
                Alert.alert('Success', data.message || 'Ticket deleted successfully.');
                fetchTickets();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete ticket.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting ticket.');
            }
          }
        }
      ]
    );
  };

  const promptStatusUpdate = (ticket: LostFoundTicket) => {
    Alert.alert(
      'Update Status',
      'Select new status for this ticket:',
      [
        { text: 'Open', onPress: () => updateStatus(ticket.id, 'open') },
        { text: 'Resolved', onPress: () => updateStatus(ticket.id, 'resolved') },
        { text: 'Closed', onPress: () => updateStatus(ticket.id, 'closed') },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const getImageUrl = (path?: string) => {
    if (!path) return '';
    return path.startsWith('http') ? path : `${SERVER_URL}/${path}`;
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

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="LOST & FOUND" />

      <View style={tw`p-5 pb-2 mb-2`}>
        <Text style={tw`text-xl font-extrabold text-[#0f3878] tracking-tight`}>Lost & Found Board</Text>
        <Text style={tw`text-slate-500 text-[13px] mt-0.5`}>Manage reported lost and found items</Text>
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
          {tickets.length === 0 ? (
            <View style={tw`items-center py-10 bg-white rounded-3xl border border-slate-100 shadow-sm`}>
              <Ionicons name="archive-outline" size={48} color="#e2e8f0" style={tw`mb-4`} />
              <Text style={tw`text-slate-500 font-medium`}>No items reported yet.</Text>
            </View>
          ) : (
            tickets.map((ticket) => {
              const isLost = ticket.type === 'lost';
              const iconName = isLost ? 'search' : 'archive';
              const typeColor = isLost ? 'text-red-600' : 'text-green-600';
              const typeColorHex = isLost ? '#dc2626' : '#16a34a';
              const firstName = (ticket.reporter_name || 'Unknown User').split(' ')[0];

              return (
                <View key={ticket.id} style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200`}>
                  {/* Header */}
                  <View style={tw`flex-row justify-between items-center border-b border-slate-100 pb-3 mb-4`}>
                    <View style={tw`flex-row items-center`}>
                      <Ionicons name={iconName} size={16} color={typeColorHex} style={tw`mr-1.5`} />
                      <Text style={tw`${typeColor} font-bold uppercase tracking-wider text-[13px]`}>
                        {ticket.type} ITEM
                      </Text>
                    </View>
                    <Text style={tw`text-slate-500 text-[11px] font-medium`}>{formatDate(ticket.created_at)}</Text>
                  </View>

                  {/* Details Grid */}
                  <View style={tw`flex-col mb-4`}>
                    <View style={tw`mb-3`}>
                      <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Reporter</Text>
                      <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100`}>
                        <Text style={tw`text-slate-800 text-[13px] font-bold`}>#{ticket.user_id || '?'} - {firstName}</Text>
                      </View>
                    </View>

                    <View style={tw`flex-row gap-3`}>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Contact</Text>
                        <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center h-12`}>
                          {ticket.reporter_contact && ticket.reporter_contact !== 'None provided' ? (
                            <TouchableOpacity onPress={() => Linking.openURL(`tel:${ticket.reporter_contact}`)} style={tw`flex-row items-center`}>
                              <Ionicons name="call" size={14} color="#1d4ed8" style={tw`mr-1.5`} />
                              <Text style={tw`text-[#1d4ed8] font-bold text-[11px]`} numberOfLines={1}>{ticket.reporter_contact}</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={tw`text-slate-400 italic text-[11px]`}>No contact</Text>
                          )}
                        </View>
                      </View>
                      <View style={tw`flex-1`}>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Bus #</Text>
                        <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center h-12`}>
                          {ticket.bus_number ? (
                            <Text style={tw`text-slate-800 font-bold text-[13px]`}>{ticket.bus_number}</Text>
                          ) : (
                            <Text style={tw`text-slate-400 italic text-[12px]`}>Not specified</Text>
                          )}
                        </View>
                      </View>
                    </View>
                  </View>

                  {/* Description */}
                  <View style={tw`mb-4`}>
                    <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Item Description</Text>
                    <View style={tw`bg-slate-50 rounded-xl p-4 border border-slate-100`}>
                      <Text style={tw`text-slate-700 text-[13px] leading-5`}>{ticket.item_description}</Text>
                    </View>
                  </View>

                  {/* Attached Photos */}
                  {(ticket.image1_path || ticket.image2_path) && (
                    <View style={tw`mb-4`}>
                      <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2`}>Attached Photos</Text>
                      <View style={tw`flex-row gap-3`}>
                        {ticket.image1_path && (
                          <TouchableOpacity 
                            onPress={() => setImageModal({ isOpen: true, src: getImageUrl(ticket.image1_path) })}
                            style={tw`w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100`}
                          >
                            <Image source={{ uri: getImageUrl(ticket.image1_path) }} style={tw`w-full h-full`} />
                          </TouchableOpacity>
                        )}
                        {ticket.image2_path && (
                          <TouchableOpacity 
                            onPress={() => setImageModal({ isOpen: true, src: getImageUrl(ticket.image2_path) })}
                            style={tw`w-20 h-20 rounded-2xl overflow-hidden border border-slate-200 bg-slate-100`}
                          >
                            <Image source={{ uri: getImageUrl(ticket.image2_path) }} style={tw`w-full h-full`} />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  )}

                  <View style={tw`h-[1px] bg-slate-100 my-4`} />

                  {/* Footer Actions */}
                  <View style={tw`flex-row justify-between items-center`}>
                    <View style={tw`flex-row items-center`}>
                      <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mr-2`}>Status:</Text>
                      <TouchableOpacity 
                        onPress={() => promptStatusUpdate(ticket)}
                        style={tw`flex-row items-center px-3 py-1.5 rounded-full border bg-slate-50 border-slate-200`}
                      >
                        <Text style={tw`text-[12px] font-bold mr-1 text-slate-800 capitalize`}>
                          {ticket.status || 'Open'}
                        </Text>
                        <Ionicons name="chevron-down" size={14} color="#64748b" />
                      </TouchableOpacity>
                    </View>

                    <TouchableOpacity 
                      onPress={() => executeDelete(ticket.id)}
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

      {/* Image Viewer Modal */}
      <Modal visible={imageModal.isOpen} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/90 justify-center items-center`}>
          <TouchableOpacity 
            style={tw`absolute top-10 right-6 z-50 bg-white/20 p-2 rounded-full`}
            onPress={() => setImageModal({ isOpen: false, src: '' })}
          >
            <Ionicons name="close" size={24} color="white" />
          </TouchableOpacity>
          {imageModal.src ? (
            <Image 
              source={{ uri: imageModal.src }} 
              style={tw`w-full h-full`} 
              resizeMode="contain" 
            />
          ) : null}
        </View>
      </Modal>

    </SafeAreaView>
  );
}
