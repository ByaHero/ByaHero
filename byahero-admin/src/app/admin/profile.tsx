import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, ActivityIndicator, TextInput, Alert, Modal } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '@/services/admin';
import AdminNavbar from '@/components/AdminNavbar';

export default function AdminProfile() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  
  // Modal states
  const [emailModal, setEmailModal] = useState(false);
  const [passwordModal, setPasswordModal] = useState(false);
  
  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const userStr = await AsyncStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          setEmail(parsed.email || '');
          setName(parsed.name || (parsed.email ? parsed.email.split('@')[0] : 'Admin'));
          setContacts(parsed.contacts || '');
        }
      } catch (e) {
        console.error('Failed to load profile', e);
      }
    };
    loadProfile();
  }, []);

  const handleUpdateProfile = async () => {
    setSavingProfile(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_info',
        name,
        contacts
      });

      if (data.success) {
        const userStr = await AsyncStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          await AsyncStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, name, contacts }));
        }
        Alert.alert('Success', 'Profile information updated successfully.');
      } else {
        Alert.alert('Error', data.error || 'Failed to update profile.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while saving profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleUpdateEmail = async () => {
    if (!newEmail) {
      Alert.alert('Error', 'Please enter a valid email address.');
      return;
    }
    setSavingEmail(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_info',
        email: newEmail
      });

      if (data.success) {
        setEmail(newEmail);
        setEmailModal(false);
        setNewEmail('');
        
        const userStr = await AsyncStorage.getItem('byahero_admin_user');
        if (userStr) {
          const parsed = JSON.parse(userStr);
          await AsyncStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, email: newEmail }));
        }
        Alert.alert('Success', 'Email updated successfully.');
      } else {
        Alert.alert('Error', data.error || 'Failed to update email.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating email.');
    } finally {
      setSavingEmail(false);
    }
  };

  const handleUpdatePassword = async () => {
    if (!passwordModal) return;
    if (newPassword !== confirmPassword) {
      Alert.alert('Error', 'New passwords do not match!');
      return;
    }
    
    setSavingPass(true);
    try {
      const data = await adminService.updateProfile({
        action: 'update_password',
        password: newPassword,
        confirm_password: confirmPassword,
        current_password: currentPassword
      });

      if (data.success) {
        setPasswordModal(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        Alert.alert('Success', 'Password successfully updated!');
      } else {
        Alert.alert('Error', data.error || 'Failed to update password.');
      }
    } catch (e) {
      Alert.alert('Error', 'Network error while updating password.');
    } finally {
      setSavingPass(false);
    }
  };

  const displayHeaderName = name ? name.charAt(0).toUpperCase() + name.slice(1) : 'Admin';
  const initial = displayHeaderName.charAt(0).toUpperCase() || '?';

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <AdminNavbar title="" />

      <ScrollView contentContainerStyle={tw`pb-10`}>
        {/* Header Avatar Section */}
        <View style={tw`items-center pt-8 px-4 pb-6`}>
          <View style={tw`items-center justify-center rounded-full bg-slate-200 mb-2 w-28 h-28`}>
            <Text style={tw`font-bold text-slate-800 text-5xl`}>{initial}</Text>
          </View>
          <Text style={tw`font-bold text-[#1d4ed8] text-xl`}>{displayHeaderName}</Text>
        </View>

        {/* Form Container */}
        <View style={tw`bg-slate-50 p-6 rounded-t-3xl min-h-[500px]`}>
          <Text style={tw`font-bold text-slate-800 mt-2 mb-4 ml-1 text-xs uppercase tracking-wider`}>
            Account Details
          </Text>

          {/* Email Card (Web Style) */}
          <View style={tw`p-4 mb-4 rounded-3xl bg-slate-200 flex-row items-center`}>
            <View style={tw`w-10 h-10 bg-white rounded-full items-center justify-center mr-4`}>
              <Ionicons name="mail" size={18} color="#1d4ed8" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider`}>Email Address</Text>
              <Text style={tw`font-bold text-slate-800 text-sm`} numberOfLines={1}>{email || 'Not set'}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setEmailModal(true)}
              style={tw`w-10 h-10 bg-white rounded-full items-center justify-center`}
            >
              <Ionicons name="pencil" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          {/* Password Card (Web Style) */}
          <View style={tw`p-4 mb-6 rounded-3xl bg-slate-200 flex-row items-center`}>
            <View style={tw`w-10 h-10 bg-white rounded-full items-center justify-center mr-4`}>
              <Ionicons name="key" size={18} color="#1d4ed8" />
            </View>
            <View style={tw`flex-1`}>
              <Text style={tw`text-slate-500 font-bold mb-1 text-[10px] uppercase tracking-wider`}>Password</Text>
              <Text style={tw`font-bold text-slate-800 text-sm`}>••••••••••••</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setPasswordModal(true)}
              style={tw`w-10 h-10 bg-white rounded-full items-center justify-center`}
            >
              <Ionicons name="pencil" size={16} color="#64748b" />
            </TouchableOpacity>
          </View>

          <Text style={tw`font-bold text-slate-800 mb-4 ml-1 text-xs uppercase tracking-wider`}>
            Personal Info
          </Text>

          <View style={tw`mb-4`}>
            <Text style={tw`text-xs font-bold text-slate-500 mb-1 ml-1`}>Full Name</Text>
            <TextInput 
              style={tw`bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-medium`} 
              value={name} 
              onChangeText={setName} 
              placeholder="Your Name" 
            />
          </View>

          <View style={tw`mb-6`}>
            <Text style={tw`text-xs font-bold text-slate-500 mb-1 ml-1`}>Contact Number</Text>
            <TextInput 
              style={tw`bg-white border border-slate-200 rounded-xl p-3 text-slate-800 font-medium`} 
              value={contacts} 
              onChangeText={setContacts} 
              placeholder="e.g. +63 900 000 0000" 
              keyboardType="phone-pad"
            />
          </View>

          <TouchableOpacity 
            onPress={handleUpdateProfile} 
            disabled={savingProfile} 
            style={tw`bg-[#1d4ed8] rounded-xl py-3.5 items-center flex-row justify-center shadow-sm`}
          >
            {savingProfile ? (
              <ActivityIndicator color="white" style={tw`mr-2`} size="small" />
            ) : (
              <Ionicons name="save-outline" size={16} color="white" style={tw`mr-2`} />
            )}
            <Text style={tw`text-white font-bold text-[13px]`}>{savingProfile ? 'Saving...' : 'Save Personal Info'}</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Email Edit Modal */}
      <Modal visible={emailModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center px-4`}>
          <View style={tw`bg-white rounded-3xl p-6 shadow-2xl`}>
            <Text style={tw`text-lg font-bold text-slate-900 mb-2`}>Edit Email</Text>
            <Text style={tw`text-slate-500 text-sm mb-4`}>Enter your new email address below.</Text>
            
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-6 font-medium`}
              placeholder="New email address" 
              value={newEmail}
              onChangeText={setNewEmail}
              keyboardType="email-address"
              autoCapitalize="none"
            />
            
            <View style={tw`flex-row justify-between gap-3`}>
              <TouchableOpacity 
                style={tw`flex-1 bg-slate-100 py-3 rounded-xl items-center`}
                onPress={() => setEmailModal(false)}
              >
                <Text style={tw`text-slate-700 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`flex-1 bg-[#1d4ed8] py-3 rounded-xl items-center flex-row justify-center`}
                onPress={handleUpdateEmail}
                disabled={savingEmail}
              >
                {savingEmail ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
                <Text style={tw`text-white font-bold`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Password Edit Modal */}
      <Modal visible={passwordModal} transparent animationType="fade">
        <View style={tw`flex-1 bg-black/50 justify-center px-4`}>
          <View style={tw`bg-white rounded-3xl p-6 shadow-2xl`}>
            <Text style={tw`text-lg font-bold text-slate-900 mb-2`}>Edit Password</Text>
            <Text style={tw`text-slate-500 text-sm mb-4`}>Enter your current and new password below.</Text>
            
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-3 font-medium`}
              placeholder="Current password" 
              value={currentPassword}
              onChangeText={setCurrentPassword}
              secureTextEntry
            />
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-3 font-medium`}
              placeholder="New password" 
              value={newPassword}
              onChangeText={setNewPassword}
              secureTextEntry
            />
            <TextInput 
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-slate-800 mb-6 font-medium`}
              placeholder="Confirm new password" 
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              secureTextEntry
            />
            
            <View style={tw`flex-row justify-between gap-3`}>
              <TouchableOpacity 
                style={tw`flex-1 bg-slate-100 py-3 rounded-xl items-center`}
                onPress={() => setPasswordModal(false)}
              >
                <Text style={tw`text-slate-700 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw`flex-1 bg-[#1d4ed8] py-3 rounded-xl items-center flex-row justify-center`}
                onPress={handleUpdatePassword}
                disabled={savingPass}
              >
                {savingPass ? <ActivityIndicator size="small" color="white" style={tw`mr-2`} /> : null}
                <Text style={tw`text-white font-bold`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
