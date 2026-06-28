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
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { router } from 'expo-router';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import { Image } from 'expo-image';

export default function PassengerProfileScreen() {
  const [email, setEmail] = useState('guest@byahero.app');
  const [name, setName] = useState('Guest User');
  const [phone, setPhone] = useState('');
  const [avatarInitial, setAvatarInitial] = useState('G');
  const [profilePicture, setProfilePicture] = useState('');
  const [baseUrl, setBaseUrl] = useState('');
  
  // Edit Phone Modal State
  const [phoneModalVisible, setPhoneModalVisible] = useState(false);
  const [inputPhone, setInputPhone] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProfile() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'guest@byahero.app';
        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || cachedEmail.split('@')[0];
        const cachedPhone = await AsyncStorage.getItem('byahero_cached_phone') || '';
        
        setEmail(cachedEmail);
        setName(cachedName);
        setPhone(cachedPhone);
        setAvatarInitial(cachedName.charAt(0).toUpperCase());

        const cachedPic = await AsyncStorage.getItem('byahero_cached_profile_picture') || '';
        setProfilePicture(cachedPic);

        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);
        
        if (cachedPhone) {
          // Extract remaining 10 digits
          const cleanPhone = cachedPhone.replace(/[^0-9]/g, '');
          if (cleanPhone.startsWith('63')) {
            setInputPhone(cleanPhone.substring(2));
          } else if (cleanPhone.startsWith('0')) {
            setInputPhone(cleanPhone.substring(1));
          } else {
            setInputPhone(cleanPhone.substring(Math.max(0, cleanPhone.length - 10)));
          }
        }
      } catch (e) {
        console.error('Failed to load profile data:', e);
      }
    }
    loadProfile();
  }, []);

  const handleUpdatePhone = async () => {
    const digits = inputPhone.trim();
    if (digits.length !== 10 || !/^\d+$/.test(digits)) {
      Alert.alert('Validation Error', 'Please enter exactly 10 digits.');
      return;
    }

    const fullPhone = '+63' + digits;
    setIsSaving(true);
    try {
      await AsyncStorage.setItem('byahero_cached_phone', fullPhone);
      setPhone(fullPhone);

      const serverUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';
      const res = await fetch(`${serverUrl}/api/passenger/profile/update-phone`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: fullPhone, email: email }),
      });
      const data = await res.json();
      setIsSaving(false);
      setPhoneModalVisible(false);
      if (data.success) {
        Alert.alert('Success', 'Mobile number updated successfully!');
      } else {
        Alert.alert('Saved Locally', `Notice: ${data.message}`);
      }
    } catch (err) {
      setIsSaving(false);
      setPhoneModalVisible(false);
      Alert.alert('Saved Locally', 'Saved locally. Connection to server failed (queued for sync).');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      {/* Dynamic Header Component */}
      <PassengerHeader pageTitle="My Profile" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        {/* Profile Card Header */}
        <View style={tw`items-center py-8 bg-white`}>
          <View style={tw`w-24 h-24 rounded-full border border-slate-300 justify-center items-center mb-3 bg-slate-50 overflow-hidden`}>
            {profilePicture && profilePicture !== 'null' && profilePicture !== 'undefined' ? (
              <Image
                source={{ uri: (profilePicture.startsWith('http') || profilePicture.startsWith('data:')) ? profilePicture : `${baseUrl.replace(/\/$/, '')}/${profilePicture.replace(/^\//, '')}` }}
                style={tw`w-full h-full`}
                contentFit="cover"
              />
            ) : (
              <Text style={tw`text-3xl font-black text-slate-800`}>{avatarInitial}</Text>
            )}
          </View>
          <Text style={tw`text-2xl font-black text-slate-800`}>{name}</Text>
        </View>

        {/* Profile Details Sheet */}
        <View style={[tw`px-4 pt-6 bg-slate-100/70 min-h-120`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <Text style={tw`text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1`}>Account Details</Text>

          {/* Phone Card */}
          <TouchableOpacity 
            onPress={() => setPhoneModalVisible(true)}
            style={tw`flex-row items-center justify-between p-4 mb-3.5 bg-white rounded-2xl shadow-sm`}
          >
            <View style={tw`flex-row items-center flex-1`}>
              <MaterialIcons name="phone" size={24} color="#103d7c" style={tw`mr-3.5`} />
              <View>
                <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest`}>Phone Number</Text>
                <Text style={tw`text-[15px] font-black text-slate-800 mt-1`}>{phone || 'Not set'}</Text>
              </View>
            </View>
            <MaterialIcons name="edit" size={20} color="#103d7c" />
          </TouchableOpacity>

          {/* Email Card */}
          <View style={tw`flex-row items-center p-4 mb-5 bg-white rounded-2xl shadow-sm`}>
            <MaterialIcons name="email" size={24} color="#103d7c" style={tw`mr-3.5`} />
            <View style={tw`flex-1`}>
              <Text style={tw`text-[10px] font-black text-slate-400 uppercase tracking-widest`}>Email Address</Text>
              <Text style={tw`text-[15px] font-black text-slate-800 mt-1`} numberOfLines={1}>{email}</Text>
            </View>
          </View>

          <Text style={tw`text-xs font-black text-slate-400 uppercase mb-3 tracking-widest px-1`}>Account Management</Text>

          {/* Account Settings */}
          <TouchableOpacity 
            onPress={() => router.push('/passenger/profile/accountSettings')}
            style={tw`flex-row items-center justify-between p-4 bg-white rounded-2xl shadow-sm`}
          >
            <View style={tw`flex-row items-center`}>
              <MaterialIcons name="settings" size={24} color="#103d7c" style={tw`mr-3.5`} />
              <Text style={tw`text-[15px] font-black text-slate-800`}>Account Settings</Text>
            </View>
            <MaterialIcons name="chevron-right" size={24} color="#94a3b8" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Dynamic Footer Component */}
      <PassengerFooter activeTab="location" />

      {/* Edit Phone Modal */}
      <Modal
        visible={phoneModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setPhoneModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/50 px-5`}>
          <View style={tw`w-full bg-white rounded-3xl p-6 shadow-xl`}>
            <Text style={tw`text-lg font-bold text-slate-800 mb-4`}>Update Phone Number</Text>
            
            <Text style={tw`text-xs text-slate-400 font-semibold mb-1.5`}>Mobile Number</Text>
            <View style={tw`flex-row items-center bg-slate-100 rounded-2xl overflow-hidden border border-slate-200 mb-4`}>
              <View style={tw`px-4 py-3.5 bg-slate-200/70 border-r border-slate-200`}>
                <Text style={tw`font-bold text-slate-500`}>+63</Text>
              </View>
              <TextInput
                style={tw`flex-1 px-4 py-3.5 font-bold text-slate-700`}
                placeholder="9123456789"
                keyboardType="phone-pad"
                maxLength={10}
                value={inputPhone}
                onChangeText={(text) => setInputPhone(text.replace(/[^0-9]/g, ''))}
              />
            </View>
            
            <Text style={tw`text-xs text-slate-400 mb-6`}>Enter the remaining 10 digits of your mobile number.</Text>

            <View style={tw`flex-row justify-end gap-3`}>
              <TouchableOpacity 
                onPress={() => setPhoneModalVisible(false)}
                style={tw`px-5 py-2.5 rounded-full bg-slate-100`}
              >
                <Text style={tw`text-sm font-semibold text-slate-500`}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity 
                onPress={handleUpdatePhone}
                disabled={isSaving}
                style={tw`px-5 py-2.5 rounded-full bg-[#1e3a8a]`}
              >
                <Text style={tw`text-sm font-semibold text-white`}>
                  {isSaving ? 'Saving...' : 'Save Changes'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
