import React, { useEffect, useRef } from 'react';
import {
  View,
  Animated,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useTheme } from 'react-native-paper';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.7;

export const QuickPicksSkeleton = () => {
  const theme = useTheme();
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

  const skeletonColor = theme.dark ? '#2a2a2a' : '#e0e0e0';

  return (
    <View style={styles.container}>
      {/* Title */}
      <Animated.View
        style={[
          styles.titleSkeleton,
          {
            backgroundColor: skeletonColor,
            opacity: shimmerOpacity,
          },
        ]}
      />

      {/* Carousel Card */}
      <View style={styles.cardContainer}>
        <Animated.View
          style={[
            styles.imageSkeleton,
            {
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>

      {/* Info Container */}
      <View style={styles.infoContainer}>
        <Animated.View
          style={[
            styles.textSkeleton,
            {
              width: '50%',
              height: 18,
              marginBottom: 8,
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.textSkeleton,
            {
              width: '30%',
              height: 14,
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>

      {/* Controls Container */}
      <View style={styles.controlsContainer}>
        <Animated.View
          style={[
            styles.iconButtonSkeleton,
            {
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.playButtonSkeleton,
            {
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
        <Animated.View
          style={[
            styles.iconButtonSkeleton,
            {
              backgroundColor: skeletonColor,
              opacity: shimmerOpacity,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  titleSkeleton: {
    height: 24,
    width: 120,
    borderRadius: 4,
    marginBottom: 16,
    marginHorizontal: 20,
  },
  cardContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  imageSkeleton: {
    width: ITEM_WIDTH,
    aspectRatio: 1,
    borderRadius: 12,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  textSkeleton: {
    borderRadius: 4,
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 24,
  },
  iconButtonSkeleton: {
    width: 52,
    height: 52,
    borderRadius: 26,
  },
  playButtonSkeleton: {
    width: 140,
    height: 52,
    borderRadius: 30,
  },
});

export default QuickPicksSkeleton;
