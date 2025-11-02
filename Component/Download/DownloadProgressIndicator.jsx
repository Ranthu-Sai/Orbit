import React from 'react';
import { View, Text } from 'react-native';
import { useThemeContext } from '../../Context/ThemeContext';

/**
 * DownloadProgressIndicator - A reusable circular progress indicator for downloads
 * Supports different sizes and themes, with customizable progress display
 */
export const DownloadProgressIndicator = ({ 
  progress = 0, 
  size = 32, 
  thickness = 3, 
  showPercentage = true,
  color = null 
}) => {
  const { theme, themeMode } = useThemeContext();
  
  // Default color based on theme if not provided
  const progressColor = color || (themeMode === 'light' ? theme.colors.primary : '#4169E1');
  const backgroundColor = themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  const textColor = themeMode === 'light' ? theme.colors.text : '#ffffff';
  
  // Calculate the stroke dash array for the progress circle
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (progress / 100) * circumference;
  
  return (
    <View style={{ 
      width: size + (thickness * 2), 
      height: size + (thickness * 2), 
      justifyContent: 'center', 
      alignItems: 'center',
      position: 'relative',
      overflow: 'hidden',
      borderRadius: (size + (thickness * 2)) / 2
    }}>
      {/* Background Circle */}
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: backgroundColor,
        position: 'absolute',
        top: thickness,
        left: thickness,
        right: thickness,
        bottom: thickness
      }} />
      
      {/* Progress Circle using border trick for better performance */}
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        position: 'absolute',
        top: thickness,
        left: thickness,
        right: thickness,
        bottom: thickness,
        borderWidth: thickness,
        borderTopColor: progress > 12.5 ? progressColor : 'transparent',
        borderRightColor: progress > 37.5 ? progressColor : 'transparent',
        borderBottomColor: progress > 62.5 ? progressColor : 'transparent',
        borderLeftColor: progress > 87.5 ? progressColor : 'transparent',
        transform: [{ rotate: `${(progress * 3.6) - 90}deg` }] // Start from top
      }} />
      
      {/* Center Text - Show percentage if enabled and there's enough space */}
      {showPercentage && size >= 24 && (
        <Text style={{
          color: textColor,
          fontSize: Math.max(8, size / 4),
          fontWeight: 'bold',
          textAlign: 'center'
        }}>
          {Math.round(progress)}%
        </Text>
      )}
    </View>
  );
};

/**
 * SimpleProgressBar - A linear progress bar alternative for smaller spaces
 */
export const SimpleProgressBar = ({ 
  progress = 0, 
  width = 100, 
  height = 4, 
  color = null 
}) => {
  const { theme, themeMode } = useThemeContext();
  
  const progressColor = color || (themeMode === 'light' ? theme.colors.primary : '#4169E1');
  const backgroundColor = themeMode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)';
  
  return (
    <View style={{
      width: width,
      height: height,
      backgroundColor: backgroundColor,
      borderRadius: height / 2,
      overflow: 'hidden'
    }}>
      <View style={{
        width: `${progress}%`,
        height: '100%',
        backgroundColor: progressColor,
        borderRadius: height / 2
      }} />
    </View>
  );
};

/**
 * DownloadProgressWithText - Progress indicator with text label
 */
export const DownloadProgressWithText = ({ 
  progress = 0, 
  text = "Downloading...", 
  size = 32 
}) => {
  const { theme, themeMode } = useThemeContext();
  
  return (
    <View style={{ 
      alignItems: 'center', 
      justifyContent: 'center',
      padding: 8
    }}>
      <DownloadProgressIndicator progress={progress} size={size} />
      <Text style={{
        color: themeMode === 'light' ? theme.colors.text : '#ffffff',
        fontSize: 12,
        marginTop: 4,
        textAlign: 'center'
      }}>
        {text}
      </Text>
    </View>
  );
};
