import React, { useCallback, useRef } from 'react';
import { TouchableOpacity } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer from 'react-native-track-player';
import { useTheme } from 'react-native-paper';

export const ShuffleButton = ({ size = 24, color, style }) => {
  const theme = useTheme();
  const lastActionTimeRef = useRef(0);
  const isProcessingRef = useRef(false);
  const [isShuffled, setIsShuffled] = React.useState(false);

  // Load the initial shuffle state
  React.useEffect(() => {
    const loadShuffleState = async () => {
      try {
        const shuffleMode = await TrackPlayer.getShuffleMode();
        setIsShuffled(shuffleMode === TrackPlayer.SHUFFLE_MODES.QUEUE);
      } catch (error) {
        console.log('Error getting shuffle mode:', error);
      }
    };

    loadShuffleState();
  }, []);

  // Debounced shuffle toggle to prevent rapid state changes
  const toggleShuffle = useCallback(async () => {
    const now = Date.now();
    if (now - lastActionTimeRef.current < 500 || isProcessingRef.current) {
      return; // Prevent rapid successive calls
    }

    lastActionTimeRef.current = now;
    isProcessingRef.current = true;

    try {
      const newShuffleState = !isShuffled;
      await TrackPlayer.setShuffleMode(
        newShuffleState 
          ? TrackPlayer.SHUFFLE_MODES.QUEUE 
          : TrackPlayer.SHUFFLE_MODES.OFF
      );
      setIsShuffled(newShuffleState);
    } catch (error) {
      console.log('Error toggling shuffle:', error);
    } finally {
      // Reset processing flag after a delay
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [isShuffled]);

  // Use theme color if no color is provided
  const iconColor = color || (theme.dark ? '#ffffff' : '#000000');
  const activeColor = color || theme.colors.primary || '#4169E1';

  return (
    <TouchableOpacity 
      onPress={toggleShuffle} 
      style={[{
        width: size + 16,
        height: size + 16,
        justifyContent: 'center',
        alignItems: 'center',
      }, style]}
      activeOpacity={0.7}
    >
      <MaterialIcons 
        name={isShuffled ? 'shuffle-on' : 'shuffle'} 
        size={size} 
        color={isShuffled ? activeColor : iconColor}
      />
    </TouchableOpacity>
  );
};
