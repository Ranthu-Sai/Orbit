import { MainWrapper } from "../Layout/MainWrapper";
import Animated, { useAnimatedRef } from "react-native-reanimated";
import { PlaylistTopHeader } from "../Component/Playlist/PlaylistTopHeader";
import { View, BackHandler, Pressable, ActivityIndicator, StyleSheet, Dimensions, Text } from "react-native";
import { EachSongCard } from "../Component/Global/EachSongCard";
import { useEffect, useState, useCallback } from "react";
import { getPlaylistData } from "../Api/Playlist";
import { LoadingComponent } from "../Component/Global/Loading";
import { PlainText } from "../Component/Global/PlainText";
import { SmallText } from "../Component/Global/SmallText";
import FormatArtist from "../Utils/FormatArtists";
import { useNavigation, CommonActions, useTheme } from "@react-navigation/native";
import { Spacer } from "../Component/Global/Spacer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";

// AsyncStorage keys
const CURRENT_PLAYLIST_ID_KEY = "orbit_current_playlist_id";
const CURRENT_PLAYLIST_DATA_KEY = "orbit_current_playlist_data";
const CURRENT_ALBUM_ID_KEY = "orbit_current_album_id";
const CURRENT_ALBUM_DATA_KEY = "orbit_current_album_data";

// Add this truncate function
const truncateText = (text, limit = 22) => {
  if (!text) return '';
  return text.length > limit ? text.substring(0, limit) + '...' : text;
};

// Helper to ensure URL is a string
const ensureStringUrl = (url) => {
  if (!url) return '';

  // If it's already a string, return it
  if (typeof url === 'string') return url;

  // If it's an array, try to extract URL from it
  if (Array.isArray(url)) {
    for (const item of url) {
      if (typeof item === 'string' && item.trim() !== '') {
        return item;
      }
      if (item && typeof item === 'object' && item.url) {
        return item.url;
      }
    }
    return '';
  }

  // If it's an object with url property
  if (url && typeof url === 'object' && url.url) {
    return url.url;
  }

  return '';
};

// Helper to validate download URL object with fallbacks
const getValidDownloadUrl = (downloadUrl, index = 2) => {
  try {
    // If downloadUrl is an array, get the specified index
    if (Array.isArray(downloadUrl) && downloadUrl.length > index) {
      const urlObj = downloadUrl[index];
      // Ensure we're getting a string URL from the object
      if (urlObj && typeof urlObj === 'object' && typeof urlObj.url === 'string') {
        return urlObj.url;
      }
    }

    // Return empty string if it doesn't match expected format
    return '';
  } catch (error) {
    console.log('Error parsing download URL:', error);
    return '';
  }
};

// Helper to validate and ensure valid image URL
const getValidImageUrl = (url) => {
  // Handle null, undefined, or invalid values
  if (!url || url === 'null' || url === 'undefined') {
    return '';
  }

  // If it's already a string, return it
  if (typeof url === 'string') {
    return url;
  }

  // If it's an array, try to extract URL from it
  if (Array.isArray(url)) {
    // Try to find a valid URL in the array
    for (const item of url) {
      if (typeof item === 'string' && item.trim() !== '') {
        return item;
      }
      if (item && typeof item === 'object' && item.url) {
        return item.url;
      }
    }
    return '';
  }

  // If it's an object with url property
  if (url && typeof url === 'object' && url.url) {
    return url.url;
  }

  // Default fallback
  return '';
};

// Helper to format artist data properly, avoiding [object Object] display
const formatArtistData = (artistData) => {
  // If it's already a string, return it
  if (typeof artistData === 'string') return artistData;

  // If it's an array, use the FormatArtist function
  if (Array.isArray(artistData)) return FormatArtist(artistData);

  // If it's an object with a primary property that's an array
  if (artistData && artistData.primary && Array.isArray(artistData.primary)) {
    return FormatArtist(artistData.primary);
  }

  // If it's an object with a name property
  if (artistData && artistData.name) return artistData.name;

  // Default fallback
  return "Unknown Artist";
};

export const Playlist = ({ route }) => {
  const AnimatedRef = useAnimatedRef();
  const [Loading, setLoading] = useState(true);
  const [Data, setData] = useState({});
  const navigation = useNavigation();
  const { width, height } = Dimensions.get('window');
  const theme = useTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  // Safely destructure route.params with default values
  const { id: routeId, image: routeImage, name: routeName, follower: routeFollower, navigationSource: routeNavigationSource } = route?.params || {};

  // State to hold the actual ID we'll use (either from route or storage)
  const [id, setId] = useState(routeId);
  const [image, setImage] = useState(routeImage);
  const [name, setName] = useState(routeName);
  const [follower, setFollower] = useState(routeFollower);
  // Add source tracking
  const [source, setSource] = useState(route?.params?.source || null);
  const [navigationSource, setNavigationSource] = useState(routeNavigationSource || null);

  // Memoized fetch function for playlist data to reduce API calls
  const fetchPlaylistData = useCallback(async () => {
    try {
      // Only fetch if id is defined
      if (!id) {
        console.log("No playlist ID available in fetchPlaylistData");
        setLoading(false);
        return;
      }

      console.log(`Fetching playlist data for ID: ${id}`);
      setLoading(true);
      let data = {};
      data = await getPlaylistData(id);

      setData(data);

      // If we successfully got playlist data, update the stored information
      if (data?.data) {
        const updatedPlaylistData = {
          id: id,
          image: image || data?.data?.image?.[2]?.url || '',
          name: data?.data?.name || name || 'Playlist',
          follower: data?.data?.follower || follower || '',
          source: source || null,
          searchText: route?.params?.searchText || '',
          language: route?.params?.language || '',
          navigationSource: navigationSource || null
        };

        await AsyncStorage.setItem(CURRENT_PLAYLIST_DATA_KEY, JSON.stringify(updatedPlaylistData));
      }
    } catch (e) {
      console.error(`Error fetching playlist with ID ${id}:`, e.message);
    } finally {
      setLoading(false);
    }
  }, [id, image, name, follower, source, navigationSource, route?.params]);

  // When component mounts, check if we have a route ID - if not, try to recover from AsyncStorage
  useEffect(() => {
    const recoverPlaylistData = async () => {
      try {
        if (routeId) {
          // If we have an ID from route params, clear previous data and use the new ones
          console.log(`New playlist selected: ${routeId}, clearing previous playlist data cache`);

          setId(routeId);
          setImage(routeImage || '');
          setName(routeName || 'Playlist');
          setFollower(routeFollower || '');
          setSource(route?.params?.source || null);
          setNavigationSource(routeNavigationSource || null);

          // Store the new playlist data
          const playlistData = {
            id: routeId,
            image: routeImage || '',
            name: routeName || 'Playlist',
            follower: routeFollower || '',
            source: route?.params?.source || null,
            searchText: route?.params?.searchText || null,
            language: route?.params?.language || null,
            navigationSource: routeNavigationSource || null
          };

          await AsyncStorage.setItem(CURRENT_PLAYLIST_ID_KEY, routeId);
          await AsyncStorage.setItem(CURRENT_PLAYLIST_DATA_KEY, JSON.stringify(playlistData));
          console.log(`Stored new playlist data for: ${routeId}`);

        } else {
          console.log('No playlist ID in route params, attempting to recover from storage');

          // Try to get stored playlist ID as fallback
          const storedId = await AsyncStorage.getItem(CURRENT_PLAYLIST_ID_KEY);

          if (storedId) {
            console.log(`Recovered playlist ID from storage: ${storedId}`);
            setId(storedId);

            // Try to get the full playlist data
            const storedDataStr = await AsyncStorage.getItem(CURRENT_PLAYLIST_DATA_KEY);
            if (storedDataStr) {
              try {
                const storedData = JSON.parse(storedDataStr);
                setImage(storedData.image || '');
                setName(storedData.name || 'Playlist');
                setFollower(storedData.follower || '');
                setSource(storedData.source || null);
                setNavigationSource(storedData.navigationSource || null);
                console.log('Successfully recovered playlist data from storage');
              } catch (parseError) {
                console.error('Error parsing stored playlist data:', parseError);
              }
            }
          } else {
            console.log('No playlist ID found in storage, navigating back to home');
            navigation.navigate('Home', { screen: 'HomePage' });
            return;
          }
        }

        // After setting up the ID (either from route or storage), fetch the playlist data
        fetchPlaylistData();

      } catch (e) {
        console.error('Error recovering playlist data:', e);
        navigation.navigate('Home', { screen: 'HomePage' });
      }
    };

    recoverPlaylistData();

    // Set up back handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
    };
  }, [routeId, routeImage, routeName, routeFollower, routeNavigationSource, fetchPlaylistData, navigation]);

  // Function to handle back button press
  const handleBackPress = async () => {
    // Clear navigation data when leaving the playlist
    try {
      await AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY);
      await AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY);
    } catch (error) {
      console.log("Error clearing playlist navigation data:", error);
    }

    // Get the source and navigation source parameters from the route
    const source = route.params?.source;
    const navigationSource = route.params?.navigationSource;
    const previousScreen = route.params?.previousScreen;

    console.log(`Back pressed in Playlist. Source: ${source}, NavigationSource: ${navigationSource}, PreviousScreen: ${previousScreen}`);

    // Priority 1: Check for previousScreen parameter (used for specific flows)
    if (previousScreen === 'LikedPlaylists') {
      console.log("Navigating back to LikedPlaylists from playlist view");
      navigation.navigate("Library", {
        screen: "LikedPlaylists",
        params: {
          refresh: Date.now() // Pass timestamp to ensure refresh
        }
      });
      return true;
    }

    // Priority 2: Check if we came from a Home screen
    if (previousScreen === 'Home' || previousScreen === 'HomePage' || navigationSource === 'Home') {
      console.log("Forcefully resetting navigation to Home screen");

      // Use CommonActions.reset to clear the navigation stack and force navigation to Home
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            { name: 'Home' },
          ],
        })
      );
      return true;
    }

    // Priority 3: Check specific source screens
    if (source === "ShowPlaylistofType") {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "ShowPlaylistofType",
              params: {
                language: route.params?.language,
                name: route.params?.name,
              }
            },
          ],
        })
      );
      return true;
    }

    if (source === "LanguageDetail") {
      navigation.dispatch(
        CommonActions.reset({
          index: 0,
          routes: [
            {
              name: "LanguageDetail",
              params: {
                language: route.params?.language,
              }
            },
          ],
        })
      );
      return true;
    }

    if (source === "Search") {
      try {
        navigation.goBack();
      } catch {
        navigation.dispatch(
          CommonActions.reset({
            index: 0,
            routes: [
              {
                name: "Search",
                params: {
                  searchText: route.params?.searchText,
                }
              },
            ],
          })
        );
      }
      return true;
    }

    // Priority 4: Handle navigation based on navigationSource
    if (navigationSource) {
      try {
        // Reset navigation to appropriate tab
        if (navigationSource === "Home") {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          );
        } else if (navigationSource === "Library") {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Library" }],
            })
          );
        } else if (navigationSource === "Search") {
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Search" }],
            })
          );
        } else {
          // For other cases, reset to home as fallback
          navigation.dispatch(
            CommonActions.reset({
              index: 0,
              routes: [{ name: "Home" }],
            })
          );
        }
        return true;
      } catch (error) {
        console.log("Error navigating based on navigationSource:", error);
      }
    }

    // Default fallback: just reset to Home
    console.log("Using fallback reset to Home");
    navigation.dispatch(
      CommonActions.reset({
        index: 0,
        routes: [{ name: "Home" }],
      })
    );
    return true;
  };

  // If no ID is provided, show an error message
  if (!id) {

    return (
      <MainWrapper>
        <View style={styles.errorContainer}>
          <PlainText text={"Playlist not available"} />
          <SmallText text={"No playlist ID found"} />
          <Spacer height={20} />
          <Pressable
            onPress={() => {
              if (navigation.canGoBack()) {
                navigation.goBack();
              } else {
                navigation.navigate('MainRoute', { screen: 'Home' });
              }
            }}
            style={styles.goBackButton}
            android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
          >
            <PlainText text="Go Back" />
          </Pressable>
        </View>
      </MainWrapper>
    );
  }

  return (
    <MainWrapper>
      {Loading && <LoadingComponent loading={Loading} />}
      {!Loading && (!Data?.data?.songs || Data?.data?.songs?.length === 0) && (
        <View style={styles.emptyContainer}>
          <PlainText text="Playlist is empty or not available" style={styles.centeredText} />
          <SmallText text="Please try another playlist or check your connection" style={styles.centeredText} />
        </View>
      )}
      {!Loading && Data?.data?.songs && Data?.data?.songs?.length > 0 && (
        <Animated.ScrollView
          scrollEventThrottle={16}
          ref={AnimatedRef}
          contentContainerStyle={{
            paddingBottom: 120,
            backgroundColor: theme.dark ? theme.colors.background : "#FFFFFF",
          }}
          style={{
            backgroundColor: 'transparent', // Keep transparent to allow header background to show
          }}
        >
          <PlaylistTopHeader
            AnimatedRef={AnimatedRef}
            url={image || getValidImageUrl(ensureStringUrl(Data?.data?.songs[0]?.images?.[2]?.url || Data?.data?.songs[0]?.image?.[2]?.url))}
            playlistId={id ? id.replace('album_', '') : id}
            name={name || Data?.data?.name || "Playlist"}
            follower={follower || Data?.data?.follower || ""}
            style={{ position: 'relative' }}
            // New props for details display
            detailsName={truncateText(name || Data?.data?.name || "Playlist")}
            songsData={Data?.data?.songs}
            contentIdForPlayer={id} // Assuming 'id' is the playlistId for the player
            playerLoading={Loading} // Placeholder: Replace with actual player loading state if different
            isPlayingState={false} // Placeholder: Replace with actual isPlaying state
            onPlayPress={() => console.log('Play pressed - Placeholder')} // Placeholder: Replace with actual handlePlayPause function
            isAlbumScreen={false}
            releaseYear={null}
          />

          <View style={[styles.songsContainer, { backgroundColor: theme.dark ? 'rgb(16,16,16)' : '#FFFFFF' }]}>
            {Data?.data?.songs?.slice(0, 1000).map((e, i) => {
              // Process artist data to avoid [object Object] display
              const artistData = e?.artists || e?.primary_artists;
              const formattedArtist = formatArtistData(artistData);

              // Get proper image URL - handle both array and direct URL formats
              let imageUrl = '';
              if (e?.image) {
                if (Array.isArray(e.image)) {
                  // If it's an array, get the highest quality (last item or index 2)
                  const imageItem = e.image[2] || e.image[e.image.length - 1] || e.image[0];
                  imageUrl = imageItem?.url || imageItem?.link || '';
                } else if (typeof e.image === 'string') {
                  imageUrl = e.image;
                }
              }

              // Fallback to images property if image is not available
              if (!imageUrl && e?.images && Array.isArray(e.images)) {
                const imageItem = e.images[2] || e.images[e.images.length - 1] || e.images[0];
                imageUrl = imageItem?.url || imageItem?.link || '';
              }

              // Final validation
              imageUrl = getValidImageUrl(imageUrl);

              // Get download URL properly for menu options
              const downloadUrlData = e?.downloadUrl || e?.download_url;

              return (
                <EachSongCard
                  isFromPlaylist={true}
                  Data={Data}
                  index={i}
                  artist={formattedArtist}
                  language={e?.language}
                  artistID={e?.artist_id || e?.primary_artists_id}
                  key={`song-${i}-${e?.id}`}
                  duration={e?.duration}
                  image={imageUrl}
                  id={e?.id}
                  url={downloadUrlData}
                  title={truncateText(e?.song || e?.name, 22)} // Update to 22 chars to match other truncations
                  source={e?.source || 'saavn'}
                  style={styles.songCard}
                  showNumber={true} // Explicitly show numbers in playlist view
                  activeTrackId={activeTrack?.id}
                  isPlaying={playbackState.state === "playing" || playbackState.state === 3} // Handle both string and enum
                />
              );
            })}
            {Data?.data?.songs?.length > 100 && (
              <View style={{ padding: 20, alignItems: 'center' }}>
                <Text style={{ color: theme.colors.text, opacity: 0.6 }}>
                  Showing first 100 songs of {Data.data.songs.length}
                </Text>
              </View>
            )}
            {/* Add view to hide the "No music" player at bottom */}
            <View style={styles.bottomSpacer} />
          </View>
        </Animated.ScrollView>
      )}
    </MainWrapper>
  );
};

// Move styles to StyleSheet for better performance
const styles = StyleSheet.create({
  errorContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  goBackButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    padding: 10,
    borderRadius: 5
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20
  },
  centeredText: {
    textAlign: 'center'
  },
  scrollViewContent: {
    backgroundColor: "transparent",
  },
  songsContainer: {
    paddingHorizontal: 15,
    paddingTop: 15, // Added top padding for space below header
    backgroundColor: "transparent",
    gap: 8,
    paddingBottom: 5,
  },
  songCard: {
    marginBottom: 15,
    borderRadius: 8,
    elevation: 2,
  },
  bottomSpacer: {
    height: 60, // Reduced from 100 to 60
    backgroundColor: "transparent",
  }
});
