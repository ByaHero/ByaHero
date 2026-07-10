import { useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../../services/authService';

interface AutoBoardingProps {
  userLocation: { lat: number; lng: number } | null;
  buses: any[];
  isBoarded: boolean;
  setIsWaiting: (val: boolean) => void;
  setWaitingLocation: (val: string) => void;
  setIsBoarded: (val: boolean) => void;
  setBoardedBus: (val: string) => void;
  setBoardedRoute: (val: string) => void;
  boardedBus: string;
}

export function useAutoBoarding({
  userLocation,
  buses,
  isBoarded,
  setIsWaiting,
  setWaitingLocation,
  setIsBoarded,
  setBoardedBus,
  setBoardedRoute,
  boardedBus
}: AutoBoardingProps) {
  useEffect(() => {
    let isMounted = true;

    const checkProximity = async () => {
      if (!userLocation || buses.length === 0) return;

      if (!isBoarded) {
        // Auto-board logic
        let nearestBus: any = null;
        let minDistance = 0.05; // 50 meters threshold

        buses.forEach(bus => {
          const busLat = parseFloat(bus.lat || bus.latitude);
          const busLng = parseFloat(bus.lng || bus.longitude);
          if (!isNaN(busLat) && !isNaN(busLng)) {
            const R = 6371; // km
            const dLat = (userLocation.lat - busLat) * Math.PI / 180;
            const dLon = (userLocation.lng - busLng) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(busLat * Math.PI / 180) *
              Math.cos(userLocation.lat * Math.PI / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance < minDistance) {
              minDistance = distance;
              nearestBus = bus;
            }
          }
        });

        if (nearestBus && isMounted) {
          try {
            const currentBaseUrl = await getServerUrl();
            const email = await AsyncStorage.getItem('byahero_cached_email') || '';

            const res = await fetch(`${currentBaseUrl}/api/passenger/board`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                email: email,
                bus_id: nearestBus.Bus_ID,
                operation_id: nearestBus.current_operation_id
              })
            });

            const data = await res.json();
            if (data.success && isMounted) {
              setIsWaiting(false);
              setWaitingLocation('');
              setIsBoarded(true);
              setBoardedBus(nearestBus.plate_number);
              setBoardedRoute(nearestBus.route);
            }
          } catch (err) {
            console.warn('Auto-boarding failed:', err);
          }
        }
      } else {
        // Auto-depart logic
        const myBus = buses.find(b => b.plate_number === boardedBus);
        if (myBus) {
          const busLat = parseFloat(myBus.lat || myBus.latitude);
          const busLng = parseFloat(myBus.lng || myBus.longitude);
          if (!isNaN(busLat) && !isNaN(busLng)) {
            const R = 6371; // km
            const dLat = (userLocation.lat - busLat) * Math.PI / 180;
            const dLon = (userLocation.lng - busLng) * Math.PI / 180;
            const a =
              Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(busLat * Math.PI / 180) *
              Math.cos(userLocation.lat * Math.PI / 180) *
              Math.sin(dLon / 2) *
              Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > 0.15 && isMounted) { // 150 meters threshold
              try {
                const currentBaseUrl = await getServerUrl();
                const email = await AsyncStorage.getItem('byahero_cached_email') || '';

                const res = await fetch(`${currentBaseUrl}/api/passenger/depart`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    email: email,
                    bus_id: myBus.Bus_ID,
                    operation_id: myBus.current_operation_id
                  })
                });

                const data = await res.json();
                if (data.success && isMounted) {
                  setIsBoarded(false);
                  setBoardedBus('');
                  setBoardedRoute('');
                }
              } catch (err) {
                console.warn('Auto-departing failed:', err);
              }
            }
          }
        } else {
          // Bus not active anymore, just clear status locally
          if (isMounted) {
            setIsBoarded(false);
            setBoardedBus('');
            setBoardedRoute('');
          }
        }
      }
    };

    checkProximity();

    return () => {
      isMounted = false;
    };
  }, [userLocation, buses, isBoarded, boardedBus, setIsWaiting, setWaitingLocation, setIsBoarded, setBoardedBus, setBoardedRoute]);
}
