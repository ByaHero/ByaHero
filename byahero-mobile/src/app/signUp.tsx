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
import { router } from 'expo-router';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import tw from 'twrnc';
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
              {step === 1 ? (
                // STEP 1: Registration Form
                <View>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-6 text-center`}>
                    CREATE NEW ACCOUNT
                  </Text>

                  {/* Name Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
                    <TextInput
                      value={name}
                      onChangeText={setName}
                      placeholder="Full Name (optional)"
                      placeholderTextColor="#7a98c8"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                  </View>

                  {/* Email Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
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

                  {/* Contacts Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
                    <TextInput
                      value={contacts}
                      onChangeText={txt => setContacts(txt.replace(/[^0-9]/g, ''))}
                      placeholder="Contact Number (e.g. 09123456789)"
                      placeholderTextColor="#7a98c8"
                      keyboardType="numeric"
                      maxLength={11}
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                  </View>

                  {/* Password Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-4`}>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      secureTextEntry={securePass}
                      placeholder="Password"
                      placeholderTextColor="#7a98c8"
                      autoCapitalize="none"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                    <TouchableOpacity onPress={() => setSecurePass(!securePass)}>
                      <Ionicons name={securePass ? "eye-off" : "eye"} size={18} color="#7a98c8" />
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Input */}
                  <View style={tw`flex-row items-center bg-[#e8efff] rounded-full px-5 mb-6`}>
                    <TextInput
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      secureTextEntry={secureConfirm}
                      placeholder="Confirm Password"
                      placeholderTextColor="#7a98c8"
                      autoCapitalize="none"
                      style={tw`flex-1 color-[#0f172a] py-3 text-sm font-semibold`}
                    />
                    <TouchableOpacity onPress={() => setSecureConfirm(!secureConfirm)}>
                      <Ionicons name={secureConfirm ? "eye-off" : "eye"} size={18} color="#7a98c8" />
                    </TouchableOpacity>
                  </View>

                  {/* Register Submit Button */}
                  <TouchableOpacity
                    onPress={handleSignUpSubmit}
                    disabled={isLoading}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm font-bold tracking-wider`}>SIGN UP</Text>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                // STEP 2: OTP Verification
                <View>
                  <Text style={tw`text-[#1d72f8] text-sm font-extrabold tracking-wider mb-2 text-center`}>
                    VERIFY EMAIL
                  </Text>
                  <Text style={tw`text-slate-500 text-xs text-center mb-4`}>
                    We sent a 6-digit code to <Text style={tw`text-[#1d72f8] font-bold`}>{email}</Text>
                  </Text>

                  {/* Dev Mode Code Display */}
                  {devOtp !== '' && (
                    <View style={tw`bg-slate-100 border border-slate-200 rounded-2xl p-3 mb-4 items-center`}>
                      <Text style={tw`text-slate-400 text-[10px] font-bold`}>Dev Mode Intercept</Text>
                      <Text style={[tw`text-[#1d72f8] text-lg font-extrabold`, { letterSpacing: 4 }]}>{devOtp}</Text>
                    </View>
                  )}

                  {/* OTP Input */}
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

                  {/* Verify Submit Button */}
                  <TouchableOpacity
                    onPress={handleOtpVerify}
                    disabled={isLoading}
                    style={tw`self-center bg-[#1d72f8] rounded-full py-3.5 w-full items-center justify-center shadow-sm mb-4`}
                  >
                    {isLoading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={tw`text-white text-sm font-bold tracking-wider`}>VERIFY</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => setStep(1)}
                    style={tw`self-center py-2`}
                  >
                    <Text style={tw`text-slate-500 text-[13px] font-semibold underline`}>Change email</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Back to Login link */}
              <View style={tw`flex-row justify-center items-center mt-6`}>
                <Text style={tw`text-slate-500 text-[13px] font-medium`}>
                  Already have an account?{' '}
                </Text>
                <TouchableOpacity onPress={() => router.push('/')}>
                  <Text style={tw`text-[#1d72f8] text-[13px] font-bold`}>
                    Login
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
