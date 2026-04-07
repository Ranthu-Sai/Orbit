import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useOffline from '../../hooks/useOffline';

/**
 * OfflineIndicator - Flexible offline mode indicator component
 * Can be used in various parts of the app to show offline status
 */
const OfflineIndicator = ({
  variant = 'banner', // 'banner', 'badge', 'icon', 'text'
  size = 'medium', // 'small', 'medium', 'large'
  color = '#ff5252',
  textColor = 'white',
  showIcon = true,
  showText = true,
  text = 'Offline',
  iconName = 'cloud-offline-outline',
  style,
  onPress,
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) {
    return null;
  }

  const getSizeConfig = () => {
    switch (size) {
      case 'small':
        return {
          iconSize: 12,
          fontSize: 10,
          padding: 4,
          borderRadius: 6,
          height: 20,
        };
      case 'large':
        return {
          iconSize: 20,
          fontSize: 16,
          padding: 12,
          borderRadius: 16,
          height: 40,
        };
      default: // medium
        return {
          iconSize: 16,
          fontSize: 12,
          padding: 8,
          borderRadius: 12,
          height: 28,
        };
    }
  };

  const sizeConfig = getSizeConfig();

  const getVariantStyle = () => {
    const baseStyle = {
      backgroundColor: color,
      alignItems: 'center',
      justifyContent: 'center',
      ...sizeConfig,
    };

    switch (variant) {
      case 'badge':
        return {
          ...baseStyle,
          borderRadius: sizeConfig.height / 2,
          minWidth: sizeConfig.height,
          paddingHorizontal: sizeConfig.padding,
        };
      case 'icon':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          padding: 0,
          height: 'auto',
        };
      case 'text':
        return {
          ...baseStyle,
          backgroundColor: 'transparent',
          padding: 0,
          height: 'auto',
        };
      default: // banner
        return {
          ...baseStyle,
          flexDirection: 'row',
          paddingHorizontal: sizeConfig.padding * 2,
        };
    }
  };

  const renderContent = () => {
    const iconElement = showIcon && (
      <Ionicons
        name={iconName}
        size={sizeConfig.iconSize}
        color={variant === 'icon' ? color : textColor}
      />
    );

    const textElement = showText && (
      <Text
        style={{
          color: variant === 'text' ? color : textColor,
          fontSize: sizeConfig.fontSize,
          fontWeight: 'bold',
          marginLeft: showIcon && variant === 'banner' ? 4 : 0,
        }}
      >
        {text}
      </Text>
    );

    if (variant === 'icon') {
      return iconElement;
    }

    if (variant === 'text') {
      return textElement;
    }

    return (
      <>
        {iconElement}
        {textElement}
      </>
    );
  };

  const containerStyle = {
    ...getVariantStyle(),
    ...style,
  };

  if (onPress) {
    return (
      <TouchableOpacity style={containerStyle} onPress={onPress}>
        {renderContent()}
      </TouchableOpacity>
    );
  }

  return <View style={containerStyle}>{renderContent()}</View>;
};

export default OfflineIndicator;
