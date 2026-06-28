import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
} from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../../services/authService';

export default function CompleteProfileScreen() {
  const [welcomeName, setWelcomeName] = useState('User');
  const [contactNumber, setContactNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    async function loadUserData() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'User';
        let cachedName = await AsyncStorage.getItem('byahero_cached_name') || '';
        
        if (!cachedName && cachedEmail !== 'User') {
          cachedName = cachedEmail.split('@')[0];
        }
        
        if (cachedName) {
          // Capitalize first letter
          cachedName = cachedName.charAt(0).toUpperCase() + cachedName.slice(1);
          setWelcomeName(cachedName);
        }
      } catch (err) {
        console.error('Error loading cached user profile name:', err);
      }
    }
    loadUserData();
  }, []);

  const handleSubmit = async () => {
    setErrorMsg(null);
    setSuccessMsg(null);
    const trimmedContact = contactNumber.trim();

    if (!trimmedContact) {
      setErrorMsg('Please enter your contact number.');
      return;
    }

    // Validate Philippine mobile number (starting with 09 and having 11 digits)
    if (!/^(09)\d{9}$/.test(trimmedContact)) {
      setErrorMsg('Please enter a valid Philippine mobile number starting with 09 (e.g., 09123456789).');
      return;
    }

    setIsLoading(true);

    const formattedContact = '+63' + trimmedContact.substring(1);
    
    // Save details locally immediately
    try {
      await AsyncStorage.setItem('byahero_cached_contacts', formattedContact);
      await AsyncStorage.setItem('byahero_cached_phone', formattedContact);
    } catch (e) {
      console.warn('Failed saving token locally:', e);
    }

    try {
      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('action', 'complete_profile');
      formData.append('contacts', trimmedContact);

      const res = await fetch(`${serverUrl}/api/auth`, {
        method: 'POST',
        body: formData,
        headers: {
          'Accept': 'application/json',
        },
        credentials: 'include',
      });

      const data = await res.json();

      if (data && data.success) {
        setSuccessMsg('Profile completed successfully! Redirecting...');
        setTimeout(() => {
          setIsLoading(false);
          router.replace('/passenger/showGuide' as any);
        }, 1500);
      } else {
        setErrorMsg(data.message || 'Failed to complete profile on server.');
        setIsLoading(false);
      }
    } catch (err) {
      console.warn('Server update failed, caching locally:', err);
      
      // Offline fallback: Save details and queue for background sync (matching HTML logic)
      try {
        const pendingEditsStr = await AsyncStorage.getItem('byahero_pending_profile_edits') || '[]';
        const pendingEdits = JSON.parse(pendingEditsStr);
        pendingEdits.push({ phone: formattedContact, timestamp: Date.now() });
        await AsyncStorage.setItem('byahero_pending_profile_edits', JSON.stringify(pendingEdits));
      } catch (e) {
        console.error('Failed to queue offline profile edits:', e);
      }

      setSuccessMsg('Saved locally due to server error. Redirecting...');
      setTimeout(() => {
        setIsLoading(false);
        router.replace('/passenger/showGuide' as any);
      }, 1500);
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-[#f8fafc]`}
    >
      <StatusBar barStyle="dark-content" backgroundColor="#f8fafc" />
      <ScrollView contentContainerStyle={tw`flex-grow justify-center items-center px-6 py-12`}>
        <View style={tw`w-full max-w-[380px] items-center`}>
          {/* Logo */}
          <Image
            source={require('../../../assets/images/byaheroLogo.png')}
            style={tw`w-24 h-24 mb-8`}
            contentFit="contain"
          />

          {/* Form Card */}
          <View style={tw`w-full bg-white rounded-3xl p-8 shadow-md border border-slate-100`}>
            <Text style={tw`text-2xl font-extrabold text-slate-800 text-center mb-2`}>
              Welcome {welcomeName}!
            </Text>
            <Text style={tw`text-sm font-medium text-slate-500 text-center mb-6`}>
              Please provide a contact number to complete your registration.
            </Text>

            {/* Error Message Box */}
            {errorMsg && (
              <View style={tw`bg-red-50 border border-red-200 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2`}>
                <MaterialIcons name="error-outline" size={18} color="#ef4444" />
                <Text style={tw`text-red-600 text-xs font-semibold flex-1`}>{errorMsg}</Text>
              </View>
            )}

            {/* Success Message Box */}
            {successMsg && (
              <View style={tw`bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 mb-5 flex-row items-center gap-2`}>
                <MaterialIcons name="check-circle-outline" size={18} color="#10b981" />
                <Text style={tw`text-emerald-600 text-xs font-semibold flex-1`}>{successMsg}</Text>
              </View>
            )}

            {/* Input Group */}
            <View style={tw`mb-6`}>
              <Text style={tw`text-xs font-bold text-slate-700 uppercase tracking-wider mb-2`}>
                Contact Number
              </Text>
              <View style={tw`relative flex-row items-center`}>
                <View style={tw`absolute left-4 z-10`}>
                  <MaterialIcons name="phone" size={18} color="#9ca3af" />
                </View>
                <TextInput
                  value={contactNumber}
                  onChangeText={(text) => setContactNumber(text.replace(/[^0-9]/g, ''))}
                  placeholder="e.g. 09123456789"
                  placeholderTextColor="#9ca3af"
                  keyboardType="number-pad"
                  maxLength={11}
                  editable={!isLoading}
                  style={tw`w-full bg-[#f8fafc] border-2 border-slate-200 focus:border-[#1e3a8a] rounded-2xl py-3 pl-11 pr-4 text-slate-800 text-base font-medium`}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={isLoading}
              activeOpacity={0.8}
              style={[
                tw`w-full rounded-2xl py-3.5 flex-row justify-center items-center gap-2 shadow-sm`,
                { backgroundColor: isLoading ? '#9ca3af' : '#1e3a8a' }
              ]}
            >
              {isLoading ? (
                <>
                  <Text style={tw`text-white font-bold text-base`}>Saving...</Text>
                  <ActivityIndicator color="white" size="small" />
                </>
              ) : (
                <>
                  <Text style={tw`text-white font-bold text-base`}>Continue to Dashboard</Text>
                  <MaterialIcons name="arrow-forward" size={18} color="white" />
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
