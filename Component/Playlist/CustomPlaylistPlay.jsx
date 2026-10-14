import React, { useContext, useEffect, useState } from 'react';
import { useTheme } from '@react-navigation/native';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import TrackPlayer, {
  useActiveTrack,
  Event,
  State,
} from 'react-native-track-player';
import Context from '../../Context/Context';

export const CustomPlaylistPlay = ({
  onPress,
  songs = [],
  playlistId = '',
}) => {
  const theme = useTheme();
  const [isPlaying, setIsPlaying] = useState(false);
  const currentPlaying = useActiveTrack();

  const getContrastingTextColor = (hexColor) => {
    if (!hexColor || hexColor.length < 7) {
      return '#000000';
    } // Default to black if invalid color
    const r = parseInt(hexColor.slice(1, 3), 16);
    const g = parseInt(hexColor.slice(3, 5), 16);
    const b = parseInt(hexColor.slice(5, 7), 16);
    // http://www.w3.org/TR/AERT#color-contrast
    const brightness = (r * 299 + g * 587 + b * 114) / 1000;
    return brightness > 150 ? '#000000' : '#FFFFFF'; // Adjusted threshold for better visibility
  };

  const contrastingColor = getContrastingTextColor(theme.colors.primary);

  // Check if this playlist is currently playing
  useEffect(() => {
    let active = true;
    const checkPlaybackState = async () => {
      try {
        // RNTP v4 API. TrackPlayer.STATE_PLAYING no longer exists (reads as
        // undefined), so the old check never saw "playing" and the button
        // never showed "pause"
        const { state: playerState } = await TrackPlayer.getPlaybackState();
        const isPlayerPlaying = playerState === State.Playing;

        // Playing *this* playlist means the active track belongs to it
        // (checking the whole queue stayed true after moving on elsewhere)
        const isPlaylistPlaying =
          isPlayerPlaying &&
          !!currentPlaying &&
          songs.some((song) => song && song.id === currentPlaying.id);

        if (active) {
          setIsPlaying(isPlaylistPlaying);
        }
      } catch (error) {
        if (active) {
          setIsPlaying(false);
        }
      }
    };

    // Check initially, then on every play/pause change (no polling)
    checkPlaybackState();
    const playerStateListener = TrackPlayer.addEventListener(
      Event.PlaybackState,
      () => checkPlaybackState()
    );

    return () => {
      active = false;
      playerStateListener.remove();
    };
  }, [currentPlaying, songs, playlistId]);

  // Handle play/pause toggle
  const handlePress = async () => {
    try {
      if (isPlaying) {
        // If this playlist is currently playing, just pause it
        await TrackPlayer.pause();
      } else {
        // If this playlist is not playing, trigger the onPress handler
        // which will replace the current queue with this playlist's songs
        onPress && onPress(true); // Pass true to indicate we want to force-play
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  return (
    <View style={styles.buttonContainer}>
      <TouchableOpacity
        style={[styles.playButton, { backgroundColor: theme.colors.primary }]}
        onPress={handlePress}
        activeOpacity={0.8}
      >
        <Ionicons
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={contrastingColor}
        />
        <Text style={[styles.playButtonText, { color: contrastingColor }]}>
          {isPlaying ? 'Pause' : 'Play'}
        </Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    // backgroundColor: '#FFFFFF', // Applied dynamically
    paddingVertical: 12,
    paddingHorizontal: 32,
    borderRadius: 30,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    marginRight: 16,
  },
  playButtonText: {
    // color: '#000000', // Applied dynamically
    fontSize: 15,
    fontWeight: '700',
    marginLeft: 8,
  },
});
