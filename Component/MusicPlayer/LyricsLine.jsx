import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    Easing,
} from 'react-native-reanimated';

/**
 * LyricsLine - ArchiveTune-style lyrics line with:
 * - Distance-based opacity (active=1, fading out with distance)
 * - Distance-based scale (active=1, smaller with distance)
 * - Smooth spring animations for all transitions
 */
const LyricsLine = ({
    text,
    isActive,
    isPast,
    distance = 0, // Distance from active line index
    onPress,
    animationStyle = 'Smooth',
    activeColor,
    inactiveColor,
    isDarkMode = true // Default to dark mode for backward compatibility
}) => {


    // Calculate target opacity based on distance (like ArchiveTune)
    const targetOpacity = useMemo(() => {
        if (isActive) return 1;
        switch (distance) {
            case 1: return 0.65;
            case 2: return 0.40;
            case 3: return 0.25;
            default: return 0.15;
        }
    }, [isActive, distance]);

    // Calculate target scale based on distance
    const targetScale = useMemo(() => {
        if (isActive) return 1.0;
        switch (distance) {
            case 1: return 0.97;
            case 2: return 0.94;
            default: return 0.92;
        }
    }, [isActive, distance]);

    // Animated styles with spring physics
    const animatedContainerStyle = useAnimatedStyle(() => {
        const springConfig = {
            damping: 20,
            stiffness: 150,
            mass: 0.8,
        };

        const opacity = withSpring(targetOpacity, springConfig);
        const scale = withSpring(targetScale, springConfig);

        return {
            opacity,
            transform: [{ scale }],
        };
    }, [targetOpacity, targetScale]);

    // Text style with color transition
    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            color: withTiming(isActive ? (activeColor || '#FFFFFF') : (inactiveColor || '#6E6E6E'), {
                duration: 300,
                easing: Easing.out(Easing.cubic),
            }),
        };
    }, [isActive, activeColor, inactiveColor]);

    // Dynamic text shadow color based on theme
    const textShadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Animated.View style={[styles.lineWrapper, animatedContainerStyle]}>
                <Animated.Text
                    style={[
                        styles.text,
                        animatedTextStyle,
                        isActive && {
                            fontSize: 28,
                            fontWeight: '700',
                            textShadowColor: textShadowColor,
                            textShadowOffset: { width: 0, height: 0 },
                            textShadowRadius: 10,
                        },
                    ]}
                >
                    {text}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 14,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lineWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 26,
        textAlign: 'center',
        lineHeight: 38,
        fontWeight: '500',
    },
});

export default React.memo(LyricsLine);

