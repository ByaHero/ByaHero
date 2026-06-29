import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import notifee, { EventType } from '@notifee/react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DeviceEventEmitter } from 'react-native';
import { updateGeoLocation } from '../services/conductorService';

async function handleNotificationAction({ type, detail }: { type: EventType; detail: any }) {
  const { notification, pressAction } = detail;

  if (type === EventType.ACTION_PRESS && pressAction) {
    try {
      const payloadStr = await AsyncStorage.getItem('byahero_conductor_payload');
      if (!payloadStr) return;
      const payload = JSON.parse(payloadStr);

      const currentSeatsStr = await AsyncStorage.getItem('byahero_seats_available');
      let currentSeats = currentSeatsStr !== null ? parseInt(currentSeatsStr, 10) : (payload.seats_total - payload.pre_departure_count);

      let changed = false;
      if (pressAction.id === 'increment-capacity') {
        // "+ Passenger" boarding means available seats decrease
        if (currentSeats > 0) {
          currentSeats -= 1;
          changed = true;
          const boardsStr = await AsyncStorage.getItem('byahero_pending_boards') || '0';
          await AsyncStorage.setItem('byahero_pending_boards', String(parseInt(boardsStr, 10) + 1));
        }
      } else if (pressAction.id === 'decrement-capacity') {
        // "- Passenger" departing means available seats increase
        if (currentSeats < payload.seats_total) {
          currentSeats += 1;
          changed = true;
          const departsStr = await AsyncStorage.getItem('byahero_pending_departs') || '0';
          await AsyncStorage.setItem('byahero_pending_departs', String(parseInt(departsStr, 10) + 1));
        }
      }

      if (changed) {
        await AsyncStorage.setItem('byahero_seats_available', String(currentSeats));
        DeviceEventEmitter.emit('seatsUpdated', currentSeats);

        // Update the notification UI
        if (notification) {
          await notifee.displayNotification({
            ...notification,
            id: notification.id,
            body: `Available Seats: ${currentSeats} / ${payload.seats_total}`,
          });
        }

        // Call the server API immediately if last known location is available
        const lastLocStr = await AsyncStorage.getItem('byahero_last_location');
        if (lastLocStr) {
          const lastLoc = JSON.parse(lastLocStr);
          await updateGeoLocation({
            bus_id: parseInt(payload.bus_id),
            geojson: {
              type: "Feature",
              geometry: { type: "Point", coordinates: [lastLoc.lng, lastLoc.lat] },
              properties: {
                bus_id: payload.bus_id,
                code: payload.code,
                route: payload.route,
                seats_available: currentSeats,
                status: lastLoc.status,
                timestamp: new Date().toISOString(),
                current_location_name: lastLoc.resolvedName
              }
            },
            route: payload.route,
            seats_available: currentSeats,
            status: lastLoc.status,
            current_location_name: lastLoc.resolvedName
          });
        }
      }
    } catch (error) {
      console.error('Error handling notification event:', error);
    }
  }
}

// Register background event handler for lock screen / background button interactions
notifee.onBackgroundEvent(handleNotificationAction);

export default function RootLayout() {
  useEffect(() => {
    const unsubscribe = notifee.onForegroundEvent(handleNotificationAction);
    notifee.cancelNotification('conductor-capacity').catch(() => {});
    return () => unsubscribe();
  }, []);

  return (
    <ThemeProvider value={DefaultTheme}>
      <StatusBar style="light" backgroundColor="#0f3878" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="liveTracking" />
        <Stack.Screen name="waitingPax" />
        <Stack.Screen name="profile" />
      </Stack>
    </ThemeProvider>
  );
}

