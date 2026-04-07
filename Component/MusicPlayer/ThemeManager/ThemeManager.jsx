import React, { createContext, useContext } from 'react';
import { useThemeContext } from '../../../Context/ThemeContext';

/**
 * ThemeManager - Manages theme-related functionality for music player components
 *
 * This component provides theme management capabilities including:
 * - Theme mode detection (light/dark)
 * - Dynamic styling based on theme
 * - Theme-aware color management
 * - Gradient and overlay calculations
 */

const ThemeManagerContext = createContext();

export const ThemeManager = ({ children }) => {
  const { theme, themeMode } = useThemeContext();

  // Theme-aware styling functions
  const getBackgroundOverlay = () => {
    return themeMode === 'light' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.44)';
  };

  const getGradientColors = () => {
    return themeMode === 'light'
      ? [
          'rgba(255,255,255,0.80)',
          'rgba(255,255,255,0.9)',
          'rgba(255,255,255,1)',
        ]
      : [
          'rgba(4,4,4,0.23)',
          'rgba(9,9,9,0.47)',
          'rgba(0,0,0,0.65)',
          'rgba(0,0,0,0.89)',
          'rgba(0,0,0,0.9)',
          'rgba(0,0,0,1)',
        ];
  };

  const getTextColor = (type = 'primary') => {
    switch (type) {
      case 'primary':
        return themeMode === 'light' ? theme.colors.text : 'white';
      case 'secondary':
        return themeMode === 'light' ? '#555555' : '#FFFFFF';
      case 'icon':
        return themeMode === 'light' ? theme.colors.text : theme.colors.icon;
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

  // Dynamic theme styles
  const getThemeStyles = () => ({
    backgroundOverlay: getBackgroundOverlay(),
    gradientColors: getGradientColors(),
    textColors: {
      primary: getTextColor('primary'),
      secondary: getTextColor('secondary'),
      icon: getTextColor('icon'),
    },
    buttonColors: {
      pressed: getPressedBackgroundColor(),
      background: getButtonBackgroundColor(),
      border: getBorderColor(),
    },
    isLight: themeMode === 'light',
    isDark: themeMode === 'dark',
  });

  const contextValue = {
    theme,
    themeMode,
    getBackgroundOverlay,
    getGradientColors,
    getTextColor,
    getPressedBackgroundColor,
    getButtonBackgroundColor,
    getBorderColor,
    getThemeStyles,
  };

  return (
    <ThemeManagerContext.Provider value={contextValue}>
      {children}
    </ThemeManagerContext.Provider>
  );
};

// Hook to use theme manager
export const useThemeManager = () => {
  const context = useContext(ThemeManagerContext);
  if (!context) {
    throw new Error('useThemeManager must be used within a ThemeManager');
  }
  return context;
};
