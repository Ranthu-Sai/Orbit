import React, {
  useState,
  useImperativeHandle,
  forwardRef,
  useEffect,
} from 'react';
import { PlaylistSelector } from './PlaylistSelector';
import { PlaylistSelectorRef } from '../../Utils/PlaylistSelectorManager';
import { ToastAndroid, AppState } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const PlaylistSelectorWrapperComponent = forwardRef((props, ref) => {
  const [visible, setVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [initialized, setInitialized] = useState(false);

  useEffect(() => {
    // Initialize immediately
    setInitialized(true);

    // Initialize component
    const initializeComponent = async () => {
      try {
        // Create default playlists structure if it doesn't exist
        const existingPlaylists = await AsyncStorage.getItem('userPlaylists');
        if (!existingPlaylists) {
          await AsyncStorage.setItem('userPlaylists', JSON.stringify([]));
        }
      } catch (error) {
        console.error('Error initializing playlists:', error);
      }
    };

    initializeComponent();

    // Set up app state listener
    const handleAppStateChange = (nextAppState) => {
      if (nextAppState === 'active') {
        setInitialized(true);
      }
    };

    const appStateSubscription = AppState.addEventListener(
      'change',
      handleAppStateChange
    );

    return () => {
      appStateSubscription.remove();
    };
  }, []);

  useImperativeHandle(ref, () => ({
    show: (song) => {
      if (!song) {
        console.error('Attempted to show PlaylistSelector without a song');
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
    },
  }));

  const handleClose = () => {
    setVisible(false);
    // Clear song data after a small delay to prevent UI flickering
    setTimeout(() => {
      setSelectedSong(null);
    }, 300);
  };

  return (
    <PlaylistSelector
      visible={visible}
      onClose={handleClose}
      song={selectedSong}
    />
  );
});

// This component should be included once in your app's root component
export default PlaylistSelectorWrapperComponent;
