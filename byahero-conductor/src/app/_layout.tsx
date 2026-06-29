import { Stack } from 'expo-router';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
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

