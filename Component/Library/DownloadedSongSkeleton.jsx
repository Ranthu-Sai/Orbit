import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

/**
 * Skeleton loading component for Downloaded Song Cards
 * Shows animated shimmer effect while songs are loading
 */
export const DownloadedSongSkeleton = ({ count = 8 }) => {
    const { colors, dark } = useTheme();
    const shimmerAnim = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        // Create looping shimmer animation
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
    }, []);

    const shimmerOpacity = shimmerAnim.interpolate({
        inputRange: [0, 1],
        outputRange: [0.3, 0.7],
    });

    const styles = getStyles(colors, dark);

    const renderSkeletonItem = (index) => (
        <View key={index} style={styles.container}>
            <View style={styles.contentRow}>
                {/* Artwork skeleton */}
                <Animated.View
                    style={[
                        styles.artwork,
                        { opacity: shimmerOpacity }
                    ]}
                />

                {/* Text skeleton */}
                <View style={styles.textContainer}>
                    {/* Title skeleton */}
                    <Animated.View
                        style={[
                            styles.titleSkeleton,
                            { opacity: shimmerOpacity }
                        ]}
                    />
                    {/* Artist skeleton */}
                    <Animated.View
                        style={[
                            styles.artistSkeleton,
                            { opacity: shimmerOpacity }
                        ]}
                    />
                </View>

                {/* Menu button skeleton */}
                <Animated.View
                    style={[
                        styles.menuButton,
                        { opacity: shimmerOpacity }
                    ]}
                />
            </View>
        </View>
    );

    return (
        <View style={styles.wrapper}>
            {Array.from({ length: count }, (_, index) => renderSkeletonItem(index))}
        </View>
    );
};

const getStyles = (colors, dark) => StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingHorizontal: 10,
        marginHorizontal: 10,
        marginVertical: 2,
        borderRadius: 8,
    },
    contentRow: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 6,
        paddingLeft: 4,
    },
    artwork: {
        width: 50,
        height: 50,
        borderRadius: 8,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
    textContainer: {
        flex: 1,
        marginLeft: 12,
        justifyContent: 'center',
    },
    titleSkeleton: {
        width: '70%',
        height: 16,
        borderRadius: 4,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        marginBottom: 6,
    },
    artistSkeleton: {
        width: '50%',
        height: 12,
        borderRadius: 4,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
    },
    menuButton: {
        width: 24,
        height: 24,
        borderRadius: 12,
        backgroundColor: dark ? '#2a2a2a' : '#e0e0e0',
        marginLeft: 8,
    },
});

export default DownloadedSongSkeleton;
