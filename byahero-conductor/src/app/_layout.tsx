import { Stack } from 'expo-router';
import { ThemeProvider, DefaultTheme } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Linking } from 'react-native';

export default function RootLayout() {
  useEffect(() => {
    const handleDeepLink = (event: { url: string }) => {
      const url = event.url;
      if (url?.startsWith('byaheroconductor://')) {
        console.log('Deep link received, ignoring to prevent Unmatched Route:', url);
      }
    };
    const subscription = Linking.addEventListener('url', handleDeepLink);
    return () => {
      subscription.remove();
    };
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
        <Stack.Screen name="operationHistory" />
      </Stack>
    </ThemeProvider>
  );
}
