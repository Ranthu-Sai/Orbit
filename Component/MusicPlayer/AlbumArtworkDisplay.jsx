import React from 'react';
import { View, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { GestureDetector } from 'react-native-gesture-handler';
import { useNavigationGestureControl } from './GestureControls';
import { Surface, useTheme } from 'react-native-paper';

export const AlbumArtworkDisplay = ({
  currentPlaying,
  artworkSource,
  onClose,
  style,
}) => {
  const theme = useTheme();

  // Only use horizontal swipe gesture for track navigation
  const navigationControl = useNavigationGestureControl();
  const navigationGesture =
    navigationControl.createStandaloneNavigationGesture();

  return (
    <GestureDetector gesture={navigationGesture}>
      <View style={[styles.container, { ...style }]}>
        <View style={styles.artworkWrapper}>
          <Surface
            style={[
              styles.artworkContainer,
              {
                width: '100%',
                aspectRatio: 1, // Ensure square aspect ratio
                backgroundColor: theme.colors.surfaceVariant,
                elevation: 4,
              },
            ]}
          >
            <FastImage
              source={artworkSource}
              style={styles.artworkImage}
              resizeMode={FastImage.resizeMode.cover}
              key={`artwork-${JSON.stringify(artworkSource)}`}
            />
          </Surface>
        </View>
      </View>
    </GestureDetector>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkWrapper: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkContainer: {
    borderRadius: 8,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  artworkImage: {
    width: '100%',
    height: '100%',
  },
});
