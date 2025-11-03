import React, { useRef, useCallback } from 'react';
import { Animated, Pressable } from 'react-native';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlayNextSong } from "../../MusicPlayerFunctions";

export const NextSongButton = ({ size = 28, color, style }) => {
  const theme = useTheme();
  const scaleAnim = React.useRef(new Animated.Value(1)).current;
  const isProcessingRef = useRef(false);
  
  const handlePress = useCallback(() => {
    if (isProcessingRef.current) return;
    
    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start();
    
    isProcessingRef.current = true;
    
    PlayNextSong()
      .catch(error => {
        console.log("Error playing next song:", error);
      })
      .finally(() => {
        setTimeout(() => {
          isProcessingRef.current = false;
        }, 300);
      });
  }, [scaleAnim]);

  const buttonSize = 44; // Fixed size for the button container
  const iconSize = size || 24;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: pressed ? 'rgba(200, 200, 200, 0.3)' : 'transparent',
      })}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon
          name="skip-next"
          size={iconSize}
          color={color || theme.colors.onSurface}
        />
      </Animated.View>
    </Pressable>
  );
};
