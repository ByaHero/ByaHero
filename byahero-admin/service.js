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
    DeviceEventEmitter.emit('remoteIncrement');
  });

  TrackPlayer.addEventListener(Event.RemotePrevious, () => {
    DeviceEventEmitter.emit('remoteDecrement');
  });
};
