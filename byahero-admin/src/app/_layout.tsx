import { Stack } from 'expo-router';
import React from 'react';
import UpdateModal from '../components/UpdateModal';
import { CustomAlertModal } from '../components/CustomAlert';

export default function RootLayout() {
  return (
    <>
      <UpdateModal />
      <CustomAlertModal />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
