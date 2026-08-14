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
    title: 'Welcome Conductor!',
    description: "Let's take a quick interactive tour of your new dispatch dashboard.",
    screen: '/dashboard',
    highlight: null,
  },
  {
    title: 'Ticketing Mode',
    description: 'Switch between Manual and Automatic ticketing here. Use Manual for cash or manual counts.',
    screen: '/dashboard',
    highlight: 'ticketing-mode',
  },
  {
    title: 'Select Active Bus',
    description: 'Tap here to assign yourself to an active bus unit for your route.',
    screen: '/dashboard',
    highlight: 'select-bus',
  },
  {
    title: 'Select Route',
    description: 'Choose your scheduled transit route so passengers can track you correctly.',
    screen: '/dashboard',
    highlight: 'select-route',
  },
  {
    title: 'Start Tracking',
    description: "Ready to roll? Tap this to begin your operation. For this tour, we'll run a quick simulation!",
    screen: '/dashboard',
    highlight: 'start-tracking',
    actionBeforeNext: async () => {
      // Simulate live tracking payload
      const payload = {
        bus_id: 'SIMULATION',
        code: 'SIM-BUS',
        seats_total: 45,
        route: 'Simulation Route',
        initial_available_seats: 45,
        pre_departure_count: 0,
        operation_id: 'sim_operation_123',
        ticketing_mode: 'Manual',
        isSimulation: true // Flag to prevent real backend calls
      };
      await AsyncStorage.setItem('byahero_conductor_payload', JSON.stringify(payload));
    }
  },
  {
    title: 'Live Tracking Simulator',
    description: "You're now in the Live Tracking view! This tracks your location and passenger load in real-time.",
    screen: '/liveTracking',
    highlight: null,
    actionBeforeBack: async () => {
      router.back();
    }
  },
  {
    title: 'Manual Ticketing',
    description: 'Since you are in Manual Mode, you need to click the plus (+) button if a passenger boards, and the minus (-) button if a passenger departs.',
    screen: '/liveTracking',
    highlight: 'manual-ticketing',
  },
  {
    title: 'Live Passenger Count',
    description: 'This shows your current passenger count vs total capacity. This updates the mobile app live for commuters!',
    screen: '/liveTracking',
    highlight: 'pax-counts',
  },
  {
    title: 'Stop Tracking',
    description: 'When your route is complete, tap this button to stop tracking and end your current operation.',
    screen: '/liveTracking',
    highlight: 'stop-tracking',
    actionBeforeNext: async () => {
      await AsyncStorage.removeItem('byahero_conductor_payload');
    }
  },
  {
    title: 'Operation History',
    description: 'All your completed routes and tracked sessions are securely recorded here for your reference. (This is just an example!)',
    screen: '/operationHistory',
    highlight: 'history-header',
  },
  {
    title: "You're All Set!",
    description: "You've successfully completed the guide.",
    screen: '/dashboard',
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
  const [userName, setUserName] = useState('');

  useEffect(() => {
    async function fetchName() {
      try {
        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || '';
        if (cachedName && cachedName !== 'Guest') {
          let name = cachedName;
          if (name.includes('@')) {
            name = name.split('@')[0];
          }
          setUserName(name.split(' ')[0]);
        }
      } catch (e) {}
    }
    fetchName();
  }, []);

  useEffect(() => {
    // Slight delay when switching screens
    if (currentStep === 5) {
      setModalVisible(false);
      const timer = setTimeout(() => {
        setModalVisible(true);
      }, 500);
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
            let adjustedY = y + statusBarOffset;
            setActiveLayout({ x, y: adjustedY, width, height });
          }
        });
      } else {
        const cached = layouts[key];
        if (cached) {
          const statusBarOffset = Platform.OS === 'android' ? (StatusBar.currentHeight || 0) : 0;
          let adjustedY = cached.y + statusBarOffset;
          setActiveLayout({ ...cached, y: adjustedY });
        } else {
          setActiveLayout(null);
        }
      }
    };

    measure();
    const timer1 = setTimeout(measure, 200);
    const timer2 = setTimeout(measure, 500);

    return () => {
      active = false;
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [currentStep, step?.highlight, layouts, SCREEN_WIDTH, SCREEN_HEIGHT, translateYVal]);

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
      await AsyncStorage.setItem('byahero_conductor_tour_step', nextStep.toString());
      onStepChange(nextStep);

      const nextStepInfo = tourSteps[nextStep];
      if (nextStepInfo && nextStepInfo.screen !== step.screen) {
        router.replace(nextStepInfo.screen as any);
      }
    } else {
      await AsyncStorage.removeItem('byahero_conductor_tour_step');
      await AsyncStorage.removeItem('byahero_conductor_payload');
      onClose();
    }
  };

  const handleBack = async () => {
    if (step.actionBeforeBack) {
      await step.actionBeforeBack();
    }
    if (currentStep > 0) {
      const prevStep = currentStep - 1;
      await AsyncStorage.setItem('byahero_conductor_tour_step', prevStep.toString());
      onStepChange(prevStep);

      const prevStepInfo = tourSteps[prevStep];
      if (prevStepInfo && prevStepInfo.screen !== step.screen) {
        router.replace(prevStepInfo.screen as any);
      }
    }
  };

  const handleSkip = async () => {
    await AsyncStorage.removeItem('byahero_conductor_tour_step');
    await AsyncStorage.removeItem('byahero_conductor_payload');
    onClose();
    router.replace('/dashboard');
  };

  if (!modalVisible) return null;

  return (
    <View style={[tw`absolute inset-0 z-50`, { elevation: 100 }]}>
      <View style={tw`flex-1 relative`}>
        {activeLayout ? (
          <>
            <View style={[tw`absolute left-0 top-0 bottom-0 bg-slate-950/70`, { width: activeLayout.x }]} />
            <View style={[tw`absolute right-0 top-0 bottom-0 bg-slate-950/70`, { left: activeLayout.x + activeLayout.width }]} />
            <View style={[tw`absolute bg-slate-950/70`, { left: activeLayout.x, width: activeLayout.width, top: 0, height: activeLayout.y }]} />
            <View style={[tw`absolute bg-slate-950/70`, { left: activeLayout.x, width: activeLayout.width, top: activeLayout.y + activeLayout.height, bottom: 0 }]} />

            <Animated.View
              pointerEvents="none"
              style={[
                tw`absolute border-4 border-[#3b82f6] rounded-2xl`,
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
          <View style={tw`absolute inset-0 bg-slate-950/70`} />
        )}

        <View
          style={[
            tw`absolute left-4 right-4 justify-center items-center`,
            activeLayout
              ? (() => {
                const spaceAbove = activeLayout.y;
                const spaceBelow = SCREEN_HEIGHT - (activeLayout.y + activeLayout.height);
                const CARD_SAFE = 220; 
                if (spaceAbove >= spaceBelow) {
                  const bottomVal = SCREEN_HEIGHT - activeLayout.y + 30;
                  return { bottom: Math.min(bottomVal, SCREEN_HEIGHT - CARD_SAFE) };
                } else {
                  const topVal = activeLayout.y + activeLayout.height + 7;
                  return { top: Math.min(topVal, SCREEN_HEIGHT - CARD_SAFE) };
                }
              })()
              : { top: SCREEN_HEIGHT / 2 - 120 }
          ]}
        >
          {activeLayout && activeLayout.y < (SCREEN_HEIGHT - activeLayout.y - activeLayout.height) && (
            <View
              style={[
                tw`w-0 h-0 border-8 border-transparent`,
                tw`border-b-white`,
                {
                  marginBottom: -1,
                  alignSelf: 'flex-start',
                  marginLeft: Math.max(0, activeLayout.x + (activeLayout.width / 2) - 24)
                }
              ]}
            />
          )}

          <View style={tw`w-full bg-white rounded-3xl p-5 border border-slate-100 shadow-2xl`}>
            <View style={tw`flex-row justify-between items-center mb-3`}>
              <Text style={tw`text-xs font-bold text-[#3b82f6] uppercase tracking-wider`}>Spotlight Onboarding</Text>
              <Text style={tw`text-xs font-bold text-slate-400`}>{currentStep + 1} / {tourSteps.length}</Text>
            </View>

            <Text style={tw`text-lg font-black text-slate-800 mb-2`}>
              {currentStep === tourSteps.length - 1 && userName 
                ? `You're all Set ${userName}!` 
                : currentStep === 0 && userName
                ? `Welcome ${userName}!`
                : step.title}
            </Text>
            <Text style={tw`text-xs text-slate-500 font-semibold leading-relaxed mb-5`}>
              {step.description}
            </Text>

            <View style={tw`flex-row justify-between items-center`}>
              {currentStep < tourSteps.length - 1 ? (
                <TouchableOpacity onPress={handleSkip} style={tw`py-2 px-3`}>
                  <Text style={tw`text-xs font-bold text-slate-400`}>Skip Tour</Text>
                </TouchableOpacity>
              ) : (
                <View style={tw`py-2 px-3`} />
              )}
              <View style={tw`flex-row gap-3`}>
                {currentStep > 0 && (
                  <TouchableOpacity onPress={handleBack} style={tw`bg-slate-100 px-5 py-2.5 rounded-full items-center justify-center`}>
                    <Text style={tw`text-slate-600 font-bold`}>Back</Text>
                  </TouchableOpacity>
                )}
                <TouchableOpacity onPress={handleNext} style={tw`bg-[#3b82f6] px-5 py-2.5 rounded-full items-center justify-center shadow-md`}>
                  <Text style={tw`text-white font-bold`}>{currentStep === tourSteps.length - 1 ? 'Finish' : 'Next'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {activeLayout && activeLayout.y >= (SCREEN_HEIGHT - activeLayout.y - activeLayout.height) && (
            <View
              style={[
                tw`w-0 h-0 border-8 border-transparent`,
                tw`border-t-white`,
                {
                  marginTop: -1,
                  alignSelf: 'flex-start',
                  marginLeft: Math.max(0, activeLayout.x + (activeLayout.width / 2) - 24)
                }
              ]}
            />
          )}
        </View>
      </View>
    </View>
  );
}
