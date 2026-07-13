import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
  Animated,
  TouchableWithoutFeedback,
} from 'react-native';
import { Image } from 'expo-image';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import tw from 'twrnc';
import { handleTourLayout } from './TourRegistry';
import { MaterialIcons } from '@expo/vector-icons';
import { getServerUrl } from '../services/authService';

const { width, height } = Dimensions.get('window');

interface PassengerHeaderProps {
  onTriggerSOS?: () => void;
  pageTitle?: string;
  showBackButton?: boolean;
  showCloseButton?: boolean;
  activeStep?: number | null;
  menuVisible?: boolean;
  setMenuVisible?: (visible: boolean) => void;
}

export function PassengerHeader({
  onTriggerSOS,
  pageTitle,
  showBackButton,
  showCloseButton,
  activeStep,
  menuVisible: menuVisibleProp,
  setMenuVisible: setMenuVisibleProp,
}: PassengerHeaderProps) {
  const [localMenuVisible, setLocalMenuVisible] = useState(false);
  const menuVisible = menuVisibleProp !== undefined ? menuVisibleProp : localMenuVisible;
  const setMenuVisible = setMenuVisibleProp !== undefined ? setMenuVisibleProp : setLocalMenuVisible;

  const [userName, setUserName] = useState('Guest');
  const [userInitial, setUserInitial] = useState('?');
  const [userProfilePic, setUserProfilePic] = useState('');
  const [baseUrl, setBaseUrl] = useState('https://byahero.alwaysdata.net');

  const slideAnim = useRef(new Animated.Value(width)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  const menuHistoryRef = useRef<any>(null);
  const menuFeedbackRef = useRef<any>(null);
  const menuReportRef = useRef<any>(null);

  const notificationsRef = useRef<any>(null);
  const hamburgerRef = useRef<any>(null);

  // Auto-open menu drawer if we are on step 10, 12, or 14 to showcase menu options!
  useEffect(() => {
    if (activeStep === null || activeStep === undefined) return;

    if (activeStep === 10 || activeStep === 12 || activeStep === 14) {
      setMenuVisible(true);
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0.5,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      closeMenu();
    }
  }, [activeStep]);

  const openMenu = () => {
    setMenuVisible(true);
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0.5,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const closeMenu = () => {
    Animated.parallel([
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: width,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      setMenuVisible(false);
    });
  };

  useEffect(() => {
    async function loadUserData() {
      try {
        const cachedName = await AsyncStorage.getItem('byahero_cached_name') || 'Guest';
        let displayHeaderName = cachedName;
        if (displayHeaderName.includes('@')) {
          displayHeaderName = displayHeaderName.split('@')[0];
        }
        displayHeaderName = displayHeaderName.charAt(0).toUpperCase() + displayHeaderName.slice(1);
        setUserName(displayHeaderName);
        setUserInitial(displayHeaderName.charAt(0).toUpperCase() || '?');

        const cachedPic = await AsyncStorage.getItem('byahero_cached_profile_picture') || '';
        setUserProfilePic(cachedPic);

        const currentBaseUrl = await getServerUrl();
        setBaseUrl(currentBaseUrl);
      } catch (err) {
        console.error('Error loading header user data:', err);
      }
    }
    if (menuVisible) {
      loadUserData();
    }
  }, [menuVisible]);

  const handleLogout = () => {
    const performLogout = async () => {
      // First close the drawer animatedly to avoid unmounting race conditions
      Animated.parallel([
        Animated.timing(backdropOpacity, {
          toValue: 0,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: width,
          duration: 200,
          useNativeDriver: true,
        }),
      ]).start(async () => {
        setMenuVisible(false);
        try {
          const currentBaseUrl = await getServerUrl();
          const token = await AsyncStorage.getItem('sos_fcm_active_token') || '';
          await fetch(`${currentBaseUrl}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: 'fcm_token=' + encodeURIComponent(token),
            credentials: 'include'
          }).catch(() => { });
        } catch (e) { }

        await AsyncStorage.removeItem('byahero_cached_email');
        await AsyncStorage.removeItem('byahero_cached_role');
        await AsyncStorage.removeItem('byahero_cached_name');
        await AsyncStorage.removeItem('byahero_cached_profile_picture');
        await AsyncStorage.removeItem('byahero_cached_contacts');
        await AsyncStorage.removeItem('byahero_cached_phone');
        await AsyncStorage.removeItem('sos_fcm_active_token');
        router.replace('/');
      });
    };

    if (Platform.OS === 'web') {
      const confirm = window.confirm('Are you sure you want to log out?');
      if (confirm) {
        performLogout();
      }
    } else {
      Alert.alert(
        'Log Out',
        'Are you sure you want to log out?',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Log out',
            style: 'destructive',
            onPress: performLogout
          }
        ]
      );
    }
  };

  const getRef = (key: string | null) => {
    if (key === 'menu-history') return menuHistoryRef;
    if (key === 'menu-feedback') return menuFeedbackRef;
    if (key === 'menu-report') return menuReportRef;
    return null;
  };

  const menuItems = [
    { title: 'Profile', icon: require('../../assets/images/person.svg'), route: '/passenger/profile', highlightKey: null },
    { title: 'User Guide', icon: require('../../assets/images/icons/USER GUIDE.svg'), route: '/passenger/showGuide', highlightKey: null },
    { title: 'Privacy and Security', icon: require('../../assets/images/privacy.svg'), route: '/passenger/settings', highlightKey: null },
    { title: 'Lost and Found', icon: require('../../assets/images/lostandfound.svg'), route: '/passenger/lostAndFound', highlightKey: null },
    { title: 'About ByaHero', icon: require('../../assets/images/about.svg'), route: '/passenger/settings/staticPages?page=about', highlightKey: null },
    { title: 'Feedback', icon: require('../../assets/images/feedback.svg'), route: '/passenger/settings/feedback', highlightKey: 'menu-feedback' },
    { title: 'Report a Problem', icon: require('../../assets/images/report.svg'), route: '/passenger/report', highlightKey: 'menu-report' },
    { title: 'Ride History', icon: require('../../assets/images/HISTORY.svg'), route: '/passenger/rideHistory', highlightKey: 'menu-history' },
  ];

  const renderAvatar = () => {
    if (userProfilePic && userProfilePic !== 'null' && userProfilePic !== 'undefined') {
      const isAbsolute = userProfilePic.startsWith('data:') || userProfilePic.startsWith('http');
      const imgSrc = isAbsolute ? userProfilePic : (baseUrl.replace(/\/$/, '') + '/' + userProfilePic.replace(/^\//, ''));
      return (
        <Image
          source={{ uri: imgSrc }}
          style={tw`w-20 h-20 rounded-full`}
          contentFit="cover"
        />
      );
    }
    return (
      <View style={tw`w-20 h-20 rounded-full bg-white items-center justify-center`}>
        <Text style={tw`text-[#103d7c] text-3xl font-bold`}>{userInitial}</Text>
      </View>
    );
  };

  const insets = useSafeAreaInsets();

  return (
    <>
      <View style={[
        tw`bg-[#103d7c] rounded-b-2xl shadow-sm`,
        {
          paddingTop: insets.top,
          height: 56 + insets.top,
          zIndex: menuVisible ? 0 : 2002,
          elevation: menuVisible ? 0 : undefined,
        }
      ]}>
        <View style={tw`h-14 flex-row items-center justify-between px-4`}>
          {pageTitle || showBackButton || showCloseButton ? (
            <View style={tw`flex-row items-center flex-1`}>
              <TouchableOpacity onPress={() => router.back()} style={tw`p-1 mr-2`}>
                <MaterialIcons
                  name={showCloseButton ? "close" : "arrow-back"}
                  size={24}
                  color="white"
                />
              </TouchableOpacity>
              {pageTitle ? (
                <Text style={tw`text-white font-bold text-[15px]`}>{pageTitle}</Text>
              ) : null}
            </View>
          ) : (
            <>
              <View style={tw`w-15 justify-center`}>
                <Image
                  source={require('../../assets/images/topBarLogo.svg')}
                  style={tw`w-15 h-15`}
                  contentFit="contain"
                />
              </View>

              <View style={[tw`absolute justify-center items-center`, { left: 0, right: 0, top: 0, bottom: 0, zIndex: -1 }]}>
                <Image
                  source={require('../../assets/images/ByaHero.svg')}
                  style={tw`w-[100px] h-[30px]`}
                  contentFit="contain"
                />
              </View>

              <View style={tw`flex-row items-center gap-3`}>
                <TouchableOpacity
                  ref={notificationsRef}
                  onLayout={() => handleTourLayout('notifications', notificationsRef)}
                  style={tw`p-1 rounded-xl`}
                  onPress={() => router.push('/passenger/notifications' as any)}
                >
                  <Image
                    source={require('../../assets/images/notification bell.svg')}
                    style={tw`w-[22px] h-[22px]`}
                    contentFit="contain"
                    priority="high"
                    cachePolicy="memory"
                    transition={0}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  ref={hamburgerRef}
                  onLayout={() => handleTourLayout('hamburger', hamburgerRef)}
                  onPress={openMenu}
                  style={tw`p-1 rounded-xl`}
                >
                  <Image
                    source={require('../../assets/images/HAMBURGER.svg')}
                    style={tw`w-[18px] h-[18px]`}
                    contentFit="contain"
                    priority="high"
                    cachePolicy="memory"
                    transition={0}
                  />
                </TouchableOpacity>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Offcanvas Menu View */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="none"
        statusBarTranslucent={true}
        onRequestClose={closeMenu}
      >
        <View
          style={[
            { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, zIndex: 3000, elevation: 20 },
            Platform.OS === 'web' && ({
              overscrollBehavior: 'none',
            } as any),
          ]}
        >
          <View style={[tw`flex-row justify-end relative`, { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0 }]}>
            {/* Animated Dim Backdrop */}
            <Animated.View
              style={[
                { position: 'absolute', top: 0, bottom: 0, left: 0, right: 0, backgroundColor: '#000' },
                {
                  opacity: backdropOpacity,
                },
                Platform.OS === 'web' && ({
                  overscrollBehavior: 'none',
                } as any),
              ]}
            >
              <TouchableWithoutFeedback onPress={closeMenu}>
                <View style={{ flex: 1 }} />
              </TouchableWithoutFeedback>
            </Animated.View>

            {/* Sliding Menu Panel */}
            <Animated.View
              style={[
                tw`bg-white shadow-2xl`,
                {
                  width: width * 0.8,
                  position: 'absolute',
                  top: 0,
                  bottom: 0,
                  right: 0,
                  transform: [{ translateX: slideAnim }],
                },
                Platform.OS === 'web' && ({
                  overscrollBehavior: 'none',
                } as any),
              ]}
            >
              {/* Header Block */}
              <View style={tw`bg-[#103d7c] p-4 pt-10 rounded-b-2xl relative`}>
                <TouchableOpacity
                  onPress={closeMenu}
                  style={[tw`absolute top-3 right-3 p-1`, { marginTop: 25 }]}
                >
                  <Text style={tw`text-white text-2xl font-bold`}>✕</Text>
                </TouchableOpacity>
                <View style={tw`flex-row items-center gap-3 mt-4 mb-4`}>
                  {renderAvatar()}
                  <Text style={tw`text-white font-bold text-xl flex-1 text-wrap`} numberOfLines={2}>
                    {userName}
                  </Text>
                </View>
                <View style={tw`h-[3px] bg-white/100 w-full`} />
              </View>

              {/* Menu Items List */}
              <ScrollView
                contentContainerStyle={{ padding: 16, gap: 14 }}
                bounces={false}
                overScrollMode="never"
                style={Platform.OS === 'web' ? ({ overscrollBehavior: 'none' } as any) : undefined}
              >
                {menuItems.map((item, idx) => {
                  const isItemHighlighted = activeStep === 10 && item.highlightKey === 'menu-history' ||
                    activeStep === 12 && item.highlightKey === 'menu-feedback' ||
                    activeStep === 14 && item.highlightKey === 'menu-report';
                  const itemRef = getRef(item.highlightKey);
                  return (
                    <TouchableOpacity
                      key={idx}
                      ref={itemRef}
                      onLayout={() => {
                        if (item.highlightKey && itemRef) {
                          handleTourLayout(item.highlightKey, itemRef);
                        }
                      }}
                      onPress={() => {
                        Animated.parallel([
                          Animated.timing(backdropOpacity, {
                            toValue: 0,
                            duration: 200,
                            useNativeDriver: true,
                          }),
                          Animated.timing(slideAnim, {
                            toValue: width,
                            duration: 200,
                            useNativeDriver: true,
                          }),
                        ]).start(() => {
                          setMenuVisible(false);
                          router.push(item.route as any);
                        });
                      }}
                      style={tw`bg-[#ececec] shadow-lg rounded-2xl py-4 px-4 flex-row items-center gap-4`}
                    >
                      <Image source={item.icon} style={tw`w-7 h-7`} contentFit="contain" />
                      <Text style={tw`text-dark font-bold text-sm`}>{item.title}</Text>
                    </TouchableOpacity>
                  );
                })}

                {/* Logout Button */}
                <TouchableOpacity
                  onPress={handleLogout}
                  style={tw`bg-[#ececec] shadow-lg rounded-2xl py-4 px-4 flex-row items-center gap-4 mt-2.5`}
                >
                  <Image source={require('../../assets/images/logout.svg')} style={tw`w-7 h-7`} contentFit="contain" />
                  <Text style={tw`text-red-600 font-bold text-sm`}>Log out</Text>
                </TouchableOpacity>
              </ScrollView>
            </Animated.View>
          </View>
        </View>
      </Modal>
    </>
  );
}



interface PassengerFooterProps {
  activeTab: 'location' | 'sos' | 'info';
  setActiveTab?: (tab: 'location' | 'sos' | 'info') => void;
  onTriggerSOS?: () => void;
}

export function PassengerFooter({ activeTab, setActiveTab, onTriggerSOS }: PassengerFooterProps) {
  const sosRef = useRef<any>(null);

  const handleTabPress = (tab: 'location' | 'sos' | 'info') => {
    if (tab === 'location') {
      if (setActiveTab) {
        setActiveTab('location');
      } else {
        router.push('/passenger');
      }
    } else if (tab === 'sos') {
      router.push('/passenger/sos' as any);
    } else if (tab === 'info') {
      router.push('/passenger/busInfo' as any);
    }
  };

  const insets = useSafeAreaInsets();

  return (
    <View style={[
      tw`border-t border-[#e2e8f0] flex-row items-center bg-white relative`,
      {
        height: 75 + insets.bottom,
        zIndex: 1060
      }
    ]}>
      <TouchableOpacity
        onPress={() => handleTabPress('location')}
        style={[
          tw`flex-grow items-center justify-center h-full`,
          { paddingBottom: insets.bottom }
        ]}
      >
        <View style={tw`w-[30px] h-[30px] justify-center items-center`}>
          <Image
            source={require('../../assets/images/icons/locationBlack.svg')}
            style={[tw`w-[30px] h-[30px] absolute`, { opacity: activeTab === 'location' ? 1 : 0 }]}
            contentFit="contain"
            priority="high"
            cachePolicy="memory"
            transition={0}
          />
          <Image
            source={require('../../assets/images/icons/locationIdle.svg')}
            style={[tw`w-[30px] h-[30px] absolute`, { opacity: activeTab === 'location' ? 0 : 1 }]}
            contentFit="contain"
            priority="high"
            cachePolicy="memory"
            transition={0}
          />
        </View>
        <Text style={[tw`text-[13px] font-extrabold text-[#64748b] mt-1 tracking-widest`, activeTab === 'location' && tw`text-[#1856b0]`]}>LOCATION</Text>
      </TouchableOpacity>

      {/* Central Rising SOS Button */}
      <View style={tw`w-[100px] items-center justify-center h-full relative`}>
        <TouchableOpacity
          ref={sosRef}
          onLayout={() => handleTourLayout('sos-btn', sosRef)}
          style={[
            tw`w-[110px] rounded-t-[55px] bg-[#2563eb] absolute justify-start items-center pt-4`,
            { top: -20, height: 95, shadowColor: '#2563eb', shadowOffset: { width: 0, height: -4 }, shadowOpacity: 0.3, shadowRadius: 10, elevation: 10 }
          ]}
          onPress={() => handleTabPress('sos')}
        >
          <Image
            source={require('../../assets/images/icons/SOS.svg')}
            style={tw`w-[38px] h-[38px]`}
            contentFit="contain"
            priority="high"
            cachePolicy="memory"
            transition={0}
          />
          <Text style={tw`text-white text-[13px] font-black mt-1 tracking-wider uppercase`}>SOS</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={() => handleTabPress('info')}
        style={[
          tw`flex-grow items-center justify-center h-full`,
          { paddingBottom: insets.bottom }
        ]}
      >
        <View style={tw`w-[30px] h-[30px] justify-center items-center`}>
          <Image
            source={require('../../assets/images/icons/busActive.svg')}
            style={[tw`w-[30px] h-[30px] absolute`, { opacity: activeTab === 'info' ? 1 : 0 }]}
            contentFit="contain"
            priority="high"
            cachePolicy="memory"
            transition={0}
          />
          <Image
            source={require('../../assets/images/icons/busIdle.svg')}
            style={[tw`w-[30px] h-[30px] absolute`, { opacity: activeTab === 'info' ? 0 : 1 }]}
            contentFit="contain"
            priority="high"
            cachePolicy="memory"
            transition={0}
          />
        </View>
        <Text style={[tw`text-[13px] font-extrabold text-[#64748b] mt-1 tracking-widest`, activeTab === 'info' && tw`text-[#1856b0]`]}>BUS INFO</Text>
      </TouchableOpacity>
    </View>
  );
}
