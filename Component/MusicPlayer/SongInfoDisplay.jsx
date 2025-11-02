import React from "react";
import { StyleSheet, View } from "react-native";
import { Text, useTheme } from 'react-native-paper';
import { Spacer } from "../Global/Spacer";

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 8,
    marginTop: 4,
  },
  title: {
    textAlign: 'center',
    fontWeight: '700',
    letterSpacing: 0.4,
    fontSize: 20,
    lineHeight: 24,
    marginBottom: 2,
  },
  artist: {
    textAlign: 'center',
    opacity: 0.8,
    letterSpacing: 0.2,
    fontSize: 15,
    lineHeight: 20,
  },
});

export const SongInfoDisplay = ({ 
  currentPlaying, 
  isOffline, 
  getTextColor,
  style 
}) => {
  const theme = useTheme();

  const getTitleText = () => {
    if (!currentPlaying?.title) {
      return isOffline ? "Offline Mode" : "No music :(";
    }
    return currentPlaying.title;
  };

  const getArtistText = () => {
    if (!currentPlaying?.artist) {
      return isOffline ? "Local Music Available" : "Explore now!";
    }
    return currentPlaying.artist;
  };

  const titleText = getTitleText();
  const artistText = getArtistText();

  return (
    <View style={[styles.container, style?.container]}>
      <Text
        variant="headlineSmall"
        style={[
          styles.title,
          { 
            color: getTextColor('primary'),
            ...style?.title
          }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {titleText}
      </Text>
      <Spacer height={4} />
      <Text
        variant="bodyMedium"
        style={[
          styles.artist,
          { 
            color: getTextColor('secondary'),
            ...style?.artist
          }
        ]}
        numberOfLines={1}
        ellipsizeMode="tail"
      >
        {artistText}
      </Text>
      <Spacer height={8} />
    </View>
  );
};
