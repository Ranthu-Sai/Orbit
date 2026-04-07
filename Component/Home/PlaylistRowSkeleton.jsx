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
 * PlaylistRowSkeleton - Skeleton for playlist/album card horizontal rows
 * Used for Home page and YTMusic sections
 */
export const PlaylistRowSkeleton = ({ count = 4, showHeading = false }) => {
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

  const cardWidth = Math.max(180, SCREEN_WIDTH * 0.42);
  const cardHeight = cardWidth * 1.2;
  const imageHeight = cardWidth * 0.9;

  return (
    <View style={styles.container}>
      {/* Heading skeleton */}
      {showHeading && (
        <Animated.View
          style={[
            styles.headingSkeleton,
            {
              backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
              opacity: shimmerOpacity,
            },
          ]}
        />
      )}

      {/* Horizontal scroll of playlist cards */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContent}
      >
        {[...Array(count)].map((_, index) => (
          <View
            key={index}
            style={[
              styles.cardContainer,
              { width: cardWidth, height: cardHeight },
            ]}
          >
            {/* Card image */}
            <Animated.View
              style={[
                styles.cardImage,
                {
                  height: imageHeight,
                  backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                  opacity: shimmerOpacity,
                },
              ]}
            />
            {/* Card text */}
            <View style={styles.cardTextContainer}>
              <Animated.View
                style={[
                  styles.cardTitle,
                  {
                    backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                    opacity: shimmerOpacity,
                  },
                ]}
              />
              <Animated.View
                style={[
                  styles.cardSubtitle,
                  {
                    backgroundColor: dark ? '#252525' : '#d0d0d0',
                    opacity: shimmerOpacity,
                  },
                ]}
              />
            </View>
          </View>
        ))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 8,
  },
  headingSkeleton: {
    height: 22,
    width: 180,
    borderRadius: 4,
    marginBottom: 12,
    marginHorizontal: 13,
  },
  scrollContent: {
    paddingLeft: 10,
    paddingRight: 5,
    gap: 8,
    flexDirection: 'row',
  },
  cardContainer: {
    marginRight: 4,
  },
  cardImage: {
    width: '100%',
    borderRadius: 8,
  },
  cardTextContainer: {
    marginTop: 8,
    paddingHorizontal: 4,
  },
  cardTitle: {
    height: 14,
    width: '85%',
    borderRadius: 3,
    marginBottom: 4,
  },
  cardSubtitle: {
    height: 11,
    width: '60%',
    borderRadius: 3,
  },
});

export default PlaylistRowSkeleton;
