import { useState, useEffect, useCallback, useRef } from 'react';
import TrackPlayer from 'react-native-track-player';
import { ToastAndroid } from 'react-native';
import { StorageManager } from '../../../Utils/StorageManager';
import { LocalTracksMetadataProcessor } from './LocalTracksMetadataProcessor';

/**
 * useLocalTracks - Custom hook for managing local tracks functionality
 *
 * This hook provides local tracks management capabilities including:
 * - Loading local tracks from storage
 * - Playing local tracks
 * - Managing local tracks state
 * - Error handling for file operations
 */

export const useLocalTracks = (options = {}) => {
  const {
    isOffline = false,
    autoLoad = true,
    onTrackPlay = null,
    onError = null,
  } = options;

  const [localTracks, setLocalTracks] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showLocalTracks, setShowLocalTracks] = useState(false);
  const hasLoadedRef = useRef(false);

  // Clear error state
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load local tracks from storage
  const loadLocalTracks = useCallback(
    async (forceReload = false) => {
      if (isLoading || (!forceReload && hasLoadedRef.current)) {
        return;
      }

      setIsLoading(true);
      setError(null);

      try {
        const allMetadata =
          await StorageManager.getAllDownloadedSongsMetadata();

        if (!allMetadata || Object.keys(allMetadata).length === 0) {
          setLocalTracks([]);
          hasLoadedRef.current = true;
          setIsLoading(false);
          return;
        }

        // Use the metadata processor utility
        const processedTracks =
          await LocalTracksMetadataProcessor.processMetadataToTracks(
            allMetadata
          );

        setLocalTracks(processedTracks);
        hasLoadedRef.current = true;
      } catch (error) {
        console.error('useLocalTracks: Error loading local tracks:', error);
        setError(error);
        setLocalTracks([]);
        hasLoadedRef.current = true;

        if (onError) {
          onError(error, 'load');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [onError]
  );

  // Play a local track
  const playLocalTrack = useCallback(
    async (track) => {
      if (!track) {
        const error = new Error('No track provided');
        setError(error);
        if (onError) {
          onError(error, 'play');
        }
        return;
      }

      try {
        // Validate track has required properties
        if (!track.url) {
          throw new Error('Track URL is missing');
        }

        // Check if file exists before playing
        const fileExists = await StorageManager.isSongDownloaded(track.id);
        if (!fileExists) {
          throw new Error('Track file not found on device');
        }

        // Reset and add track to player
        await TrackPlayer.reset();
        await TrackPlayer.add([track]);
        await TrackPlayer.play();

        // Close local tracks list
        setShowLocalTracks(false);

        if (onTrackPlay) {
          onTrackPlay(track);
        }
      } catch (error) {
        console.error('useLocalTracks: Error playing local track:', error);
        setError(error);

        // Show user-friendly error message
        const errorMessage = error.message.includes('not found')
          ? 'Track file not found. It may have been deleted.'
          : 'Error playing track';

        ToastAndroid.show(errorMessage, ToastAndroid.SHORT);

        if (onError) {
          onError(error, 'play');
        }
      }
    },
    [onTrackPlay, onError]
  );

  // Toggle local tracks visibility
  const toggleLocalTracks = useCallback(() => {
    setShowLocalTracks((prev) => !prev);
  }, []);

  // Close local tracks list
  const closeLocalTracks = useCallback(() => {
    setShowLocalTracks(false);
  }, []);

  // Open local tracks list
  const openLocalTracks = useCallback(() => {
    setShowLocalTracks(true);
  }, []);

  // Refresh local tracks
  const refreshLocalTracks = useCallback(async () => {
    hasLoadedRef.current = false;
    await loadLocalTracks(true);
  }, [loadLocalTracks]);

  // Get track by ID
  const getTrackById = useCallback(
    (trackId) => {
      return localTracks.find((track) => track.id === trackId);
    },
    [localTracks]
  );

  // Check if track is available locally
  const isTrackAvailableLocally = useCallback(
    (trackId) => {
      return localTracks.some((track) => track.id === trackId);
    },
    [localTracks]
  );

  // Get local tracks count
  const getLocalTracksCount = useCallback(() => {
    return localTracks.length;
  }, [localTracks]);

  // Auto-load local tracks on mount and when offline status changes
  useEffect(() => {
    if (autoLoad && !hasLoadedRef.current) {
      loadLocalTracks();
    }
  }, [autoLoad, isOffline, loadLocalTracks]);

  return {
    // State
    localTracks,
    isLoading,
    error,
    showLocalTracks,

    // Actions
    loadLocalTracks,
    playLocalTrack,
    toggleLocalTracks,
    closeLocalTracks,
    openLocalTracks,
    refreshLocalTracks,
    clearError,

    // Utilities
    getTrackById,
    isTrackAvailableLocally,
    getLocalTracksCount,

    // Status
    hasLocalTracks: localTracks.length > 0,
    isEmpty: localTracks.length === 0 && !isLoading,
    hasError: !!error,
  };
};
