import { useState, useEffect, useRef, useCallback } from 'react';
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
  isInitialFetchDone: boolean;
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
  boardedBus,
  isInitialFetchDone
}: AutoBoardingProps) {
  const [pendingBoardBus, setPendingBoardBus] = useState<any | null>(null);
  const [pendingDepartBus, setPendingDepartBus] = useState<any | null>(null);
  
  const departPromptTime = useRef<number | null>(null);
  const boardCooldown = useRef<number | null>(null);
  const departCooldown = useRef<number | null>(null);
  const departCounter = useRef(0);
  const isExecuting = useRef(false);

  const AUTO_DEPART_TIMEOUT = 10 * 60 * 1000; // 10 minutes
  const COOLDOWN_DURATION = 5 * 60 * 1000; // 5 minutes

  const acceptBoard = useCallback(async () => {
    if (!pendingBoardBus) return;
    isExecuting.current = true;
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/passenger/board`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          bus_id: pendingBoardBus.Bus_ID,
          operation_id: pendingBoardBus.current_operation_id
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsWaiting(false);
        setWaitingLocation('');
        setIsBoarded(true);
        setBoardedBus(pendingBoardBus.code || pendingBoardBus.plate_number);
        setBoardedRoute(pendingBoardBus.route);
        boardCooldown.current = null;
      }
    } catch (err) {
      console.warn('Boarding failed:', err);
    } finally {
      setPendingBoardBus(null);
      isExecuting.current = false;
    }
  }, [pendingBoardBus, setIsWaiting, setWaitingLocation, setIsBoarded, setBoardedBus, setBoardedRoute]);

  const rejectBoard = useCallback(() => {
    setPendingBoardBus(null);
    boardCooldown.current = Date.now();
  }, []);

  const acceptDepart = useCallback(async () => {
    const targetBus = pendingDepartBus || buses.find(b => (b.code || b.plate_number) === boardedBus);
    if (!targetBus) {
        setPendingDepartBus(null);
        setIsBoarded(false);
        setBoardedBus('');
        setBoardedRoute('');
        return;
    }

    isExecuting.current = true;
    try {
      const currentBaseUrl = await getServerUrl();
      const email = await AsyncStorage.getItem('byahero_cached_email') || '';

      const res = await fetch(`${currentBaseUrl}/api/passenger/depart`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: email,
          bus_id: targetBus.Bus_ID,
          operation_id: targetBus.current_operation_id
        })
      });

      const data = await res.json();
      if (data.success) {
        setIsBoarded(false);
        setBoardedBus('');
        setBoardedRoute('');
        departPromptTime.current = null;
        departCooldown.current = null;
      }
    } catch (err) {
      console.warn('Departing failed:', err);
    } finally {
      setPendingDepartBus(null);
      isExecuting.current = false;
    }
  }, [pendingDepartBus, boardedBus, buses, setIsBoarded, setBoardedBus, setBoardedRoute]);

  const rejectDepart = useCallback(() => {
    setPendingDepartBus(null);
    departPromptTime.current = null;
    departCooldown.current = Date.now();
  }, []);

  useEffect(() => {
    let isMounted = true;

    const checkProximity = async () => {
      if (!isInitialFetchDone || !userLocation || buses.length === 0 || isExecuting.current) return;

      if (isBoarded && pendingBoardBus) {
        setPendingBoardBus(null);
      }
      if (!isBoarded && pendingDepartBus) {
        setPendingDepartBus(null);
        departPromptTime.current = null;
      }

      if (pendingDepartBus && departPromptTime.current) {
        if (Date.now() - departPromptTime.current > AUTO_DEPART_TIMEOUT) {
          if (isMounted) await acceptDepart();
          return;
        }
      }

      if (!isBoarded) {
        if (pendingBoardBus) return;
        if (boardCooldown.current && Date.now() - boardCooldown.current < COOLDOWN_DURATION) return;

        let nearestBus: any = null;
        let minDistance = 0.05;

        buses.forEach(bus => {
          const busLat = parseFloat(bus.lat || bus.latitude);
          const busLng = parseFloat(bus.lng || bus.longitude);
          if (!isNaN(busLat) && !isNaN(busLng)) {
            const R = 6371;
            const dLat = (userLocation.lat - busLat) * Math.PI / 180;
            const dLon = (userLocation.lng - busLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(busLat * Math.PI / 180) * Math.cos(userLocation.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance < minDistance) {
              minDistance = distance;
              nearestBus = bus;
            }
          }
        });

        if (nearestBus && isMounted) {
          setPendingBoardBus(nearestBus);
        }
      } else {
        if (pendingDepartBus) return;
        if (departCooldown.current && Date.now() - departCooldown.current < COOLDOWN_DURATION) return;

        const myBus = buses.find(b => (b.code || b.plate_number) === boardedBus);
        if (myBus) {
          const busLat = parseFloat(myBus.lat || myBus.latitude);
          const busLng = parseFloat(myBus.lng || myBus.longitude);
          if (!isNaN(busLat) && !isNaN(busLng)) {
            const R = 6371;
            const dLat = (userLocation.lat - busLat) * Math.PI / 180;
            const dLon = (userLocation.lng - busLng) * Math.PI / 180;
            const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) + Math.cos(busLat * Math.PI / 180) * Math.cos(userLocation.lat * Math.PI / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
            const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
            const distance = R * c;

            if (distance > 0.5) { // Reverted to 0.5km for quicker real-world departure detection
              departCounter.current += 1;
              if (departCounter.current >= 4 && isMounted) { // 40 seconds sustained
                setPendingDepartBus(myBus);
                departPromptTime.current = Date.now();
                departCounter.current = 0;
              }
            } else {
              departCounter.current = 0;
            }
          }
        } else {
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
  }, [userLocation, buses, isBoarded, boardedBus, pendingBoardBus, pendingDepartBus, acceptDepart]);

  return {
    pendingBoardBus,
    pendingDepartBus,
    acceptBoard,
    rejectBoard,
    acceptDepart,
    rejectDepart
  };
}
