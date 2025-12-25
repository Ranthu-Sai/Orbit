import React, { useEffect, useMemo } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
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
// Word component with ArchiveTune-style progressive fill and smooth transitions
const Word = ({ text, isActive, isPast, activeColor, inactiveColor, fontSize, progress = 0 }) => {
    // Calculate opacity based on state - past words stay highlighted like ArchiveTune
    const targetOpacity = isPast ? 1 : (isActive ? (0.5 + 0.5 * progress) : 0.35);
    const targetScale = isActive ? 1.02 : 1;
    const targetColor = (isActive || isPast) ? (activeColor || '#FFFFFF') : (inactiveColor || '#6E6E6E');

    const animatedStyle = useAnimatedStyle(() => {
        return {
            color: withTiming(targetColor, { duration: 80, easing: Easing.out(Easing.cubic) }),
            transform: [{ scale: withTiming(targetScale, { duration: 80, easing: Easing.out(Easing.cubic) }) }],
            opacity: withTiming(targetOpacity, { duration: 80, easing: Easing.out(Easing.cubic) })
        };
    }, [targetOpacity, targetScale, targetColor]);

    return (
        <Animated.Text style={[styles.word, animatedStyle, {
            fontSize,
            fontWeight: isActive ? '800' : (isPast ? '700' : '500')
        }]}>
            {text}{' '}
        </Animated.Text>
    );
};

const LyricsLine = ({
    text,
    isActive,
    isPast,
    distance = 0,
    onPress,
    animationStyle = 'Smooth',
    activeColor,
    inactiveColor,
    isDarkMode = true,
    fontSize = 26,
    words = null,
    currentTime = 0,
}) => {
    // ... existing logic for targetOpacity and targetScale
    const targetOpacity = useMemo(() => {
        if (isActive) return 1;
        switch (distance) {
            case 1: return 0.65;
            case 2: return 0.20;
            case 3: return 0.10;
            default: return 0.02;
        }
    }, [isActive, distance]);

    const targetScale = useMemo(() => {
        if (isActive) return 1.0;
        switch (distance) {
            case 1: return 0.97;
            case 2: return 0.94;
            default: return 0.92;
        }
    }, [isActive, distance]);

    const animatedContainerStyle = useAnimatedStyle(() => {
        const springConfig = { damping: 20, stiffness: 150, mass: 0.8 };
        const timingConfig = { duration: 100, easing: Easing.out(Easing.cubic) };

        switch (animationStyle) {
            case 'Fade':
                return { opacity: withTiming(targetOpacity, timingConfig), transform: [{ scale: 1 }] };
            case 'Scale':
                const enhancedScale = isActive ? 1.05 : 0.88;
                return { opacity: withTiming(isActive ? 1 : 0.3, timingConfig), transform: [{ scale: withSpring(enhancedScale, springConfig) }] };
            case 'Slide':
                const translateX = isActive ? 0 : (isPast ? -10 : 10);
                return { opacity: withTiming(targetOpacity, timingConfig), transform: [{ translateX: withSpring(translateX, springConfig) }, { scale: 1 }] };
            case 'Smooth':
            default:
                return { opacity: withSpring(targetOpacity, springConfig), transform: [{ scale: withSpring(targetScale, springConfig) }] };
        }
    }, [targetOpacity, targetScale, animationStyle, isActive, isPast]);

    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            color: withTiming(isActive ? (activeColor || '#FFFFFF') : (inactiveColor || '#6E6E6E'), {
                duration: 100,
                easing: Easing.out(Easing.cubic),
            }),
        };
    }, [isActive, activeColor, inactiveColor]);

    const textShadowColor = isDarkMode ? 'rgba(255, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)';

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Animated.View style={[styles.lineWrapper, animatedContainerStyle]}>
                {isActive && words && words.length > 0 ? (
                    <View style={styles.wordsRow}>
                        {words.map((word, idx) => {
                            const wordStartTime = word.startTime;
                            const wordEndTime = word.endTime;
                            const wordDuration = wordEndTime - wordStartTime;
                            const isWordActive = currentTime >= wordStartTime && currentTime <= wordEndTime;
                            const hasWordPassed = currentTime > wordEndTime;

                            // Calculate smooth progress within the word duration
                            let wordProgress = 0;
                            if (isWordActive && wordDuration > 0) {
                                const elapsed = currentTime - wordStartTime;
                                const linear = Math.min(1, Math.max(0, elapsed / wordDuration));
                                // Smooth easing function (smoothstep)
                                wordProgress = linear * linear * (3 - 2 * linear);
                            } else if (hasWordPassed) {
                                wordProgress = 1;
                            }

                            return (
                                <Word
                                    key={idx}
                                    text={word.text}
                                    isActive={isWordActive}
                                    isPast={hasWordPassed}
                                    progress={wordProgress}
                                    activeColor={activeColor}
                                    inactiveColor={inactiveColor}
                                    fontSize={fontSize + 2}
                                />
                            );
                        })}
                    </View>
                ) : (
                    <Animated.Text
                        style={[
                            styles.text,
                            animatedTextStyle,
                            { fontSize: fontSize },
                            isActive && {
                                fontSize: fontSize + 2,
                                fontWeight: '700',
                                textShadowColor: textShadowColor,
                                textShadowOffset: { width: 0, height: 0 },
                                textShadowRadius: 10,
                            },
                        ]}
                    >
                        {text}
                    </Animated.Text>
                )}
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
        textAlign: 'center',
        lineHeight: 38,
        fontWeight: '500',
    },
    wordsRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        alignItems: 'center',
    },
    word: {
        lineHeight: 38,
        fontWeight: '700',
    },
});

export default React.memo(LyricsLine);

