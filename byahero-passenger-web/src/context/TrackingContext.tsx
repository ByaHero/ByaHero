import React, { createContext, useContext, useState, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { useLocationTracking, LocationPermissionStatus } from '../hooks/passenger/useLocationTracking';
import { useTrackingData } from '../hooks/passenger/useTrackingData';
import { useAutoBoarding } from '../hooks/passenger/useAutoBoarding';

interface UserLocation {
  lat: number;
  lng: number;
}

export interface MapCenterTarget {
  lat: number;
  lng: number;
  zoom?: number;
  timestamp?: number;
}

interface TrackingContextType {
  userLocation: UserLocation | null;
  locationPermission: LocationPermissionStatus;
  isLocating: boolean;
  locationError: string | null;
  requestLocationPermission: () => void;
  buses: any[];
  filteredBuses: any[];
  busStops: any[];
  filteredStops: any[];
  circles: any[];
  selectedRoute: string;
  setSelectedRoute: (route: string) => void;
  stopsRoute: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL';
  setStopsRoute: (route: 'LAUREL - TANAUAN' | 'TANAUAN - LAUREL') => void;
  
  isWaiting: boolean;
  waitingLocation: string;
  waitingExpiresAt: string | null;
  waitingSecondsLeft: number | null;
  setIsWaiting: (val: boolean) => void;
  setWaitingLocation: (val: string) => void;
  setWaitingStatus: (location: string) => Promise<boolean>;
  cancelWaitingStatus: () => Promise<boolean>;
  
  isBoarded: boolean;
  boardedBus: string;
  boardedRoute: string;
  setIsBoarded: (val: boolean) => void;
  setBoardedBus: (val: string) => void;
  setBoardedRoute: (val: string) => void;

  pendingBoardBus: any | null;
  pendingDepartBus: any | null;
  acceptBoard: () => void;
  rejectBoard: () => void;
  acceptDepart: () => void;
  rejectDepart: () => void;
  
  inviteCode: string;
  generateInviteCode: (reset?: boolean) => Promise<void>;
  joinCircle: (code: string) => Promise<{ success: boolean; message: string }>;
  removeCircleMember: (friendId: number) => Promise<{ success: boolean; message: string }>;
  
  mapCenterTarget: MapCenterTarget | null;
  centerOnUser: () => void;
  focusOnBus: (bus: any) => void;
  focusOnStop: (stop: any) => void;
  focusOnFriend: (friend: any) => void;
  
  isInitialLoading: boolean;
  refreshData: () => Promise<void>;
}

const TrackingContext = createContext<TrackingContextType | undefined>(undefined);

export const TrackingProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, serverUrl } = useAuth();
  
  const [selectedRoute, setSelectedRoute] = useState<string>('');
  const [stopsRoute, setStopsRoute] = useState<'LAUREL - TANAUAN' | 'TANAUAN - LAUREL'>('LAUREL - TANAUAN');
  const [inviteCode, setInviteCode] = useState<string>(() => {
    try {
      return localStorage.getItem('byahero_cached_invite_code') || '------';
    } catch (e) {
      return '------';
    }
  });
  const [mapCenterTarget, setMapCenterTarget] = useState<MapCenterTarget | null>(null);

  const {
    userLocation,
    permissionStatus: locationPermission,
    isLocating,
    locationError,
    refreshLocation,
    requestLocationPermission,
  } = useLocationTracking({
    onCenterLocation: (lat, lng) => {
      setMapCenterTarget({ lat, lng, zoom: 16, timestamp: Date.now() });
    }
  });

  const {
    buses,
    busStops,
    circles,
    baseUrl,
    isWaiting,
    setIsWaiting,
    waitingLocation,
    setWaitingLocation,
    waitingExpiresAt,
    setWaitingExpiresAt,
    isBoarded,
    setIsBoarded,
    boardedBus,
    setBoardedBus,
    boardedRoute,
    setBoardedRoute,
    fetchGroupMembers,
    isInitialFetchDone
  } = useTrackingData(userLocation);

  const {
    pendingBoardBus,
    pendingDepartBus,
    acceptBoard,
    rejectBoard,
    acceptDepart,
    rejectDepart
  } = useAutoBoarding({
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
  });

  const generateInviteCode = async (reset: boolean = false) => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || user?.email || '';
      const emailQuery = email ? `email=${encodeURIComponent(email)}` : '';
      const resetQuery = reset ? 'reset=1' : '';
      const query = [emailQuery, resetQuery].filter(Boolean).join('&');
      const url = `${serverUrl}/api/group/invite-code${query ? '?' + query : ''}`;
      const res = await fetch(url, {
        headers: email ? { 'X-User-Email': email } : {},
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.invite_code) {
          setInviteCode(data.invite_code);
          try {
            localStorage.setItem('byahero_cached_invite_code', data.invite_code);
          } catch (e) {}
        }
      }
    } catch (e) {
      console.error('Failed to fetch invite code:', e);
    }
  };

  // Automatically fetch invite code when user or server is ready
  React.useEffect(() => {
    const email = localStorage.getItem('byahero_cached_email') || user?.email;
    if (serverUrl && email) {
      generateInviteCode(false);
    }
  }, [serverUrl, user?.email]);

  const joinCircle = async (code: string): Promise<{ success: boolean; message: string }> => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || user?.email || '';
      const res = await fetch(`${serverUrl}/api/group/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(email ? { 'X-User-Email': email } : {})
        },
        body: JSON.stringify({ invite_code: code.trim(), email }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        await fetchGroupMembers(serverUrl);
        return { success: true, message: data.message || `Joined circle with code: ${code}` };
      }
      return { success: false, message: data.message || 'Failed to join circle.' };
    } catch (e) {
      return { success: false, message: 'Network error joining circle.' };
    }
  };

  const [waitingSecondsLeft, setWaitingSecondsLeft] = useState<number | null>(null);

  React.useEffect(() => {
    if (!isWaiting || !waitingExpiresAt) {
      setWaitingSecondsLeft(null);
      return;
    }
    const update = () => {
      const diff = Math.max(0, Math.floor((new Date(waitingExpiresAt).getTime() - Date.now()) / 1000));
      setWaitingSecondsLeft(diff);
    };
    update();
    const t = setInterval(update, 1000);
    return () => clearInterval(t);
  }, [isWaiting, waitingExpiresAt]);

  const setWaitingStatus = async (location: string): Promise<boolean> => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || '';
      const res = await fetch(`${serverUrl}/api/waiting/set`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email, location_name: location })
      });
      const data = await res.json();
      if (data.success) {
        setIsWaiting(true);
        setWaitingLocation(location);
        if (data.expires_at) setWaitingExpiresAt(data.expires_at);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const cancelWaitingStatus = async (): Promise<boolean> => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || '';
      const res = await fetch(`${serverUrl}/api/waiting/cancel`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ email })
      });
      const data = await res.json();
      if (data.success) {
        setIsWaiting(false);
        setWaitingLocation('');
        setWaitingExpiresAt(null);
        return true;
      }
      return false;
    } catch (e) {
      return false;
    }
  };

  const removeCircleMember = async (friendId: number): Promise<{ success: boolean; message: string }> => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || user?.email || '';
      const res = await fetch(`${serverUrl}/api/group/remove`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(email ? { 'X-User-Email': email } : {})
        },
        body: JSON.stringify({ friend_id: friendId, email }),
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        await fetchGroupMembers(serverUrl);
        return { success: true, message: data.message || 'Member removed successfully.' };
      }
      return { success: false, message: data.message || 'Failed to remove member.' };
    } catch (e) {
      return { success: false, message: 'Network error removing member.' };
    }
  };

  const centerOnUser = () => {
    refreshLocation();
    if (userLocation) {
      setMapCenterTarget({ lat: userLocation.lat, lng: userLocation.lng, zoom: 16, timestamp: Date.now() });
    }
  };

  const focusOnBus = (bus: any) => {
    const lat = parseFloat(bus.lat as string);
    const lng = parseFloat(bus.lng as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 17, timestamp: Date.now() });
    }
  };

  const focusOnStop = (stop: any) => {
    const lat = parseFloat(stop.lat as string);
    const lng = parseFloat(stop.lng as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 17, timestamp: Date.now() });
    }
  };

  const focusOnFriend = (friend: any) => {
    const lat = parseFloat(friend.latitude as string);
    const lng = parseFloat(friend.longitude as string);
    if (!isNaN(lat) && !isNaN(lng)) {
      setMapCenterTarget({ lat, lng, zoom: 16, timestamp: Date.now() });
    }
  };

  const filteredBuses = buses.filter(b => {
    if (!selectedRoute) return true;
    return b.route?.toUpperCase().includes(selectedRoute.toUpperCase());
  });
  
  const filteredStops = busStops.filter(s => {
    if (!stopsRoute) return true;
    return s.route?.toUpperCase().includes(stopsRoute.toUpperCase());
  });

  const refreshData = async () => {
     // No op, as useTrackingData auto polls. But kept for interface compatibility.
  };

  return (
    <TrackingContext.Provider
      value={{
        userLocation,
        locationPermission,
        isLocating,
        locationError,
        requestLocationPermission,
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
        setIsWaiting,
        waitingLocation,
        setWaitingLocation,
        waitingExpiresAt,
        waitingSecondsLeft,
        setWaitingStatus,
        cancelWaitingStatus,
        isBoarded,
        setIsBoarded,
        boardedBus,
        setBoardedBus,
        boardedRoute,
        setBoardedRoute,
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
        isInitialLoading: !isInitialFetchDone,
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
