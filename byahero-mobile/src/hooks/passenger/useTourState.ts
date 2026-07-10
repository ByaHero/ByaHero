import { useState, useEffect } from 'react';
import { useFocusEffect } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import { tourSteps } from '../../components/TourOverlay';

export function useTourState(setSheetTab: (tab: 'location' | 'routes' | 'groups' | 'busstops') => void) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useFocusEffect(
    React.useCallback(() => {
      async function checkTour() {
        const stepVal = await AsyncStorage.getItem('byahero_active_tour_step');
        if (stepVal !== null) {
          const stepIdx = parseInt(stepVal, 10);

          // Verify that this step actually belongs to the dashboard screen
          const stepInfo = tourSteps[stepIdx];
          if (stepInfo && stepInfo.screen === '/passenger') {
            setActiveStep(stepIdx);

            // Adjust sheetTab dynamically based on target step highlight
            if (stepInfo.highlight === 'tab-location') setSheetTab('location');
            else if (stepInfo.highlight === 'tab-routes') setSheetTab('routes');
            else if (stepInfo.highlight === 'tab-groups') setSheetTab('groups');
            else if (stepInfo.highlight === 'tab-busstops') setSheetTab('busstops');
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
    }, [setSheetTab])
  );

  // Sync the bottom sheet tab whenever the active tour step changes
  useEffect(() => {
    if (activeStep === null) return;
    const stepInfo = tourSteps[activeStep];
    if (!stepInfo) return;
    if (stepInfo.highlight === 'tab-location') setSheetTab('location');
    else if (stepInfo.highlight === 'tab-routes') setSheetTab('routes');
    else if (stepInfo.highlight === 'tab-groups') setSheetTab('groups');
    else if (stepInfo.highlight === 'tab-busstops') setSheetTab('busstops');
  }, [activeStep, setSheetTab]);

  return { activeStep, setActiveStep };
}
