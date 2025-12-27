import React, { useEffect, useRef, useMemo } from 'react';
import { View, StyleSheet, Animated, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * PodcastSkeleton - Skeleton loader for the main Podcast screen
 * Matches the structure of PodcastScreen.jsx pixel-perfectly.
 */
export const PodcastSkeleton = () => {
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

    // Dimensions
    const episodeCardWidth = 280;
    const podcastCardWidth = 140;
    const gridCardWidth = (SCREEN_WIDTH - 48) / 2;

    // Search Bar Skeleton
    const SearchBarSkeleton = () => (
        <View style={styles.searchContainer}>
            <Animated.View style={[styles.searchBar, { opacity: shimmerOpacity }]} />
        </View>
    );

    // Section Heading Skeleton - Matches Heading in PaddingConatiner (padding 13) or Slider (padding 12)
    // PodcastScreen uses slider title (pad 12) for New/Trending, PaddingConatiner (pad 13) for Categories/All
    const HeadingSkeleton = ({ padding = 12 }) => (
        <View style={[styles.headingContainer, { paddingHorizontal: padding }]}>
            <Animated.View style={[styles.heading, { opacity: shimmerOpacity }]} />
        </View>
    );

    // Episode Card Skeleton (New Episodes) - Matches EpisodeCardHorizontal
    // Horizontal layout: Image 60x60 left, Text right
    const EpisodeCardSkeleton = () => (
        <View style={[styles.episodeCard, { width: episodeCardWidth }]}>
            <Animated.View style={[styles.episodeImage, { opacity: shimmerOpacity }]} />
            <View style={styles.episodeTextContainer}>
                <Animated.View style={[styles.textLine, { width: '90%', height: 14, marginBottom: 6, opacity: shimmerOpacity }]} />
                <Animated.View style={[styles.textLine, { width: '60%', height: 12, opacity: shimmerOpacity }]} />
            </View>
        </View>
    );

    // Category Chip Skeleton
    const CategorySkeleton = ({ width }) => (
        <Animated.View style={[styles.categoryChip, { width, opacity: shimmerOpacity }]} />
    );

    // Podcast Card Skeleton (Trending)
    const PodcastCardSkeleton = ({ width = 140, noMargin = false }) => (
        <View style={[styles.podcastCard, { width, marginRight: noMargin ? 0 : 12 }]}>
            <Animated.View style={[styles.podcastImage, { width, height: width, opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.textLine, { width: '80%', height: 14, marginTop: 8, opacity: shimmerOpacity }]} />
            <Animated.View style={[styles.textLine, { width: '50%', height: 12, marginTop: 2, opacity: shimmerOpacity }]} />
        </View>
    );

    return (
        <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
            {/* Top Header Placeholder - Matches ListHeader top view padding */}
            <View style={styles.topHeader}>
                {/* Back Button Placeholder */}
                <Animated.View style={[styles.backButton, { opacity: shimmerOpacity }]} />
                {/* Title Placeholder */}
                <Animated.View style={[styles.title, { opacity: shimmerOpacity }]} />
            </View>

            <SearchBarSkeleton />

            {/* New Episodes Section - PodcastHorizontalSlider */}
            <View style={styles.section}>
                <HeadingSkeleton padding={12} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    <EpisodeCardSkeleton />
                    <EpisodeCardSkeleton />
                    <EpisodeCardSkeleton />
                </ScrollView>
            </View>

            {/* Categories Section - PaddingConatiner */}
            <View style={styles.section}>
                <HeadingSkeleton padding={13} />
                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.categoryContent}
                >
                    <CategorySkeleton width={80} />
                    <CategorySkeleton width={60} />
                    <CategorySkeleton width={90} />
                    <CategorySkeleton width={70} />
                    <CategorySkeleton width={85} />
                </ScrollView>
            </View>

            {/* Trending Podcasts Section - PodcastHorizontalSlider */}
            <View style={styles.section}>
                <HeadingSkeleton padding={12} />
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScroll}>
                    <PodcastCardSkeleton width={140} />
                    <PodcastCardSkeleton width={140} />
                    <PodcastCardSkeleton width={140} />
                </ScrollView>
            </View>

            {/* All Podcasts Section (Grid) - PaddingConatiner */}
            <View style={styles.section}>
                <HeadingSkeleton padding={13} />
                <View style={styles.gridContainer}>
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                    <PodcastCardSkeleton width={gridCardWidth} noMargin={true} />
                </View>
            </View>
        </ScrollView>
    );
};

const getStyles = (dark, insets) => StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: dark ? '#000000' : '#FFFFFF',
    },
    // Top Header
    topHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingTop: 16,
        paddingBottom: 8,
    },
    backButton: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
    },
    title: {
        width: 120,
        height: 24,
        borderRadius: 4,
        marginLeft: 12,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
    },
    // Search
    searchContainer: {
        paddingHorizontal: 12,
        paddingVertical: 12,
    },
    searchBar: {
        height: 48, // TextInput default height often ~40-50, wrapper in screen has paddings
        // In PodcastScreen: View with paddingHorizontal 14, paddingVertical 12 inside TextInput
        // Actually the wrapper helps shape it.
        // Screen code: flexDirection row, paddingHorizontal 14...
        borderRadius: 12,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
        width: '100%',
    },
    section: {
        marginBottom: 20, // Match marginBottom in renderRow/container logic roughly
    },
    headingContainer: {
        marginBottom: 12,
        marginTop: 8, // Matching Heading spacing often found
    },
    heading: {
        width: 150,
        height: 24,
        borderRadius: 4,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
    },
    horizontalScroll: {
        paddingLeft: 12,
    },
    // Episode Card
    episodeCard: {
        marginRight: 12,
        marginBottom: 8,
        borderRadius: 10,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
        padding: 10,
        flexDirection: 'row',
        alignItems: 'center',
    },
    episodeImage: {
        width: 60,
        height: 60,
        backgroundColor: dark ? '#2A2A2A' : '#E0E0E0',
        borderRadius: 6,
    },
    episodeTextContainer: {
        flex: 1,
        marginLeft: 10,
        justifyContent: 'center',
    },
    // Common Text
    textLine: {
        borderRadius: 4,
        backgroundColor: dark ? '#2A2A2A' : '#E0E0E0',
    },
    // Category
    categoryContent: {
        paddingHorizontal: 12,
        paddingVertical: 8,
    },
    categoryChip: {
        height: 32,
        borderRadius: 20,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
        marginRight: 8,
    },
    // Podcast Card
    podcastCard: {
        marginBottom: 12,
    },
    podcastImage: {
        borderRadius: 12,
        backgroundColor: dark ? '#1F1F1F' : '#F0F0F0',
        elevation: 3,
    },
    // Grid
    gridContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        paddingHorizontal: 12,
        gap: 12,
    },
});
