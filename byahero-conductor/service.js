import TrackPlayer, { Event } from 'react-native-track-player';
import { DeviceEventEmitter } from 'react-native';

module.exports = async function () {
  TrackPlayer.addEventListener(Event.RemotePlay, () => {
    TrackPlayer.play();
  });

  TrackPlayer.addEventListener(Event.RemotePause, () => {
    TrackPlayer.pause();
  });

  TrackPlayer.addEventListener(Event.RemoteNext, () => {
    DeviceEventEmitter.emit('remoteDecrement');
    TrackPlayer.skip(1).catch(err => console.warn('Failed to skip to 1:', err));
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    DeviceEventEmitter.emit('remoteIncrement');
    TrackPlayer.skip(1).catch(err => console.warn('Failed to skip to 1:', err));
  });
};
