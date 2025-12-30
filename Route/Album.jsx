import { MainWrapper } from "../Layout/MainWrapper";
import { AlbumHeader } from "../Component/Album/AlbumHeader";
import { View, BackHandler, Text, FlatList, StyleSheet } from "react-native";
import { EachSongCard } from "../Component/Global/EachSongCard";
import { useEffect, useState, useCallback, useContext } from "react";
import { DetailSkeletonLoader } from "../Component/Global/DetailSkeletonLoader";
import { useTheme, useNavigation, useFocusEffect } from "@react-navigation/native";
import { PlainText } from "../Component/Global/PlainText";
import { SmallText } from "../Component/Global/SmallText";
import { getAlbumData } from "../Api/Album";
import { getYTMusicAlbumData } from "../Api/YTMusic";
import { SpotifyService } from "../Utils/SpotifyService";

import FormatArtist from "../Utils/FormatArtists";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";
import Context from "../Context/Context";



// AsyncStorage keys
const CURRENT_ALBUM_ID_KEY = "orbit_current_album_id";
const CURRENT_ALBUM_DATA_KEY = "orbit_current_album_data";
const CURRENT_PLAYLIST_ID_KEY = "orbit_current_playlist_id";
const CURRENT_PLAYLIST_DATA_KEY = "orbit_current_playlist_data";



// Utility function to validate image URLs
const getValidImageUrl = (url) => {
  if (!url || url === 'null' || url === 'undefined') {
    // Return a default image if URL is null/undefined
    return 'https://example.com/default.jpg'; // Replace with a valid default image URL
  }
  return url;
};

export const Album = ({ route }) => {
  const theme = useTheme();
  const [Loading, setLoading] = useState(true);
  const [Data, setData] = useState({});
  const [dataFetchAttempted, setDataFetchAttempted] = useState(false);
  const navigation = useNavigation();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  // Get context for FullScreen navigation handling
  const { fullScreenNavigationTarget, setFullScreenNavigationTarget, setIndex } = useContext(Context);

  // Safely destructure route.params with default values
  const routeId = route?.params?.id;
  const returnToFullScreen = route?.params?.returnToFullScreen || false;

  // State to hold the actual ID we'll use (either from route or storage)
  const [id, setId] = useState(routeId);
  const [source, setSource] = useState(route?.params?.source || null);

  // Handle back navigation - return to FullScreenMusic if we came from there
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        // Check if we should return to FullScreenMusic
        if (returnToFullScreen || fullScreenNavigationTarget === 'Album') {
          console.log('[Album] Returning to FullScreenMusic');
          // Clear the navigation target
          setFullScreenNavigationTarget(null);

          // CRITICAL: First go back in navigation stack to remove Album
          if (navigation.canGoBack()) {
            navigation.goBack();
          }

          // Then reopen FullScreenMusic
          setTimeout(() => {
            setIndex(1);
          }, 50);

          return true; // Prevent default back behavior
        }

        // Check if we came from favorites
        if (source === 'favorites') {
          console.log('[Album] Returning to Favorites');
          navigation.navigate('Library', { screen: 'Favorites' });
          return true; // Prevent default back behavior
        }

        return false; // Let default back behavior happen
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [returnToFullScreen, fullScreenNavigationTarget, setFullScreenNavigationTarget, setIndex, navigation, source])
  );



  // When component mounts, check if we have a route ID - if not, try to recover from AsyncStorage
  useEffect(() => {
    const recoverAlbumData = async () => {
      try {
        if (routeId) {
          // Clear any previous album data if we have a new album ID
          console.log(`New album selected: ${routeId}, clearing previous album data cache`);
          setId(routeId);
          setSource(route?.params?.source || null);

          // Store the new album ID and data
          await AsyncStorage.setItem(CURRENT_ALBUM_ID_KEY, routeId);
          const albumData = {
            id: routeId,
            source: route?.params?.source || null,
            language: route?.params?.language || null,
            searchText: route?.params?.searchText || null
          };
          await AsyncStorage.setItem(CURRENT_ALBUM_DATA_KEY, JSON.stringify(albumData));
          console.log(`Stored new album ID and data for: ${routeId}`);

        } else {
          console.log('No album ID in route params, attempting to recover from storage');

          // Try to get stored album ID as fallback
          const storedId = await AsyncStorage.getItem(CURRENT_ALBUM_ID_KEY);

          if (storedId) {
            console.log(`Recovered album ID from storage: ${storedId}`);
            setId(storedId);

            // Try to get the full album data
            const storedDataStr = await AsyncStorage.getItem(CURRENT_ALBUM_DATA_KEY);
            if (storedDataStr) {
              try {
                const storedData = JSON.parse(storedDataStr);
                setSource(storedData.source || null);
                console.log('Successfully recovered album data from storage');
              } catch (parseError) {
                console.error('Error parsing stored album data:', parseError);
              }
            }
          } else {
            console.log('No stored album ID found, navigating back to safe screen');
            // Navigate to a safe screen if we can't recover data
            navigation.navigate('Home', { screen: 'HomePage' });
          }
        }
      } catch (error) {
        console.error('Error recovering album data:', error);
      }
    };

    recoverAlbumData();
  }, [routeId, route?.params?.source, route?.params?.language, route?.params?.searchText, navigation]);



  // Clean up AsyncStorage when leaving album
  const cleanupAlbumData = async () => {
    try {
      await Promise.all([
        AsyncStorage.removeItem(CURRENT_PLAYLIST_ID_KEY),
        AsyncStorage.removeItem(CURRENT_PLAYLIST_DATA_KEY),
        AsyncStorage.removeItem(CURRENT_ALBUM_ID_KEY),
        AsyncStorage.removeItem(CURRENT_ALBUM_DATA_KEY)
      ]);
      console.log('Cleared all navigation data from AsyncStorage when leaving album');
    } catch (error) {
      console.error('Error clearing navigation data:', error);
    }
  };

  const fetchAlbumData = async (albumId) => {
    if (!albumId) {
      console.error("Album ID is missing from route params");
      // Navigate back to prevent errors with fallback
      if (navigation.canGoBack()) {
        navigation.goBack();
      } else {
        navigation.navigate('MainRoute', { screen: 'Home' });
      }
      return;
    }

    try {
      setLoading(true);
      let response;
      if (source === 'ytmusic') {
        response = await getYTMusicAlbumData(albumId);
      } else if (source === 'spotify') {
        // Fetch from Spotify API
        const spotifyData = await SpotifyService.getAlbum(albumId);
        // Transform to match expected data structure
        response = {
          success: true,
          data: {
            id: spotifyData.id,
            name: spotifyData.name,
            year: spotifyData.year,
            image: [{ url: spotifyData.image }, { url: spotifyData.image }, { url: spotifyData.image }],
            songs: spotifyData.tracks.map(track => ({
              id: track.spotifyId,
              spotifyId: track.spotifyId,
              name: track.title,
              song: track.title,
              title: track.title,
              duration: track.duration,
              artist: track.artist, // String format for playback/search
              artists: { primary: [{ name: track.artist }] }, // Display format
              primaryArtists: track.artist, // For FormatArtist compatibility
              image: [{ url: track.artwork }, { url: track.artwork }, { url: track.artwork }],
              artwork: track.artwork, // Direct artwork URL
              source: 'spotify'
            }))
          }
        };
      } else {
        response = await getAlbumData(albumId);
      }
      setData(response);

      // Store the album data and ID for recovery
      try {
        const albumDataToStore = {
          id: albumId,
          source: route?.params?.source || null,
          language: route?.params?.language || null,
          searchText: route?.params?.searchText || null
        };
        await AsyncStorage.setItem(CURRENT_ALBUM_ID_KEY, albumId);
        await AsyncStorage.setItem(CURRENT_ALBUM_DATA_KEY, JSON.stringify(albumDataToStore));
        console.log("Album data saved to AsyncStorage");
      } catch (storageError) {
        console.error("Failed to save album data to storage:", storageError);
      }

    } catch (error) {
      console.error("Error fetching album data:", error);
    } finally {
      setLoading(false);
      setDataFetchAttempted(true);
    }
  };

  // Effect to fetch data when the component mounts or id changes
  useEffect(() => {
    if (id) {
      fetchAlbumData(id);
    }
  }, [id]);

  // Cleanup when component unmounts
  useEffect(() => {
    return () => {
      cleanupAlbumData();
    };
  }, []);

  // Get songs array (handle both songs and tracks)
  const songsArray = Data?.data?.songs || Data?.data?.tracks || [];

  // Render item for FlatList
  const renderSongItem = useCallback(({ item: e, index: i }) => {
    // Get proper image URL - handle both array and direct URL formats
    let imageUrl = '';
    if (e?.image) {
      if (Array.isArray(e.image)) {
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

    return (
      <EachSongCard
        isFromPlaylist={true}
        isFromAlbum={true}
        Data={Data}
        index={i}
        artist={FormatArtist(e?.artists?.primary)}
        language={e?.language}
        playlist={true}
        artistID={e?.primary_artists_id}
        duration={e?.duration}
        image={imageUrl}
        id={e?.id}
        width={"100%"}
        title={e?.name}
        url={e?.downloadUrl}
        source={e?.source || 'saavn'}
        style={styles.songCard}
        showNumber={true}
        activeTrackId={activeTrack?.id}
        isPlaying={playbackState.state === "playing" || playbackState.state === 3}
      />
    );
  }, [Data, activeTrack?.id, playbackState.state]);

  // Key extractor for FlatList
  const keyExtractor = useCallback((item, index) => `album-song-${item?.id || index}-${index}`, []);

  // Header component for FlatList
  const renderHeader = useCallback(() => (
    <AlbumHeader
      imageUrl={Data?.data?.image?.[2]?.url || Data?.data?.image?.[0]?.url || ''}
      title={Data?.data?.name || "Album"}
      songCount={songsArray.length}
      albumId={Data?.data?.id || route?.params?.id}
      year={Data?.data?.year || ""}
      songsData={songsArray}
      albumData={Data}
    />
  ), [Data, songsArray, route?.params?.id]);

  // Footer component for FlatList
  const renderFooter = useCallback(() => (
    <View style={styles.bottomSpacer} />
  ), []);

  return (
    <MainWrapper>
      {Loading &&
        <DetailSkeletonLoader type="album" />}
      {!Loading && dataFetchAttempted && !(Data?.data?.songs?.length || Data?.data?.tracks?.length) && (
        <View style={{
          flex: 1,
          justifyContent: 'center',
          alignItems: 'center',
          paddingHorizontal: 20
        }}>
          <PlainText text="Album not found or no songs available" style={{ textAlign: 'center' }} />
          <SmallText text="Please check your connection and try again" style={{ textAlign: 'center' }} />
        </View>
      )}
      {!Loading && (Data?.data?.songs?.length > 0 || Data?.data?.tracks?.length > 0) &&
        <View style={{ flex: 1, backgroundColor: theme.dark ? theme.colors.background : '#FFFFFF' }}>
          <FlatList
            data={Data?.data?.songs || Data?.data?.tracks}
            renderItem={renderSongItem}
            keyExtractor={keyExtractor}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderFooter}
            contentContainerStyle={{
              paddingBottom: 120,
              backgroundColor: theme.dark ? theme.colors.background : "#FFFFFF",
            }}
            style={{
              backgroundColor: theme.dark ? theme.colors.background : '#FFFFFF',
            }}
            initialNumToRender={10}
            maxToRenderPerBatch={10}
            windowSize={5}
            removeClippedSubviews={true}
            showsVerticalScrollIndicator={true}
          />
        </View>
      }
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  songCard: {
    marginBottom: 0,
    borderRadius: 0,
    marginRight: 0
  },
  bottomSpacer: {
    height: 65,
    backgroundColor: "transparent",
  },
  footerText: {
    padding: 20,
    alignItems: 'center'
  }
});
