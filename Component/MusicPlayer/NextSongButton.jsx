import React, { useRef, useCallback } from 'react';
import { Animated, StyleSheet } from 'react-native';
import { useTheme } from 'react-native-paper';
import { IconButton } from 'react-native-paper';
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
        toValue: 0.85,
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

  const iconColor = color || (theme.dark ? '#ffffff' : '#000000');
  
  return (
    <Animated.View style={[
      styles.buttonContainer, 
      { transform: [{ scale: scaleAnim }] },
      style
    ]}>
      <IconButton
        icon="skip-next"
        size={size}
        iconColor={iconColor}
        onPress={handlePress}
        style={styles.button}
        animated={true}
        rippleColor="rgba(0, 0, 0, 0.1)"
      />
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  button: {
    margin: 0,
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
