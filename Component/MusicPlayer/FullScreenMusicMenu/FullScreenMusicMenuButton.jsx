import React from 'react';
import { useTheme } from '@react-navigation/native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { IconButton } from 'react-native-paper';

/**
 * FullScreenMusicMenuButton - Three-dot menu button for FullScreenMusic
 * Provides a themed, pressable button that triggers the menu modal
 *
 * @param {Function} onPress - Callback function when button is pressed
 * @param {number} size - Size of the icon (default: 25)
 */
export const FullScreenMusicMenuButton = ({ onPress, size = 25, color }) => {
  const theme = useTheme();
  const iconColor = color || theme.colors.text;

  return (
    <IconButton
      icon={() => (
        <MaterialCommunityIcons
          name="dots-vertical"
          size={size}
          color={iconColor}
        />
      )}
      size={28}
      onPress={onPress}
      style={{ margin: 0, padding: 0 }}
      rippleColor="rgba(255, 255, 255, 0.2)"
    />
  );
};
