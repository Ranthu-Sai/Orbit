import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

export const GlassBox = ({ id, children, style, gradientConfig }) => {
  const [dims, setDims] = useState({ width: 0, height: 0 });
  const theme = useTheme();

  const defaultConfig = {
    x1: '0%', y1: '0%', x2: '100%', y2: '100%',
    stops: [
      { offset: '0%', opacity: 0.5 },
      { offset: '100%', opacity: 0.1 },
    ],
  };

  const config = gradientConfig || defaultConfig;
  const stopColor = theme.dark ? '#FFFFFF' : '#000000';
  const bgColor = theme.dark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  return (
    <View
      onLayout={(e) => {
        const { width, height } = e.nativeEvent.layout;
        setDims({ width, height });
      }}
      style={[
        {
          backgroundColor: bgColor,
          borderRadius: dims.height ? dims.height / 2 : 26,
          overflow: 'hidden',
          alignItems: 'center',
          justifyContent: 'center',
        },
        style,
      ]}
    >
      {dims.width > 0 && dims.height > 0 && (
        <Svg width={dims.width} height={dims.height} style={StyleSheet.absoluteFill}>
          <Defs>
            <LinearGradient id={`${id}-grad`} x1={config.x1} y1={config.y1} x2={config.x2} y2={config.y2}>
              {config.stops.map((stop, i) => (
                <Stop key={i} offset={stop.offset} stopColor={stop.color || stopColor} stopOpacity={stop.opacity} />
              ))}
            </LinearGradient>
          </Defs>
          <Rect
            x={1} y={1}
            width={dims.width > 2 ? dims.width - 2 : 0} 
            height={dims.height > 2 ? dims.height - 2 : 0}
            rx={dims.height > 2 ? (dims.height - 2) / 2 : 0} 
            ry={dims.height > 2 ? (dims.height - 2) / 2 : 0}
            stroke={`url(#${id}-grad)`}
            strokeWidth={1}
            fill="transparent"
          />
        </Svg>
      )}
      {children}
    </View>
  );
};
