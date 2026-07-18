import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, KeyboardAvoidingView, Platform, Alert } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '../services/admin';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  // Check if already logged in
  useEffect(() => {
    const checkLogin = async () => {
      const user = await AsyncStorage.getItem('byahero_admin_user');
      if (user) {
        router.replace('/admin');
      }
    };
    checkLogin();
  }, []);

  const handleLogin = async () => {
    if (!email || !password) {
      if (Platform.OS === 'web') {
        window.alert('Please enter both email and password');
      } else {
        Alert.alert('Error', 'Please enter both email and password');
      }
      return;
    }

    setLoading(true);
    try {
      const response = await adminService.login(email, password);
      
      if (response.success) {
        // Only allow admins
        if (response.redirect && response.redirect.includes('admin') || response.role === 'admin') {
          await AsyncStorage.setItem('byahero_cached_email', email);
          await AsyncStorage.setItem('byahero_cached_role', 'admin');
          await AsyncStorage.setItem('byahero_admin_user', JSON.stringify(response.user || { email }));
          
          router.replace('/admin');
        } else {
          const msg = 'Unauthorized. Admin access only.';
          Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
        }
      } else {
        const msg = response.message || response.error || 'Invalid email or password.';
        Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
      }
    } catch (e: any) {
      const msg = e.message || 'An error occurred during login. Please try again.';
      Platform.OS === 'web' ? window.alert(msg) : Alert.alert('Error', msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw`flex-1 bg-white`}
    >
      <View style={tw`flex-1 justify-center items-center px-6 bg-[#f8fafc]`}>
        <View style={tw`w-full max-w-md bg-white p-8 rounded-3xl shadow-lg border border-slate-100`}>
          
          <View style={tw`items-center mb-8`}>
            {/* Try to use the logo if available, else a placeholder */}
            <Image 
              source={require('../../assets/images/byaheroLogoBlue.svg')} 
              style={tw`w-24 h-24 mb-4`} 
              contentFit="contain" 
            />
            <Text style={tw`text-3xl font-black text-[#0f3878] tracking-tight`}>ByaHero Admin</Text>
            <Text style={tw`text-slate-500 text-sm mt-2 text-center`}>
              Enter your credentials to access the control center.
            </Text>
          </View>

          <View style={tw`space-y-4`}>
            <View style={tw`mb-4`}>
              <Text style={tw`text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-wider`}>Email Address</Text>
              <TextInput
                style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 font-medium`}
                placeholder="admin@byahero.com"
                value={email}
                onChangeText={setEmail}
                keyboardType="email-address"
                autoCapitalize="none"
              />
            </View>

            <View style={tw`mb-6`}>
              <Text style={tw`text-xs font-bold text-slate-500 mb-1 ml-1 uppercase tracking-wider`}>Password</Text>
              <TextInput
                style={tw`w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3.5 text-slate-800 font-medium`}
                placeholder="••••••••"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
              />
            </View>

            <TouchableOpacity 
              onPress={handleLogin}
              disabled={loading}
              style={tw`w-full bg-[#1d4ed8] rounded-xl py-4 items-center flex-row justify-center shadow-md`}
            >
              {loading ? (
                <ActivityIndicator color="white" style={tw`mr-2`} />
              ) : null}
              <Text style={tw`text-white font-bold text-[15px]`}>
                {loading ? 'Signing in...' : 'Sign In'}
              </Text>
            </TouchableOpacity>
          </View>

        </View>
      </View>
    </KeyboardAvoidingView>
  );
}
