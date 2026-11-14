import React, { useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, SafeAreaView, ScrollView, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { router } from 'expo-router';
import tw from 'twrnc';
import AlertModal from '../components/AlertModal';
import { forgotRequestOtp, forgotResetPassword, forgotVerifyOtp } from '../services/authService';

export default function ForgotPasswordScreen() {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const pending = useRef(false);

  const restart = () => {
    setOtp('');
    setPassword('');
    setConfirmation('');
    setStep(1);
  };

  const submit = async () => {
    if (pending.current) return;
    if (step === 1 && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Enter the email address registered to your account.');
      return;
    }
    if (step === 2 && !/^\d{6}$/.test(otp)) {
      setError('Enter the six-digit code from your email.');
      return;
    }
    if (step === 3 && (password.length < 6 || password !== confirmation)) {
      setError('Use at least six characters and make sure both passwords match.');
      return;
    }
    pending.current = true;
    setLoading(true);
    try {
      if (step === 1) {
        await forgotRequestOtp(email.trim());
        setStep(2);
      } else if (step === 2) {
        await forgotVerifyOtp(email.trim(), otp);
        setStep(3);
      } else if (step === 3) {
        await forgotResetPassword(email.trim(), otp, password);
        setPassword('');
        setConfirmation('');
        setOtp('');
        setStep(4);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to complete the request. Please try again.');
    } finally {
      pending.current = false;
      setLoading(false);
    }
  };

  const title = step === 1 ? 'PASSWORD RECOVERY' : step === 2 ? 'ENTER EMAIL CODE' : step === 3 ? 'NEW PASSWORD' : 'PASSWORD UPDATED';
  const button = step === 1 ? 'SEND RECOVERY CODE' : step === 2 ? 'VERIFY CODE' : 'UPDATE PASSWORD';

  return (
    <SafeAreaView style={tw`flex-1 bg-slate-100`}>
      <KeyboardAvoidingView style={tw`flex-1`} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={tw`flex-grow justify-center px-6 py-10`}>
          <View style={tw`w-full max-w-[400px] self-center bg-white rounded-3xl p-7`}>
            <Text accessibilityRole="header" style={tw`text-[#1d72f8] font-extrabold text-lg text-center mb-5`}>{title}</Text>
            {step === 1 ? (
              <>
                <Text style={tw`text-slate-600 text-center mb-5`}>Enter your account email to receive a six-digit recovery code.</Text>
                <TextInput accessibilityLabel="Account email" placeholder="Email address" value={email} onChangeText={setEmail}
                  keyboardType="email-address" autoCapitalize="none" autoCorrect={false} autoComplete="email" editable={!loading}
                  style={tw`bg-slate-100 rounded-2xl px-4 py-3 text-slate-900 mb-5`} />
              </>
            ) : step === 2 ? (
              <>
                <Text style={tw`text-slate-600 text-center mb-5`}>Enter the code sent to {email.trim()}. It expires after 10 minutes.</Text>
                <TextInput accessibilityLabel="Six-digit recovery code" placeholder="000000" value={otp}
                  onChangeText={value => setOtp(value.replace(/\D/g, ''))} keyboardType="number-pad" autoComplete="one-time-code"
                  maxLength={6} editable={!loading} style={tw`bg-slate-100 rounded-2xl px-4 py-3 text-center text-xl text-slate-900 mb-5`} />
              </>
            ) : step === 3 ? (
              <>
                <Text style={tw`text-slate-600 text-center mb-5`}>Choose a new password with at least six characters.</Text>
                <TextInput accessibilityLabel="New password" placeholder="New password" value={password} onChangeText={setPassword}
                  secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!loading}
                  style={tw`bg-slate-100 rounded-2xl px-4 py-3 text-slate-900 mb-4`} />
                <TextInput accessibilityLabel="Confirm new password" placeholder="Confirm new password" value={confirmation} onChangeText={setConfirmation}
                  secureTextEntry autoCapitalize="none" autoCorrect={false} autoComplete="new-password" editable={!loading}
                  style={tw`bg-slate-100 rounded-2xl px-4 py-3 text-slate-900 mb-5`} />
              </>
            ) : (
              <Text style={tw`text-slate-600 text-center mb-5`}>Your password has been updated. Sign in with your new password.</Text>
            )}
            <TouchableOpacity accessibilityRole="button" accessibilityState={{ disabled: loading, busy: loading }} disabled={loading}
              onPress={step === 4 ? () => router.replace('/') : submit}
              style={tw`bg-[#1d72f8] rounded-full py-4 items-center ${loading ? 'opacity-60' : ''}`}>
              {loading ? <ActivityIndicator color="#ffffff" /> : <Text style={tw`text-white font-bold`}>{step === 4 ? 'GO TO LOGIN' : button}</Text>}
            </TouchableOpacity>
            {step === 2 || step === 3 ? (
              <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={restart} style={tw`py-3 mt-2`}>
                <Text style={tw`text-[#1d72f8] text-center`}>Request a new code or use another email</Text>
              </TouchableOpacity>
            ) : null}
            {step !== 4 ? (
              <TouchableOpacity accessibilityRole="button" disabled={loading} onPress={() => router.replace('/')} style={tw`py-3 mt-2`}>
                <Text style={tw`text-slate-600 text-center`}>Back to Login</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <AlertModal visible={error !== ''} title="Request Failed" message={error} type="error" onConfirm={() => setError('')} />
    </SafeAreaView>
  );
}
