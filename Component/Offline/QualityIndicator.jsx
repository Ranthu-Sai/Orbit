import React from 'react';
import { View, Text } from 'react-native';

/**
 * QualityIndicator - Displays song quality indicator for online playback
 * Shows "Now Playing - {quality}" format with transparent background
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
    source = 'saavn',
    zIndex = 10
}) => {
    // Don't render if no quality info
    console.log('🎵 QualityIndicator component called:', { quality, source, top });
    if (!quality) {
        console.log('⚠️ QualityIndicator: No quality provided, returning null');
        return null;
    }
    console.log('✅ QualityIndicator: Rendering with quality:', quality);

    // Format quality text with "Now Playing -" prefix
    const formatQuality = (qual) => {
        if (!qual) return '';

        // Handle FLAC formats - keep as is
        if (qual.includes('FLAC')) {
            return `Now Playing - ${qual}`;
        }

        // Handle bitrate formats
        const numericQuality = qual.replace(/kbps/i, '').trim();
        return `Now Playing - ${numericQuality} kbps`;
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
        ...style
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
        <View style={qualityStyle}>
            <Text style={textStyle}>
                {formatQuality(quality)}
            </Text>
        </View>
    );
};

export default QualityIndicator;
