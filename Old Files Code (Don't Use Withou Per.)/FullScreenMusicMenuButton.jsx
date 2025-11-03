import React from "react";
import { Pressable } from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { useTheme } from "@react-navigation/native";

/**
 * FullScreenMusicMenuButton - Three-dot menu button for FullScreenMusic
 * Provides a themed, pressable button that triggers the menu modal
 * 
 * @param {Function} onPress - Callback function when button is pressed
 * @param {number} size - Size of the icon (default: 25)
 */
export const FullScreenMusicMenuButton = ({ onPress, size = 25 }) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => ({
        paddingVertical: 8,
        paddingLeft: 8,
        paddingRight: 4,
        borderRadius: 20,
        backgroundColor: pressed ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
      })}
      hitSlop={8}
    >
      <MaterialCommunityIcons 
        name="dots-vertical" 
        size={size} 
        color={theme.colors.text}
      />
    </Pressable>
  );
};
