import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Svg, { Defs, LinearGradient, Stop, Rect } from 'react-native-svg';
import { useTheme } from 'react-native-paper';

export const GlassBox = ({ id, children, style, gradientConfig, rectInset = 1, borderOutside = false }) => {
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
  const inset2 = rectInset * 2;

  const handleLayout = (e) => {
    const { width, height } = e.nativeEvent.layout;
    setDims({ width, height });
  };

  // Default SVG border (for buttons — fits exactly within viewport)
  const svgBorderDefault = dims.width > 0 && dims.height > 0 && (
    <Svg width={dims.width} height={dims.height} style={StyleSheet.absoluteFill}>
      <Defs>
        <LinearGradient id={`${id}-grad`} x1={config.x1} y1={config.y1} x2={config.x2} y2={config.y2}>
          {config.stops.map((stop, i) => (
            <Stop key={i} offset={stop.offset} stopColor={stop.color || stopColor} stopOpacity={stop.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect
        x={rectInset} y={rectInset}
        width={dims.width > inset2 ? dims.width - inset2 : 0} 
        height={dims.height > inset2 ? dims.height - inset2 : 0}
        rx={dims.height > inset2 ? (dims.height - inset2) / 2 : 0} 
        ry={dims.height > inset2 ? (dims.height - inset2) / 2 : 0}
        stroke={`url(#${id}-grad)`}
        strokeWidth={1}
        fill="transparent"
      />
    </Svg>
  );

  // Expanded SVG border (for borderOutside — 2px larger canvas so stroke isn't viewport-clipped)
  const pad = 1; // 1px padding on each side of SVG canvas
  const svgBorderExpanded = dims.width > 0 && dims.height > 0 && (
    <Svg
      width={dims.width + pad * 2}
      height={dims.height + pad * 2}
      style={{ position: 'absolute', top: -pad, left: -pad }}
    >
      <Defs>
        <LinearGradient id={`${id}-grad`} x1={config.x1} y1={config.y1} x2={config.x2} y2={config.y2}>
          {config.stops.map((stop, i) => (
            <Stop key={i} offset={stop.offset} stopColor={stop.color || stopColor} stopOpacity={stop.opacity} />
          ))}
        </LinearGradient>
      </Defs>
      <Rect
        x={rectInset + pad} y={rectInset + pad}
        width={dims.width > inset2 ? dims.width - inset2 : 0} 
        height={dims.height > inset2 ? dims.height - inset2 : 0}
        rx={dims.height > inset2 ? (dims.height - inset2) / 2 : 0} 
        ry={dims.height > inset2 ? (dims.height - inset2) / 2 : 0}
        stroke={`url(#${id}-grad)`}
        strokeWidth={1}
        fill="transparent"
      />
    </Svg>
  );

  // borderOutside mode: SVG rendered in a wrapper with NO borderRadius
  if (borderOutside) {
    const flattenedStyle = StyleSheet.flatten(style) || {};
    const extractedBg = flattenedStyle.backgroundColor;
    const extractedRadius = flattenedStyle.borderRadius;
    const effectiveRadius = extractedRadius || (dims.height ? dims.height / 2 : 26);

    return (
      <View
        onLayout={handleLayout}
        style={[
          { alignItems: 'center', justifyContent: 'center' },
          style,
          { backgroundColor: 'transparent', borderRadius: 0, overflow: 'visible' },
        ]}
      >
        {/* Rounded background layer */}
        <View
          style={[
            StyleSheet.absoluteFill,
            {
              backgroundColor: extractedBg || bgColor,
              borderRadius: effectiveRadius,
              overflow: 'hidden',
            },
          ]}
        />
        {/* SVG border — expanded canvas prevents viewport clipping at edges */}
        {svgBorderExpanded}
        {children}
      </View>
    );
  }

  // Default: SVG inside the borderRadius View (works perfectly for buttons)
  return (
    <View
      onLayout={handleLayout}
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
      {svgBorderDefault}
      {children}
    </View>
  );
};
