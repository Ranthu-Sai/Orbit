import React, { useEffect } from 'react';
import { Text, Pressable, StyleSheet } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    interpolate,
    useSharedValue,
    withSequence,
    Easing,
    interpolateColor,
} from 'react-native-reanimated';
import { useTheme } from '@react-navigation/native';

const LyricsLine = ({
    text,
    isActive,
    isPast,
    onPress,
    animationStyle = 'Smooth',
    activeColor,
    inactiveColor
}) => {
    const { colors } = useTheme();

    // Animation values
    const activeValue = useSharedValue(isActive ? 1 : 0);

    useEffect(() => {
        // Direct value assignment - animation happens in animatedStyle
        activeValue.value = isActive ? 1 : 0;
    }, [isActive]);

    const animatedStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            activeValue.value,
            [0, 1],
            [0.4, 1]
        );

        const scale = interpolate(
            activeValue.value,
            [0, 1],
            [0.96, 1.08]
        );

        switch (animationStyle) {
            case 'Fade':
                return {
                    opacity: withTiming(opacity, { duration: 300 }),
                    transform: [{ scale: 1 }],
                };
            case 'None':
                return {
                    opacity,
                    transform: [{ scale: 1 }],
                };
            case 'Smooth':
            default:
                return {
                    opacity: withSpring(opacity, { damping: 20, stiffness: 100 }),
                    transform: [{ scale: withSpring(scale, { damping: 20, stiffness: 100 }) }],
                };
        }
    }, [animationStyle]);

    const textStyle = useAnimatedStyle(() => {
        return {
            color: isActive ? (activeColor || '#FFFFFF') : (inactiveColor || '#9E9E9E'),
            fontWeight: isActive ? '700' : '400',
        };
    }, [isActive]);

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Animated.View style={[styles.lineWrapper, animatedStyle]}>
                <Animated.Text style={[styles.text, textStyle]}>
                    {text}
                </Animated.Text>
            </Animated.View>
        </Pressable>
    );
};

const styles = StyleSheet.create({
    container: {
        paddingVertical: 12,
        paddingHorizontal: 24,
        alignItems: 'center',
        justifyContent: 'center',
    },
    lineWrapper: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    text: {
        fontSize: 24,
        textAlign: 'center',
        lineHeight: 36,
    },
});

export default React.memo(LyricsLine);
