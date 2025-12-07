import React from "react";
import { View, Dimensions, StyleSheet } from "react-native";
import FastImage from "react-native-fast-image";
import { GestureManager } from './GestureControls';
import { Surface, useTheme } from 'react-native-paper';

export const AlbumArtworkDisplay = ({
  currentPlaying,
  artworkSource,
  onClose,
  style,
}) => {
  const width = Dimensions.get("window").width;
  const theme = useTheme();
  const imageWidth = width * 0.92;
  const imageHeight = width * 0.98;

  return (
    <GestureManager
      onClose={onClose}
      style={[styles.container, { ...style }]}
    >
      <View style={styles.artworkWrapper}>
        <Surface
          style={[
            styles.artworkContainer,
            {
              width: imageWidth,
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
    </GestureManager>
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
