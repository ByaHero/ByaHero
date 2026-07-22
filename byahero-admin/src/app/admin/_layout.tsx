import { Stack } from 'expo-router';
import React from 'react';

export default function AdminLayout() {
  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="index" />
      <Stack.Screen name="activeBuses" />
      <Stack.Screen name="buses" />
      <Stack.Screen name="conductors" />
      <Stack.Screen name="schedules" />
      <Stack.Screen name="stops" />
      <Stack.Screen name="fares" />
      <Stack.Screen name="waitingPax" />
      <Stack.Screen name="lostFound" />
      <Stack.Screen name="reports" />
      <Stack.Screen name="feedback" />
      <Stack.Screen name="analytics" />
      <Stack.Screen name="profile" />
    </Stack>
  );
}
