// service.js
import TrackPlayer, { Capability, Event } from "react-native-track-player";
import historyManager from './Utils/HistoryManager';
import autoRecommendations from './Utils/AutoRecommendations';
import DownloadQueueService from './Utils/DownloadQueueService';
import { PlayNextSong, PlayPreviousSong } from './MusicPlayerFunctions';

let isPlayerInitialized = false;

export const PlaybackService = async function () {
  try {
    if (!isPlayerInitialized) {
      await TrackPlayer.setupPlayer({
        android: {
          appKilledPlaybackBehavior: 'ContinuePlayback',
          alwaysPauseOnInterruption: false,
        },
        autoHandleInterruptions: true,
        autoUpdateMetadata: true,
        waitForBuffer: true,
      });
      isPlayerInitialized = true;
      console.log('Player initialized successfully in service.js');
    }

    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => PlayNextSong());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => PlayPreviousSong());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

    // History tracking is handled by ContextState.jsx to avoid duplicate calls
    // and ensure non-blocking UI updates. Removed from here to prevent blocking.

    // Auto-recommendations listeners
    autoRecommendations.initializeListeners();
    console.log('Auto-recommendations event listeners initialized');

    // Download queue service - handles queue end for downloaded songs
    DownloadQueueService.initialize();
    console.log('Download queue service initialized');

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: 'ContinuePlayback',
        alwaysPauseOnInterruption: false,
      },
      capabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      notificationCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
        Capability.SeekTo,
      ],
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext, Capability.SkipToPrevious],
    });

    // Initialize history manager (now lightweight)
    await historyManager.initialize();

  } catch (error) {
    if (error.message && error.message.includes('player has already been initialized')) {
      isPlayerInitialized = true;
    } else {
      console.error('Error initializing player in service.js:', error);
    }
  }
};
