import { createRef } from 'react';
import { ToastAndroid } from 'react-native';

// Create a ref to access the PlaylistSelector component
export const PlaylistSelectorRef = createRef();

// Export a function to check if the ref is ready
export const isPlaylistSelectorReady = () => {
  return !!PlaylistSelectorRef.current;
};

// Function to show the playlist selector with error handling
export const showPlaylistSelectorWithFallback = (song) => {
  try {
    if (!PlaylistSelectorRef.current) {
      console.warn('PlaylistSelectorRef is not initialized yet');
      ToastAndroid.show(
        'Playlist selector is not ready yet, please try again in a moment',
        ToastAndroid.SHORT
      );
      return false;
    }

    // Call the show method on the ref
    return PlaylistSelectorRef.current.show(song);
  } catch (error) {
    console.error('Error showing playlist selector:', error);
    ToastAndroid.show('Error showing playlist selector', ToastAndroid.SHORT);
    return false;
  }
};

// Methods for controlling the PlaylistSelector modal
export const PlaylistSelectorManager = {
  show: (song) => {
    try {
      if (!song) {
        console.error('Cannot show playlist selector: No song provided');
        return false;
      }

      if (!song.id || !song.title) {
        console.error('Invalid song object for playlist selector:', song);
        return false;
      }

      if (PlaylistSelectorRef.current) {
        return PlaylistSelectorRef.current.show(song);
      } else {
        console.error('PlaylistSelector reference is not initialized');
        ToastAndroid.show(
          'Cannot open playlist selector now',
          ToastAndroid.SHORT
        );
        return false;
      }
    } catch (error) {
      console.error('Error showing playlist selector:', error);
      return false;
    }
  },

  hide: () => {
    try {
      if (PlaylistSelectorRef.current) {
        return PlaylistSelectorRef.current.hide();
      } else {
        console.warn(
          'Tried to hide PlaylistSelector but reference is not initialized'
        );
        return false;
      }
    } catch (error) {
      console.error('Error hiding playlist selector:', error);
      return false;
    }
  },

  isVisible: () => {
    try {
      if (PlaylistSelectorRef.current) {
        return PlaylistSelectorRef.current.isVisible();
      }
      return false;
    } catch (error) {
      console.error('Error checking playlist selector visibility:', error);
      return false;
    }
  },
};
