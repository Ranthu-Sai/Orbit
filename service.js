// service.js
import TrackPlayer, { Capability, Event } from "react-native-track-player";
import historyManager from './Utils/HistoryManager';
import autoRecommendations from './Utils/AutoRecommendations';
import DownloadQueueService from './Utils/DownloadQueueService';
import listeningHistoryService from './Utils/ListeningHistoryService';
import smartPrefetchManager from './Utils/SmartPrefetchManager';

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
    }

    // CRITICAL: Use simple native TrackPlayer methods for remote events
    // Complex functions like PlayNextSong/PlayPreviousSong fail in background
    // because they depend on React Native JS bundle being fully active.
    // Native skipToNext/skipToPrevious work reliably from notification panel.
    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, async () => {
      try {
        await TrackPlayer.skipToNext();
      } catch (e) {
        // Silently fail if at end of queue
      }
    });
    TrackPlayer.addEventListener(Event.RemotePrevious, async () => {
      try {
        await TrackPlayer.skipToPrevious();
      } catch (e) {
        // Silently fail if at start of queue
      }
    });
    TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

    // History tracking is handled by ContextState.jsx to avoid duplicate calls
    // and ensure non-blocking UI updates. Removed from here to prevent blocking.

    // Auto-recommendations listeners
    autoRecommendations.initializeListeners();
    // Download queue service - handles queue end for downloaded songs
    DownloadQueueService.initialize();
    // Initialize SmartPrefetchManager for N+1, N+2 prefetching
    smartPrefetchManager.initialize();

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

    // Initialize listening history service for personalized Quick Picks
    await listeningHistoryService.initialize();
  } catch (error) {
    if (error.message && error.message.includes('player has already been initialized')) {
      isPlayerInitialized = true;
    } else {
      console.error('Error initializing player in service.js:', error);
    }
  }
};
