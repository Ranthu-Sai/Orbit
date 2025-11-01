import React from "react";
import { Dimensions, StyleSheet } from "react-native";
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
  const imageSize = width * 0.8;

  return (
    <GestureManager
      onClose={onClose}
      style={[styles.container, { ...style }]}
    >
      <Surface
        style={[
          styles.artworkContainer,
          {
            width: imageSize,
            height: imageSize,
            backgroundColor: theme.colors.surfaceVariant,
            elevation: 4,
          },
        ]}
      >
        <FastImage
          source={artworkSource}
          style={[
            styles.artworkImage,
            {
              width: imageSize,
              height: imageSize,
            },
          ]}
          resizeMode={FastImage.resizeMode.contain}
          key={`artwork-${JSON.stringify(artworkSource)}`}
        />
      </Surface>
    </GestureManager>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
  },
  artworkContainer: {
    borderRadius: 12,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  artworkImage: {
    borderRadius: 8,
  },
});
