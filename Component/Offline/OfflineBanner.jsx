import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import useOffline from '../../hooks/useOffline';

/**
 * OfflineBanner - Displays offline mode indicator
 * Compact banner that shows when the app is in offline mode
 */
const OfflineBanner = ({ 
  style,
  position = 'absolute',
  top = 20,
  left = 100,
  right = 120,
  backgroundColor = 'rgba(255, 82, 82, 0.85)',
  textColor = 'white',
  iconSize = 12,
  fontSize = 10,
  height = 24,
  borderRadius = 12,
  showIcon = true,
  text = 'OFFLINE MODE',
  zIndex = 10
}) => {
  const { isOffline } = useOffline();

  if (!isOffline) {
    return null;
  }

  const bannerStyle = {
    backgroundColor,
    padding: 4,
    position,
    top,
    left,
    right,
    zIndex,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    borderRadius,
    height,
    ...style
  };

  return (
    <View style={bannerStyle} pointerEvents="none">
      {showIcon && (
        <Ionicons 
          name="cloud-offline-outline" 
          size={iconSize} 
          color={textColor} 
        />
      )}
      <Text style={{ 
        color: textColor, 
        marginLeft: showIcon ? 3 : 0, 
        fontWeight: 'bold', 
        fontSize 
      }}>
        {text}
      </Text>
    </View>
  );
};

export default OfflineBanner;
