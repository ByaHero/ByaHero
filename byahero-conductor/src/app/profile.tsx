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
  ActivityIndicator,
  Image
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import ConductorNavbar from '../components/ConductorNavbar';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { updateProfile } from '../services/conductorService';
import { cacheSession } from '../services/authService';

export default function ProfileScreen() {
  const [name, setName] = useState('Conductor');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);
  
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

  useEffect(() => {
    loadCachedDetails();
  }, []);

  const loadCachedDetails = async () => {
    const cachedName = await AsyncStorage.getItem('byahero_cached_name');
    const cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
    const cachedContacts = await AsyncStorage.getItem('byahero_cached_contacts');
    const cachedProfilePic = await AsyncStorage.getItem('byahero_cached_profile_picture');
    
    if (cachedName) {
      setName(cachedName);
      setNewName(cachedName);
    }
    if (cachedEmail) setEmail(cachedEmail);
    if (cachedContacts) {
      setContacts(cachedContacts);
      setNewContacts(cachedContacts);
    }
    if (cachedProfilePic) {
      setProfilePicture(cachedProfilePic);
    }
  };

  const handlePictureOptions = () => {
    Alert.alert(
      'Profile Picture',
      'What would you like to do?',
      [
        { text: 'Change Photo', onPress: pickImage },
        { 
          text: 'Remove Photo', 
          onPress: removePicture,
          style: 'destructive'
        },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  const removePicture = async () => {
    setIsLoading(true);
    try {
      const res = await updateProfile({ remove_image: '1' });
      if (res && res.success) {
        setProfilePicture(null);
        await cacheSession(email, 'conductor', { name, email, contacts, profile_picture: null });
        Alert.alert('Success', 'Profile picture removed successfully.');
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to remove picture.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
      base64: true,
    });

    if (!result.canceled && result.assets[0].base64) {
      const base64Img = `data:image/jpeg;base64,${result.assets[0].base64}`;
      setIsLoading(true);
      try {
        const res = await updateProfile({ profile_image_data: base64Img });
        if (res && res.success) {
          setProfilePicture(base64Img);
          await cacheSession(email, 'conductor', { name, email, contacts, profile_picture: base64Img });
          Alert.alert('Success', 'Profile picture updated successfully.');
        } else {
          Alert.alert('Error', res.error || res.message || 'Failed to update picture.');
        }
      } catch (e: any) {
        Alert.alert('Network Error', e.message || 'Failed to connect to server.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleNameSubmit = async () => {
    if (!newName.trim()) {
      Alert.alert('Validation Error', 'Name cannot be empty.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await updateProfile({ name: newName.trim() });
      if (res && res.success) {
        Alert.alert('Success', 'Name updated successfully.');
        setIsNameModalOpen(false);
        setName(newName.trim());
        await cacheSession(email, 'conductor', { name: newName.trim(), email, contacts, profile_picture: profilePicture });
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to update name.');
      }
    } catch (e: any) {
      Alert.alert('Network Error', e.message || 'Failed to connect to server.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleContactSubmit = async () => {
    setIsLoading(true);
    try {
      const res = await updateProfile({ contacts: newContacts.trim() });
      if (res && res.success) {
        Alert.alert('Success', 'Contact updated successfully.');
        setIsContactModalOpen(false);
        setContacts(newContacts.trim());
        await cacheSession(email, 'conductor', { name, email, contacts: newContacts.trim(), profile_picture: profilePicture });
      } else {
        Alert.alert('Error', res.error || res.message || 'Failed to update contact.');
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
          <TouchableOpacity onPress={handlePictureOptions}>
            {profilePicture ? (
              <Image 
                source={{ uri: profilePicture }} 
                style={tw`w-24 h-24 rounded-full shadow-md mb-3`} 
              />
            ) : (
              <View style={tw`w-24 h-24 rounded-full bg-slate-300 items-center justify-center shadow-md mb-3`}>
                <Text style={tw`text-slate-800 text-4xl font-extrabold uppercase`}>
                  {name.charAt(0)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
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

          {/* Email Info Row (Disabled) */}
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
              onChangeText={setNewContacts}
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
