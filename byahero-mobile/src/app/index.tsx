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
import { router, Link } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { login, getServerUrl, setServerUrl } from '../services/authService';

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

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#ffffff', overflow: 'hidden' }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView 
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center' }} 
          style={{ paddingHorizontal: 24, backgroundColor: '#ffffff' }}
          bounces={false}
          alwaysBounceVertical={false}
          alwaysBounceHorizontal={false}
          showsHorizontalScrollIndicator={false}
          showsVerticalScrollIndicator={false}
          overScrollMode="never"
        >
          <View style={{ width: '100%', maxWidth: 400, paddingVertical: 24 }}>
            <View style={{ alignItems: 'center', marginBottom: 30 }}>
              {/* Logo Tap Trigger */}
              <TouchableOpacity activeOpacity={0.8} onPress={handleLogoTap} style={{ alignItems: 'center' }}>
                <Image
                  source={require('../../assets/images/byaheroLogo.png')}
                  style={{ width: 100, height: 100 }}
                  contentFit="contain"
                />
                <Image
                  source={require('../../assets/images/ByaHero_rext_.svg')}
                  style={{ width: 180, height: 40, marginTop: 12 }}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>

            <View style={{ backgroundColor: '#ffffff' }}>
              <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 16 }}>
                LOG IN TO YOUR ACCOUNT
              </Text>

              {/* Email Input */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#f5f6f8', 
                borderRadius: 25, 
                paddingHorizontal: 16, 
                marginBottom: 20,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 3
              }}>
                <TextInput
                  value={email}
                  onChangeText={setEmail}
                  placeholder="Email"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                />
              </View>

              {/* Password Input */}
              <View style={{ 
                flexDirection: 'row', 
                alignItems: 'center', 
                backgroundColor: '#f5f6f8', 
                borderRadius: 25, 
                paddingHorizontal: 16, 
                marginBottom: 8,
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 3 },
                shadowOpacity: 0.08,
                shadowRadius: 4,
                elevation: 3
              }}>
                <TextInput
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={secureTextEntry}
                  placeholder="Password"
                  placeholderTextColor="#9ca3af"
                  autoCapitalize="none"
                  style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                />
                <TouchableOpacity onPress={() => setSecureTextEntry(!secureTextEntry)}>
                  <Ionicons name={secureTextEntry ? "eye-off" : "eye"} size={20} color="#000000" style={{ opacity: 0.8 }} />
                </TouchableOpacity>
              </View>

              {/* Forgot Password Link */}
              <TouchableOpacity
                onPress={() => router.push('/forgotPassword')}
                style={{ alignSelf: 'flex-start', marginBottom: 24, paddingLeft: 8 }}
              >
                <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Submit Button */}
              <TouchableOpacity
                onPress={handleLogin}
                disabled={isLoading}
                style={{ 
                  alignSelf: 'center', 
                  backgroundColor: '#1856b0', 
                  borderRadius: 25, 
                  paddingVertical: 12, 
                  paddingHorizontal: 40, 
                  marginTop: 12, 
                  minWidth: 140, 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.15,
                  shadowRadius: 4,
                  elevation: 2
                }}
              >
                {isLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>LOGIN</Text>
                )}
              </TouchableOpacity>

              {/* Sign Up Navigation link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 48 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/signUp')}
                  style={{ borderBottomWidth: 1.5, borderBottomColor: '#2563eb', paddingBottom: 1 }}
                >
                  <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600' }}>
                    Don't have an account? <Text style={{ fontWeight: 'bold' }}>Signup</Text>
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
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0, 0, 0, 0.6)', paddingHorizontal: 24 }}>
          <View style={{ backgroundColor: '#ffffff', width: '100%', maxWidth: 320, borderRadius: 24, padding: 24, borderWidth: 1, borderColor: '#e2e8f0' }}>
            <Text style={{ color: '#0f2c59', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>ByaHero Developer Settings</Text>
            <Text style={{ color: '#64748b', fontSize: 12, marginBottom: 16 }}>
              Enter Backend Base URL (e.g. http://10.0.2.2/ByaHero or http://192.168.1.100/ByaHero)
            </Text>
            <TextInput
              value={inputServerUrl}
              onChangeText={setInputServerUrl}
              placeholder="https://byahero.alwaysdata.net"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
              autoCorrect={false}
              style={{ backgroundColor: '#f1f5f9', color: '#333333', borderRadius: 12, paddingHorizontal: 16, paddingVertical: 8, borderWidth: 1, borderColor: '#cbd5e1', marginBottom: 16 }}
            />
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8 }}>
              <TouchableOpacity
                onPress={() => setIsDevModalVisible(false)}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#cbd5e1', borderRadius: 12 }}
              >
                <Text style={{ color: '#334155', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleSaveDevSettings}
                style={{ paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#1856b0', borderRadius: 12 }}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
