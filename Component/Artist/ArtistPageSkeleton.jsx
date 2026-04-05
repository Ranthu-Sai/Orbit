import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Dimensions,
  ScrollView,
  StyleSheet,
  StatusBar,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import LinearGradient from 'react-native-linear-gradient';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const CARD_WIDTH = 140;

/**
 * ArtistPageSkeleton - Skeleton UI for ArtistPage.jsx
 * Matches the artist page layout:
 * - Hero section with artist image, name, action buttons
 * - Songs section (vertical list)
 * - Albums section (horizontal scroll)
 * - Bio section
 */
export const ArtistPageSkeleton = () => {
  const { colors, dark } = useTheme();
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

  // Section heading skeleton
  const HeadingSkeleton = () => (
    <Animated.View
      style={[styles.headingSkeleton, { opacity: shimmerOpacity }]}
    />
  );

  // Song row skeleton
  const SongRowSkeleton = ({ index }) => (
    <View style={styles.songRow}>
      {/* Song number */}
      <Animated.View style={[styles.songNumber, { opacity: shimmerOpacity }]} />
      {/* Song artwork */}
      <Animated.View
        style={[styles.songArtwork, { opacity: shimmerOpacity }]}
      />
      {/* Song text */}
      <View style={styles.songTextContainer}>
        <Animated.View
          style={[styles.songTitle, { opacity: shimmerOpacity }]}
        />
        <Animated.View
          style={[styles.songArtist, { opacity: shimmerOpacity }]}
        />
      </View>
      {/* Menu icon */}
      <Animated.View style={[styles.menuIcon, { opacity: shimmerOpacity }]} />
    </View>
  );

  // Album card skeleton
  const AlbumCardSkeleton = () => (
    <View style={styles.albumCard}>
      <Animated.View style={[styles.albumImage, { opacity: shimmerOpacity }]} />
      <Animated.View style={[styles.albumTitle, { opacity: shimmerOpacity }]} />
      <Animated.View
        style={[styles.albumSubtitle, { opacity: shimmerOpacity }]}
      />
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <StatusBar
        translucent
        backgroundColor="transparent"
        barStyle="light-content"
      />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          {/* Background placeholder */}
          <Animated.View
            style={[styles.heroBackground, { opacity: shimmerOpacity }]}
          />
          {/* Gradient overlay */}
          <LinearGradient
            colors={[
              'rgba(0,0,0,0.6)',
              'transparent',
              'rgba(0,0,0,0.2)',
              'rgba(0,0,0,0.6)',
              '#000000',
            ]}
            style={styles.heroGradient}
          />

          {/* Artist Info */}
          <View style={styles.heroContent}>
            {/* Artist name */}
            <Animated.View
              style={[styles.artistNameSkeleton, { opacity: shimmerOpacity }]}
            />

            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Animated.View
                style={[styles.shuffleButton, { opacity: shimmerOpacity }]}
              />
              <Animated.View
                style={[styles.radioButton, { opacity: shimmerOpacity }]}
              />
            </View>
          </View>
        </View>

        {/* Songs Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HeadingSkeleton />
          </View>
          <View style={styles.songsContainer}>
            <SongRowSkeleton index={0} />
            <SongRowSkeleton index={1} />
            <SongRowSkeleton index={2} />
            <SongRowSkeleton index={3} />
            <SongRowSkeleton index={4} />
          </View>
        </View>

        {/* Albums Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HeadingSkeleton />
          </View>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalScroll}
          >
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
            <AlbumCardSkeleton />
          </ScrollView>
        </View>

        {/* Bio Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <HeadingSkeleton />
          </View>
          <View
            style={[
              styles.bioContainer,
              { backgroundColor: dark ? '#1a1a1a' : '#f0f0f0' },
            ]}
          >
            <Animated.View
              style={[
                styles.bioLine,
                { width: '100%', opacity: shimmerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.bioLine,
                { width: '95%', opacity: shimmerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.bioLine,
                { width: '90%', opacity: shimmerOpacity },
              ]}
            />
            <Animated.View
              style={[
                styles.bioLine,
                { width: '85%', opacity: shimmerOpacity },
              ]}
            />
          </View>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },

  // Hero section
  heroContainer: {
    height: 350,
    position: 'relative',
    paddingTop: StatusBar.currentHeight || 0,
  },
  heroBackground: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    backgroundColor: '#2a2a2a',
  },
  heroGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
  },
  heroContent: {
    position: 'absolute',
    bottom: 64,
    left: 24,
    right: 24,
  },
  artistNameSkeleton: {
    height: 36,
    width: '70%',
    borderRadius: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginBottom: 24,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  shuffleButton: {
    flex: 1,
    height: 48,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  radioButton: {
    flex: 1,
    height: 48,
    borderRadius: 32,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },

  // Sections
  section: {
    marginTop: 24,
    paddingHorizontal: 0,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  headingSkeleton: {
    height: 24,
    width: 120,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
  },

  // Songs
  songsContainer: {
    gap: 4,
    paddingHorizontal: 8,
  },
  songRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 8,
  },
  songNumber: {
    width: 24,
    height: 16,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    marginRight: 12,
  },
  songArtwork: {
    width: 48,
    height: 48,
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    marginRight: 12,
  },
  songTextContainer: {
    flex: 1,
  },
  songTitle: {
    height: 16,
    width: '70%',
    borderRadius: 4,
    backgroundColor: '#3a3a3a',
    marginBottom: 6,
  },
  songArtist: {
    height: 12,
    width: '50%',
    borderRadius: 3,
    backgroundColor: '#333333',
  },
  menuIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#333333',
  },

  // Albums horizontal scroll
  horizontalScroll: {
    gap: 16,
    paddingHorizontal: 16,
  },
  albumCard: {
    width: CARD_WIDTH,
  },
  albumImage: {
    width: CARD_WIDTH,
    height: CARD_WIDTH,
    borderRadius: 12,
    backgroundColor: '#3a3a3a',
    marginBottom: 8,
  },
  albumTitle: {
    height: 14,
    width: 110,
    borderRadius: 3,
    backgroundColor: '#3a3a3a',
    marginBottom: 4,
  },
  albumSubtitle: {
    height: 11,
    width: 80,
    borderRadius: 3,
    backgroundColor: '#333333',
  },

  // Bio section
  bioContainer: {
    padding: 16,
    borderRadius: 12,
    marginHorizontal: 16,
  },
  bioLine: {
    height: 14,
    borderRadius: 3,
    backgroundColor: '#3a3a3a',
    marginBottom: 8,
  },
});

export default ArtistPageSkeleton;
