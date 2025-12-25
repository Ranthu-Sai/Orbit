import React, { useEffect, useRef } from 'react';
import { View, Animated, Dimensions, ScrollView, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * SearchPageSkeleton - Skeleton UI for SearchPage.jsx
 * Shows placeholders for search results based on active tab:
 * - Songs tab: List of song rows
 * - Playlists tab: Grid of playlist cards
 * - Albums tab: Grid of album cards
 * - Artists tab: Grid of artist cards (circular)
 */
export const SearchPageSkeleton = ({ activeTab = 0 }) => {
    const { colors, dark } = useTheme();
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

    const cardWidth = (SCREEN_WIDTH - 60) / 2;

    // Song row skeleton (for Songs tab)
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

    // Grid card skeleton (for Playlists/Albums tabs)
    const GridCardSkeleton = () => (
        <View style={[styles.gridCard, { width: cardWidth }]}>
            <Animated.View
                style={[
                    styles.gridCardImage,
                    {
                        width: cardWidth - 16,
                        height: cardWidth - 16,
                        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
            <View style={styles.gridCardTextContainer}>
                <Animated.View
                    style={[
                        styles.gridCardTitle,
                        {
                            backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                            opacity: shimmerOpacity,
                        }
                    ]}
                />
                <Animated.View
                    style={[
                        styles.gridCardSubtitle,
                        {
                            backgroundColor: dark ? '#252525' : '#d0d0d0',
                            opacity: shimmerOpacity,
                        }
                    ]}
                />
            </View>
        </View>
    );

    // Artist card skeleton (circular for Artists tab)
    const ArtistCardSkeleton = () => (
        <View style={[styles.artistCard, { width: cardWidth }]}>
            <Animated.View
                style={[
                    styles.artistImage,
                    {
                        width: cardWidth - 32,
                        height: cardWidth - 32,
                        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
            <Animated.View
                style={[
                    styles.artistName,
                    {
                        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
                        opacity: shimmerOpacity,
                    }
                ]}
            />
        </View>
    );

    // Render based on active tab
    const renderContent = () => {
        if (activeTab === 0) {
            // Songs tab - vertical list
            return (
                <View style={styles.songsContainer}>
                    {[...Array(10)].map((_, index) => (
                        <SongRowSkeleton key={index} index={index} />
                    ))}
                </View>
            );
        } else if (activeTab === 3) {
            // Artists tab - circular grid
            return (
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <ArtistCardSkeleton />
                        <ArtistCardSkeleton />
                    </View>
                    <View style={styles.gridRow}>
                        <ArtistCardSkeleton />
                        <ArtistCardSkeleton />
                    </View>
                    <View style={styles.gridRow}>
                        <ArtistCardSkeleton />
                        <ArtistCardSkeleton />
                    </View>
                </View>
            );
        } else {
            // Playlists or Albums tab - square grid
            return (
                <View style={styles.gridContainer}>
                    <View style={styles.gridRow}>
                        <GridCardSkeleton />
                        <GridCardSkeleton />
                    </View>
                    <View style={styles.gridRow}>
                        <GridCardSkeleton />
                        <GridCardSkeleton />
                    </View>
                    <View style={styles.gridRow}>
                        <GridCardSkeleton />
                        <GridCardSkeleton />
                    </View>
                </View>
            );
        }
    };

    return (
        <ScrollView
            style={[styles.container, { backgroundColor: colors.background }]}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.contentContainer}
        >
            {renderContent()}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 140,
        paddingHorizontal: 10,
    },

    // Songs list
    songsContainer: {
        paddingTop: 8,
    },
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

    // Grid layout
    gridContainer: {
        paddingTop: 8,
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16,
    },
    gridCard: {
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 8,
    },
    gridCardImage: {
        borderRadius: 8,
        marginBottom: 8,
    },
    gridCardTextContainer: {
        width: '100%',
        paddingHorizontal: 4,
    },
    gridCardTitle: {
        height: 14,
        width: '85%',
        borderRadius: 3,
        marginBottom: 6,
    },
    gridCardSubtitle: {
        height: 11,
        width: '60%',
        borderRadius: 3,
    },

    // Artist cards (circular)
    artistCard: {
        alignItems: 'center',
        paddingVertical: 8,
    },
    artistImage: {
        borderRadius: 999,
        marginBottom: 10,
    },
    artistName: {
        height: 14,
        width: 80,
        borderRadius: 3,
    },
});

export default SearchPageSkeleton;
