import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTourLayouts, tourRegistry, LayoutRect } from './TourRegistry';

export interface TourStep {
  title: string;
  description: string;
  screen: string;
  highlight: string | null;
  actionBeforeNext?: () => void | Promise<void>;
  actionBeforeBack?: () => void | Promise<void>;
}

export const tourSteps: TourStep[] = [
  {
    title: 'Welcome to ByaHero!',
    description: "Let's take a quick interactive tour to show you how to navigate your live commuter dashboard.",
    screen: '/',
    highlight: null,
  },
  {
    title: 'Bus Locations',
    description: 'See all live buses operating on routes, including their capacity and real-time ETAs.',
    screen: '/',
    highlight: 'tab-location',
  },
  {
    title: 'Filter Routes',
    description: 'Filter routes in one click to track only the buses heading in your direction.',
    screen: '/',
    highlight: 'tab-routes',
  },
  {
    title: 'Circle Groups',
    description: 'Track your private circle members and friends on the map in real time.',
    screen: '/',
    highlight: 'tab-groups',
  },
  {
    title: 'Pickup Stops',
    description: 'Discover pick-up terminals and designated boarding stops nearby.',
    screen: '/',
    highlight: 'tab-busstops',
  },
  {
    title: 'Recenter Map',
    description: 'Tap this target button anytime to snap the map view directly back to your live GPS coordinates.',
    screen: '/',
    highlight: 'recenter',
  },
  {
    title: 'Commuter Location',
    description: 'Focuses on your avatar marker on the map (loading simulated mockup coordinates if your live location is currently unavailable).',
    screen: '/',
    highlight: 'user-marker',
  },
  {
    title: 'SOS Emergency Button',
    description: 'Trigger instant SOS alerts to notify emergency contacts and operator control centers with your live location.',
    screen: '/',
    highlight: 'sos-btn',
  },
  {
    title: 'Notifications Bell',
    description: 'Tap this bell icon to see history feeds of SOS emergencies and route alerts in real-time.',
    screen: '/',
    highlight: 'notifications',
  },
  {
    title: 'Passenger Menu Drawer',
    description: 'Tap this hamburger menu button to open additional features, profile details, and account settings.',
    screen: '/',
    highlight: 'hamburger',
  },
  {
    title: 'Ride History Link',
    description: "This is your Ride History link. Tap here to view all your past boarding records, routes taken, and operator details. Let's check it out.",
    screen: '/',
    highlight: 'menu-history',
    actionBeforeNext: () => {
      // we navigate before moving to next step
      // note: caller should handle this
    }
  },
  {
    title: 'Ride History Logs',
    description: 'Access all details about your past travel logs, duration, and even report issues with specific buses here.',
    screen: '/ride-history',
    highlight: 'history-list',
    actionBeforeBack: () => {
    }
  },
  {
    title: 'Commuter Feedback Link',
    description: "This is the Feedback link. Share your ratings and feedback on your commuting experience. Let's open it.",
    screen: '/',
    highlight: 'menu-feedback',
    actionBeforeNext: () => {
    }
  },
  {
    title: 'Commuter Feedback Card',
    description: 'Rate your travel experience out of 5 stars and tell us how we can make your ByaHero journeys even better!',
    screen: '/settings/feedback',
    highlight: 'feedback-card',
    actionBeforeBack: () => {
    }
  },
  {
    title: 'Report a Problem Link',
    description: "This is the Report a Problem link. Report any transit delays, reckless drivers, or app issues directly. Let's open it.",
    screen: '/',
    highlight: 'menu-report',
    actionBeforeNext: () => {
    }
  },
  {
    title: 'Report a Problem Form',
    description: 'Submit direct incident reports, choose issue types, specify details, and help keep ByaHero commutes safe and orderly.',
    screen: '/report',
    highlight: 'report-card',
    actionBeforeBack: () => {
    }
  },
  {
    title: "You're All Set!",
    description: "You've successfully completed the guide! Enjoy smart, safe, and efficient travel with ByaHero.",
    screen: '/',
    highlight: null,
  }
];

// Re-map actions since we don't have access to router directly in static array
tourSteps[10].actionBeforeNext = function(this: any) { this.navigate('/ride-history'); };
tourSteps[11].actionBeforeBack = function(this: any) { this.navigate('/'); };
tourSteps[12].actionBeforeNext = function(this: any) { this.navigate('/settings/feedback'); };
tourSteps[13].actionBeforeBack = function(this: any) { this.navigate('/'); };
tourSteps[14].actionBeforeNext = function(this: any) { this.navigate('/report'); };
tourSteps[15].actionBeforeBack = function(this: any) { this.navigate('/'); };

interface TourOverlayProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
}

export default function TourOverlay({ currentStep, onStepChange, onClose }: TourOverlayProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const layouts = useTourLayouts();
  const step = tourSteps[currentStep];

  const [modalVisible, setModalVisible] = useState(false);
  const [userName, setUserName] = useState('');
  const [pulseScale, setPulseScale] = useState(1);

  useEffect(() => {
    const cached = localStorage.getItem('byahero_cached_name');
    if (cached) {
      let name = cached;
      if (name.includes('@')) {
        name = name.split('@')[0];
      }
      setUserName(name.split(' ')[0]);
    }
  }, []);

  useEffect(() => {
    if (currentStep === 10 || currentStep === 12 || currentStep === 14) {
      setModalVisible(false);
      const timer = setTimeout(() => {
        setModalVisible(true);
      }, 350);
      return () => clearTimeout(timer);
    } else {
      setModalVisible(true);
    }
  }, [currentStep]);

  useEffect(() => {
    let growing = true;
    const interval = setInterval(() => {
      setPulseScale((prev) => {
        if (growing) {
          if (prev >= 1.05) { growing = false; return prev - 0.01; }
          return prev + 0.01;
        } else {
          if (prev <= 1) { growing = true; return prev + 0.01; }
          return prev - 0.01;
        }
      });
    }, 50);
    return () => clearInterval(interval);
  }, [currentStep]);

  const [activeLayout, setActiveLayout] = useState<LayoutRect | null>(null);
  const SCREEN_WIDTH = window.innerWidth;
  const SCREEN_HEIGHT = window.innerHeight;

  const isBottomSheetTab =
    step?.highlight === 'tab-location' ||
    step?.highlight === 'tab-routes' ||
    step?.highlight === 'tab-groups' ||
    step?.highlight === 'tab-busstops';

  const isHighlightInMenu =
    step?.highlight === 'menu-history' ||
    step?.highlight === 'menu-feedback' ||
    step?.highlight === 'menu-report';

  useEffect(() => {
    if (!step) return;
    let active = true;
    const key = step.highlight;
    if (!key) {
      setActiveLayout(null);
      return;
    }

    const measure = () => {
      const ref = tourRegistry.getRef(key);
      if (ref?.current) {
        const rect = ref.current.getBoundingClientRect();
        if (active && rect.width > 0 && rect.height > 0) {
          let adjustedY = rect.top;
          if (key.startsWith('menu-')) {
            adjustedY -= 30;
          }
          setActiveLayout({ x: rect.left, y: adjustedY, width: rect.width, height: rect.height });
        }
      } else {
        const cached = layouts[key];
        if (cached) {
          let adjustedY = cached.y;
          if (key.startsWith('menu-')) {
            adjustedY -= 30;
          }
          setActiveLayout({ ...cached, y: adjustedY });
        } else if (key === 'user-marker') {
          setActiveLayout({
            x: SCREEN_WIDTH / 2 - 40,
            y: SCREEN_HEIGHT / 2 - 85,
            width: 80,
            height: 80,
          });
        } else {
          setActiveLayout(null);
        }
      }
    };

    measure();
    const timer1 = setTimeout(measure, 100);
    const timer2 = setTimeout(measure, 300);

    return () => {
      active = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentStep, step?.highlight, layouts, SCREEN_WIDTH, SCREEN_HEIGHT]);

  if (!step) return null;

  const cleanPath = (p: string) => {
    if (p === '/') return p;
    return p.replace(/\/$/, '').replace(/\/index$/, '');
  };
  
  if (cleanPath(location.pathname) !== cleanPath(step.screen)) {
    return null;
  }

  const handleNext = async () => {
    if (step.actionBeforeNext) {
      await step.actionBeforeNext.call({ navigate });
    }
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      localStorage.setItem('byahero_active_tour_step', nextStep.toString());
      onStepChange(nextStep);

      const nextStepInfo = tourSteps[nextStep];
      if (nextStepInfo && cleanPath(nextStepInfo.screen) !== cleanPath(step.screen)) {
        navigate(nextStepInfo.screen);
      }
    } else {
      localStorage.removeItem('byahero_active_tour_step');
      onClose();
    }
  };

  const handleBack = async () => {
    if (step.actionBeforeBack) {
      await step.actionBeforeBack.call({ navigate });
    }
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      localStorage.setItem('byahero_active_tour_step', prevStep.toString());
      onStepChange(prevStep);

      const prevStepInfo = tourSteps[prevStep];
      if (prevStepInfo && cleanPath(prevStepInfo.screen) !== cleanPath(step.screen)) {
        navigate(prevStepInfo.screen);
      }
    }
  };

  const handleSkip = () => {
    localStorage.removeItem('byahero_active_tour_step');
    onClose();
    navigate('/');
  };

  if (!modalVisible) return null;

  return (
    <div className="fixed inset-0 z-[9990] flex pointer-events-auto">
      {activeLayout ? (
        <>
          <div className="absolute left-0 top-0 bottom-0 bg-slate-950/60" style={{ width: activeLayout.x }} />
          <div className="absolute right-0 top-0 bottom-0 bg-slate-950/60" style={{ left: activeLayout.x + activeLayout.width }} />
          <div className="absolute bg-slate-950/60" style={{ left: activeLayout.x, width: activeLayout.width, top: 0, height: activeLayout.y }} />
          <div className="absolute bg-slate-950/60" style={{ left: activeLayout.x, width: activeLayout.width, top: activeLayout.y + activeLayout.height, bottom: 0 }} />

          <div
            className="absolute border-[4px] border-yellow-400 rounded-2xl pointer-events-none"
            style={{
              left: activeLayout.x - 4,
              top: activeLayout.y - 4,
              width: activeLayout.width + 8,
              height: activeLayout.height + 8,
              transform: `scale(${pulseScale})`,
              transition: 'transform 0.05s linear'
            }}
          />
        </>
      ) : (
        <div className="absolute inset-0 bg-slate-950/60" />
      )}

      {/* Popover */}
      <div
        className={`absolute left-4 right-4 flex flex-col justify-center items-center ${isHighlightInMenu ? 'w-[70%] mr-auto' : ''}`}
        style={
          activeLayout
            ? (() => {
              const spaceAbove = activeLayout.y;
              const spaceBelow = SCREEN_HEIGHT - (activeLayout.y + activeLayout.height);
              const CARD_SAFE = 220;
              if (isBottomSheetTab || isHighlightInMenu || spaceAbove >= spaceBelow) {
                const bottomVal = SCREEN_HEIGHT - activeLayout.y + 30;
                return { bottom: Math.min(bottomVal, SCREEN_HEIGHT - CARD_SAFE) };
              } else {
                const topVal = activeLayout.y + activeLayout.height + 7;
                return { top: Math.min(topVal, SCREEN_HEIGHT - CARD_SAFE) };
              }
            })()
            : { top: SCREEN_HEIGHT / 2 - 120 }
        }
      >
        {activeLayout && !isBottomSheetTab && activeLayout.y < (SCREEN_HEIGHT - activeLayout.y - activeLayout.height) && (
          <div
            className="w-0 h-0 border-[8px] border-transparent border-b-white"
            style={{
              marginBottom: '-1px',
              alignSelf: 'flex-start',
              marginLeft: Math.max(0, activeLayout.x + (activeLayout.width / 2) - 24)
            }}
          />
        )}

        <div className="w-full max-w-md bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl z-10 flex flex-col">
          <div className="flex flex-row justify-between items-center mb-3">
            <span className="text-xs font-bold text-[#1e3a8a] uppercase tracking-wider">Spotlight Onboarding</span>
            <span className="text-xs font-bold text-slate-400">{currentStep + 1} / {tourSteps.length}</span>
          </div>

          <h2 className="text-lg font-black text-slate-800 mb-2 m-0">
            {currentStep === tourSteps.length - 1 && userName
              ? `You're all Set ${userName}!`
              : step.title}
          </h2>
          <p className="text-xs text-slate-500 font-semibold leading-relaxed mb-5 m-0">
            {step.description}
          </p>

          <div className="flex flex-row justify-between items-center mt-auto">
            {currentStep < tourSteps.length - 1 ? (
              <button onClick={handleSkip} className="py-2 px-3 bg-transparent border-none cursor-pointer">
                <span className="text-xs font-bold text-slate-400">Skip Tour</span>
              </button>
            ) : (
              <div className="py-2 px-3" />
            )}

            <div className="flex flex-row gap-2">
              {currentStep > 0 && (
                <button
                  onClick={handleBack}
                  className="border border-slate-200 bg-slate-50 px-4 py-2 rounded-full cursor-pointer"
                >
                  <span className="text-xs font-bold text-slate-500">Back</span>
                </button>
              )}

              <button
                onClick={handleNext}
                className="bg-[#1e3a8a] px-5 py-2 rounded-full shadow-md cursor-pointer border-none"
              >
                <span className="text-xs font-bold text-white">
                  {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                </span>
              </button>
            </div>
          </div>
        </div>

        {activeLayout && (isBottomSheetTab || activeLayout.y >= (SCREEN_HEIGHT - activeLayout.y - activeLayout.height)) && (
          <div
            className="w-0 h-0 border-[8px] border-transparent border-t-white"
            style={{
              marginTop: '-1px',
              alignSelf: 'flex-start',
              marginLeft: Math.max(0, activeLayout.x + (activeLayout.width / 2) - 24)
            }}
          />
        )}
      </div>
    </div>
  );
}
