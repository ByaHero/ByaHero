import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function DeleteAccountScreen() {
  const [userName, setUserName] = useState('User');
  const [inputText, setInputText] = useState('');
  const [understandCheck, setUnderstandCheck] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    async function loadName() {
      const name = await AsyncStorage.getItem('byahero_cached_name') || 'User';
      setUserName(name);
    }
    loadName();
  }, []);

  const handleDeleteAccount = async () => {
    if (inputText.trim().toLowerCase() !== 'delete') {
      Alert.alert('Validation Error', 'Please type exactly "delete" to confirm.');
      return;
    }
    if (!understandCheck) {
      Alert.alert('Validation Error', 'Please confirm you understand that this action is irreversible.');
      return;
    }

    Alert.alert(
      'Final Warning',
      'Are you absolutely sure you want to delete your account? This action is IRREVERSIBLE.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'PERMANENTLY DELETE',
          style: 'destructive',
          onPress: async () => {
            setIsLoading(true);
            try {
              const serverUrl = await getServerUrl();
              const email = await AsyncStorage.getItem('byahero_cached_email') || '';

              const response = await fetch(`${serverUrl}/api/passenger/profile/delete-account`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  confirmText: inputText.trim(),
                  email: email
                }),
                credentials: 'include',
              });

              const data = await response.json();
              setIsLoading(false);

              if (data && data.success) {
                await AsyncStorage.removeItem('byahero_cached_email');
                await AsyncStorage.removeItem('byahero_cached_role');
                await AsyncStorage.removeItem('byahero_cached_name');
                await AsyncStorage.removeItem('byahero_cached_profile_picture');
                await AsyncStorage.removeItem('byahero_cached_contacts');
                await AsyncStorage.removeItem('byahero_cached_phone');
                await AsyncStorage.removeItem('sos_fcm_active_token');

                Alert.alert('Account Deleted', 'Your account and data have been permanently removed.');
                router.replace('/');
              } else {
                Alert.alert('Deletion Failed', data.message || 'Failed to delete account.');
              }
            } catch (err) {
              setIsLoading(false);
              Alert.alert('Error', 'Failed to communicate with server.');
            }
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Delete Account" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-red-100`}>
            <View style={tw`w-16 h-16 rounded-full bg-red-50 justify-center items-center mx-auto mb-4`}>
              <MaterialIcons name="warning" size={32} color="#ef4444" />
            </View>

            <Text style={tw`text-lg font-black text-center text-slate-800 mb-1`}>Delete Account?</Text>
            <Text style={tw`text-xs text-center text-slate-400 font-medium mb-6`}>
              We're sorry to see you go, {userName}. Please confirm your decision.
            </Text>

            {/* Warning Banner */}
            <View style={tw`bg-red-50 border border-red-100 rounded-2xl p-4 mb-5`}>
              <View style={tw`flex-row items-center mb-2`}>
                <MaterialIcons name="info" size={18} color="#be123c" style={tw`mr-1.5`} />
                <Text style={tw`text-xs font-bold text-[#be123c]`}>Important Information</Text>
              </View>
              <Text style={tw`text-xs text-red-700/90 leading-relaxed mb-1`}>
                • Your profile and all personal data will be <Text style={tw`font-bold`}>permanently deleted</Text>.
              </Text>
              <Text style={tw`text-xs text-red-700/90 leading-relaxed mb-1`}>
                • Your SOS history and emergency contacts will be erased.
              </Text>
              <Text style={tw`text-xs text-red-700/90 leading-relaxed`}>
                • This action <Text style={tw`font-bold`}>cannot be undone</Text>.
              </Text>
            </View>

            {/* Text Input Confirmation */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>
                Type "delete" to Confirm
              </Text>
              <TextInput
                style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700`}
                placeholder="delete"
                autoCapitalize="none"
                value={inputText}
                onChangeText={setInputText}
              />
            </View>

            {/* Toggle Switch Confirmation */}
            <View style={tw`flex-row items-center justify-between mb-6 bg-slate-50 p-4 rounded-2xl border border-slate-200/50`}>
              <Text style={tw`text-xs text-slate-500 font-medium flex-1 mr-3`}>
                I understand that my account and all data will be permanently removed.
              </Text>
              <Switch
                value={understandCheck}
                onValueChange={setUnderstandCheck}
                trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                thumbColor={understandCheck ? '#ef4444' : '#f4f3f4'}
              />
            </View>

            {/* Action Buttons */}
            <TouchableOpacity
              onPress={handleDeleteAccount}
              disabled={isLoading}
              style={tw`bg-[#dc2626] py-3.5 rounded-2xl items-center mb-3 shadow-md`}
            >
              <Text style={tw`text-sm font-bold text-white`}>
                {isLoading ? 'Processing Deletion...' : 'Permanently Delete Account'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.back()}
              style={tw`bg-slate-100 py-3.5 rounded-2xl items-center border border-slate-200`}
            >
              <Text style={tw`text-sm font-bold text-slate-500`}>Keep My Account</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
