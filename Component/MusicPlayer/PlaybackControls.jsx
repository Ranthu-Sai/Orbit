import React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, useTheme } from 'react-native-paper';
import { PlayPauseButton } from "./PlayPauseButton";
import { NextSongButton } from "./NextSongButton";
import { PreviousSongButton } from "./PreviousSongButton";
import { RepeatSongButton } from "./RepeatSongButton";
import { ShuffleButton } from "./ShuffleButton";
import { Spacer } from "../Global/Spacer";

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12,  // Reduced from 24
  },
  controlsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    position: 'relative',
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,  // Space between buttons
    position: 'absolute',
    left: 40,  // Align with side buttons
    right: 40, // Align with side buttons
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  navigationButton: {
    width: 48,  // Slightly increased width for next/previous buttons
    height: 48, // Slightly increased height for next/previous buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    width: 32,  // Reduced from 40
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 4,  // Added small padding
  },
  buttonContainer: {
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 28,
  },
});

export const PlaybackControls = ({ 
  style,
  buttonSize = 28,
  navigationButtonSize = 32,
  showShuffle = true,
  showRepeat = true,
  iconColor,
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style?.container]}>
      <View style={styles.controlsRow}>
        {/* Shuffle Button - Left Side */}
        <View style={styles.sideButton}>
          {showShuffle && (
            <ShuffleButton size={buttonSize} color={iconColor} />
          )}
        </View>
        
        {/* Navigation Controls - Center */}
        <View style={styles.navigationControls}>
          <View style={styles.navigationButton}>
            <PreviousSongButton size={navigationButtonSize * 1.2} color={iconColor} />
          </View>
          <PlayPauseButton isFullScreen={true} size={navigationButtonSize} color={iconColor} />
          <View style={styles.navigationButton}>
            <NextSongButton size={navigationButtonSize * 1.2} color={iconColor} />
          </View>
        </View>
        
        {/* Repeat Button - Right Side */}
        <View style={styles.sideButton}>
          {showRepeat && (
            <RepeatSongButton size={buttonSize} color={iconColor} />
          )}
        </View>
      </View>
      <Spacer height={16} />
    </View>
  );
};
