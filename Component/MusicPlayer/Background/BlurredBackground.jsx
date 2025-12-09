import React, { memo, useState, useEffect, useRef } from 'react';
import { Image, View, StyleSheet, InteractionManager, Animated } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Performance-optimized blurred background component.
 * 
 * Key optimizations:
 * 1. Memoized with custom comparison - only re-renders when artwork changes
 * 2. Deferred blur application - doesn't block initial render
 * 3. Smooth fade-in transition - hides blur calculation time
 * 4. Isolated from parent state changes - progress bar, controls don't trigger re-render
 * 
 * @param {object} source - Image source (uri object or require())
 * @param {number} blurRadius - Blur intensity (default: 18)
 * @param {array} overlayGradient - Gradient colors for overlay [top, bottom]
 * @param {function} onReady - Callback when blur is applied
 */
const BlurredBackground = memo(({ 
  source, 
  blurRadius = 18,
  overlayGradient,
  onReady,
}) => {
  const [isBlurReady, setIsBlurReady] = useState(false);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    setIsBlurReady(false);
    fadeAnim.setValue(0);

    // Defer blur rendering until after interactions complete
    const task = InteractionManager.runAfterInteractions(() => {
      if (!isMounted.current) return;
      
      // Small delay ensures smooth transition
      const timer = setTimeout(() => {
        if (!isMounted.current) return;
        
        setIsBlurReady(true);
        
        // Fade in the blurred background smoothly
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }).start(() => {
          if (onReady) onReady();
        });
      }, 100);

      return () => clearTimeout(timer);
    });

    return () => {
      isMounted.current = false;
      task.cancel();
    };
  }, [getSourceKey(source)]);

  // No valid source - render nothing
  if (!isValidSource(source)) {
    return null;
  }

  const defaultGradient = [
    'rgba(0,0,0,0.0)',
    'rgba(0,0,0,0.2)',
    'rgba(0,0,0,0.4)',
  ];

  const gradientColors = overlayGradient || defaultGradient;
  
  // Gradient locations - 6 stops for light theme, 4 for dark
  const gradientLocations = gradientColors.length === 6
    ? [0, 0.3, 0.6, 0.75, 0.88, 1]  // Light: dark starts at 60% (bottom 40%)
    : [0, 0.33, 0.66, 1];            // Dark: even distribution

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Base image without blur - shows immediately */}
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
      />
      
      {/* Blurred layer - fades in after ready */}
      <Animated.View style={[styles.blurLayer, { opacity: fadeAnim }]}>
        <Image
          source={source}
          style={styles.image}
          resizeMode="cover"
          blurRadius={isBlurReady ? blurRadius : 0}
        />
      </Animated.View>
      
      {/* Gradient overlay for smooth blend - renders behind content */}
      <LinearGradient
        colors={gradientColors}
        locations={gradientLocations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.overlay}
      />
    </View>
  );
}, arePropsEqual);

/**
 * Custom props comparison for memo optimization.
 * Only re-render if source URI or key props actually change.
 */
function arePropsEqual(prevProps, nextProps) {
  const prevKey = getSourceKey(prevProps.source);
  const nextKey = getSourceKey(nextProps.source);
  
  const prevGradient = prevProps.overlayGradient?.join(',') || '';
  const nextGradient = nextProps.overlayGradient?.join(',') || '';
  
  return (
    prevKey === nextKey &&
    prevProps.blurRadius === nextProps.blurRadius &&
    prevGradient === nextGradient
  );
}

/**
 * Extract a stable key from image source for comparison.
 */
function getSourceKey(source) {
  if (!source) return null;
  if (typeof source === 'number') return source; // require() returns number
  return source.uri || null;
}

/**
 * Validate image source.
 */
function isValidSource(source) {
  if (!source) return false;
  if (typeof source === 'number') return true;
  return Boolean(source.uri);
}

BlurredBackground.displayName = 'BlurredBackground';

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
  },
  image: {
    ...StyleSheet.absoluteFillObject,
    width: '100%',
    height: '100%',
  },
  blurLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default BlurredBackground;
