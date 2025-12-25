import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';

/**
 * SongsListSkeleton - Skeleton UI for song list pages like ArtistSongs
 * Shows a vertical list of song row placeholders
 */
export const SongsListSkeleton = ({ count = 10, showHeader = true }) => {
    const { dark } = useTheme();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        const animation = Animated.loop(
            Animated.sequence([
                Animated.timing(shimmerAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(shimmerAnim, {
                    toValue: 0,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ])
        );
        animation.start();
        return () => animation.stop();
    }, [shimmerAnim]);

    const shimmerOpacity = shimmerAnim.interpolate({
        inputRange: [0, 0.5, 1],
        outputRange: [0.3, 0.6, 0.3],
    });

    // Song row skeleton
    const SongRowSkeleton = ({ index }) => (
        <View style={styles.songRow}>
            {/* Song number */}
            <Animated.View
                style={[
                    styles.songNumber,
                    {
                        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
            {/* Song artwork */}
            <Animated.View
                style={[
                    styles.songArtwork,
                    {
                        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
            {/* Song text */}
            <View style={styles.songTextContainer}>
                <Animated.View
                    style={[
                        styles.songTitle,
                        {
                            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                            opacity: shimmerOpacity,
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.songArtist,
                        {
                            backgroundColor: dark ? '#252525' : '#d0d0d0',
                            opacity: shimmerOpacity,
                        }
                    ]}
                />
            </View>
            {/* Menu icon */}
            <Animated.View
                style={[
                    styles.menuIcon,
                    {
                        backgroundColor: dark ? '#252525' : '#d8d8d8',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
        </View>
    );

    return (
        <ScrollView
            style={styles.container}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {/* Song count header */}
            {showHeader && (
                <View style={styles.headerInfo}>
                    <Animated.View
                        style={[
                            styles.songCountSkeleton,
                            {
                                backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                                opacity: shimmerOpacity,
                            }
                        ]}
                    />
                </View>
            )}

            {/* Songs list */}
            {[...Array(count)].map((_, index) => (
                <SongRowSkeleton key={index} index={index} />
            ))}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingHorizontal: 10,
        paddingBottom: 120,
    },

    // Header
    headerInfo: {
        paddingHorizontal: 6,
        paddingVertical: 12,
    },
    songCountSkeleton: {
        height: 14,
        width: 80,
        borderRadius: 4,
    },

    // Song row
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 8,
    },
    songNumber: {
        width: 24,
        height: 16,
        borderRadius: 4,
        marginRight: 12,
    },
    songArtwork: {
        width: 50,
        height: 50,
        borderRadius: 6,
        marginRight: 12,
    },
    songTextContainer: {
        flex: 1,
    },
    songTitle: {
        height: 16,
        width: '75%',
        borderRadius: 4,
        marginBottom: 6,
    },
    songArtist: {
        height: 12,
        width: '55%',
        borderRadius: 3,
    },
    menuIcon: {
        width: 28,
        height: 28,
        borderRadius: 14,
    },
});

export default SongsListSkeleton;
