import '@expo/metro-runtime';
import TrackPlayer from 'react-native-track-player';
import { App } from 'expo-router/build/qualified-entry';
import { renderRootComponent } from 'expo-router/build/renderRootComponent';

// Register the playback service
TrackPlayer.registerPlaybackService(() => require('./service.js'));

// Render the Expo Router app
renderRootComponent(App);
