import { useState, useEffect } from 'react';
import { getServerUrl } from '../../services/authService';
import { resolveBusLocationName } from '../../utils/locationUtils';
import { loadBusData } from '../../services/offlineCache';

export function useTrackingData(userLocation?: { lat: number; lng: number } | null) {
  const [buses, setBuses] = useState<any[]>([]);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>(() => {
    try {
      const cached = localStorage.getItem('byahero_friends_cache');
      return cached ? JSON.parse(cached) : [];
    } catch (e) {
      return [];
    }
  });
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingExpiresAt, setWaitingExpiresAt] = useState<string | null>(null);
  const [isBoarded, setIsBoarded] = useState(false);
  const [boardedBus, setBoardedBus] = useState('');
  const [boardedRoute, setBoardedRoute] = useState('');
  const [isInitialFetchDone, setIsInitialFetchDone] = useState(false);

  const fetchGroupMembers = async (currentBaseUrl: string) => {
    try {
      const email = localStorage.getItem('byahero_cached_email') || '';
      const url = email ? `${currentBaseUrl}/api/group/view?email=${encodeURIComponent(email)}` : `${currentBaseUrl}/api/group/view`;
      const res = await fetch(url, {
        headers: email ? { 'X-User-Email': email } : {},
        credentials: 'include',
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
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
      if (err.message !== 'Failed to fetch') {
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
          if (e.message !== 'Failed to fetch') console.error('Error fetching buses:', e);
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
          const loggedInEmail = localStorage.getItem('byahero_cached_email') || '';
          if (loggedInEmail && active) {
            const waitStatusRes = await fetch(`${currentBaseUrl}/api/waiting/status?email=${encodeURIComponent(loggedInEmail)}`);
            if (waitStatusRes.ok) {
              const waitData = await waitStatusRes.json();
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
          if (e.message !== 'Failed to fetch') console.error('Error fetching waiting status:', e);
        }
        
        if (active) {
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
  }, [userLocation?.lat, userLocation?.lng]);

  return {
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
  };
}
