import React, { memo } from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';

const SIZE = 56;

// Black icon on light accents, white on dark ones
const getContrastingColor = (hexColor) => {
  if (!hexColor || hexColor.length < 7) {
    return '#000000';
  }
  const r = parseInt(hexColor.slice(1, 3), 16);
  const g = parseInt(hexColor.slice(3, 5), 16);
  const b = parseInt(hexColor.slice(5, 7), 16);
  const brightness = (r * 299 + g * 587 + b * 114) / 1000;
  return brightness > 150 ? '#000000' : '#FFFFFF';
};

/**
 * Circular play/pause button for album headers.
 * @param {Object} props
 * @param {() => void} props.onPress - Toggles playback for the album
 * @param {boolean} props.isPlaying - Album is the one currently playing
 * @param {string} [props.albumId] - Used for test IDs only
 */
const PlayButtonComponent = ({ onPress, isPlaying = false, albumId }) => {
  const theme = useTheme();
  const background = theme.colors.primary || '#1DB954';

  return (
    <TouchableOpacity
      onPress={onPress}
      activeOpacity={0.8}
      style={[styles.button, { backgroundColor: background }]}
      accessibilityRole="button"
      accessibilityLabel={isPlaying ? 'Pause album' : 'Play album'}
      testID={albumId ? `album-play-${albumId}` : 'album-play'}
    >
      <Ionicons
        name={isPlaying ? 'pause' : 'play'}
        size={28}
        color={getContrastingColor(background)}
        // The play glyph is optically left-heavy; nudge it to look centred
        style={isPlaying ? null : styles.playIconNudge}
      />
    </TouchableOpacity>
  );
};

export const PlayButton = memo(PlayButtonComponent);

const styles = StyleSheet.create({
  button: {
    width: SIZE,
    height: SIZE,
    borderRadius: SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  playIconNudge: {
    marginLeft: 3,
  },
});
