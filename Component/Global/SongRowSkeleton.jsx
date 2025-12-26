import React, { useEffect, useRef } from 'react';
import { View, Animated, StyleSheet } from 'react-native';
import { useTheme } from '@react-navigation/native';

export const SongRowSkeleton = () => {
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

    return (
        <View style={styles.songRow}>
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
        </View>
    );
};

const styles = StyleSheet.create({
    songRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 10,
        paddingHorizontal: 16,
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
});

export default SongRowSkeleton;
