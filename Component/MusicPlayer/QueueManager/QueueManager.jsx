import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useCallback,
} from 'react';
import TrackPlayer, {
  useActiveTrack,
  useTrackPlayerEvents,
  Event,
  State,
} from 'react-native-track-player';
import { ToastAndroid, Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import {
  isLocalTrack,
  getTrackSourceType,
  getDownloadedTracks,
  filterQueueBySource,
  removeDuplicateTracks,
  ensureCurrentTrackFirst,
  queueOperationManager,
  QueueOperationStates,
  TrackSourceTypes,
} from '../../../Utils/QueueUtils';

/**
 * QueueManager - Manages music queue operations and state
 *
 * This component provides queue management capabilities including:
 * - Queue filtering by source type
 * - Track reordering and manipulation
 * - Queue state management
 * - Offline queue handling
 */

const QueueManagerContext = createContext();

export const QueueManager = ({ children }) => {
  const [upcomingQueue, setUpcomingQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isLocalSource, setIsLocalSource] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isOffline, setIsOffline] = useState(false);
  const [isPendingAction, setIsPendingAction] = useState(false);

  const operationInProgressRef = useRef(false);
  const currentPlaying = useActiveTrack();

  // Network monitoring
  useEffect(() => {
    const checkNetworkStatus = async () => {
      try {
        const networkState = await NetInfo.fetch();
        setIsOffline(
          !(networkState.isConnected && networkState.isInternetReachable)
        );
      } catch (error) {
        console.error('Error checking network status:', error);
        setIsOffline(false);
      }
    };

    checkNetworkStatus();

    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });

    return () => unsubscribe();
  }, []);

  // Use shared utilities instead of duplicated code
  const sharedIsLocalTrack = useCallback((track) => isLocalTrack(track), []);
  const sharedGetDownloadedTracks = useCallback(
    () => getDownloadedTracks(),
    []
  );
  const sharedFilterQueueBySource = useCallback(
    (currentTrack) => filterQueueBySource(currentTrack, isOffline),
    [isOffline]
  );

  // Initialize queue using shared utilities and operation manager
  const initializeQueue = useCallback(async () => {
    if (isDragging || operationInProgressRef.current) {
      return;
    }

    try {
      await queueOperationManager.executeOperation(
        QueueOperationStates.INITIALIZING,
        async () => {
          if (currentPlaying) {
            const sourceType = getTrackSourceType(currentPlaying);
            setIsLocalSource(
              [TrackSourceTypes.MYMUSIC, TrackSourceTypes.DOWNLOAD].includes(
                sourceType
              )
            );

            const filtered = await sharedFilterQueueBySource(currentPlaying);

            // Remove duplicates and ensure current track is first using shared utilities
            const uniqueFiltered = removeDuplicateTracks(filtered);
            const finalQueue = ensureCurrentTrackFirst(
              uniqueFiltered,
              currentPlaying
            );

            setUpcomingQueue(finalQueue);

            const index = await TrackPlayer.getCurrentTrack();
            setCurrentIndex(index || 0);
          } else {
            setUpcomingQueue([]);
          }
        }
      );
    } catch (error) {
      console.error('Error initializing queue:', error);
      if (currentPlaying) {
        setUpcomingQueue([currentPlaying]);
      } else {
        setUpcomingQueue([]);
      }
    }
  }, [currentPlaying, isDragging, sharedFilterQueueBySource]);

  // Track change listener using shared utilities - PERFORMANCE OPTIMIZED
  useTrackPlayerEvents([Event.PlaybackTrackChanged], (event) => {
    // PERFORMANCE: Defer to next frame to prevent blocking UI during track change
    requestAnimationFrame(async () => {
      if (
        event.type === Event.PlaybackTrackChanged &&
        !isDragging &&
        !operationInProgressRef.current
      ) {
        try {
          const track = await TrackPlayer.getActiveTrack();
          const index = await TrackPlayer.getCurrentTrack();

          if (track) {
            setCurrentIndex(index || 0);

            const sourceType = getTrackSourceType(track);
            setIsLocalSource(
              [TrackSourceTypes.MYMUSIC, TrackSourceTypes.DOWNLOAD].includes(
                sourceType
              )
            );

            const filtered = await sharedFilterQueueBySource(track);

            // Remove duplicates and ensure current track is first using shared utilities
            const uniqueFiltered = removeDuplicateTracks(filtered);
            const finalQueue = ensureCurrentTrackFirst(uniqueFiltered, track);

            setUpcomingQueue(finalQueue);
          } else {
            setUpcomingQueue([]);
          }
        } catch (error) {
          console.error('Error handling track change event:', error);
          setUpcomingQueue([]);
        }
      }
    });
  });

  // Initialize on mount
  useEffect(() => {
    initializeQueue();
  }, [initializeQueue]);

  const contextValue = {
    // State
    upcomingQueue,
    currentIndex,
    isLocalSource,
    isDragging,
    isOffline,
    isPendingAction,

    // Functions
    setUpcomingQueue,
    setIsDragging,
    setIsPendingAction,
    initializeQueue,
    sharedFilterQueueBySource,
    sharedIsLocalTrack,
    sharedGetDownloadedTracks,

    // Refs
    operationInProgressRef,

    // Queue operation manager
    queueOperationManager,
  };

  return (
    <QueueManagerContext.Provider value={contextValue}>
      {children}
    </QueueManagerContext.Provider>
  );
};

// Hook to use queue manager
export const useQueueManager = () => {
  const context = useContext(QueueManagerContext);
  if (!context) {
    throw new Error('useQueueManager must be used within a QueueManager');
  }
  return context;
};
