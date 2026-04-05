import React, { createContext, useContext, useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * NavigationHandler - Manages complex navigation logic for music player
 *
 * This component provides navigation management capabilities including:
 * - Screen transitions and routing
 * - Back button handling
 * - Navigation state management
 * - Route parameter preservation
 */

const NavigationHandlerContext = createContext();

export const NavigationHandler = ({ children, musicPreviousScreen }) => {
  const navigation = useNavigation();

  // Handle player close with complex navigation logic
  const handlePlayerClose = useCallback(() => {
    try {
      // Get the navigation state to make informed decisions
      const navigationState = navigation.getState();

      if (musicPreviousScreen) {
        // Clean up the path
        let cleanPath = musicPreviousScreen;
        if (cleanPath.startsWith('MainRoute/')) {
          cleanPath = cleanPath.replace('MainRoute/', '');
        }

        // Split into parts
        const parts = cleanPath.split('/');
        // Special handling for Search
        if (parts.length >= 1 && parts[0] === 'Search') {
          navigation.navigate('Home', {
            screen: 'Search',
            params: {
              timestamp: Date.now(), // Force refresh
            },
          });
          return;
        }

        // Special handling for download songs screen within Library tab
        if (
          parts.length >= 2 &&
          parts[0] === 'Library' &&
          parts[1] === 'MyMusicPage'
        ) {
          navigation.navigate('MainRoute', {
            screen: 'Library',
          });
          return;
        }

        if (parts.length >= 2) {
          const tabName = parts[0];
          const screenName = parts[1];

          // Special handling for CustomPlaylistView to ensure params are preserved
          if (screenName === 'CustomPlaylistView') {
            AsyncStorage.getItem('last_viewed_custom_playlist')
              .then((storedPlaylist) => {
                if (storedPlaylist) {
                  const playlistData = JSON.parse(storedPlaylist);

                  navigation.navigate('MainRoute', {
                    screen: tabName,
                    params: {
                      screen: screenName,
                      params: playlistData,
                    },
                  });
                } else {
                  navigation.navigate('MainRoute', {
                    screen: tabName,
                    params: {
                      screen: screenName,
                    },
                  });
                }
              })
              .catch((error) => {
                console.error(
                  'NavigationHandler: Error retrieving playlist data:',
                  error
                );
                navigation.navigate('MainRoute', { screen: tabName });
              });
          }
          // For all other screens
          else {
            // Find existing route params if available to preserve them
            let existingParams = null;

            if (navigationState && navigationState.routes) {
              for (const route of navigationState.routes) {
                if (route.name === 'MainRoute' && route.state) {
                  const targetTab = route.state.routes.find(
                    (r) => r.name === tabName
                  );
                  if (targetTab && targetTab.state && targetTab.state.routes) {
                    const targetScreen = targetTab.state.routes.find(
                      (r) => r.name === screenName
                    );
                    if (targetScreen && targetScreen.params) {
                      existingParams = targetScreen.params;
                    }
                  }
                }
              }
            }

            navigation.navigate('MainRoute', {
              screen: tabName,
              params:
                screenName !== tabName
                  ? {
                      screen: screenName,
                      params: existingParams,
                    }
                  : undefined,
            });
          }
        } else if (parts.length === 1) {
          navigation.navigate('MainRoute', {
            screen: parts[0],
          });
        }
      } else {
        navigation.navigate('MainRoute', {
          screen: 'Library',
        });
      }
    } catch (error) {
      console.error('NavigationHandler: Error in handlePlayerClose:', error);
      try {
        navigation.navigate('MainRoute');
      } catch (e) {
        console.error('NavigationHandler: Even basic navigation failed:', e);
      }
    }
  }, [navigation, musicPreviousScreen]);

  // Handle back button navigation
  const handleBackNavigation = useCallback(async () => {
    try {
      if (musicPreviousScreen) {
        let cleanPath = musicPreviousScreen;
        if (cleanPath.startsWith('MainRoute/')) {
          cleanPath = cleanPath.replace('MainRoute/', '');
        }

        const parts = cleanPath.split('/');
        // Special handling for Search
        if (parts.length >= 1 && parts[0] === 'Search') {
          setTimeout(() => {
            navigation.navigate('Home', {
              screen: 'Search',
              params: {
                timestamp: Date.now(),
              },
            });
          }, 100);
          return;
        }

        // Special handling for download screen
        if (
          parts.length >= 2 &&
          parts[0] === 'Library' &&
          (parts[1] === 'DownloadScreen' || parts[1] === 'DownloadSongsPage')
        ) {
          setTimeout(() => {
            navigation.navigate('Library', {
              screen: 'DownloadScreen',
              params: {
                previousScreen: 'Library',
                timestamp: Date.now(),
              },
            });

            AsyncStorage.setItem('came_from_fullscreen_player', 'true');
          }, 100);
          return;
        }

        // Special handling for MyMusicPage
        if (
          parts.length >= 2 &&
          parts[0] === 'Library' &&
          parts[1] === 'MyMusicPage'
        ) {
          setTimeout(() => {
            navigation.navigate('Library', {
              screen: 'MyMusicPage',
              params: { previousScreen: 'Library' },
            });
          }, 100);
          return;
        }

        // For CustomPlaylistView, make sure we have the right params
        if (parts.length >= 2 && parts[1] === 'CustomPlaylistView') {
          const playlistData = await AsyncStorage.getItem(
            'last_viewed_custom_playlist'
          );
          if (playlistData) {
            const parsedData = JSON.parse(playlistData);
            setTimeout(() => {
              navigation.navigate(parts[0], {
                screen: parts[1],
                params: parsedData,
              });
            }, 100);
          }
        }
      }
    } catch (error) {
      console.error(
        'NavigationHandler: Error in back handler navigation:',
        error
      );
    }
  }, [navigation, musicPreviousScreen]);

  // Navigate to specific screen with params
  const navigateToScreen = useCallback(
    (screenPath, params = {}) => {
      try {
        const parts = screenPath.split('/');

        if (parts.length === 1) {
          navigation.navigate(parts[0], params);
        } else if (parts.length === 2) {
          navigation.navigate(parts[0], {
            screen: parts[1],
            params,
          });
        } else if (parts.length === 3) {
          navigation.navigate(parts[0], {
            screen: parts[1],
            params: {
              screen: parts[2],
              params,
            },
          });
        }
      } catch (error) {
        console.error('NavigationHandler: Error navigating to screen:', error);
      }
    },
    [navigation]
  );

  // Get current navigation path
  const getCurrentPath = useCallback(() => {
    try {
      const state = navigation.getState();
      // Extract current path from navigation state
      // This is a simplified version - could be enhanced
      return state?.routes?.[state.index]?.name || 'Unknown';
    } catch (error) {
      console.error('NavigationHandler: Error getting current path:', error);
      return 'Unknown';
    }
  }, [navigation]);

  const contextValue = {
    handlePlayerClose,
    handleBackNavigation,
    navigateToScreen,
    getCurrentPath,
    navigation,
    musicPreviousScreen,
  };

  return (
    <NavigationHandlerContext.Provider value={contextValue}>
      {children}
    </NavigationHandlerContext.Provider>
  );
};

// Hook to use navigation handler
export const useNavigationHandler = () => {
  const context = useContext(NavigationHandlerContext);
  if (!context) {
    throw new Error(
      'useNavigationHandler must be used within a NavigationHandler'
    );
  }
  return context;
};
