import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../context/AuthContext';
import { resolveBusLocationName } from '../../utils/locationUtils';
import { loadBusData, saveLiveBusesCache, loadLiveBusesCache } from '../../services/offlineCache';

export function useTrackingData(userLocation?: { lat: number; lng: number } | null) {
  const { session } = useAuth();
  const locationRef = useRef(userLocation);
  useEffect(() => {
    locationRef.current = userLocation;
  }, [userLocation]);

  // Immediately initialize buses with cached buses so offline / launch shows last known locations
  const [buses, setBuses] = useState<any[]>(() => {
    try {
      const cached = loadLiveBusesCache();
      if (cached && cached.length > 0) return cached;
    } catch (e) {}
    return [];
  });
  const [busStops, setBusStops] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('byahero_friends_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });

  // Watch for offline/online events to immediately preserve or restore cached buses
  useEffect(() => {
    const handleConnectivity = () => {
      const cached = loadLiveBusesCache();
      if (cached && cached.length > 0) {
        setBuses(prev => prev.length > 0 ? prev : cached);
      }
    };
    window.addEventListener('offline', handleConnectivity);
    window.addEventListener('online', handleConnectivity);
    return () => {
      window.removeEventListener('offline', handleConnectivity);
      window.removeEventListener('online', handleConnectivity);
    };
  }, []);

  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingExpiresAt, setWaitingExpiresAt] = useState<string | null>(null);
  const [isBoarded, setIsBoarded] = useState(false);
  const [boardedBus, setBoardedBus] = useState('');
  const [boardedRoute, setBoardedRoute] = useState('');
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const fetchGroupMembers = useCallback(async () => {
    if (!session || session.signal.aborted) return;
    const { email, signal } = session;
    try {
      const res = await session.fetch(`group/view?email=${encodeURIComponent(email)}`, {
        headers: { 'X-User-Email': email },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        if (signal.aborted) return;
        if (data.success && Array.isArray(data.friends)) {
          const loggedInEmail = email.toLowerCase().trim();
          
          // Deduplicate by email and filter out the logged in user
          const uniqueFriends = new Map();
          data.friends.forEach((friend: any) => {
            const friendEmail = (friend.email || '').toLowerCase().trim();
            if (friendEmail && friendEmail !== loggedInEmail && !uniqueFriends.has(friendEmail)) {
              uniqueFriends.set(friendEmail, friend);
            }
          });
          
          const uniqueFriendsArray = Array.from(uniqueFriends.values());
          setCircles(uniqueFriendsArray);
          try {
            localStorage.setItem('byahero_friends_cache', JSON.stringify(uniqueFriendsArray));
          } catch(e) {}
        }
      }
    } catch (err: any) {
      if (!signal.aborted && err.message !== 'Failed to fetch') {
        console.error('Error fetching group members:', err);
      }
    }
  }, [session]);

  useEffect(() => {
    let active = true;
    if (!session) {
      const cachedBuses = loadLiveBusesCache();
      if (cachedBuses && cachedBuses.length > 0 && active) {
        setBuses(prev => prev.length > 0 ? prev : cachedBuses);
      }
      void loadBusData().then(cached => {
        if (!active) return;
        if (cached?.pickup_points?.length) setBusStops(cached.pickup_points);
        setIsInitialFetchDone(true);
      });
      return () => { active = false; };
    }

    const { email, signal } = session;
    let isFetching = false;
    let hasFetchedStops = false;

    const fetchData = async () => {
      if (!active || signal.aborted || isFetching) return;
      isFetching = true;
      try {
        // Fetch live buses
        try {
          let busesUrl = 'buses';
          const location = locationRef.current;
          if (location) {
            busesUrl += `?user_lat=${location.lat}&user_lng=${location.lng}`;
          }
          const busesRes = await session.fetch(busesUrl);
          if (busesRes.ok && active) {
            const busesData = await busesRes.json();
            if (!active || signal.aborted) return;
            if (busesData && busesData.success && Array.isArray(busesData.buses)) {
              const activeBuses = busesData.buses
                .filter((bus: any) =>
                  bus.status !== 'unavailable' &&
                  (bus.lat || bus.latitude) &&
                  (bus.lng || bus.longitude)
                )
                .map((bus: any) => {
                  const rawLat = bus.lat ?? bus.latitude;
                  const rawLng = bus.lng ?? bus.longitude;
                  const parsedLat = parseFloat(String(rawLat));
                  const parsedLng = parseFloat(String(rawLng));

                  if (!isNaN(parsedLat) && !isNaN(parsedLng)) {
                    bus.lat = String(parsedLat);
                    bus.lng = String(parsedLng);
                    bus.latitude = parsedLat;
                    bus.longitude = parsedLng;
                  }

                  if (!bus.current_location_name && !isNaN(parsedLat) && !isNaN(parsedLng)) {
                    bus.current_location_name = resolveBusLocationName(parsedLat, parsedLng) || undefined;
                  }
                  return bus;
                });

              if (activeBuses.length > 0) {
                setBuses(activeBuses);
                // Save latest bus locations in cache
                saveLiveBusesCache(activeBuses);
              }
            }
          }
        } catch (e: any) {
          if (signal.aborted) return;
          if (e.message !== 'Failed to fetch') console.error('Error fetching buses:', e);
          // If offline / disconnected, ensure last known bus locations are restored from cache
          const cachedBuses = loadLiveBusesCache();
          if (cachedBuses && cachedBuses.length > 0 && active) {
            setBuses(prev => prev.length > 0 ? prev : cachedBuses);
          }
        }

        // Fetch bus stops
        if (active && !hasFetchedStops) {
          let fetchedStops = null;
          try {
            const stopsRes = await session.fetch('buses/stops-terminal');
            if (stopsRes.ok && active) {
              const stopsData = await stopsRes.json();
              if (!active || signal.aborted) return;
              if (stopsData && stopsData.success && Array.isArray(stopsData.data)) {
                fetchedStops = stopsData.data;
              }
            }
          } catch (err: any) {
            if (signal.aborted) return;
            if (err.message !== 'Failed to fetch') {
              console.error('Error fetching stops:', err);
            }
          }

          if (fetchedStops && active) {
            hasFetchedStops = true;
            setBusStops(prev => JSON.stringify(prev) === JSON.stringify(fetchedStops) ? prev : fetchedStops);
          } else if (active) {
            // Fallback to offline cache
            const cached = await loadBusData();
            if (!active || signal.aborted) return;
            if (cached && cached.pickup_points && cached.pickup_points.length > 0) {
              const pts = cached.pickup_points || [];
              hasFetchedStops = true;
              setBusStops(prev => JSON.stringify(prev) === JSON.stringify(pts) ? prev : pts);
            }
          }
        }

        // Fetch group members
        if (!active || signal.aborted) return;
        await fetchGroupMembers();

        // Fetch my waiting status
        try {
          if (active && !signal.aborted) {
            const waitStatusRes = await session.fetch(`waiting/status?email=${encodeURIComponent(email)}`);
            if (waitStatusRes.ok) {
              const waitData = await waitStatusRes.json();
              if (!active || signal.aborted) return;
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
        } catch (e: any) {
          if (!signal.aborted && e.message !== 'Failed to fetch') console.error('Error fetching waiting status:', e);
        }
        
        if (active && !signal.aborted) {
          setIsInitialFetchDone(true);
        }
      } catch (err: any) {
        if (err.message !== 'Failed to fetch') {
          console.error('Error fetching tracking data:', err);
        }
      } finally {
        isFetching = false;
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [session, fetchGroupMembers]);

  return {
    buses,
    busStops,
    circles,
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
  };
}
