import { useState, useEffect, useRef, useCallback } from 'react';
import { getServerUrl } from '../../services/authService';

export type LocationPermissionStatus = 'prompt' | 'granted' | 'denied' | 'unavailable';

interface LocationHookProps {
  onCenterLocation?: (lat: number, lng: number) => void;
}

export function useLocationTracking({ onCenterLocation }: LocationHookProps = {}) {
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<LocationPermissionStatus>('prompt');
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const onCenterLocationRef = useRef(onCenterLocation);
  useEffect(() => {
    onCenterLocationRef.current = onCenterLocation;
  }, [onCenterLocation]);

  const lastSyncTimeRef = useRef<number>(0);
  const syncLocationToServer = useCallback(async (lat: number, lng: number, accuracy?: number) => {
    const now = Date.now();
    if (now - lastSyncTimeRef.current < 10000) return;
    lastSyncTimeRef.current = now;

    const email = localStorage.getItem('byahero_cached_email');
    if (!email) return;

    try {
      const baseUrl = await getServerUrl();
      fetch(`${baseUrl}/api/location/update`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-User-Email': email
        },
        body: JSON.stringify({
          email,
          latitude: lat,
          longitude: lng,
          accuracy: accuracy || 10
        }),
        credentials: 'include'
      }).catch(() => {});
    } catch (e) {}
  }, []);

  const updateLocation = useCallback((lat: number, lng: number, shouldCenter: boolean = false, accuracy?: number) => {
    setUserLocation({ lat, lng });
    try {
      localStorage.setItem('byahero_user_lat', lat.toString());
      localStorage.setItem('byahero_user_lng', lng.toString());
    } catch (e) {}
    if (shouldCenter && onCenterLocationRef.current) {
      onCenterLocationRef.current(lat, lng);
    }
    syncLocationToServer(lat, lng, accuracy);
  }, [syncLocationToServer]);

  const requestLocation = useCallback((shouldCenter: boolean = true) => {
    if (!navigator.geolocation) {
      setPermissionStatus('unavailable');
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    const handleSuccess = (pos: GeolocationPosition) => {
      setIsLocating(false);
      setPermissionStatus('granted');
      setLocationError(null);
      const lat = pos.coords.latitude;
      const lng = pos.coords.longitude;
      updateLocation(lat, lng, shouldCenter, pos.coords.accuracy);
    };

    const handleHighAccuracyError = (err: GeolocationPositionError) => {
      console.warn('High accuracy location error:', err.code, err.message);

      if (err.code === 1) { // PERMISSION_DENIED
        setIsLocating(false);
        setPermissionStatus('denied');
        setLocationError('Location permission was denied. Please allow location access in your browser settings.');
        return;
      }

      // Fallback to standard accuracy (Wi-Fi/Cell/IP), vital for iOS Safari and indoor environments
      navigator.geolocation.getCurrentPosition(
        handleSuccess,
        (fallbackErr) => {
          setIsLocating(false);
          console.warn('Standard accuracy location error:', fallbackErr.code, fallbackErr.message);
          if (fallbackErr.code === 1) {
            setPermissionStatus('denied');
            setLocationError('Location permission was denied. Please allow location access in your browser settings.');
          } else if (fallbackErr.code === 2) {
            setPermissionStatus('unavailable');
            setLocationError('Location unavailable. Please check your device location services.');
          } else {
            setLocationError('Location request timed out. Tap the location button to retry.');
          }
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
      );
    };

    // 1. Attempt High Accuracy (GPS hardware)
    navigator.geolocation.getCurrentPosition(
      handleSuccess,
      handleHighAccuracyError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 0 }
    );
  }, [updateLocation]);

  const refreshLocation = useCallback(() => {
    requestLocation(true);
  }, [requestLocation]);

  useEffect(() => {
    let isMounted = true;
    let watchId: number | null = null;

    if (!navigator.geolocation) {
      setPermissionStatus('unavailable');
      return;
    }

    // Check Permissions API if supported
    if (navigator.permissions && navigator.permissions.query) {
      try {
        navigator.permissions.query({ name: 'geolocation' as PermissionName }).then((result) => {
          if (!isMounted) return;
          if (result.state === 'granted') {
            setPermissionStatus('granted');
          } else if (result.state === 'denied') {
            setPermissionStatus('denied');
          } else {
            setPermissionStatus('prompt');
          }

          result.onchange = () => {
            if (!isMounted) return;
            if (result.state === 'granted') {
              setPermissionStatus('granted');
              requestLocation(true);
            } else if (result.state === 'denied') {
              setPermissionStatus('denied');
            }
          };
        }).catch(() => {});
      } catch (e) {}
    }

    // Request position initially
    requestLocation(true);

    // Watch position continuously
    try {
      watchId = navigator.geolocation.watchPosition(
        (pos) => {
          if (!isMounted) return;
          setPermissionStatus('granted');
          setLocationError(null);
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;
          updateLocation(lat, lng, false, pos.coords.accuracy);
        },
        (err) => {
          if (!isMounted) return;
          if (err.code === 1) {
            setPermissionStatus('denied');
          }
        },
        { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 }
      );
    } catch (e) {
      console.warn('watchPosition error:', e);
    }

    return () => {
      isMounted = false;
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [requestLocation, updateLocation]);

  return {
    userLocation,
    permissionStatus,
    isLocating,
    locationError,
    refreshLocation,
    requestLocationPermission: refreshLocation,
  };
}

