import React, { useState, useEffect, useRef } from 'react';
import { View, Text, Animated } from 'react-native';
import { useNetInfo } from '@react-native-community/netinfo';
import { MaterialIcons } from '@expo/vector-icons';
import tw from 'twrnc';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { getServerUrl } from '../services/authService';

interface OfflineBannerProps {
  topOffset?: number;
}

export default function OfflineBanner({ topOffset }: OfflineBannerProps) {
  const netInfo = useNetInfo();
  const [isOffline, setIsOffline] = useState(false);
  const [showRestored, setShowRestored] = useState(false);
  const isOfflineRef = useRef(false);
  const slideAnim = useRef(new Animated.Value(-60)).current;
  const insets = useSafeAreaInsets();
  const hideTimerRef = useRef<any>(null);

  const finalTopOffset = topOffset !== undefined ? topOffset : (56 + insets.top);

  const checkPing = async () => {
    try {
      const baseUrl = await getServerUrl();
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(`${baseUrl}/api/buses`, {
        method: 'GET',
        signal: controller.signal,
        cache: 'no-store'
      });
      clearTimeout(timeoutId);
      return res.ok || res.status < 500;
    } catch (e) {
      return false;
    }
  };

  useEffect(() => {
    let isMounted = true;

    const verifyConnection = async () => {
      const osOffline = netInfo.isConnected === false || netInfo.isInternetReachable === false;
      if (osOffline) {
        if (isMounted) handleStateChange(true);
        return;
      }

      const pingOk = await checkPing();
      if (isMounted) {
        handleStateChange(!pingOk);
      }
    };

    verifyConnection();
    const interval = setInterval(verifyConnection, 4000);

    return () => {
      isMounted = false;
      clearInterval(interval);
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [netInfo.isConnected, netInfo.isInternetReachable]);

  const handleStateChange = (newIsOffline: boolean) => {
    // Only act on actual status transitions (online -> offline or offline -> online)!
    if (newIsOffline === isOfflineRef.current) return;

    if (hideTimerRef.current) {
      clearTimeout(hideTimerRef.current);
      hideTimerRef.current = null;
    }

    isOfflineRef.current = newIsOffline;

    if (newIsOffline) {
      // Transitioning to OFFLINE
      setIsOffline(true);
      setShowRestored(false);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      // Transitioning to ONLINE (from offline state)
      setIsOffline(false);
      setShowRestored(true);
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();

      hideTimerRef.current = setTimeout(() => {
        Animated.timing(slideAnim, {
          toValue: -60,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          setShowRestored(false);
        });
      }, 3000);
    }
  };

  if (!isOffline && !showRestored) return null;

  return (
    <Animated.View
      style={[
        tw`absolute left-0 right-0 z-[2001] shadow-md`,
        {
          top: finalTopOffset,
          transform: [{ translateY: slideAnim }],
        },
        isOffline ? tw`bg-rose-600` : tw`bg-emerald-600`,
      ]}
    >
      <View style={tw`flex-row items-center justify-center px-4 py-2`}>
        <MaterialIcons
          name={isOffline ? 'wifi-off' : 'wifi'}
          size={16}
          color="#ffffff"
          style={tw`mr-2`}
        />
        <Text style={tw`text-white text-xs font-bold text-center tracking-wide`}>
          {isOffline ? 'No internet connection. Reconnecting...' : 'Back online'}
        </Text>
      </View>
    </Animated.View>
  );
}
