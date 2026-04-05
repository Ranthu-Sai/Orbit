import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * HorizontalSongsSkeleton - Skeleton for HorizontalScrollSongs component
 * Shows 2 rows of 4 song cards in a horizontal scroll
 */
export const HorizontalSongsSkeleton = () => {
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

  const cardWidth = SCREEN_WIDTH * 0.8;

  // Single song row skeleton - matches EachSongCard layout
  const SongRowSkeleton = () => (
    <View style={styles.songRow}>
      {/* Song artwork */}
      <Animated.View
        style={[
          styles.songArtwork,
          {
            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
            opacity: shimmerOpacity,
          },
        ]}
      />
      {/* Song text */}
      <View style={styles.songTextContainer}>
        <Animated.View
          style={[
            styles.songTitle,
            {
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.songArtist,
            {
              backgroundColor: dark ? '#252525' : '#d0d0d0',
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>
      {/* Icons */}
      <View style={styles.iconsContainer}>
        <Animated.View
          style={[
            styles.iconSkeleton,
            {
              backgroundColor: dark ? '#252525' : '#d8d8d8',
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconSkeleton,
            {
              backgroundColor: dark ? '#252525' : '#d8d8d8',
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Heading skeleton */}
      <Animated.View
        style={[
          styles.headingSkeleton,
          {
            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
            opacity: shimmerOpacity,
          },
        ]}
      />
      <View style={{ height: 8 }} />

      {/* Horizontal scroll with 2 columns */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Column 1 - 4 songs */}
        <View style={[styles.column, { width: cardWidth }]}>
          <SongRowSkeleton />
          <SongRowSkeleton />
          <SongRowSkeleton />
          <SongRowSkeleton />
        </View>
        {/* Column 2 - 4 songs */}
        <View style={[styles.column, { width: cardWidth }]}>
          <SongRowSkeleton />
          <SongRowSkeleton />
          <SongRowSkeleton />
          <SongRowSkeleton />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  headingSkeleton: {
    height: 22,
    width: 180,
    borderRadius: 4,
  },
  scrollContent: {
    flexDirection: 'row',
  },
  column: {
    marginRight: 10,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  songArtwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 10,
  },
  songTextContainer: {
    flex: 1,
  },
  songTitle: {
    height: 16,
    width: '70%',
    borderRadius: 4,
    marginBottom: 6,
  },
  songArtist: {
    height: 12,
    width: '50%',
    borderRadius: 3,
  },
  iconsContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  iconSkeleton: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
});

export default HorizontalSongsSkeleton;
