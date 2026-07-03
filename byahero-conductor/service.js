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
    DeviceEventEmitter.emit('remoteDecrement');
    TrackPlayer.skip(1).catch(err => console.warn('Failed to skip to 1:', err));
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    console.log('service.js: RemotePrevious triggered');
    DeviceEventEmitter.emit('remoteIncrement');
    TrackPlayer.skip(1).catch(err => console.warn('Failed to skip to 1:', err));
  });
};
