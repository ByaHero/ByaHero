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
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
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
            </View>

            <View style={tw`bg-white rounded-[28px] px-7 py-8 w-full shadow-md`}>
              {step === 1 && (
                // STEP 1: Enter Email
                <View>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center`}>
                    PASSWORD RECOVERY
                  </Text>
                  <Text style={tw`text-slate-500 text-xs text-center mb-6 px-2`}>
                    Enter your email address to receive a 6-digit confirmation code.
                  </Text>

                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-6`}>
                    <TextInput
                      value={email}
                      onChangeText={setEmail}
                      placeholder="Email Address"
                      placeholderTextColor="#7a98c8"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleRequestOtp}
                    disabled={isLoading}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm font-bold tracking-wider`}>SEND RECOVERY CODE</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 2 && (
                // STEP 2: Enter OTP
                <View>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center`}>
                    ENTER CODE
                  </Text>
                  <Text style={tw`text-slate-500 text-xs text-center mb-4`}>
                    We sent a 6-digit code to <Text style={tw`text-[#1d72f8] font-bold`}>{email}</Text>
                  </Text>

                  {devOtp !== '' && (
                    <View style={tw`bg-slate-100 border border-slate-200 rounded-2xl p-3 mb-4 items-center`}>
                      <Text style={tw`text-slate-400 text-[10px] font-bold`}>Dev Mode Intercept</Text>
                      <Text style={tw`text-slate-400 text-[9px] text-center mb-1`}>Email transmission bypassed.</Text>
                      <Text style={[tw`text-[#1d72f8] text-lg font-extrabold`, { letterSpacing: 4 }]}>{devOtp}</Text>
                    </View>
                  )}

                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-5`}>
                    <TextInput
                      value={otp}
                      onChangeText={txt => setOtp(txt.replace(/[^0-9]/g, ''))}
                      placeholder="000000"
                      placeholderTextColor="#7a98c8"
                      keyboardType="numeric"
                      maxLength={6}
                      textAlign="center"
                      style={[tw`flex-1 color-[#0f172a] py-3 text-lg font-bold`, { letterSpacing: 6 }]}
                    />
                  </View>

                  <TouchableOpacity
                    onPress={handleVerifyOtp}
                    disabled={isLoading}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm font-bold tracking-wider`}>VERIFY CODE</Text>
                    )}
                  </TouchableOpacity>

                  <Text style={tw`text-slate-500 text-center text-xs mt-3`}>
                    Code expires in <Text style={tw`text-red-500 font-bold`}>{formatTime(timeLeft)}</Text>
                  </Text>
                </View>
              )}

              {step === 3 && (
                // STEP 3: Enter New Password
                <View>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center`}>
                    CREATE NEW PASSWORD
                  </Text>
                  <Text style={tw`text-slate-500 text-xs text-center mb-6 px-2`}>
                    Your identity has been verified. Please enter your new password below.
                  </Text>

                  {/* New Password Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
                    <TextInput
                      value={newPassword}
                      onChangeText={setNewPassword}
                      secureTextEntry={secureNewPass}
                      placeholder="New Password"
                      placeholderTextColor="#7a98c8"
                      autoCapitalize="none"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                    <TouchableOpacity onPress={() => setSecureNewPass(!secureNewPass)}>
                      <Ionicons name={secureNewPass ? "eye-off" : "eye"} size={18} color="#7a98c8" />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-6`}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={secureConfirmPass}
                      placeholder="Confirm Password"
                      placeholderTextColor="#7a98c8"
                      autoCapitalize="none"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                    <TouchableOpacity onPress={() => setSecureConfirmPass(!secureConfirmPass)}>
                      <Ionicons name={secureConfirmPass ? "eye-off" : "eye"} size={18} color="#7a98c8" />
                    </TouchableOpacity>
                  </View>

                  <TouchableOpacity
                    onPress={handleResetPassword}
                    disabled={isLoading}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm font-bold tracking-wider`}>RESET PASSWORD</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {step === 4 && (
                // STEP 4: Success
                <View style={tw`items-center py-4`}>
                  <Text style={tw`text-green-500 text-5xl font-bold mb-4`}>✓</Text>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center`}>Password Reset Complete</Text>
                  <Text style={tw`text-slate-500 text-xs text-center mb-6 px-4`}>
                    Your account is now secure. You can log in using your new password.
                  </Text>

                  <TouchableOpacity
                    onPress={() => router.push('/')}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm`}
                  >
                    <Text style={tw`text-white text-sm font-bold tracking-wider`}>GO TO LOGIN</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login link (shown unless reset is successful, in which case the button does it) */}
              {step !== 4 && (
                <TouchableOpacity 
                  onPress={() => router.push('/')}
                  style={tw`flex-row items-center justify-center py-2 mt-4 gap-1.5`}
                >
                  <Ionicons name="arrow-back" size={16} color="#64748b" />
                  <Text style={tw`text-slate-500 text-[13px] font-bold`}>
                    Back to Login
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
