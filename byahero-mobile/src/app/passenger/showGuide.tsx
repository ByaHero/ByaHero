import React, { useEffect } from 'react';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

export default function UserGuideScreen() {
  useEffect(() => {
    async function startTour() {
      // Set the active tour step state to start the real spotlight tour on dashboard
      await AsyncStorage.setItem('byahero_active_tour_step', '0');
      router.replace('/passenger');
    }
    startTour();
  }, []);

  return null;
}
