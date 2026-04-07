import React from 'react';
import { ThemeManager } from './ThemeManager';

/**
 * ThemeProvider - Wrapper component that provides theme management to music player components
 *
 * This component wraps child components with theme management capabilities.
 * It's a convenience wrapper around ThemeManager for easier integration.
 */

export const ThemeProvider = ({ children }) => {
  return <ThemeManager>{children}</ThemeManager>;
};
