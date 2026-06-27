import { Stack } from 'expo-router';

export default function AdminLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: '#0f172a' },
        headerTintColor: '#fff',
        headerTitleStyle: { fontWeight: 'bold' },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="profile" options={{ title: 'Admin Profile' }} />
      <Stack.Screen name="analytics" options={{ title: 'Analytics' }} />
      <Stack.Screen name="bus-fare" options={{ title: 'Bus Fare Settings' }} />
      <Stack.Screen name="active-buses" options={{ title: 'Active Buses' }} />
      <Stack.Screen name="buses" options={{ title: 'Manage Buses' }} />
      <Stack.Screen name="conductors" options={{ title: 'Manage Conductors' }} />
      <Stack.Screen name="feedbacks" options={{ title: 'Manage Feedbacks' }} />
      <Stack.Screen name="lost-and-found" options={{ title: 'Lost & Found' }} />
      <Stack.Screen name="reports" options={{ title: 'Manage Reports' }} />
      <Stack.Screen name="stops" options={{ title: 'Manage Stops' }} />
      <Stack.Screen name="waiting-passengers" options={{ title: 'Waiting Passengers' }} />
      <Stack.Screen name="operation-schedule" options={{ title: 'Operation Schedule' }} />
    </Stack>
  );
}
