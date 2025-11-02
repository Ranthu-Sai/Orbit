import { useCallback, useRef } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { usePlaybackState } from 'react-native-track-player';
import { IconButton, useTheme } from 'react-native-paper';
import { PauseSong, PlaySong } from "../../MusicPlayerFunctions";

export const PlayPauseButton = ({ isFullScreen, size = 32, color }) => {
  const theme = useTheme();
  const playerState = usePlaybackState();
  const lastActionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);

  // Debounced play/pause functions to prevent rapid state changes
  const debouncedPlay = useCallback(async () => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 500 || isProcessingRef.current) {
      return; // Prevent rapid successive calls
    }

    lastActionTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      await PlaySong();
    } catch (error) {
      console.log("Error in play action:", error);
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, []);

  const debouncedPause = useCallback(async () => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 500 || isProcessingRef.current) {
      return; // Prevent rapid successive calls
    }

    lastActionTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      await PauseSong();
    } catch (error) {
      console.log("Error in pause action:", error);
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, []);

  const isPlaying = playerState && (playerState.state === 'playing' || playerState.state === 6);
  const buttonSize = isFullScreen ? size * 1.5 : size;
  const iconSize = isFullScreen ? size * 0.8 : size * 0.7;

  // Handle button press
  const handlePress = () => {
    if (isPlaying) {
      debouncedPause();
    } else {
      debouncedPlay();
    }
  };

  // Show loading indicator when buffering
  if (playerState?.state === 'buffering') {
    return (
      <View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: buttonSize,
          height: buttonSize,
        }}
      >
        <ActivityIndicator 
          size={iconSize} 
          color={color || theme.colors.onSurface} 
        />
      </View>
    );
  }

  return (
    <IconButton
      icon={isPlaying ? 'pause' : 'play'}
      size={buttonSize}
      iconColor={color || (isFullScreen ? theme.colors.background : theme.colors.onSurface)}
      onPress={handlePress}
      style={{
        margin: 0,
        backgroundColor: color ? 'transparent' : (isFullScreen ? theme.colors.onBackground : 'transparent'),
      }}
      containerColor={color ? 'transparent' : (isFullScreen ? theme.colors.onBackground : 'transparent')}
      mode={color ? 'text' : (isFullScreen ? 'contained' : 'text')}
      animated={true}
      rippleColor={theme.dark ? theme.colors.primary : 'rgba(255,255,255,0.3)'}
    />
  );
};
