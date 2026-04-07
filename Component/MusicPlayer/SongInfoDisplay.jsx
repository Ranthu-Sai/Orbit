import React from 'react';
import { StyleSheet, View } from 'react-native';
import { Text } from 'react-native-paper';
import { Spacer } from '../Global/Spacer';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    width: '100%',
    marginBottom: 8,
    marginTop: 4,
  },
  textContainer: {
    flex: 1,
    marginRight: 12,
  },
  title: {
    textAlign: 'left',
    fontWeight: '700',
    letterSpacing: 0.4,
    fontSize: 18,
    lineHeight: 22,
    marginBottom: 2,
  },
  artist: {
    textAlign: 'left',
    opacity: 0.8,
    letterSpacing: 0.2,
    fontSize: 14,
    lineHeight: 18,
  },
  rightContent: {
    // This will be used for the right-side content
  },
});

export const SongInfoDisplay = ({
  currentPlaying,
  isOffline,
  getTextColor,
  style,
}) => {
  const getTitleText = () => {
    if (!currentPlaying?.title) {
      return isOffline ? 'Offline Mode' : 'No music :(';
    }
    return currentPlaying.title;
  };

  const getArtistText = () => {
    if (!currentPlaying?.artist) {
      return isOffline ? 'Local Music Available' : 'Explore now!';
    }
    return currentPlaying.artist;
  };

  const titleText = getTitleText();
  const artistText = getArtistText();

  return (
    <View style={[styles.container, style?.container]}>
      <View style={styles.textContainer}>
        <Text
          variant="headlineSmall"
          style={[
            styles.title,
            {
              color: getTextColor('primary'),
              ...style?.title,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {titleText}
        </Text>
        <Spacer height={2} />
        <Text
          variant="bodyMedium"
          style={[
            styles.artist,
            {
              color: getTextColor('secondary'),
              ...style?.artist,
            },
          ]}
          numberOfLines={1}
          ellipsizeMode="tail"
        >
          {artistText}
        </Text>
      </View>
      <View style={styles.rightContent}>
        {/* Right side content will go here */}
      </View>
    </View>
  );
};
