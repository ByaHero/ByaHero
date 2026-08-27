import { useState, useEffect, useRef, useCallback } from 'react';

interface LocationHookProps {
  onCenterLocation: (lat: number, lng: number) => void;
}

export function useLocationTracking({ onCenterLocation }: LocationHookProps) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);

  const onCenterLocationRef = useRef(onCenterLocation);
  useEffect(() => {
    onCenterLocationRef.current = onCenterLocation;
  }, [onCenterLocation]);

  useEffect(() => {
    let isMounted = true;
    let watchId: number | null = null;

    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      setUserLocation({ lat: 14.0760, lng: 120.9389 }); // default Laurel stop
      return;
    }

    // 1. Get immediate position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (!isMounted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
        if (onCenterLocationRef.current) {
          onCenterLocationRef.current(lat, lng);
        }
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        if (isMounted) setUserLocation({ lat: 14.0760, lng: 120.9389 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // 2. Watch position continuously
    watchId = navigator.geolocation.watchPosition(
      (pos) => {
        if (!isMounted) return;
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setUserLocation({ lat, lng });
      },
      (err) => console.warn('Watch position error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => {
      isMounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, []);

  return { userLocation };
}
