import { useContext } from 'react';
import { useThemeContext } from '../../../Context/ThemeContext';

/**
 * useThemeManager - Custom hook for theme management in music player components
 * 
 * This hook provides easy access to theme-related functionality including:
 * - Current theme and theme mode
 * - Theme-aware styling functions
 * - Dynamic color calculations
 * - Responsive theme utilities
 */

export const useThemeManager = () => {
  const { theme, themeMode } = useThemeContext();

  // Theme-aware styling functions
  const getBackgroundOverlay = () => {
    return themeMode === 'light'
      ? 'rgba(255,255,255,0.1)'
      : 'rgba(0,0,0,0.45)';
  };

  const getGradientColors = () => {
    return themeMode === 'light'
      ? [
        'rgba(255,255,255,0.08)',
        'rgba(255,255,255,0.16)',
        'rgba(255,255,255,0.26)',
        'rgba(255,255,255,0.4)',
      ]
      : [
        'rgba(0,0,0,0.15)',
        'rgba(0,0,0,0.32)',
        'rgba(0,0,0,0.55)',
        'rgba(0,0,0,0.78)',
      ];
  };

  const getBottomGradientColors = () => {
    return themeMode === 'light'
      ? [
        'rgba(0,0,0,0)',
        'rgba(0,0,0,0.5)',
        'rgba(0,0,0,0.85)',
        'rgba(0,0,0,1)',
      ]
      : [
        'rgba(0,0,0,0)',
        'rgba(0,0,0,0.48)',
        'rgba(0,0,0,0.7)',
        'rgba(0,0,0,0.9)',
      ];
  };

  const getTextColor = (type = 'primary') => {
    switch (type) {
      case 'primary':
        return themeMode === 'light' ? '#FFFFFF' : 'white';
      case 'secondary':
        return themeMode === 'light' ? 'rgba(255,255,255,0.78)' : '#FFFFFF';
      case 'icon':
        return themeMode === 'light' ? '#FFFFFF' : theme.colors.icon;
      default:
        return theme.colors.text;
    }
  };

  const getPressedBackgroundColor = () => {
    return themeMode === 'light'
      ? 'rgba(0, 0, 0, 0.1)'
      : 'rgba(255, 255, 255, 0.1)';
  };

  const getButtonBackgroundColor = (opacity = 0.1) => {
    return `rgba(255,255,255,${opacity})`;
  };

  const getBorderColor = (opacity = 0.2) => {
    return `rgba(255,255,255,${opacity})`;
  };

  const getBlurOverlayGradient = () => {
    return themeMode === 'light'
      ? [
        'rgba(255,255,255,0.05)',  // 0% - Top: minimal white
        'rgba(255,255,255,0.02)',  // 25% - Upper area: almost clear
        'rgba(0,0,0,0.0)',         // 50% - Start of bottom 50%: transparent
        'rgba(0,0,0,0.50)',        // 70% - Mid-bottom: darker start
        'rgba(0,0,0,0.80)',        // 85% - Lower: rich dark blend
        'rgba(0,0,0,0.98)',        // 100% - Bottom: deep black finish
      ]
      : [
        'rgba(255,255,255,0.08)',  // Top: white tint for visibility
        'rgba(255,255,255,0.03)',  // Upper-mid: subtle white fade
        'rgba(0,0,0,0.15)',        // Lower-mid: light darkness
        'rgba(0,0,0,0.38)',        // Bottom: dark feel
      ];
  };

  // Dynamic theme styles object
  const getThemeStyles = () => ({
    backgroundOverlay: getBackgroundOverlay(),
    gradientColors: getGradientColors(),
    bottomGradientColors: getBottomGradientColors(),
    textColors: {
      primary: getTextColor('primary'),
      secondary: getTextColor('secondary'),
      icon: getTextColor('icon')
    },
    buttonColors: {
      pressed: getPressedBackgroundColor(),
      background: getButtonBackgroundColor(),
      border: getBorderColor()
    },
    isLight: themeMode === 'light',
    isDark: themeMode === 'dark'
  });

  // Utility functions for common theme operations
  const getConditionalStyle = (lightStyle, darkStyle) => {
    return themeMode === 'light' ? lightStyle : darkStyle;
  };

  const getOpacityColor = (baseColor, opacity) => {
    // Helper to add opacity to any color
    if (baseColor.startsWith('#')) {
      // Convert hex to rgba
      const hex = baseColor.replace('#', '');
      const r = parseInt(hex.substr(0, 2), 16);
      const g = parseInt(hex.substr(2, 2), 16);
      const b = parseInt(hex.substr(4, 2), 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return baseColor; // Return as-is if not hex
  };

  return {
    theme,
    themeMode,
    getBackgroundOverlay,
    getGradientColors,
    getBottomGradientColors,
    getTextColor,
    getPressedBackgroundColor,
    getButtonBackgroundColor,
    getBorderColor,
    getBlurOverlayGradient,
    getThemeStyles,
    getConditionalStyle,
    getOpacityColor,
    isLight: themeMode === 'light',
    isDark: themeMode === 'dark'
  };
};
