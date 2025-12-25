import React, { useRef, useEffect, useContext } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { HomeRoute } from "./Home/HomeRoute";
import { DiscoverRoute } from "./Discover/DiscoverRoute";
import { LibraryRoute } from "./Library/LibraryRoute";
import Entypo from "react-native-vector-icons/Entypo";
import Octicons from "react-native-vector-icons/Octicons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "@react-navigation/native";
import CustomTabBar from '../Component/Tab/CustomTabBar.jsx';
import BottomSheetMusic from '../Component/MusicPlayer/BottomSheetMusic.jsx';
import { View, ToastAndroid } from 'react-native';
import { useNavigation, useFocusEffect, CommonActions } from '@react-navigation/native';
import { BackHandler } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Context from '../Context/Context';
// NOTE: FullScreenMusic is handled by BottomSheetMusic, not rendered separately here
import { PlaylistSelectorBottomSheetWrapper } from '../Component/Playlist/PlaylistSelectorBottomSheetWrapper';

const Tab = createBottomTabNavigator();

// AsyncStorage keys
const CURRENT_ALBUM_ID_KEY = "orbit_current_album_id";
const CURRENT_ALBUM_DATA_KEY = "orbit_current_album_data";
const CURRENT_PLAYLIST_ID_KEY = "orbit_current_playlist_id";
const CURRENT_PLAYLIST_DATA_KEY = "orbit_current_playlist_data";

// Define tab names for reference
const Tabs = ['Home', 'Discover', 'Library'];

export const RootRoute = () => {
  const theme = useTheme();
  const { Index, setIndex, previousScreen, setPreviousScreen, musicPreviousScreen, setMusicPreviousScreen } = useContext(Context);
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
      if (!currentState) return false;

      // Get the current active tab
      const currentActiveTab = currentState.routes[currentState.index];
      if (!currentActiveTab) return false;

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
                params: { screen: 'LibraryPage' }
              })
            );
            return true;
          }

          // If we're at LibraryPage and there's a previous tab, go back to that tab
          if (previousTabName.current && previousTabName.current !== 'Library') {
            console.log('At LibraryPage, returning to previous tab:', previousTabName.current);
            navigation.navigate(previousTabName.current);
            return true;
          }
        }
      }

      // Remember current tab before changing
      previousTabName.current = currentActiveTab.name;

      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => backHandler.remove();
  }, [navigation]);

  // Effect to track fullscreen state - simplified since screens now stay mounted
  useEffect(() => {
    // Update fullscreen active ref for back handling
    isFullscreenActive.current = (Index === 1);
    prevFullscreenState.current = (Index === 1);

    // Log for debugging
    if (Index === 1) {
      console.log('Fullscreen player opened (overlay mode)');
    } else if (prevFullscreenState.current) {
      console.log('Fullscreen player closed (screens preserved)');
    }
  }, [Index]);

  // Track screen changes continuously to better remember which screen the user was on
  // This helps with navigation after closing the fullscreen player
  useEffect(() => {
    let lastRecordedPath = '';
    let debounceTimer = null;
    let isProcessing = false;

    // Function to record the current screen path
    const recordScreenPath = () => {
      // Prevent concurrent execution
      if (isProcessing || isFullscreenActive.current) {
        return;
      }

      isProcessing = true;

      try {
        const currentState = navigation.getState();

        if (currentState && currentState.routes && currentState.routes.length > 0) {
          // Get the active route information
          const currentTabRoute = currentState.routes[currentState.index];

          // Store both the main tab and the nested screen state
          const nestedState = currentTabRoute.state;
          let fullNavPath = currentTabRoute.name; // Start with the tab name
          let screenName = ''; // To capture nested screen name

          // If there's a nested navigation state, get the current active route
          if (nestedState && nestedState.routes && nestedState.routes.length > 0) {
            const activeNestedRoute = nestedState.routes[nestedState.index];

            // Save the screen name
            screenName = activeNestedRoute.name;

            // Check if this is a navigation to MyMusicPage through params
            if (activeNestedRoute.params && activeNestedRoute.params.screen === 'MyMusicPage') {
              console.log('Detected MyMusicPage navigation through params');
              fullNavPath = `${currentTabRoute.name}/MyMusicPage`;
            }
            // Check for deeper nesting (for screens like MyMusicPage in Library)
            else if (activeNestedRoute.state && activeNestedRoute.state.routes && activeNestedRoute.state.routes.length > 0) {
              const deepNestedRoute = activeNestedRoute.state.routes[activeNestedRoute.state.index];
              // Store the full navigation path with tab, screen and nested screen
              fullNavPath = `${currentTabRoute.name}/${activeNestedRoute.name}/${deepNestedRoute.name}`;

            } else {
              // Store the full navigation path (tab/screen)
              fullNavPath = `${currentTabRoute.name}/${activeNestedRoute.name}`;
            }
          }

          // Clean fullNavPath if it has MainRoute prefix for consistency
          if (fullNavPath.startsWith('MainRoute/')) {
            fullNavPath = fullNavPath.replace('MainRoute/', '');
            console.log('Cleaned MainRoute prefix from path:', fullNavPath);
          }

          // CRITICAL FIX: Special handling for Library tab
          // If we're in Library tab but a specific screen name wasn't captured properly,
          // check the params to see if there's a target screen
          if (fullNavPath === 'Library' && currentTabRoute.params && currentTabRoute.params.screen) {
            // Don't set Library/Library - check for more specific screens first
            const screenFromParams = currentTabRoute.params.screen;

            // Check if we're trying to navigate to MyMusicPage specifically
            if (screenFromParams === 'MyMusicPage') {
              fullNavPath = `Library/MyMusicPage`;
              console.log('Fixed Library path for MyMusicPage:', fullNavPath);
            } else if (screenFromParams !== 'Library') {
              // Only use params if the screen is not 'Library' to avoid Library/Library
              fullNavPath = `Library/${screenFromParams}`;
              console.log('Fixed Library path using params:', fullNavPath);
            }
          }

          // Only proceed if the path has actually changed
          if (fullNavPath === lastRecordedPath) {
            return;
          }

          lastRecordedPath = fullNavPath;

          // Don't update if Index is 1 (fullscreen player active) - extra safety check
          if (!isFullscreenActive.current) {
            setPreviousScreen(fullNavPath);

            // Only update musicPreviousScreen if we're in a music-related screen
            // This preserves the music context even when navigating to non-music screens
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

    // Set up a listener for state changes with debounced execution
    // This ensures we don't update during the transition to fullscreen and prevents infinite loops
    const unsubscribe = navigation.addListener('state', () => {
      // Clear previous timer
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      // Add a debounced delay to prevent rapid successive calls
      debounceTimer = setTimeout(recordScreenPath, 300);
    });

    // Record the initial screen - but only if not in fullscreen player
    if (!isFullscreenActive.current) {
      recordScreenPath();
    }

    // Clean up the listener and timer when the component unmounts
    return () => {
      if (debounceTimer) {
        clearTimeout(debounceTimer);
      }
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [navigation, setPreviousScreen, setMusicPreviousScreen]);

  // Track ACTUAL tab changes - ONLY via explicit tab press (user tapping tab bar)
  // This prevents clearing navigation data during programmatic navigation like fullscreen restore
  // The tabPress event listener in the Tab.Navigator handles this
  // We just need to track the previous tab for the back button logic

  // Effect to handle direct navigation to Library tab
  useEffect(() => {
    // When Library tab is focused directly (not via back button or internal navigation)
    const unsubscribe = navigation.addListener('tabPress', e => {
      if (e.target.includes('Library')) {
        // Check if we're already on a Library sub-screen
        const currentState = navigation.getState();
        if (currentState && currentState.routes) {
          const libraryTab = currentState.routes.find(route => route.name === 'Library');

          // If we have nested state in Library tab and it's not the main screen
          if (libraryTab &&
            libraryTab.state &&
            libraryTab.state.routes &&
            libraryTab.state.routes.length > 0 &&
            libraryTab.state.routes[0].name !== 'LibraryPage') {

            // Clear any special navigation flags
            AsyncStorage.removeItem('came_from_fullscreen_player')
              .then(() => {
                console.log('Cleared navigation flags on direct Library tab press');
              })
              .catch(error => {
                console.error('Error clearing navigation flag:', error);
              });

            // Navigate to main Library page instead of the sub-screen
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
      {/* Tab.Navigator is ALWAYS mounted and visible - critical for preserving screen state and layout */}
      {/* Fullscreen player overlays on top of this when active */}
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
              fontWeight: "bold",
            },
            tabBarInactiveTintColor: theme.colors.textSecondary,
            tabBarActiveTintColor: theme.colors.primary,
            headerShown: false,
            tabBarStyle: {
              backgroundColor: theme.colors.background,
              borderColor: "rgba(28,27,27,0)"
            }
          }}>
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
                const mainRoute = state?.routes?.find(r => r.name === 'MainRoute');
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                // If coming from a different tab (not already on Home), clear navigation data
                if (currentTab?.name && currentTab.name !== 'Home') {
                  console.log(`Explicit tab switch from ${currentTab.name} to Home, clearing stored screen data`);
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY)
                  ]).catch(error => {
                    console.error('Error clearing stored screen data:', error);
                  });
                }
              }
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
                const mainRoute = state?.routes?.find(r => r.name === 'MainRoute');
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                // Only reset if coming from a different tab (not within Discover)
                if (currentTab?.name && currentTab.name !== 'Discover') {
                  console.log(`Explicit tab switch from ${currentTab.name} to Discover, clearing stored screen data`);
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY)
                  ]).catch(error => {
                    console.error('Error clearing stored screen data:', error);
                  });

                  // Navigate to DiscoverPage
                  setTimeout(() => {
                    navigation.navigate('Discover', {
                      screen: 'DiscoverPage'
                    });
                  }, 50);
                }
              }
            }}
          />
          <Tab.Screen
            options={{
              tabBarIcon: ({ color, size }) => (
                <MaterialCommunityIcons name="music-box-multiple-outline" color={color} size={size - 4} />
              ),
            }}
            name="Library"
            component={LibraryRoute}
            listeners={{
              tabPress: () => {
                // Clear navigation data when switching to Library from another tab
                const state = navigation.getState();
                const mainRoute = state?.routes?.find(r => r.name === 'MainRoute');
                const currentTabIndex = mainRoute?.state?.index ?? 0;
                const currentTab = mainRoute?.state?.routes?.[currentTabIndex];

                if (currentTab?.name && currentTab.name !== 'Library') {
                  console.log(`Explicit tab switch from ${currentTab.name} to Library, clearing stored screen data`);
                  Promise.all([
                    AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
                    AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY)
                  ]).catch(error => {
                    console.error('Error clearing stored screen data:', error);
                  });
                }
              }
            }}
          />
        </Tab.Navigator>
      </View>

      {/* NOTE: FullScreenMusic is NOT rendered here - it's handled by BottomSheetMusic */}
      {/* BottomSheetMusic uses @gorhom/bottom-sheet with snap points [155, '100%'] */}
      {/* When Index === 1, BottomSheetMusic expands to fullscreen automatically */}

      {/* Global PlaylistSelector for FullScreenMusic */}
      <PlaylistSelectorBottomSheetWrapper />
    </View>
  );
};
