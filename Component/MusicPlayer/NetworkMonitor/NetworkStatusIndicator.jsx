import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNetworkMonitor } from './useNetworkMonitor';
import { useThemeManager } from '../ThemeManager/useThemeManager';
import Ionicons from 'react-native-vector-icons/Ionicons';

/**
 * NetworkStatusIndicator - Visual component showing current network status
 *
 * This component provides visual feedback about network connectivity including:
 * - Connection status icon and text
 * - Connection type display
 * - Interactive refresh capability
 * - Theme-aware styling
 */

export const NetworkStatusIndicator = ({
  style,
  showText = true,
  showIcon = true,
  variant = 'full', // 'full', 'compact', 'icon-only'
  onPress = null,
  size = 'medium', // 'small', 'medium', 'large'
}) => {
  const {
    isConnected,
    isOffline,
    connectionType,
    connectionQuality,
    getConnectionDescription,
    refreshNetworkState,
  } = useNetworkMonitor();

  const { getTextColor, getButtonBackgroundColor } = useThemeManager();

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      refreshNetworkState();
    }
  };

  const getStatusIcon = () => {
    if (isOffline) {
      return 'cloud-offline-outline';
    }
    if (!isConnected) {
      return 'wifi-off';
    }

    switch (connectionType) {
      case 'wifi':
        return 'wifi';
      case 'cellular':
        return 'cellular';
      case 'ethernet':
        return 'globe-outline';
      default:
        return isConnected ? 'checkmark-circle' : 'close-circle';
    }
  };

  const getStatusColor = () => {
    if (isOffline) {
      return '#FF6B6B';
    }
    if (!isConnected) {
      return '#FFA726';
    }

    switch (connectionQuality) {
      case 'high':
        return '#4CAF50';
      case 'medium':
        return '#FF9800';
      case 'low':
        return '#FFC107';
      default:
        return getTextColor('secondary');
    }
  };

  const getIconSize = () => {
    switch (size) {
      case 'small':
        return 16;
      case 'large':
        return 28;
      default:
        return 20;
    }
  };

  const getTextSize = () => {
    switch (size) {
      case 'small':
        return 12;
      case 'large':
        return 16;
      default:
        return 14;
    }
  };

  if (variant === 'icon-only') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.iconOnlyContainer, style]}
        activeOpacity={0.7}
      >
        <Ionicons
          name={getStatusIcon()}
          size={getIconSize()}
          color={getStatusColor()}
        />
      </TouchableOpacity>
    );
  }

  if (variant === 'compact') {
    return (
      <TouchableOpacity
        onPress={handlePress}
        style={[styles.compactContainer, style]}
        activeOpacity={0.8}
      >
        {showIcon && (
          <Ionicons
            name={getStatusIcon()}
            size={getIconSize()}
            color={getStatusColor()}
          />
        )}
        {showText && (
          <Text
            style={[
              styles.compactText,
              {
                color: getStatusColor(),
                fontSize: getTextSize(),
              },
            ]}
          >
            {getConnectionDescription()}
          </Text>
        )}
      </TouchableOpacity>
    );
  }

  // Full variant
  return (
    <TouchableOpacity
      onPress={handlePress}
      style={[
        styles.fullContainer,
        { backgroundColor: getButtonBackgroundColor(0.1) },
        style,
      ]}
      activeOpacity={0.8}
    >
      {showIcon && (
        <Ionicons
          name={getStatusIcon()}
          size={getIconSize()}
          color={getStatusColor()}
        />
      )}
      {showText && (
        <View style={styles.textContainer}>
          <Text
            style={[
              styles.statusText,
              {
                color: getTextColor('primary'),
                fontSize: getTextSize(),
              },
            ]}
          >
            {getConnectionDescription()}
          </Text>
          {connectionQuality !== 'unknown' && (
            <Text
              style={[
                styles.qualityText,
                {
                  color: getTextColor('secondary'),
                  fontSize: getTextSize() - 2,
                },
              ]}
            >
              {connectionQuality} quality
            </Text>
          )}
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  iconOnlyContainer: {
    padding: 8,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  compactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    gap: 6,
  },
  compactText: {
    fontWeight: '500',
  },
  fullContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 12,
  },
  textContainer: {
    flex: 1,
  },
  statusText: {
    fontWeight: '600',
  },
  qualityText: {
    fontWeight: '400',
    marginTop: 2,
  },
});
