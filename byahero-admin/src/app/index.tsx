import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { adminService } from '../services/admin';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
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
    <SafeAreaView style={tw`flex-1 bg-slate-100`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center items-center py-10`}
          style={tw`px-6 bg-slate-100`}
          bounces={false}
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <View style={tw`w-full max-w-[400px] items-center`}>
            <View style={tw`items-center mb-7`}>
              <View style={tw`items-center`}>
                <Image
                  source={require('../../assets/images/byaheroLogo.png')}
                  style={tw`w-[120px] h-[120px]`}
                  contentFit="contain"
                />
                <Image
                  source={require('../../assets/images/ByaHero_rext_.svg')}
                  style={tw`w-[150px] h-[36px] mt-1`}
                  contentFit="contain"
                />
              </View>
            </View>

            {/* Login Card */}
            <View style={tw`bg-white rounded-[28px] px-7 py-8 w-full shadow-md`}>
              <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-6 text-center`}>
                LOG IN TO YOUR ACCOUNT
              </Text>

              {/* Email Input */}
              <View style={tw`flex-row items-center bg-white rounded-full px-6 mb-4 border border-slate-100 shadow-sm`}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#94a3b8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={tw`flex-1 text-slate-800 py-3 text-sm font-semibold outline-none`}
                />
              </View>

              {/* Password Input */}
              <View style={tw`flex-row items-center bg-white rounded-full px-6 mb-3 border border-slate-100 shadow-sm`}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  placeholder="Password"
                  placeholderTextColor="#94a3b8"
                  autoCapitalize="none"
                  style={tw`flex-1 text-slate-800 py-3 text-sm font-semibold outline-none`}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off" : "eye"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={() => Alert.alert('Forgot Password', 'Not implemented for admin.')}
                style={tw`self-start mb-6 ml-3`}
              >
                <Text style={tw`text-slate-500 text-xs font-semibold`}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={loading}
                style={tw`bg-[#1d72f8] rounded-full py-3 px-12 self-center justify-center shadow-md mb-5`}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={tw`text-white text-sm font-bold tracking-wider`}>LOGIN</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
