import { useCallback } from 'react';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * useNavigationHandler - Custom hook for navigation management
 * 
 * This hook provides navigation management capabilities including:
 * - Screen transitions and routing
 * - Back button handling
 * - Navigation state management
 * - Route parameter preservation
 */

export const useNavigationHandler = (options = {}) => {
  const {
    musicPreviousScreen = null,
    onNavigationChange = null,
    preserveParams = true
  } = options;

  const navigation = useNavigation();

  // Handle player close with complex navigation logic
  const handlePlayerClose = useCallback(() => {
    try {
      const navigationState = navigation.getState();

      if (musicPreviousScreen) {
        let cleanPath = musicPreviousScreen;
        if (cleanPath.startsWith('MainRoute/')) {
          cleanPath = cleanPath.replace('MainRoute/', '');
        }

        const parts = cleanPath.split('/');
        // Special handling for Search
        if (parts.length >= 1 && parts[0] === 'Search') {
          navigation.navigate('Home', {
            screen: 'Search',
            params: {
              timestamp: Date.now()
            }
          });

          if (onNavigationChange) {
            onNavigationChange('Home/Search', { timestamp: Date.now() });
          }
          return;
        }

        // Special handling for Library screens
        if (parts.length >= 2 && parts[0] === 'Library' && parts[1] === 'MyMusicPage') {
          navigation.navigate('MainRoute', {
            screen: 'Library'
          });

          if (onNavigationChange) {
            onNavigationChange('MainRoute/Library');
          }
          return;
        }

        if (parts.length >= 2) {
          const tabName = parts[0];
          const screenName = parts[1];

          // Special handling for CustomPlaylistView
          if (screenName === 'CustomPlaylistView' && preserveParams) {
            AsyncStorage.getItem('last_viewed_custom_playlist')
              .then(storedPlaylist => {
                if (storedPlaylist) {
                  const playlistData = JSON.parse(storedPlaylist);

                  navigation.navigate('MainRoute', {
                    screen: tabName,
                    params: {
                      screen: screenName,
                      params: playlistData
                    }
                  });

                  if (onNavigationChange) {
                    onNavigationChange(`MainRoute/${tabName}/${screenName}`, playlistData);
                  }
                } else {
                  navigation.navigate('MainRoute', {
                    screen: tabName,
                    params: {
                      screen: screenName
                    }
                  });

                  if (onNavigationChange) {
                    onNavigationChange(`MainRoute/${tabName}/${screenName}`);
                  }
                }
              })
              .catch(error => {
                console.error('useNavigationHandler: Error retrieving playlist data:', error);
                navigation.navigate('MainRoute', { screen: tabName });

                if (onNavigationChange) {
                  onNavigationChange(`MainRoute/${tabName}`);
                }
              });
          }
          // For all other screens
          else {
            let existingParams = null;

            if (preserveParams && navigationState && navigationState.routes) {
              for (const route of navigationState.routes) {
                if (route.name === 'MainRoute' && route.state) {
                  const targetTab = route.state.routes.find(r => r.name === tabName);
                  if (targetTab && targetTab.state && targetTab.state.routes) {
                    const targetScreen = targetTab.state.routes.find(r => r.name === screenName);
                    if (targetScreen && targetScreen.params) {
                      existingParams = targetScreen.params;
                    }
                  }
                }
              }
            }

            navigation.navigate('MainRoute', {
              screen: tabName,
              params: screenName !== tabName ? {
                screen: screenName,
                params: existingParams
              } : undefined
            });

            if (onNavigationChange) {
              onNavigationChange(`MainRoute/${tabName}/${screenName}`, existingParams);
            }
          }
        } else if (parts.length === 1) {
          navigation.navigate('MainRoute', {
            screen: parts[0]
          });

          if (onNavigationChange) {
            onNavigationChange(`MainRoute/${parts[0]}`);
          }
        }
      } else {
        navigation.navigate('MainRoute', {
          screen: 'Library'
        });

        if (onNavigationChange) {
          onNavigationChange('MainRoute/Library');
        }
      }
    } catch (error) {
      console.error('useNavigationHandler: Error in handlePlayerClose:', error);
      try {
        navigation.navigate('MainRoute');
        if (onNavigationChange) {
          onNavigationChange('MainRoute');
        }
      } catch (e) {
        console.error('useNavigationHandler: Even basic navigation failed:', e);
      }
    }
  }, [navigation, musicPreviousScreen, onNavigationChange, preserveParams]);

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
            navigation.navigate('MainRoute', {
              screen: 'Home',
              params: {
                screen: 'Search',
                params: {
                  timestamp: Date.now()
                }
              }
            });

            if (onNavigationChange) {
              onNavigationChange('Home/Search', { timestamp: Date.now() });
            }
          }, 100);
          return;
        }

        // Special handling for download screen
        if (parts.length >= 2 && parts[0] === 'Library' &&
          (parts[1] === 'DownloadScreen' || parts[1] === 'DownloadSongsPage')) {
          setTimeout(() => {
            navigation.navigate('MainRoute', {
              screen: 'Library',
              params: {
                screen: 'DownloadScreen',
                params: {
                  previousScreen: 'Library',
                  timestamp: Date.now()
                }
              }
            });

            AsyncStorage.setItem('came_from_fullscreen_player', 'true');

            if (onNavigationChange) {
              onNavigationChange('Library/DownloadScreen', { previousScreen: 'Library' });
            }
          }, 100);
          return;
        }

        // Special handling for MyMusicPage
        if (parts.length >= 2 && parts[0] === 'Library' && parts[1] === 'MyMusicPage') {
          setTimeout(() => {
            navigation.navigate('MainRoute', {
              screen: 'Library',
              params: {
                screen: 'MyMusicPage',
                params: { previousScreen: 'Library' }
              }
            });

            if (onNavigationChange) {
              onNavigationChange('Library/MyMusicPage', { previousScreen: 'Library' });
            }
          }, 100);
          return;
        }

        // For CustomPlaylistView
        if (parts.length >= 2 && parts[1] === 'CustomPlaylistView' && preserveParams) {
          const playlistData = await AsyncStorage.getItem('last_viewed_custom_playlist');
          if (playlistData) {
            const parsedData = JSON.parse(playlistData);
            setTimeout(() => {
              navigation.navigate('MainRoute', {
                screen: parts[0],
                params: {
                  screen: parts[1],
                  params: parsedData
                }
              });

              if (onNavigationChange) {
                onNavigationChange(`${parts[0]}/${parts[1]}`, parsedData);
              }
            }, 100);
          }
        }

        // Generic fallback for other screens
        if (parts.length >= 2) {
          setTimeout(() => {
            navigation.navigate('MainRoute', {
              screen: parts[0],
              params: {
                screen: parts[1]
              }
            });

            if (onNavigationChange) {
              onNavigationChange(`${parts[0]}/${parts[1]}`);
            }
          }, 100);
        } else if (parts.length === 1) {
          setTimeout(() => {
            navigation.navigate('MainRoute', {
              screen: parts[0]
            });

            if (onNavigationChange) {
              onNavigationChange(`MainRoute/${parts[0]}`);
            }
          }, 100);
        }
      } else {
        // No previous screen info, default to Home
        setTimeout(() => {
          navigation.navigate('MainRoute', {
            screen: 'Home'
          });

          if (onNavigationChange) {
            onNavigationChange('MainRoute/Home');
          }
        }, 100);
      }
    } catch (error) {
      console.error('useNavigationHandler: Error in back navigation:', error);
      // Final fallback
      try {
        navigation.navigate('MainRoute', {
          screen: 'Home'
        });
        if (onNavigationChange) {
          onNavigationChange('MainRoute/Home');
        }
      } catch (e) {
        console.error('useNavigationHandler: Even fallback navigation failed:', e);
      }
    }
  }, [navigation, musicPreviousScreen, onNavigationChange, preserveParams]);

  // Navigate to specific screen with params
  const navigateToScreen = useCallback((screenPath, params = {}) => {
    try {
      const parts = screenPath.split('/');

      if (parts.length === 1) {
        navigation.navigate(parts[0], params);
      } else if (parts.length === 2) {
        navigation.navigate(parts[0], {
          screen: parts[1],
          params
        });
      } else if (parts.length === 3) {
        navigation.navigate(parts[0], {
          screen: parts[1],
          params: {
            screen: parts[2],
            params
          }
        });
      }

      if (onNavigationChange) {
        onNavigationChange(screenPath, params);
      }
    } catch (error) {
      console.error('useNavigationHandler: Error navigating to screen:', error);
    }
  }, [navigation, onNavigationChange]);

  // Get current navigation path
  const getCurrentPath = useCallback(() => {
    try {
      const state = navigation.getState();
      // Extract current path from navigation state
      return state?.routes?.[state.index]?.name || 'Unknown';
    } catch (error) {
      console.error('useNavigationHandler: Error getting current path:', error);
      return 'Unknown';
    }
  }, [navigation]);

  // Check if can go back
  const canGoBack = useCallback(() => {
    try {
      return navigation.canGoBack();
    } catch (error) {
      console.error('useNavigationHandler: Error checking canGoBack:', error);
      return false;
    }
  }, [navigation]);

  // Go back if possible, with fallback navigation
  const goBack = useCallback(() => {
    try {
      if (navigation.canGoBack()) {
        navigation.goBack();

        if (onNavigationChange) {
          onNavigationChange('back');
        }
      } else {
        // Fallback: navigate to MainRoute if can't go back
        navigation.navigate('MainRoute', {
          screen: 'Home'
        });

        if (onNavigationChange) {
          onNavigationChange('MainRoute/Home');
        }
      }
    } catch (error) {
      console.error('useNavigationHandler: Error going back:', error);
      // Final fallback: try to navigate to MainRoute
      try {
        navigation.navigate('MainRoute');
        if (onNavigationChange) {
          onNavigationChange('MainRoute');
        }
      } catch (e) {
        console.error('useNavigationHandler: Even fallback navigation failed:', e);
      }
    }
  }, [navigation, onNavigationChange]);

  return {
    handlePlayerClose,
    handleBackNavigation,
    navigateToScreen,
    getCurrentPath,
    canGoBack,
    goBack,
    navigation,
    musicPreviousScreen
  };
};
