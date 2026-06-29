import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Platform,
  Modal,
  Animated,
  Dimensions,
  StatusBar,
} from 'react-native';
import { router, usePathname } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
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
    screen: '/passenger',
    highlight: null,
  },
  {
    title: '🚌 Bus Locations',
    description: 'See all live buses operating on routes, including their capacity and real-time ETAs.',
    screen: '/passenger',
    highlight: 'tab-location',
  },
  {
    title: '🗺️ Filter Routes',
    description: 'Filter routes in one click to track only the buses heading in your direction.',
    screen: '/passenger',
    highlight: 'tab-routes',
  },
  {
    title: '👥 Circle Groups',
    description: 'Track your private circle members and friends on the map in real time.',
    screen: '/passenger',
    highlight: 'tab-groups',
  },
  {
    title: '🚏 Pickup Stops',
    description: 'Discover pick-up terminals and designated boarding stops nearby.',
    screen: '/passenger',
    highlight: 'tab-busstops',
  },
  {
    title: '🎯 Recenter Map',
    description: 'Tap this target button anytime to snap the map view directly back to your live GPS coordinates.',
    screen: '/passenger',
    highlight: 'recenter',
  },
  {
    title: '📍 Commuter Location',
    description: 'Focuses on your avatar marker on the map (loading simulated mockup coordinates if your live location is currently unavailable).',
    screen: '/passenger',
    highlight: 'user-marker',
  },
  {
    title: '🚨 SOS Emergency Button',
    description: 'Trigger instant SOS alerts to notify emergency contacts and operator control centers with your live location.',
    screen: '/passenger',
    highlight: 'sos-btn',
  },
  {
    title: '🔔 Notifications Bell',
    description: 'Tap this bell icon to see history feeds of SOS emergencies and route alerts in real-time.',
    screen: '/passenger',
    highlight: 'notifications',
  },
  {
    title: '🍔 Passenger Menu Drawer',
    description: 'Tap this hamburger menu button to open additional features, profile details, and account settings.',
    screen: '/passenger',
    highlight: 'hamburger',
  },
  {
    title: '📜 Ride History Link',
    description: "This is your Ride History link. Tap here to view all your past boarding records, routes taken, and operator details. Let's check it out.",
    screen: '/passenger',
    highlight: 'menu-history',
    actionBeforeNext: () => {
      router.push('/passenger/rideHistory');
    }
  },
  {
    title: '📜 Ride History Logs',
    description: 'Access all details about your past travel logs, duration, and even report issues with specific buses here.',
    screen: '/passenger/rideHistory',
    highlight: 'history-list',
    actionBeforeBack: () => {
      router.back();
    }
  },
  {
    title: '💬 Commuter Feedback Link',
    description: "This is the Feedback link. Share your ratings and feedback on your commuting experience. Let's open it.",
    screen: '/passenger',
    highlight: 'menu-feedback',
    actionBeforeNext: () => {
      router.push('/passenger/settings/feedback');
    }
  },
  {
    title: '💬 Commuter Feedback Card',
    description: 'Rate your travel experience out of 5 stars and tell us how we can make your ByaHero journeys even better!',
    screen: '/passenger/settings/feedback',
    highlight: 'feedback-card',
    actionBeforeBack: () => {
      router.back();
    }
  },
  {
    title: '⚠️ Report a Problem Link',
    description: "This is the Report a Problem link. Report any transit delays, reckless drivers, or app issues directly. Let's open it.",
    screen: '/passenger',
    highlight: 'menu-report',
    actionBeforeNext: () => {
      router.push('/passenger/report');
    }
  },
  {
    title: '⚠️ Report a Problem Form',
    description: 'Submit direct incident reports, choose issue types, specify details, and help keep ByaHero commutes safe and orderly.',
    screen: '/passenger/report',
    highlight: 'report-card',
    actionBeforeBack: () => {
      router.back();
    }
  },
  {
    title: "You're All Set!",
    description: "You've successfully completed the guide! Enjoy smart, safe, and efficient travel with ByaHero.",
    screen: '/passenger',
    highlight: null,
  }
];

interface TourOverlayProps {
  currentStep: number;
  onStepChange: (step: number) => void;
  onClose: () => void;
  translateY?: Animated.Value;
}

export default function TourOverlay({ currentStep, onStepChange, onClose, translateY }: TourOverlayProps) {
  const pathname = usePathname();
  const layouts = useTourLayouts();
  const step = tourSteps[currentStep];

  const pulseAnim = useRef(new Animated.Value(1)).current;
  const [modalVisible, setModalVisible] = useState(false);

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
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.05, duration: 800, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, [currentStep]);

  const isHighlightInMenu = 
    step?.highlight === 'menu-history' ||
    step?.highlight === 'menu-feedback' ||
    step?.highlight === 'menu-report';

  const isBottomSheetTab = 
    step?.highlight === 'tab-location' ||
    step?.highlight === 'tab-routes' ||
    step?.highlight === 'tab-groups' ||
    step?.highlight === 'tab-busstops';

  const SCREEN_WIDTH = Dimensions.get('window').width;
  const SCREEN_HEIGHT = Dimensions.get('window').height;

  const [activeLayout, setActiveLayout] = useState<LayoutRect | null>(null);
  const [translateYVal, setTranslateYVal] = useState(0);

  useEffect(() => {
    if (!translateY) return;
    
    const listenerId = translateY.addListener(({ value }) => {
      setTranslateYVal(value);
    });
    
    if ((translateY as any)._value !== undefined) {
      setTranslateYVal((translateY as any)._value);
    }

    return () => {
      translateY.removeListener(listenerId);
    };
  }, [translateY]);

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
        ref.current.measureInWindow((x: number, y: number, width: number, height: number) => {
          if (active && width > 0 && height > 0) {
            const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
            const adjustedY = y + statusBarOffset;
            setActiveLayout({ x, y: adjustedY, width, height });
          }
        });
      } else {
        const cached = layouts[key];
        if (cached) {
          const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
          const adjustedY = cached.y + statusBarOffset;
          setActiveLayout({ ...cached, y: adjustedY });
        } else if (key === 'user-marker') {
          setActiveLayout({
            x: SCREEN_WIDTH / 2 - 25,
            y: SCREEN_HEIGHT / 2 - 80,
            width: 50,
            height: 50,
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
  }, [currentStep, step?.highlight, layouts, SCREEN_WIDTH, SCREEN_HEIGHT, translateYVal, isBottomSheetTab]);

  if (!step) return null;

  const cleanPath = (p: string) => p.replace(/\/$/, '').replace(/\/index$/, '');
  if (cleanPath(pathname) !== cleanPath(step.screen)) {
    return null;
  }

  const handleNext = async () => {
    if (step.actionBeforeNext) {
      await step.actionBeforeNext();
    }
    if (currentStep < tourSteps.length - 1) {
      const nextStep = currentStep + 1;
      await AsyncStorage.setItem('byahero_active_tour_step', nextStep.toString());
      onStepChange(nextStep);
      
      const nextStepInfo = tourSteps[nextStep];
      if (nextStepInfo && nextStepInfo.screen !== step.screen) {
        router.push(nextStepInfo.screen as any);
      }
    } else {
      await AsyncStorage.removeItem('byahero_active_tour_step');
      onClose();
    }
  };

  const handleBack = async () => {
    if (step.actionBeforeBack) {
      await step.actionBeforeBack();
    }
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      await AsyncStorage.setItem('byahero_active_tour_step', prevStep.toString());
      onStepChange(prevStep);
      
      const prevStepInfo = tourSteps[prevStep];
      if (prevStepInfo && prevStepInfo.screen !== step.screen) {
        router.push(prevStepInfo.screen as any);
      }
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.removeItem('byahero_active_tour_step');
    onClose();
    router.replace('/passenger');
  };

  if (!modalVisible) return null;

  return (
    <Modal transparent={true} statusBarTranslucent={true} animationType="none" visible={true}>
      <View style={tw`flex-1 relative`}>
        {activeLayout ? (
          <>
            {/* 4 dark background panels surrounding the cutout (adjacent columns layout to eliminate horizontal overlap seams) */}
            {/* Left column */}
            <View style={[tw`absolute left-0 top-0 bottom-0 bg-slate-950/60`, { width: activeLayout.x }]} />
            {/* Right column */}
            <View style={[tw`absolute right-0 top-0 bottom-0 bg-slate-950/60`, { left: activeLayout.x + activeLayout.width }]} />
            {/* Top panel (middle column) */}
            <View style={[tw`absolute bg-slate-950/60`, { left: activeLayout.x, width: activeLayout.width, top: 0, height: activeLayout.y }]} />
            {/* Bottom panel (middle column) */}
            <View style={[tw`absolute bg-slate-950/60`, { left: activeLayout.x, width: activeLayout.width, top: activeLayout.y + activeLayout.height, bottom: 0 }]} />

            {/* Pulsing highlight border */}
            <Animated.View
              pointerEvents="none"
              style={[
                tw`absolute border-4 border-yellow-400 rounded-2xl`,
                {
                  left: activeLayout.x - 4,
                  top: activeLayout.y - 4,
                  width: activeLayout.width + 8,
                  height: activeLayout.height + 8,
                  transform: [{ scale: pulseAnim }],
                }
              ]}
            />
          </>
        ) : (
          /* Full dark backdrop overlay for steps without elements */
          <View style={tw`absolute inset-0 bg-slate-950/60`} />
        )}

        {/* Dynamic Card Popover Container */}
        <View
          style={[
            tw`absolute left-4 right-4 justify-center items-center`,
            activeLayout
              ? (() => {
                  const spaceAbove = activeLayout.y;
                  const spaceBelow = SCREEN_HEIGHT - (activeLayout.y + activeLayout.height);
                  const CARD_SAFE = 220; // approx popover height + padding
                  if (isBottomSheetTab || spaceAbove >= spaceBelow) {
                    // Place above, but clamp so card doesn't go off top
                    const bottomVal = SCREEN_HEIGHT - activeLayout.y + 12;
                    return { bottom: Math.min(bottomVal, SCREEN_HEIGHT - CARD_SAFE) };
                  } else {
                    // Place below, but clamp so card doesn't go off bottom
                    const topVal = activeLayout.y + activeLayout.height + 12;
                    return { top: Math.min(topVal, SCREEN_HEIGHT - CARD_SAFE) };
                  }
                })()
              : tw`bottom-24`,
            isHighlightInMenu && tw`w-[70%] mr-auto`
          ]}
        >
          {/* Arrow BEFORE card — when target is above (card below target, arrow points up) */}
          {activeLayout && !isBottomSheetTab && activeLayout.y < (SCREEN_HEIGHT - activeLayout.y - activeLayout.height) && (
            <View
              style={[
                tw`w-0 h-0 border-8 border-transparent`,
                tw`border-b-white`, { marginBottom: -1 }
              ]}
            />
          )}

          <View style={tw`w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-xs font-bold text-[#1e3a8a] uppercase tracking-wider`}>Spotlight Onboarding</Text>
              <Text style={tw`text-xs font-bold text-slate-400`}>{currentStep + 1} / {tourSteps.length}</Text>
            </View>

            <Text style={tw`text-lg font-black text-slate-800 mb-2`}>
              {step.title}
            </Text>
            <Text style={tw`text-xs text-slate-500 font-semibold leading-relaxed mb-5`}>
              {step.description}
            </Text>

            <View style={tw`flex-row justify-between items-center`}>
              <TouchableOpacity onPress={handleSkip} style={tw`py-2 px-3`}>
                <Text style={tw`text-xs font-bold text-slate-400`}>Skip Tour</Text>
              </TouchableOpacity>

              <View style={tw`flex-row gap-2`}>
                {currentStep > 0 && (
                  <TouchableOpacity
                    onPress={handleBack}
                    style={tw`border border-slate-200 bg-slate-50 px-4 py-2 rounded-full`}
                  >
                    <Text style={tw`text-xs font-bold text-slate-500`}>Back</Text>
                  </TouchableOpacity>
                )}

                <TouchableOpacity
                  onPress={handleNext}
                  style={tw`bg-[#1e3a8a] px-5 py-2 rounded-full shadow-md`}
                >
                  <Text style={tw`text-xs font-bold text-white`}>
                    {currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* Arrow AFTER card — when target is below (card above target, arrow points down) */}
          {activeLayout && (isBottomSheetTab || activeLayout.y >= (SCREEN_HEIGHT - activeLayout.y - activeLayout.height)) && (
            <View
              style={[
                tw`w-0 h-0 border-8 border-transparent`,
                tw`border-t-white`, { marginTop: -1 }
              ]}
            />
          )}
        </View>
      </View>
    </Modal>
  );
}
