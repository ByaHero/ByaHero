import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, RefreshControl } from 'react-native';
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
        Alert.alert('Success', `${email} has been added as a ${role.toUpperCase()}.`);
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
    Alert.alert(
      'Confirm Deletion',
      `Are you sure you want to remove ${userEmail}? This action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Remove', 
          style: 'destructive',
          onPress: async () => {
            try {
              const data = await adminService.deleteStaff(id, roleName);
              if (data.success) {
                Alert.alert('Success', 'User has been completely removed from the system.');
                fetchStaff();
              } else {
                Alert.alert('Error', data.error || 'Failed to delete user.');
              }
            } catch (e) {
              Alert.alert('Error', 'Network error while deleting user.');
            }
          }
        }
      ]
    );
  };

  const toggleRole = () => {
    setRole(role === 'conductor' ? 'driver' : 'conductor');
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="PERSONNEL" />

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
            <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-1`}>First Name</Text>
            <TextInput
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400`}
              placeholder="First Name"
              editable={false}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-1`}>Last Name</Text>
            <TextInput
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-400`}
              placeholder="Last Name"
              editable={false}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-1`}>Email</Text>
            <TextInput
              style={tw`w-full bg-white border border-slate-300 rounded-xl px-4 py-3 text-slate-800 font-medium`}
              placeholder="staff@byahero.com"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
            />
          </View>

          <View style={tw`mb-4`}>
            <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-1`}>Password</Text>
            <View style={tw`relative flex-row items-center`}>
              <TextInput
                style={tw`w-full bg-white border border-slate-300 rounded-xl pl-4 pr-12 py-3 text-slate-800 font-medium`}
                placeholder="********"
                secureTextEntry={!showPassword}
                value={password}
                onChangeText={setPassword}
              />
              <TouchableOpacity 
                style={tw`absolute right-4 p-1`}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Ionicons name={showPassword ? "eye-off" : "eye"} size={20} color="#94a3b8" />
              </TouchableOpacity>
            </View>
          </View>

          <View style={tw`mb-8`}>
            <Text style={tw`text-slate-500 text-[11px] font-bold uppercase tracking-wider mb-1.5 ml-1`}>Role</Text>
            <TouchableOpacity 
              style={tw`w-full bg-white border border-slate-300 rounded-xl px-4 py-3 flex-row justify-between items-center`}
              onPress={toggleRole}
            >
              <Text style={tw`text-slate-800 font-medium capitalize`}>{role}</Text>
              <Ionicons name="swap-vertical" size={18} color="#94a3b8" />
            </TouchableOpacity>
          </View>

          <View style={tw`items-center`}>
            <TouchableOpacity 
              style={tw`bg-[#1d4ed8] rounded-full px-10 py-3.5 flex-row items-center justify-center shadow-sm w-[200px] ${saving ? 'opacity-70' : ''}`}
              onPress={handleSave}
              disabled={saving}
            >
              {saving ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
              <Text style={tw`font-bold text-[14px] text-white`}>Save Staff</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Registered Staff Section */}
        <View style={tw`w-full max-w-[420px] mx-auto`}>
          <TouchableOpacity 
            style={tw`w-full flex-row justify-between items-center py-2 mb-2 px-1`}
            onPress={() => setExpanded(!expanded)}
          >
            <Text style={tw`font-bold text-[#0f172a] text-[16px]`}>Registered Staff</Text>
            <Ionicons name={expanded ? "chevron-up" : "chevron-down"} size={20} color="#64748b" />
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
                        <Text style={tw`font-bold text-slate-800 text-[13px]`} numberOfLines={1}>{u.email}</Text>
                        {(u.name || u.created_at) && (
                          <Text style={tw`text-slate-400 text-[11px] mt-0.5`} numberOfLines={1}>
                            {u.name || u.created_at}
                          </Text>
                        )}
                      </View>

                      <View style={tw`flex-row items-center gap-2`}>
                        <View style={tw`bg-slate-100 border border-slate-200 px-2 py-1 rounded-full`}>
                          <Text style={tw`text-slate-600 text-[9px] font-bold uppercase tracking-wider`}>{u.role}</Text>
                        </View>
                        
                        <TouchableOpacity 
                          style={tw`bg-red-50 border border-red-100 rounded-full px-3 py-1.5 flex-row items-center`}
                          onPress={() => executeRemove(u.id, u.role, u.email)}
                        >
                          <Ionicons name="trash" size={12} color="#dc2626" style={tw`mr-1`} />
                          <Text style={tw`font-bold text-[10px] text-red-600`}>Remove</Text>
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
