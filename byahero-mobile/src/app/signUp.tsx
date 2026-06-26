import React, { useState } from 'react';
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
import { router, Link } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { signupRequestOtp, signupVerifyOtp } from '../services/authService';

export default function SignUpScreen() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  // Step 1 Registration Fields
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [contacts, setContacts] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [securePass, setSecurePass] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  // Step 2 OTP Fields
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');

  const handleSignUpSubmit = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Email address is required.');
      return;
    }
    
    const contactVal = contacts.trim();
    if (!/^(09|639)\d{9}$/.test(contactVal)) {
      Alert.alert('Validation Error', 'Please enter a valid Philippine mobile number (e.g., 09123456789).');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signupRequestOtp(name, email, contacts, password, confirmPassword);
      setIsLoading(false);
      
      if (response.success) {
        if (response.devOtp) {
          setDevOtp(response.devOtp);
        } else {
          setDevOtp('');
        }
        setStep(2);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Registration Request Failed', (error as any).message || 'Server error. Please try again.');
    }
  };

  const handleOtpVerify = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Validation Error', 'Please enter the 6-digit OTP code.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await signupVerifyOtp(email, otp);
      setIsLoading(false);
      if (response.success) {
        Alert.alert('Success', 'Verification complete!', [
          {
            text: 'OK',
            onPress: () => router.replace('/passenger'),
          },
        ]);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Verification Failed', (error as any).message || 'Invalid code.');
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
            </View>

            <View style={{ backgroundColor: '#ffffff' }}>
              {step === 1 ? (
                // STEP 1: Registration Form
                <View>
                  <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 16 }}>
                    CREATE NEW ACCOUNT
                  </Text>

                  {/* Name Input */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f6f8', 
                    borderRadius: 25, 
                    paddingHorizontal: 16, 
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Full Name (optional)"
                      placeholderTextColor="#9ca3af"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                  </View>

                  {/* Email Input */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f6f8', 
                    borderRadius: 25, 
                    paddingHorizontal: 16, 
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email Address"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                  </View>

                  {/* Contacts Input */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f6f8', 
                    borderRadius: 25, 
                    paddingHorizontal: 16, 
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={contacts}
                      onChangeText={txt => setContacts(txt.replace(/[^0-9]/g, ''))}
                      placeholder="Contact Number (e.g. 09123456789)"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={11}
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
                    marginBottom: 16,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={securePass}
                      placeholder="Password"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                    <TouchableOpacity onPress={() => setSecurePass(!securePass)}>
                      <Ionicons name={securePass ? "eye-off" : "eye"} size={20} color="#000000" style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f6f8', 
                    borderRadius: 25, 
                    paddingHorizontal: 16, 
                    marginBottom: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={secureConfirm}
                      placeholder="Confirm Password"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                    <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                      <Ionicons name={secureConfirm ? "eye-off" : "eye"} size={20} color="#000000" style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                  </View>

                  {/* Register Submit Button */}
                  <TouchableOpacity
                    onPress={handleSignUpSubmit}
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
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>SIGN UP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                // STEP 2: OTP Verification
                <View>
                  <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>
                    VERIFY EMAIL
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                    We sent a 6-digit code to <Text style={{ color: '#1856b0', fontWeight: 'bold' }}>{email}</Text>
                  </Text>

                  {/* Dev Mode Code Display */}
                  {devOtp !== '' && (
                    <View style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold' }}>Dev Mode Intercept</Text>
                      <Text style={{ color: '#103d7c', fontSize: 18, fontWeight: '800', letterSpacing: 4 }}>{devOtp}</Text>
                    </View>
                  )}

                  {/* OTP Input */}
                  <View style={{ 
                    flexDirection: 'row', 
                    alignItems: 'center', 
                    backgroundColor: '#f5f6f8', 
                    borderRadius: 25, 
                    paddingHorizontal: 16, 
                    marginBottom: 24,
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.08,
                    shadowRadius: 4,
                    elevation: 3
                  }}>
                    <TextInput
                      value={otp}
                      onChangeText={txt => setOtp(txt.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, fontSize: 18, fontWeight: 'bold', letterSpacing: 6 }}
                    />
                  </View>

                  {/* Verify Submit Button */}
                  <TouchableOpacity
                    onPress={handleOtpVerify}
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
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>VERIFY</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    style={{ paddingVertical: 12, alignItems: 'center', marginTop: 12 }}
                  >
                    <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600', textDecorationLine: 'underline' }}>Change email</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login link */}
              <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 48 }}>
                <TouchableOpacity 
                  onPress={() => router.push('/')}
                  style={{ borderBottomWidth: 1.5, borderBottomColor: '#2563eb', paddingBottom: 1 }}
                >
                  <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600' }}>
                    Already have an account? <Text style={{ fontWeight: 'bold' }}>Login</Text>
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
