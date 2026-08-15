import React, { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function ConductorGuideScreen() {
  useEffect(() => {
    async function startTour() {
      // Set the active tour step state to start the real spotlight tour on dashboard
      await AsyncStorage.setItem('byahero_conductor_tour_step', '0');
      router.replace('/dashboard');
    }
    startTour();
  }, []);

  return null;
}
