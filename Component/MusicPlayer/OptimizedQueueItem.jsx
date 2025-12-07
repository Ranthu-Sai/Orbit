/**
 * OptimizedQueueItem.jsx
 * 
 * Ultra-lightweight queue item component.
 * - NO TrackPlayer hooks inside (passed as props from parent)
 * - NO animations that leak callbacks
 * - Minimal re-renders through aggressive memoization
 */

import React, { memo, useCallback, useMemo } from 'react';
import { View, Dimensions, ToastAndroid, Pressable, StyleSheet } from 'react-native';
import FastImage from 'react-native-fast-image';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { useThemeContext } from '../../Context/ThemeContext';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MAX_TEXT_WIDTH = SCREEN_WIDTH - 120;

// Default placeholder images - cached at module level
const MUSIC_PLACEHOLDER = require('../../Images/Music.jpeg');
const PLAYING_GIF = require('../../Images/playing.gif');
const PAUSED_GIF = require('../../Images/songPaused.gif');

// Memoized queue item - only re-renders when its specific props change
const OptimizedQueueItem = memo(function OptimizedQueueItem({
    title,
    artist,
    index,
    artwork,
    id,
    isCurrentTrack = false,
    isPlaying = false,
    onPress,
    onLongPress,
    isActive = false,
    reorderMode = false,
}) {
    const { theme, themeMode } = useThemeContext();

    // Memoize image source calculation
    const imageSource = useMemo(() => {
        if (isCurrentTrack) {
            return isPlaying ? PLAYING_GIF : PAUSED_GIF;
        }

        if (!artwork) return MUSIC_PLACEHOLDER;

        if (typeof artwork === 'number') return artwork;
        if (typeof artwork === 'object' && artwork.uri) return artwork;
        if (typeof artwork === 'string') {
            if (artwork.startsWith('file://')) return { uri: artwork };
            if (artwork.startsWith('/')) return { uri: `file://${artwork}` };
            return { uri: artwork };
        }

        return MUSIC_PLACEHOLDER;
    }, [artwork, isCurrentTrack, isPlaying]);

    // Memoize text formatting
    const formattedTitle = useMemo(() => {
        if (!title) return 'Unknown';
        const formatted = title.toString()
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, 'and')
            .replace(/&#039;/g, "'");
        return formatted.length > 25 ? formatted.substring(0, 25) + '...' : formatted;
    }, [title]);

    const formattedArtist = useMemo(() => {
        if (!artist) return 'Unknown Artist';
        const formatted = artist.toString()
            .replace(/&quot;/g, '"')
            .replace(/&amp;/g, 'and')
            .replace(/&#039;/g, "'");
        return formatted.length > 30 ? formatted.substring(0, 30) + '...' : formatted;
    }, [artist]);

    // Memoize colors
    const colors = useMemo(() => ({
        ripple: themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.1)',
        background: isCurrentTrack
            ? (themeMode === 'light' ? 'rgba(0,0,0,0.05)' : 'rgba(255,255,255,0.08)')
            : 'transparent',
        titleColor: isCurrentTrack
            ? (theme.colors.playingColor || theme.colors.primary)
            : theme.colors.text,
    }), [themeMode, isCurrentTrack, theme.colors]);

    // Stable callbacks
    const handlePress = useCallback(() => {
        onPress?.(index);
    }, [onPress, index]);

    const handleLongPress = useCallback(() => {
        if (reorderMode && onLongPress) {
            onLongPress();
        }
    }, [reorderMode, onLongPress]);

    return (
        <Pressable
            onPress={handlePress}
            onLongPress={handleLongPress}
            delayLongPress={100}
            android_ripple={{ color: colors.ripple }}
            style={[
                styles.container,
                { backgroundColor: isActive ? 'rgba(255,255,255,0.15)' : colors.background },
                isActive && styles.activeContainer,
            ]}
        >
            {/* Album Art */}
            <FastImage
                source={imageSource}
                style={styles.artwork}
                resizeMode={FastImage.resizeMode.cover}
            />

            {/* Song Info */}
            <View style={styles.infoContainer}>
                <PlainText
                    text={formattedTitle}
                    style={[
                        styles.title,
                        {
                            color: colors.titleColor,
                            fontWeight: isCurrentTrack ? '700' : '600',
                        }
                    ]}
                    numberOfLine={1}
                />
                <SmallText
                    text={formattedArtist}
                    style={[styles.artist, { color: theme.colors.text }]}
                    maxLine={1}
                />
            </View>

            {/* Drag Handle (only in reorder mode) */}
            {reorderMode && (
                <View style={styles.dragHandle}>
                    <MaterialCommunityIcons
                        name="drag-vertical"
                        size={18}
                        color={theme.colors.text}
                        style={{ opacity: 0.5 }}
                    />
                </View>
            )}
        </Pressable>
    );
}, (prevProps, nextProps) => {
    // Custom comparison - only re-render if these specific props change
    return (
        prevProps.id === nextProps.id &&
        prevProps.index === nextProps.index &&
        prevProps.isCurrentTrack === nextProps.isCurrentTrack &&
        prevProps.isPlaying === nextProps.isPlaying &&
        prevProps.isActive === nextProps.isActive &&
        prevProps.reorderMode === nextProps.reorderMode &&
        prevProps.artwork === nextProps.artwork
    );
});

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        marginVertical: 1,
        borderRadius: 8,
    },
    activeContainer: {
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.15,
        shadowRadius: 2,
    },
    artwork: {
        width: 48,
        height: 48,
        borderRadius: 6,
        marginRight: 12,
    },
    infoContainer: {
        flex: 1,
        justifyContent: 'center',
        maxWidth: MAX_TEXT_WIDTH,
    },
    title: {
        fontSize: 15,
        lineHeight: 20,
    },
    artist: {
        marginTop: 2,
        opacity: 0.7,
        fontWeight: '500',
    },
    dragHandle: {
        width: 28,
        height: 28,
        alignItems: 'center',
        justifyContent: 'center',
    },
});

export default OptimizedQueueItem;
