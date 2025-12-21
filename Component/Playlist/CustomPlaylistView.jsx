import React, { useContext, useState, useEffect, useRef, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, ScrollView, Pressable, ToastAndroid, Text, StatusBar, Image, BackHandler, InteractionManager, ActivityIndicator, FlatList } from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import TrackPlayer from 'react-native-track-player';
import { AddSongsToQueue, PlayOneSong, AddPlaylist } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';
import Modal from "react-native-modal";
import { GetCustomPlaylists, AddSongToCustomPlaylist, CreateCustomPlaylist } from '../../LocalStorage/CustomPlaylists';
import { StyleSheet } from 'react-native';
import { useNavigation, CommonActions, useFocusEffect, useTheme } from "@react-navigation/native";
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { PlainText } from '../Global/PlainText';
import { getUserPlaylists, clearPlaylistCache } from '../../Utils/PlaylistManager';
import { Animated } from 'react';
import { SmallText } from '../Global/SmallText';
import { CustomPlaylistPlay } from './CustomPlaylistPlay';
import { PlaylistHeader } from './PlaylistHeader';

// Default image constants moved outside component to prevent re-creation
const DEFAULT_MUSIC_IMAGE = require('../../Images/default.jpg');
const LOCAL_MUSIC_IMAGE = require('../../Images/Music.jpeg');

// Performance optimization: Create memoized styles outside component
const staticStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: StatusBar.currentHeight + 10,
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    marginLeft: 12,
    // color will be applied dynamically using theme
    flex: 1,
    fontWeight: '600',
  },
  coverContainer: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(255,255,255,0.1)',
  },
  playlistInfoSection: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  coverImage: {
    width: 120,
    height: 120,
    borderRadius: 4,
  },
  playlistInfoContainer: {
    flex: 1,
    marginLeft: 16,
    justifyContent: 'center',
  },
  playlistTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    // color: '#FFFFFF', // Applied dynamically
    marginBottom: 4,
    marginTop: 12,
    textAlign: 'left',
  },
  songCount: {
    fontSize: 14,
    // color: 'rgba(255,255,255,0.7)', // Applied dynamically
    marginBottom: 20,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    alignSelf: 'flex-start',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  playButtonText: {
    color: '#000000',
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
  songCard: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    // borderBottomColor: 'rgba(255,255,255,0.1)', // Applied dynamically
  },
  activeSongCard: {
    // backgroundColor: 'rgba(255,255,255,0.05)', // Applied dynamically
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  songInfo: {
    flex: 1,
    marginRight: 8,
  },
  songTitle: {
    fontSize: 16,
    // color: '#FFFFFF', // Applied dynamically
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 13,
    // color: 'rgba(255,255,255,0.7)', // Applied dynamically
  },
  songControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  menuButton: {
    padding: 6,
    backgroundColor: 'transparent',
    borderRadius: 16,
  },
  menuModal: {
    margin: 0,
    justifyContent: 'flex-end',
  },
  menuContainer: {
    // backgroundColor: '#1E1E1E', // Applied dynamically
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    padding: 16,
  },
  menuOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
  },
  menuText: {
    marginLeft: 16,
    // color: '#FFFFFF', // Applied dynamically
    fontSize: 16,
  },
  menuCancel: {
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    // borderTopColor: 'rgba(255,255,255,0.1)', // Applied dynamically
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be applied dynamically using theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // backgroundColor will be applied dynamically using theme
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    // color: '#FFFFFF', // Applied dynamically
    marginTop: 12,
    textAlign: 'center',
  },
});

export const CustomPlaylistView = (props) => {
  const theme = useTheme();
  const [Songs, setSongs] = useState([]);
  const [playlistName, setPlaylistName] = useState("");
  const [playlistId, setPlaylistId] = useState(null);
  const [isUserPlaylist, setIsUserPlaylist] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [menuVisible, setMenuVisible] = useState(false);
  const [selectedSong, setSelectedSong] = useState(null);
  const [showPlaylistModal, setShowPlaylistModal] = useState(false);
  const [availablePlaylists, setAvailablePlaylists] = useState({});
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [chunkLoading, setChunkLoading] = useState(true);
  const [visibleSongs, setVisibleSongs] = useState([]);
  const [currentPage, setCurrentPage] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const navigation = useNavigation();
  // const theme = useTheme(); // Already added in previous step
  const { Queue, setQueue, setCurrentPlaying, currentPlaying, updateTrack, isFullscreenPlayer } = useContext(Context);
  const initializationComplete = useRef(false);
  const chunkedRefs = useRef({});
  const flatListRef = useRef(null);
  const isMounted = useRef(true);

  // Constants for chunking - only load 20 songs at a time
  const CHUNK_SIZE = 20;

  // Clean up when component unmounts
  useEffect(() => {
    return () => {
      isMounted.current = false;
      chunkedRefs.current = {};
      // Clear any images that might be preloaded
      FastImage.clearMemoryCache();
      // Clear playlist cache to ensure fresh data next time
      clearPlaylistCache();
    };
  }, []);

  // Focus effect to reload component when it comes back into focus
  useFocusEffect(
    useCallback(() => {
      StatusBar.setBarStyle(theme.dark ? 'light-content' : 'dark-content');
      StatusBar.setBackgroundColor(theme.colors.background, true);
      InteractionManager.runAfterInteractions(() => {
        if (isMounted.current) {
          if (!initializationComplete.current) {
            initializePlaylist();
          }
        }
      });

      return () => {
        // No cleanup needed
      };
    }, [])
  );

  // Initialize playlist with optimized loading
  const initializePlaylist = async () => {
    if (!isMounted.current) return;

    setIsLoading(true);
    setChunkLoading(true);

    // Use a timeout to prevent blocking UI
    setTimeout(async () => {
      try {
        if (!isMounted.current) return;

        console.log('CustomPlaylistView initializing with route params:', props.route?.params);

        // First check navigation state for params
        const state = navigation.getState();
        let paramsFromState = null;

        if (state?.routes?.[0]?.params?.params?.screen === 'CustomPlaylistView') {
          paramsFromState = state.routes[0].params.params.params;
        }

        // Check if route and params exist
        if ((props.route && props.route.params) || paramsFromState) {
          // Get songs data - prioritize route params, then navigation state
          const songs = props.route?.params?.songs || paramsFromState?.songs || [];

          // Get playlist name
          const name = props.route?.params?.playlistName ||
            props.route?.params?.name ||
            paramsFromState?.playlistName ||
            paramsFromState?.name ||
            "Custom Playlist";

          // Get and store playlist ID if available
          const id = props.route?.params?.playlistId || paramsFromState?.playlistId || null;

          // Check if this is a user playlist from the PlaylistManager
          const userPlaylist = (id && id.startsWith('playlist_'));

          if (!isMounted.current) return;

          // Use batched updates
          setSongs(songs);
          setPlaylistName(name);
          setPlaylistId(id);
          setIsUserPlaylist(userPlaylist);

          console.log(`CustomPlaylistView loaded with ${songs.length} songs and name: ${name}, ID: ${id}`);

          // Load first chunk of songs
          loadSongChunk(songs, 0);

          // Store playlist data for recovery in background
          setTimeout(() => {
            if (isMounted.current) {
              storeCurrentPlaylist(name, songs, id).catch(err =>
                console.error('Error storing playlist:', err)
              );
            }
          }, 500);
        } else {
          console.log('No route params available, using default values');
          setSongs([]);
          setPlaylistName("Custom Playlist");

          // Try to recover from AsyncStorage
          setTimeout(() => {
            if (isMounted.current) {
              recoverPlaylistDataFromStorage().catch(err =>
                console.error('Error recovering playlist data:', err)
              );
            }
          }, 500);
        }
      } catch (error) {
        console.error('Error initializing CustomPlaylistView:', error);

        if (isMounted.current) {
          // Set defaults on error
          setSongs([]);
          setPlaylistName("Custom Playlist");
          setVisibleSongs([]);

          // Try to recover from AsyncStorage
          setTimeout(() => {
            if (isMounted.current) {
              recoverPlaylistDataFromStorage().catch(err =>
                console.error('Error recovering playlist data:', err)
              );
            }
          }, 500);
        }
      } finally {
        if (isMounted.current) {
          // Mark initialization as complete and set loading to false
          initializationComplete.current = true;
          setIsLoading(false);
        }
      }
    }, 200);
  };

  // Load songs in chunks to prevent UI freezing
  const loadSongChunk = (allSongs, page) => {
    if (!isMounted.current || !allSongs) return;

    setChunkLoading(true);

    // Calculate chunk boundaries
    const start = page * CHUNK_SIZE;
    const end = Math.min(start + CHUNK_SIZE, allSongs.length);
    const chunk = allSongs.slice(start, end);

    // Update current page and visible songs
    setTimeout(() => {
      if (isMounted.current) {
        setCurrentPage(page);
        setVisibleSongs(prev => {
          // If it's the first page, replace entirely
          if (page === 0) return chunk;
          // Otherwise append to existing songs
          return [...prev, ...chunk];
        });
        setChunkLoading(false);
      }
    }, 50);
  };

  // Handler for reaching end of list to load more songs
  const handleLoadMore = () => {
    if (chunkLoading || !Songs) return;

    const nextPage = currentPage + 1;
    const totalPages = Math.ceil(Songs.length / CHUNK_SIZE);

    if (nextPage < totalPages) {
      loadSongChunk(Songs, nextPage);
    }
  };

  // Helper for storing playlist data - optimized
  const storeCurrentPlaylist = async (name, songs, id = null) => {
    if (!isMounted.current || !songs) return;

    try {
      // Only store if we have valid data
      if (name && songs && songs.length > 0) {
        const playlistData = { name, songs, id };
        await AsyncStorage.setItem('last_viewed_custom_playlist', JSON.stringify(playlistData));
        console.log(`Stored playlist "${name}" with ${songs.length} songs for recovery`);
      }
    } catch (err) {
      console.error('Failed to save playlist data:', err);
    }
  };

  // Function to try recovering playlist data from storage - optimized
  const recoverPlaylistDataFromStorage = async () => {
    if (!isMounted.current) return;

    try {
      // Try to get the last viewed playlist
      const storedPlaylist = await AsyncStorage.getItem('last_viewed_custom_playlist');
      if (storedPlaylist) {
        const playlistData = JSON.parse(storedPlaylist);
        if (playlistData.songs && playlistData.songs.length > 0) {
          // Check if component is still mounted
          if (!isMounted.current) return;

          // Set state in batches
          setPlaylistName(playlistData.name || "Custom Playlist");
          setSongs(playlistData.songs || []);

          // Also recover playlist ID if available
          if (playlistData.id) {
            setPlaylistId(playlistData.id);
            setIsUserPlaylist(playlistData.id.startsWith('playlist_'));
          }

          console.log(`Recovered playlist data: ${playlistData.name} with ${playlistData.songs.length} songs`);

          // Load first chunk of songs
          loadSongChunk(playlistData.songs, 0);

          // Update navigation params to reflect recovered data
          setTimeout(() => {
            if (isMounted.current) {
              navigation.setParams({
                playlistName: playlistData.name,
                name: playlistData.name,
                songs: playlistData.songs,
                playlistId: playlistData.id
              });
            }
          }, 300);
        } else {
          console.log('Recovered playlist had no songs, not using it');
          setVisibleSongs([]);
        }
      } else {
        console.log('No stored playlist found for recovery');
        setVisibleSongs([]);
      }
    } catch (error) {
      console.error('Error recovering playlist data:', error);
      setVisibleSongs([]);
    } finally {
      if (isMounted.current) {
        setIsLoading(false);
        setChunkLoading(false);
      }
    }
  };

  // Improved back handler
  useEffect(() => {
    const handleBack = () => {
      try {
        if (!isMounted.current) return true;

        console.log('Back pressed in CustomPlaylistView');

        // Check if we were navigated from CustomPlaylist
        const previousScreen = props.route?.params?.previousScreen;

        // Always try to navigate to the playlist list first
        if (previousScreen === "CustomPlaylist") {
          console.log('Navigating back to CustomPlaylist');
          if (navigation.canGoBack()) {
            navigation.goBack();
          } else {
            navigation.navigate('Library', {
              screen: 'CustomPlaylist',
              params: { fromCustomPlaylistView: true }
            });
          }
        } else {
          console.log('Navigating to Library/CustomPlaylist screen');
          navigation.navigate('Library', {
            screen: 'CustomPlaylist',
            params: { fromCustomPlaylistView: true }
          });
        }
        return true; // Prevent default back action
      } catch (error) {
        console.error('Error in CustomPlaylistView back handler:', error);
        // Fallback if something goes wrong
        navigation.navigate('Library');
        return true;
      }
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => backHandler.remove();
  }, [navigation, props.route]);

  // Handle back button press with improved navigation
  const handleGoBack = useCallback(() => {
    try {
      // Check if we were navigated from CustomPlaylist
      const previousScreen = props.route?.params?.previousScreen;

      // Always try to navigate to the playlist list first
      if (previousScreen === "CustomPlaylist") {
        console.log('Navigating back to CustomPlaylist');
        if (navigation.canGoBack()) {
          navigation.goBack();
        } else {
          navigation.navigate('Library', {
            screen: 'CustomPlaylist',
            params: { fromCustomPlaylistView: true }
          });
        }
      } else {
        console.log('Navigating to Library/CustomPlaylist screen');
        navigation.navigate('Library', {
          screen: 'CustomPlaylist',
          params: { fromCustomPlaylistView: true }
        });
      }
    } catch (error) {
      console.error('Error in handleGoBack:', error);
      // Fallback if something goes wrong
      navigation.navigate('Library');
    }
  }, [navigation, props.route]);

  // Add this after other useEffects
  useEffect(() => {
    // Check if any track is playing
    const checkPlaybackState = async () => {
      try {
        const state = await TrackPlayer.getState();
        setIsPlaying(state === TrackPlayer.STATE_PLAYING);
      } catch (err) {
        console.error('Error checking playback state:', err);
      }
    };

    // Set up interval to check regularly
    const interval = setInterval(checkPlaybackState, 1000);
    checkPlaybackState();

    return () => clearInterval(interval);
  }, []);

  // Listen for track player events
  useEffect(() => {
    const playerStateListener = TrackPlayer.addEventListener(
      'playback-state',
      (state) => {
        setIsPlaying(state.state === TrackPlayer.STATE_PLAYING);
      }
    );

    return () => playerStateListener.remove();
  }, []);

  // Function to add all songs to the queue (optimized version)
  const AddAllSongsToQueue = useCallback(async (forcePlay = false) => {
    try {
      if (!Songs || Songs.length === 0) {
        console.log('No songs to play');
        return;
      }

      // Show toast first for quick feedback
      ToastAndroid.show('Adding songs to queue...', ToastAndroid.SHORT);

      // If already playing but not force play, just pause
      if (isPlaying && !forcePlay) {
        await TrackPlayer.pause();
        return;
      }

      // Process tracks in a separate task
      setTimeout(async () => {
        try {
          // Format all tracks in chunks for better performance
          let allFormattedTracks = [];
          const chunkSize = 50; // Process 50 songs at a time

          for (let i = 0; i < Songs.length; i += chunkSize) {
            const chunk = Songs.slice(i, i + chunkSize);
            const formattedChunk = chunk.map(formatTrack);
            allFormattedTracks = [...allFormattedTracks, ...formattedChunk];

            // Small pause between chunks to keep UI responsive
            if (i + chunkSize < Songs.length) {
              await new Promise(resolve => setTimeout(resolve, 50));
            }
          }

          console.log(`Adding ${allFormattedTracks.length} tracks to queue`);

          // Always reset queue and add all songs when playing a playlist
          await TrackPlayer.reset();
          await TrackPlayer.add(allFormattedTracks);
          await TrackPlayer.play();

          // Update Context state to reflect only songs from this playlist
          if (setQueue) {
            setQueue(allFormattedTracks);
          }

          // Update currentPlaying in Context if needed
          if (allFormattedTracks.length > 0 && setCurrentPlaying) {
            setCurrentPlaying(allFormattedTracks[0]);
          }

          // Update track in Context if needed
          if (updateTrack) {
            updateTrack();
          }

          ToastAndroid.show('Playing playlist', ToastAndroid.SHORT);
        } catch (innerError) {
          console.error('Error processing songs:', innerError);
          ToastAndroid.show('Failed to play all songs', ToastAndroid.SHORT);
        }
      }, 100);
    } catch (error) {
      console.error('Error playing songs:', error);
      ToastAndroid.show('Failed to play songs: ' + error.message, ToastAndroid.SHORT);
    }
  }, [Songs, updateTrack, isPlaying, formatTrack, setQueue, setCurrentPlaying]);

  // Memoized function to format a track for playback
  const formatTrack = useCallback((track) => {
    if (!track) return null;

    // Check if this is a local song
    const isLocalFile = track.isLocalMusic || track.path ||
      (track.url && typeof track.url === 'string' && track.url.startsWith('file://'));

    // Format local song
    if (isLocalFile) {
      return {
        id: track.id || `local-${Date.now()}`,
        url: track.url && typeof track.url === 'string' && track.url.startsWith('file://')
          ? track.url : `file://${track.path || track.url}`,
        title: track.title || 'Unknown',
        artist: track.artist || 'Unknown Artist',
        artwork: (typeof track.artwork === 'number' || !track.artwork)
          ? LOCAL_MUSIC_IMAGE : { uri: track.artwork },
        duration: typeof track.duration === 'string' ? parseFloat(track.duration) || 0 : track.duration || 0,
        isLocalMusic: true
      };
    }

    // Format online song - handle multiple URL formats
    let url = '';

    // Case 1: Direct URL string
    if (typeof track.url === 'string') {
      url = track.url;
    }
    // Case 2: URL is an array
    else if (Array.isArray(track.url)) {
      // Try to get highest quality URL from array
      url = getHighestQualityUrl(track.url) || '';
    }
    // Case 3: downloadUrl array
    else if (track.downloadUrl) {
      if (Array.isArray(track.downloadUrl) && track.downloadUrl.length > 0) {
        // Find the best quality URL from downloadUrl array
        const quality = track.downloadUrl.length - 1; // Default to highest quality
        url = track.downloadUrl[quality]?.url || '';
      } else if (typeof track.downloadUrl === 'string') {
        url = track.downloadUrl;
      }
    }

    // If we still don't have a URL, check if track.url is an object with properties
    if (!url && typeof track.url === 'object' && track.url !== null) {
      // Try various quality options
      url = track.url['320kbps'] || track.url['160kbps'] || track.url['96kbps'] || track.url['48kbps'] || '';
    }

    return {
      id: track.id || `online-${Date.now()}`,
      url: url,
      title: track.title || 'Unknown',
      artist: track.artist || 'Unknown Artist',
      artwork: track.image || track.artwork || DEFAULT_MUSIC_IMAGE,
      duration: typeof track.duration === 'string' ? parseFloat(track.duration) || 0 : track.duration || 0,
      language: track.language,
      artistID: track.artistID || track.primary_artists_id
    };
  }, []);

  // Helper function to get highest quality URL from an array (memoized)
  const getHighestQualityUrl = useCallback((urlArray) => {
    if (!Array.isArray(urlArray) || urlArray.length === 0) {
      return '';
    }

    try {
      // If array contains objects with quality property
      if (typeof urlArray[0] === 'object' && urlArray[0].quality) {
        // Sort by quality (assuming quality is in format like "320kbps")
        const sortedUrls = [...urlArray].sort((a, b) => {
          const qualityA = parseInt(a.quality?.replace(/[^\d]/g, '') || 0);
          const qualityB = parseInt(b.quality?.replace(/[^\d]/g, '') || 0);
          return qualityB - qualityA; // Descending order
        });

        return sortedUrls[0]?.url || '';
      }
      // If array contains string URLs
      else if (typeof urlArray[0] === 'string') {
        return urlArray[0];
      }
      // If array contains objects with URL property
      else if (urlArray[0] && typeof urlArray[0] === 'object' && 'url' in urlArray[0]) {
        return urlArray[0].url;
      }
    } catch (error) {
      console.error('Error parsing URL array:', error);
    }

    // Fallback to first item if possible
    return typeof urlArray[0] === 'string' ? urlArray[0] :
      (urlArray[0]?.url || '');
  }, []);

  // Safe image source getter function (memoized)
  const getSafeImageSource = useCallback((item) => {
    // For local songs that have numeric cover or missing artwork
    if (item.isLocalMusic || item.path ||
      (typeof item.artwork === 'number') ||
      (typeof item.image === 'number') ||
      !item.image && !item.artwork) {
      return LOCAL_MUSIC_IMAGE;
    }

    // Safe image URL extraction
    const getImageUrl = (imageData) => {
      if (!imageData) return '';
      if (typeof imageData === 'string') return imageData;
      if (Array.isArray(imageData)) {
        for (const img of imageData) {
          if (typeof img === 'string' && img.trim() !== '') return img;
          if (img && typeof img === 'object' && img.url) return img.url;
        }
      }
      if (imageData && typeof imageData === 'object' && imageData.url) return imageData.url;
      return '';
    };

    const imageUrl = getImageUrl(item.image) || getImageUrl(item.artwork);

    // For invalid URI values
    if (imageUrl && !imageUrl.startsWith('http') && !imageUrl.startsWith('file://')) {
      return LOCAL_MUSIC_IMAGE;
    }

    // For normal songs with artwork
    return imageUrl ? { uri: imageUrl } : LOCAL_MUSIC_IMAGE;
  }, []);

  // Function to truncate text to improve UI layout
  const truncateText = useCallback((text, maxLength = 25) => {
    if (!text) return '';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  }, []);

  // Function to render a song item in the FlatList (memoized)
  const renderSongItem = useCallback(({ item, index }) => {
    const isCurrentPlaying = currentPlaying && currentPlaying.id === item.id;

    // Check if the data is actually a valid song item
    if (!item || !item.id) {
      return null;
    }

    // Play this song when pressed
    const handlePress = async () => {
      try {
        // Show toast first for immediate feedback
        ToastAndroid.show(`Playing "${item.title}"`, ToastAndroid.SHORT);

        // Use standard AddPlaylist function which handles:
        // 1. Stopping auto-recommendations (isPlaylist: true)
        // 2. Formatting metadata
        // 3. Batched queue addition
        // 4. Starting playback from specific song ID
        // 5. Lazy loading for YTMusic/Imported tracks

        // We pass the raw Songs array and the clicked item's ID
        await AddPlaylist(Songs, item.id);

      } catch (error) {
        console.error('Error playing song:', error);
        ToastAndroid.show('Failed to play song: ' + error.message, ToastAndroid.SHORT);
      }
    };

    // Handle options button press
    const handleOptions = () => {
      setSelectedSong(item);
      setMenuVisible(true);
    };

    // Use a stable key that doesn't change across re-renders
    const songKey = `song-${item.id}-${index}`;

    return (
      <Pressable
        key={songKey}
        style={[
          staticStyles.songCard,
          { borderBottomColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' },
          isCurrentPlaying && [staticStyles.activeSongCard, { backgroundColor: theme.dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)' }]
        ]}
        onPress={handlePress}
        android_ripple={{ color: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.05)' }}
      >
        <FastImage
          source={getSafeImageSource(item)}
          style={staticStyles.thumbnail}
          resizeMode={FastImage.resizeMode.cover}
          defaultSource={LOCAL_MUSIC_IMAGE}
        />
        <View style={staticStyles.songInfo}>
          <Text style={[staticStyles.songTitle, { color: theme.colors.text }]} numberOfLines={1}>
            {truncateText(item.title || 'Unknown', 20)}
          </Text>
          <Text style={[staticStyles.songArtist, { color: theme.colors.textSecondary }]} numberOfLines={1}>
            {truncateText(item.artist || 'Unknown Artist', 18)}
          </Text>
        </View>

        <View style={staticStyles.songControls}>
          {/* Options button */}
          <Pressable
            onPress={handleOptions}
            style={staticStyles.menuButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </Pressable>
        </View>
      </Pressable>
    );
  }, [currentPlaying, Songs, getSafeImageSource, updateTrack, formatTrack, truncateText, playlistName, setQueue, setCurrentPlaying]);

  // Memoized function to get a key extractor for the FlatList
  const keyExtractor = useCallback((item, index) => `song-${item.id || index}-${index}`, []);

  // Render loading state when needed
  if (isLoading) {
    return (
      <View style={[staticStyles.loadingContainer, { backgroundColor: theme.colors.background }]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
        <Text style={{ color: theme.colors.text, marginTop: 16 }}>Loading playlist...</Text>
      </View>
    );
  }

  // Show a placeholder when there are no songs
  if (!Songs || Songs.length === 0) {
    return (
      <View style={[staticStyles.container, { backgroundColor: theme.colors.background }]}>
        <View style={staticStyles.header}>
          <Pressable onPress={handleGoBack} style={staticStyles.backButton}>
            <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
          </Pressable>
          <PlainText text={truncateText(playlistName, 35)} style={[staticStyles.title, { color: theme.colors.text }]} />
        </View>
        <View style={[staticStyles.emptyContainer, { backgroundColor: theme.colors.background }]}>
          <Ionicons name="musical-notes-outline" size={50} color={theme.colors.textSecondary} />
          <Text style={[staticStyles.emptyText, { color: theme.colors.textSecondary }]}>
            No songs in this playlist
          </Text>
        </View>
      </View>
    );
  }

  // Main render of the component
  return (
    <View style={[staticStyles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />

      <View style={staticStyles.header}>
        <Pressable onPress={handleGoBack} style={staticStyles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text} />
        </Pressable>
        <PlainText
          text={truncateText(playlistName, 28)}
          style={[staticStyles.title, { color: theme.colors.text }]}
          numberOfLine={1}
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={visibleSongs}
        renderItem={renderSongItem}
        keyExtractor={keyExtractor}
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.5}
        maxToRenderPerBatch={10}
        initialNumToRender={15}
        windowSize={11}
        removeClippedSubviews={true}
        ListHeaderComponent={
          <PlaylistHeader
            imageUrl={getSafeImageSource(Songs[Songs.length - 1] || {})?.uri || getSafeImageSource(Songs[Songs.length - 1] || {})}
            title={playlistName}
            songCount={Songs.length}
            playlistId={playlistId}
            follower={isUserPlaylist ? "User Playlist" : "Imported Playlist"}
            songsData={Songs}
          />
        }
        ListFooterComponent={
          chunkLoading && visibleSongs.length < Songs.length ? (
            <View style={{ padding: 20, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
              <Text style={{ color: theme.colors.text, marginTop: 8 }}>
                Loading more songs...
              </Text>
            </View>
          ) : null
        }
      />

      {/* Song options modal */}
      <Modal
        isVisible={menuVisible}
        onBackdropPress={() => setMenuVisible(false)}
        style={staticStyles.menuModal}
        backdropTransitionOutTiming={0}
        animationIn="slideInUp"
        animationOut="slideOutDown"
      >
        <View style={[staticStyles.menuContainer, { backgroundColor: theme.colors.card }]}>
          {selectedSong && (
            <>
              <Text style={{ color: theme.colors.text, fontSize: 18, marginBottom: 16, paddingHorizontal: 16 }}>
                {truncateText(selectedSong.title, 40)}
              </Text>

              <Pressable
                style={[staticStyles.menuOption, { paddingHorizontal: 16 }]}
                onPress={async () => {
                  setMenuVisible(false);
                  try {
                    // Get the current queue and track index
                    const queue = await TrackPlayer.getQueue();
                    const currentIndex = await TrackPlayer.getCurrentTrack();

                    if (currentIndex !== null && currentIndex >= 0) {
                      // Insert the song right after the current track
                      const formattedTrack = formatTrack(selectedSong);
                      await TrackPlayer.add([formattedTrack], currentIndex + 1);

                      // Update the Context's queue if available
                      if (setQueue && Queue) {
                        // Create a new queue array with the selected song inserted after the current track
                        const newQueue = [...Queue];
                        newQueue.splice(currentIndex + 1, 0, formattedTrack);
                        setQueue(newQueue);
                      }

                      ToastAndroid.show('Added to play next', ToastAndroid.SHORT);
                    } else {
                      // If no track is currently playing, just reset and play this song
                      const formattedTrack = formatTrack(selectedSong);
                      await TrackPlayer.reset();
                      await TrackPlayer.add([formattedTrack]);
                      await TrackPlayer.play();

                      // Update Context
                      if (setQueue) setQueue([formattedTrack]);
                      if (setCurrentPlaying) setCurrentPlaying(formattedTrack);
                      if (updateTrack) updateTrack();

                      ToastAndroid.show('Now playing', ToastAndroid.SHORT);
                    }
                  } catch (error) {
                    console.error('Error adding song to play next:', error);
                    ToastAndroid.show('Failed to add song', ToastAndroid.SHORT);
                  }
                }}
              >
                <MaterialCommunityIcons name="playlist-play" size={24} color={theme.colors.text} />
                <Text style={[staticStyles.menuText, { color: theme.colors.text }]}>Play Next</Text>
              </Pressable>

              {isUserPlaylist && (
                <Pressable
                  style={[staticStyles.menuOption, { paddingHorizontal: 16 }]}
                  onPress={async () => {
                    setMenuVisible(false);
                    try {
                      const songId = selectedSong.id;
                      const currentUserPlaylists = await getUserPlaylists();
                      const playlistIndex = currentUserPlaylists.findIndex(p => p.id === playlistId);

                      if (playlistIndex !== -1) {
                        const updatedSongs = currentUserPlaylists[playlistIndex].songs.filter(
                          s => s.id !== songId
                        );

                        currentUserPlaylists[playlistIndex].songs = updatedSongs;
                        await AsyncStorage.setItem('userPlaylists', JSON.stringify(currentUserPlaylists));

                        // Update the local state to reflect the deletion
                        setSongs(prevSongs => prevSongs.filter(s => s.id !== songId));
                        setVisibleSongs(prevSongs => prevSongs.filter(s => s.id !== songId));

                        ToastAndroid.show('Song removed from playlist', ToastAndroid.SHORT);
                      }
                    } catch (error) {
                      console.error('Error removing song from playlist:', error);
                      ToastAndroid.show('Failed to remove song', ToastAndroid.SHORT);
                    }
                  }}
                >
                  <MaterialCommunityIcons name="playlist-remove" size={24} color={theme.colors.text} />
                  <Text style={[staticStyles.menuText, { color: theme.colors.text }]}>Remove from Playlist</Text>
                </Pressable>
              )}

              <Pressable
                style={[staticStyles.menuCancel, { borderTopColor: theme.dark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)' }]}
                onPress={() => setMenuVisible(false)}
              >
                <Text style={{ color: theme.colors.primary, fontSize: 16 }}>Cancel</Text>
              </Pressable>
            </>
          )}
        </View>
      </Modal>
    </View>
  );
};