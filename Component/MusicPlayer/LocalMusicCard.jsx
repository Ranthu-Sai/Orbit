import React, { useState, useContext, useRef, useEffect, useCallback, useMemo } from 'react';
import { View, Text, Pressable, StyleSheet, findNodeHandle, UIManager, Platform } from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import Context from '../../Context/Context';
// Removed unused TrackPlayer hooks
import { useTheme, useNavigation } from '@react-navigation/native';
import * as RNFS from 'react-native-fs';
import { PlayOneSong } from '../../MusicPlayerFunctions';
import TrackPlayer from 'react-native-track-player';

// Default music image for local tracks
const DEFAULT_LOCAL_MUSIC_IMAGE = require('../../Images/Music.jpeg');

export const LocalMusicCard = ({ song, index, allSongs, artist, activeTrackId, isPlaying }) => {

  const { updateTrack, setVisible, setIndex, setPreviousScreen, setMusicPreviousScreen } = useContext(Context);
  // Removed hooks to prevent excessive listeners
  const menuButtonRef = useRef(null);
  const theme = useTheme();
  const styles = getThemedStyles(theme.colors, theme.dark);
  const [albumArt, setAlbumArt] = useState(null);
  const navigation = useNavigation();
  const [fullNavPath, setFullNavPath] = useState('');
  const [isPressed, setIsPressed] = useState(false);

  useEffect(() => {
    const fetchAlbumArt = async () => {
      try {
        const fileExists = await RNFS.exists(song.path);
        if (fileExists) {
          const stats = await RNFS.stat(song.path);
          if (stats.size > 0) {
            // Try to use the provided cover art if available
            if (song.cover && typeof song.cover === 'string' && song.cover.trim() !== '') {
              // Make sure cover is a valid string URI
              setAlbumArt(song.cover);
              return;
            }

            // If we reach here, no valid cover image found
            // We'll use the default image instead (handled in render)
            setAlbumArt(null);
          }
        }
      } catch (error) {
        console.warn('Error handling album art:', error);
        // Use null to indicate we should use the default image
        setAlbumArt(null);
      }
    };

    fetchAlbumArt();
  }, [song.path, song.title, song.cover]);

  // Initialize navigation path once on mount
  useEffect(() => {
    if (!fullNavPath) {
      try {
        const currentState = navigation.getState();
        if (currentState && currentState.routes && currentState.routes.length > 0) {
          const currentTabRoute = currentState.routes[currentState.index];

          // Check for Library tab with nested screens
          if (currentTabRoute.name === 'Library' && currentTabRoute.state) {
            const libraryRoute = currentTabRoute.state.routes[currentTabRoute.state.index];
            if (libraryRoute.name === 'MyMusicPage') {
              setFullNavPath('Library/MyMusicPage');
              return;
            } else if (libraryRoute.name === 'DownloadScreen') {
              setFullNavPath('Library/DownloadScreen');
              return;
            }
          }

          // Check for nested screens in any tab
          if (currentTabRoute.state && currentTabRoute.state.routes) {
            const activeNestedRoute = currentTabRoute.state.routes[currentTabRoute.state.index];
            setFullNavPath(`${currentTabRoute.name}/${activeNestedRoute.name}`);
            return;
          }

          setFullNavPath(currentTabRoute.name);
        }
      } catch (error) {
        console.warn('Error detecting current route:', error);
        setFullNavPath('Library/MyMusicPage');
      }
    }
  }, []); // Only run once on mount

  const handleMenuPress = () => {
    if (menuButtonRef.current) {
      const handle = findNodeHandle(menuButtonRef.current);
      UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
        // Pass the song data to the modal
        setVisible({
          visible: true,
          position: { y: pageY },
          ...song,
          isLocalMusic: true,
        });
      });
    }
  };

  // Optimized navigation path getter using stored value
  const getNavigationPath = useCallback(() => {
    return fullNavPath || 'Library/MyMusicPage';
  }, [fullNavPath]);

  const handlePress = async () => {
    try {
      // Save current navigation state before opening fullscreen player
      const currentState = navigation.getState();
      if (currentState && currentState.routes && currentState.routes.length > 0) {
        // Get navigation path reliably using the helper function
        const navPath = getNavigationPath();

        // Store the navigation path only in the required context variables
        // Don't use setFullNavPath (it might be undefined)
        console.log('Setting navigation path for local music:', navPath);
        setPreviousScreen(navPath);
        setMusicPreviousScreen(navPath);
      }

      // Proceed with normal playback
      await prepareAndPlayTracks();
    } catch (error) {
      console.error('Error playing track:', error);

      // Fallback method if the normal approach fails
      try {
        const song = allSongs[index];
        // Get source type using reliable method instead of fullNavPath
        const isFromMyMusic = getNavigationPath().includes('MyMusicPage');

        // Ensure we have a valid artwork that won't cause type issues
        let artwork;
        if (song.cover && typeof song.cover === 'string' && song.cover.trim() !== '') {
          artwork = { uri: song.cover };
        } else {
          // Use Music.jpeg for local tracks
          artwork = DEFAULT_LOCAL_MUSIC_IMAGE;
        }

        const singleTrack = {
          id: song.id,
          url: song.url || `file://${song.path}`,
          title: song.title,
          artist: song.artist,
          artwork: artwork,
          isLocal: true,
          sourceType: isFromMyMusic ? 'mymusic' : 'download'
        };

        await TrackPlayer.reset();
        await TrackPlayer.add(singleTrack);
        await TrackPlayer.play();
        setIndex(1);
      } catch (fallbackError) {
        console.error('Fallback method also failed:', fallbackError);
      }
    }
  };

  // Format song title and artist
  const formatTitle = (title) => {
    if (!title) return "Unknown Title";

    // Remove file extensions if they exist
    let formatted = title.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');

    // Limit to 20 characters
    if (formatted.length > 20) {
      return formatted.substring(0, 20) + "...";
    }

    return formatted;
  };

  const formatArtist = (artistName) => {
    if (!artistName) return "Unknown Artist";

    // Remove file extensions if they exist
    let formatted = artistName.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');

    // Limit to 20 characters
    if (formatted.length > 20) {
      return formatted.substring(0, 20) + "...";
    }

    return formatted;
  };

  // Helper function to prepare and play tracks
  const prepareAndPlayTracks = async () => {
    try {
      // Check if we're in the MyMusic page using reliable method
      const navPath = getNavigationPath();
      const isFromMyMusic = navPath.includes('MyMusicPage');
      console.log('Playing from MyMusic:', isFromMyMusic);

      // Ensure we have allSongs before proceeding
      if (!allSongs || !Array.isArray(allSongs) || allSongs.length === 0) {
        console.log('No songs available for queue');

        // Play just the current song if we don't have a valid array
        const singleTrack = {
          id: song.id || String(Math.random()),
          url: song.url || (song.path ? `file://${song.path}` : null),
          title: formatTitle(song.title),
          artist: formatArtist(song.artist),
          artwork: getArtworkForTrack(song),
          isLocal: true,
          sourceType: isFromMyMusic ? 'mymusic' : 'download'
        };

        if (!singleTrack.url) {
          console.error('No URL available for track');
          return;
        }

        await TrackPlayer.reset();
        await TrackPlayer.add(singleTrack);
        await TrackPlayer.play();
        setIndex(1);
        return;
      }

      // Get the index of the current song in the array
      const songIndex = allSongs.findIndex(s => s.id === song.id);
      if (songIndex === -1) {
        console.error('Song not found in queue');
        return;
      }

      // Format tracks for the queue
      const formattedTracks = allSongs.map(track => {
        return {
          id: track.id,
          url: track.url || `file://${track.path}`,
          title: formatTitle(track.title),
          artist: formatArtist(track.artist),
          artwork: getArtworkForTrack(track),
          isLocal: true,
          sourceType: isFromMyMusic ? 'mymusic' : 'download'
        };
      }).filter(track => track && track.url); // Remove any invalid tracks

      // Reset the queue and add tracks
      await TrackPlayer.reset();

      // Add tracks to queue, starting from the selected track
      await TrackPlayer.add([
        ...formattedTracks.slice(songIndex), // Current song and those after it
        ...formattedTracks.slice(0, songIndex) // Songs before the current one
      ]);

      // Start playback
      await TrackPlayer.play();

      // Open fullscreen player
      setIndex(1);
    } catch (error) {
      console.error('Error in prepareAndPlayTracks:', error);

      // Fallback to playing just this song on error
      try {
        const navPath = getNavigationPath();
        const isFromMyMusic = navPath.includes('MyMusicPage');

        const singleTrack = {
          id: song.id || String(Math.random()),
          url: song.url || (song.path ? `file://${song.path}` : null),
          title: formatTitle(song.title),
          artist: formatArtist(song.artist),
          artwork: getArtworkForTrack(song),
          isLocal: true,
          sourceType: isFromMyMusic ? 'mymusic' : 'download'
        };

        if (singleTrack.url) {
          await TrackPlayer.reset();
          await TrackPlayer.add(singleTrack);
          await TrackPlayer.play();
          setIndex(1);
        } else {
          console.error('No URL available for track');
        }
      } catch (fallbackError) {
        console.error('Final fallback failed:', fallbackError);
      }
    }
  };

  // Helper function to get artwork for a track
  const getArtworkForTrack = (track) => {
    // For local tracks, use Music.jpeg as default artwork
    if (track.isLocal || track.path) {
      return require('../../Images/Music.jpeg');
    }

    // For online tracks, use cover art if available
    if (track.cover && typeof track.cover === 'string' && track.cover.trim() !== '') {
      // For online streaming tracks - ensure highest quality
      if (track.cover.startsWith('http')) {
        // Find quality parameter
        try {
          const url = new URL(track.cover);

          // Always use the highest quality (100)
          url.searchParams.set('quality', '100');

          // Force image CDN to provide highest resolution
          if (url.hostname.includes('saavn') || url.hostname.includes('jiosaavn')) {
            url.searchParams.set('w', '500');
            url.searchParams.set('h', '500');
          }

          return { uri: url.toString() };
        } catch (e) {
          // If URL parsing fails, use original URL at highest quality
          if (track.cover.includes('?')) {
            // If URL already has parameters, add quality=100
            return { uri: `${track.cover}&quality=100` };
          } else {
            return { uri: `${track.cover}?quality=100` };
          }
        }
      }
      return { uri: track.cover };
    } else {
      // Use Music.jpeg for local tracks as default
      return DEFAULT_LOCAL_MUSIC_IMAGE;
    }
  };

  const isCurrentlyPlaying = activeTrackId === song.id && isPlaying;
  const isPaused = activeTrackId === song.id && !isPlaying;

  // Determine what image source to use
  const getImageSource = () => {
    if (isCurrentlyPlaying) {
      return require("../../Images/playing.gif");
    } else if (isPaused) {
      return require("../../Images/songPaused.gif");
    } else {
      // For local songs, use Music.jpeg as default artwork
      return DEFAULT_LOCAL_MUSIC_IMAGE;
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && { backgroundColor: theme.dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.05)' }
      ]}
      android_ripple={{ color: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)' }}
    >
      <View style={styles.songInfo}>
        <View style={styles.imageContainer}>
          <FastImage
            source={getImageSource()}
            style={styles.image}
            resizeMode={FastImage.resizeMode.cover}
          />
        </View>
        <View style={styles.textContainer}>
          <PlainText
            text={formatTitle(song.title)}
            style={styles.title}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
          <SmallText
            text={formatArtist(song.artist)}
            style={styles.artist}
            numberOfLines={1}
            ellipsizeMode="tail"
          />
        </View>
      </View>
      <Pressable
        ref={menuButtonRef}
        onPress={handleMenuPress}
        hitSlop={8}
        style={styles.menuButton}
      >
        <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
      </Pressable>
    </Pressable>
  );
}

const getThemedStyles = (colors, dark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderBottomWidth: 0.5,
    borderBottomColor: colors.border,
    justifyContent: 'space-between',
  },
  songInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  imageContainer: {
    width: 50,
    height: 50,
    borderRadius: 4,
    overflow: 'hidden',
    marginRight: 12,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: 16,
    color: colors.text,
    marginBottom: 4,
  },
  artist: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  menuButton: {
    padding: 8,
    justifyContent: 'center',
    backgroundColor: 'transparent',
    borderRadius: 16,
    marginLeft: 4,
    elevation: 0,
  },
});