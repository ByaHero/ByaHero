import { Stack } from 'expo-router';
import React from 'react';
import UpdateModal from '../components/UpdateModal';

export default function RootLayout() {
  return (
    <>
      <UpdateModal />
      <Stack screenOptions={{ headerShown: false }} />
    </>
  );
}
