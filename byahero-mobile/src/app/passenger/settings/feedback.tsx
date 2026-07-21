import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import TourOverlay from '../../../components/TourOverlay';
import { handleTourLayout } from '../../../components/TourRegistry';
import { useTourSync } from '../../../hooks/passenger/useTourSync';

interface UserFeedbackData {
  id?: number;
  rating: number;
  feedback_text: string;
  updated_at?: string;
}

export default function FeedbackScreen() {
  const { activeStep, setActiveStep } = useTourSync('/passenger/settings/feedback');
  const feedbackCardRef = useRef<any>(null);

  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState<string>('');
  const [existingFeedback, setExistingFeedback] = useState<UserFeedbackData | null>(null);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  useEffect(() => {
    async function loadInitialData() {
      const email = (await AsyncStorage.getItem('byahero_cached_email')) || 'Guest';
      const loggedIn = email !== 'Guest' && email !== 'guest@byahero.app';
      setIsLoggedIn(loggedIn);

      if (!loggedIn) {
        Alert.alert('Authentication Required', 'Please log in to submit or manage your feedback.');
        router.back();
        return;
      }

      // Load cached local copy for instant UI rendering
      try {
        const cached = await AsyncStorage.getItem('byahero_cached_user_feedback');
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed && parsed.rating) {
            setExistingFeedback(parsed);
            setRating(parsed.rating);
            setFeedback(parsed.feedback_text || '');
            setIsEditing(false);
          }
        }
      } catch (e) {}

      // Fetch live user feedback from server
      await fetchUserFeedback();
    }

    loadInitialData();
  }, []);

  const fetchUserFeedback = async () => {
    setIsLoading(true);
    try {
      const serverUrl = await getServerUrl();
      const res = await fetch(`${serverUrl}/api/settings/feedback`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setIsLoading(false);

      if (data && data.success && data.feedback) {
        const fbData: UserFeedbackData = {
          id: data.feedback.id,
          rating: Number(data.feedback.rating) || 0,
          feedback_text: data.feedback.feedback_text || '',
          updated_at: data.feedback.updated_at,
        };
        setExistingFeedback(fbData);
        setRating(fbData.rating);
        setFeedback(fbData.feedback_text);
        setIsEditing(false);
        await AsyncStorage.setItem('byahero_cached_user_feedback', JSON.stringify(fbData));
      } else {
        if (!existingFeedback) {
          setIsEditing(true);
        }
      }
    } catch (e) {
      setIsLoading(false);
      // Offline fallback: if cached feedback exists, remain in view mode
      if (!existingFeedback) {
        setIsEditing(true);
      }
    }
  };

  const handleSubmit = async () => {
    if (rating === 0) {
      Alert.alert('Validation Error', 'Please select a star rating.');
      return;
    }

    setIsSaving(true);
    try {
      const serverUrl = await getServerUrl();
      const formData = new FormData();
      formData.append('rating', rating.toString());
      formData.append('feedback', feedback.trim());

      const res = await fetch(`${serverUrl}/api/settings/feedback`, {
        method: 'POST',
        body: formData,
        credentials: 'include',
      });
      const data = await res.json();
      setIsSaving(false);

      if (data && data.success) {
        const updatedData: UserFeedbackData = {
          rating,
          feedback_text: feedback.trim(),
          updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
        };
        setExistingFeedback(updatedData);
        setIsEditing(false);
        await AsyncStorage.setItem('byahero_cached_user_feedback', JSON.stringify(updatedData));
        Alert.alert('Success', existingFeedback ? 'Your feedback has been updated.' : 'Thank you for your feedback!');
      } else {
        await saveFeedbackOffline();
      }
    } catch (e) {
      setIsSaving(false);
      await saveFeedbackOffline();
    }
  };

  const saveFeedbackOffline = async () => {
    try {
      const offlineData: UserFeedbackData = {
        rating,
        feedback_text: feedback.trim(),
        updated_at: new Date().toISOString().replace('T', ' ').substring(0, 19),
      };
      setExistingFeedback(offlineData);
      setIsEditing(false);
      await AsyncStorage.setItem('byahero_cached_user_feedback', JSON.stringify(offlineData));

      // Queue for background sync
      const storedQueue = (await AsyncStorage.getItem('byahero_pending_feedback')) || '[]';
      const queue = JSON.parse(storedQueue);
      queue.push({ rating, feedback: feedback.trim(), timestamp: Date.now() });
      await AsyncStorage.setItem('byahero_pending_feedback', JSON.stringify(queue));

      Alert.alert('Saved Locally', 'Feedback saved offline. It will sync automatically when back online.');
    } catch (e) {
      console.error(e);
    }
  };

  const handleDeletePrompt = () => {
    Alert.alert(
      'Remove Feedback',
      'Are you sure you want to delete your feedback and rating?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: performDelete,
        },
      ]
    );
  };

  const performDelete = async () => {
    setIsDeleting(true);
    try {
      const serverUrl = await getServerUrl();
      const res = await fetch(`${serverUrl}/api/settings/feedback/delete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });
      const data = await res.json();
      setIsDeleting(false);

      if (data && data.success) {
        await clearLocalFeedbackState();
        Alert.alert('Removed', 'Your feedback has been deleted.');
      } else {
        await clearLocalFeedbackState();
        Alert.alert('Removed', 'Feedback removed locally.');
      }
    } catch (e) {
      setIsDeleting(false);
      await clearLocalFeedbackState();
      Alert.alert('Removed', 'Feedback removed locally.');
    }
  };

  const clearLocalFeedbackState = async () => {
    setExistingFeedback(null);
    setRating(0);
    setFeedback('');
    setIsEditing(true);
    await AsyncStorage.removeItem('byahero_cached_user_feedback');
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
            {isLoading ? (
              <View style={tw`py-12 items-center justify-center`}>
                <ActivityIndicator size="large" color="#1e3a8a" />
                <Text style={tw`text-xs text-slate-400 font-semibold mt-3`}>Loading feedback...</Text>
              </View>
            ) : existingFeedback && !isEditing ? (
              /* VIEW MODE: Google Play Store Style Retained Feedback Card */
              <View>
                <View style={tw`flex-row justify-between items-center mb-3`}>
                  <Text style={tw`text-base font-black text-[#1e3a8a]`}>Your Feedback</Text>
                  {existingFeedback.updated_at && (
                    <Text style={tw`text-[11px] font-semibold text-slate-400`}>
                      {existingFeedback.updated_at.substring(0, 10)}
                    </Text>
                  )}
                </View>

                {/* Stars Display */}
                <View style={tw`flex-row items-center mb-4`}>
                  {[1, 2, 3, 4, 5].map((starVal) => (
                    <MaterialIcons
                      key={starVal}
                      name={starVal <= existingFeedback.rating ? 'star' : 'star-outline'}
                      size={28}
                      color={starVal <= existingFeedback.rating ? '#f59e0b' : '#cbd5e1'}
                      style={tw`mr-1`}
                    />
                  ))}
                  <Text style={tw`ml-2 text-sm font-bold text-slate-700`}>
                    {existingFeedback.rating} / 5
                  </Text>
                </View>

                {/* Feedback Comment Box */}
                {existingFeedback.feedback_text ? (
                  <View style={tw`bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6`}>
                    <Text style={tw`text-sm text-slate-700 font-semibold leading-relaxed`}>
                      "{existingFeedback.feedback_text}"
                    </Text>
                  </View>
                ) : (
                  <View style={tw`bg-slate-50 border border-slate-200 rounded-2xl p-4 mb-6`}>
                    <Text style={tw`text-xs text-slate-400 italic`}>No written review provided.</Text>
                  </View>
                )}

                {/* Action Buttons: Edit and Delete */}
                <View style={tw`flex-row justify-end gap-3 pt-2 border-t border-slate-100`}>
                  <TouchableOpacity
                    onPress={handleDeletePrompt}
                    disabled={isDeleting}
                    style={tw`flex-row items-center px-4 py-2.5 bg-rose-50 rounded-xl border border-rose-200`}
                  >
                    <MaterialIcons name="delete-outline" size={18} color="#e11d48" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs font-bold text-rose-600`}>
                      {isDeleting ? 'Removing...' : 'Delete'}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setRating(existingFeedback.rating);
                      setFeedback(existingFeedback.feedback_text);
                      setIsEditing(true);
                    }}
                    style={tw`flex-row items-center px-4 py-2.5 bg-[#1e3a8a] rounded-xl shadow-sm`}
                  >
                    <MaterialIcons name="edit" size={18} color="#ffffff" style={tw`mr-1.5`} />
                    <Text style={tw`text-xs font-bold text-white`}>Edit Feedback</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              /* EDIT MODE: Submit or Update Feedback */
              <View>
                <Text style={tw`text-xl font-black text-[#1e3a8a] text-center mb-1`}>
                  {existingFeedback ? 'Edit your feedback' : 'Help us improve!'}
                </Text>
                <Text style={tw`text-xs text-slate-400 text-center font-semibold mb-6`}>
                  {existingFeedback
                    ? 'Update your star rating and review for ByaHero.'
                    : 'How would you rate your experience with ByaHero?'}
                </Text>

                {/* Star Rating Selector */}
                <View style={tw`flex-row justify-center gap-3.5 p-4 mb-5 bg-slate-50 rounded-2xl border border-slate-100`}>
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
                      { height: 120, textAlignVertical: 'top' },
                    ]}
                    placeholder="Share your thoughts, suggestions, or report issues..."
                    multiline={true}
                    numberOfLines={4}
                    value={feedback}
                    onChangeText={setFeedback}
                  />
                </View>

                {/* Submit & Cancel Buttons */}
                <View style={tw`flex-row justify-center gap-3`}>
                  {existingFeedback ? (
                    <TouchableOpacity
                      onPress={() => setIsEditing(false)}
                      style={tw`flex-1 bg-slate-100 py-3 rounded-2xl items-center border border-slate-200`}
                    >
                      <Text style={tw`text-sm font-bold text-slate-500`}>Cancel</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => router.back()}
                      style={tw`flex-1 bg-slate-100 py-3 rounded-2xl items-center border border-slate-200`}
                    >
                      <Text style={tw`text-sm font-bold text-slate-500`}>Cancel</Text>
                    </TouchableOpacity>
                  )}

                  <TouchableOpacity
                    onPress={handleSubmit}
                    disabled={rating === 0 || isSaving}
                    style={[
                      tw`flex-1 py-3 rounded-2xl items-center shadow-md`,
                      rating > 0 ? tw`bg-[#1e3a8a]` : tw`bg-slate-200`,
                    ]}
                  >
                    <Text style={[tw`text-sm font-bold`, rating > 0 ? tw`text-white` : tw`text-slate-400`]}>
                      {isSaving ? 'Saving...' : existingFeedback ? 'Update' : 'Submit'}
                    </Text>
                  </TouchableOpacity>
                </View>
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
