import React, { useCallback, useRef, useState } from 'react';
import { TouchableOpacity, ToastAndroid } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer from 'react-native-track-player';
import { useTheme, ActivityIndicator } from 'react-native-paper';

export const ShuffleButton = ({ size = 24, color, style }) => {
  const theme = useTheme();
  const lastActionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const [isShuffled, setIsShuffled] = React.useState(false);
  const [isShuffling, setIsShuffling] = React.useState(false);

  // Load the initial shuffle state
  React.useEffect(() => {
    const loadShuffleState = async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        // In v4, we'll track shuffle state ourselves
        // since there's no direct shuffle mode API
        const currentTrack = await TrackPlayer.getCurrentTrack();
        if (currentTrack) {
          setIsShuffled(true);
        }
      } catch (error) {
        console.log('Error getting queue state:', error);
      }
    };

    loadShuffleState();
  }, []);

  // Shuffle the queue while preserving the current track
  const shuffleQueue = useCallback(async () => {
    try {
      setIsShuffling(true);
      
      // Get current track index and queue
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      if (currentTrackIndex === null || currentTrackIndex === undefined) {
        ToastAndroid.show('No track is currently playing', ToastAndroid.SHORT);
        return;
      }
      
      const queue = await TrackPlayer.getQueue();
      if (queue.length <= 1) {
        ToastAndroid.show('Not enough songs to shuffle', ToastAndroid.SHORT);
        return;
      }
      
      // Get current track and remaining tracks
      const currentTrack = queue[currentTrackIndex];
      const remainingTracks = queue.filter((_, index) => index !== currentTrackIndex);
      
      // Fisher-Yates shuffle algorithm
      for (let i = remainingTracks.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
      }
      
      try {
        // Remove all tracks after the current track
        const tracksToRemove = queue.slice(currentTrackIndex + 1).map((_, index) => {
          return currentTrackIndex + 1 + index;
        });
        
        if (tracksToRemove.length > 0) {
          await TrackPlayer.remove(tracksToRemove);
        }
        
        // Add shuffled tracks back one by one
        for (let i = 0; i < remainingTracks.length; i++) {
          await TrackPlayer.add(remainingTracks[i]);
        }
        
        setIsShuffled(true);
        ToastAndroid.show('Queue shuffled', ToastAndroid.SHORT);
      } catch (updateError) {
        console.error('Error updating queue:', updateError);
        ToastAndroid.show('Failed to shuffle queue', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error in shuffle operation:', error);
      ToastAndroid.show('Failed to shuffle queue', ToastAndroid.SHORT);
    } finally {
      setIsShuffling(false);
    }
  }, []);

  // Debounced shuffle toggle to prevent rapid state changes
  const toggleShuffle = useCallback(async () => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 500 || isProcessingRef.current) {
      return; // Prevent rapid successive calls
    }

    lastActionTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      if (!isShuffled) {
        // If enabling shuffle, shuffle the queue first
        await shuffleQueue();
      } else {
        // In v4, we don't need to do anything special to disable shuffle
        // since we're managing the queue order ourselves
        setIsShuffled(false);
        ToastAndroid.show('Shuffle disabled', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.log('Error toggling shuffle:', error);
      ToastAndroid.show('Error updating shuffle', ToastAndroid.SHORT);
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [isShuffled, shuffleQueue]);

  // Use theme color if no color is provided
  const iconColor = color || (theme.dark ? '#ffffff' : '#000000');
  const activeColor = color || theme.colors.primary || '#4169E1';

  return (
    <TouchableOpacity
      onPress={toggleShuffle}
      style={[
        {
          width: size * 1.5,
          height: size * 1.5,
          borderRadius: size * 0.75,
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
      activeOpacity={0.7}
      disabled={isShuffling}
    >
      {isShuffling ? (
        <ActivityIndicator
          size={size * 0.8}
          color={theme.colors.primary}
        />
      ) : (
        <MaterialIcons
          name="shuffle"
          size={size}
          color={isShuffled ? theme.colors.primary : (color || theme.colors.text)}
          style={{
            opacity: isShuffled ? 1 : 0.7,
          }}
        />
      )}
    </TouchableOpacity>
  );
};
