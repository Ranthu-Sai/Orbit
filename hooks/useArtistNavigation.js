import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import navigationHistoryManager from '../Utils/NavigationHistoryManager';
import { detectNavigationLoop } from '../Utils/ArtistUtils';

/**
 * Custom hook for managing artist page navigation and back handling
 * @param {string} artistId - Artist ID
 * @param {string} artistName - Artist name
 * @param {string} activeTab - Current active tab
 * @returns {object} - Navigation functions
 */
export const useArtistNavigation = (artistId, artistName, activeTab) => {
  const navigation = useNavigation();

  // Add this screen to navigation history
  useEffect(() => {
    navigationHistoryManager.addScreen({
      screenName: 'ArtistPage',
      params: {
        artistId,
        artistName,
        initialTab: activeTab,
      },
    });
  }, [artistId, activeTab, artistName]);

  // Handle hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      // Check navigation state to detect potential loops
      const navigationState = navigation.getState();

      try {
        // Detect navigation loop using utility function
        if (detectNavigationLoop(navigationState)) {
          navigationHistoryManager.clearHistory();
          navigation.navigate('MainRoute', {
            screen: 'Home',
            params: {
              screen: 'Search',
            },
          });
        } else {
          // Use navigation history manager for proper back navigation
          const backAction =
            navigationHistoryManager.getBackNavigationAction(navigation);
          backAction();
        }
      } catch (error) {
        console.error('Error in ArtistPage back navigation:', error);
        // Ultimate fallback - go to Search to break any loops
        navigationHistoryManager.clearHistory();
        navigation.navigate('MainRoute', {
          screen: 'Home',
          params: {
            screen: 'Search',
          },
        });
      }

      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => {
      backHandler.remove();
    };
  }, [navigation, activeTab]);

  /**
   * Navigate to album page
   * @param {object} album - Album object
   * @param {string} currentTab - Current active tab
   */
  const navigateToAlbum = (album, currentTab) => {
    // Add album navigation to history before navigating
    navigationHistoryManager.addScreen({
      screenName: 'Album',
      params: {
        id: album.id,
        name: album.name,
        source: 'Artist',
        artistId,
        artistName,
        previousTab: currentTab,
      },
    });

    navigation.navigate('Album', {
      id: album.id,
      name: album.name,
      source: 'Artist',
      artistId,
      artistName,
      previousTab: currentTab,
    });
  };

  return {
    navigateToAlbum,
  };
};
