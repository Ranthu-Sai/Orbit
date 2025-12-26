import React, { useEffect, useMemo, useCallback } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    withSpring,
    withTiming,
    useSharedValue,
    Easing,
    interpolate,
    withSequence,
    withDelay,
} from 'react-native-reanimated';

/**
 * ArchiveTune-style smooth easing functions
 */
const smoothstep = (x) => {
    'worklet';
    const clamped = Math.min(1, Math.max(0, x));
    return clamped * clamped * (3 - 2 * clamped);
};

// Apple Music-style easing curve
const appleMusicEasing = Easing.bezier(0.25, 0.1, 0.25, 1.0);
const smoothDecelerateEasing = Easing.bezier(0.0, 0.0, 0.2, 1.0);

/**
 * Word component with ArchiveTune-style progressive fill animations
 * Different animation styles produce visibly different word effects
 */
const Word = React.memo(({
    text,
    isActive,
    isPast,
    isLineActive, // New prop
    activeColor,
    inactiveColor,
    fontSize,
    progress = 0,
    animationStyle = 'Apple'
}) => {
    // Apply smoothstep for buttery smooth transitions
    const smoothProgress = smoothstep(progress);

    // Calculate visual properties based on animation style
    const getStyleProperties = () => {
        // Persistent glow: Word is past (sung) AND line is still active
        const keepGlow = isPast && isLineActive;

        switch (animationStyle) {
            case 'Apple':
                // Apple Music style: smooth opacity fade with subtle glow
                return {
                    opacity: isPast ? 1 : (isActive ? (0.45 + 0.55 * smoothProgress) : 0.4),
                    scale: isActive ? (1 + 0.02 * smoothProgress) : 1,
                    glowOpacity: isActive ? (0.2 + 0.4 * smoothProgress) : (keepGlow ? 0.3 : (isPast ? 0.1 : 0)),
                    glowRadius: isActive ? (8 + 12 * smoothProgress) : (keepGlow ? 12 : (isPast ? 5 : 0)),
                    fontWeight: isPast ? '700' : (isActive ? '800' : '600'),
                };
            case 'Karaoke':
                // Karaoke style: very dramatic opacity change, pulsing glow
                const pulseProgress = Math.sin(smoothProgress * Math.PI);
                return {
                    opacity: isPast ? 1 : (isActive ? (0.2 + 0.8 * smoothProgress) : 0.2),
                    scale: isActive ? (1 + 0.1 * pulseProgress) : (keepGlow ? 1.05 : (isPast ? 1.02 : 0.95)),
                    glowOpacity: isActive ? (0.35 + 0.5 * smoothProgress) : (keepGlow ? 0.5 : (isPast ? 0.15 : 0)),
                    // Increased blur radius for softer glow
                    glowRadius: isActive ? (25 + 35 * pulseProgress) : (keepGlow ? 35 : (isPast ? 10 : 0)),
                    fontWeight: isPast ? '800' : (isActive ? '900' : '500'),
                };
            case 'Glow':
                // Glow style: Soft diffused glow like ArchiveTune
                const breathe = Math.sin(smoothProgress * Math.PI * 2) * 0.1;
                return {
                    opacity: isPast ? 1 : (isActive ? (0.5 + 0.5 * smoothProgress) : 0.35),
                    scale: isActive ? (1 + 0.04 * smoothProgress + breathe * 0.02) : (keepGlow ? 1.03 : 1),
                    // MUCH lower glow opacity for soft diffused effect
                    glowOpacity: isActive ? (0.15 + 0.2 * smoothProgress) : (keepGlow ? 0.25 : (isPast ? 0.1 : 0)),
                    // Moderate blur radius (not too wide)
                    glowRadius: isActive ? (20 + 25 * smoothProgress) : (keepGlow ? 30 : (isPast ? 15 : 0)),
                    fontWeight: isPast ? '700' : (isActive ? '800' : '600'),
                };
            case 'Fade':
                // Fade style: pure opacity animation, no glow, no scale
                return {
                    opacity: isPast ? 1 : (isActive ? (0.3 + 0.7 * smoothProgress) : 0.3),
                    scale: 1,
                    glowOpacity: 0,
                    glowRadius: 0,
                    fontWeight: isPast ? '700' : (isActive ? '700' : '500'),
                };
            case 'Smooth':
            default:
                // Smooth style: balanced animation with soft glow
                return {
                    opacity: isPast ? 1 : (isActive ? (0.4 + 0.6 * smoothProgress) : 0.4),
                    scale: isActive ? (1 + 0.03 * smoothProgress) : 1,
                    glowOpacity: isActive ? (0.2 + 0.3 * smoothProgress) : (keepGlow ? 0.25 : (isPast ? 0.08 : 0)),
                    // Increased blur for softer glow
                    glowRadius: isActive ? (18 + 18 * smoothProgress) : (keepGlow ? 22 : (isPast ? 8 : 0)),
                    fontWeight: isPast ? '700' : (isActive ? '800' : '600'),
                };
        }
    };

    const styleProps = getStyleProperties();
    const targetColor = (isActive || isPast) ? (activeColor || '#FFFFFF') : (inactiveColor || 'rgba(255,255,255,0.35)');

    const animatedStyle = useAnimatedStyle(() => {
        // Even softer spring config for smoothness
        const springConfig = {
            damping: 30,
            stiffness: 90,
            mass: 1,
            overshootClamping: false
        };

        return {
            opacity: withTiming(styleProps.opacity, { duration: 180, easing: appleMusicEasing }),
            transform: [{
                scale: withSpring(styleProps.scale, springConfig)
            }],
        };
    }, [styleProps.opacity, styleProps.scale]);

    // Dynamic glow effect
    const glowStyle = useMemo(() => {
        if (styleProps.glowOpacity > 0) {
            const hexOpacity = Math.round(styleProps.glowOpacity * 255).toString(16).padStart(2, '0');
            return {
                textShadowColor: activeColor ? `${activeColor}${hexOpacity}` : `rgba(255,255,255,${styleProps.glowOpacity})`,
                textShadowOffset: { width: 0, height: 0 },
                textShadowRadius: styleProps.glowRadius,
            };
        }
        return {};
    }, [styleProps.glowOpacity, styleProps.glowRadius, activeColor]);

    return (
        <Animated.Text
            style={[
                styles.word,
                animatedStyle,
                glowStyle,
                {
                    fontSize,
                    fontWeight: styleProps.fontWeight,
                    color: targetColor,
                }
            ]}
        >
            {text}{' '}
        </Animated.Text>
    );
});

/**
 * LyricsLine - ArchiveTune-style lyrics line with distinct animation styles
 */
const LyricsLine = ({
    text,
    isActive,
    isPast,
    distance = 0,
    onPress,
    animationStyle = 'Apple',
    activeColor,
    inactiveColor,
    isDarkMode = true,
    fontSize = 26,
    words = null,
    currentTime = 0,
}) => {
    // Distance-based properties for each animation style
    const getDistanceBasedStyle = () => {
        switch (animationStyle) {
            case 'Apple':
                // Apple: Smooth gradient opacity falloff with edge fade
                return {
                    opacity: isActive ? 1 : (distance === 1 ? 0.6 : distance === 2 ? 0.3 : distance === 3 ? 0.12 : distance === 4 ? 0.04 : 0.015),
                    scale: isActive ? 1 : (distance === 1 ? 0.98 : distance === 2 ? 0.95 : 0.92),
                    translateY: 0,
                };
            case 'Karaoke':
                // Karaoke: More dramatic scale differences, slight vertical movement
                return {
                    opacity: isActive ? 1 : (distance === 1 ? 0.45 : distance === 2 ? 0.2 : distance === 3 ? 0.08 : 0.03),
                    scale: isActive ? 1.05 : (distance === 1 ? 0.92 : distance === 2 ? 0.85 : 0.80),
                    translateY: isActive ? -4 : (isPast ? 2 : 0),
                };
            case 'Glow':
                // Glow: Soft glow on active, very smooth edge fade
                return {
                    opacity: isActive ? 1 : (distance === 1 ? 0.5 : distance === 2 ? 0.22 : distance === 3 ? 0.08 : distance === 4 ? 0.025 : 0.01),
                    scale: isActive ? 1.03 : (distance === 1 ? 0.97 : 0.93),
                    translateY: 0,
                };
            case 'Fade':
                // Fade: Pure opacity, no scale, edge fade
                return {
                    opacity: isActive ? 1 : (distance === 1 ? 0.45 : distance === 2 ? 0.22 : distance === 3 ? 0.1 : 0.04),
                    scale: 1,
                    translateY: 0,
                };
            case 'Smooth':
            default:
                // Smooth: Balanced with edge fade
                return {
                    opacity: isActive ? 1 : (distance === 1 ? 0.55 : distance === 2 ? 0.28 : distance === 3 ? 0.1 : distance === 4 ? 0.03 : 0.01),
                    scale: isActive ? 1 : (distance === 1 ? 0.97 : distance === 2 ? 0.94 : 0.90),
                    translateY: 0,
                };
        }
    };

    const distanceStyle = getDistanceBasedStyle();

    // Animated container style
    const animatedContainerStyle = useAnimatedStyle(() => {
        // Refined spring configs for maximum smoothness
        const getAnimConfig = () => {
            switch (animationStyle) {
                case 'Karaoke':
                    return {
                        opacityDuration: 300,
                        spring: { damping: 20, stiffness: 90, mass: 1 },
                    };
                case 'Glow':
                    return {
                        opacityDuration: 500,
                        spring: { damping: 30, stiffness: 60, mass: 1.2 }, // Very soft and flowy
                    };
                case 'Fade':
                    return {
                        opacityDuration: 350,
                        spring: { damping: 30, stiffness: 150, mass: 0.5 },
                    };
                case 'Apple':
                case 'Smooth':
                default:
                    return {
                        opacityDuration: 450,
                        spring: { damping: 30, stiffness: 75, mass: 1 }, // Soft, no bounce
                    };
            }
        };

        const config = getAnimConfig();

        return {
            opacity: withTiming(distanceStyle.opacity, {
                duration: config.opacityDuration,
                easing: smoothDecelerateEasing
            }),
            transform: [
                { scale: withSpring(distanceStyle.scale, config.spring) },
                { translateY: withSpring(distanceStyle.translateY, config.spring) },
            ]
        };
    }, [distanceStyle, animationStyle]);

    // Text color animation
    const animatedTextStyle = useAnimatedStyle(() => {
        return {
            color: withTiming(
                isActive ? (activeColor || '#FFFFFF') : (inactiveColor || 'rgba(255,255,255,0.5)'),
                { duration: 250, easing: smoothDecelerateEasing }
            ),
        };
    }, [isActive, activeColor, inactiveColor]);

    // Line-level glow for active line (soft diffused)
    const lineGlowStyle = useMemo(() => {
        if (!isActive) return {};

        switch (animationStyle) {
            case 'Karaoke':
                return {
                    textShadowColor: activeColor ? `${activeColor}60` : 'rgba(255,255,255,0.38)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 40, // Softer blur
                };
            case 'Glow':
                return {
                    // Soft subtle glow - lower opacity, moderate blur
                    textShadowColor: activeColor ? `${activeColor}35` : 'rgba(255,255,255,0.20)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 35, // Moderate soft blur
                };
            case 'Apple':
                return {
                    textShadowColor: activeColor ? `${activeColor}40` : 'rgba(255,255,255,0.25)',
                    textShadowOffset: { width: 0, height: 0 },
                    textShadowRadius: 28, // Softer
                };
            default:
                return {};
        }
    }, [isActive, activeColor, animationStyle]);

    return (
        <Pressable onPress={onPress} style={styles.container}>
            <Animated.View style={[styles.lineWrapper, animatedContainerStyle]}>
                {/* Word-by-word animation for active line with word timings */}
                {isActive && words && words.length > 0 ? (
                    <View style={styles.wordsRow}>
                        {words.map((word, idx) => {
                            const wordStartTime = word.startTime;
                            const wordEndTime = word.endTime;
                            const wordDuration = wordEndTime - wordStartTime;
                            const isWordActive = currentTime >= wordStartTime && currentTime <= wordEndTime;
                            const hasWordPassed = currentTime > wordEndTime;

                            // Calculate linear progress (smoothstep applied in Word component)
                            let wordProgress = 0;
                            if (isWordActive && wordDuration > 0) {
                                const elapsed = currentTime - wordStartTime;
                                wordProgress = Math.min(1, Math.max(0, elapsed / wordDuration));
                            } else if (hasWordPassed) {
                                wordProgress = 1;
                            }

                            return (
                                <Word
                                    key={idx}
                                    text={word.text}
                                    isActive={isWordActive}
                                    isPast={hasWordPassed}
                                    isLineActive={isActive} // PASSING ACTIVE STATE OF LINE
                                    progress={wordProgress}
                                    activeColor={activeColor}
                                    inactiveColor={inactiveColor || 'rgba(255,255,255,0.35)'}
                                    fontSize={fontSize + 2}
                                    animationStyle={animationStyle}
                                />
                            );
                        })}
                    </View>
                ) : (
                    // Standard line-level animation (no word timings)
                    <Animated.Text
                        style={[
                            styles.text,
                            animatedTextStyle,
                            lineGlowStyle,
                            { fontSize: fontSize },
                            isActive && {
                                fontSize: fontSize + 2,
                                fontWeight: '700',
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
    },
});

export default React.memo(LyricsLine);
