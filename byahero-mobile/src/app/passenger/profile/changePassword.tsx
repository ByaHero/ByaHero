import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function ChangePasswordScreen() {
  const [hasPassword, setHasPassword] = useState(true);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [secureCurrent, setSecureCurrent] = useState(true);
  const [secureNew, setSecureNew] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    async function checkPasswordStatus() {
      try {
        const serverUrl = await getServerUrl();
        const res = await fetch(`${serverUrl}/api/passenger/profile/change-password`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (data && data.success) {
          setHasPassword(data.hasPassword);
        }
      } catch (e) {
        console.warn('Failed to retrieve password status:', e);
      }
    }
    checkPasswordStatus();
  }, []);

  const handleUpdatePassword = async () => {
    if (hasPassword && !currentPassword) {
      setErrorMessage('Current password is required.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMessage('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMessage('Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const serverUrl = await getServerUrl();
      const payload: any = {
        new_password: newPassword,
        confirm_password: confirmPassword,
      };
      if (hasPassword) {
        payload.current_password = currentPassword;
      }

      const res = await fetch(`${serverUrl}/api/passenger/profile/change-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        credentials: 'include',
      });

      const data = await res.json();
      setIsLoading(false);
      
      if (data && data.success) {
        setSuccessMessage(data.message || 'Password updated successfully!');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
        setHasPassword(true);
      } else {
        setErrorMessage(data.error || 'Failed to update password.');
      }
    } catch (err) {
      setIsLoading(false);
      setErrorMessage('Failed to communicate with server.');
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle={hasPassword ? 'Change Password' : 'Set Password'} showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View style={tw`bg-white rounded-3xl p-6 shadow-sm border border-slate-100`}>
            <View style={tw`w-16 h-16 rounded-full bg-[#dbeafe] justify-center items-center mx-auto mb-4`}>
              <MaterialIcons name="lock" size={32} color="#1e3a8a" />
            </View>

            <Text style={tw`text-lg font-black text-center text-slate-800 mb-1`}>
              {hasPassword ? 'Password Settings' : 'Create a Password'}
            </Text>
            <Text style={tw`text-xs text-center text-slate-400 font-medium mb-6`}>
              {hasPassword 
                ? 'Update your password to keep your account secure' 
                : 'Create a password so you can log in directly'}
            </Text>

            {/* Current Password */}
            {hasPassword && (
              <View style={tw`mb-4`}>
                <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>Current Password</Text>
                <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3`}>
                  <TextInput
                    style={[tw`flex-1 text-sm font-semibold`, { color: '#0f172a' }]}
                    secureTextEntry={secureCurrent}
                    placeholder="Enter current password"
                    placeholderTextColor="#94a3b8"
                    value={currentPassword}
                    onChangeText={setCurrentPassword}
                  />
                  <TouchableOpacity onPress={() => setSecureCurrent(!secureCurrent)}>
                    <MaterialIcons 
                      name={secureCurrent ? 'visibility-off' : 'visibility'} 
                      size={20} 
                      color="#64748b" 
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* New Password */}
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>New Password</Text>
              <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3`}>
                <TextInput
                  style={[tw`flex-1 text-sm font-semibold`, { color: '#0f172a' }]}
                  secureTextEntry={secureNew}
                  placeholder="Enter new password"
                  placeholderTextColor="#94a3b8"
                  value={newPassword}
                  onChangeText={setNewPassword}
                />
                <TouchableOpacity onPress={() => setSecureNew(!secureNew)}>
                  <MaterialIcons 
                    name={secureNew ? 'visibility-off' : 'visibility'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Confirm Password */}
            <View style={tw`mb-5`}>
              <Text style={tw`text-xs font-bold text-slate-400 mb-1.5`}>Confirm New Password</Text>
              <View style={tw`flex-row items-center bg-slate-50 border border-slate-200 rounded-xl px-4 py-3`}>
                <TextInput
                  style={[tw`flex-1 text-sm font-semibold`, { color: '#0f172a' }]}
                  secureTextEntry={secureConfirm}
                  placeholder="Confirm new password"
                  placeholderTextColor="#94a3b8"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                  <MaterialIcons 
                    name={secureConfirm ? 'visibility-off' : 'visibility'} 
                    size={20} 
                    color="#64748b" 
                  />
                </TouchableOpacity>
              </View>
            </View>

            {/* Requirements Banner */}
            <View style={tw`bg-blue-50/70 border border-blue-100 rounded-2xl p-4 mb-5`}>
              <Text style={tw`text-xs font-bold text-blue-700 mb-1`}>Password Requirements:</Text>
              <Text style={tw`text-xs text-blue-600/90 leading-relaxed`}>• At least 6 characters long</Text>
              <Text style={tw`text-xs text-blue-600/90 leading-relaxed`}>• Mix of letters and numbers recommended</Text>
            </View>

            {/* Buttons */}
            <TouchableOpacity 
              onPress={handleUpdatePassword}
              disabled={isLoading}
              style={tw`bg-[#1e3a8a] py-3.5 rounded-2xl items-center mb-3 shadow-md`}
            >
              <Text style={tw`text-sm font-bold text-white`}>
                {isLoading ? 'Updating...' : 'Update Password'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.back()}
              style={tw`bg-slate-100 py-3.5 rounded-2xl items-center border border-slate-200`}
            >
              <Text style={tw`text-sm font-bold text-slate-500`}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />

      {/* Custom Error Modal */}
      <Modal
        visible={!!errorMessage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setErrorMessage('')}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/50 px-5`}>
          <View style={tw`w-full bg-white rounded-3xl p-6 shadow-xl items-center w-[85%]`}>
            <View style={tw`w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4`}>
              <MaterialIcons name="error-outline" size={40} color="#ef4444" />
            </View>
            <Text style={tw`text-lg font-bold text-slate-800 mb-2 text-center`}>
              Error
            </Text>
            <Text style={tw`text-sm text-slate-500 font-semibold text-center mb-6`}>
              {errorMessage}
            </Text>
            
            <TouchableOpacity 
              onPress={() => setErrorMessage('')}
              style={tw`bg-slate-100 py-3 px-8 rounded-full`}
            >
              <Text style={tw`text-sm font-bold text-slate-600`}>Dismiss</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Custom Success Modal */}
      <Modal
        visible={!!successMessage}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSuccessMessage('')}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/50 px-5`}>
          <View style={tw`w-full bg-white rounded-3xl p-6 shadow-xl items-center w-[85%]`}>
            <View style={tw`w-16 h-16 rounded-full bg-emerald-100 items-center justify-center mb-4`}>
              <MaterialIcons name="check-circle" size={40} color="#10b981" />
            </View>
            <Text style={tw`text-lg font-bold text-slate-800 mb-2 text-center`}>
              Success
            </Text>
            <Text style={tw`text-sm text-slate-500 font-semibold text-center mb-6`}>
              {successMessage}
            </Text>
            
            <TouchableOpacity 
              onPress={() => {
                setSuccessMessage('');
                router.back();
              }}
              style={tw`bg-[#10b981] py-3 px-8 rounded-full`}
            >
              <Text style={tw`text-sm font-bold text-white`}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}
