import React from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { useThemeContext } from '../../../Context/ThemeContext';
import { useThemeManager } from './useThemeManager';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * ThemeSelector - Component for switching between light and dark themes
 *
 * This component provides a UI element for users to toggle between themes.
 * It can be used in settings screens or as a floating button.
 */

export const ThemeSelector = ({
  style,
  size = 24,
  showLabel = false,
  variant = 'button', // 'button', 'toggle', 'icon'
}) => {
  const { toggleTheme } = useThemeContext();
  const { themeMode, getTextColor, getPressedBackgroundColor } =
    useThemeManager();

  const handleThemeToggle = () => {
    toggleTheme();
  };

  const getThemeIcon = () => {
    return themeMode === 'light' ? 'moon' : 'sunny';
  };

  const getThemeLabel = () => {
    return themeMode === 'light' ? 'Dark Mode' : 'Light Mode';
  };

  if (variant === 'icon') {
    return (
      <TouchableOpacity
        onPress={handleThemeToggle}
        style={[styles.iconButton, style]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getThemeIcon()}
          size={size}
          color={getTextColor('icon')}
        />
      </TouchableOpacity>
    );
  }

  if (variant === 'toggle') {
    return (
      <TouchableOpacity
        onPress={handleThemeToggle}
        style={[styles.toggleButton, style]}
        activeOpacity={0.8}
      >
        <View
          style={[
            styles.toggleContainer,
            { backgroundColor: getPressedBackgroundColor() },
          ]}
        >
          <Ionicons
            name={getThemeIcon()}
            size={size}
            color={getTextColor('icon')}
          />
          {showLabel && (
            <Text
              style={[styles.toggleLabel, { color: getTextColor('primary') }]}
            >
              {getThemeLabel()}
            </Text>
          )}
        </View>
      </TouchableOpacity>
    );
  }

  // Default button variant
  return (
    <TouchableOpacity
      onPress={handleThemeToggle}
      style={[styles.button, style]}
      activeOpacity={0.8}
    >
      <Ionicons
        name={getThemeIcon()}
        size={size}
        color={getTextColor('icon')}
      />
      {showLabel && (
        <Text style={[styles.buttonLabel, { color: getTextColor('primary') }]}>
          {getThemeLabel()}
        </Text>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconButton: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    gap: 8,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '500',
  },
  toggleButton: {
    borderRadius: 25,
    overflow: 'hidden',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  toggleLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
});
