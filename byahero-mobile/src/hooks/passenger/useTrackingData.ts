import { useState, useEffect, useRef, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../../services/authService';
import { resolveBusLocationName } from '../../utils/locationUtils';
import { loadBusData, loadFriendsCache, saveFriendsData } from '../../services/offlineCache';

function enrichFriendWithLocation(friend: any) {
  const rawLat = friend.latitude ?? friend.lat;
  const rawLng = friend.longitude ?? friend.lng;
  const lat = rawLat !== null && rawLat !== undefined && rawLat !== '' ? parseFloat(String(rawLat)) : NaN;
  const lng = rawLng !== null && rawLng !== undefined && rawLng !== '' ? parseFloat(String(rawLng)) : NaN;
  const hasCoords = !isNaN(lat) && !isNaN(lng);

  let resolvedName = friend.last_location_name || friend.location_name || null;
  if (!resolvedName && hasCoords) {
    resolvedName = resolveBusLocationName(lat, lng) || `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
  }

  return {
    ...friend,
    latitude: hasCoords ? lat : friend.latitude,
    longitude: hasCoords ? lng : friend.longitude,
    lat: hasCoords ? lat : friend.lat,
    lng: hasCoords ? lng : friend.lng,
    last_location_name: resolvedName,
  };
}

export function useTrackingData(userLocation?: { lat: number; lng: number } | null) {
  const [buses, setBuses] = useState<any[]>([]);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const circlesRef = useRef<any[]>([]);
  const [isCirclesOffline, setIsCirclesOffline] = useState(false);
  const [circlesCachedAt, setCirclesCachedAt] = useState<string | null>(null);
  const [baseUrl, setBaseUrl] = useState('https://api.byahero.app');

  const [isWaiting, setIsWaitingState] = useState(false);
  const waitingStatusRevision = useRef(0);
  const setIsWaiting = useCallback((value: boolean) => {
    // A poll started before a local registration/cancellation must not undo it.
    waitingStatusRevision.current += 1;
    setIsWaitingState(value);
  }, []);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingExpiresAt, setWaitingExpiresAt] = useState<string | null>(null);
  const [isBoarded, setIsBoarded] = useState(false);
  const [boardedBus, setBoardedBus] = useState('');
  const [boardedRoute, setBoardedRoute] = useState('');
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const hydrateCirclesFromCache = useCallback(async (loggedInEmail?: string) => {
    try {
      const email = (loggedInEmail ?? (await AsyncStorage.getItem('byahero_cached_email')) ?? '').toLowerCase().trim();
      const cached = await loadFriendsCache(email || null);
      if (cached && Array.isArray(cached.friends)) {
        const uniqueFriends = new Map<string, any>();
        cached.friends.forEach((friend: any) => {
          const friendEmail = (friend.email || '').toLowerCase().trim();
          const key = friendEmail || String(friend.id || '');
          if (key && friendEmail !== email && !uniqueFriends.has(key)) {
            uniqueFriends.set(key, enrichFriendWithLocation(friend));
          }
        });
        const cachedList = Array.from(uniqueFriends.values());
        if (cachedList.length > 0 && circlesRef.current.length === 0) {
          circlesRef.current = cachedList;
          setCircles(cachedList);
        }
        if (cached.cached_at) {
          setCirclesCachedAt(cached.cached_at);
        }
      }
    } catch (e) {
      console.warn('Failed to hydrate cached circle members:', e);
    }
  }, []);

  // Immediately hydrate cached circle members on mount so offline mode shows them right away
  useEffect(() => {
    hydrateCirclesFromCache();
  }, [hydrateCirclesFromCache]);

  const fetchGroupMembers = async (currentBaseUrl: string) => {
    const email = (await AsyncStorage.getItem('byahero_cached_email') || '').trim();
    const loggedInEmail = email.toLowerCase();
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 7000);
    try {
      const url = email ? `${currentBaseUrl}/api/group/view?email=${encodeURIComponent(email)}` : `${currentBaseUrl}/api/group/view`;
      const res = await fetch(url, {
        headers: email ? { 'X-User-Email': email } : {},
        credentials: 'include',
        cache: 'no-store',
        signal: controller.signal
      });
      clearTimeout(timer);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.friends)) {
          // Deduplicate by email and filter out the logged in user
          const uniqueFriends = new Map();
          data.friends.forEach((friend: any) => {
            const friendEmail = (friend.email || '').toLowerCase().trim();
            if (friendEmail && friendEmail !== loggedInEmail && !uniqueFriends.has(friendEmail)) {
              uniqueFriends.set(friendEmail, enrichFriendWithLocation(friend));
            }
          });

          const enrichedFriends = Array.from(uniqueFriends.values());
          circlesRef.current = enrichedFriends;
          setCircles(enrichedFriends);
          setIsCirclesOffline(false);

          const savedAt = await saveFriendsData(enrichedFriends, loggedInEmail || null);
          setCirclesCachedAt(savedAt);
          return;
        }
      }
      // Non-OK response: keep existing / cached circles and flag offline/fallback state
      setIsCirclesOffline(true);
      await hydrateCirclesFromCache(loggedInEmail);
    } catch (err: any) {
      clearTimeout(timer);
      setIsCirclesOffline(true);
      await hydrateCirclesFromCache(loggedInEmail);
      if (err.name !== 'AbortError' && err.message !== 'Network request failed') {
        console.error('Error fetching group members:', err);
      }
    }
  };

  useEffect(() => {
    let active = true;
    let isFetching = false;
    let hasFetchedStops = false;

    const fetchData = async () => {
      if (isFetching) return;
      isFetching = true;
      try {
        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);

        // Fetch live buses
        try {
          let busesUrl = `${currentBaseUrl}/api/buses`;
          if (userLocation && userLocation.lat && userLocation.lng) {
            busesUrl += `?user_lat=${userLocation.lat}&user_lng=${userLocation.lng}`;
          }
          const busesRes = await fetch(busesUrl);
          if (busesRes.ok && active) {
            const busesData = await busesRes.json();
            if (busesData && busesData.success && Array.isArray(busesData.buses)) {
              const activeBuses = busesData.buses
                .filter((bus: any) =>
                  bus.status !== 'unavailable' &&
                  bus.lat !== null && bus.lat !== undefined && bus.lat !== '' &&
                  bus.lng !== null && bus.lng !== undefined && bus.lng !== ''
                )
                .map((bus: any) => {
                  if (!bus.current_location_name) {
                    const lat = parseFloat(bus.lat);
                    const lng = parseFloat(bus.lng);
                    if (!isNaN(lat) && !isNaN(lng)) {
                      bus.current_location_name = resolveBusLocationName(lat, lng) || undefined;
                    }
                  }
                  return bus;
                });
              setBuses(activeBuses);
            }
          }
        } catch (e: any) {
          if (e.message !== 'Network request failed') console.error('Error fetching buses:', e);
        }

        // Fetch bus stops
        if (!hasFetchedStops) {
          let fetchedStops = null;
          try {
            const stopsRes = await fetch(`${currentBaseUrl}/api/buses/stops-terminal`);
            if (stopsRes.ok && active) {
              const stopsData = await stopsRes.json();
              if (stopsData && stopsData.success && Array.isArray(stopsData.data)) {
                fetchedStops = stopsData.data;
              }
            }
          } catch (err: any) {
            if (err.message !== 'Network request failed') {
              console.error('Error fetching stops:', err);
            }
          }

          if (fetchedStops && active) {
            hasFetchedStops = true;
            setBusStops(prev => JSON.stringify(prev) === JSON.stringify(fetchedStops) ? prev : fetchedStops);
          } else if (active) {
            // Fallback to offline cache
            const cached = await loadBusData();
            if (cached && cached.pickup_points && cached.pickup_points.length > 0) {
              const pts = cached.pickup_points || [];
              hasFetchedStops = true;
              setBusStops(prev => JSON.stringify(prev) === JSON.stringify(pts) ? prev : pts);
            }
          }
        }

        // Fetch group members
        await fetchGroupMembers(currentBaseUrl);

        // Fetch my waiting status
        try {
          const loggedInEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
          if (loggedInEmail && active) {
            const revision = waitingStatusRevision.current;
            const waitStatusRes = await fetch(`${currentBaseUrl}/api/waiting/status?email=${encodeURIComponent(loggedInEmail)}`, {
              credentials: 'include',
              headers: { Accept: 'application/json' },
              cache: 'no-store',
            });
            if (waitStatusRes.ok) {
              const waitData = await waitStatusRes.json();
              if (active && revision === waitingStatusRevision.current && waitData.success) {
                setIsWaitingState(!!waitData.is_waiting);
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
          if (e.message !== 'Network request failed') console.error('Error fetching waiting status:', e);
        }
        
        if (active) {
          setIsInitialFetchDone(true);
        }
      } catch (err: any) {
        if (err.message !== 'Network request failed') {
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
  }, [userLocation?.lat, userLocation?.lng]);

  return {
    buses,
    busStops,
    circles,
    isCirclesOffline,
    circlesCachedAt,
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
  };
}
