import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, Alert, ActivityIndicator, Platform, Modal, Pressable } from 'react-native';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { getServerUrl } from '../../services/authService';
import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';

interface StaffMember {
  id: number;
  email: string;
  name?: string;
  contacts?: string;
  created_at?: string;
  role: string;
}

export default function ConductorsPage() {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(true);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [expanded, setExpanded] = useState(true);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('conductor');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [roleModalVisible, setRoleModalVisible] = useState(false);
  const [successModalVisible, setSuccessModalVisible] = useState(false);
  const [successData, setSuccessData] = useState({ email: '', role: '' });
  
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [deleteSuccessVisible, setDeleteSuccessVisible] = useState(false);
  const [deletedUserEmail, setDeletedUserEmail] = useState('');
  const [userToDelete, setUserToDelete] = useState<{ id: number, role: string, email: string } | null>(null);

  const fetchStaff = useCallback(async () => {
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/staff`, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        credentials: 'include',
      });
      const data = await response.json();
      if (data.success) {
        setStaff(data.staff || []);
      }
    } catch (error) {
      console.error('Error fetching staff:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const handleSave = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    setSaving(true);
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/staff`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'add_user', email, password, role })
      });
      const data = await response.json();
      if (data.success) {
        setSuccessData({ email, role });
        setSuccessModalVisible(true);
        setEmail('');
        setPassword('');
        fetchStaff();
      } else {
        Alert.alert('Error', data.error || 'Failed to add user.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while adding user.');
    } finally {
      setSaving(false);
    }
  };

  const confirmRemove = (id: number, role: string, email: string) => {
    setUserToDelete({ id, role, email });
    setDeleteConfirmVisible(true);
  };

  const executeRemove = async () => {
    if (!userToDelete) return;
    try {
      const baseUrl = await getServerUrl();
      const response = await fetch(`${baseUrl}/api/admin/staff`, {
        method: 'POST',
        headers: { 
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action: 'delete_user', id: userToDelete.id, role: userToDelete.role })
      });
      const data = await response.json();
      if (data.success) {
        setDeletedUserEmail(userToDelete.email);
        setDeleteConfirmVisible(false);
        setUserToDelete(null);
        setDeleteSuccessVisible(true);
        fetchStaff();
      } else {
        Alert.alert('Error', data.error || 'Failed to delete user.');
      }
    } catch (error) {
      Alert.alert('Error', 'Network error while deleting user.');
    }
  };

  return (
    <View style={tw`flex-1 bg-slate-50`}>
      <ScrollView 
        contentContainerStyle={[tw`p-4`, { paddingTop: insets.top + 70, paddingBottom: 60, flexGrow: 1 }]}
        showsVerticalScrollIndicator={false}
      >
        <Text style={tw`text-[#0f172a] text-center text-[20px] font-bold mt-2 mb-4`}>
          New Conductor & Driver
        </Text>

        {/* Form Card */}
        <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6`}>
          
          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[12px] font-bold mb-1.5`}>First Name</Text>
            <TextInput
              style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400`}
              placeholder="First Name"
              placeholderTextColor="#94a3b8"
              editable={false}
              value=""
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[12px] font-bold mb-1.5`}>Last name</Text>
            <TextInput
              style={tw`bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400`}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
              editable={false}
              value=""
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[12px] font-bold mb-1.5`}>Email</Text>
            <TextInput
              style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800`}
              placeholder="staff@byahero.com"
              placeholderTextColor="#94a3b8"
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[12px] font-bold mb-1.5`}>Password</Text>
            <View style={tw`flex-row items-center bg-white border border-slate-300 rounded-xl pr-2`}>
              <TextInput
                style={tw`flex-1 px-4 py-3 text-slate-800`}
                placeholder="********"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity onPress={() => setShowPassword(!showPassword)} style={tw`p-2`}>
                <Image 
                  source={showPassword ? require('../../../assets/images/images/pass.svg') : require('../../../assets/images/images/hash.svg')}
                  style={{ width: 22, height: 22 }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-slate-500 text-[12px] font-bold mb-1.5`}>Role</Text>
            <TouchableOpacity 
              style={tw`bg-white border border-slate-300 rounded-xl px-4 py-3 flex-row justify-between items-center`}
              onPress={() => setRoleModalVisible(true)}
              activeOpacity={0.7}
            >
              <Text style={tw`text-slate-800 text-[15px]`}>
                {role === 'conductor' ? 'Conductor' : 'Driver'}
              </Text>
              <Ionicons name="chevron-down" size={18} color="#64748b" />
            </TouchableOpacity>
          </View>

          <View style={tw`items-center`}>
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full px-10 py-3 flex-row items-center shadow-sm w-full justify-center max-w-[200px]`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
              <Text style={tw`text-white font-bold text-[15px]`}>Save</Text>
            </TouchableOpacity>
          </View>

        </View>

        {/* Registered Staff Section */}
        <View style={tw`mx-auto w-full max-w-[420px]`}>
          <TouchableOpacity 
            style={tw`flex-row justify-between items-center py-2 mb-2`}
            onPress={() => setExpanded(!expanded)}
            activeOpacity={0.7}
          >
            <Text style={tw`font-bold text-[#0f172a] text-[15px]`}>Registered Staff</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
          </TouchableOpacity>

          {expanded && (
            <View style={tw`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6`}>
              {loading ? (
                <View style={tw`py-8 items-center`}>
                  <ActivityIndicator size="small" color="#64748b" />
                </View>
              ) : staff.length === 0 ? (
                <View style={tw`py-8 items-center`}>
                  <Text style={tw`text-slate-400 text-[14px]`}>No staff accounts found.</Text>
                </View>
              ) : (
                staff.map((u, idx) => (
                  <View key={idx} style={tw`flex-row justify-between items-center p-4 ${idx !== staff.length - 1 ? 'border-b border-slate-100' : ''}`}>
                    <View style={tw`flex-1 pr-2`}>
                      <Text style={tw`font-bold text-slate-800 text-[14px]`} numberOfLines={1}>{u.email}</Text>
                      {u.name || u.created_at ? (
                        <Text style={tw`text-slate-400 text-[12px] mt-0.5`}>{u.name || u.created_at}</Text>
                      ) : null}
                    </View>

                    <View style={tw`flex-row items-center gap-2`}>
                      <View style={tw`bg-slate-100 px-2 py-1 rounded-full`}>
                        <Text style={tw`text-slate-700 text-[10px] font-bold uppercase`}>{u.role}</Text>
                      </View>
                      
                      <TouchableOpacity 
                        style={tw`bg-red-600 rounded-full px-3 py-1.5`}
                        onPress={() => confirmRemove(u.id, u.role, u.email)}
                      >
                        <Text style={tw`text-white font-bold text-[11px]`}>Remove</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))
              )}
            </View>
          )}
        </View>

      </ScrollView>

      {/* Role Picker Modal */}
      <Modal visible={roleModalVisible} transparent animationType="slide">
        <View style={tw`flex-1 justify-end bg-black/40`}>
          <Pressable style={tw`flex-1`} onPress={() => setRoleModalVisible(false)} />
          <View style={tw`bg-white rounded-t-3xl overflow-hidden pb-8`}>
            <View style={tw`p-5 border-b border-slate-100 flex-row justify-between items-center bg-slate-50`}>
              <Text style={tw`text-slate-900 font-extrabold text-[16px]`}>Select Role</Text>
              <TouchableOpacity onPress={() => setRoleModalVisible(false)} style={tw`p-1`}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>
            <View style={tw`px-4 py-2`}>
              <TouchableOpacity 
                style={tw`py-4 border-b border-slate-100 flex-row justify-between items-center ${role === 'conductor' ? 'bg-blue-50/30' : ''}`}
                onPress={() => { setRole('conductor'); setRoleModalVisible(false); }}
              >
                <Text style={tw`text-[15px] flex-1 ${role === 'conductor' ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>Conductor</Text>
                {role === 'conductor' && <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />}
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`py-4 border-b border-slate-100 flex-row justify-between items-center ${role === 'driver' ? 'bg-blue-50/30' : ''}`}
                onPress={() => { setRole('driver'); setRoleModalVisible(false); }}
              >
                <Text style={tw`text-[15px] flex-1 ${role === 'driver' ? 'text-[#1d4ed8] font-bold' : 'text-slate-700 font-medium'}`}>Driver</Text>
                {role === 'driver' && <Ionicons name="checkmark-circle" size={20} color="#1d4ed8" />}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Success Modal */}
      <Modal visible={successModalVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black/40 px-4`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-xl`}>
            <View style={tw`bg-green-100 rounded-full p-3 mb-4`}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={tw`text-slate-900 font-extrabold text-[18px] mb-2 text-center`}>
              Successfully Added!
            </Text>
            <Text style={tw`text-slate-500 text-[14px] text-center mb-6`}>
              <Text style={tw`font-bold text-slate-700`}>{successData.email}</Text> has been added as a <Text style={tw`font-bold text-[#1d4ed8] uppercase`}>{successData.role}</Text>.
            </Text>
            
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full py-3 px-8 w-full items-center`}
              onPress={() => setSuccessModalVisible(false)}
            >
              <Text style={tw`text-white font-bold text-[15px]`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal visible={deleteConfirmVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black/40 px-4`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-xl`}>
            <View style={tw`bg-red-100 rounded-full p-3 mb-4`}>
              <Ionicons name="warning" size={48} color="#dc2626" />
            </View>
            <Text style={tw`text-slate-900 font-extrabold text-[18px] mb-2 text-center`}>
              Confirm Deletion
            </Text>
            <Text style={tw`text-slate-500 text-[14px] text-center mb-6`}>
              Are you sure you want to remove <Text style={tw`font-bold text-slate-700`}>{userToDelete?.email}</Text>? This action cannot be undone.
            </Text>
            
            <View style={tw`flex-row w-full gap-3`}>
              <TouchableOpacity 
                style={tw`flex-1 bg-slate-100 rounded-full py-3 items-center`}
                onPress={() => setDeleteConfirmVisible(false)}
              >
                <Text style={tw`text-slate-600 font-bold text-[14px]`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`flex-1 bg-red-600 rounded-full py-3 items-center`}
                onPress={executeRemove}
              >
                <Text style={tw`text-white font-bold text-[14px]`}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Success Modal */}
      <Modal visible={deleteSuccessVisible} transparent animationType="fade">
        <View style={tw`flex-1 justify-center items-center bg-black/40 px-4`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-xl`}>
            <View style={tw`bg-green-100 rounded-full p-3 mb-4`}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
            </View>
            <Text style={tw`text-slate-900 font-extrabold text-[18px] mb-2 text-center`}>
              Successfully Removed!
            </Text>
            <Text style={tw`text-slate-500 text-[14px] text-center mb-6`}>
              <Text style={tw`font-bold text-slate-700`}>{deletedUserEmail}</Text> has been completely removed from the system.
            </Text>
            
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full py-3 px-8 w-full items-center`}
              onPress={() => setDeleteSuccessVisible(false)}
            >
              <Text style={tw`text-white font-bold text-[15px]`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}
