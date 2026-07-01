import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, RefreshControl, Modal, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

interface StaffMember {
  id: number;
  email: string;
  name?: string;
  contacts?: string;
  created_at?: string;
  role: string;
}

export default function AdminConductors() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [expanded, setExpanded] = useState(true);

  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('conductor');
  const [showPassword, setShowPassword] = useState(false);
  const [saving, setSaving] = useState(false);

  // Modal states
  const [successModal, setSuccessModal] = useState({ visible: false, message: '', type: 'add' });
  const [deleteConfirmModal, setDeleteConfirmModal] = useState({ visible: false, id: 0, roleName: '', userEmail: '' });

  const fetchStaff = async () => {
    try {
      const data = await adminService.listStaff();
      if (data.success) {
        setStaff(data.staff || []);
      } else {
        setStaff([]);
      }
    } catch (e) {
      console.error(e);
      Alert.alert('Error', 'Failed to load staff list.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchStaff();
  };

  useEffect(() => {
    fetchStaff();
  }, []);

  const handleSave = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Error', 'Email and password are required.');
      return;
    }
    setSaving(true);
    try {
      const data = await adminService.addStaff({
        email,
        password,
        role
      });
      if (data.success) {
        setSuccessModal({ visible: true, message: `${email} has been added as a ${role}.`, type: 'add' });
        setEmail('');
        setPassword('');
        fetchStaff();
      } else {
        Alert.alert('Error', data.error || 'Failed to add user.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while adding user.');
    } finally {
      setSaving(false);
    }
  };

  const executeRemove = (id: number, roleName: string, userEmail: string) => {
    setDeleteConfirmModal({ visible: true, id, roleName, userEmail });
  };

  const confirmDelete = async () => {
    const { id, roleName, userEmail } = deleteConfirmModal;
    setDeleteConfirmModal({ visible: false, id: 0, roleName: '', userEmail: '' });
    try {
      const data = await adminService.deleteStaff(id, roleName);
      if (data.success) {
        setSuccessModal({ visible: true, message: `${userEmail} has been deleted.`, type: 'delete' });
        fetchStaff();
      } else {
        Alert.alert('Error', data.error || 'Failed to delete user.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while deleting user.');
    }
  };

  const toggleRole = () => {
    setRole(role === 'conductor' ? 'driver' : 'conductor');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Drivers & Conductors" />

      {/* Success Modal */}
      <Modal visible={successModal.visible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-5`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-lg`}>
            <View style={tw`w-16 h-16 ${successModal.type === 'delete' ? 'bg-red-100' : 'bg-green-100'} rounded-full items-center justify-center mb-4`}>
              <Ionicons name={successModal.type === 'delete' ? 'trash' : 'checkmark-circle'} size={40} color={successModal.type === 'delete' ? '#dc2626' : '#16a34a'} />
            </View>
            <Text style={tw`text-[#0f3878] text-xl font-black mb-2 text-center`}>
              {successModal.type === 'delete' ? 'Staff Deleted' : 'Staff Added'}
            </Text>
            <Text style={tw`text-slate-500 text-sm text-center font-medium mb-6`}>
              {successModal.message}
            </Text>
            <TouchableOpacity 
              onPress={() => setSuccessModal({ ...successModal, visible: false })} 
              style={tw`bg-[#1d4ed8] w-full py-3.5 rounded-full items-center shadow-sm`}
            >
              <Text style={tw`text-white font-bold tracking-wide`}>Okay</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirm Modal */}
      <Modal visible={deleteConfirmModal.visible} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-5`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[320px] items-center shadow-lg`}>
            <View style={tw`w-16 h-16 bg-orange-100 rounded-full items-center justify-center mb-4`}>
              <Ionicons name="warning" size={40} color="#ea580c" />
            </View>
            <Text style={tw`text-[#0f3878] text-xl font-black mb-2 text-center`}>Remove Staff?</Text>
            <Text style={tw`text-slate-500 text-sm text-center font-medium mb-6`}>
              Are you sure you want to permanently delete {deleteConfirmModal.userEmail}? This action cannot be undone.
            </Text>
            <View style={tw`flex-row w-full gap-3`}>
              <TouchableOpacity 
                onPress={() => setDeleteConfirmModal({ visible: false, id: 0, roleName: '', userEmail: '' })} 
                style={tw`flex-1 py-3.5 bg-slate-200 rounded-full items-center shadow-sm`}
              >
                <Text style={tw`text-slate-700 font-bold tracking-wide`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                onPress={confirmDelete} 
                style={tw`flex-1 py-3.5 bg-red-600 rounded-full items-center shadow-sm`}
              >
                <Text style={tw`text-white font-bold tracking-wide`}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ScrollView 
        contentContainerStyle={tw`p-5 pb-10`}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#1d4ed8" />}
      >
        <Text style={tw`text-[#0f172a] text-center text-xl font-bold mt-2 mb-4`}>
          New Conductor & Driver
        </Text>

        {/* Form Card */}
        <View style={tw`bg-white rounded-3xl p-5 shadow-sm border border-slate-100 mb-6`}>
          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold tracking-wide mb-1 ml-1`}>First Name</Text>
            <TextInput
              style={tw`w-full bg-slate-100 border-0 rounded-xl px-4 py-2.5 text-slate-400`}
              placeholder="First Name"
              placeholderTextColor="#94a3b8"
              editable={false}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold tracking-wide mb-1 ml-1`}>Last name</Text>
            <TextInput
              style={tw`w-full bg-slate-100 border-0 rounded-xl px-4 py-2.5 text-slate-400`}
              placeholder="Last name"
              placeholderTextColor="#94a3b8"
              editable={false}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold tracking-wide mb-1 ml-1`}>Email</Text>
            <TextInput
              style={tw`w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 text-slate-800 font-medium`}
              placeholder="staff@byahero.com"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[10px] font-bold tracking-wide mb-1 ml-1`}>Password</Text>
            <View style={tw`relative flex-row items-center`}>
              <TextInput
                style={tw`w-full bg-white border border-slate-300 rounded-xl pl-4 pr-12 py-2.5 text-slate-800 font-medium`}
                placeholder="********"
                placeholderTextColor="#94a3b8"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={tw`absolute right-4 p-1`}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Image source={showPassword ? require('../../../assets/images/pass.svg') : require('../../../assets/images/hash.svg')} style={[tw`w-4 h-4`, { tintColor: '#94a3b8' }]} />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`mb-8`}>
            <TouchableOpacity 
              style={tw`w-full bg-white border border-slate-300 rounded-xl px-4 py-2.5 flex-row justify-between items-center`}
              onPress={toggleRole}
            >
              <Text style={tw`text-slate-800 font-medium capitalize text-[13px]`}>{role}</Text>
              <Ionicons name="chevron-down" size={16} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={tw`items-center`}>
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full px-8 py-2.5 flex-row items-center justify-center shadow-sm w-[140px] ${saving ? 'opacity-70' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
              <Text style={tw`font-bold text-[13px] text-white`}>Save</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Registered Staff Section */}
        <View style={tw`w-full max-w-[420px] mx-auto`}>
          <TouchableOpacity 
            style={tw`w-full flex-row justify-between items-center py-2 mb-2 px-1`}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={tw`font-bold text-[#0f172a] text-[15px]`}>Registered Staff</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={18} color="#64748b" />
          </TouchableOpacity>

          {expanded && (
            <View style={tw`bg-white rounded-3xl shadow-sm border border-slate-200 overflow-hidden mb-6`}>
              {loading && !refreshing ? (
                <View style={tw`py-12 items-center`}>
                  <ActivityIndicator size="small" color="#94a3b8" />
                </View>
              ) : staff.length === 0 ? (
                <View style={tw`py-10 items-center`}>
                  <Text style={tw`text-slate-400 text-[14px]`}>No staff accounts found.</Text>
                </View>
              ) : (
                <View>
                  {staff.map((u, idx) => (
                    <View key={idx} style={tw`flex-row justify-between items-center p-4 border-b border-slate-50`}>
                      <View style={tw`flex-1 pr-3`}>
                        <Text style={tw`font-extrabold text-slate-800 text-[13px]`} numberOfLines={1}>{u.email}</Text>
                        {(u.name || u.created_at) && (
                          <Text style={tw`text-slate-400 text-[10px] mt-0.5`} numberOfLines={1}>
                            {u.name || u.created_at}
                          </Text>
                        )}
                      </View>

                      <View style={tw`flex-row items-center gap-2`}>
                        <View style={tw`bg-slate-100 px-2 py-1 rounded-full`}>
                          <Text style={tw`text-slate-600 text-[9px] font-bold uppercase tracking-wider`}>{u.role}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={tw`bg-red-600 rounded-full px-3 py-1.5 flex-row items-center shadow-sm`}
                          onPress={() => executeRemove(u.id, u.role, u.email)}
                        >
                          <Text style={tw`font-bold text-[10px] text-white`}>Remove</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
