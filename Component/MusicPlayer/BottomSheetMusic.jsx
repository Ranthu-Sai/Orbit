import React, { useCallback, useContext, useEffect, useRef, useState, useMemo } from "react";
import { BackHandler, StyleSheet, Text, Keyboard, Platform, DeviceEventEmitter } from "react-native";
import BottomSheet, { BottomSheetView, useBottomSheetTimingConfigs } from "@gorhom/bottom-sheet";
import { Easing } from "react-native-reanimated";
import { MinimizedMusic } from "./MinimizedMusic";
import { FullScreenMusic } from "./FullScreenMusic";
import Context from "../../Context/Context";
import { useNavigation, useTheme } from "@react-navigation/native";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";
import TrackPlayer, { Event } from "react-native-track-player";

const BottomSheetMusic = React.memo(({ color }) => {
  const bottomSheetRef = useRef(null);
  const { Index, setIndex, previousScreen, musicPreviousScreen } =
    useContext(Context);
  const navigation = useNavigation();
  const { colors } = useTheme();
  const currentPlaying = useActiveTrack();
  const playbackState = usePlaybackState();
  const [hasQueue, setHasQueue] = useState(false);
  const [isMusicActive, setIsMusicActive] = useState(false);
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // OPTIMISTIC UI: State for loading song (shown while stream is being fetched)
  const [loadingSong, setLoadingSong] = useState(null);

  // Listen for early metadata event from PlayOneSong for immediate UI feedback
  useEffect(() => {
    const loadingListener = DeviceEventEmitter.addListener('song-loading-started', (songData) => {
      console.log('📱 BottomSheetMusic: Received loading song metadata, showing player immediately');
      setLoadingSong(songData);
      setIsMusicActive(true); // Immediately show the player
    });

    return () => {
      loadingListener.remove();
    };
  }, []);

  // Clear loading state when actual track starts playing
  useEffect(() => {
    if (currentPlaying && loadingSong && currentPlaying.id === loadingSong.id) {
      // Actual track is now ready, clear loading state
      console.log('📱 BottomSheetMusic: Track ready, clearing loading state');
      setLoadingSong(null);
    }
  }, [currentPlaying, loadingSong]);

  // Track keyboard visibility to hide minimized player when keyboard is open
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Memoized functions to prevent re-renders
  const handleSheetChanges = useCallback((index) => {
    if (index < 0) {
      setIndex(0);
    } else {
      setIndex(index);
    }
  }, [setIndex]);

  const updateIndex = useCallback((index) => {
    setIndex(index);
  }, [setIndex]);

  // Direct event listener for instant response
  useEffect(() => {
    const eventListener = TrackPlayer.addEventListener(Event.PlaybackState, (event) => {
      // Instant response to any playback state change
      if (event.state === 'playing' || event.state === 'paused') {
        setIsMusicActive(true);
        setHasQueue(true);
      } else if (event.state === 'stopped' || event.state === 'none') {
        // Only hide if no active track
        if (!currentPlaying) {
          setIsMusicActive(false);
        }
      }
    });

    // Also listen for track changes
    const trackListener = TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, (event) => {
      // PERFORMANCE: Defer state updates to prevent blocking during track change
      if (event.track) {
        setImmediate(() => {
          setIsMusicActive(true);
          setHasQueue(true);
        });
      }
    });

    return () => {
      eventListener.remove();
      trackListener.remove();
    };
  }, [currentPlaying]);

  // Fast queue check
  useEffect(() => {
    const checkQueue = async () => {
      try {
        const queue = await TrackPlayer.getQueue();
        setHasQueue(queue && queue.length > 0);
      } catch (error) {
        setHasQueue(false);
      }
    };

    checkQueue();
  }, []);

  // Instant response to playback state
  useEffect(() => {
    if (playbackState?.state === 'playing' || playbackState?.state === 'paused') {
      setIsMusicActive(true);
    }
  }, [playbackState?.state]);

  // Memoized visibility calculation - computed only when dependencies change
  // Hide when keyboard is visible (except in fullscreen mode)
  // OPTIMISTIC UI: Also show when loadingSong is set
  // Timing animation config for smooth, predictable open/close transitions
  // Using timing instead of spring to avoid stuck transitions
  // OPTIMIZED: Reduced duration to 200ms with faster out-easing for snappy close
  const animationConfigs = useBottomSheetTimingConfigs({
    duration: 200,
    easing: Easing.out(Easing.cubic),
  });

  const shouldShowPlayer = useMemo(() => {
    // Hide minimized player when keyboard is visible
    if (isKeyboardVisible && Index !== 1) return false;
    return currentPlaying || hasQueue || isMusicActive || loadingSong ||
      (playbackState?.state === 'playing' || playbackState?.state === 'paused') ||
      Index === 1;
  }, [currentPlaying, hasQueue, isMusicActive, playbackState?.state, Index, isKeyboardVisible, loadingSong]);

  // Function to specifically navigate to MyMusicPage
  const navigateToMyMusicPage = useCallback(() => {
    try {
      console.log("Directly navigating to Library/MyMusicPage");
      navigation.navigate("Library", { screen: "MyMusicPage" });
    } catch (error) {
      console.error("Error navigating to MyMusicPage:", error);
    }
  }, [navigation]);

  // Function to navigate to a specific screen based on the navigation path
  const navigateToScreen = useCallback(
    (tabName, screenName, nestedScreenName) => {
      console.log("Navigating to:", tabName, screenName, nestedScreenName);

      try {
        if (tabName === "Library") {
          if (screenName === "MyMusicPage" || screenName === "MyMusic") {
            // Direct navigation to MyMusicPage
            navigateToMyMusicPage();
          } else if (screenName === "LikedSongs") {
            // Direct navigation to LikedSongs
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "Library",
                  state: {
                    routes: [{ name: "LikedSongs" }],
                    index: 0,
                  },
                },
              ],
            });
          } else if (screenName === "CustomPlaylist") {
            // Direct navigation to CustomPlaylist
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "Library",
                  state: {
                    routes: [{ name: "CustomPlaylist" }],
                    index: 0,
                  },
                },
              ],
            });
          } else if (screenName === "LikedPlaylists") {
            // Direct navigation to LikedPlaylists
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "Library",
                  state: {
                    routes: [{ name: "LikedPlaylists" }],
                    index: 0,
                  },
                },
              ],
            });
          } else if (screenName === "AboutProject") {
            // Direct navigation to AboutProject
            navigation.reset({
              index: 0,
              routes: [
                {
                  name: "Library",
                  state: {
                    routes: [{ name: "AboutProject" }],
                    index: 0,
                  },
                },
              ],
            });
          } else if (screenName) {
            // Navigate to specific screen in Library
            navigation.navigate("Library", {
              screen: screenName,
              params: nestedScreenName
                ? { screen: nestedScreenName }
                : undefined,
            });
          } else {
            // Default to main Library page
            navigation.navigate("Library");
          }
        } else if (tabName === "Discover") {
          if (screenName) {
            // Navigate to specific screen in Discover
            navigation.navigate("Discover", {
              screen: screenName,
              params: nestedScreenName
                ? { screen: nestedScreenName }
                : undefined,
            });
          } else {
            navigation.navigate("Discover");
          }
        } else if (tabName === "Home") {
          if (screenName) {
            // Navigate to specific screen in Home
            navigation.navigate("Home", {
              screen: screenName,
              params: nestedScreenName
                ? { screen: nestedScreenName }
                : undefined,
            });
          } else {
            navigation.navigate("Home");
          }
        } else {
          // Default navigation
          navigation.navigate(tabName || "Home");
        }
      } catch (error) {
        console.error("Navigation error:", error);
      }
    },
    [navigation, navigateToMyMusicPage]
  );

  useEffect(() => {
    const backAction = () => {
      // When user presses back button and music player is in fullscreen mode
      if (Index === 1) {
        // First minimize the player
        setIndex(0);

        // Don't navigate away when minimizing from fullscreen
        // This allows the underlying album/playlist to remain visible
        return true; // Prevent default back behavior
      }

      // ALSO HANDLE BACK PRESS WHEN MINIMIZED PLAYER IS SHOWING
      // This fixes the issue when pressing back after closing fullscreen player
      if (Index === 0 && musicPreviousScreen) {
        // Get the current navigation state
        const currentState = navigation.getState();
        const currentScreenName =
          currentState?.routes?.[currentState.index]?.name;

        // Check if we're in a nested Library screen
        if (currentScreenName === "Library") {
          const libraryState =
            currentState?.routes?.[currentState.index]?.state;

          if (libraryState) {
            const currentLibraryScreenName =
              libraryState.routes[libraryState.index].name;

            // If we're on MyMusicPage or any other nested screen in Library, explicitly navigate to LibraryPage
            if (currentLibraryScreenName !== "LibraryPage") {
              console.log(
                `In ${currentLibraryScreenName}, explicitly navigating to LibraryPage`
              );

              // Use reset for consistent navigation behavior
              navigation.reset({
                index: 0,
                routes: [
                  {
                    name: "Library",
                    state: {
                      routes: [{ name: "LibraryPage" }],
                      index: 0,
                    },
                  },
                ],
              });
              return true;
            }
          }
        }
        // If we're in Home or Discover but should be in Library based on music context
        else if (
          (currentScreenName === "Home" || currentScreenName === "Discover") &&
          musicPreviousScreen.startsWith("Library")
        ) {
          console.log("In wrong tab, navigating to Library main page");
          navigation.reset({
            index: 0,
            routes: [
              {
                name: "Library",
                state: {
                  routes: [{ name: "LibraryPage" }],
                  index: 0,
                },
              },
            ],
          });
          return true;
        }
      }

      return false; // Allow default back behavior
    };

    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      backAction
    );

    // Only remove the handler when minimized, keep it active for fullscreen
    if (Index === 0) {
      backHandler.remove();
    }

    return () => {
      backHandler.remove();
    };
  }, [Index, navigation, setIndex, musicPreviousScreen]);

  // Pre-define the component structure for instant rendering
  if (!shouldShowPlayer) {
    return null;
  }

  // Ultra-fast render with optimized JSX
  return (
    <BottomSheet
      enableContentPanningGesture={true}
      enableHandlePanningGesture={true}
      detached={false}
      enableOverDrag={true}
      enablePanDownToClose={false}
      animationConfigs={animationConfigs}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustNothing"
      handleIndicatorStyle={{
        height: 0,
        width: 0,
        position: "absolute",
        backgroundColor: "rgba(0,0,0,0)",
      }}
      backgroundStyle={{
        backgroundColor: color || colors.musicPlayerBg,
      }}
      handleHeight={20}
      handleStyle={{
        position: "absolute",
        height: 20,
      }}
      snapPoints={[155, '100%']}
      ref={bottomSheetRef}
      index={Index}
      onChange={handleSheetChanges}
    >
      <BottomSheetView
        style={{
          ...styles.contentContainer,
        }}
      >
        {Index !== 1 ? (
          <MinimizedMusic
            setIndex={updateIndex}
            color="transparent"
            loadingSong={loadingSong}
          />
        ) : (
          <FullScreenMusic
            color={color || colors.musicPlayerBg}
            Index={Index}
            setIndex={updateIndex}
          />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default BottomSheetMusic;
