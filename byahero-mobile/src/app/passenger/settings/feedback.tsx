import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import TourOverlay, { tourSteps } from '../../../components/TourOverlay';
import { handleTourLayout } from '../../../components/TourRegistry';

export default function FeedbackScreen() {
  const [activeStep, setActiveStep] = useState<number | null>(null);
  const feedbackCardRef = useRef<any>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === '/passenger/settings/feedback') {
            setActiveStep(stepIdx);
          } else {
            setActiveStep(null);
          }
        } else {
          setActiveStep(null);
        }
      }
      checkTour();
      return () => {
        setActiveStep(null);
      };
    }, [])
  );

  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submittedMessage, setSubmittedMessage] = useState('');

  useEffect(() => {
    async function checkLogin() {
      const email = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
      const loggedIn = email !== 'Guest' && email !== 'guest@byahero.app';
      setIsLoggedIn(loggedIn);
      if (!loggedIn) {
        Alert.alert('Authentication Required', 'Please log in to submit feedback.');
        router.back();
      }
    }
    checkLogin();
  }, []);

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Validation Error', 'Please select a star rating.');
      return;
    }

    setIsLoading(true);
    try {
      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('feedback', feedback.trim());

      const res = await fetch(`${serverUrl}/api/settings/feedback`, {
        method: 'POST',
        body: formData,
        credentials: 'include'
      });
      const data = await res.json();
      setIsLoading(false);

      if (data && data.success) {
        setSubmittedMessage('Thank you for helping us improve ByaHero.');
        setSubmitted(true);
        setTimeout(() => {
          router.replace('/passenger');
        }, 2000);
      } else {
        Alert.alert('Saved Locally', 'Saved feedback locally. Server connection failed (queued for sync).');
        await queueFeedbackOffline();
      }
    } catch (e) {
      setIsLoading(false);
      Alert.alert('Saved Locally', 'Saved feedback locally. Server connection failed (queued for sync).');
      await queueFeedbackOffline();
    }
  };

  const queueFeedbackOffline = async () => {
    try {
      const stored = await AsyncStorage.getItem('byahero_pending_feedback') || '[]';
      const queue = JSON.parse(stored);
      queue.push({
        rating,
        feedback: feedback.trim(),
        timestamp: Date.now()
      });
      await AsyncStorage.setItem('byahero_pending_feedback', JSON.stringify(queue));
      
      setSubmittedMessage('Feedback saved locally (offline). It will sync automatically when your internet connection returns.');
      setSubmitted(true);
      setTimeout(() => {
        router.replace('/passenger');
      }, 2000);
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Feedback" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-5 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <View 
            ref={feedbackCardRef}
            onLayout={() => handleTourLayout('feedback-card', feedbackCardRef)}
            style={tw`bg-white rounded-3xl p-6 shadow-sm border border-slate-100`}
          >
            {!submitted ? (
              <View>
                <Text style={tw`text-xl font-black text-[#1e3a8a] text-center mb-1`}>Help us improve!</Text>
                <Text style={tw`text-xs text-slate-400 text-center font-semibold mb-6`}>
                  How would you rate your experience with ByaHero?
                </Text>

                {/* Star Rating Area */}
                <View style={tw`flex-row justify-center gap-3.5 p-4 mb-5 bg-slate-550 rounded-2xl`}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <TouchableOpacity 
                      key={starVal}
                      onPress={() => setRating(starVal)}
                      style={tw`p-1`}
                    >
                      <MaterialIcons 
                        name={starVal <= rating ? 'star' : 'star-outline'} 
                        size={36} 
                        color={starVal <= rating ? '#f59e0b' : '#cbd5e1'} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Feedback Text Area */}
                <View style={tw`mb-5`}>
                  <Text style={tw`text-xs font-bold text-slate-400 mb-2`}>
                    Additional Information (What would you like to say?)
                  </Text>
                  <TextInput
                    style={[
                      tw`w-full bg-slate-50 border border-slate-200 rounded-2xl p-4 text-sm font-semibold text-slate-700`,
                      { height: 120, textAlignVertical: 'top' }
                    ]}
                    placeholder="Share your thoughts, suggestions, or report issues..."
                    multiline={true}
                    numberOfLines={4}
                    value={feedback}
                    onChangeText={setFeedback}
                  />
                </View>

                {/* Buttons */}
                <View style={tw`flex-row justify-center gap-3`}>
                  <TouchableOpacity 
                    onPress={() => router.back()}
                    style={tw`flex-1 bg-slate-100 py-3 rounded-2xl items-center border border-slate-200`}
                  >
                    <Text style={tw`text-sm font-bold text-slate-500`}>Cancel</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={handleSubmit}
                    disabled={rating === 0 || isLoading}
                    style={[
                      tw`flex-1 py-3 rounded-2xl items-center shadow-md`,
                      rating > 0 ? tw`bg-[#1e3a8a]` : tw`bg-slate-200`
                    ]}
                  >
                    <Text style={[tw`text-sm font-bold`, rating > 0 ? tw`text-white` : tw`text-slate-400`]}>
                      {isLoading ? 'Submitting...' : 'Submit'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <View style={tw`items-center py-10`}>
                <MaterialIcons name="check-circle" size={64} color="#10b981" />
                <Text style={tw`text-lg font-black text-[#1e3a8a] mt-4 mb-2`}>Feedback Sent!</Text>
                <Text style={tw`text-xs text-slate-400 font-semibold text-center leading-relaxed px-5`}>
                  {submittedMessage}
                </Text>
                <Text style={tw`text-xs text-slate-300 font-semibold mt-8`}>Redirecting you home...</Text>
              </View>
            )}
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />

      {activeStep !== null && (
        <TourOverlay 
          currentStep={activeStep} 
          onStepChange={setActiveStep} 
          onClose={() => setActiveStep(null)} 
        />
      )}
    </SafeAreaView>
  );
}
