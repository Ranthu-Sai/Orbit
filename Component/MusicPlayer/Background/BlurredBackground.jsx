import React, { memo, useEffect, useRef } from 'react';
import { Image, View, StyleSheet } from 'react-native';
import LinearGradient from 'react-native-linear-gradient';

/**
 * Performance-optimized blurred background component.
 * 
 * Key optimizations:
 * 1. Memoized with custom comparison - only re-renders when artwork changes
 * 2. Blur applied immediately - no delay or fade effect
 * 3. Isolated from parent state changes - progress bar, controls don't trigger re-render
 * 
 * @param {object} source - Image source (uri object or require())
 * @param {number} blurRadius - Blur intensity (default: 18)
 * @param {array} overlayGradient - Gradient colors for overlay
 * @param {function} onReady - Callback when component is ready
 */
const BlurredBackground = memo(({
  source,
  blurRadius = 18,
  overlayGradient,
  onReady,
}) => {
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    if (onReady) onReady();

    return () => {
      isMounted.current = false;
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
    ? [0, 0.25, 0.5, 0.7, 0.85, 1]  // Light: dark starts at 50% (bottom 50%)
    : [0, 0.33, 0.66, 1];            // Dark: even distribution

  return (
    <View style={styles.container} pointerEvents="none">
      {/* Blurred image - shows immediately */}
      <Image
        source={source}
        style={styles.image}
        resizeMode="cover"
        blurRadius={blurRadius}
      />

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
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
});

export default BlurredBackground;
