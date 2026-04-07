import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Pressable,
  Image,
  DeviceEventEmitter,
  ActivityIndicator,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useActiveTrack } from 'react-native-track-player';
import { PlayPauseButton } from './PlayPauseButton';
import { NextSongButton } from './NextSongButton';
import { useNavigation, useRoute, useTheme } from '@react-navigation/native';
// Add other imports as needed

export const CollapsePlayer = ({ setIndex }) => {
  const navigation = useNavigation();
  const route = useRoute();
  const theme = useTheme();

  // Get the current screen name from the route
  const currentScreenName = route.name;

  const currentPlaying = useActiveTrack();
  const isLocal = currentPlaying?.isLocal;

  // State for optimistic loading song (shown while stream is being fetched)
  const [loadingSong, setLoadingSong] = useState(null);

  // Listen for early metadata event from PlayOneSong
  useEffect(() => {
    const loadingListener = DeviceEventEmitter.addListener(
      'song-loading-started',
      (songData) => {
        setLoadingSong(songData);
      }
    );

    return () => {
      loadingListener.remove();
    };
  }, []);

  // Clear loading state when actual track starts playing
  useEffect(() => {
    if (currentPlaying && loadingSong && currentPlaying.id === loadingSong.id) {
      // Actual track is now ready, clear loading state
      setLoadingSong(null);
    }
  }, [currentPlaying, loadingSong]);

  // Handler for clicking on the player
  const handlePress = () => {
    setIndex(1, currentScreenName);
  };

  // Determine what to display: loading song (optimistic) or actual playing track
  const displaySong = loadingSong || currentPlaying;
  const isLoadingStream = loadingSong !== null;

  // If no song is playing or loading, don't show the player
  if (!displaySong) {
    return null;
  }

  return (
    <Pressable
      onPress={handlePress}
      style={[styles.container, { backgroundColor: theme.colors.card }]}
    >
      {/* Show default artwork when playing local music */}
      {isLocal && !isLoadingStream ? (
        <Image
          source={require('../../Images/Music.jpeg')}
          style={styles.artwork}
        />
      ) : (
        <FastImage
          source={{ uri: displaySong.artwork || displaySong.image }}
          style={styles.artwork}
        />
      )}

      <View style={styles.songInfo}>
        <Text
          style={[styles.title, { color: theme.colors.text }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displaySong.title}
        </Text>
        <Text
          style={[styles.artist, { color: theme.colors.textSecondary }]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {displaySong.artist}
        </Text>
      </View>

      <View style={styles.controls}>
        {isLoadingStream ? (
          // Show loading indicator while stream is being fetched
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size={24}
              color={theme.dark ? '#FFFFFF' : '#000000'}
            />
          </View>
        ) : (
          <>
            <PlayPauseButton isFullScreen={false} />
            <NextSongButton size={24} />
          </>
        )}
      </View>
    </Pressable>
  );
};

const styles = {
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
    padding: 10,
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  songInfo: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  artist: {
    fontSize: 14,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  loadingContainer: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
};
