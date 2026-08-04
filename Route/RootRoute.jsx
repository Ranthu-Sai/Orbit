import React, { useRef, useEffect, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeRoute } from './Home/HomeRoute';
import { DiscoverRoute } from './Discover/DiscoverRoute';
import { LibraryRoute } from './Library/LibraryRoute';
import Entypo from 'react-native-vector-icons/Entypo';
import Octicons from 'react-native-vector-icons/Octicons';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useTheme } from '@react-navigation/native';
import CustomTabBar from '../Component/Tab/CustomTabBar.jsx';
import BottomSheetMusic from '../Component/MusicPlayer/BottomSheetMusic.jsx';
import { View, ToastAndroid } from 'react-native';
import {
  useNavigation,
  CommonActions,
} from '@react-navigation/native';
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Context from '../Context/Context';
// NOTE: FullScreenMusic is handled by BottomSheetMusic, not rendered separately here
import { PlaylistSelectorBottomSheetWrapper } from '../Component/Playlist/PlaylistSelectorBottomSheetWrapper';

const Tab = createBottomTabNavigator();

// AsyncStorage keys
const CURRENT_ALBUM_ID_KEY = 'orbit_current_album_id';
const CURRENT_ALBUM_DATA_KEY = 'orbit_current_album_data';
const CURRENT_PLAYLIST_ID_KEY = 'orbit_current_playlist_id';
const CURRENT_PLAYLIST_DATA_KEY = 'orbit_current_playlist_data';

const NavigationStateTracker = ({ navigation, isFullscreenActive }) => {
  const { Index, setPreviousScreen, setMusicPreviousScreen } = useContext(Context);
  const prevFullscreenState = useRef(false);

  useEffect(() => {
    isFullscreenActive.current = Index === 1;
    prevFullscreenState.current = Index === 1;
  }, [Index, isFullscreenActive]);

  useEffect(() => {
    let lastRecordedPath = '';
    let debounceTimer = null;
    let isProcessing = false;

    const recordScreenPath = () => {
      if (isProcessing || isFullscreenActive.current) return;
      isProcessing = true;

      try {
        const currentState = navigation.getState();
        if (currentState && currentState.routes && currentState.routes.length > 0) {
          const currentTabRoute = currentState.routes[currentState.index];
          const nestedState = currentTabRoute.state;
          let fullNavPath = currentTabRoute.name;

          if (nestedState && nestedState.routes && nestedState.routes.length > 0) {
            const activeNestedRoute = nestedState.routes[nestedState.index];
            if (activeNestedRoute.params && activeNestedRoute.params.screen === 'MyMusicPage') {
              fullNavPath = `${currentTabRoute.name}/MyMusicPage`;
            } else if (activeNestedRoute.state && activeNestedRoute.state.routes && activeNestedRoute.state.routes.length > 0) {
              const deepNestedRoute = activeNestedRoute.state.routes[activeNestedRoute.state.index];
              fullNavPath = `${currentTabRoute.name}/${activeNestedRoute.name}/${deepNestedRoute.name}`;
            } else {
              fullNavPath = `${currentTabRoute.name}/${activeNestedRoute.name}`;
            }
          }

          if (fullNavPath.startsWith('MainRoute/')) fullNavPath = fullNavPath.replace('MainRoute/', '');

          if (fullNavPath === 'Library' && currentTabRoute.params && currentTabRoute.params.screen) {
            const screenFromParams = currentTabRoute.params.screen;
            if (screenFromParams === 'MyMusicPage') fullNavPath = 'Library/MyMusicPage';
            else if (screenFromParams !== 'Library') fullNavPath = `Library/${screenFromParams}`;
          }

          if (fullNavPath === lastRecordedPath) return;
          lastRecordedPath = fullNavPath;

          if (!isFullscreenActive.current) {
            setPreviousScreen(fullNavPath);
            if (fullNavPath.includes('Library') || fullNavPath.includes('MyMusic')) {
              setMusicPreviousScreen(fullNavPath);
            }
          }
        }
      } catch (error) {
        console.error('Error in recordScreenPath:', error);
      } finally {
        isProcessing = false;
      }
    };

    const unsubscribe = navigation.addListener('state', () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      debounceTimer = setTimeout(recordScreenPath, 300);
    });

    if (!isFullscreenActive.current) recordScreenPath();

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      if (unsubscribe) unsubscribe();
    };
  }, [navigation, setPreviousScreen, setMusicPreviousScreen, isFullscreenActive]);

  return null;
};

export const RootRoute = () => {
  const theme = useTheme();
  const navigation = useNavigation();
  const isFullscreenActive = useRef(false);
  const previousTabName = useRef(null);
  const backPressedOnce = useRef(false);
  const prevFullscreenState = useRef(false);

  // Global back button handler to ensure proper navigation hierarchy
  useEffect(() => {
    const handleBackPress = () => {
      // Don't handle if fullscreen player is active (let BottomSheetMusic handle it)
      if (isFullscreenActive.current) {
        return false;
      }

      // Get current navigation state
      const currentState = navigation.getState();
      if (!currentState) {
        return false;
      }

      // Get the current active tab
      const currentActiveTab = currentState.routes[currentState.index];
      if (!currentActiveTab) {
        return false;
      }

      // Handle Home tab - exit app if at root
      if (currentActiveTab.name === 'Home') {
        const homeState = currentActiveTab.state;

        // If we're at the root of Home tab (or no nested state), show exit confirmation
        if (!homeState || homeState.index === 0) {
          if (backPressedOnce.current) {
            // Second press - exit the app
            BackHandler.exitApp();
            return true;
          } else {
            // First press - show toast and set flag
            backPressedOnce.current = true;
            ToastAndroid.show('Press back again to exit', ToastAndroid.SHORT);

            // Reset flag after 2 seconds
            setTimeout(() => {
              backPressedOnce.current = false;
            }, 2000);

            return true; // Prevent default action on first press
          }
        }

        // Otherwise let default back navigation handle it
        return false;
      }

      // Handle back navigation for LibraryRoute
      if (currentActiveTab.name === 'Library') {
        const libraryState = currentActiveTab.state;

        // If we're on a nested screen in Library
        if (libraryState && libraryState.index > 0) {
          // Let the system handle regular back within the stack
          return false;
        }

        // If we're at the main Library screen (index 0)
        if (libraryState && libraryState.index === 0) {
          // If the first screen is not LibraryPage, navigate to LibraryPage
          if (libraryState.routes[0].name !== 'LibraryPage') {
            navigation.dispatch(
              CommonActions.navigate({
                name: 'Library',
                params: { screen: 'LibraryPage' },
              })
            );
            return true;
          }

          // If we're at LibraryPage and there's a previous tab, go back to that tab
          if (
            previousTabName.current &&
            previousTabName.current !== 'Library'
          ) {
            navigation.navigate(previousTabName.current);
            return true;
          }
        }
      }

      // Remember current tab before changing
      previousTabName.current = currentActiveTab.name;

      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      handleBackPress
    );

    return () => backHandler.remove();
  }, [navigation]);

  useEffect(() => {

    const unsubscribe = navigation.addListener('tabPress', (e) => {
      if (e.target.includes('Library')) {
        // Check if we're already on a Library sub-screen
        const currentState = navigation.getState();
        if (currentState && currentState.routes) {
          const libraryTab = currentState.routes.find(
            (route) => route.name === 'Library'
          );

          if (
            libraryTab &&
            libraryTab.state &&
            libraryTab.state.routes &&
            libraryTab.state.routes.length > 0 &&
            libraryTab.state.routes[0].name !== 'LibraryPage'
          ) {
            // Clear any special navigation flags
            AsyncStorage.removeItem('came_from_fullscreen_player')
              .then(() => { })
              .catch((error) => {
                console.error('Error clearing navigation flag:', error);
              });

            e.preventDefault();
            navigation.navigate('Library', { screen: 'LibraryPage' });
          }
        }
      }
    });

    return unsubscribe;
  }, [navigation]);

  return (
    <View style={{ flex: 1 }}>
      <NavigationStateTracker navigation={navigation} isFullscreenActive={isFullscreenActive} />

      <View style={{ flex: 1 }}>
        <Tab.Navigator
          initialRouteName="Home"
          tabBar={(props) => (
            <>
              <BottomSheetMusic />
              <CustomTabBar {...props} />
            </>
          )}
          screenOptions={{
            tabBarShowLabel: false,
            tabBarLabelStyle: {
              fontWeight: 'bold',
            },
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarActiveTintColor: theme.colors.primary,
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.background,
              borderColor: 'rgba(28,27,27,0)',
            },
          }}
        >
          <Tab.Screen
            options={{
              tabBarIcon: ({ color, size }) => (
                <Octicons name="home" color={color} size={size - 4} />
              ),
            }}
            name="Home"
            component={HomeRoute}
            listeners={{
              tabPress: () => {
                // Only clear navigation data when user explicitly taps Home tab from another tab
                const state = navigation.getState();
                const mainRoute = state?.routes?.find(
                  (r) => r.name === 'MainRoute'
                );
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                // If coming from a different tab (not already on Home), clear navigation data
                if (currentTab?.name && currentTab.name !== 'Home') {
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY),
                  ]).catch((error) => {
                    console.error('Error clearing stored screen data:', error);
                  });
                }
              },
            }}
          />
          <Tab.Screen
            options={{
              tabBarIcon: ({ color, size }) => (
                <Entypo name="compass" color={color} size={size - 4} />
              ),
            }}
            name="Discover"
            component={DiscoverRoute}
            listeners={{
              tabPress: () => {
                // Clear navigation data when switching to Discover from another tab
                const state = navigation.getState();
                const mainRoute = state?.routes?.find(
                  (r) => r.name === 'MainRoute'
                );
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                // Only reset if coming from a different tab (not within Discover)
                if (currentTab?.name && currentTab.name !== 'Discover') {
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY),
                  ]).catch((error) => {
                    console.error('Error clearing stored screen data:', error);
                  });

                  // Navigate to DiscoverPage
                  setTimeout(() => {
                    navigation.navigate('Discover', {
                      screen: 'DiscoverPage',
                    });
                  }, 50);
                }
              },
            }}
          />
          <Tab.Screen
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons
                  name="music-box-multiple-outline"
                  color={color}
                  size={size - 4}
                />
              ),
            }}
            name="Library"
            component={LibraryRoute}
            listeners={{
              tabPress: () => {
                // Clear navigation data when switching to Library from another tab
                const state = navigation.getState();
                const mainRoute = state?.routes?.find(
                  (r) => r.name === 'MainRoute'
                );
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                if (currentTab?.name && currentTab.name !== 'Library') {
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY),
                  ]).catch((error) => {
                    console.error('Error clearing stored screen data:', error);
                  });
                }
              },
            }}
          />
        </Tab.Navigator>
      </View>
      <PlaylistSelectorBottomSheetWrapper />
    </View>
  );
};
