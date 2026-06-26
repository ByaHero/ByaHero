import React from 'react';
import { View, Text, TouchableOpacity, SafeAreaView } from 'react-native';
import { router } from 'expo-router';

export default function AdminDashboard() {
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#020617', justifyContent: 'center', alignItems: 'center' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: '#ffffff', marginBottom: 8 }}>
        Admin Dashboard
      </Text>
      <Text style={{ fontSize: 16, color: '#94a3b8', marginBottom: 24 }}>
        ByaHero Management Portal
      </Text>
      <TouchableOpacity
        onPress={() => router.replace('/')}
        style={{ paddingHorizontal: 24, paddingVertical: 12, backgroundColor: '#ef4444', borderRadius: 9999 }}
      >
        <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Logout</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}
