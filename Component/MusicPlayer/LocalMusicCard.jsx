import React, {
  useState,
  useContext,
  useRef,
  useEffect,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  findNodeHandle,
  UIManager,
  Platform,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import Context from '../../Context/Context';
import { useTheme, useNavigation } from '@react-navigation/native';
import * as RNFS from 'react-native-fs';
import { PlayOneSong } from '../../MusicPlayerFunctions';
import TrackPlayer from 'react-native-track-player';

// Default music image for local tracks
const DEFAULT_LOCAL_MUSIC_IMAGE = require('../../Images/Music.jpeg');

export const LocalMusicCard = ({
  song,
  index,
  allSongs,
  artist,
  activeTrackId,
  isPlaying,
}) => {
  const {
    updateTrack,
    setVisible,
    setIndex,
    setPreviousScreen,
    setMusicPreviousScreen,
  } = useContext(Context);
  const menuButtonRef = useRef(null);
  const theme = useTheme();
  const styles = getThemedStyles(theme.colors, theme.dark);
  const navigation = useNavigation();
  const [fullNavPath, setFullNavPath] = useState('');

  // Initialize navigation path once on mount
  useEffect(() => {
    if (!fullNavPath) {
      try {
        const currentState = navigation.getState();
        if (
          currentState &&
          currentState.routes &&
          currentState.routes.length > 0
        ) {
          const currentTabRoute = currentState.routes[currentState.index];

          if (currentTabRoute.name === 'Library' && currentTabRoute.state) {
            const libraryRoute =
              currentTabRoute.state.routes[currentTabRoute.state.index];
            if (libraryRoute.name === 'MyMusicPage') {
              setFullNavPath('Library/MyMusicPage');
              return;
            } else if (libraryRoute.name === 'DownloadScreen') {
              setFullNavPath('Library/DownloadScreen');
              return;
            }
          }

          if (currentTabRoute.state && currentTabRoute.state.routes) {
            const activeNestedRoute =
              currentTabRoute.state.routes[currentTabRoute.state.index];
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
  }, []);

  const handleMenuPress = () => {
    if (menuButtonRef.current) {
      const handle = findNodeHandle(menuButtonRef.current);
      UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
        setVisible({
          visible: true,
          position: { y: pageY },
          ...song,
          isLocalMusic: true,
        });
      });
    }
  };

  const getNavigationPath = useCallback(() => {
    return fullNavPath || 'Library/MyMusicPage';
  }, [fullNavPath]);

  const handlePress = async () => {
    try {
      const currentState = navigation.getState();
      if (
        currentState &&
        currentState.routes &&
        currentState.routes.length > 0
      ) {
        const navPath = getNavigationPath();
        setPreviousScreen(navPath);
        setMusicPreviousScreen(navPath);
      }

      await prepareAndPlayTracks();
    } catch (error) {
      console.error('Error playing track:', error);
    }
  };

  const formatTitle = (title) => {
    if (!title) {
      return 'Unknown Title';
    }
    // Remove file extension only - let UI handle truncation with ellipsis
    return title.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');
  };

  const formatArtist = (artistName) => {
    if (!artistName) {
      return 'Unknown Artist';
    }
    // Remove file extension only - let UI handle truncation with ellipsis
    return artistName.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');
  };

  const prepareAndPlayTracks = async () => {
    try {
      const navPath = getNavigationPath();
      const isFromMyMusic = navPath.includes('MyMusicPage');

      if (!allSongs || !Array.isArray(allSongs) || allSongs.length === 0) {
        const singleTrack = {
          id: song.id || String(Math.random()),
          url: song.url || (song.path ? `file://${song.path}` : null),
          title: formatTitle(song.title),
          artist: formatArtist(song.artist),
          artwork: getArtworkForTrack(song),
          isLocal: true,
          sourceType: isFromMyMusic ? 'mymusic' : 'download',
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

      const songIndex = allSongs.findIndex((s) => s.id === song.id);
      if (songIndex === -1) {
        console.error('Song not found in queue');
        return;
      }

      // Use LocalMusicQueueManager for progressive loading (prevents UI lag with 200+ songs)
      const localMusicQueueManager =
        require('../../Utils/LocalMusicQueueManager').default;

      await TrackPlayer.reset();

      const { initialBatch, success } = await localMusicQueueManager.initialize(
        allSongs,
        songIndex
      );

      if (success && initialBatch.length > 0) {
        // Override sourceType based on navigation path
        const tracksWithSource = initialBatch.map((track) => ({
          ...track,
          sourceType: isFromMyMusic ? 'mymusic' : 'download',
        }));

        await TrackPlayer.add(tracksWithSource);
        await TrackPlayer.play();
        setIndex(1);
      } else {
        console.error('Failed to initialize progressive queue');
      }
    } catch (error) {
      console.error('Error in prepareAndPlayTracks:', error);
    }
  };

  const getArtworkForTrack = (track) => {
    // Check for cached artwork first (from metadata manager)
    if (track.cover && typeof track.cover === 'object' && track.cover.uri) {
      return track.cover;
    }
    if (
      track.artwork &&
      typeof track.artwork === 'object' &&
      track.artwork.uri
    ) {
      return track.artwork;
    }

    // Fallback to default
    return DEFAULT_LOCAL_MUSIC_IMAGE;
  };

  const isCurrentlyPlaying = activeTrackId === song.id && isPlaying;
  const isPaused = activeTrackId === song.id && !isPlaying;

  const getImageSource = () => {
    if (isCurrentlyPlaying) {
      return require('../../Images/playing.gif');
    } else if (isPaused) {
      return require('../../Images/songPaused.gif');
    } else {
      // Check for cached artwork from metadata manager
      if (song.cover && typeof song.cover === 'object' && song.cover.uri) {
        return song.cover;
      } else if (
        song.artwork &&
        typeof song.artwork === 'object' &&
        song.artwork.uri
      ) {
        return song.artwork;
      } else {
        return DEFAULT_LOCAL_MUSIC_IMAGE;
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.container,
        pressed && {
          backgroundColor: theme.dark
            ? 'rgba(255,255,255,0.12)'
            : 'rgba(0,0,0,0.05)',
        },
      ]}
      android_ripple={{
        color: theme.dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.08)',
      }}
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
        <MaterialCommunityIcons
          name="dots-vertical"
          size={24}
          color={theme.colors.text}
        />
      </Pressable>
    </Pressable>
  );
};

const getThemedStyles = (colors, dark) =>
  StyleSheet.create({
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
