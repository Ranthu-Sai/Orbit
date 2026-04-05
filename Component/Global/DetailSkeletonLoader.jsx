import React, { useEffect, useRef, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const IMAGE_SIZE = SCREEN_WIDTH * 0.4; // 40% of screen width - matches AlbumHeader/PlaylistHeader

/**
 * DetailSkeletonLoader - A smooth, animated skeleton UI for Album/Playlist detail pages
 * Matches the actual AlbumHeader/PlaylistHeader layout exactly:
 * - Row layout: 40% image on left, 60% content on right
 * - Title, subtitle, action icons
 * - Full-width Play and Shuffle buttons
 * - Song list with number, artwork, title/artist, icons
 */
export const DetailSkeletonLoader = ({ type = 'playlist' }) => {
  const { colors, dark } = useTheme();
  const shimmerAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Create smooth infinite shimmer animation
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

  // Smooth shimmer opacity interpolation
  const shimmerOpacity = shimmerAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.6, 0.3],
  });

  const styles = useMemo(() => getStyles(dark), [dark]);

  // Song row skeleton - matches EachSongCard exactly
  const SongRowSkeleton = ({ index }) => (
    <View style={styles.songRow}>
      {/* Song number */}
      <View style={styles.songNumberContainer}>
        <Animated.View
          style={[styles.songNumber, { opacity: shimmerOpacity }]}
        />
      </View>
      {/* Song artwork - 45-50px as per EachSongCard */}
      <View style={styles.songArtworkContainer}>
        <Animated.View
          style={[styles.songArtwork, { opacity: shimmerOpacity }]}
        />
      </View>
      {/* Song text */}
      <View style={styles.songTextContainer}>
        <Animated.View
          style={[styles.songTitleSkeleton, { opacity: shimmerOpacity }]}
        />
        <Animated.View
          style={[styles.songArtistSkeleton, { opacity: shimmerOpacity }]}
        />
      </View>
      {/* Download icon */}
      <Animated.View
        style={[styles.downloadIcon, { opacity: shimmerOpacity }]}
      />
      {/* Menu button */}
      <Animated.View style={[styles.menuButton, { opacity: shimmerOpacity }]} />
    </View>
  );

  return (
    <ScrollView
      style={[
        styles.container,
        { backgroundColor: dark ? colors.background : '#FFFFFF' },
      ]}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {/* Header Container - matches AlbumHeader/PlaylistHeader container */}
      <View style={styles.headerContainer}>
        {/* Top Section: Row with Image (40%) + Content (60%) */}
        <View style={styles.topSection}>
          {/* Cover Image - 40% width */}
          <Animated.View
            style={[styles.coverImage, { opacity: shimmerOpacity }]}
          />

          {/* Content Section - 60% */}
          <View style={styles.contentSection}>
            {/* Title skeleton */}
            <Animated.View
              style={[styles.titleSkeleton, { opacity: shimmerOpacity }]}
            />
            {/* Second line of title (optional) */}
            <Animated.View
              style={[styles.titleSkeleton2, { opacity: shimmerOpacity }]}
            />

            {/* Song count skeleton */}
            <Animated.View
              style={[styles.songCountSkeleton, { opacity: shimmerOpacity }]}
            />

            {/* Action Icons Row: Like, Download, More */}
            <View style={styles.actionIconsRow}>
              <Animated.View
                style={[styles.actionIcon, { opacity: shimmerOpacity }]}
              />
              <Animated.View
                style={[styles.actionIcon, { opacity: shimmerOpacity }]}
              />
              <Animated.View
                style={[styles.actionIcon, { opacity: shimmerOpacity }]}
              />
            </View>
          </View>
        </View>

        {/* Button Row: Play & Shuffle - Full width */}
        <View style={styles.buttonRow}>
          <Animated.View
            style={[styles.playButton, { opacity: shimmerOpacity }]}
          />
          <Animated.View
            style={[styles.shuffleButton, { opacity: shimmerOpacity }]}
          />
        </View>
      </View>

      {/* Spacer like in Playlist.jsx */}
      <View style={{ height: 15 }} />

      {/* Songs List Skeleton */}
      <View style={styles.songsContainer}>
        {[...Array(10)].map((_, index) => (
          <SongRowSkeleton key={index} index={index} />
        ))}
      </View>
    </ScrollView>
  );
};

const getStyles = (dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 180,
    },

    // Header - matches AlbumHeader/PlaylistHeader container
    headerContainer: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 12,
    },

    // Top Section: Row layout
    topSection: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },

    // Cover Image: 40% width square
    coverImage: {
      width: IMAGE_SIZE,
      height: IMAGE_SIZE,
      borderRadius: 8,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Content Section: Right side
    contentSection: {
      flex: 1,
      marginLeft: 20,
      paddingLeft: 4,
      justifyContent: 'flex-start',
      paddingTop: 8,
    },

    // Title skeleton
    titleSkeleton: {
      height: 22,
      width: '90%',
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 6,
    },
    titleSkeleton2: {
      height: 22,
      width: '60%',
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 8,
    },

    // Song count
    songCountSkeleton: {
      height: 14,
      width: 100,
      borderRadius: 4,
      backgroundColor: dark ? '#252525' : '#d0d0d0',
      marginBottom: 12,
    },

    // Action Icons Row
    actionIconsRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginLeft: -4,
      gap: 12,
    },
    actionIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Button Row
    buttonRow: {
      flexDirection: 'row',
      marginTop: 16,
      gap: 12,
    },
    playButton: {
      flex: 1,
      height: 44,
      borderRadius: 24,
      backgroundColor: dark ? '#333333' : '#d0d0d0',
    },
    shuffleButton: {
      flex: 1,
      height: 44,
      borderRadius: 24,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      borderWidth: 1,
      borderColor: dark ? '#3a3a3a' : '#c0c0c0',
    },

    // Songs Container - matches Playlist.jsx paddingHorizontal: 15
    songsContainer: {
      paddingHorizontal: 12,
    },

    // Song Row - matches EachSongCard layout
    songRow: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: 8,
      paddingHorizontal: 12,
    },

    // Song number
    songNumberContainer: {
      marginRight: 10,
    },
    songNumber: {
      width: 20,
      height: 16,
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Song artwork - 45-50px as per EachSongCard
    songArtworkContainer: {
      marginRight: 10,
    },
    songArtwork: {
      width: 48,
      height: 48,
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Song text
    songTextContainer: {
      flex: 1,
    },
    songTitleSkeleton: {
      height: 16,
      width: '75%',
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 6,
    },
    songArtistSkeleton: {
      height: 12,
      width: '55%',
      borderRadius: 3,
      backgroundColor: dark ? '#252525' : '#d0d0d0',
    },

    // Download icon
    downloadIcon: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: dark ? '#252525' : '#d8d8d8',
      marginRight: 8,
    },

    // Menu button
    menuButton: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: dark ? '#252525' : '#d8d8d8',
    },
  });

export default DetailSkeletonLoader;
