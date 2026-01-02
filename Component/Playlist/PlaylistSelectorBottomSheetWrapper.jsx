import React, { useState, useImperativeHandle, forwardRef, useEffect } from 'react';
import { PlaylistSelectorBottomSheet } from './PlaylistSelectorBottomSheet';
import { PlaylistSelectorBottomSheetRef } from '../../Utils/PlaylistSelectorBottomSheetManager';
import { ToastAndroid, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlaylistSelectorBottomSheetWrapperComponent = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [initialized, setInitialized] = useState(false);

  // Initialize the component and set up the reference
  useEffect(() => {
    const initializeComponent = async () => {
      try {
        // Set the reference for the manager
        PlaylistSelectorBottomSheetRef.current = {
          show: (song) => {
            if (!song) {
              console.error('❌ Attempted to show PlaylistSelectorBottomSheet without a song');
              return false;
            }
            setSelectedSong(song);
            setVisible(true);
            return true;
          },
          hide: () => {
            setVisible(false);
            return true;
          },
          isVisible: () => {
            return visible;
          },
          isInitialized: () => {
            return true;
          }
        };

        setInitialized(true);
      } catch (error) {
        console.error('Error initializing PlaylistSelectorBottomSheetWrapper:', error);
      }
    };

    initializeComponent();

    // Handle app state changes
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'background' && visible) {
        setVisible(false);
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription?.remove();
    };
  }, []); // Remove dependencies to prevent re-initialization

  useImperativeHandle(ref, () => ({
    show: (song) => {
      if (!song) {
        console.error('Attempted to show PlaylistSelectorBottomSheet without a song');
        return false;
      }
      setSelectedSong(song);
      setVisible(true);
      return true;
    },
    hide: () => {
      setVisible(false);
      return true;
    },
    isVisible: () => {
      return visible;
    },
    isInitialized: () => {
      return initialized;
    }
  }));

  const handleClose = () => {
    setVisible(false);
    // Clear song data after a small delay to prevent UI flickering
    setTimeout(() => {
      setSelectedSong(null);
    }, 300);
  };

  return (
    <PlaylistSelectorBottomSheet 
      visible={visible}
      onClose={handleClose}
      song={selectedSong}
    />
  );
});

PlaylistSelectorBottomSheetWrapperComponent.displayName = 'PlaylistSelectorBottomSheetWrapper';

export const PlaylistSelectorBottomSheetWrapper = PlaylistSelectorBottomSheetWrapperComponent;
