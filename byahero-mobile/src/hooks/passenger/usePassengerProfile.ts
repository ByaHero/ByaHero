import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export function usePassengerProfile() {
  const [userProfilePic, setUserProfilePic] = useState<string>('');
  const [userInitial, setUserInitial] = useState<string>('P');

  useEffect(() => {
    async function loadUserProfile() {
      try {
        const cachedPic = await AsyncStorage.getItem('byahero_cached_profile_picture') || '';
        setUserProfilePic(cachedPic);

        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || 'Guest';
        let name = cachedName;
        if (name.includes('@')) {
          name = name.split('@')[0];
        }
        const initial = name.charAt(0).toUpperCase() || 'P';
        setUserInitial(initial);
      } catch (e) {
        console.error('Error loading user profile details for map:', e);
      }
    }
    loadUserProfile();
  }, []);

  const getFullProfilePicUrl = (baseUrl: string) => {
    if (!userProfilePic || userProfilePic === 'null' || userProfilePic === 'undefined') {
      return '';
    }
    if (userProfilePic.startsWith('data:') || userProfilePic.startsWith('http')) {
      return userProfilePic;
    }
    return baseUrl.replace(/\/$/, '') + '/' + userProfilePic.replace(/^\//, '');
  };

  return { userProfilePic, userInitial, getFullProfilePicUrl };
}
