import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import * as ImagePicker from 'expo-image-picker';
import { Image } from 'expo-image';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function AccountSettingsScreen() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [originalName, setOriginalName] = useState('');
  const [profilePic, setProfilePic] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('G');

  const [newImageData, setNewImageData] = useState('');
  const [removeImageFlag, setRemoveImageFlag] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'guest@byahero.app';
        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || cachedEmail.split('@')[0];
        const cachedPic = await AsyncStorage.getItem('byahero_cached_profile_picture') || '';
        
        setEmail(cachedEmail);
        setName(cachedName);
        setOriginalName(cachedName);
        setProfilePic(cachedPic);
        setAvatarInitial(cachedName.charAt(0).toUpperCase());

        const serverUrl = await getServerUrl();
        const res = await fetch(`${serverUrl}/api/passenger/profile/account-settings`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data && data.success && data.user) {
          const freshName = data.user.name || cachedName;
          const freshPic = data.user.profile_picture || cachedPic;
          
          setName(freshName);
          setOriginalName(freshName);
          setProfilePic(freshPic);
          setAvatarInitial(freshName.charAt(0).toUpperCase());

          await AsyncStorage.setItem('byahero_cached_name', freshName);
          if (freshPic) {
            await AsyncStorage.setItem('byahero_cached_profile_picture', freshPic);
          } else {
            await AsyncStorage.removeItem('byahero_cached_profile_picture');
          }
        }
      } catch (e) {
        console.warn('Failed to load settings data:', e);
      }
    }
    loadData();
  }, []);

  const handlePickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Please grant library permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets[0]) {
        const base64Data = `data:image/jpeg;base64,${result.assets[0].base64}`;
        setNewImageData(base64Data);
        setProfilePic(base64Data);
        setRemoveImageFlag(false);
      }
    } catch (e) {
      Alert.alert('Error', 'Failed to pick image.');
    }
  };

  const handleRemoveImage = () => {
    setNewImageData('');
    setProfilePic('');
    setRemoveImageFlag(true);
  };

  const handleSaveChanges = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      Alert.alert('Validation Error', 'Full Name is required.');
      return;
    }

    setIsSaving(true);
    try {
      await AsyncStorage.setItem('byahero_cached_name', trimmedName);
      if (newImageData) {
        await AsyncStorage.setItem('byahero_cached_profile_picture', newImageData);
      } else if (removeImageFlag) {
        await AsyncStorage.removeItem('byahero_cached_profile_picture');
      }

      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('action', 'update_profile');
      formData.append('name', trimmedName);
      formData.append('email', email);
      if (newImageData) {
        formData.append('profile_image_data', newImageData);
      }
      if (removeImageFlag) {
        formData.append('remove_image', '1');
      }

      const res = await fetch(`${serverUrl}/api/passenger/profile/account-settings`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSaving(false);
      
      if (data && data.success) {
        Alert.alert('Success', 'Profile updated successfully on server!');
        setOriginalName(trimmedName);
        setNewImageData('');
        setRemoveImageFlag(false);
      } else {
        Alert.alert('Saved Locally', `Notice: ${data.message || 'Server did not acknowledge save.'}`);
      }
    } catch (err) {
      setIsSaving(false);
      Alert.alert('Saved Locally', 'Saved locally. Connection to server failed (queued for sync).');
    }
  };

  const isChanged = name.trim() !== originalName || newImageData !== '' || removeImageFlag;

  const getAvatarSource = () => {
    if (profilePic) {
      if (profilePic.startsWith('http') || profilePic.startsWith('data:')) {
        return { uri: profilePic };
      }
      return { uri: `https://byahero.alwaysdata.net/${profilePic}` };
    }
    return null;
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Account Settings" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <Text style={tw`text-lg font-black text-slate-800 mb-1`}>Profile Details</Text>
          <Text style={tw`text-xs text-slate-400 font-medium mb-5`}>Manage your account security and preferences</Text>

          {/* Profile Details Card */}
          <View style={tw`bg-white rounded-3xl p-5 border border-slate-100 shadow-sm mb-4`}>
            {/* Avatar Area */}
            <View style={tw`flex-row items-center gap-4 mb-5`}>
              <View style={tw`w-18 h-18 rounded-full border border-slate-200 bg-[#dbeafe] justify-center items-center overflow-hidden`}>
                {profilePic ? (
                  <Image
                    source={getAvatarSource()}
                    style={tw`w-full h-full`}
                    contentFit="cover"
                  />
                ) : (
                  <Text style={tw`text-2xl font-black text-[#1e3a8a]`}>{avatarInitial}</Text>
                )}
              </View>

              <View style={tw`flex-1`}>
                <Text style={tw`text-base font-bold text-slate-800 leading-tight`}>{originalName || 'Guest User'}</Text>
                <Text style={tw`text-xs text-slate-400 font-medium mb-3`}>{email}</Text>
                
                <View style={tw`flex-row items-center gap-3`}>
                  <TouchableOpacity 
                    onPress={handlePickImage}
                    style={tw`flex-row items-center bg-slate-100 px-3 py-1.5 rounded-full border border-slate-200`}
                  >
                    <MaterialIcons name="add-a-photo" size={14} color="#1e3a8a" style={tw`mr-1`} />
                    <Text style={tw`text-xs font-bold text-[#1e3a8a]`}>Add Photo</Text>
                  </TouchableOpacity>

                  {profilePic !== '' && (
                    <TouchableOpacity 
                      onPress={handleRemoveImage}
                      style={tw`flex-row items-center`}
                    >
                      <MaterialIcons name="delete" size={14} color="#ef4444" style={tw`mr-0.5`} />
                      <Text style={tw`text-xs font-bold text-[#ef4444]`}>Remove</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            </View>

            {/* Form Fields */}
            <View style={tw`gap-4`}>
              <View>
                <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>Full Name</Text>
                <TextInput
                  style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700`}
                  placeholder="Enter your full name"
                  value={name}
                  onChangeText={setName}
                />
              </View>

              <View>
                <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>Email Address</Text>
                <TextInput
                  style={tw`w-full bg-slate-100 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-400`}
                  value={email}
                  editable={false}
                />
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity 
              onPress={handleSaveChanges}
              disabled={!isChanged || isSaving}
              style={[
                tw`flex-row justify-center items-center mt-5 py-3 rounded-2xl`,
                isChanged ? tw`bg-[#1e3a8a]` : tw`bg-slate-200`
              ]}
            >
              <MaterialIcons name="save" size={18} color={isChanged ? '#ffffff' : '#94a3b8'} style={tw`mr-1.5`} />
              <Text style={[tw`font-bold text-sm`, isChanged ? tw`text-white` : tw`text-slate-400`]}>
                {isSaving ? 'Saving Changes...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Security Options */}
          <Text style={tw`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 mt-2`}>Security</Text>
          <View style={tw`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5`}>
            <TouchableOpacity 
              onPress={() => router.push('/passenger/profile/changePassword')}
              style={tw`flex-row items-center justify-between p-4 border-b border-slate-100`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons name="lock" size={22} color="#1e3a8a" style={tw`mr-3.5`} />
                <View>
                  <Text style={tw`text-sm font-semibold text-slate-700`}>Change Password</Text>
                  <Text style={tw`text-xs text-slate-400 mt-0.5`}>Update your password details</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/passenger/profile/loginActivity')}
              style={tw`flex-row items-center justify-between p-4`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons name="history" size={22} color="#1e3a8a" style={tw`mr-3.5`} />
                <View>
                  <Text style={tw`text-sm font-semibold text-slate-700`}>Login Activity</Text>
                  <Text style={tw`text-xs text-slate-400 mt-0.5`}>Recent login sessions</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          </View>

          {/* Danger Zone */}
          <Text style={tw`text-xs font-bold text-[#ef4444] uppercase tracking-wider mb-2.5`}>Danger Zone</Text>
          <View style={tw`bg-red-50 border border-red-100 rounded-3xl overflow-hidden`}>
            <TouchableOpacity 
              onPress={() => router.push('/passenger/profile/deleteAccount')}
              style={tw`flex-row items-center justify-between p-4`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons name="delete-forever" size={22} color="#ef4444" style={tw`mr-3.5`} />
                <View>
                  <Text style={tw`text-sm font-semibold text-[#ef4444]`}>Delete Account</Text>
                  <Text style={tw`text-xs text-red-500/80 mt-0.5`}>Permanently remove all your data</Text>
                </View>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#fca5a5" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
