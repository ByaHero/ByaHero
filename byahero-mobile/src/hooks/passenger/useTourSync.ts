import { useState } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { tourSteps } from '../../components/TourOverlay';

export function useTourSync(screenName: string) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === screenName) {
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
    }, [screenName])
  );

  return { activeStep, setActiveStep };
}
