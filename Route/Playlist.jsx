import { MainWrapper } from "../Layout/MainWrapper";
import { PlaylistHeader } from "../Component/Playlist/PlaylistHeader";
import { View, BackHandler, Pressable, ActivityIndicator, StyleSheet, Dimensions, Text, ScrollView, FlatList } from "react-native";
import { EachSongCard } from "../Component/Global/EachSongCard";
import { useEffect, useState, useCallback, useRef } from "react";
import { getPlaylistData } from "../Api/Playlist";
import { getYTMusicPlaylistData } from "../Api/YTMusic";
import { SpotifyService } from "../Utils/SpotifyService";
import { DetailSkeletonLoader } from "../Component/Global/DetailSkeletonLoader";
import { PlainText } from "../Component/Global/PlainText";
import { SmallText } from "../Component/Global/SmallText";
import FormatArtist from "../Utils/FormatArtists";
import { useNavigation, CommonActions, useTheme } from "@react-navigation/native";
import { Spacer } from "../Component/Global/Spacer";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GetLikedPlaylist, SetLikedPlaylist } from "../LocalStorage/StoreLikedPlaylists";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";
import { EachSongMenuModal } from "../Component/Global/EachSongMenuModal";
import { CacheManager } from '../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS, generateCacheKey } from '../Utils/CacheConfig';

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

export const Playlist = ({ route, id: propId, name: propName, image: propImage, follower: propFollower, source: propSource, onBackPress: propOnBackPress, isEmbedded = false }) => {
  const [Loading, setLoading] = useState(true);
  const [Data, setData] = useState({});
  const navigation = useNavigation();
  const { width, height } = Dimensions.get('window');
  const theme = useTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  // Safely destructure route.params with default values
  const { id: routeId, image: routeImage, name: routeName, follower: routeFollower, navigationSource: routeNavigationSource } = route?.params || {};

  // Prioritize props over route params (for embedded mode)
  const [id, setId] = useState(propId || routeId);
  const [image, setImage] = useState(propImage || routeImage);
  const [name, setName] = useState(propName || routeName);
  const [follower, setFollower] = useState(propFollower || routeFollower);
  // Add source tracking
  const [source, setSource] = useState(propSource || route?.params?.source || null);
  const [navigationSource, setNavigationSource] = useState(routeNavigationSource || null);

  // Track mount state
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // CACHE-FIRST LOADING: Memoized fetch function for playlist data
  const fetchPlaylistData = useCallback(async (forceRefresh = false) => {
    if (!isMounted.current) return;

    try {
      // Only fetch if id is defined
      if (!id) {
        setLoading(false);
        return;
      }

      const cacheKey = generateCacheKey(CACHE_KEYS.PLAYLIST, id);

      // Step 1: SYNC RAM CHECK (Instant - prevents loading flash)
      if (!forceRefresh) {
        const ramData = CacheManager.get(cacheKey);
        if (ramData) {
          setData(ramData);
          setLoading(false);
          isInitialLoad.current = false;
          return; // EXIT - RAM hit
        }

        // Step 2: ASYNC DISK CHECK
        if (isInitialLoad.current) {
          setLoading(true);
        }

        const diskData = await CacheManager.getAsync(cacheKey);
        if (diskData) {
          setData(diskData);
          setLoading(false);
          isInitialLoad.current = false;
          return; // EXIT - Disk hit
        }
      }

      // Cache miss - show loading only on initial load
      if (isInitialLoad.current) {
        setLoading(true);
      }

      let data = {};

      // FIX: Use route.params.source directly to avoid React state timing issues
      const effectiveSource = route?.params?.source || propSource || source;

      if (effectiveSource === 'ytmusic') {
        data = await getYTMusicPlaylistData(id);
      } else if (effectiveSource === 'spotify') {
        // Fetch from Spotify API
        const spotifyData = await SpotifyService.getPlaylist(id);
        // Transform to match expected data structure
        data = {
          success: true,
          data: {
            id: spotifyData.id,
            name: spotifyData.name,
            description: spotifyData.description,
            image: [{ url: spotifyData.image }, { url: spotifyData.image }, { url: spotifyData.image }],
            follower: spotifyData.totalTracks + ' songs',
            songs: spotifyData.tracks.map(track => ({
              id: track.spotifyId,
              spotifyId: track.spotifyId,
              name: track.title,
              song: track.title,
              title: track.title,
              duration: track.duration,
              artist: track.artist, // String format for playback
              artists: track.artist, // Also as artists for display
              primaryArtists: track.artist, // For FormatArtist compatibility
              image: [{ url: track.artwork }, { url: track.artwork }, { url: track.artwork }],
              artwork: track.artwork, // Direct artwork URL
              source: 'spotify'
            }))
          }
        };
      } else {
        data = await getPlaylistData(id);
      }

      if (!isMounted.current) return;

      setData(data);

      // Cache the data with 10-minute TTL
      if (data?.data) {
        CacheManager.set(cacheKey, data, CACHE_TTL.PLAYLIST_DATA);

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

        // Update liked playlist follower if this playlist is liked (fixes stale description issue)
        if (data?.data?.follower && id) {
          try {
            const likedPlaylists = await GetLikedPlaylist();
            if (likedPlaylists?.playlist?.[id]) {
              const likedItem = likedPlaylists.playlist[id];
              // Only update if follower value has changed
              if (likedItem.follower !== data.data.follower) {
                await SetLikedPlaylist(
                  likedItem.image || image || data?.data?.image?.[2]?.url || '',
                  likedItem.name || data?.data?.name || name || 'Playlist',
                  data.data.follower,
                  id
                );
              }
            }
          } catch (likeErr) {
          }
        }
      }
    } catch (e) {
      console.error(`[Playlist] Error fetching ${id}:`, e.message);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        isInitialLoad.current = false;
      }
    }
  }, [id, image, name, follower, source, navigationSource, route?.params]);

  // When component mounts, check if we have a route ID - if not, try to recover from AsyncStorage
  useEffect(() => {
    // CRITICAL: Reset isMounted to true on each effect run
    // This fixes the bug where cleanup sets it to false, and when deps change,
    // the new effect run still has the stale false value
    isMounted.current = true;

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
        fetchPlaylistData(false);

      } catch (e) {
        console.error('Error recovering playlist data:', e);
        if (!isEmbedded) {
          navigation.navigate('Home', { screen: 'HomePage' });
        }
      }
    };

    // Only run recovery logic if not in embedded mode
    if (!isEmbedded) {
      recoverPlaylistData();
    } else {
      // In embedded mode, props are already set, just fetch data
      fetchPlaylistData(false);
    }

    // Set up back handler
    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);

    return () => {
      backHandler.remove();
      isMounted.current = false;
    };
  }, [routeId, routeImage, routeName, routeFollower, routeNavigationSource, fetchPlaylistData, navigation]);

  // Function to handle back button press
  const handleBackPress = async () => {
    // If embedded mode and custom back handler provided, use it
    if (isEmbedded && propOnBackPress) {
      propOnBackPress();
      return true;
    }

    // Clear navigation data when leaving the playlist
    try {
      await AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY);
      await AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY);
    } catch (error) {
      console.log("Error clearing playlist navigation data:", error);
    }

    // Get the source and navigation source parameters from the route
    const source = route?.params?.source;
    const navigationSource = route?.params?.navigationSource;
    const previousScreen = route?.params?.previousScreen;

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

  // State for long-press menu
  const [activeMenuSong, setActiveMenuSong] = useState({ visible: false });

  // Function to handle long press on song item
  const handleLongPress = useCallback((songData) => {
    console.log("🖱️ [Playlist] Long Press detected on:", songData?.title);
    setActiveMenuSong({
      ...songData,
      visible: true
    });
  }, []);

  // IMPORTANT: All hooks must be called unconditionally before any early returns
  // This is a React rule - hooks must be called in the same order on every render

  // Render item for FlatList to improve performance
  const renderSongItem = useCallback(({ item: e, index: i }) => {
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

    // Prepare song object for the menu
    const songForMenu = {
      title: e?.song || e?.name || e?.title,
      artist: formattedArtist,
      image: imageUrl,
      id: e?.id,
      url: downloadUrlData,
      duration: e?.duration,
      language: e?.language,
      artistID: e?.artist_id || e?.primary_artists_id,
      albumId: e?.album_id || e?.album?.id,
      source: e?.source || source || 'saavn',
      isLibraryLiked: false // Playlist songs technically aren't verified as "liked" here without extra check
    };

    return (
      <EachSongCard
        isFromPlaylist={true}
        Data={Data}
        index={i}
        artist={formattedArtist}
        language={e?.language}
        artistID={e?.artist_id || e?.primary_artists_id}
        duration={e?.duration}
        image={imageUrl}
        id={e?.id}
        url={downloadUrlData}
        title={truncateText(e?.song || e?.name, 22)}
        source={e?.source || source || 'saavn'}
        style={styles.songCard}
        showNumber={true}
        activeTrackId={activeTrack?.id}
        isPlaying={playbackState.state === "playing" || playbackState.state === 3}
        onLongPress={() => handleLongPress(songForMenu)}
      />
    );
  }, [Data, activeTrack?.id, playbackState.state, theme, handleLongPress, source]);

  // Header component for FlatList
  const renderHeader = useCallback(() => {
    const headerImageUrl = image ||
      Data?.data?.thumbnail ||
      (Array.isArray(Data?.data?.image) ? (Data.data.image[2]?.url || Data.data.image[Data.data.image.length - 1]?.url) : Data?.data?.image) ||
      Data?.data?.songs?.[0]?.image?.[2]?.url ||
      Data?.data?.songs?.[0]?.images?.[2]?.url ||
      '';

    return (
      <>
        <PlaylistHeader
          imageUrl={headerImageUrl}
          title={name || Data?.data?.name || "Playlist"}
          songCount={Data?.data?.songs?.length || 0}
          playlistId={id ? id.replace('album_', '') : id}
          follower={Data?.data?.follower || follower || ""}
          songsData={Data?.data?.songs}
          playlistData={Data}
        />
        <View style={{ height: 15 }} />
      </>
    );
  }, [image, Data, name, id, follower]);

  // key extractor
  const keyExtractor = useCallback((item, index) => `song-${item?.id || index}-${index}`, []);

  // If no ID is provided, show an error message
  // NOTE: This early return is placed AFTER all hooks to comply with React rules
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
      {Loading && <DetailSkeletonLoader type="playlist" />}
      {!Loading && (!Data?.data?.songs || Data?.data?.songs?.length === 0) && (
        <View style={styles.emptyContainer}>
          <PlainText text="Playlist is empty or not available" style={styles.centeredText} />
          <SmallText text="Please try another playlist or check your connection" style={styles.centeredText} />
        </View>
      )}
      {!Loading && Data?.data?.songs && Data?.data?.songs?.length > 0 && (
        <View style={{ flex: 1, backgroundColor: theme.dark ? theme.colors.background : '#FFFFFF' }}>
          <FlatList
            data={Data.data.songs}
            renderItem={renderSongItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderHeader}
            contentContainerStyle={{
              paddingBottom: 120,
              backgroundColor: theme.dark ? theme.colors.background : "#FFFFFF",
            }}
            style={{
              paddingHorizontal: 15,
              backgroundColor: "transparent",
            }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={true}
            ListFooterComponent={<View style={styles.bottomSpacer} />}
          />
        </View>
      )}

      {/* Long Press Menu Modal */}
      <EachSongMenuModal
        Visible={activeMenuSong}
        setVisible={setActiveMenuSong}
      />
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
    height: 65,
    backgroundColor: "transparent",
  }
});
