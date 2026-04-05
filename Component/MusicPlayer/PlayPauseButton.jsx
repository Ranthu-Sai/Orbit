import { useCallback, useRef, useEffect } from 'react';
import {
  ActivityIndicator,
  View,
  Animated,
  Easing,
  Pressable,
} from 'react-native';
import { usePlaybackState } from 'react-native-track-player';
import TrackPlayer from 'react-native-track-player';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

export const PlayPauseButton = ({ isFullScreen, size = 32, color }) => {
  const theme = useTheme();
  const playerState = usePlaybackState();
  const lastActionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

  // INSTANT play/pause - call TrackPlayer directly for zero-lag response
  const handlePlayPause = useCallback(async (shouldPlay) => {
    const now = Date.now();
    // Shorter debounce (150ms) for responsiveness while preventing double-taps
    if (now - lastActionTimeRef.current < 150 || isProcessingRef.current) {
      return;
    }

    lastActionTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      // Call TrackPlayer DIRECTLY for instant response (no wrapper function overhead)
      if (shouldPlay) {
        await TrackPlayer.play();
      } else {
        await TrackPlayer.pause();
      }
    } catch (error) {
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 100); // Reduced from 300ms
    }
  }, []);

  const isPlaying =
    playerState && (playerState.state === 'playing' || playerState.state === 6);
  const buttonSize = isFullScreen ? size * 1.8 : size * 1.5; // Increased size for better touch
  const iconSize = size * 1; // Increased icon size relative to button

  // Handle button press with animation - INSTANT response
  const handlePress = () => {
    // Quick scale animation (doesn't block action)
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 50, // Faster animation
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 4,
        useNativeDriver: true,
      }),
    ]).start();

    // Call play/pause - action happens BEFORE animation completes
    handlePlayPause(!isPlaying);
  };

  // Loading state animation
  useEffect(() => {
    if (playerState?.state === 'buffering') {
      Animated.loop(
        Animated.timing(opacityAnim, {
          toValue: 0.5,
          duration: 1000,
          useNativeDriver: true,
          easing: Easing.inOut(Easing.ease),
        })
      ).start();
    } else {
      opacityAnim.setValue(1);
    }
  }, [playerState?.state]);

  // Show loading indicator when buffering
  if (playerState?.state === 'buffering') {
    return (
      <Animated.View
        style={{
          alignItems: 'center',
          justifyContent: 'center',
          width: buttonSize,
          height: buttonSize,
          borderRadius: buttonSize / 2,
          backgroundColor: 'rgba(200, 200, 200, 0.3)', // Light gray with some transparency
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }],
        }}
      >
        <ActivityIndicator
          size={iconSize * 0.7}
          color={theme.dark ? '#FFFFFF' : '#000000'}
        />
      </Animated.View>
    );
  }

  const buttonStyle = {
    margin: 0,
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    backgroundColor: isFullScreen ? '#ffffff' : 'transparent', // White background only for full screen
    justifyContent: 'center',
    alignItems: 'center',
    elevation: isFullScreen ? 4 : 0,
    shadowColor: isFullScreen ? '#000' : 'transparent',
    shadowOffset: { width: 0, height: isFullScreen ? 2 : 0 },
    shadowOpacity: isFullScreen ? 0.25 : 0,
    shadowRadius: isFullScreen ? 3.84 : 0,
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        backgroundColor: pressed
          ? 'rgba(200, 200, 200, 0.3)'
          : isFullScreen
          ? '#ffffff'
          : 'transparent',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: isFullScreen ? 4 : 0,
        shadowColor: isFullScreen ? '#000' : 'transparent',
        shadowOffset: { width: 0, height: isFullScreen ? 2 : 0 },
        shadowOpacity: isFullScreen ? 0.25 : 0,
        shadowRadius: isFullScreen ? 3.84 : 0,
      })}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={iconSize}
          color={isFullScreen ? '#000000' : color || theme.colors.primary}
        />
      </Animated.View>
    </Pressable>
  );
};
