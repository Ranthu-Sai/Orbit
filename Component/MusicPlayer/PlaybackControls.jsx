import React from "react";
import { StyleSheet, View } from "react-native";
import { Surface, useTheme } from 'react-native-paper';
import { PlayPauseButton } from "./PlayPauseButton";
import { NextSongButton } from "./NextSongButton";
import { PreviousSongButton } from "./PreviousSongButton";
import { RepeatSongButton } from "./RepeatSongButton";
import { LikeSongButton } from "./LikeSongButton";
import { Spacer } from "../Global/Spacer";

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 32,
  },
  controlsRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    maxWidth: 400,
  },
  navigationControls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 24,
  },
  buttonContainer: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export const PlaybackControls = ({ 
  style,
  likeButtonSize = 28,
  navigationButtonSize = 32,
  showLikeButton = true,
  showRepeatButton = true
}) => {
  const theme = useTheme();

  return (
    <View style={[styles.container, style?.container]}>
      <View style={styles.controlsRow}>
        {showLikeButton && (
          <View style={styles.buttonContainer}>
            <LikeSongButton size={likeButtonSize} />
          </View>
        )}
        
        <View style={[styles.navigationControls, style?.navigationControls]}>
          <PreviousSongButton size={navigationButtonSize} />
          <PlayPauseButton isFullScreen={true} size={navigationButtonSize * 1.2} />
          <NextSongButton size={navigationButtonSize} />
        </View>
        
        {showRepeatButton ? (
          <View style={styles.buttonContainer}>
            <RepeatSongButton size={likeButtonSize} />
          </View>
        ) : (
          <View style={styles.buttonContainer} />
        )}
      </View>
      <Spacer height={16} />
    </View>
  );
};
