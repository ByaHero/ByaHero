import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getServerUrl } from '../../services/authService';
import { resolveBusLocationName } from '../../utils/locationUtils';

export function useTrackingData() {
  const [buses, setBuses] = useState<any[]>([]);
  const [busStops, setBusStops] = useState<any[]>([]);
  const [circles, setCircles] = useState<any[]>([]);
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  const [isWaiting, setIsWaiting] = useState(false);
  const [waitingLocation, setWaitingLocation] = useState('');
  const [waitingExpiresAt, setWaitingExpiresAt] = useState<string | null>(null);
  const [isBoarded, setIsBoarded] = useState(false);
  const [boardedBus, setBoardedBus] = useState('');
  const [boardedRoute, setBoardedRoute] = useState('');

  const fetchGroupMembers = async (currentBaseUrl: string) => {
    try {
      const res = await fetch(`${currentBaseUrl}/api/group/view`, { credentials: 'include', cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.friends)) {
          const loggedInEmail = (await AsyncStorage.getItem('byahero_cached_email') || '').toLowerCase().trim();
          
          // Deduplicate by email and filter out the logged in user
          const uniqueFriends = new Map();
          data.friends.forEach((friend: any) => {
            const friendEmail = (friend.email || '').toLowerCase().trim();
            if (friendEmail && friendEmail !== loggedInEmail && !uniqueFriends.has(friendEmail)) {
              uniqueFriends.set(friendEmail, friend);
            }
          });
          
          setCircles(Array.from(uniqueFriends.values()));
        }
      }
    } catch (err) {
      console.error('Error fetching group members:', err);
    }
  };

  useEffect(() => {
    let active = true;

    const fetchData = async () => {
      try {
        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);

        // Fetch live buses
        const busesRes = await fetch(`${currentBaseUrl}/api/buses`);
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

        // Fetch bus stops
        const stopsRes = await fetch(`${currentBaseUrl}/api/buses/stops-terminal`);
        if (stopsRes.ok && active) {
          const stopsData = await stopsRes.json();
          if (stopsData && stopsData.success && Array.isArray(stopsData.data)) {
            setBusStops(prev => JSON.stringify(prev) === JSON.stringify(stopsData.data) ? prev : stopsData.data);
          }
        }

        // Fetch group members
        await fetchGroupMembers(currentBaseUrl);

        // Fetch my waiting status
        const loggedInEmail = await AsyncStorage.getItem('byahero_cached_email') || '';
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
      } catch (err: any) {
        if (err.message !== 'Network request failed') {
          console.error('Error fetching tracking data:', err);
        }
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 4000);

    return () => {
      active = false;
      clearInterval(interval);
    };
  }, []);

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
    fetchGroupMembers
  };
}
