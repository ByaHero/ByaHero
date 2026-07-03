import TrackPlayer, { Event } from 'react-native-track-player';
import { DeviceEventEmitter } from 'react-native';

module.exports = async function () {
  console.log('service.js: Playback service initialized!');

  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    console.log('service.js: RemoteNext triggered');
    TrackPlayer.skip(2).catch(err => console.warn('Failed to skip to 2:', err));
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('service.js: RemotePrevious triggered');
    TrackPlayer.skip(0).catch(err => console.warn('Failed to skip to 0:', err));
  });
};
