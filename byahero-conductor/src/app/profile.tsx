import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import ConductorNavbar from '../components/ConductorNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile } from '../services/conductorService';
import { cacheSession } from '../services/authService';

export default function ProfileScreen() {
  const [name, setName] = useState('Conductor');
  const [email, setEmail] = useState('');
  
  // Modals state
  const [isEmailModalOpen, setIsEmailModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Form states
  const [newEmail, setNewEmail] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Form security toggles
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCachedDetails();
  }, []);

  const loadCachedDetails = async () => {
    const cachedName = await AsyncStorage.getItem('byahero_cached_name');
    const cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
    if (cachedName) setName(cachedName);
    if (cachedEmail) {
      setEmail(cachedEmail);
      setNewEmail(cachedEmail);
    }
  };

  const handleEmailSubmit = async () => {
    if (!newEmail.trim()) {
      Alert.alert('Validation Error', 'Email cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateProfile({
        name,
        email: newEmail.trim()
      });

      if (res && res.success) {
        Alert.alert('Success', 'Email updated successfully.');
        setIsEmailModalOpen(false);
        
        // Update caches
        const userDetails = { name, email: newEmail.trim() };
        await cacheSession(newEmail.trim(), 'conductor', userDetails);
        await loadCachedDetails();
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to update email.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      Alert.alert('Validation Error', 'All password fields are required.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateProfile({
        name,
        email,
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (res && res.success) {
        Alert.alert('Success', 'Password updated successfully.');
        setIsPasswordModalOpen(false);
        // Clear inputs
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to update password.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <ConductorNavbar title="Profile" />

      <ScrollView contentContainerStyle={tw`p-5 items-center`} style={tw`flex-1`}>
        {/* Profile Avatar Initials */}
        <View style={tw`items-center my-6`}>
          <View style={tw`w-24 h-24 rounded-full bg-slate-300 items-center justify-center shadow-md mb-3`}>
            <Text style={tw`text-slate-800 text-4xl font-extrabold uppercase`}>
              {name.charAt(0)}
            </Text>
          </View>
          <Text style={tw`text-slate-800 text-lg font-black`}>{name}</Text>
        </View>

        {/* Info Cards */}
        <View style={tw`w-full bg-slate-100 rounded-3xl p-4 border border-slate-200 gap-4 mb-6`}>
          <Text style={tw`text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1`}>
            Account Details
          </Text>

          {/* Email Info Row */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-150 flex-row justify-between items-center shadow-sm`}>
            <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
              <Ionicons name="mail" size={20} color="#0f3878" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase`}>Email Address</Text>
                <Text style={tw`text-slate-800 font-bold text-xs`} numberOfLines={1}>
                  {email || 'Loading...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsEmailModalOpen(true)} style={tw`p-2 bg-slate-50 rounded-xl border border-slate-200`}>
              <Ionicons name="create-outline" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Password Info Row */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-150 flex-row justify-between items-center shadow-sm`}>
            <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
              <Ionicons name="lock-closed" size={20} color="#0f3878" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase`}>Password</Text>
                <Text style={tw`text-slate-800 font-bold text-xs`}>••••••••••••</Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsPasswordModalOpen(true)} style={tw`p-2 bg-slate-50 rounded-xl border border-slate-200`}>
              <Ionicons name="create-outline" size={16} color="#475569" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      {/* Edit Email Modal */}
      <Modal visible={isEmailModalOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200`}>
            <Text style={tw`text-slate-800 text-base font-bold mb-1`}>Edit Email</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>Enter your new email address below.</Text>

            <TextInput
              value={newEmail}
              onChangeText={setNewEmail}
              placeholder="New email address"
              keyboardType="email-address"
              autoCapitalize="none"
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mb-5 text-slate-800 font-semibold`}
            />

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setIsEmailModalOpen(false)}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleEmailSubmit}
                disabled={isLoading}
                style={tw`flex-1 bg-[#0f3878] rounded-xl py-3 items-center justify-center`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Password Modal */}
      <Modal visible={isPasswordModalOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200`}>
            <Text style={tw`text-slate-800 text-base font-bold mb-1`}>Edit Password</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>Enter your current and new password below.</Text>

            {/* Current Password */}
            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-3`}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={secureCurrent}
                placeholder="Current password"
                style={tw`flex-1 text-slate-800 font-semibold`}
              />
              <TouchableOpacity onPress={() => setSecureCurrent(!secureCurrent)}>
                <Ionicons name={secureCurrent ? "eye-off" : "eye"} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-3`}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={secureNew}
                placeholder="New password"
                style={tw`flex-1 text-slate-800 font-semibold`}
              />
              <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
                <Ionicons name={secureNew ? "eye-off" : "eye"} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-2 mb-5`}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirm}
                placeholder="Confirm new password"
                style={tw`flex-1 text-slate-800 font-semibold`}
              />
              <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                <Ionicons name={secureConfirm ? "eye-off" : "eye"} size={16} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setIsPasswordModalOpen(false)}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasswordSubmit}
                disabled={isLoading}
                style={tw`flex-1 bg-[#0f3878] rounded-xl py-3 items-center justify-center`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
