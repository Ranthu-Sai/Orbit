import React from 'react';
import { View, Text } from 'react-native';

/**
 * QualityIndicator - Displays song quality indicator for online playback
 * Shows quality format (e.g., "148 kbps", "FLAC") with transparent background
 */
const QualityIndicator = ({
  style,
  position = 'absolute',
  top = 20,
  left = 60,
  right = 60,
  textColor = 'white',
  fontSize = 13,
  height = 28,
  borderRadius = 14,
  quality = '',
  zIndex = 10,
}) => {
  // Don't render if no quality info
  if (!quality) {
    return null;
  }
  // Rendering quality indicator

  // Format quality text (just the quality, no prefix)
  const formatQuality = (qual) => {
    if (!qual) {
      return '';
    }

    // Handle FLAC formats - keep as is
    if (qual.includes('FLAC')) {
      return qual;
    }

    // Extract just the numeric bitrate (remove codec prefix like 'Opus ', 'AAC ')
    // Match patterns like "Opus 148kbps", "AAC 256kbps", "148kbps", "~148kbps"
    const bitrateMatch = qual.match(/~?(\d+)\s*kbps/i);
    if (bitrateMatch) {
      return `${bitrateMatch[1]} kbps`;
    }

    // Fallback: just remove 'kbps' and other text
    const numericQuality = qual.replace(/[^\d]/g, '');
    if (numericQuality) {
      return `${numericQuality} kbps`;
    }

    return qual;
  };

  const qualityStyle = {
    padding: 6,
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
    backgroundColor: 'transparent', // Transparent background
    ...style,
  };

  const textStyle = {
    color: textColor,
    fontWeight: '600',
    fontSize,
    letterSpacing: 0.3,
    // Strong text shadow for visibility on any background
    textShadowColor: 'rgba(0, 0, 0, 0.95)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 4,
  };

  return (
    <View style={qualityStyle} pointerEvents="none">
      <Text style={textStyle}>{formatQuality(quality)}</Text>
    </View>
  );
};

export default QualityIndicator;
