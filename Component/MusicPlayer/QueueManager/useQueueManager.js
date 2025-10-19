import { useState, useEffect, useRef, useCallback } from 'react';
import TrackPlayer, { useActiveTrack, useTrackPlayerEvents, Event, State } from 'react-native-track-player';
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
  TrackSourceTypes
} from '../../../Utils/QueueUtils';

/**
 * useQueueManager - Custom hook for queue management
 * 
 * This hook provides queue management capabilities including:
 * - Queue state management
 * - Track filtering and reordering
 * - Offline queue handling
 * - Queue operations
 */

export const useQueueManager = (options = {}) => {
  const { 
    autoInitialize = true,
    onQueueChange = null,
    onTrackSelect = null 
  } = options;

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
        setIsOffline(!(networkState.isConnected && networkState.isInternetReachable));
      } catch (error) {
        console.error('Error checking network status:', error);
        setIsOffline(false);
      }
    };
    
    checkNetworkStatus();
    
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!(state.isConnected && state.isInternetReachable));
    });
    
    return () => unsubscribe();
  }, []);

  // Use shared utilities instead of duplicated code
  const sharedIsLocalTrack = useCallback((track) => isLocalTrack(track), []);
  const sharedGetDownloadedTracks = useCallback(() => getDownloadedTracks(), []);
  const sharedFilterQueueBySource = useCallback((currentTrack) => filterQueueBySource(currentTrack, isOffline), [isOffline]);

  // Initialize queue using shared utilities and operation manager
  const initializeQueue = useCallback(async () => {
    if (isDragging || operationInProgressRef.current) return;

    try {
      await queueOperationManager.executeOperation(QueueOperationStates.INITIALIZING, async () => {
        if (currentPlaying) {
          const sourceType = getTrackSourceType(currentPlaying);
          setIsLocalSource([TrackSourceTypes.MYMUSIC, TrackSourceTypes.DOWNLOAD].includes(sourceType));

          const filtered = await sharedFilterQueueBySource(currentPlaying);

          // Remove duplicates and ensure current track is first using shared utilities
          const uniqueFiltered = removeDuplicateTracks(filtered);
          const finalQueue = ensureCurrentTrackFirst(uniqueFiltered, currentPlaying);

          setUpcomingQueue(finalQueue);

          if (onQueueChange) {
            onQueueChange(finalQueue);
          }

          const index = await TrackPlayer.getCurrentTrack();
          setCurrentIndex(index || 0);
        } else {
          setUpcomingQueue([]);
          if (onQueueChange) {
            onQueueChange([]);
          }
        }
      });
    } catch (error) {
      console.error('Error initializing queue:', error);
      if (currentPlaying) {
        setUpcomingQueue([currentPlaying]);
        if (onQueueChange) {
          onQueueChange([currentPlaying]);
        }
      } else {
        setUpcomingQueue([]);
        if (onQueueChange) {
          onQueueChange([]);
        }
      }
    }
  }, [currentPlaying, isDragging, sharedFilterQueueBySource, onQueueChange]);

  // Auto-initialize on mount if enabled
  useEffect(() => {
    if (autoInitialize) {
      initializeQueue();
    }
  }, [autoInitialize, initializeQueue]);

  // Get queue status
  const getQueueStatus = () => ({
    length: upcomingQueue.length,
    currentIndex,
    isLocalSource,
    isDragging,
    isOffline,
    isPendingAction
  });

  // Clear queue
  const clearQueue = async () => {
    try {
      await TrackPlayer.reset();
      setUpcomingQueue([]);
      setCurrentIndex(0);
      if (onQueueChange) {
        onQueueChange([]);
      }
    } catch (error) {
      console.error('Error clearing queue:', error);
    }
  };

  // Add track to queue
  const addToQueue = async (track, position = 'end') => {
    try {
      if (position === 'next') {
        const currentIdx = await TrackPlayer.getCurrentTrack();
        await TrackPlayer.add([track], currentIdx + 1);
      } else {
        await TrackPlayer.add([track]);
      }
      
      // Refresh queue
      await initializeQueue();
    } catch (error) {
      console.error('Error adding track to queue:', error);
    }
  };

  // Remove track from queue
  const removeFromQueue = async (trackIndex) => {
    try {
      await TrackPlayer.remove(trackIndex);
      await initializeQueue();
    } catch (error) {
      console.error('Error removing track from queue:', error);
    }
  };

  return {
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
    getQueueStatus,
    clearQueue,
    addToQueue,
    removeFromQueue,

    // Refs
    operationInProgressRef,

    // Queue operation manager
    queueOperationManager
  };
};
