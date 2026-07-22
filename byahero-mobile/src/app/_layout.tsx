import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import OfflineBanner from '@/components/OfflineBanner';
import UpdateModal from '@/components/UpdateModal';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <OfflineBanner />
      <UpdateModal />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signUp" />
        <Stack.Screen name="forgotPassword" />
      </Stack>
    </ThemeProvider>
  );
}
