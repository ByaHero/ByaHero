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
  const [isPhotoOptionsModalOpen, setIsPhotoOptionsModalOpen] = useState(false);
  
  // Form states
  const [newName, setNewName] = useState('');
  const [newContacts, setNewContacts] = useState('');
  const [contactError, setContactError] = useState<string | null>(null);
  
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
    setIsPhotoOptionsModalOpen(true);
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

  const handleContactChange = (text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '').slice(0, 11);
    setNewContacts(cleaned);
    if (contactError) setContactError(null);
  };

  const handleContactSubmit = async () => {
    const cleaned = newContacts.trim();
    if (!cleaned) {
      setContactError('Contact number cannot be empty.');
      return;
    }
    if (!/^09\d{9}$/.test(cleaned)) {
      setContactError('Please enter a valid 11-digit Philippine mobile number starting with 09 (e.g. 09171234567).');
      return;
    }

    setContactError(null);
    setIsLoading(true);
    try {
      const res = await updateProfile({ contacts: cleaned });
      if (res && res.success) {
        Alert.alert('Success', 'Contact updated successfully.');
        setIsContactModalOpen(false);
        setContacts(cleaned);
        await cacheSession(email, 'conductor', { name, email, contacts: cleaned, profile_picture: profilePicture });
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
      <Modal visible={isNameModalOpen} transparent animationType="fade" onRequestClose={() => setIsNameModalOpen(false)}>
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            <TouchableOpacity onPress={() => setIsNameModalOpen(false)} style={tw`absolute top-4 right-4 p-1 z-10`}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-3`}>
              <Ionicons name="person" size={26} color="#0f3878" />
            </View>

            <Text style={tw`text-slate-800 text-lg font-black mb-1`}>Edit Full Name</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-5`}>Update your conductor profile display name.</Text>

            <TextInput
              value={newName}
              onChangeText={setNewName}
              placeholder="Full Name"
              placeholderTextColor="#94a3b8"
              autoCapitalize="words"
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 mb-5 text-slate-800 font-bold text-sm`}
            />

            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => {
                  setIsNameModalOpen(false);
                  setNewName(name);
                }}
                style={tw`flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleNameSubmit}
                disabled={isLoading}
                style={tw`flex-1 bg-[#0f3878] py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold text-sm`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Contact Modal */}
      <Modal visible={isContactModalOpen} transparent animationType="fade" onRequestClose={() => setIsContactModalOpen(false)}>
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            <TouchableOpacity onPress={() => setIsContactModalOpen(false)} style={tw`absolute top-4 right-4 p-1 z-10`}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-14 h-14 rounded-full bg-emerald-100 items-center justify-center mb-3`}>
              <Ionicons name="call" size={26} color="#059669" />
            </View>

            <Text style={tw`text-slate-800 text-lg font-black mb-1`}>Edit Contact Number</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-4`}>Enter your 11-digit Philippine mobile number starting with 09.</Text>

            <TextInput
              value={newContacts}
              onChangeText={handleContactChange}
              placeholder="09171234567"
              placeholderTextColor="#94a3b8"
              keyboardType="number-pad"
              maxLength={11}
              style={tw`w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 px-4 mb-2 text-slate-800 font-bold text-sm`}
            />

            {contactError ? (
              <Text style={tw`text-red-500 text-[11px] font-semibold text-center mb-3 px-2`}>
                {contactError}
              </Text>
            ) : (
              <View style={tw`mb-3`} />
            )}

            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => {
                  setIsContactModalOpen(false);
                  setNewContacts(contacts);
                  setContactError(null);
                }}
                style={tw`flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleContactSubmit}
                disabled={isLoading}
                style={tw`flex-1 bg-[#0f3878] py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold text-sm`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Password Modal */}
      <Modal visible={isPasswordModalOpen} transparent animationType="fade" onRequestClose={() => setIsPasswordModalOpen(false)}>
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            <TouchableOpacity onPress={() => setIsPasswordModalOpen(false)} style={tw`absolute top-4 right-4 p-1 z-10`}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-14 h-14 rounded-full bg-amber-100 items-center justify-center mb-3`}>
              <Ionicons name="lock-closed" size={26} color="#d97706" />
            </View>

            <Text style={tw`text-slate-800 text-lg font-black mb-1`}>Change Password</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-5`}>Enter your current password and new password.</Text>

            {/* Current Password */}
            <View style={tw`w-full flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-3`}>
              <TextInput
                value={currentPassword}
                onChangeText={setCurrentPassword}
                secureTextEntry={secureCurrent}
                placeholder="Current password"
                placeholderTextColor="#94a3b8"
                style={tw`flex-1 font-bold text-slate-800 text-sm`}
              />
              <TouchableOpacity onPress={() => setSecureCurrent(!secureCurrent)}>
                <Ionicons name={secureCurrent ? "eye-off" : "eye"} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* New Password */}
            <View style={tw`w-full flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-3`}>
              <TextInput
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={secureNew}
                placeholder="New password"
                placeholderTextColor="#94a3b8"
                style={tw`flex-1 font-bold text-slate-800 text-sm`}
              />
              <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
                <Ionicons name={secureNew ? "eye-off" : "eye"} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Confirm Password */}
            <View style={tw`w-full flex-row items-center bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 mb-5`}>
              <TextInput
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={secureConfirm}
                placeholder="Confirm new password"
                placeholderTextColor="#94a3b8"
                style={tw`flex-1 font-bold text-slate-800 text-sm`}
              />
              <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                <Ionicons name={secureConfirm ? "eye-off" : "eye"} size={18} color="#64748b" />
              </TouchableOpacity>
            </View>

            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setIsPasswordModalOpen(false)}
                style={tw`flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handlePasswordSubmit}
                disabled={isLoading}
                style={tw`flex-1 bg-[#0f3878] py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                {isLoading ? (
                  <ActivityIndicator color="white" size="small" />
                ) : (
                  <Text style={tw`text-white font-bold text-sm`}>Save</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Profile Photo Options Modal */}
      <Modal visible={isPhotoOptionsModalOpen} transparent animationType="fade" onRequestClose={() => setIsPhotoOptionsModalOpen(false)}>
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            <TouchableOpacity onPress={() => setIsPhotoOptionsModalOpen(false)} style={tw`absolute top-4 right-4 p-1 z-10`}>
              <Ionicons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            <View style={tw`w-14 h-14 rounded-full bg-blue-100 items-center justify-center mb-3`}>
              <Ionicons name="camera" size={26} color="#0f3878" />
            </View>

            <Text style={tw`text-slate-800 text-lg font-black mb-1`}>Profile Picture</Text>
            <Text style={tw`text-slate-500 text-xs text-center mb-6`}>Update or remove your profile picture.</Text>

            <View style={tw`w-full gap-3`}>
              <TouchableOpacity
                onPress={() => {
                  setIsPhotoOptionsModalOpen(false);
                  pickImage();
                }}
                style={tw`w-full bg-[#0f3878] py-3.5 rounded-2xl flex-row items-center justify-center gap-2 shadow-sm`}
              >
                <Ionicons name="image-outline" size={18} color="white" />
                <Text style={tw`text-white font-bold text-sm`}>Choose New Photo</Text>
              </TouchableOpacity>

              {profilePicture && (
                <TouchableOpacity
                  onPress={() => {
                    setIsPhotoOptionsModalOpen(false);
                    removePicture();
                  }}
                  style={tw`w-full bg-red-50 border border-red-100 py-3.5 rounded-2xl flex-row items-center justify-center gap-2`}
                >
                  <Ionicons name="trash-outline" size={18} color="#ef4444" />
                  <Text style={tw`text-red-600 font-bold text-sm`}>Remove Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setIsPhotoOptionsModalOpen(false)}
                style={tw`w-full bg-slate-100 py-3 rounded-2xl items-center justify-center mt-1`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
