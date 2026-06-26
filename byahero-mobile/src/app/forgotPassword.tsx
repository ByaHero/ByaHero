import React, { useState, useEffect, useRef } from 'react';
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
import { forgotRequestOtp, forgotVerifyOtp, forgotResetPassword } from '../services/authService';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [secureNewPass, setSecureNewPass] = useState(true);
  const [secureConfirmPass, setSecureConfirmPass] = useState(true);

  const [timeLeft, setTimeLeft] = useState(900); // 15 mins
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (step === 2) {
      setTimeLeft(900);
      timerIntervalRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            if (timerIntervalRef.current !== null) {
              clearInterval(timerIntervalRef.current);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    }

    return () => {
      if (timerIntervalRef.current) {
        clearInterval(timerIntervalRef.current);
      }
    };
  }, [step]);

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const handleRequestOtp = async () => {
    if (!email.trim()) {
      Alert.alert('Validation Error', 'Please enter your email address.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotRequestOtp(email);
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
      Alert.alert('Request Failed', (error as any).message || 'Error occurred. Try again.');
    }
  };

  const handleVerifyOtp = async () => {
    if (otp.trim().length !== 6) {
      Alert.alert('Validation Error', 'Please enter the 6-digit OTP code.');
      return;
    }
    if (timeLeft <= 0) {
      Alert.alert('Code Expired', 'The recovery code has expired. Please request a new one.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotVerifyOtp(email, otp);
      setIsLoading(false);
      if (response.success) {
        setStep(3);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Verification Failed', (error as any).message || 'Invalid code.');
    }
  };

  const handleResetPassword = async () => {
    if (newPassword.length < 6) {
      Alert.alert('Validation Error', 'Password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      Alert.alert('Validation Error', 'Passwords do not match.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await forgotResetPassword(email, otp, newPassword);
      setIsLoading(false);
      if (response.success) {
        setStep(4);
      }
    } catch (error) {
      setIsLoading(false);
      Alert.alert('Reset Failed', (error as any).message || 'Error occurred. Try again.');
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
              {step === 1 && (
                // STEP 1: Enter Email
                <View>
                  <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>
                    PASSWORD RECOVERY
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                    Enter your email address to receive a 6-digit confirmation code.
                  </Text>

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
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email Address"
                      placeholderTextColor="#9ca3af"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    disabled={isLoading}
                    style={{ 
                      alignSelf: 'center', 
                      backgroundColor: '#1856b0', 
                      borderRadius: 25, 
                      paddingVertical: 12, 
                      paddingHorizontal: 30, 
                      marginTop: 12, 
                      minWidth: 160, 
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
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>SEND RECOVERY CODE</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                // STEP 2: Enter OTP
                <View>
                  <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8, textAlign: 'center' }}>
                    ENTER CODE
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 16 }}>
                    We sent a 6-digit code to <Text style={{ color: '#1856b0', fontWeight: 'bold' }}>{email}</Text>
                  </Text>

                  {devOtp !== '' && (
                    <View style={{ backgroundColor: '#f1f5f9', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 12, padding: 12, marginBottom: 16, alignItems: 'center' }}>
                      <Text style={{ color: '#64748b', fontSize: 12, fontWeight: 'bold' }}>Dev Mode Intercept</Text>
                      <Text style={{ color: '#64748b', fontSize: 11, textAlign: 'center', marginBottom: 4 }}>Email transmission bypassed.</Text>
                      <Text style={{ color: '#103d7c', fontSize: 18, fontWeight: '800', letterSpacing: 4 }}>{devOtp}</Text>
                    </View>
                  )}

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
                      placeholder="6-Digit Code"
                      placeholderTextColor="#9ca3af"
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, fontSize: 18, fontWeight: 'bold', letterSpacing: 6 }}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
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
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>VERIFY CODE</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={{ color: '#64748b', textAlign: 'center', fontSize: 13, marginTop: 24 }}>
                    Code expires in <Text style={{ color: '#ef4444', fontWeight: 'bold' }}>{formatTime(timeLeft)}</Text>
                  </Text>
                </View>
              )}

              {step === 3 && (
                // STEP 3: Enter New Password
                <View>
                  <Text style={{ color: '#103d7c', fontSize: 13, fontWeight: '800', letterSpacing: 0.5, marginBottom: 8 }}>
                    CREATE NEW PASSWORD
                  </Text>
                  <Text style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>
                    Your identity has been verified. Please enter your new password below.
                  </Text>

                  {/* New Password Input */}
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
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={secureNewPass}
                      placeholder="New Password"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                    <TouchableOpacity onPress={() => setSecureNewPass(!secureNewPass)}>
                      <Ionicons name={secureNewPass ? "eye-off" : "eye"} size={20} color="#000000" style={{ opacity: 0.8 }} />
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
                      secureTextEntry={secureConfirmPass}
                      placeholder="Confirm Password"
                      placeholderTextColor="#9ca3af"
                      autoCapitalize="none"
                      style={{ flex: 1, color: '#333333', paddingVertical: 12, paddingHorizontal: 4, fontSize: 14, fontWeight: '500' }}
                    />
                    <TouchableOpacity onPress={() => setSecureConfirmPass(!secureConfirmPass)}>
                      <Ionicons name={secureConfirmPass ? "eye-off" : "eye"} size={20} color="#000000" style={{ opacity: 0.8 }} />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPassword}
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
                      <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>RESET PASSWORD</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 4 && (
                // STEP 4: Success
                <View style={{ alignItems: 'center', paddingVertical: 16 }}>
                  <Text style={{ color: '#22c55e', fontSize: 48, fontWeight: 'bold', marginBottom: 16 }}>✓</Text>
                  <Text style={{ color: '#103d7c', textAlign: 'center', fontSize: 18, fontWeight: 'bold', marginBottom: 8 }}>Password Reset Complete</Text>
                  <Text style={{ color: '#64748b', fontSize: 14, textAlign: 'center', marginBottom: 24 }}>
                    Your account is now secure. You can log in using your new password.
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push('/')}
                    style={{ 
                      alignSelf: 'center', 
                      backgroundColor: '#1856b0', 
                      borderRadius: 25, 
                      paddingVertical: 12, 
                      paddingHorizontal: 40, 
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
                    <Text style={{ color: '#ffffff', fontSize: 14, fontWeight: 'bold', letterSpacing: 0.5 }}>GO TO LOGIN</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login link (shown unless reset is successful, in which case the button does it) */}
              {step !== 4 && (
                <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 48 }}>
                  <TouchableOpacity 
                    onPress={() => router.push('/')}
                    style={{ borderBottomWidth: 1.5, borderBottomColor: '#2563eb', paddingBottom: 1 }}
                  >
                    <Text style={{ color: '#2563eb', fontSize: 12, fontWeight: '600' }}>
                      Back to <Text style={{ fontWeight: 'bold' }}>Login</Text>
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
