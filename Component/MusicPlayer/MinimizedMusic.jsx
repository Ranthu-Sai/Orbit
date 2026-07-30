import { ActivityIndicator, Dimensions, View } from 'react-native';
import React, {
  memo,
  useContext,
  useCallback,
  useState,
  useEffect,
} from 'react';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { GlassBox } from '../Global/GlassBox';
import Animated, { FadeIn } from 'react-native-reanimated';
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from 'react-native-gesture-handler';
import { PlayPauseButton } from './PlayPauseButton';
import { NextSongButton } from './NextSongButton';
import { PreviousSongButton } from './PreviousSongButton';
import { LikeSongButton } from './LikeSongButton';
import FastImage from 'react-native-fast-image';
import { useActiveTrack, useProgress } from 'react-native-track-player';
import { PlayNextSong, PlayPreviousSong } from '../../MusicPlayerFunctions';
import Context from '../../Context/Context';
import TrackPlayer from 'react-native-track-player';
import { Pressable } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useNavigation, useTheme } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to get high quality artwork URL
const getHighQualityArtwork = (artworkUrl, track = null) => {
  // Helper to check if URL is valid (not a placeholder)
  const isValidArtwork = (art) => {
    if (!art) {
      return false;
    }
    if (typeof art === 'number') {
      return true;
    } // require() result
    if (typeof art === 'string') {
      // Filter out placeholder URLs
      if (art.includes('htmlcolorcodes.com') || art.includes('placeholder')) {
        return false;
      }
      if (
        art.startsWith('file://') ||
        art.startsWith('/') ||
        art.startsWith('http') ||
        art.startsWith('data:')
      ) {
        return true;
      }
    }
    if (typeof art === 'object' && art.uri) {
      return isValidArtwork(art.uri);
    }
    return false;
  };

  // Handle downloaded songs with embedded or cached artwork FIRST
  if (
    track?.isDownloaded ||
    track?.isLocal ||
    track?.sourceType === 'download' ||
    track?.sourceType === 'downloaded'
  ) {
    // Check both artwork and image fields, prioritize valid ones
    const artworkToUse = isValidArtwork(artworkUrl)
      ? artworkUrl
      : isValidArtwork(track?.artwork)
      ? track.artwork
      : isValidArtwork(track?.image)
      ? track.image
      : null;

    if (artworkToUse) {
      // Handle data: URIs (embedded artwork)
      if (
        typeof artworkToUse === 'string' &&
        artworkToUse.startsWith('data:')
      ) {
        return artworkToUse;
      }
      // Handle file:// paths
      if (
        typeof artworkToUse === 'string' &&
        artworkToUse.startsWith('file://')
      ) {
        return artworkToUse;
      }
      // Handle remote URLs
      if (typeof artworkToUse === 'string' && artworkToUse.startsWith('http')) {
        return artworkToUse;
      }
    }

    // Use default music image for local files without artwork
    return require('../../Images/Music.jpeg');
  }

  if (!artworkUrl) {
    // Check if this is a local track and use Music.jpeg
    if (
      track &&
      (track.isLocal ||
        track.sourceType === 'mymusic' ||
        track.path ||
        (track.url &&
          (track.url.startsWith('file://') ||
            track.url.includes('content://') ||
            track.url.includes('/storage/'))))
    ) {
      return require('../../Images/Music.jpeg');
    }
    return 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';
  }

  try {
    // For local files, return as is
    if (artworkUrl.startsWith('file://')) {
      return artworkUrl;
    }

    // Special handling for JioSaavn CDN
    if (artworkUrl.includes('saavncdn.com')) {
      // Replace any size with 500x500 for highest quality
      return artworkUrl.replace(/50x50|150x150|500x500/g, '500x500');
    }

    // For other URLs, try to add quality parameter
    try {
      const url = new URL(artworkUrl);
      // Set quality to maximum
      url.searchParams.set('quality', '100');
      return url.toString();
    } catch (e) {
      // If URL parsing fails, try direct string manipulation
      if (artworkUrl.includes('?')) {
        return `${artworkUrl}&quality=100`;
      } else {
        return `${artworkUrl}?quality=100`;
      }
    }
  } catch (error) {
    console.error('Error processing artwork URL:', error);
    return artworkUrl; // Return original URL as fallback
  }
};

export const MinimizedMusic = memo(({ setIndex, color, loadingSong }) => {
  const { position, duration } = useProgress();
  const { setPreviousScreen, setMusicPreviousScreen, setCurrentPlaylistData } =
    useContext(Context);
  const [isOffline, setIsOffline] = useState(false);
  const [localTracks, setLocalTracks] = useState([]);
  const navigation = useNavigation();
  const { colors, dark } = useTheme(); // Get theme colors

  // Check network status
  useEffect(() => {
    const checkConnection = async () => {
      const state = await NetInfo.fetch();
      setIsOffline(!state.isConnected);
    };

    checkConnection();
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  // Function to extract and save playlist ID from navigation state
  const extractPlaylistInfo = useCallback((navState) => {
    try {
      if (!navState || !navState.routes || navState.routes.length === 0) {
        return null;
      }

      // Check if we're in the Playlist screen
      const currentTabRoute = navState.routes[navState.index];
      if (!currentTabRoute) {
        return null;
      }

      // 1. Check if current screen is directly the Playlist
      if (currentTabRoute.name === 'Playlist' && currentTabRoute.params) {
        // Validate that we have the required id parameter
        if (!currentTabRoute.params.id) {
          return null;
        }

        return {
          id: currentTabRoute.params.id,
          name: currentTabRoute.params.name || 'Playlist',
          image: currentTabRoute.params.image || '',
          follower: currentTabRoute.params.follower || '',
        };
      }

      // 2. Check if there's a nested navigation state with Playlist
      const nestedState = currentTabRoute.state;
      if (nestedState && nestedState.routes && nestedState.routes.length > 0) {
        if (nestedState.index >= nestedState.routes.length) {
          return null;
        }

        const activeNestedRoute = nestedState.routes[nestedState.index];
        if (!activeNestedRoute) {
          return null;
        }

        // Check if the active nested route is a Playlist
        if (activeNestedRoute.name === 'Playlist' && activeNestedRoute.params) {
          // Validate that we have the required id parameter
          if (!activeNestedRoute.params.id) {
            return null;
          }

          return {
            id: activeNestedRoute.params.id,
            name: activeNestedRoute.params.name || 'Playlist',
            image: activeNestedRoute.params.image || '',
            follower: activeNestedRoute.params.follower || '',
          };
        }

        // 3. Check if there's even deeper nesting
        if (
          activeNestedRoute.state &&
          activeNestedRoute.state.routes &&
          activeNestedRoute.state.routes.length > 0
        ) {
          if (
            activeNestedRoute.state.index >=
            activeNestedRoute.state.routes.length
          ) {
            return null;
          }

          const deepNestedRoute =
            activeNestedRoute.state.routes[activeNestedRoute.state.index];
          if (!deepNestedRoute) {
            return null;
          }

          if (deepNestedRoute.name === 'Playlist' && deepNestedRoute.params) {
            // Validate that we have the required id parameter
            if (!deepNestedRoute.params.id) {
              return null;
            }

            return {
              id: deepNestedRoute.params.id,
              name: deepNestedRoute.params.name || 'Playlist',
              image: deepNestedRoute.params.image || '',
              follower: deepNestedRoute.params.follower || '',
            };
          }
        }
      }

      return null;
    } catch (error) {
      console.error('Error extracting playlist info:', error);
      return null;
    }
  }, []);

  // Function to save current screen and open player
  const saveCurrentScreenAndOpenPlayer = () => {
    try {
      // Get current route navigation state to determine where we are
      const state = navigation.getState();

      // Extract the real path from the navigation state
      let screenPath = '';
      let customPlaylistParams = null;

      // Use a more reliable approach to find the current screen
      if (state && state.routes && state.routes.length > 0) {
        // Find the MainRoute container
        const mainRoute = state.routes.find(
          (route) => route.name === 'MainRoute'
        );
        if (mainRoute && mainRoute.state && mainRoute.state.routes) {
          // Find the active tab in the bottom tab navigator
          const tabState = mainRoute.state;
          const activeTabIndex = tabState.index;

          if (
            activeTabIndex !== undefined &&
            tabState.routes &&
            tabState.routes.length > activeTabIndex
          ) {
            const activeTab = tabState.routes[activeTabIndex];
            // Start building the path with the tab name
            screenPath = activeTab.name;

            // Check if there's a nested stack within this tab
            if (activeTab.state && activeTab.state.routes) {
              const nestedState = activeTab.state;
              const activeNestedIndex = nestedState.index;

              if (
                activeNestedIndex !== undefined &&
                nestedState.routes &&
                nestedState.routes.length > activeNestedIndex
              ) {
                const activeScreen = nestedState.routes[activeNestedIndex];
                // Add the active screen to the path
                screenPath = `${screenPath}/${activeScreen.name}`;

                // If we're in CustomPlaylistView, save its params
                if (
                  activeScreen.name === 'CustomPlaylistView' &&
                  activeScreen.params
                ) {
                  customPlaylistParams = activeScreen.params;
                  // Also store in AsyncStorage for recovery
                  if (
                    customPlaylistParams.playlistName &&
                    customPlaylistParams.songs
                  ) {
                    AsyncStorage.setItem(
                      'last_viewed_custom_playlist',
                      JSON.stringify({
                        name: customPlaylistParams.playlistName,
                        songs: customPlaylistParams.songs,
                      })
                    ).catch((err) =>
                      console.error('Failed to store playlist params:', err)
                    );
                  }
                }
              }
            }
          }
        }
      }

      // Log the extracted path
      // Store the screen path for later use
      setMusicPreviousScreen(screenPath);

      // Set playlist data for display
      setCurrentPlaylistData(screenPath);

      // Open the fullscreen player
      setIndex(1);
    } catch (error) {
      console.error('Error in saveCurrentScreenAndOpenPlayer:', error);
      // Fallback: just open the player without saving the path
      setIndex(1);
    }
  };

  // Function to play next offline song
  const playNextOfflineSong = useCallback(async () => {
    if (isOffline && localTracks.length > 0) {
      try {
        const queue = await TrackPlayer.getQueue();
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (!currentTrack || queue.length === 0) {
          return;
        }

        // Find current track index
        const currentIndex = queue.findIndex(
          (track) => track.id === currentTrack.id
        );
        if (currentIndex === -1) {
          return;
        }

        // Calculate next track index (with wrap-around)
        const nextIndex = (currentIndex + 1) % queue.length;

        // Skip to the next track
        await TrackPlayer.skip(nextIndex);
        await TrackPlayer.play();
      } catch (error) {
        console.error('Error playing next offline song:', error);
      }
    } else {
      // If online, use the regular function
      PlayNextSong();
    }
  }, [isOffline, localTracks]);

  // Function to play previous offline song
  const playPreviousOfflineSong = useCallback(async () => {
    if (isOffline && localTracks.length > 0) {
      try {
        const queue = await TrackPlayer.getQueue();
        const currentTrack = await TrackPlayer.getActiveTrack();
        if (!currentTrack || queue.length === 0) {
          return;
        }

        // Find current track index
        const currentIndex = queue.findIndex(
          (track) => track.id === currentTrack.id
        );
        if (currentIndex === -1) {
          return;
        }

        // Calculate previous track index (with wrap-around)
        const prevIndex = (currentIndex - 1 + queue.length) % queue.length;

        // Skip to the previous track
        await TrackPlayer.skip(prevIndex);
        await TrackPlayer.play();
      } catch (error) {
        console.error('Error playing previous offline song:', error);
      }
    } else {
      // If online, use the regular function
      PlayPreviousSong();
    }
  }, [isOffline, localTracks]);

  const pan = Gesture.Pan();
  pan.onFinalize((e) => {
    if (e.translationX > 100) {
      isOffline ? playPreviousOfflineSong() : PlayPreviousSong();
    } else if (e.translationX < -100) {
      isOffline ? playNextOfflineSong() : PlayNextSong();
    } else {
      // Save the current screen before opening fullscreen player
      saveCurrentScreenAndOpenPlayer();
    }
  });

  function TotalCompletedInpercent() {
    if (!duration || duration <= 0) {
      return 0;
    }
    const progress = Math.min(Math.max((position || 0) / duration, 0), 1) * 100;
    return Math.round(progress); // Round to avoid floating point precision issues
  }

  const size = Dimensions.get('window').height;
  const screenWidth = Dimensions.get('window').width;
  const currentPlaying = useActiveTrack();

  // OPTIMISTIC UI: Use loadingSong if available, otherwise use currentPlaying
  const displaySong = loadingSong || currentPlaying;
  const isLoadingStream = loadingSong !== null;

  // Get artwork from displaySong (handles both loadingSong and currentPlaying)
  const artworkSource = displaySong?.artwork || displaySong?.image;

  return (
    <GestureHandlerRootView style={{ width: screenWidth * 0.90, alignSelf: 'center', height: 70 }}>
      <GlassBox
        id="minimized-music"
        rectInset={0.5}
        borderOutside
        gradientConfig={{
          x1: '0%', y1: '0%', x2: '100%', y2: '100%',
          stops: [
            { offset: '0%', opacity: 0.5 },
            { offset: '100%', opacity: 0.1 },
          ],
        }}
        style={{
          flex: 1,
          borderRadius: 35,
          backgroundColor: color === 'transparent' ? (dark ? 'rgba(30, 30, 30, 0.90)' : 'rgba(255, 255, 255, 0.85)') : (color || colors.musicPlayerBg),
        }}
      >
        <Animated.View
          entering={FadeIn}
          style={{
            flexDirection: 'row',
            justifyContent: 'space-between',
            flex: 1,
            paddingHorizontal: 15,
            alignItems: 'center',
            gap: 10,
          }}
        >
          <GestureDetector gesture={pan}>
            <View
              style={{
                flexDirection: 'row',
                flex: 1,
                alignItems: 'center',
              }}
            >
              <FastImage
                source={
                  typeof getHighQualityArtwork(artworkSource, displaySong) ===
                  'string'
                    ? { uri: getHighQualityArtwork(artworkSource, displaySong) }
                    : getHighQualityArtwork(artworkSource, displaySong)
                }
                style={{
                  height: 46,
                  width: 46,
                  borderRadius: 23, // fully rounded like pill art reference or slightly rounded
                  marginRight: 10,
                }}
              />
              <View
                style={{
                  flex: 1,
                  justifyContent: 'center',
                  paddingRight: 2,
                  minWidth: 0,
                }}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <PlainText
                    text={displaySong?.title ?? 'No music :('}
                    style={{
                      color: colors.text,
                      fontSize: 13,
                      flexShrink: 1,
                      fontWeight: 'bold',
                    }}
                    numberOfLine={1}
                    ellipsizeMode="tail"
                  />
                </View>
                <SmallText
                  text={
                    displaySong?.artist && displaySong.artist.length > 20
                      ? displaySong.artist.substring(0, 20) + '...'
                      : displaySong?.artist ?? 'Explore now!'
                  }
                  maxLine={1}
                  style={{
                    color: colors.textSecondary,
                    fontSize: 11,
                    marginTop: 2,
                    includeFontPadding: false,
                  }}
                />
              </View>
            </View>
          </GestureDetector>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            {isLoadingStream ? (
              <View
                style={{
                  flexDirection: 'row',
                  gap: 10,
                  alignItems: 'center',
                  paddingHorizontal: 10,
                }}
              >
                <ActivityIndicator
                  size={24}
                  color={colors.primary || '#1DB954'}
                />
              </View>
            ) : (
              <View
                style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}
              >
                <Pressable
                  onPress={
                    isOffline ? playPreviousOfflineSong : PlayPreviousSong
                  }
                >
                  <PreviousSongButton color={colors.text} />
                </Pressable>
                <PlayPauseButton isplaying={false} color={colors.text} />
                <Pressable
                  onPress={isOffline ? playNextOfflineSong : PlayNextSong}
                >
                  <NextSongButton color={colors.text} />
                </Pressable>
              </View>
            )}
          </View>
        </Animated.View>
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 28,
            right: 28,
            height: 1.5,
            backgroundColor: 'transparent',
            overflow: 'hidden',
          }}
        >
          <View
            style={{
              height: 1.5,
              width: `${TotalCompletedInpercent()}%`,
              backgroundColor: colors.primary,
            }}
          />
        </View>
      </GlassBox>
    </GestureHandlerRootView>
  );
});
