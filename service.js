// service.js
import TrackPlayer, { Capability, Event } from 'react-native-track-player';
import historyManager from './Utils/HistoryManager';
import autoRecommendations from './Utils/AutoRecommendations';
import DownloadQueueService from './Utils/DownloadQueueService';
import listeningHistoryService from './Utils/ListeningHistoryService';
import smartPrefetchManager from './Utils/SmartPrefetchManager';

let isPlayerInitialized = false;

// PlaybackService is registered via TrackPlayer.registerPlaybackService and
// re-runs on every remote event / service restart. Event listeners must be
// registered exactly once or each notification-panel press fires N stacked
// handlers (double-skips, double history entries).
let remoteListenersRegistered = false;

export const PlaybackService = async function () {
  // Usually the UI has already called setupPlayer (that is what starts this
  // service), so this throws "already initialized". It must be isolated:
  // if it shared the try below, that error would skip every listener and
  // initializer and leave notification / lock-screen controls dead.
  if (!isPlayerInitialized) {
    try {
      await TrackPlayer.setupPlayer({
        android: {
          appKilledPlaybackBehavior: 'ContinuePlayback',
          alwaysPauseOnInterruption: false,
        },
        autoUpdateMetadata: true,
        waitForBuffer: true,
      });
    } catch (setupError) {
      if (!setupError?.message?.includes('already been initialized')) {
        console.error('Error setting up player in service.js:', setupError);
      }
    }
    isPlayerInitialized = true;
  }

  try {
    // CRITICAL: remote events stay on native TrackPlayer methods. The UI-side
    // PlayNextSong/PlayPreviousSong depend on the React tree being active and
    // are unreliable from the notification panel.
    if (!remoteListenersRegistered) {
      remoteListenersRegistered = true;
      TrackPlayer.addEventListener(Event.RemotePlay, () => TrackPlayer.play());
      TrackPlayer.addEventListener(Event.RemotePause, () => TrackPlayer.pause());
    // Resolve the destination's stream before skipping, so the notification
    // controls don't land on a `ytmusic://` placeholder and trigger the
    // error-recovery cycle. Falls back to a plain native skip on any failure,
    // which keeps background behaviour as reliable as before.
    const resolveNeighbourThenSkip = async (offset) => {
      try {
        const activeIndex = await TrackPlayer.getActiveTrackIndex();
        if (activeIndex !== undefined && activeIndex !== null) {
          const targetIndex = activeIndex + offset;
          if (targetIndex >= 0) {
            const target = await TrackPlayer.getTrack(targetIndex);
            if (target && smartPrefetchManager.needsStream(target)) {
              const streamData =
                smartPrefetchManager.getPrefetchedStream(target.id) ||
                (await smartPrefetchManager.fetchOnDemand(
                  target.id,
                  null,
                  target
                ));
              if (streamData && streamData.url) {
                await smartPrefetchManager.replaceTrackAndWait(
                  targetIndex,
                  target,
                  streamData
                );
              }
            }
          }
        }
      } catch (e) {
        // Fall through to the plain skip below
      }

      try {
        if (offset > 0) {
          await TrackPlayer.skipToNext();
        } else {
          await TrackPlayer.skipToPrevious();
        }
        await TrackPlayer.play();
      } catch (e) {
        // Silently fail at the ends of the queue
      }
    };

      TrackPlayer.addEventListener(Event.RemoteNext, () =>
        resolveNeighbourThenSkip(1)
      );
      TrackPlayer.addEventListener(Event.RemotePrevious, () =>
        resolveNeighbourThenSkip(-1)
      );
      TrackPlayer.addEventListener(Event.RemoteSeek, (e) =>
        TrackPlayer.seekTo(e.position)
      );
    }

    // History tracking is handled by ContextState.jsx to avoid duplicate calls
    // and ensure non-blocking UI updates. Removed from here to prevent blocking.

    // Auto-recommendations listeners (idempotent - they have their own guards)
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
      compactCapabilities: [
        Capability.Play,
        Capability.Pause,
        Capability.SkipToNext,
        Capability.SkipToPrevious,
      ],
    });

    // Initialize history manager (now lightweight)
    await historyManager.initialize();

    // Initialize listening history service for personalized Quick Picks
    await listeningHistoryService.initialize();
  } catch (error) {
    console.error('Error initializing playback service:', error);
  }
};
