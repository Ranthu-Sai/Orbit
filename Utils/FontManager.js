/**
 * Font Manager for React Native
 * Optimizes font usage and provides consistent typography
 */

import { Platform } from 'react-native';

/**
 * Optimized font families for different platforms
 * Using system fonts for better performance and smaller bundle size
 */
export const FONT_FAMILIES = {
  // Primary font family (system default)
  PRIMARY: Platform.select({
    ios: 'System',
    android: 'Roboto',
    default: 'System',
  }),

  // Secondary font family for special cases
  SECONDARY: Platform.select({
    ios: 'San Francisco',
    android: 'Roboto',
    default: 'System',
  }),

  // Monospace font for code/numbers
  MONOSPACE: Platform.select({
    ios: 'Menlo',
    android: 'monospace',
    default: 'monospace',
  }),
};

/**
 * Font weights that work across platforms
 */
export const FONT_WEIGHTS = {
  LIGHT: '300',
  NORMAL: '400',
  MEDIUM: '500',
  SEMIBOLD: '600',
  BOLD: '700',
  HEAVY: '800',
  BLACK: '900',
};

/**
 * Standardized font sizes based on screen dimensions
 */
export const getFontSizes = (screenWidth) => ({
  TINY: screenWidth * 0.025, // ~10px on 400px screen
  SMALL: screenWidth * 0.03, // ~12px on 400px screen
  BODY: screenWidth * 0.035, // ~14px on 400px screen
  MEDIUM: screenWidth * 0.04, // ~16px on 400px screen
  LARGE: screenWidth * 0.045, // ~18px on 400px screen
  HEADING: screenWidth * 0.055, // ~22px on 400px screen
  TITLE: screenWidth * 0.065, // ~26px on 400px screen
  DISPLAY: screenWidth * 0.085, // ~34px on 400px screen
});

/**
 * Get optimized font style for different text types
 */
export const getOptimizedFontStyle = (type, screenWidth, customSize = null) => {
  const fontSizes = getFontSizes(screenWidth);

  const baseStyle = {
    fontFamily: FONT_FAMILIES.PRIMARY,
    includeFontPadding: false, // Android optimization
    textAlignVertical: 'center', // Android optimization
  };

  switch (type) {
    case 'heading':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.HEADING,
        fontWeight: FONT_WEIGHTS.BOLD,
        lineHeight: (customSize || fontSizes.HEADING) * 1.2,
      };

    case 'title':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.TITLE,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        lineHeight: (customSize || fontSizes.TITLE) * 1.3,
      };

    case 'body':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.BODY,
        fontWeight: FONT_WEIGHTS.NORMAL,
        lineHeight: (customSize || fontSizes.BODY) * 1.4,
      };

    case 'small':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.SMALL,
        fontWeight: FONT_WEIGHTS.NORMAL,
        lineHeight: (customSize || fontSizes.SMALL) * 1.3,
      };

    case 'song-title':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.MEDIUM,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        lineHeight: (customSize || fontSizes.MEDIUM) * 1.2,
        letterSpacing: 0.3,
      };

    case 'artist-name':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.SMALL,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        lineHeight: (customSize || fontSizes.SMALL) * 1.2,
      };

    case 'lyrics':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.LARGE,
        fontWeight: FONT_WEIGHTS.MEDIUM,
        lineHeight: (customSize || fontSizes.LARGE) * 1.5,
        textAlign: 'center',
      };

    case 'button':
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.MEDIUM,
        fontWeight: FONT_WEIGHTS.SEMIBOLD,
        textAlign: 'center',
      };

    default:
      return {
        ...baseStyle,
        fontSize: customSize || fontSizes.BODY,
        fontWeight: FONT_WEIGHTS.NORMAL,
      };
  }
};

/**
 * Font size preferences mapping
 */
export const FONT_SIZE_PREFERENCES = {
  Small: 0.9, // 90% of base size
  Medium: 1.0, // 100% of base size (default)
  Large: 1.1, // 110% of base size
};

/**
 * Get font size multiplier based on user preference
 */
export const getFontSizeMultiplier = (preference = 'Medium') => {
  return FONT_SIZE_PREFERENCES[preference] || 1.0;
};

/**
 * Apply font size preference to a font style
 */
export const applyFontSizePreference = (fontStyle, preference = 'Medium') => {
  const multiplier = getFontSizeMultiplier(preference);

  return {
    ...fontStyle,
    fontSize: fontStyle.fontSize * multiplier,
    lineHeight: fontStyle.lineHeight
      ? fontStyle.lineHeight * multiplier
      : undefined,
  };
};

/**
 * Performance optimizations for text rendering
 */
export const TEXT_PERFORMANCE_PROPS = {
  // Disable font scaling for consistent UI
  allowFontScaling: false,

  // Optimize text rendering on Android
  ...(Platform.OS === 'android' && {
    includeFontPadding: false,
    textAlignVertical: 'center',
  }),

  // Optimize text selection
  selectable: false,

  // Optimize text updates
  maxFontSizeMultiplier: 1.2,
};

/**
 * Get optimized text props for performance
 */
export const getOptimizedTextProps = (customProps = {}) => {
  return {
    ...TEXT_PERFORMANCE_PROPS,
    ...customProps,
  };
};

export default {
  FONT_FAMILIES,
  FONT_WEIGHTS,
  getFontSizes,
  getOptimizedFontStyle,
  FONT_SIZE_PREFERENCES,
  getFontSizeMultiplier,
  applyFontSizePreference,
  TEXT_PERFORMANCE_PROPS,
  getOptimizedTextProps,
};
