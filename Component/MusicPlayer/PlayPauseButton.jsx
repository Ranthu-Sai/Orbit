import { useCallback, useRef, useEffect } from 'react';
import { ActivityIndicator, View, Animated, Easing, Pressable } from 'react-native';
import { usePlaybackState } from 'react-native-track-player';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PauseSong, PlaySong } from "../../MusicPlayerFunctions";

export const PlayPauseButton = ({ isFullScreen, size = 32, color }) => {
  const theme = useTheme();
  const playerState = usePlaybackState();
  const lastActionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const opacityAnim = useRef(new Animated.Value(1)).current;

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
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, []);

  const isPlaying = playerState && (playerState.state === 'playing' || playerState.state === 6);
  const buttonSize = isFullScreen ? size * 1.8 : size * 1.5; // Increased size for better touch
  const iconSize = size * 1; // Increased icon size relative to button

  // Handle button press with animation
  const handlePress = () => {
    // Scale down animation
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

    if (isPlaying) {
      debouncedPause();
    } else {
      debouncedPlay();
    }
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
          backgroundColor: theme.colors.primary,
          opacity: opacityAnim,
          transform: [{ scale: scaleAnim }]
        }}
      >
        <ActivityIndicator 
          size={iconSize * 0.7} 
          color={theme.colors.onPrimary}
        />
      </Animated.View>
    );
  }

  const buttonStyle = {
    margin: 0,
    width: buttonSize,
    height: buttonSize,
    borderRadius: buttonSize / 2,
    backgroundColor: '#ffffff', // White background
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  };

  return (
    <Pressable 
      onPress={handlePress}
      style={{
        width: buttonSize,
        height: buttonSize,
        borderRadius: buttonSize / 2,
        backgroundColor: '#ffffff',
        justifyContent: 'center',
        alignItems: 'center',
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
      }}
    >
      <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={iconSize}
          color="#000000"
        />
      </Animated.View>
    </Pressable>
  );
};
