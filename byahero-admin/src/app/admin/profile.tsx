import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Modal,
  TextInput,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AdminNavbar from '@/components/AdminNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '@/services/admin';

export default function AdminProfile() {
  const [name, setName] = useState('Admin');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  
  // Modals state
  const [isNameModalOpen, setIsNameModalOpen] = useState(false);
  const [isContactModalOpen, setIsContactModalOpen] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newContacts, setNewContacts] = useState('');
  
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // Form security toggles
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  
  const [isLoading, setIsLoading] = useState(false);

  // Custom Alert Modal States
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertTitle, setAlertTitle] = useState('');
  const [alertMessage, setAlertMessage] = useState('');
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');
  const [onAlertConfirm, setOnAlertConfirm] = useState<(() => void) | null>(null);

  const showCustomAlert = (title: string, message: string, type: 'success' | 'error', onConfirm?: () => void) => {
    setAlertTitle(title);
    setAlertMessage(message);
    setAlertType(type);
    setOnAlertConfirm(() => onConfirm || null);
    setAlertVisible(true);
  };

  useEffect(() => {
    loadCachedDetails();
  }, []);

  const loadCachedDetails = async () => {
    try {
      const userStr = await AsyncStorage.getItem('byahero_admin_user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        const fetchedEmail = parsed.email || '';
        let fetchedName = parsed.name || '';
        
        // Strip email suffix if name contains '@'
        if (!fetchedName || fetchedName.includes('@')) {
          fetchedName = (parsed.name || fetchedEmail || 'Admin').split('@')[0];
        }
        
        // Capitalize the name
        fetchedName = fetchedName.charAt(0).toUpperCase() + fetchedName.slice(1);
        
        const fetchedContacts = parsed.contacts || '';

        setEmail(fetchedEmail);
        setName(fetchedName);
        setNewName(fetchedName);
        setContacts(fetchedContacts);
        setNewContacts(fetchedContacts);
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    }
  };

  const handleNameSubmit = async () => {
    if (!newName.trim()) {
      showCustomAlert('Validation Error', 'Name cannot be empty.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const cleanName = newName.trim();
      const formattedName = cleanName.charAt(0).toUpperCase() + cleanName.slice(1);
      
      const userStr = await AsyncStorage.getItem('byahero_admin_user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        await AsyncStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, name: formattedName }));
      }
      
      showCustomAlert('Success', 'Name updated successfully.', 'success', () => {
        setIsNameModalOpen(false);
        setName(formattedName);
        setNewName(formattedName);
      });
    } catch (e: any) {
      showCustomAlert('Error', 'Failed to save name.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async () => {
    const trimmedContact = newContacts.trim();
    if (!trimmedContact) {
      showCustomAlert('Validation Error', 'Contact number cannot be empty.', 'error');
      return;
    }

    // Regular expression to match digits only
    const digitRegex = /^[0-9]+$/;
    if (!digitRegex.test(trimmedContact)) {
      showCustomAlert('Validation Error', 'Contact number must contain only numbers.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const userStr = await AsyncStorage.getItem('byahero_admin_user');
      if (userStr) {
        const parsed = JSON.parse(userStr);
        await AsyncStorage.setItem('byahero_admin_user', JSON.stringify({ ...parsed, contacts: trimmedContact }));
      }
      
      showCustomAlert('Success', 'Contact updated successfully.', 'success', () => {
        setIsContactModalOpen(false);
        setContacts(trimmedContact);
        setNewContacts(trimmedContact);
      });
    } catch (e: any) {
      showCustomAlert('Error', 'Failed to save contact.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordSubmit = async () => {
    if (!currentPassword || !newPassword || !confirmPassword) {
      showCustomAlert('Validation Error', 'All password fields are required.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showCustomAlert('Validation Error', 'New passwords do not match.', 'error');
      return;
    }
    if (newPassword.length < 6) {
      showCustomAlert('Validation Error', 'Password must be at least 6 characters.', 'error');
      return;
    }

    setIsLoading(true);
    try {
      const res = await adminService.updateProfile({
        action: 'update_password',
        password: newPassword,
        confirm_password: confirmPassword,
        current_password: currentPassword
      });

      if (res && res.success) {
        showCustomAlert('Success', 'Password updated successfully.', 'success', () => {
          setIsPasswordModalOpen(false);
          setCurrentPassword('');
          setNewPassword('');
          setConfirmPassword('');
        });
      } else {
        showCustomAlert('Error', res.error || res.message || 'Failed to update password.', 'error');
      }
    } catch (e: any) {
      showCustomAlert('Network Error', e.message || 'Failed to connect to server.', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const initial = name ? name.charAt(0).toUpperCase() : 'A';

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-50`}>
      <AdminNavbar title="Profile" />

      <ScrollView contentContainerStyle={tw`p-5 items-center`} style={tw`flex-1`}>
        {/* Profile Avatar Initials */}
        <View style={tw`items-center my-6`}>
          <View style={tw`w-24 h-24 rounded-full bg-slate-300 items-center justify-center shadow-md mb-3`}>
            <Text style={tw`text-slate-800 text-4xl font-extrabold uppercase`}>
              {initial}
            </Text>
          </View>
          <Text style={tw`text-slate-800 text-lg font-black`}>{name}</Text>
        </View>

        {/* Info Cards */}
        <View style={tw`w-full bg-slate-100 rounded-3xl p-4 border border-slate-200 gap-4 mb-6`}>
          <Text style={tw`text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1`}>
            Account Details
          </Text>

          {/* Name Info Row */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-200 flex-row justify-between items-center shadow-sm`}>
            <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
              <Ionicons name="person" size={20} color="#0f3878" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase`}>Full Name</Text>
                <Text style={tw`text-slate-800 font-bold text-xs`} numberOfLines={1}>
                  {name || 'Loading...'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsNameModalOpen(true)} style={tw`p-2 bg-slate-50 rounded-xl border border-slate-200`}>
              <Ionicons name="create-outline" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Contact Info Row */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-200 flex-row justify-between items-center shadow-sm`}>
            <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
              <Ionicons name="call" size={20} color="#0f3878" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase`}>Contact Number</Text>
                <Text style={tw`text-slate-800 font-bold text-xs`} numberOfLines={1}>
                  {contacts || 'No contact number'}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setIsContactModalOpen(true)} style={tw`p-2 bg-slate-50 rounded-xl border border-slate-200`}>
              <Ionicons name="create-outline" size={16} color="#475569" />
            </TouchableOpacity>
          </View>

          {/* Email Info Row (Disabled/Read-Only) */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-200 flex-row justify-between items-center shadow-sm opacity-75`}>
            <View style={tw`flex-row items-center gap-3 flex-1 mr-2`}>
              <Ionicons name="mail" size={20} color="#0f3878" />
              <View style={tw`flex-1`}>
                <Text style={tw`text-[9px] font-bold text-slate-400 uppercase`}>Email Address</Text>
                <Text style={tw`text-slate-800 font-bold text-xs`} numberOfLines={1}>
                  {email || 'Loading...'}
                </Text>
              </View>
            </View>
          </View>

          {/* Password Info Row */}
          <View style={tw`bg-white rounded-2xl p-4 border border-slate-200 flex-row justify-between items-center shadow-sm`}>
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

      {/* Edit Name Modal */}
      <Modal visible={isNameModalOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200`}>
            <Text style={tw`text-slate-800 text-base font-bold mb-1`}>Edit Name</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>Update your full name below.</Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Name"
              autoCapitalize="words"
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mb-5 text-slate-800 font-semibold`}
            />

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => {
                  setIsNameModalOpen(false);
                  setNewName(name);
                }}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNameSubmit}
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

      {/* Edit Contact Modal */}
      <Modal visible={isContactModalOpen} transparent animationType="fade">
        <View style={tw`flex-1 justify-center bg-black/50 px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 border border-slate-200`}>
            <Text style={tw`text-slate-800 text-base font-bold mb-1`}>Edit Contact Number</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>Update your contact number below.</Text>

            <TextInput
              value={newContacts}
              onChangeText={(text) => {
                const filtered = text.replace(/[^0-9]/g, '');
                setNewContacts(filtered);
              }}
              placeholder="Contact Number"
              keyboardType="phone-pad"
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl py-3 px-4 mb-5 text-slate-800 font-semibold`}
            />

            <View style={tw`flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => {
                  setIsContactModalOpen(false);
                  setNewContacts(contacts);
                }}
                style={tw`flex-1 bg-slate-100 rounded-xl py-3 items-center`}
              >
                <Text style={tw`text-slate-600 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleContactSubmit}
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
                placeholderTextColor="#94a3b8"
                style={[tw`flex-1 font-semibold`, { color: '#0f172a' }]}
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
                placeholderTextColor="#94a3b8"
                style={[tw`flex-1 font-semibold`, { color: '#0f172a' }]}
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
                placeholderTextColor="#94a3b8"
                style={[tw`flex-1 font-semibold`, { color: '#0f172a' }]}
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

      {/* Custom Alert/Success Modal */}
      <Modal
        visible={alertVisible}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setAlertVisible(false);
          if (onAlertConfirm) onAlertConfirm();
        }}
      >
        <View style={tw`flex-1 bg-black/50 justify-center items-center px-6`}>
          <View style={tw`bg-white rounded-3xl p-6 w-full max-w-[340px] items-center border border-slate-100 shadow-2xl`}>
            {/* Icon */}
            <View style={tw`w-16 h-16 rounded-full ${alertType === 'success' ? 'bg-emerald-50' : 'bg-rose-50'} items-center justify-center mb-4`}>
              <Ionicons
                name={alertType === 'success' ? 'checkmark-circle' : 'close-circle'}
                size={40}
                color={alertType === 'success' ? '#10b981' : '#f43f5e'}
              />
            </View>
            
            {/* Title */}
            <Text style={tw`text-slate-800 text-lg font-bold mb-2 text-center`}>
              {alertTitle}
            </Text>
            
            {/* Message */}
            <Text style={tw`text-slate-500 text-sm mb-6 text-center leading-relaxed`}>
              {alertMessage}
            </Text>
            
            {/* Button */}
            <TouchableOpacity
              onPress={() => {
                setAlertVisible(false);
                if (onAlertConfirm) onAlertConfirm();
              }}
              style={tw`w-full ${alertType === 'success' ? 'bg-emerald-500' : 'bg-rose-500'} rounded-xl py-3 items-center`}
            >
              <Text style={tw`text-white font-bold text-sm`}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
