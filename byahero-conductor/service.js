import TrackPlayer, { Event } from 'react-native-track-player';
import { DeviceEventEmitter } from 'react-native';

module.exports = async function () {
  console.log('service.js: Playback service initialized!');

  TrackPlayer.addEventListener('remote-play', () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener('remote-pause', () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener('remote-next', () => {
    console.log('service.js: RemoteNext triggered');
    TrackPlayer.skip(2).catch(err => console.warn('Failed to skip to 2:', err));
  });

  TrackPlayer.addEventListener('remote-previous', () => {
    console.log('service.js: RemotePrevious triggered');
    TrackPlayer.skip(0).catch(err => console.warn('Failed to skip to 0:', err));
  });
};
