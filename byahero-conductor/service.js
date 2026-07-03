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
  });

  TrackPlayer.addEventListener('remote-previous', () => {
    console.log('service.js: RemotePrevious triggered');
  });

  TrackPlayer.addEventListener('playback-queue-ended', async () => {
    console.log('service.js: PlaybackQueueEnded triggered, looping/restarting');
    try {
      await TrackPlayer.seekTo(0);
      await TrackPlayer.play();
    } catch (err) {
      console.warn('Failed to replay track on queue ended:', err);
    }
  });
};
