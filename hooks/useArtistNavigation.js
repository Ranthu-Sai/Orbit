import { useEffect } from 'react';
import { BackHandler } from 'react-native';
import { useNavigation } from '@react-navigation/native';
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
    // React Navigation naturally maintains history in its stack.
  }, [artistId, activeTab, artistName]);

  // Handle hardware back button
  useEffect(() => {
    const handleBackPress = () => {
      // Check navigation state to detect potential loops
      const navigationState = navigation.getState();

      try {
        // Detect navigation loop using utility function
        if (detectNavigationLoop(navigationState)) {
          navigation.navigate('MainRoute', {
            screen: 'Home',
            params: {
              screen: 'Search',
            },
          });
        } else {
          // Use standard navigation back
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('MainRoute', {
              screen: 'Home',
              params: {
                screen: 'Search',
              },
            });
          }
        }
      } catch (error) {
        console.error('Error in ArtistPage back navigation:', error);
        // Ultimate fallback - go to Search to break any loops
        navigation.navigate('MainRoute', {
          screen: 'Home',
          params: {
            screen: 'Search',
          },
        });
      }

      return true;
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
    navigation.navigate('MainRoute', {
      screen: 'Home',
      params: {
        screen: 'Album',
        params: {
          id: album.id,
          name: album.name,
          source: 'Artist',
          artistId,
          artistName,
          previousTab: currentTab,
        },
      },
    });
  };

  return {
    navigateToAlbum,
  };
};
