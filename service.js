// service.js
import TrackPlayer, { Capability } from "react-native-track-player";
import { Event } from 'react-native-track-player';
import historyManager from './Utils/HistoryManager';
import { AppState } from 'react-native';

// Keep track of whether the player has been initialized
let isPlayerInitialized = false;
let appState = 'active';
let backgroundTrackingInterval = null;

// Handle app state changes for background tracking
const handleAppStateChange = (nextAppState) => {
  console.log('Background: App state changed from', appState, 'to', nextAppState);

  if (appState.match(/inactive|background/) && nextAppState === 'active') {
    // App has come to the foreground
    console.log('Background: App came to foreground');
    if (backgroundTrackingInterval) {
      clearInterval(backgroundTrackingInterval);
      backgroundTrackingInterval = null;
    }
  } else if (appState === 'active' && nextAppState.match(/inactive|background/)) {
    // App has gone to the background
    console.log('Background: App went to background');
    startBackgroundTracking();
  }

  appState = nextAppState;
};

// Start enhanced background tracking
const startBackgroundTracking = () => {
  if (backgroundTrackingInterval) {
    clearInterval(backgroundTrackingInterval);
  }

  // More frequent saves in background mode
  backgroundTrackingInterval = setInterval(async () => {
    try {
      if (historyManager.isCurrentlyTracking) {
        await historyManager.saveProgressBackground();
        console.log('Background: Periodic save completed');
      }
    } catch (error) {
      console.error('Background: Error in background tracking:', error);
    }
  }, 5000); // Save every 5 seconds in background
};

export const PlaybackService = async function () {
  try {
    // Only initialize player if not already initialized
    if (!isPlayerInitialized) {
      await TrackPlayer.setupPlayer({
        android: {
          appKilledPlaybackBehavior: 'ContinuePlayback',
          alwaysPauseOnInterruption: false,
        },
        autoHandleInterruptions: true,
        autoUpdateMetadata: true,
        waitForBuffer: true, // Enable buffering for better streaming
        iosCategory: 'playback', // iOS-specific, but doesn't hurt on Android
      });
      isPlayerInitialized = true;
      console.log('Player initialized successfully in service.js');
    } else {
      console.log('Player already initialized, skipping setup');
    }

    TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
    TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    TrackPlayer.addEventListener(Event.RemoteNext, () => TrackPlayer.skipToNext());
    TrackPlayer.addEventListener(Event.RemotePrevious, () => TrackPlayer.skipToPrevious());
    TrackPlayer.addEventListener(Event.RemoteSeek, (e) => TrackPlayer.seekTo(e.position));

    // History tracking events
    TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
      try {
        console.log('Background: Track changed', event.track?.title);

        // Stop tracking previous song
        await historyManager.stopTracking();

        // Start tracking new song if it exists and player is playing
        if (event.track?.id) {
          const playerState = await TrackPlayer.getPlaybackState();
          if (playerState.state === 'playing') {
            await historyManager.startTracking(event.track);
          }
        }
      } catch (error) {
        console.error('Background: Error handling track change:', error);
      }
    });

    TrackPlayer.addEventListener(Event.PlaybackState, async (event) => {
      try {
        console.log('Background: Playback state changed', event.state);

        const currentTrack = await TrackPlayer.getActiveTrack();

        if (event.state === 'playing') {
          if (currentTrack && !historyManager.isCurrentlyTracking) {
            // Start tracking if playing and not already tracking
            await historyManager.startTracking(currentTrack);
          } else if (historyManager.isCurrentlyTracking) {
            // Resume tracking if already tracking but was paused
            historyManager.resumeTracking();
          }
        } else if (event.state === 'paused') {
          // Pause tracking when music is paused
          historyManager.pauseTracking();
        } else if (event.state === 'stopped') {
          // Stop tracking completely when music is stopped
          await historyManager.stopTracking();
        }
      } catch (error) {
        console.error('Background: Error handling playback state:', error);
      }
    });

    await TrackPlayer.updateOptions({
      android: {
        appKilledPlaybackBehavior: 'ContinuePlayback',
        alwaysPauseOnInterruption: false,
      },
      // Media controls capabilities
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
      // Capabilities that will show up when the notification is in the compact form on Android
      compactCapabilities: [Capability.Play, Capability.Pause, Capability.SkipToNext,
      Capability.SkipToPrevious],
    });

    // Setup app state change listener for background tracking
    AppState.addEventListener('change', handleAppStateChange);

    // Initialize history manager
    await historyManager.initialize();

    // Periodic save for background tracking
    setInterval(async () => {
      try {
        if (historyManager.isCurrentlyTracking) {
          await historyManager.saveProgressBackground();
        }
      } catch (error) {
        console.error('Background: Error in periodic save:', error);
      }
    }, 10000); // Save every 10 seconds in background

  } catch (error) {
    // Check if the error is about the player already being initialized
    if (error.message && error.message.includes('player has already been initialized')) {
      console.log('Player already initialized in service.js');
      isPlayerInitialized = true;
    } else {
      console.error('Error initializing player in service.js:', error);
    }
  }
};

