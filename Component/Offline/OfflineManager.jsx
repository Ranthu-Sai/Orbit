import React, { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { State } from 'react-native-track-player';
import { StorageManager } from '../../Utils/StorageManager';
import OfflineDetector from './OfflineDetector';
import useOffline from '../../hooks/useOffline';

/**
 * OfflineManager - Manages offline mode operations and cached data
 * Handles automatic offline detection, mode switching, and cached data management
 */
const OfflineManager = ({ 
  onOfflineTransition, 
  onOnlineTransition,
  onLocalTracksLoaded,
  onCachedDataLoaded,
  children 
}) => {
  const [cachedTracks, setCachedTracks] = useState([]);
  const [localTracks, setLocalTracks] = useState([]);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const { isOffline, isConnected } = useOffline();

  // Load cached tracks from AsyncStorage
  const loadCachedData = useCallback(async () => {
    try {
      console.log('OfflineManager: Loading cached data');
      const cachedData = await AsyncStorage.getItem('cachedTracks');
      
      if (cachedData) {
        const parsedTracks = JSON.parse(cachedData);
        setCachedTracks(parsedTracks);
        
        if (onCachedDataLoaded) {
          onCachedDataLoaded(parsedTracks);
        }
        
        console.log(`OfflineManager: Loaded ${parsedTracks.length} cached tracks`);
      } else {
        console.log('OfflineManager: No cached data found');
        setCachedTracks([]);
      }
    } catch (error) {
      console.error('OfflineManager: Error loading cached tracks:', error);
      setCachedTracks([]);
    }
  }, [onCachedDataLoaded]);

  // Load local tracks with better error handling for artwork
  const loadLocalTracks = useCallback(async () => {
    try {
      console.log('OfflineManager: Loading local tracks');
      
      // Get all downloaded songs metadata
      const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();
      
      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        console.log('OfflineManager: No downloaded songs metadata found');
        setLocalTracks([]);
        return [];
      }

      const tracks = [];
      
      for (const [songId, metadata] of Object.entries(allMetadata)) {
        try {
          // Get the local file path
          const songPath = await StorageManager.getSongPath(songId);
          const artworkPath = await StorageManager.getArtworkPath(songId);
          
          // Check if the song file exists
          const songExists = await StorageManager.isSongDownloaded(songId);
          
          if (songExists && songPath) {
            const track = {
              id: songId,
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              duration: metadata.duration || 0,
              url: `file://${songPath}`,
              artwork: artworkPath ? `file://${artworkPath}` : null,
              isLocal: true,
              sourceType: 'download',
              downloadTime: metadata.downloadTime,
              ...metadata // Include any additional metadata
            };
            
            tracks.push(track);
          } else {
            console.warn(`OfflineManager: Song file not found for ${songId}, skipping`);
          }
        } catch (trackError) {
          console.error(`OfflineManager: Error processing track ${songId}:`, trackError);
        }
      }

      // Sort tracks by download time (newest first)
      tracks.sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));
      
      setLocalTracks(tracks);
      
      if (onLocalTracksLoaded) {
        onLocalTracksLoaded(tracks);
      }
      
      console.log(`OfflineManager: Loaded ${tracks.length} local tracks`);
      return tracks;
    } catch (error) {
      console.error('OfflineManager: Error loading local tracks:', error);
      setLocalTracks([]);
      return [];
    }
  }, [onLocalTracksLoaded]);

  // Build offline queue for TrackPlayer
  const buildOfflineQueue = useCallback(async (currentTrack) => {
    try {
      console.log('OfflineManager: Building offline queue');
      
      // Get all downloaded songs metadata
      const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();
      
      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        console.log('OfflineManager: No downloaded songs found for offline queue');
        return currentTrack ? [currentTrack] : [];
      }

      const queue = [];
      
      // Add current track first if it exists and is local
      if (currentTrack && currentTrack.isLocal) {
        queue.push(currentTrack);
      }
      
      // Add other downloaded tracks
      for (const [songId, metadata] of Object.entries(allMetadata)) {
        // Skip if this is the current track (already added)
        if (currentTrack && currentTrack.id === songId) {
          continue;
        }
        
        try {
          const songPath = await StorageManager.getSongPath(songId);
          const artworkPath = await StorageManager.getArtworkPath(songId);
          const songExists = await StorageManager.isSongDownloaded(songId);
          
          if (songExists && songPath) {
            const track = {
              id: songId,
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              duration: metadata.duration || 0,
              url: `file://${songPath}`,
              artwork: artworkPath ? `file://${artworkPath}` : null,
              isLocal: true,
              sourceType: 'download',
              downloadTime: metadata.downloadTime,
              ...metadata
            };
            
            queue.push(track);
          }
        } catch (trackError) {
          console.error(`OfflineManager: Error processing track ${songId} for queue:`, trackError);
        }
      }

      console.log(`OfflineManager: Built offline queue with ${queue.length} tracks`);
      return queue;
    } catch (error) {
      console.error('OfflineManager: Error building offline queue:', error);
      return currentTrack ? [currentTrack] : [];
    }
  }, []);

  // Initialize offline queue when going offline
  const initializeOfflineQueue = useCallback(async () => {
    try {
      const localTracksLoaded = await loadLocalTracks();
      
      if (localTracksLoaded && localTracksLoaded.length > 0) {
        const state = await TrackPlayer.getState();
        const currentTrack = await TrackPlayer.getActiveTrack();
        
        if (!currentTrack || state === State.None || state === State.Ready) {
          console.log(`OfflineManager: Adding ${localTracksLoaded.length} downloaded tracks to queue in offline mode`);
          
          try {
            await TrackPlayer.reset();
            await TrackPlayer.add(localTracksLoaded);
            console.log('OfflineManager: Offline queue initialized with downloaded tracks');
          } catch (queueError) {
            console.error('OfflineManager: Error setting up offline queue:', queueError);
          }
        }
      }
    } catch (error) {
      console.error('OfflineManager: Error loading local tracks into queue:', error);
    }
  }, [loadLocalTracks]);

  // Handle transition to offline mode
  const handleOfflineTransition = useCallback(async (networkData) => {
    console.log('OfflineManager: Handling transition to offline mode');
    
    try {
      // Load cached data
      await loadCachedData();
      
      // Load local tracks and auto-build queue
      const tracks = await loadLocalTracks();
      
      if (tracks && tracks.length > 0) {
        try {
          // Check if something is already playing locally
          const currentTrack = await TrackPlayer.getActiveTrack();
          
          if (currentTrack && currentTrack.isLocal) {
            // Something local is already playing, preserve state
            const state = await TrackPlayer.getState();
            const position = await TrackPlayer.getPosition();
            const wasPlaying = state === State.Playing;
            
            // Find current track in downloaded tracks
            const currentIndex = tracks.findIndex(t => t.id === currentTrack.id);
            if (currentIndex !== -1) {
              // Rebuild queue with current track first
              const orderedTracks = [
                tracks[currentIndex],
                ...tracks.filter((_, i) => i !== currentIndex)
              ];
              
              await TrackPlayer.reset();
              await TrackPlayer.add(orderedTracks);
              
              // Restore position and playback
              if (position > 0) await TrackPlayer.seekTo(position);
              if (wasPlaying) await TrackPlayer.play();
              
              console.log('OfflineManager: Rebuilt queue with current track first in offline mode');
            }
          } else {
            // No local track playing, just add all tracks
            await TrackPlayer.reset();
            await TrackPlayer.add(tracks);
            console.log('OfflineManager: Added all local tracks to queue in offline mode');
          }
        } catch (error) {
          console.error('OfflineManager: Error setting up queue for offline mode:', error);
        }
      }
      
      if (onOfflineTransition) {
        onOfflineTransition(networkData, { cachedTracks, localTracks: tracks });
      }
    } catch (error) {
      console.error('OfflineManager: Error handling offline transition:', error);
    }
  }, [loadCachedData, loadLocalTracks, onOfflineTransition, cachedTracks]);

  // Handle transition to online mode
  const handleOnlineTransition = useCallback(async (networkData) => {
    console.log('OfflineManager: Handling transition to online mode');
    
    if (onOnlineTransition) {
      onOnlineTransition(networkData, { cachedTracks, localTracks });
    }
  }, [onOnlineTransition, cachedTracks, localTracks]);

  // Initialize the manager
  useEffect(() => {
    let mounted = true;

    const initialize = async () => {
      if (!mounted) return;

      try {
        // Load initial data
        await loadCachedData();
        await loadLocalTracks();

        // If already offline, initialize offline queue
        if (isOffline) {
          await initializeOfflineQueue();
        }

        if (mounted) {
          setIsInitialized(true);
          console.log('OfflineManager: Initialized successfully');
        }
      } catch (error) {
        console.error('OfflineManager: Error during initialization:', error);
        if (mounted) {
          setIsInitialized(true); // Set to true anyway to prevent blocking
        }
      }
    };

    // Only initialize once
    if (!isInitialized) {
      initialize();
    }

    return () => {
      mounted = false;
    };
  }, []); // Remove dependencies to prevent re-initialization

  return (
    <>
      <OfflineDetector
        onOfflineTransition={handleOfflineTransition}
        onOnlineTransition={handleOnlineTransition}
        suppressNetworkErrors={isOffline}
      />
      {children}
    </>
  );
};

export default OfflineManager;
