import { useState, useEffect } from 'react';
import { tourSteps } from '../../components/TourOverlay';

export function useTourSync(screenName: string) {
  const [activeStep, setActiveStep] = useState<number | null>(null);

  useEffect(() => {
    function checkTour() {
      const stepVal = localStorage.getItem('byahero_active_tour_step');
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
    
    // Web specific: also listen to storage events in case another tab/component changes it
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'byahero_active_tour_step') {
        checkTour();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [screenName]);

  return { activeStep, setActiveStep };
}
