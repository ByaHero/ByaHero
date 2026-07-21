import { useEffect } from 'react';
import { useTourSync } from './useTourSync';
import { tourSteps } from '../../components/TourOverlay';

export function useTourState(setSheetTab: (tab: 'location' | 'routes' | 'groups' | 'busstops') => void) {
  const { activeStep, setActiveStep } = useTourSync('/passenger');

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
