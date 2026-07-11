import { useState, useRef } from 'react';
import * as Location from 'expo-location';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../../services/authService';

let CookieManager: any = null;
if (Platform.OS === 'android') {
  try {
    CookieManager = require('@react-native-cookies/cookies');
  } catch (e) {
    console.warn('CookieManager native module not available in this environment (e.g. Expo Go).');
  }
}

const { LocationServiceModule } = NativeModules;

interface LocationHookProps {
  onCenterLocation: (lat: number, lng: number) => void;
}

export function useLocationTracking({ onCenterLocation }: LocationHookProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const onCenterLocationRef = useRef(onCenterLocation);
  React.useEffect(() => {
    onCenterLocationRef.current = onCenterLocation;
  }, [onCenterLocation]);

  useFocusEffect(
    React.useCallback(() => {
      let isMounted = true;
      let eventSubscription: any = null;

      async function startTracking() {
        try {
          const { status } = await Location.requestForegroundPermissionsAsync();
          if (status !== 'granted') {
            console.warn('Foreground location permission denied.');
            return;
          }

          const { status: bgStatus } = await Location.requestBackgroundPermissionsAsync();
          if (bgStatus !== 'granted') {
            console.warn('Background location permission denied.');
          }

          // 1. Get quick last known location instantly
          const lastKnownLoc = await Location.getLastKnownPositionAsync();
          if (lastKnownLoc && isMounted) {
            const lat = lastKnownLoc.coords.latitude;
            const lng = lastKnownLoc.coords.longitude;
            setUserLocation({ lat, lng });
            onCenterLocationRef.current(lat, lng);
          }

          // 2. Fetch precise initial location
          const initialLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);

          if (initialLoc && isMounted) {
            const lat = initialLoc.coords.latitude;
            const lng = initialLoc.coords.longitude;
            setUserLocation({ lat, lng });
            onCenterLocationRef.current(lat, lng);
          }

          // 3. Start Native Service
          if (Platform.OS === 'android' && LocationServiceModule) {
            const isRunning = await LocationServiceModule.isRunning();
            if (!isRunning) {
              const email = await AsyncStorage.getItem('byahero_cached_email') || '';
              const serverUrl = await getServerUrl();
              let cookieString = '';
              if (CookieManager && typeof CookieManager.get === 'function') {
                try {
                  const cookies = await CookieManager.get(serverUrl);
                  cookieString = Object.keys(cookies).map(key => `${key}=${cookies[key].value}`).join('; ');
                } catch (e) {
                  console.error('Failed to get cookies from CookieManager:', e);
                }
              }
              
              LocationServiceModule.startService(email, serverUrl, cookieString);
            }
            
            // Listen to native location events
            LocationServiceModule.bindListener();
            eventSubscription = DeviceEventEmitter.addListener('onBackgroundLocation', (event) => {
              if (isMounted && event) {
                const { lat, lng } = event;
                console.log(`[Native Location GPS] Event received: Lat ${lat}, Lng ${lng}`);
                setUserLocation({ lat, lng });
                // The main map component now handles auto-following using isFollowingUser state
                // onCenterLocationRef.current(lat, lng);
              }
            });
          }
          
        } catch (err) {
          console.error('Error starting location tracking:', err);
        }
      }

      startTracking();

      return () => {
        isMounted = false;
        if (eventSubscription) {
          eventSubscription.remove();
        }
        // Do not stop LocationServiceModule here, so it continues in background!
      };
    }, [])
  );

  return { userLocation };
}

