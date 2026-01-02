import React from 'react';
import TrackPlayer, { State } from 'react-native-track-player';
import { ToastAndroid, Platform } from 'react-native';
import { SkipToTrack } from '../../../MusicPlayerFunctions';

/**
 * QueueOperations - Handles queue operations like track selection, reordering, etc.
 * 
 * This component provides queue operation capabilities including:
 * - Track selection and playback
 * - Queue reordering via drag and drop
 * - Playback state management
 * - Error handling for queue operations
 */

export class QueueOperations {
  constructor(queueManager) {
    this.queueManager = queueManager;
  }

  // Handle track selection from queue
  async handleTrackSelect(item, displayIndex) {
    const { 
      operationInProgressRef, 
      setIsPendingAction, 
      isLocalTrack, 
      isOffline 
    } = this.queueManager;

    operationInProgressRef.current = true;
    
    try {
      let wasPlaying = false;
      let position = 0;
      let currentTrack = null;
      
      try {
        setIsPendingAction(true);
        currentTrack = await TrackPlayer.getActiveTrack();
        
        if (currentTrack?.id === item.id) {
          const state = await TrackPlayer.getState();
          
          if (state === State.Playing) {
            await TrackPlayer.pause();
          } else {
            await TrackPlayer.play();
          }
          setIsPendingAction(false);
          operationInProgressRef.current = false;
          return;
        }
      } catch (stateError) {
        console.error('Error getting playback state:', stateError);
      }
      
      // Get the full TrackPlayer queue to find the actual index
      const queue = await TrackPlayer.getQueue();
      const actualIndex = queue.findIndex(track => track.id === item.id);
      
      if (actualIndex === -1) {
        console.warn(`Track with ID ${item.id} not found in player queue`);
        
        if (item.url) {
          let sourceType = item.sourceType;
          
          if (!sourceType) {
            if (item.isFromMyMusic) {
              sourceType = 'mymusic';
            } else if (isLocalTrack(item)) {
              sourceType = 'download';
            } else if (currentTrack?.sourceType) {
              sourceType = currentTrack.sourceType;
            } else if (isOffline && isLocalTrack(item)) {
              sourceType = 'download';
            } else {
              sourceType = 'online';
            }
          }
        
          const trackToAdd = {
            ...item,
            sourceType: sourceType
          };
          
          try {
            const shouldKeepQueue = isOffline || 
                                   (currentTrack && currentTrack.sourceType === sourceType);
            
            if (queue.length > 0 && shouldKeepQueue) {
              await TrackPlayer.add([trackToAdd], 0);
              await TrackPlayer.skip(0);
            } else {
              await TrackPlayer.reset();
              await TrackPlayer.add([trackToAdd]);
            }
            await TrackPlayer.play();
            setIsPendingAction(false);
            operationInProgressRef.current = false;
            return;
          } catch (err) {
            console.error('Error adding track to queue:', err);
            if (Platform.OS === 'android') {
              ToastAndroid.show('Could not play this track', ToastAndroid.SHORT);
            }
            setIsPendingAction(false);
            operationInProgressRef.current = false;
            return;
          }
        }
        
        // Final fallback
        try {
          let sourceType = item.sourceType;
          
          if (!sourceType) {
            if (item.isFromMyMusic) {
              sourceType = 'mymusic';
            } else if (isLocalTrack(item)) {
              sourceType = 'download';
            } else if (currentTrack?.sourceType) {
              sourceType = currentTrack.sourceType;
            } else if (isOffline && isLocalTrack(item)) {
              sourceType = 'download';
            } else {
              sourceType = 'online';
            }
          }
        
          const trackToAdd = {
            ...item,
            sourceType: sourceType
          };
        
          await TrackPlayer.reset();
          await TrackPlayer.add([trackToAdd]);
          await TrackPlayer.play();
          setIsPendingAction(false);
          operationInProgressRef.current = false;
          return;
        } catch (finalError) {
          console.error('Final attempt to play track failed:', finalError);
          if (Platform.OS === 'android') {
            ToastAndroid.show('Cannot play this track', ToastAndroid.SHORT);
          }
          setIsPendingAction(false);
          operationInProgressRef.current = false;
          return;
        }
      }
      await SkipToTrack(actualIndex);
      
      setIsPendingAction(false);
      operationInProgressRef.current = false;
    } catch (error) {
      console.error('Error selecting track:', error);
      setIsPendingAction(false);
      operationInProgressRef.current = false;
    }
  }

  // Handle drag start
  handleDragStart(params) {
    const { setIsDragging } = this.queueManager;
    
    try {
      setIsDragging(true);
    } catch (error) {
      console.error('Error in drag start:', error);
    }
  }

  // Handle drag end with queue reordering - uses TrackPlayer.move() for seamless playback
  async handleDragEnd(params) {
    const { 
      setIsDragging, 
      operationInProgressRef, 
      setUpcomingQueue,
      filterQueueBySource,
      isLocalTrack
    } = this.queueManager;

    try {
      const { from, to, data } = params;
      
      if (from === to) {
        setIsDragging(false);
        return;
      }
      
      operationInProgressRef.current = true;
      
      // Filter out duplicates and update UI immediately
      const uniqueIds = new Set();
      const uniqueData = data.filter(track => {
        if (!track.id || uniqueIds.has(track.id)) return false;
        uniqueIds.add(track.id);
        return true;
      });
      setUpcomingQueue(uniqueData);
      
      const movedTrack = uniqueData[to];
      if (!movedTrack?.id) {
        console.error('Could not identify the moved track');
        setIsDragging(false);
        operationInProgressRef.current = false;
        return;
      }
      
      // Get full queue
      const fullQueue = await TrackPlayer.getQueue();
      if (!fullQueue?.length) {
        console.error('TrackPlayer queue is empty');
        setIsDragging(false);
        operationInProgressRef.current = false;
        return;
      }
      
      // Find actual indices in TrackPlayer queue
      const trackAtFromPosition = data[from];
      const actualFromIndex = fullQueue.findIndex(t => t.id === trackAtFromPosition?.id);
      
      // Calculate target index
      let actualToIndex;
      if (to === 0) {
        const currentTrack = await TrackPlayer.getActiveTrack();
        const currentSourceType = currentTrack?.sourceType || (isLocalTrack(currentTrack) ? 'download' : 'online');
        actualToIndex = fullQueue.findIndex(t => {
          const tSourceType = t.sourceType || (isLocalTrack(t) ? 'download' : 'online');
          return tSourceType === currentSourceType;
        });
      } else {
        const trackBeforeTarget = uniqueData[to - 1];
        const beforeIndex = fullQueue.findIndex(t => t.id === trackBeforeTarget?.id);
        actualToIndex = beforeIndex !== -1 ? beforeIndex + 1 : actualFromIndex;
      }
      
      // Adjust if moving down
      if (actualFromIndex < actualToIndex) {
        actualToIndex--;
      }
      // Use TrackPlayer.move() - no playback interruption!
      if (actualFromIndex !== -1 && actualToIndex !== -1 && actualFromIndex !== actualToIndex) {
        await TrackPlayer.move(actualFromIndex, actualToIndex);
      }
      
      // Refresh queue view
      const refreshedTrack = await TrackPlayer.getActiveTrack();
      const refreshedQueue = await filterQueueBySource(refreshedTrack);
      setUpcomingQueue(refreshedQueue);
      
    } catch (error) {
      console.error('Error in drag end handler:', error);
    } finally {
      setIsDragging(false);
      operationInProgressRef.current = false;
    }
  }

  // Get high quality artwork URL
  getHighQualityArtwork(artworkUrl) {
    if (!artworkUrl) return null;
    
    try {
      if (artworkUrl.startsWith('file://')) {
        return artworkUrl;
      }
      
      if (artworkUrl.includes('saavncdn.com')) {
        return artworkUrl.replace(/50x50|150x150|500x500/g, '500x500');
      }
      
      try {
        const url = new URL(artworkUrl);
        url.searchParams.set('quality', '100');
        return url.toString();
      } catch (e) {
        if (artworkUrl.includes('?')) {
          return `${artworkUrl}&quality=100`;
        } else {
          return `${artworkUrl}?quality=100`;
        }
      }
    } catch (error) {
      console.error('Error processing artwork URL:', error);
      return artworkUrl;
    }
  }

  // Enhance track with high quality artwork
  enhanceTrackWithHighQualityArtwork(track) {
    if (!track) return track;
    
    const enhancedTrack = { ...track };
    
    if (enhancedTrack.artwork) {
      enhancedTrack.artwork = this.getHighQualityArtwork(enhancedTrack.artwork);
    }
    
    return enhancedTrack;
  }
}
