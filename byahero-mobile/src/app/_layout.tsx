import { Stack } from 'expo-router';
import { ThemeProvider, DarkTheme, DefaultTheme } from '@react-navigation/native';
import { useColorScheme } from 'react-native';

import { AnimatedSplashOverlay } from '@/components/animated-icon';
import OfflineBanner from '@/components/OfflineBanner';
import UpdateModal from '@/components/UpdateModal';
import { CustomAlertModal } from '@/components/CustomAlert';
import { useInAppSosListener } from '../hooks/passenger/useInAppSosListener';
import { InAppSosBanner } from '../components/InAppSosBanner';

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const { activeSosAlert, dismissSosAlert } = useInAppSosListener();

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <AnimatedSplashOverlay />
      <OfflineBanner />
      <UpdateModal />
      <CustomAlertModal />
      <InAppSosBanner alert={activeSosAlert} onDismiss={dismissSosAlert} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="signUp" />
        <Stack.Screen name="forgotPassword" />
      </Stack>
    </ThemeProvider>
  );
}
