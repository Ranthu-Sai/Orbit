import React, { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import TrackPlayer, { State } from 'react-native-track-player';
import { StorageManager } from '../../Utils/StorageManager';
import useOffline from '../../hooks/useOffline';

/**
 * LocalMusicPlayer - Handles local music playback functionality
 * Manages queue building, local track loading, and offline playback operations
 */
const LocalMusicPlayer = ({ 
  onLocalTrackPlay,
  onQueueBuilt,
  onPlaybackError,
  autoPlayOnOffline = true
}) => {
  const [localTracks, setLocalTracks] = useState([]);
  const [currentLocalTrack, setCurrentLocalTrack] = useState(null);
  const [isLocalQueueActive, setIsLocalQueueActive] = useState(false);
  
  const { isOffline } = useOffline();

  // Load all local tracks from storage
  const loadLocalTracks = useCallback(async () => {
    try {
      console.log('LocalMusicPlayer: Loading local tracks');
      
      const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();
      
      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        console.log('LocalMusicPlayer: No downloaded songs found');
        setLocalTracks([]);
        return [];
      }

      const tracks = [];
      
      for (const [songId, metadata] of Object.entries(allMetadata)) {
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
              quality: metadata.quality || 'unknown',
              fileSize: metadata.fileSize || 0,
              ...metadata
            };
            
            tracks.push(track);
          }
        } catch (trackError) {
          console.error(`LocalMusicPlayer: Error processing track ${songId}:`, trackError);
        }
      }

      // Sort tracks by download time (newest first)
      tracks.sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));
      
      setLocalTracks(tracks);
      console.log(`LocalMusicPlayer: Loaded ${tracks.length} local tracks`);
      
      return tracks;
    } catch (error) {
      console.error('LocalMusicPlayer: Error loading local tracks:', error);
      setLocalTracks([]);
      return [];
    }
  }, []);

  // Build queue with local tracks
  const buildLocalQueue = useCallback(async (startTrack = null, shuffled = false) => {
    try {
      console.log('LocalMusicPlayer: Building local queue');
      
      const tracks = await loadLocalTracks();
      
      if (!tracks || tracks.length === 0) {
        console.log('LocalMusicPlayer: No local tracks available for queue');
        return [];
      }

      let queue = [...tracks];
      
      // Shuffle if requested
      if (shuffled) {
        for (let i = queue.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [queue[i], queue[j]] = [queue[j], queue[i]];
        }
      }
      
      // If a start track is specified, move it to the front
      if (startTrack) {
        const startIndex = queue.findIndex(track => track.id === startTrack.id);
        if (startIndex > 0) {
          const track = queue.splice(startIndex, 1)[0];
          queue.unshift(track);
        }
      }
      
      console.log(`LocalMusicPlayer: Built queue with ${queue.length} tracks`);
      
      if (onQueueBuilt) {
        onQueueBuilt(queue);
      }
      
      return queue;
    } catch (error) {
      console.error('LocalMusicPlayer: Error building local queue:', error);
      return [];
    }
  }, [loadLocalTracks, onQueueBuilt]);

  // Play a specific local track
  const playLocalTrack = useCallback(async (track, startFromQueue = false) => {
    try {
      console.log(`LocalMusicPlayer: Playing local track: ${track.title}`);
      
      if (!track.url || !track.url.startsWith('file://')) {
        throw new Error('Invalid local track URL');
      }
      
      // Check if the file exists
      const songExists = await StorageManager.isSongDownloaded(track.id);
      if (!songExists) {
        throw new Error('Local track file not found');
      }
      
      setCurrentLocalTrack(track);
      
      if (!startFromQueue) {
        // Build queue starting with this track
        const queue = await buildLocalQueue(track);
        
        if (queue.length > 0) {
          await TrackPlayer.reset();
          await TrackPlayer.add(queue);
          setIsLocalQueueActive(true);
        }
      }
      
      // Start playback
      await TrackPlayer.play();
      
      if (onLocalTrackPlay) {
        onLocalTrackPlay(track);
      }
      
      console.log('LocalMusicPlayer: Local track playback started');
      
    } catch (error) {
      console.error('LocalMusicPlayer: Error playing local track:', error);
      
      if (onPlaybackError) {
        onPlaybackError(error, track);
      }
    }
  }, [buildLocalQueue, onLocalTrackPlay, onPlaybackError]);

  // Initialize local queue for offline mode
  const initializeOfflineQueue = useCallback(async () => {
    try {
      if (!isOffline || !autoPlayOnOffline) {
        return;
      }
      
      console.log('LocalMusicPlayer: Initializing offline queue');
      
      const tracks = await loadLocalTracks();
      
      if (tracks && tracks.length > 0) {
        const state = await TrackPlayer.getState();
        const currentTrack = await TrackPlayer.getActiveTrack();
        
        // Only initialize if nothing is playing or queue is empty
        if (!currentTrack || state === State.None || state === State.Ready) {
          console.log(`LocalMusicPlayer: Adding ${tracks.length} tracks to offline queue`);
          
          await TrackPlayer.reset();
          await TrackPlayer.add(tracks);
          setIsLocalQueueActive(true);
          
          console.log('LocalMusicPlayer: Offline queue initialized');
        }
      }
    } catch (error) {
      console.error('LocalMusicPlayer: Error initializing offline queue:', error);
    }
  }, [isOffline, autoPlayOnOffline, loadLocalTracks]);

  // Handle queue management for offline transitions
  const handleOfflineTransition = useCallback(async () => {
    try {
      console.log('LocalMusicPlayer: Handling offline transition');
      
      const tracks = await loadLocalTracks();
      
      if (tracks && tracks.length > 0) {
        const currentTrack = await TrackPlayer.getActiveTrack();
        
        if (currentTrack && currentTrack.isLocal) {
          // Preserve current local playback
          const state = await TrackPlayer.getState();
          const position = await TrackPlayer.getPosition();
          const wasPlaying = state === State.Playing;
          
          // Rebuild queue with current track first
          const queue = await buildLocalQueue(currentTrack);
          
          if (queue.length > 0) {
            await TrackPlayer.reset();
            await TrackPlayer.add(queue);
            
            // Restore playback state
            if (position > 0) await TrackPlayer.seekTo(position);
            if (wasPlaying) await TrackPlayer.play();
            
            setIsLocalQueueActive(true);
            console.log('LocalMusicPlayer: Rebuilt queue for offline mode');
          }
        } else {
          // No local track playing, initialize offline queue
          await initializeOfflineQueue();
        }
      }
    } catch (error) {
      console.error('LocalMusicPlayer: Error handling offline transition:', error);
    }
  }, [loadLocalTracks, buildLocalQueue, initializeOfflineQueue]);

  // Get next/previous local track
  const getNextLocalTrack = useCallback(() => {
    if (!localTracks.length || !currentLocalTrack) return null;
    
    const currentIndex = localTracks.findIndex(track => track.id === currentLocalTrack.id);
    const nextIndex = (currentIndex + 1) % localTracks.length;
    
    return localTracks[nextIndex];
  }, [localTracks, currentLocalTrack]);

  const getPreviousLocalTrack = useCallback(() => {
    if (!localTracks.length || !currentLocalTrack) return null;
    
    const currentIndex = localTracks.findIndex(track => track.id === currentLocalTrack.id);
    const prevIndex = currentIndex === 0 ? localTracks.length - 1 : currentIndex - 1;
    
    return localTracks[prevIndex];
  }, [localTracks, currentLocalTrack]);

  // Listen for network changes
  useEffect(() => {
    const networkListener = DeviceEventEmitter.addListener(
      'networkStateChanged',
      (networkData) => {
        if (networkData.transitionType === 'online-to-offline') {
          handleOfflineTransition();
        }
      }
    );

    return () => {
      networkListener.remove();
    };
  }, [handleOfflineTransition]);

  // Initialize when component mounts
  useEffect(() => {
    let mounted = true;

    const initializeOnce = async () => {
      if (mounted) {
        await loadLocalTracks();

        if (isOffline) {
          await initializeOfflineQueue();
        }
      }
    };

    initializeOnce();

    return () => {
      mounted = false;
    };
  }, []); // Remove dependencies to prevent re-initialization

  return {
    localTracks,
    currentLocalTrack,
    isLocalQueueActive,
    loadLocalTracks,
    buildLocalQueue,
    playLocalTrack,
    getNextLocalTrack,
    getPreviousLocalTrack,
    initializeOfflineQueue
  };
};

export default LocalMusicPlayer;
