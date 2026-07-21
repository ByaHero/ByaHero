import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  SafeAreaView,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
import { login, getServerUrl, setServerUrl, preWarmServer } from '../services/authService';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [showWarmingUpMsg, setShowWarmingUpMsg] = useState(false);
  const [serverUrl, setServerUrlState] = useState('');

  // Developer URL configuration modal state
  const [logoTapCount, setLogoTapCount] = useState(0);
  const [lastTapTime, setLastTapTime] = useState(0);
  const [isDevModalVisible, setIsDevModalVisible] = useState(false);
  const [inputServerUrl, setInputServerUrl] = useState('');

  useEffect(() => {
    getServerUrl().then(url => {
      setServerUrlState(url);
      setInputServerUrl(url);
      preWarmServer();
    });

    const checkAutoLogin = async () => {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email');
        const cachedRole = await AsyncStorage.getItem('byahero_cached_role');
        const hasLivePayload = await AsyncStorage.getItem('byahero_conductor_payload');

        if (cachedEmail && cachedRole === 'conductor') {
          if (hasLivePayload) {
            router.replace('/liveTracking');
          } else {
            router.replace('/dashboard');
          }
        }
      } catch (err) {
        console.error('Auto-login session restoration failed:', err);
      }
    };
    checkAutoLogin();
  }, []);

  const handleLogoTap = () => {
    const now = Date.now();
    if (now - lastTapTime > 1500) {
      setLogoTapCount(1);
    } else {
      const nextCount = logoTapCount + 1;
      setLogoTapCount(nextCount);
      if (nextCount === 5) {
        setLogoTapCount(0);
        setIsDevModalVisible(true);
      }
    }
    setLastTapTime(now);
  };

  const handleSaveDevSettings = async () => {
    try {
      await setServerUrl(inputServerUrl);
      const updatedUrl = await getServerUrl();
      setServerUrlState(updatedUrl);
      setIsDevModalVisible(false);
      Alert.alert('Success', `Backend URL set to: ${updatedUrl}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to save server URL.');
    }
  };

  // Custom Auth Response Modal state
  const [authModalConfig, setAuthModalConfig] = useState<{
    visible: boolean;
    type: 'success' | 'error';
    title: string;
    message: string;
    targetRoute?: string;
  }>({
    visible: false,
    type: 'success',
    title: '',
    message: '',
  });

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      setAuthModalConfig({
        visible: true,
        type: 'error',
        title: 'Validation Error',
        message: 'Email and password are required.',
      });
      return;
    }

    setIsLoading(true);
    setShowWarmingUpMsg(false);
    const timer = setTimeout(() => {
      setShowWarmingUpMsg(true);
    }, 3500);

    try {
      const result = await login(email, password, true);
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);

      if (result.role !== 'conductor') {
        setAuthModalConfig({
          visible: true,
          type: 'error',
          title: 'Access Denied',
          message: 'This app is only for authorized ByaHero conductors.',
        });
        return;
      }

      const hasLivePayload = await AsyncStorage.getItem('byahero_conductor_payload');
      const targetRoute = hasLivePayload ? '/liveTracking' : '/dashboard';

      setAuthModalConfig({
        visible: true,
        type: 'success',
        title: 'Login Successful',
        message: 'Hello, welcome back user.',
        targetRoute,
      });
    } catch (error) {
      clearTimeout(timer);
      setIsLoading(false);
      setShowWarmingUpMsg(false);
      setAuthModalConfig({
        visible: true,
        type: 'error',
        title: 'Authentication Failed',
        message: (error as any).message || 'Check network connection or configuration.',
      });
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw`flex-1`}
      >
        <ScrollView
          contentContainerStyle={tw`flex-grow justify-center items-center py-10`}
          style={tw`px-6`}
          bounces={false}
          showsVerticalScrollIndicator={false}
        >
          <View style={tw`w-full max-w-[400px] items-center`}>
            <View style={tw`items-center mb-8`}>
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={tw`items-center`}>
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
              </TouchableOpacity>
            </View>

            {/* Login Card */}
            <View style={tw`bg-white rounded-[28px] px-7 py-8 w-full shadow-lg border border-slate-100`}>
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
                  style={tw`flex-1 text-slate-800 py-3 text-sm font-semibold`}
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
                  style={tw`flex-1 text-slate-800 py-3 text-sm font-semibold`}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off" : "eye"} size={18} color="#94a3b8" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password */}
              <TouchableOpacity
                onPress={() => Alert.alert('Information', 'Please contact ByaHero Admin to request a password reset.')}
                style={tw`self-start mb-6 ml-3`}
              >
                <Text style={tw`text-slate-500 text-xs font-semibold`}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={tw`bg-[#1d72f8] rounded-full py-3 px-12 self-center justify-center shadow-md ${isLoading && showWarmingUpMsg ? 'mb-2' : 'mb-5'}`}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={tw`text-white text-sm font-bold tracking-wider`}>LOGIN</Text>
                )}
              </TouchableOpacity>

              {isLoading && showWarmingUpMsg && (
                <Text style={tw`text-amber-500 text-[10px] font-semibold text-center mb-4 px-2`}>
                  Waking up database server... This may take up to a minute if it was asleep.
                </Text>
              )}

              {/* Divider */}
              <View style={tw`flex-row items-center w-full mb-5`}>
                <View style={tw`flex-1 h-[1px] bg-slate-200`} />
                <Text style={tw`text-slate-400 text-[10px] font-bold mx-3`}>OR</Text>
                <View style={tw`flex-1 h-[1px] bg-slate-200`} />
              </View>

              {/* Google sign-in button */}
              <TouchableOpacity
                onPress={() => Alert.alert('Google Sign-In', 'Google sign-in is managed by ByaHero central authentication.')}
                activeOpacity={0.85}
                style={tw`flex-row items-center justify-center border border-slate-200 rounded-full py-2.5 px-4 w-full bg-white mb-6 shadow-sm`}
              >
                <Image
                  source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
                  style={tw`w-4 h-4 mr-3`}
                  contentFit="contain"
                />
                <Text style={tw`text-slate-700 text-xs font-semibold`}>
                  Continue with Google
                </Text>
              </TouchableOpacity>

              {/* Sign Up Navigation link */}
              <View style={tw`flex-row justify-center items-center`}>
                <Text style={tw`text-slate-500 text-xs font-medium`}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => Alert.alert('Register', 'Conductor registration is managed by ByaHero Admin.')}>
                  <Text style={tw`text-[#1d72f8] text-xs font-bold`}>
                    Sign up
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Developer Settings Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={isDevModalVisible}
        onRequestClose={() => setIsDevModalVisible(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`bg-white w-full max-w-[320px] rounded-3xl p-6 border border-slate-100 shadow-xl`}>
            <Text style={tw`text-slate-800 text-lg font-bold mb-2`}>Developer Settings</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>
              Enter Backend Base URL (e.g. http://10.0.2.2/ByaHero or https://byahero.alwaysdata.net)
            </Text>
            <TextInput
              value={inputServerUrl}
              onChangeText={setInputServerUrl}
              placeholder="https://byahero.alwaysdata.net"
              placeholderTextColor="#94a3b8"
              autoCapitalize="none"
              autoCorrect={false}
              style={tw`bg-slate-50 text-slate-800 rounded-xl px-4 py-2 border border-slate-200 mb-4`}
            />
            <View style={tw`flex-row justify-end gap-2`}>
              <TouchableOpacity
                onPress={() => setIsDevModalVisible(false)}
                style={tw`px-4 py-2 bg-slate-100 rounded-xl`}
              >
                <Text style={tw`text-slate-700 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDevSettings}
                style={tw`px-4 py-2 bg-[#1d72f8] rounded-xl`}
              >
                <Text style={tw`text-white font-bold`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Auth Result Modal (Success / Error) */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={authModalConfig.visible}
        onRequestClose={() => setAuthModalConfig(prev => ({ ...prev, visible: false }))}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`bg-white w-full max-w-[340px] rounded-3xl p-6 items-center shadow-2xl border border-slate-100`}>
            <View style={tw`w-16 h-16 rounded-full ${authModalConfig.type === 'success' ? 'bg-emerald-100' : 'bg-rose-100'} items-center justify-center mb-4`}>
              <Ionicons
                name={authModalConfig.type === 'success' ? 'checkmark-circle' : 'alert-circle'}
                size={38}
                color={authModalConfig.type === 'success' ? '#10b981' : '#f43f5e'}
              />
            </View>

            <Text style={tw`text-slate-800 text-lg font-bold mb-2 text-center`}>
              {authModalConfig.title}
            </Text>

            <Text style={tw`text-slate-600 text-sm text-center mb-6 leading-5 px-2 font-medium`}>
              {authModalConfig.message}
            </Text>

            <TouchableOpacity
              onPress={() => {
                const target = authModalConfig.targetRoute;
                setAuthModalConfig(prev => ({ ...prev, visible: false }));
                if (target) {
                  router.replace(target as any);
                }
              }}
              activeOpacity={0.8}
              style={tw`w-full ${authModalConfig.type === 'success' ? 'bg-[#1d72f8]' : 'bg-slate-800'} py-3.5 rounded-full items-center shadow-md`}
            >
              <Text style={tw`text-white font-bold text-sm tracking-wide`}>
                {authModalConfig.type === 'success' ? 'CONTINUE' : 'OK'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
