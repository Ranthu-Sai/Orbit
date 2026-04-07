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

/**
 * DiscoverSkeletonLoader - A smooth, animated skeleton UI for the Discover page
 * Matches the Discover page layout:
 * - 2x3 grid of DiscoverCards (46% width, 100px height)
 * - Horizontal sections for albums, charts, languages, artists, moments, genres
 */
export const DiscoverSkeletonLoader = () => {
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
  const cardWidth = SCREEN_WIDTH * 0.46;

  // DiscoverCard skeleton (matches 46% width, 100px height)
  const DiscoverCardSkeleton = () => (
    <Animated.View
      style={[
        styles.discoverCard,
        { width: cardWidth, opacity: shimmerOpacity },
      ]}
    >
      {/* Icon circle */}
      <View style={styles.iconCircle} />
      {/* Text line */}
      <View style={styles.cardTextSkeleton} />
    </Animated.View>
  );

  // Album card skeleton (140px width)
  const AlbumCardSkeleton = () => (
    <View style={styles.albumCard}>
      <Animated.View style={[styles.albumImage, { opacity: shimmerOpacity }]} />
      <Animated.View style={[styles.albumTitle, { opacity: shimmerOpacity }]} />
      <Animated.View
        style={[styles.albumSubtitle, { opacity: shimmerOpacity }]}
      />
    </View>
  );

  // Artist card skeleton (circular)
  const ArtistCardSkeleton = () => (
    <View style={styles.artistCard}>
      <Animated.View
        style={[styles.artistImage, { opacity: shimmerOpacity }]}
      />
      <Animated.View style={[styles.artistName, { opacity: shimmerOpacity }]} />
    </View>
  );

  // Language bundle skeleton
  const LanguageBundleSkeleton = () => (
    <View style={styles.languageBundle}>
      <Animated.View
        style={[styles.languageItem, { opacity: shimmerOpacity }]}
      />
      <Animated.View
        style={[styles.languageItem, { opacity: shimmerOpacity }]}
      />
    </View>
  );

  // Moment/Genre card skeleton
  const MomentCardSkeleton = () => (
    <View style={styles.momentBundle}>
      <Animated.View style={[styles.momentItem, { opacity: shimmerOpacity }]} />
      <Animated.View style={[styles.momentItem, { opacity: shimmerOpacity }]} />
    </View>
  );

  // Section heading skeleton
  const HeadingSkeleton = () => (
    <Animated.View
      style={[styles.headingSkeleton, { opacity: shimmerOpacity }]}
    />
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
      {/* Route Heading placeholder */}
      <View style={styles.routeHeading}>
        <Animated.View
          style={[styles.routeHeadingText, { opacity: shimmerOpacity }]}
        />
        <Animated.View
          style={[styles.routeHeadingSubtext, { opacity: shimmerOpacity }]}
        />
      </View>

      {/* DiscoverCards Grid - 3 rows of 2 cards */}
      <View style={styles.discoverGrid}>
        <View style={styles.discoverRow}>
          <DiscoverCardSkeleton />
          <DiscoverCardSkeleton />
        </View>
        <View style={styles.discoverRow}>
          <DiscoverCardSkeleton />
          <DiscoverCardSkeleton />
        </View>
        <View style={styles.discoverRow}>
          <DiscoverCardSkeleton />
          <DiscoverCardSkeleton />
        </View>
      </View>

      {/* New Albums & Singles Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
        </ScrollView>
      </View>

      {/* Top Charts Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
          <AlbumCardSkeleton />
        </ScrollView>
      </View>

      {/* Languages Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <LanguageBundleSkeleton />
          <LanguageBundleSkeleton />
          <LanguageBundleSkeleton />
          <LanguageBundleSkeleton />
        </ScrollView>
      </View>

      {/* Top Artists Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <ArtistCardSkeleton />
          <ArtistCardSkeleton />
          <ArtistCardSkeleton />
          <ArtistCardSkeleton />
        </ScrollView>
      </View>

      {/* Moments Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <MomentCardSkeleton />
          <MomentCardSkeleton />
          <MomentCardSkeleton />
        </ScrollView>
      </View>

      {/* Genres Section */}
      <View style={styles.section}>
        <HeadingSkeleton />
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.horizontalScroll}
          contentContainerStyle={styles.horizontalContent}
        >
          <MomentCardSkeleton />
          <MomentCardSkeleton />
          <MomentCardSkeleton />
        </ScrollView>
      </View>
    </ScrollView>
  );
};

/**
 * Inline skeleton for album/chart rows - use inside sections when loading
 */
export const AlbumRowSkeleton = ({ count = 4 }) => {
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

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingVertical: 8,
        gap: 12,
        flexDirection: 'row',
      }}
    >
      {[...Array(count)].map((_, index) => (
        <View key={index} style={{ width: 140 }}>
          <Animated.View
            style={{
              width: 140,
              height: 140,
              borderRadius: 8,
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              marginBottom: 8,
              opacity: shimmerOpacity,
            }}
          />
          <Animated.View
            style={{
              height: 14,
              width: 110,
              borderRadius: 3,
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              marginBottom: 4,
              opacity: shimmerOpacity,
            }}
          />
          <Animated.View
            style={{
              height: 11,
              width: 80,
              borderRadius: 3,
              backgroundColor: dark ? '#252525' : '#d0d0d0',
              opacity: shimmerOpacity,
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
};

/**
 * Inline skeleton for artist rows - circular images
 */
export const ArtistRowSkeleton = ({ count = 4 }) => {
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

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={{
        paddingVertical: 8,
        gap: 12,
        flexDirection: 'row',
      }}
    >
      {[...Array(count)].map((_, index) => (
        <View key={index} style={{ width: 140, alignItems: 'center' }}>
          <Animated.View
            style={{
              width: 120,
              height: 120,
              borderRadius: 60,
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              marginBottom: 8,
              opacity: shimmerOpacity,
            }}
          />
          <Animated.View
            style={{
              height: 14,
              width: 80,
              borderRadius: 3,
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              opacity: shimmerOpacity,
            }}
          />
        </View>
      ))}
    </ScrollView>
  );
};

const getStyles = (dark) =>
  StyleSheet.create({
    container: {
      flex: 1,
    },
    contentContainer: {
      paddingBottom: 100,
    },

    // Route Heading
    routeHeading: {
      paddingHorizontal: 16,
      paddingTop: 16,
      paddingBottom: 16,
    },
    routeHeadingText: {
      height: 28,
      width: 120,
      borderRadius: 6,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 8,
    },
    routeHeadingSubtext: {
      height: 16,
      width: 100,
      borderRadius: 4,
      backgroundColor: dark ? '#252525' : '#d0d0d0',
    },

    // Discover Cards Grid
    discoverGrid: {
      paddingHorizontal: 12,
      gap: 12,
    },
    discoverRow: {
      flexDirection: 'row',
      gap: 12,
      marginBottom: 12,
    },
    discoverCard: {
      height: 100,
      borderRadius: 12,
      backgroundColor: dark ? '#1F1F1F' : '#E5E5E5',
      padding: 16,
      justifyContent: 'space-between',
    },
    iconCircle: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
    },
    cardTextSkeleton: {
      height: 18,
      width: '70%',
      borderRadius: 4,
      backgroundColor: dark ? '#333333' : '#c0c0c0',
    },

    // Section
    section: {
      marginTop: 20,
      paddingHorizontal: 13,
    },
    headingSkeleton: {
      height: 22,
      width: 160,
      borderRadius: 4,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 12,
    },

    // Horizontal scroll
    horizontalScroll: {
      marginLeft: -5,
    },
    horizontalContent: {
      paddingVertical: 8,
      paddingLeft: 5,
      gap: 12,
      flexDirection: 'row',
    },

    // Album cards
    albumCard: {
      width: 140,
    },
    albumImage: {
      width: 140,
      height: 140,
      borderRadius: 8,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 8,
    },
    albumTitle: {
      height: 14,
      width: 110,
      borderRadius: 3,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 4,
    },
    albumSubtitle: {
      height: 11,
      width: 80,
      borderRadius: 3,
      backgroundColor: dark ? '#252525' : '#d0d0d0',
    },

    // Artist cards (circular)
    artistCard: {
      width: 140,
      alignItems: 'center',
    },
    artistImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
      marginBottom: 8,
    },
    artistName: {
      height: 14,
      width: 80,
      borderRadius: 3,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Language bundles
    languageBundle: {
      flexDirection: 'column',
      gap: 8,
    },
    languageItem: {
      width: 120,
      height: 50,
      borderRadius: 8,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },

    // Moment/Genre bundles
    momentBundle: {
      flexDirection: 'column',
      gap: 8,
    },
    momentItem: {
      width: 130,
      height: 55,
      borderRadius: 10,
      backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
  });

export default DiscoverSkeletonLoader;
