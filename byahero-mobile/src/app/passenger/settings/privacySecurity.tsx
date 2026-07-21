import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Switch,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';
import { SettingsRowSwitch } from '../../../components/ui/SettingsRowSwitch';
import { GuestNotice } from '../../../components/ui/GuestNotice';

export default function PrivacySecurityScreen() {
  const [locationServices, setLocationServices] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
        const loggedIn = cachedEmail !== 'Guest' && cachedEmail !== 'guest@byahero.app';
        setIsLoggedIn(loggedIn);

        const cachedLocation = await AsyncStorage.getItem('byahero_location_services');
        if (cachedLocation !== null) {
          setLocationServices(cachedLocation === '1');
        }

        if (loggedIn) {
          const serverUrl = await getServerUrl();
          const res = await fetch(`${serverUrl}/api/settings/privacy`, { credentials: 'include' });
          const data = await res.json();
          if (data && data.success && data.settings) {
            const locVal = parseInt(data.settings.location_services) === 1;
            setLocationServices(locVal);
            await AsyncStorage.setItem('byahero_location_services', locVal ? '1' : '0');
          }
        }
      } catch (err) {
        console.warn('Failed to load privacy settings:', err);
      }
    }
    loadSettings();
  }, []);

  const handleToggleLocation = async (value: boolean) => {
    setLocationServices(value);
    try {
      await AsyncStorage.setItem('byahero_location_services', value ? '1' : '0');
      
      if (isLoggedIn) {
        const serverUrl = await getServerUrl();
        const formData = new FormData();
        formData.append('setting_name', 'location_services');
        formData.append('setting_value', value ? '1' : '0');

        const res = await fetch(`${serverUrl}/api/settings/update`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.success) {
          console.warn('Failed to save privacy settings on server:', data.message);
        }
      }

      if (!value) {
        Alert.alert('Location Services Disabled', 'Bus tracking and sharing may not work properly while this is disabled.');
      }
    } catch (e) {
      console.error('Failed to update privacy setting:', e);
    }
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Privacy & Security" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          {/* Banner */}
          <View style={tw`bg-[#1e3a8a] rounded-3xl p-5 shadow-sm mb-4`}>
            <Text style={tw`text-base font-bold text-white mb-2`}>Privacy and Security</Text>
            <Text style={tw`text-xs text-blue-100/90 leading-relaxed`}>
              Control which apps can access your data and location.{' '}
              <Text 
                style={tw`text-[#fbbf24] underline font-semibold`} 
                onPress={() => router.push('/passenger/settings/staticPages?page=privacy')}
              >
                Learn more...
              </Text>
            </Text>
          </View>

          {/* Guest notice */}
          {!isLoggedIn && (
            <GuestNotice 
              message="You're using privacy settings as a guest. Log in to save your preferences across devices." 
              actionText="Login"
              onActionPress={() => router.replace('/')}
            />
          )}

          {/* Permissions Switches */}
          <Text style={tw`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1`}>Permissions</Text>
          <View style={tw`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden mb-5`}>
            <SettingsRowSwitch
              title="Location Services"
              description="Allow ByaHero to access your location"
              value={locationServices}
              onValueChange={handleToggleLocation}
              iconName="location-on"
            />
          </View>

          {/* Additional Resources */}
          <Text style={tw`text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5 px-1`}>Additional Resources</Text>
          <View style={tw`bg-white rounded-3xl border border-slate-100 shadow-sm overflow-hidden`}>
            <TouchableOpacity 
              onPress={() => router.push('/passenger/settings/staticPages?page=privacy')}
              style={tw`flex-row items-center justify-between p-4 border-b border-slate-100`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons name="description" size={20} color="#64748b" style={tw`mr-3.5`} />
                <Text style={tw`text-sm font-semibold text-slate-700`}>Privacy Policy</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={() => router.push('/passenger/settings/staticPages?page=terms')}
              style={tw`flex-row items-center justify-between p-4`}
            >
              <View style={tw`flex-row items-center`}>
                <MaterialIcons name="gavel" size={20} color="#64748b" style={tw`mr-3.5`} />
                <Text style={tw`text-sm font-semibold text-slate-700`}>Terms of Service</Text>
              </View>
              <MaterialIcons name="chevron-right" size={24} color="#cbd5e1" />
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
