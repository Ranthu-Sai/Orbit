import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  StyleSheet,
  Dimensions,
  ScrollView,
} from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * GridSkeleton - Skeleton UI for grid layouts (Albums, Playlists, etc.)
 * Renders a 2-column grid of square cards
 * @param {number} count - Number of skeleton cards to show
 * @param {boolean} showHeader - Whether to show header skeleton
 * @param {boolean} noScroll - If true, renders without ScrollView wrapper (for use inside other scroll containers)
 */
export const GridSkeleton = ({
  count = 6,
  showHeader = false,
  noScroll = false,
}) => {
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

  const GridCardSkeleton = () => (
    <View style={styles.gridCardContainer}>
      <View style={styles.gridCard}>
        <Animated.View
          style={[
            styles.gridImage,
            {
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>
      <Animated.View
        style={[
          styles.gridTitle,
          {
            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
            opacity: shimmerOpacity,
          },
        ]}
      />
      <Animated.View
        style={[
          styles.gridSubtitle,
          {
            backgroundColor: dark ? '#252525' : '#d0d0d0',
            opacity: shimmerOpacity,
          },
        ]}
      />
    </View>
  );

  const content = (
    <>
      {showHeader && (
        <View style={styles.headerInfo}>
          <Animated.View
            style={[
              styles.countSkeleton,
              {
                backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                opacity: shimmerOpacity,
              },
            ]}
          />
        </View>
      )}
      <View style={styles.gridContainer}>
        {[...Array(count)].map((_, index) => (
          <GridCardSkeleton key={index} />
        ))}
      </View>
    </>
  );

  if (noScroll) {
    return <View style={styles.noScrollContainer}>{content}</View>;
  }

  return (
    <ScrollView
      style={styles.container}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.contentContainer}
    >
      {content}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  noScrollContainer: {
    flex: 1,
    paddingHorizontal: 8,
  },
  contentContainer: {
    paddingBottom: 100,
    paddingHorizontal: 8,
  },
  headerInfo: {
    paddingHorizontal: 6,
    paddingVertical: 12,
  },
  countSkeleton: {
    height: 14,
    width: 100,
    borderRadius: 4,
    marginBottom: 8,
  },
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  gridCardContainer: {
    width: '48%',
    marginBottom: 16,
  },
  gridCard: {
    width: '100%',
    aspectRatio: 1,
    borderRadius: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  gridImage: {
    width: '100%',
    height: '100%',
  },
  gridTitle: {
    height: 14,
    width: '85%',
    borderRadius: 4,
    marginBottom: 6,
  },
  gridSubtitle: {
    height: 12,
    width: '60%',
    borderRadius: 4,
  },
});

export default GridSkeleton;
