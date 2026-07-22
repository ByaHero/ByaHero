import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  Dimensions,
  Animated,
  TouchableWithoutFeedback,
  Platform,
  Alert,
  useWindowDimensions
} from 'react-native';
import { Image } from 'expo-image';
import { router, usePathname } from 'expo-router';
import tw from 'twrnc';
import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function ConductorNavbar({ title = 'Conductor' }: { title?: string }) {
  const { width } = useWindowDimensions();
  const [menuVisible, setMenuVisible] = useState(false);
  const [userName, setUserName] = useState('Conductor');
  const [userEmail, setUserEmail] = useState('conductor@byahero.com');
  const [userInitial, setUserInitial] = useState('C');
  const [profilePicture, setProfilePicture] = useState<string | null>(null);

  const slideAnim = React.useRef(new Animated.Value(width)).current;
  const backdropOpacity = React.useRef(new Animated.Value(0)).current;
  const insets = useSafeAreaInsets();

  const pathname = usePathname();
  const isDashboard = pathname === '/dashboard' || pathname === '/dashboard/';
  const isProfile = pathname === '/profile';
  const isLiveTracking = pathname === '/liveTracking';

  useEffect(() => {
    async function loadUser() {
      try {
        const name = await AsyncStorage.getItem('byahero_cached_name');
        const email = await AsyncStorage.getItem('byahero_cached_email');
        const picture = await AsyncStorage.getItem('byahero_cached_profile_picture');
        if (name) {
          setUserName(name);
          setUserInitial(name.charAt(0).toUpperCase());
        }
        if (email) {
          setUserEmail(email);
        }
        if (picture) {
          setProfilePicture(picture);
        } else {
          setProfilePicture(null);
        }
      } catch (err) { }
    }
    if (menuVisible) {
      loadUser();
    }
  }, [menuVisible]);

  useEffect(() => {
    if (!menuVisible) {
      slideAnim.setValue(width);
    }
  }, [width, menuVisible, slideAnim]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0.5, duration: 300, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: 0, duration: 300, useNativeDriver: true }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: width, duration: 250, useNativeDriver: true }),
    ]).start(() => setMenuVisible(false));
  };

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogout = () => {
    setLogoutModalOpen(true);
  };

  const confirmLogout = async () => {
    setLogoutModalOpen(false);
    // First close the drawer animatedly to avoid unmounting race conditions
    Animated.parallel([
      Animated.timing(backdropOpacity, { toValue: 0, duration: 200, useNativeDriver: true }),
      Animated.timing(slideAnim, { toValue: width, duration: 200, useNativeDriver: true }),
    ]).start(async () => {
      setMenuVisible(false);
      await AsyncStorage.removeItem('byahero_cached_email');
      await AsyncStorage.removeItem('byahero_cached_role');
      await AsyncStorage.removeItem('byahero_cached_name');
      router.replace('/');
    });
  };

  return (
    <>
      <View style={[
        tw`bg-[#0f3878] flex-row items-center px-4 shadow-md`,
        {
          paddingTop: insets.top,
          height: 54 + insets.top,
          borderBottomLeftRadius: 18,
          borderBottomRightRadius: 18,
          zIndex: 2000
        }
      ]}>

        {isProfile ? (
          <View style={tw`flex-row items-center flex-1 gap-3`}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={tw`w-11 h-11 rounded-full items-center justify-center bg-white/10`}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={tw`text-white font-extrabold text-base`}>Profile</Text>
          </View>
        ) : isDashboard ? (
          <>
            <View style={tw`flex-1 flex-row items-center z-10`}>
              <Image
                source={require('../../assets/images/topBarLogo.svg')}
                style={tw`w-[70px] h-[70px]`}
                contentFit="contain"
              />
            </View>
            <View style={[tw`absolute left-0 right-0 items-center justify-center`, { top: insets.top, bottom: 0, zIndex: 0 }]} pointerEvents="none">
              <Image
                source={require('../../assets/images/ByaHero.svg')}
                style={tw`w-[110px] h-[35px]`}
                contentFit="contain"
              />
            </View>
            <View style={tw`flex-1 items-end`}>
              <TouchableOpacity onPress={openMenu} style={tw`w-[50px] h-[50px] items-center justify-center`}>
                <Image
                  source={require('../../assets/images/HAMBURGER.svg')}
                  style={tw`w-[25px] h-[25px]`}
                  contentFit="contain"
                />
              </TouchableOpacity>
            </View>
          </>
        ) : isLiveTracking ? (
          <View style={tw`flex-row items-center flex-1 justify-center`}>
            <Text style={tw`text-white font-black text-lg tracking-widest uppercase`}>Bus Live</Text>
          </View>
        ) : (
          <View style={tw`flex-row items-center flex-1 gap-3`}>
            <TouchableOpacity onPress={() => router.canGoBack() ? router.back() : router.replace('/dashboard')} style={tw`w-11 h-11 rounded-full items-center justify-center bg-white/10`}>
              <MaterialIcons name="arrow-back" size={26} color="white" />
            </TouchableOpacity>
            <Text style={tw`text-white font-extrabold text-[1.05rem] tracking-wide`}>{title}</Text>
          </View>
        )}
      </View>

      {/* Offcanvas Menu */}
      <Modal animationType="none" transparent={true} visible={menuVisible} onRequestClose={closeMenu}>
        <View style={tw`flex-1 flex-row justify-end relative`}>
          <Animated.View style={[tw`absolute inset-0 bg-black`, { opacity: backdropOpacity }]}>
            <TouchableWithoutFeedback onPress={closeMenu}>
              <View style={tw`flex-1`} />
            </TouchableWithoutFeedback>
          </Animated.View>

          <Animated.View style={[tw`bg-[#f3f4f6] h-full shadow-lg`, { width: width * 0.85, transform: [{ translateX: slideAnim }] }]}>
            <View style={[tw`bg-[#0f3878] px-4 pt-4 pb-4`, { borderBottomLeftRadius: 18, borderBottomRightRadius: 18, paddingTop: insets.top + 16 }]}>
              <TouchableOpacity onPress={closeMenu} style={[tw`absolute right-3 p-2 z-10`, { top: insets.top + 8 }]}>
                <Text style={tw`text-white text-2xl font-bold`}>✕</Text>
              </TouchableOpacity>

              <View style={tw`flex-row items-center gap-3 pt-2`}>
                {profilePicture ? (
                  <Image source={{ uri: profilePicture }} style={tw`w-20 h-20 rounded-full bg-white`} />
                ) : (
                  <View style={tw`w-20 h-20 rounded-full bg-white items-center justify-center`}>
                    <Text style={tw`text-[#0f3878] text-4xl font-bold`}>{userInitial}</Text>
                  </View>
                )}
                <View style={tw`flex-1 pr-10`}>
                  <Text style={tw`text-white font-black text-2xl mb-1`} numberOfLines={2}>{userName}</Text>
                  <Text style={tw`text-white/80 text-sm`} numberOfLines={1}>{userEmail}</Text>
                </View>
              </View>
              <View style={tw`h-[3px] bg-white mt-4`} />
            </View>

            <View style={tw`p-4 gap-3`}>
              <TouchableOpacity
                style={tw`bg-white rounded-2xl flex-row items-center p-3.5 shadow-sm`}
                onPress={() => { closeMenu(); router.push('/profile'); }}
              >
                <View style={tw`w-9 h-9 items-center justify-center mr-2 ml-2`}>
                  <Image source={require('../../assets/images/person.svg')} style={tw`w-7 h-7`} contentFit="contain" />
                </View>
                <Text style={tw`text-[#111827] font-extrabold text-base`}>Profile</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-white rounded-2xl flex-row items-center p-3.5 shadow-sm mt-1`}
                onPress={() => { closeMenu(); router.push('/waitingPax'); }}
              >
                <View style={tw`w-9 h-9 items-center justify-center mr-2 ml-2`}>
                  <Image source={require('../../assets/images/waitingPaxColor.svg')} style={tw`w-7 h-7`} contentFit="contain" />
                </View>
                <Text style={tw`text-[#111827] font-extrabold text-base`}>Wait Count</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-white rounded-2xl flex-row items-center p-3.5 shadow-sm mt-1`}
                onPress={() => { closeMenu(); router.push('/operationHistory'); }}
              >
                <View style={tw`w-9 h-9 items-center justify-center mr-2 ml-2`}>
                  <Image source={require('../../assets/images/bus_history.svg')} style={tw`w-7 h-7`} contentFit="contain" />
                </View>
                <Text style={tw`text-[#111827] font-extrabold text-base`}>Operation History</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={tw`bg-white rounded-2xl flex-row items-center p-3.5 shadow-sm mt-1`}
                onPress={handleLogout}
              >
                <View style={tw`w-9 h-9 items-center justify-center mr-2 ml-2`}>
                  <Image source={require('../../assets/images/logout.svg')} style={tw`w-7 h-7`} contentFit="contain" />
                </View>
                <Text style={tw`text-[#111827] font-extrabold text-base`}>Log out</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>

      {/* Custom Logout Confirmation Modal */}
      <Modal
        visible={logoutModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setLogoutModalOpen(false)}
      >
        <View style={tw`flex-1 justify-center items-center bg-black/60 px-6`}>
          <View style={tw`w-full max-w-[340px] bg-white rounded-3xl p-6 items-center shadow-2xl relative`}>
            {/* Close Button */}
            <TouchableOpacity
              onPress={() => setLogoutModalOpen(false)}
              style={tw`absolute top-4 right-4 p-1 z-10`}
            >
              <MaterialIcons name="close" size={20} color="#94a3b8" />
            </TouchableOpacity>

            {/* Icon */}
            <View style={tw`w-16 h-16 rounded-full bg-red-100 items-center justify-center mb-4`}>
              <MaterialIcons name="logout" size={32} color="#ef4444" />
            </View>

            {/* Title & Subtitle */}
            <Text style={tw`text-lg font-black text-slate-800 text-center mb-1.5`}>
              Log Out of ByaHero?
            </Text>
            <Text style={tw`text-xs text-slate-500 text-center leading-relaxed mb-6`}>
              Are you sure you want to log out of your conductor account? You will need to log back in to manage your shift.
            </Text>

            {/* Action Buttons */}
            <View style={tw`w-full flex-row gap-3`}>
              <TouchableOpacity
                onPress={() => setLogoutModalOpen(false)}
                style={tw`flex-1 bg-slate-100 py-3.5 rounded-2xl items-center justify-center`}
              >
                <Text style={tw`text-slate-600 font-bold text-sm`}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={confirmLogout}
                style={tw`flex-1 bg-red-600 py-3.5 rounded-2xl items-center justify-center shadow-md`}
              >
                <Text style={tw`text-white font-bold text-sm`}>Log Out</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bottom Nav Decorative Bar */}
      {!isLiveTracking && (
        <View
          style={[
            tw`absolute left-0 right-0 bg-[#0f3878] z-50 shadow-md`,
            { bottom: 0, height: 40, elevation: 10 }
          ]}
          pointerEvents="none"
        />
      )}
    </>
  );
}
