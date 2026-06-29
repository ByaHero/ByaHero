import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, RefreshControl, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface PassengerFeedback {
  id: number;
  created_at: string;
  rating: number;
  passenger_name?: string;
  name?: string;
  user_id?: number;
  passenger_email?: string;
  user_email?: string;
  feedback_text?: string;
  message?: string;
}

interface FeedbackStats {
  totalFeedbacks: number;
  averageRating: number;
  totalComments: number;
}

export default function AdminFeedback() {
  const [feedbacks, setFeedbacks] = useState<PassengerFeedback[]>([]);
  const [stats, setStats] = useState<FeedbackStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchFeedbacks = async () => {
    try {
      const data = await adminService.listFeedbacks();
      if (data.success) {
        const fbList = data.feedbacks || [];
        setFeedbacks(fbList);
        
        // Calculate stats manually if API doesn't provide them, 
        // since original native might not have totalFeedbacks in root.
        if (data.totalFeedbacks !== undefined) {
          setStats({
            totalFeedbacks: data.totalFeedbacks,
            averageRating: parseFloat(data.averageRating || "0"),
            totalComments: data.totalComments
          });
        } else if (fbList.length > 0) {
          const avg = fbList.reduce((acc: number, curr: any) => acc + (curr.rating || 0), 0) / fbList.length;
          setStats({
            totalFeedbacks: fbList.length,
            averageRating: avg,
            totalComments: fbList.filter((f: any) => f.feedback_text || f.message).length
          });
        } else {
          setStats(null);
        }
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to fetch feedbacks.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchFeedbacks();
  };

  useEffect(() => {
    fetchFeedbacks();
  }, []);

  const executeDelete = async (id: number) => {
    Alert.alert(
      'Delete Feedback',
      'Are you sure you want to permanently delete this passenger feedback? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.deleteFeedback(id);
              if (data.success) {
                Alert.alert('Success', 'Feedback deleted successfully.');
                fetchFeedbacks();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete feedback.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting feedback.');
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

  const renderStars = (rating: number, size = 18) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      if (i <= Math.round(rating)) {
        stars.push(<Ionicons key={i} name="star" size={size} color="#facc15" style={tw`mr-0.5`} />);
      } else {
        stars.push(<Ionicons key={i} name="star" size={size} color="#e2e8f0" style={tw`mr-0.5`} />);
      }
    }
    return <View style={tw`flex-row items-center`}>{stars}</View>;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="FEEDBACKS" />

      <View style={tw`p-5 pb-2 flex-row items-center mb-2`}>
        <View style={tw`bg-blue-100 p-3 rounded-2xl mr-4`}>
          <Ionicons name="chatbubbles" size={24} color="#0f3878" />
        </View>
        <View>
          <Text style={tw`text-xl font-extrabold text-[#0f3878] tracking-tight`}>Passenger Feedbacks</Text>
          <Text style={tw`text-slate-500 text-[13px] mt-0.5`}>Review commuter ratings and comments</Text>
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
          {/* Summary Stats */}
          {stats && (
            <View style={tw`mb-6`}>
              <View style={tw`flex-row justify-between mb-2 gap-3`}>
                <View style={tw`flex-1 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex-row items-center`}>
                  <Text style={tw`text-3xl font-extrabold text-[#1d4ed8] mr-3`}>{stats.averageRating.toFixed(1)}</Text>
                  <View>
                    <Text style={tw`text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1`}>Avg Rating</Text>
                    <View style={tw`flex-row items-center flex-wrap`}>
                      {renderStars(stats.averageRating, 12)}
                      <Text style={tw`ml-1 text-slate-400 text-[9px] font-medium`}>({stats.totalFeedbacks})</Text>
                    </View>
                  </View>
                </View>

                <View style={tw`flex-1 p-4 bg-white rounded-3xl border border-slate-200 shadow-sm flex-row items-center`}>
                  <View style={tw`bg-blue-50 p-2.5 rounded-2xl mr-3`}>
                    <Ionicons name="chatbubbles" size={20} color="#1d4ed8" />
                  </View>
                  <View>
                    <Text style={tw`text-slate-500 text-[9px] font-bold uppercase tracking-wider mb-1`}>Comments</Text>
                    <Text style={tw`text-xl font-extrabold text-slate-800`}>{stats.totalComments}</Text>
                  </View>
                </View>
              </View>
              <View style={tw`h-[1px] bg-slate-200 mt-4 mb-2`} />
            </View>
          )}

          {feedbacks.length === 0 ? (
            <View style={tw`bg-white rounded-3xl p-10 items-center shadow-sm border border-slate-100`}>
              <Ionicons name="chatbox-ellipses-outline" size={48} color="#e2e8f0" style={tw`mb-4`} />
              <Text style={tw`text-slate-500 font-medium`}>No feedbacks submitted yet.</Text>
            </View>
          ) : (
            <View style={tw`mb-6`}>
              {feedbacks.map((fb) => {
                const firstName = (fb.passenger_name || fb.name || 'Unknown User').split(' ')[0];
                const feedbackText = fb.feedback_text || fb.message;

                return (
                  <View key={fb.id} style={tw`bg-white rounded-3xl p-5 mb-4 shadow-sm border border-slate-200`}>
                    {/* Header */}
                    <View style={tw`flex-row justify-between items-center border-b border-slate-100 pb-3 mb-4`}>
                      <View style={tw`flex-row items-center`}>
                        <Ionicons name="chatbox" size={16} color="#1d4ed8" style={tw`mr-1.5`} />
                        <Text style={tw`text-[#1d4ed8] font-bold uppercase tracking-wider text-[13px]`}>
                          FEEDBACK #{fb.id}
                        </Text>
                      </View>
                      <Text style={tw`text-slate-500 text-[11px] font-medium`}>{formatDate(fb.created_at)}</Text>
                    </View>

                    {/* Details Grid */}
                    <View style={tw`flex-col mb-4`}>
                      <View style={tw`mb-3`}>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Passenger</Text>
                        <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100`}>
                          <Text style={tw`text-slate-800 text-[13px] font-bold`}>#{fb.user_id || '?'} - {firstName}</Text>
                          <Text style={tw`text-slate-500 text-[11px] mt-0.5`}>{fb.passenger_email || fb.user_email || 'No email provided'}</Text>
                        </View>
                      </View>

                      <View>
                        <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Rating</Text>
                        <View style={tw`bg-slate-50 rounded-xl p-3 border border-slate-100 flex-row items-center min-h-[44px]`}>
                          {renderStars(fb.rating, 20)}
                        </View>
                      </View>
                    </View>

                    {/* Comments */}
                    <View style={tw`mb-2`}>
                      <Text style={tw`text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1`}>Comments</Text>
                      {feedbackText && feedbackText.trim() !== '' ? (
                        <View style={tw`bg-slate-50 rounded-xl p-4 border border-slate-100`}>
                          <Text style={tw`text-slate-700 text-[13px] leading-5`}>{feedbackText}</Text>
                        </View>
                      ) : (
                        <View style={tw`bg-slate-50 rounded-xl p-4 border border-slate-100`}>
                          <Text style={tw`text-slate-400 italic text-[13px]`}>No additional comments.</Text>
                        </View>
                      )}
                    </View>

                    <View style={tw`h-[1px] bg-slate-100 my-4`} />

                    {/* Footer Actions */}
                    <View style={tw`flex-row justify-end items-center`}>
                      <TouchableOpacity 
                        onPress={() => executeDelete(fb.id)}
                        style={tw`bg-red-50 px-4 py-2 rounded-full flex-row items-center border border-red-100`}
                      >
                        <Ionicons name="trash" size={14} color="#dc2626" style={tw`mr-1`} />
                        <Text style={tw`text-red-600 font-bold text-[12px]`}>Delete</Text>
                      </TouchableOpacity>
                    </View>

                  </View>
                );
              })}
            </View>
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
