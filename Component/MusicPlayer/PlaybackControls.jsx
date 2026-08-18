import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Surface, useTheme } from 'react-native-paper';
import { PlayPauseButton } from './PlayPauseButton';
import { NextSongButton } from './NextSongButton';
import { PreviousSongButton } from './PreviousSongButton';
import { RepeatSongButton } from './RepeatSongButton';
import { ShuffleButton } from './ShuffleButton';
import { Spacer } from '../Global/Spacer';
import { GlassBox } from '../Global/GlassBox';

const circleGradient = {
  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
  stops: [
    { offset: '0%', opacity: 0.5 },
    { offset: '40%', opacity: 0.0 },
    { offset: '60%', opacity: 0.0 },
    { offset: '100%', opacity: 0.5 },
  ],
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 12, // Reduced from 24
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
    gap: 24, // Space between buttons
    position: 'absolute',
    left: 40, // Align with side buttons
    right: 40, // Align with side buttons
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  navigationButton: {
    width: 48, // Slightly increased width for next/previous buttons
    height: 48, // Slightly increased height for next/previous buttons
    alignItems: 'center',
    justifyContent: 'center',
  },
  sideButton: {
    width: 32, // Reduced from 40
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
    paddingHorizontal: 4, // Added small padding
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
            <GlassBox id="shuffle-btn" gradientConfig={circleGradient} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
              <ShuffleButton size={buttonSize} color={iconColor} />
            </GlassBox>
          )}
        </View>

        {/* Navigation Controls - Center */}
        <View style={styles.navigationControls}>
          <View style={styles.navigationButton}>
            <GlassBox id="prev-btn" gradientConfig={circleGradient} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <PreviousSongButton
                size={navigationButtonSize * 0.8}
                color={iconColor}
              />
            </GlassBox>
          </View>
          <PlayPauseButton
            isFullScreen={true}
            size={navigationButtonSize}
            color={iconColor}
          />
          <View style={styles.navigationButton}>
            <GlassBox id="next-btn" gradientConfig={circleGradient} style={{ width: 56, height: 56, borderRadius: 28, alignItems: 'center', justifyContent: 'center' }}>
              <NextSongButton
                size={navigationButtonSize * 0.8}
                color={iconColor}
              />
            </GlassBox>
          </View>
        </View>

        {/* Repeat Button - Right Side */}
        <View style={styles.sideButton}>
          {showRepeat && (
            <GlassBox id="repeat-btn" gradientConfig={circleGradient} style={{ width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center' }}>
              <RepeatSongButton size={buttonSize} color={iconColor} />
            </GlassBox>
          )}
        </View>
      </View>
      <Spacer height={16} />
    </View>
  );
};
