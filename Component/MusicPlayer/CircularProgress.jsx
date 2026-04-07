import React from 'react';
import { View, Text } from 'react-native';

// Custom Circular Progress Component
const CircularProgress = ({
  progress,
  size = 24,
  thickness = 2,
  color = '#1DB954',
}) => {
  // Calculate how much of the circle to fill based on progress (0-100)
  const rotation = progress * 3.6; // 360 degrees / 100 = 3.6
  const rotateValue = `${rotation}deg`;

  return (
    <View
      style={{
        width: size,
        height: size,
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      {/* Background Circle */}
      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: thickness,
          borderColor: 'rgba(255,255,255,0.2)',
          position: 'absolute',
        }}
      />

      <View
        style={{
          width: size,
          height: size,
          borderRadius: size / 2,
          position: 'absolute',
          borderWidth: thickness,
          borderTopColor: progress > 12.5 ? color : 'transparent',
          borderRightColor: progress > 37.5 ? color : 'transparent',
          borderBottomColor: progress > 62.5 ? color : 'transparent',
          borderLeftColor: progress > 87.5 ? color : 'transparent',
          transform: [{ rotate: rotateValue }],
        }}
      />

      <Text
        style={{
          color: 'white',
          fontSize: size / 3,
          fontWeight: 'bold',
        }}
      >
        {Math.round(progress)}%
      </Text>
    </View>
  );
};

export default CircularProgress;
