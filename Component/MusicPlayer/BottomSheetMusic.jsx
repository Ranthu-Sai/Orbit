import React, { useCallback, useContext, useEffect, useRef } from "react";
import { BackHandler, StyleSheet, Text } from "react-native";
import BottomSheet, { BottomSheetView } from "@gorhom/bottom-sheet";
import { MinimizedMusic } from "./MinimizedMusic";
import { FullScreenMusic } from "./FullScreenMusic";
import Context from "../../Context/Context";
import { useNavigation, useTheme } from "@react-navigation/native";

const BottomSheetMusic = ({ color }) => {
  const bottomSheetRef = useRef(null);
  const { Index, setIndex, previousScreen, musicPreviousScreen } =
    useContext(Context);
  const navigation = useNavigation();
  const { colors } = useTheme();

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

  const handleSheetChanges = useCallback((index) => {
    if (index < 0) {
      setIndex(0);
    } else {
      setIndex(index);
    }
  }, []);

  const updateIndex = useCallback((index) => {
    setIndex(index);
  }, []);

  return (
      <BottomSheet
        enableContentPanningGesture={false}
         detached={false}
         enableOverDrag={false}
         handleIndicatorStyle={{
        height:0,
        width:0,
        position:"absolute",
        backgroundColor:"rgba(0,0,0,0)",
      }}
        backgroundStyle={{
          backgroundColor: color || colors.musicPlayerBg,
        }}
        // handleComponent={props => <MinimizedMusic  setIndex={updateIndex} color={color}/>}
        handleHeight={5}
        handleStyle={{
          position:"absolute",
        }}
        snapPoints={[155, '100%']}
        ref={bottomSheetRef}
         index={Index}
        onChange={handleSheetChanges}>
        <BottomSheetView  style={{
          ...styles.contentContainer,
          backgroundColor: color || colors.musicPlayerBg,
        }}
      >
        {Index !== 1 && (
          <MinimizedMusic setIndex={updateIndex} color={colors.musicPlayerBg} />
        )}
        {Index === 1 && (
          <FullScreenMusic
            color={color || colors.musicPlayerBg}
            Index={Index}
            setIndex={updateIndex}
          />
        )}
      </BottomSheetView>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    flex: 1,
  },
});

export default BottomSheetMusic;
