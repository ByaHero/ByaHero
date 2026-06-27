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
import * as WebBrowser from 'expo-web-browser';
import { login, googleAuth, getServerUrl, setServerUrl, cacheSession } from '../services/authService';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [secureTextEntry, setSecureTextEntry] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
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
    });
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

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert('Validation Error', 'Email and password are required.');
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password, true); // true = online
      setIsLoading(false);
      
      Alert.alert('Login Successful', `Logged in as ${result.role}`);
      
      // Navigate to matched roles:
      if (result.role === 'conductor') {
        router.replace('/conductor');
      } else if (result.role === 'admin') {
        router.replace('/admin');
      } else {
        router.replace('/passenger');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Authentication Failed', (error as any).message || 'Check network connection or configuration.');
    }
  };

  // Google Login Handler
  const handleGoogleMockLogin = async () => {
    setIsLoading(true);
    try {
      const baseUrl = await getServerUrl();
      const redirectUri = `${baseUrl}/public/login.php`;

      const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?response_type=token&client_id=299495970056-35hqu1hnl0ugisp6270he24qugv24skl.apps.googleusercontent.com&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile`;
      
      // Use openAuthSessionAsync to detect browser dismissals or cancellations
      const result = await WebBrowser.openAuthSessionAsync(googleAuthUrl, 'byaheromobile://');
      
      if (result.type === 'success' && result.url) {
        const url = result.url;
        let idToken = '';
        if (url.includes('id_token=')) {
          idToken = url.split('id_token=')[1].split('&')[0];
        } else if (url.includes('access_token=')) {
          idToken = url.split('access_token=')[1].split('&')[0];
        } else if (url.includes('credential=')) {
          idToken = url.split('credential=')[1].split('&')[0];
        }

        if (idToken) {
          const authResult = await googleAuth(idToken);
          setIsLoading(false);
          router.replace('/passenger');
        } else {
          setIsLoading(false);
          Alert.alert('Authentication Error', 'Google authentication succeeded but no verification token was returned.');
        }
      } else {
        setIsLoading(false);
        Alert.alert('Authentication Failed', 'Google authentication was cancelled, blocked, or failed to complete.');
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Authentication Error', (error as any).message || 'Failed to authenticate via Google.');
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
              {/* Logo Tap Trigger */}
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={tw`items-center`}>
                <Image
                  source={require('../../assets/images/byaheroLogo.png')}
                  style={tw`w-[105px] h-[105px]`}
                  contentFit="contain"
                />
                <Image
                  source={require('../../assets/images/ByaHero_rext_.svg')}
                  style={tw`w-[180px] h-[40px] mt-2`}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            {/* Login Card */}
            <View style={tw`bg-white rounded-[28px] px-7 py-8 w-full shadow-md`}>
              <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-6 text-center`}>
                LOG IN TO YOUR ACCOUNT
              </Text>

              {/* Email Input */}
              <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#7a98c8"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                />
              </View>

              {/* Password Input */}
              <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-3`}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  placeholder="Password"
                  placeholderTextColor="#7a98c8"
                  autoCapitalize="none"
                  style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off" : "eye"} size={18} color="#7a98c8" />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={() => router.push('/forgotPassword')}
                style={tw`self-start mb-6 ml-1.5`}
              >
                <Text style={tw`text-slate-500 text-[13px] font-medium`}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-5`}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={tw`text-white text-sm font-bold tracking-wider`}>LOGIN</Text>
                )}
              </TouchableOpacity>

              {/* Divider */}
              <View style={tw`flex-row items-center w-full mb-5`}>
                <View style={tw`flex-1 h-[1px] bg-slate-300`} />
                <Text style={tw`text-slate-500 text-[11px] font-bold mx-3`}>OR</Text>
                <View style={tw`flex-1 h-[1px] bg-slate-300`} />
              </View>

              {/* Google account widget chooser */}
              <TouchableOpacity
                onPress={handleGoogleMockLogin}
                activeOpacity={0.8}
                style={tw`flex-row items-center border border-slate-300 rounded-full px-3.5 py-2 w-full bg-white mb-7`}
              >
                <Image
                  source={require('../../assets/images/profilepic.png')}
                  style={tw`w-8 h-8 rounded-full`}
                />
                <View style={tw`flex-1 ml-3`}>
                  <Text style={tw`text-slate-800 text-[11px] font-bold`}>
                    Sign in as Timothy Irwin
                  </Text>
                  <View style={tw`flex-row items-center`}>
                    <Text style={tw`text-slate-500 text-[9px] font-medium mr-0.5`}>
                      timothybibat654@gmail.com
                    </Text>
                    <Ionicons name="chevron-down" size={10} color="#64748b" />
                  </View>
                </View>
                <Image
                  source={{ uri: 'https://developers.google.com/static/identity/images/g-logo.png' }}
                  style={tw`w-[18px] h-[18px]`}
                  contentFit="contain"
                />
              </TouchableOpacity>

              {/* Sign Up Navigation link */}
              <View style={tw`flex-row justify-center items-center`}>
                <Text style={tw`text-slate-500 text-[13px] font-medium`}>
                  Don't have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/signUp')}>
                  <Text style={tw`text-[#1d72f8] text-[13px] font-bold`}>
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
          <View style={tw`bg-white w-full max-w-[320px] rounded-3xl p-6 border border-slate-200`}>
            <Text style={tw`text-[#0f2c59] text-lg font-bold mb-2`}>ByaHero Developer Settings</Text>
            <Text style={tw`text-slate-500 text-xs mb-4`}>
              Enter Backend Base URL (e.g. http://10.0.2.2/ByaHero or http://192.168.1.100/ByaHero)
            </Text>
            <TextInput
              value={inputServerUrl}
              onChangeText={setInputServerUrl}
              placeholder="https://byahero.alwaysdata.net"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              style={tw`bg-slate-100 color-slate-800 rounded-xl px-4 py-2 border border-slate-300 mb-4`}
            />
            <View style={tw`flex-row justify-end gap-2`}>
              <TouchableOpacity
                onPress={() => setIsDevModalVisible(false)}
                style={tw`px-4 py-2 bg-slate-300 rounded-xl`}
              >
                <Text style={tw`text-slate-700 font-bold`}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDevSettings}
                style={tw`px-4 py-2 bg-[#1856b0] rounded-xl`}
              >
                <Text style={tw`text-white font-bold`}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
