import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PlaylistListSkeleton - Skeleton UI for vertical list of playlists/albums
 * Used for CustomPlaylist and search results
 */
export const PlaylistListSkeleton = ({ count = 8 }) => {
  const { dark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(shimmerAnim, {
          toValue: 0,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [shimmerAnim]);

  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  // Playlist row skeleton
  const PlaylistRowSkeleton = () => (
    <View style={styles.playlistRow}>
      {/* Playlist artwork */}
      <Animated.View
        style={[
          styles.playlistArtwork,
          {
            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
            opacity: shimmerOpacity,
          },
        ]}
      />
      {/* Playlist text */}
      <View style={styles.playlistTextContainer}>
        <Animated.View
          style={[
            styles.playlistTitle,
            {
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.playlistSubtitle,
            {
              backgroundColor: dark ? '#252525' : '#d0d0d0',
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {[...Array(count)].map((_, index) => (
        <PlaylistRowSkeleton key={index} />
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingBottom: 100,
  },
  playlistRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  playlistArtwork: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 16,
  },
  playlistTextContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  playlistTitle: {
    height: 18,
    width: '70%',
    borderRadius: 4,
    marginBottom: 8,
  },
  playlistSubtitle: {
    height: 14,
    width: '40%',
    borderRadius: 3,
  },
});

export default PlaylistListSkeleton;
