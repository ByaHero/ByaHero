import React, { createContext, useContext, useState, useEffect, useRef, ReactNode, useCallback } from 'react';
import { useAuth } from './AuthContext';
import { BusItem, BusStopItem, CircleMember, fetchLiveBuses, fetchBusStops, fetchGroupCircle } from '../services/trackingService';
import { getHaversineDistanceKm } from '../utils/locationUtils';

interface UserLocation {
  lat: number;
  lng: number;
  accuracy?: number;
}

interface TrackingContextType {
  userLocation: UserLocation | null;
  isLocationAvailable: boolean;
  buses: BusItem[];
  filteredBuses: BusItem[];
  busStops: BusStopItem[];
  filteredStops: BusStopItem[];
  circles: CircleMember[];
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  stopsRoute: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL';
  setStopsRoute: (route: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL') => void;
  
  // Waiting state
  isWaiting: boolean;
  waitingLocation: string;
  waitingExpiresAt: string | null;
  waitingSecondsLeft: number | null;
  setWaitingStatus: (stopName: string) => Promise<boolean>;
  cancelWaitingStatus: () => Promise<boolean>;
  
  // Boarding state
  isBoarded: boolean;
  boardedBus: string;
  boardedRoute: string;
  pendingBoardBus: BusItem | null;
  pendingDepartBus: boolean;
  acceptBoard: () => void;
  rejectBoard: () => void;
  acceptDepart: () => void;
  rejectDepart: () => void;
  
  // Circle invites
  inviteCode: string;
  generateInviteCode: (reset?: boolean) => Promise<void>;
  joinCircle: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCircleMember: (friendId: number) => Promise<{ success: boolean; message: string }>;
  
  // Map actions
  mapCenterTarget: { lat: number; lng: number; zoom?: number } | null;
  centerOnUser: () => void;
  focusOnBus: (bus: BusItem) => void;
  focusOnStop: (stop: BusStopItem) => void;
  focusOnFriend: (friend: CircleMember) => void;
  
  // Loading & refresh
  isInitialLoading: boolean;
  refreshData: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, serverUrl } = useAuth();
  
  // Default coordinates in Laurel/Talisay/Tanauan transit corridor
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [isLocationAvailable, setIsLocationAvailable] = useState(false);
  
  const [buses, setBuses] = useState<BusItem[]>([]);
  const [busStops, setBusStops] = useState<BusStopItem[]>([]);
  const [circles, setCircles] = useState<CircleMember[]>([]);
  
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  
  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingExpiresAt, setWaitingExpiresAt] = useState<string | null>(null);
  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(null);
  
  const [isBoarded, setIsBoarded] = useState(false);
  const [boardedBus, setBoardedBus] = useState('');
  const [boardedRoute, setBoardedRoute] = useState('');
  
  const [pendingBoardBus, setPendingBoardBus] = useState<BusItem | null>(null);
  const [pendingDepartBus, setPendingDepartBus] = useState(false);
  const rejectedBusesRef = useRef<Set<string>>(new Set());
  
  const [inviteCode, setInviteCode] = useState('------');
  const [mapCenterTarget, setMapCenterTarget] = useState<{ lat: number; lng: number; zoom?: number } | null>(null);
  const [isInitialLoading, setIsInitialLoading] = useState(true);

  // HTML5 Geolocation Tracking
  useEffect(() => {
    if (!navigator.geolocation) {
      console.warn('Geolocation is not supported by this browser.');
      setUserLocation({ lat: 14.0760, lng: 120.9389 }); // default Laurel stop
      return;
    }

    // Get immediate position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLocationAvailable(true);
      },
      (err) => {
        console.warn('Geolocation error:', err.message);
        setUserLocation({ lat: 14.0760, lng: 120.9389 });
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );

    // Watch position continuously
    const watchId = navigator.geolocation.watchPosition(
      (pos) => {
        setUserLocation({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        });
        setIsLocationAvailable(true);
      },
      (err) => console.warn('Watch position error:', err),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 10000 }
    );

    return () => navigator.geolocation.clearWatch(watchId);
  }, []);

  // Fetch live data cycle
  const refreshData = useCallback(async () => {
    try {
      // 1. Fetch Buses
      const busList = await fetchLiveBuses(userLocation?.lat, userLocation?.lng);
      setBuses(busList);

      // 2. Fetch Stops
      if (busStops.length === 0) {
        const stopList = await fetchBusStops();
        setBusStops(stopList);
      }

      // 3. Fetch Circles
      if (user?.email) {
        const circleList = await fetchGroupCircle();
        setCircles(circleList);
      }

      // 4. Fetch waiting & boarded status
      if (user?.email) {
        const waitRes = await fetch(`${serverUrl}/api/waiting/status?email=${encodeURIComponent(user.email)}`, {
          credentials: 'include'
        });
        if (waitRes.ok) {
          const waitData = await waitRes.json();
          if (waitData.success) {
            setIsWaiting(!!waitData.is_waiting);
            setWaitingLocation(waitData.location_name || '');
            setIsBoarded(!!waitData.is_boarded);
            setBoardedBus(waitData.bus_code || '');
            setBoardedRoute(waitData.route || '');
            if (waitData.expires_at) {
              setWaitingExpiresAt(waitData.expires_at);
            } else if (!waitData.is_waiting) {
              setWaitingExpiresAt(null);
            }
          }
        }
      }
    } catch (e) {
      console.warn('Tracking data refresh error:', e);
    } finally {
      setIsInitialLoading(false);
    }
  }, [userLocation?.lat, userLocation?.lng, busStops.length, user?.email, serverUrl]);

  useEffect(() => {
    refreshData();
    const interval = setInterval(refreshData, 8000);
    return () => clearInterval(interval);
  }, [refreshData]);

  // Live countdown timer for waiting expiry
  useEffect(() => {
    if (!isWaiting || !waitingExpiresAt) {
      setWaitingSecondsLeft(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(waitingExpiresAt).getTime() - Date.now()) / 1000));
      setWaitingSecondsLeft(diff);
      if (diff <= 0) {
        setIsWaiting(false);
        setWaitingLocation('');
        setWaitingExpiresAt(null);
      }
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [isWaiting, waitingExpiresAt]);

  // Auto-Boarding Proximity Detection
  useEffect(() => {
    if (!userLocation || isBoarded || buses.length === 0) return;

    for (const bus of buses) {
      const bLat = parseFloat(bus.lat as string);
      const bLng = parseFloat(bus.lng as string);
      if (isNaN(bLat) || isNaN(bLng)) continue;

      const distKm = getHaversineDistanceKm(userLocation.lat, userLocation.lng, bLat, bLng);
      const busId = bus.code || bus.plate_number || `${bus.Bus_ID}`;

      // Within 50 meters (0.05 km) and not previously rejected
      if (distKm <= 0.05 && !rejectedBusesRef.current.has(busId)) {
        setPendingBoardBus(bus);
        break;
      }
    }
  }, [userLocation, buses, isBoarded]);

  const acceptBoard = () => {
    if (pendingBoardBus) {
      setIsBoarded(true);
      setBoardedBus(pendingBoardBus.code || pendingBoardBus.plate_number || 'B-01');
      setBoardedRoute(pendingBoardBus.route || 'LAUREL - TANAUAN');
      setIsWaiting(false);
      setWaitingLocation('');
      setPendingBoardBus(null);
    }
  };

  const rejectBoard = () => {
    if (pendingBoardBus) {
      const busId = pendingBoardBus.code || pendingBoardBus.plate_number || `${pendingBoardBus.Bus_ID}`;
      rejectedBusesRef.current.add(busId);
      setPendingBoardBus(null);
    }
  };

  const acceptDepart = () => {
    setIsBoarded(false);
    setBoardedBus('');
    setBoardedRoute('');
    setPendingDepartBus(false);
  };

  const rejectDepart = () => {
    setPendingDepartBus(false);
  };

  // Waiting status actions
  const setWaitingStatus = async (stopName: string): Promise<boolean> => {
    try {
      const res = await fetch(`${serverUrl}/api/waiting/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: user?.email || '',
          location_name: stopName,
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsWaiting(true);
        setWaitingLocation(stopName);
        if (data.expires_at) setWaitingExpiresAt(data.expires_at);
        return true;
      }
    } catch (e) {
      console.error('Failed to set waiting status:', e);
    }
    return false;
  };

  const cancelWaitingStatus = async (): Promise<boolean> => {
    try {
      const res = await fetch(`${serverUrl}/api/waiting/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          email: user?.email || '',
        })
      });
      const data = await res.json();
      if (data.success) {
        setIsWaiting(false);
        setWaitingLocation('');
        setWaitingExpiresAt(null);
        return true;
      }
    } catch (e) {
      console.error('Failed to cancel waiting status:', e);
    }
    return false;
  };

  // Circle invite actions
  const generateInviteCode = async (reset: boolean = false) => {
    try {
      const url = reset ? `${serverUrl}/api/group/invite-code?reset=1` : `${serverUrl}/api/group/invite-code`;
      const res = await fetch(url, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invite_code) {
          setInviteCode(data.invite_code);
        }
      }
    } catch (e) {
      console.error('Failed to fetch invite code:', e);
    }
  };

  useEffect(() => {
    if (serverUrl && user?.email) {
      generateInviteCode(false);
    }
  }, [serverUrl, user?.email]);

  const joinCircle = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${serverUrl}/api/group/join`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invite_code: code.trim() }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        await refreshData();
        return { success: true, message: data.message || `Joined circle with code: ${code}` };
      }
      return { success: false, message: data.message || 'Failed to join circle.' };
    } catch (e) {
      return { success: false, message: 'Network error joining circle.' };
    }
  };

  const removeCircleMember = async (friendId: number): Promise<{ success: boolean; message: string }> => {
    try {
      const res = await fetch(`${serverUrl}/api/group/remove`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ friend_id: friendId }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        await refreshData();
        return { success: true, message: data.message || 'Member removed successfully.' };
      }
      return { success: false, message: data.message || 'Failed to remove member.' };
    } catch (e) {
      return { success: false, message: 'Network error removing member.' };
    }
  };

  // Map actions
  const centerOnUser = () => {
    if (userLocation) {
      setMapCenterTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 16 });
    }
  };

  const focusOnBus = (bus: BusItem) => {
    const lat = parseFloat(bus.lat as string);
    const lng = parseFloat(bus.lng as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 17 });
    }
  };

  const focusOnStop = (stop: BusStopItem) => {
    const lat = parseFloat(stop.lat as string);
    const lng = parseFloat(stop.lng as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 17 });
    }
  };

  const focusOnFriend = (friend: CircleMember) => {
    const lat = parseFloat(friend.latitude as string);
    const lng = parseFloat(friend.longitude as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 16 });
    }
  };

  const filteredBuses = buses.filter(b => !selectedRoute || b.route === selectedRoute);
  const filteredStops = busStops.filter(s => s.route === stopsRoute);

  return (
    <TrackingContext.Provider
      value={{
        userLocation,
        isLocationAvailable,
        buses,
        filteredBuses,
        busStops,
        filteredStops,
        circles,
        selectedRoute,
        setSelectedRoute,
        stopsRoute,
        setStopsRoute,
        isWaiting,
        waitingLocation,
        waitingExpiresAt,
        waitingSecondsLeft,
        setWaitingStatus,
        cancelWaitingStatus,
        isBoarded,
        boardedBus,
        boardedRoute,
        pendingBoardBus,
        pendingDepartBus,
        acceptBoard,
        rejectBoard,
        acceptDepart,
        rejectDepart,
        inviteCode,
        generateInviteCode,
        joinCircle,
        removeCircleMember,
        mapCenterTarget,
        centerOnUser,
        focusOnBus,
        focusOnStop,
        focusOnFriend,
        isInitialLoading,
        refreshData,
      }}
    >
      {children}
    </TrackingContext.Provider>
  );
};

export const useTracking = () => {
  const context = useContext(TrackingContext);
  if (!context) throw new Error('useTracking must be used within a TrackingProvider');
  return context;
};
