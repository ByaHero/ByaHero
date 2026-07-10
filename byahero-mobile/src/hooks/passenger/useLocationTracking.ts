import { useState } from 'react';
import * as Location from 'expo-location';
import { Platform, NativeModules, DeviceEventEmitter } from 'react-native';
import { useFocusEffect } from 'expo-router';
import React from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../../services/authService';



interface LocationHookProps {
  onCenterLocation: (lat: number, lng: number) => void;
}

export function useLocationTracking({ onCenterLocation }: LocationHookProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const onCenterLocationRef = React.useRef(onCenterLocation);
  React.useEffect(() => {
    onCenterLocationRef.current = onCenterLocation;
  }, [onCenterLocation]);

  useFocusEffect(
    React.useCallback(() => {
      let subscription: Location.LocationSubscription | null = null;
      let isMounted = true;
      let nativeLocationListener: any = null;



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
            console.log(`[Location GPS] Quick last-known coordinates acquired: Lat ${lat}, Lng ${lng}`);
            setUserLocation({ lat, lng });
            onCenterLocationRef.current(lat, lng);
          }

          // 2. Fetch precise initial location in the background
          const initialLoc = await Location.getCurrentPositionAsync({
            accuracy: Location.Accuracy.Balanced,
          }).catch(() => null);

          if (initialLoc && isMounted) {
            const lat = initialLoc.coords.latitude;
            const lng = initialLoc.coords.longitude;
            console.log(`[Location GPS] Initial coordinates acquired: Lat ${lat}, Lng ${lng} (Accuracy: ${initialLoc.coords.accuracy}m)`);
            setUserLocation({ lat, lng });
            onCenterLocationRef.current(lat, lng);
            sendLocationToBackend(lat, lng, initialLoc.coords.accuracy || 0);
          }

          // Start watching position
          subscription = await Location.watchPositionAsync(
            {
              accuracy: Location.Accuracy.High,
              timeInterval: 3000,
              distanceInterval: 3,
            },
            (location) => {
              if (!isMounted) return;
              const lat = location.coords.latitude;
              const lng = location.coords.longitude;
              console.log(`[Location GPS] Watched coordinates updated: Lat ${lat}, Lng ${lng}`);
              setUserLocation({ lat, lng });
              sendLocationToBackend(lat, lng, location.coords.accuracy || 0);
            }
          );
        } catch (err) {
          console.error('Error starting location tracking:', err);
        }
      }

      async function sendLocationToBackend(lat: number, lng: number, accuracy: number) {
        try {
          const email = await AsyncStorage.getItem('byahero_cached_email') || '';
          const currentBaseUrl = await getServerUrl();
          await fetch(`${currentBaseUrl}/api/location/update`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              latitude: lat,
              longitude: lng,
              accuracy,
              email
            }),
            credentials: 'include'
          });
        } catch (err) {
          console.warn('Failed to send user location to backend:', err);
        }
      }

      startTracking();

      return () => {
        isMounted = false;
        if (subscription) {
          try {
            subscription.remove();
          } catch (err) {
            console.warn('Failed to remove location subscription:', err);
          }
        }
      };
    }, [])
  );

  return { userLocation };
}
