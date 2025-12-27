import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PodcastDetailSkeleton - Skeleton loader for the Podcast Detail screen
 */
export const PodcastDetailSkeleton = () => {
    const { dark } = useTheme();
    const insets = useSafeAreaInsets();
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

    const styles = useMemo(() => getStyles(dark, insets), [dark, insets]);

    // Episode Row Skeleton
    const EpisodeRowSkeleton = () => (
        <View style={styles.episodeRow}>
            <Animated.View style={[styles.episodeImage, { opacity: shimmerOpacity }]} />
            <View style={styles.episodeInfo}>
                <Animated.View style={[styles.textLine, { width: '80%', height: 16, marginBottom: 8, opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.textLine, { width: '50%', height: 12, opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.textLine, { width: '30%', height: 12, marginTop: 4, opacity: shimmerOpacity }]} />
            </View>
            <View style={{ justifyContent: 'center' }}>
                <Animated.View style={[styles.playIcon, { opacity: shimmerOpacity }]} />
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Header Section */}
            <View style={styles.header}>
                <Animated.View style={[styles.artwork, { opacity: shimmerOpacity }]} />

                <View style={styles.headerTextContainer}>
                    <Animated.View style={[styles.title, { opacity: shimmerOpacity }]} />
                    <Animated.View style={[styles.author, { opacity: shimmerOpacity }]} />

                    <View style={{ alignItems: 'center', marginVertical: 12, width: '100%' }}>
                        <Animated.View style={[styles.textLine, { width: '90%', height: 12, marginBottom: 4, opacity: shimmerOpacity }]} />
                        <Animated.View style={[styles.textLine, { width: '80%', height: 12, marginBottom: 4, opacity: shimmerOpacity }]} />
                        <Animated.View style={[styles.textLine, { width: '50%', height: 12, opacity: shimmerOpacity }]} />
                    </View>
                </View>

                {/* Buttons */}
                <View style={styles.buttonContainer}>
                    <Animated.View style={[styles.playButton, { opacity: shimmerOpacity }]} />
                    <Animated.View style={[styles.shuffleButton, { opacity: shimmerOpacity }]} />
                </View>

                {/* Episodes Count */}
                <Animated.View style={[styles.episodeCount, { opacity: shimmerOpacity }]} />
            </View>

            {/* Episodes List */}
            <View style={styles.episodesList}>
                {[1, 2, 3, 4, 5, 6].map((key) => (
                    <EpisodeRowSkeleton key={key} />
                ))}
            </View>
        </ScrollView>
    );
};

/**
 * EpisodeListSkeleton - Skeleton for just the episodes list
 */
export const EpisodeListSkeleton = () => {
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

    const styles = useMemo(() => getStyles(dark, { top: 0 }), [dark]);

    const EpisodeRowSkeleton = () => (
        <View style={styles.episodeRow}>
            <Animated.View style={[styles.episodeImage, { opacity: shimmerOpacity }]} />
            <View style={styles.episodeInfo}>
                <Animated.View style={[styles.textLine, { width: '80%', height: 16, marginBottom: 8, opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.textLine, { width: '50%', height: 12, opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.textLine, { width: '30%', height: 12, marginTop: 4, opacity: shimmerOpacity }]} />
            </View>
            <View style={{ justifyContent: 'center' }}>
                <Animated.View style={[styles.playIcon, { opacity: shimmerOpacity }]} />
            </View>
        </View>
    );

    return (
        <View style={{ paddingHorizontal: 16 }}>
            {[1, 2, 3, 4, 5, 6].map((key) => (
                <EpisodeRowSkeleton key={key} />
            ))}
        </View>
    );
};

const getStyles = (dark, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: dark ? '#121212' : '#FFFFFF',
    },
    header: {
        alignItems: 'center',
        paddingTop: insets.top + 40,
        paddingHorizontal: 16,
    },
    artwork: {
        width: 180,
        height: 180,
        borderRadius: 16,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        marginBottom: 20,
    },
    headerTextContainer: {
        width: '100%',
        alignItems: 'center',
    },
    title: {
        width: '70%',
        height: 24,
        borderRadius: 4,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        marginBottom: 10,
    },
    author: {
        width: '40%',
        height: 14,
        borderRadius: 4,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        marginBottom: 16,
    },
    textLine: {
        borderRadius: 4,
        backgroundColor: dark ? '#252525' : '#d0d0d0',
    },
    buttonContainer: {
        flexDirection: 'row',
        marginTop: 20,
        gap: 12,
        width: '100%',
        justifyContent: 'center',
    },
    playButton: {
        width: 120,
        height: 44,
        borderRadius: 24,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
    shuffleButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
    episodeCount: {
        width: 100,
        height: 20,
        borderRadius: 4,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        alignSelf: 'flex-start',
        marginTop: 24,
        marginBottom: 10,
    },
    episodesList: {
        paddingHorizontal: 16,
    },
    episodeRow: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    },
    episodeImage: {
        width: 50,
        height: 50,
        borderRadius: 6,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
    episodeInfo: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    playIcon: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    }
});
