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
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { getServerUrl } from '../../../services/authService';
import { PassengerHeader, PassengerFooter } from '../../../components/passenger-navbar';

export default function AccessibilitySettingsScreen() {
  const [textSize, setTextSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [highContrast, setHighContrast] = useState(false);
  const [screenReader, setScreenReader] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    async function loadSettings() {
      try {
        const cachedEmail = await AsyncStorage.getItem('byahero_cached_email') || 'Guest';
        const loggedIn = cachedEmail !== 'Guest' && cachedEmail !== 'guest@byahero.app';
        setIsLoggedIn(loggedIn);

        const storedSize = await AsyncStorage.getItem('byahero_text_size');
        const storedContrast = await AsyncStorage.getItem('byahero_high_contrast');
        const storedReader = await AsyncStorage.getItem('byahero_screen_reader');

        if (storedSize) setTextSize(storedSize as any);
        if (storedContrast) setHighContrast(storedContrast === '1');
        if (storedReader) setScreenReader(storedReader === '1');

        if (loggedIn) {
          const serverUrl = await getServerUrl();
          const res = await fetch(`${serverUrl}/api/settings/fetch`, { credentials: 'include' });
          const data = await res.json();
          if (data && data.success && data.settings) {
            const s = data.settings;
            if (s.text_size) {
              setTextSize(s.text_size);
              await AsyncStorage.setItem('byahero_text_size', s.text_size);
            }
            const contrast = parseInt(s.high_contrast_mode) === 1;
            setHighContrast(contrast);
            await AsyncStorage.setItem('byahero_high_contrast', contrast ? '1' : '0');

            const reader = parseInt(s.screen_reader_support) === 1;
            setScreenReader(reader);
            await AsyncStorage.setItem('byahero_screen_reader', reader ? '1' : '0');
          }
        }
      } catch (err) {
        console.warn('Failed to load accessibility settings:', err);
      }
    }
    loadSettings();
  }, []);

  const saveSetting = async (key: string, value: string) => {
    try {
      await AsyncStorage.setItem(key, value);
      
      if (isLoggedIn) {
        const serverUrl = await getServerUrl();
        const formData = new FormData();
        let backendName = key;
        if (key === 'byahero_text_size') {
          backendName = 'text_size';
        } else if (key === 'byahero_high_contrast') {
          backendName = 'high_contrast_mode';
        } else if (key === 'byahero_screen_reader') {
          backendName = 'screen_reader_support';
        }

        formData.append('setting_name', backendName);
        formData.append('setting_value', value);

        const res = await fetch(`${serverUrl}/api/settings/update`, {
          method: 'POST',
          body: formData,
          credentials: 'include',
        });
        const data = await res.json();
        if (!data.success) {
          console.warn('Failed to sync setting with server:', data.message);
        }
      }
    } catch (e) {
      console.error('Failed to save accessibility setting:', e);
    }
  };

  const adjustTextSize = (direction: 'up' | 'down') => {
    let nextSize: 'small' | 'medium' | 'large' = 'medium';
    if (direction === 'down') {
      if (textSize === 'large') nextSize = 'medium';
      else nextSize = 'small';
    } else {
      if (textSize === 'small') nextSize = 'medium';
      else nextSize = 'large';
    }
    setTextSize(nextSize);
    saveSetting('byahero_text_size', nextSize);
  };

  return (
    <SafeAreaView style={tw`flex-1 bg-white`}>
      <PassengerHeader pageTitle="Accessibility" showBackButton={true} />

      <ScrollView contentContainerStyle={tw`pb-8`}>
        <View style={[tw`p-4 bg-slate-100/70 min-h-140 mt-4`, { borderTopLeftRadius: 32, borderTopRightRadius: 32 }]}>
          <Text style={tw`text-lg font-black text-slate-800 mb-1 px-1`}>Accessibility Settings</Text>
          <Text style={tw`text-xs text-slate-400 font-medium mb-5 px-1`}>Customize your experience to make ByaHero easier to use.</Text>

          {/* Guest Notice */}
          {!isLoggedIn && (
            <View style={tw`bg-blue-50 border border-blue-100 rounded-3xl p-4 mb-4 flex-row items-center`}>
              <MaterialIcons name="info" size={20} color="#1d4ed8" style={tw`mr-2`} />
              <Text style={tw`text-xs text-blue-800/90 leading-relaxed flex-1`}>
                You're using accessibility settings as a guest. Log in to save preferences.
              </Text>
            </View>
          )}

          {/* Text Size Card */}
          <View style={tw`bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 mr-3`}>
                <Text style={tw`text-sm font-bold text-slate-800`}>Text Size</Text>
                <Text style={tw`text-xs text-slate-400 mt-0.5 font-semibold`}>
                  Adjust text size for better readability.
                </Text>
              </View>

              <View style={tw`flex-row items-center gap-2.5`}>
                <TouchableOpacity 
                  onPress={() => adjustTextSize('down')}
                  disabled={textSize === 'small'}
                  style={tw`w-10 h-10 rounded-xl bg-slate-100 justify-center items-center`}
                >
                  <Text style={tw`font-bold text-slate-700`}>A-</Text>
                </TouchableOpacity>
                
                <Text style={tw`text-xs font-bold text-[#1e3a8a] text-center w-14 uppercase`}>
                  {textSize}
                </Text>

                <TouchableOpacity 
                  onPress={() => adjustTextSize('up')}
                  disabled={textSize === 'large'}
                  style={tw`w-10 h-10 rounded-xl bg-slate-100 justify-center items-center`}
                >
                  <Text style={tw`font-bold text-slate-700`}>A+</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>

          {/* High Contrast Mode Switch */}
          <View style={tw`bg-white rounded-3xl p-4 border border-slate-100 shadow-sm mb-4`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-sm font-bold text-slate-800`}>High Contrast Mode</Text>
                <Text style={tw`text-xs text-slate-400 mt-0.5 font-semibold`}>
                  Increase contrast for better visibility.
                </Text>
              </View>
              <Switch
                value={highContrast}
                onValueChange={(val) => {
                  setHighContrast(val);
                  saveSetting('byahero_high_contrast', val ? '1' : '0');
                }}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={highContrast ? '#1e3a8a' : '#f4f3f4'}
              />
            </View>
          </View>

          {/* Screen Reader Switch */}
          <View style={tw`bg-white rounded-3xl p-4 border border-slate-100 shadow-sm`}>
            <View style={tw`flex-row items-center justify-between`}>
              <View style={tw`flex-1 mr-4`}>
                <Text style={tw`text-sm font-bold text-slate-800`}>Screen Reader Support</Text>
                <Text style={tw`text-xs text-slate-400 mt-0.5 font-semibold`}>
                  Optimize for screen reader compatibility.
                </Text>
              </View>
              <Switch
                value={screenReader}
                onValueChange={(val) => {
                  setScreenReader(val);
                  saveSetting('byahero_screen_reader', val ? '1' : '0');
                }}
                trackColor={{ false: '#cbd5e1', true: '#93c5fd' }}
                thumbColor={screenReader ? '#1e3a8a' : '#f4f3f4'}
              />
            </View>
          </View>
        </View>
      </ScrollView>

      <PassengerFooter activeTab="location" />
    </SafeAreaView>
  );
}
