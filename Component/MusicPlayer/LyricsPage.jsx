import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Modal, StatusBar, ImageBackground } from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,

} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../Context/ThemeContext';
import LyricsLine from './LyricsLine';
import { GetLyricsAnimationStyle } from '../../LocalStorage/AppSettings';
import TrackPlayer, { State, useProgress } from 'react-native-track-player';

const { width, height } = Dimensions.get('window');

const LyricsPage = ({ visible, onClose, currentSong, lyrics, isLoading }) => {
    const { colors, dark } = useTheme();
    const { themeMode } = useThemeContext();
    const insets = useSafeAreaInsets();
    // Reduced from 200ms to 50ms for tighter sync like ArchiveTune
    const { position } = useProgress(50);
    const flatListRef = useRef(null);

    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [animationStyle, setAnimationStyle] = useState('Smooth');
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const scrollTimeoutRef = useRef(null);

    // Animated value for background transitions
    const backgroundOpacity = useSharedValue(0);
    const [currentArtwork, setCurrentArtwork] = useState(null);

    // Determine if we're in dark mode
    const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && dark);

    // Theme-aware colors for lyrics
    const activeTextColor = isDarkMode ? '#FFFFFF' : '#000000';
    const inactiveTextColor = isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)';
    const overlayColor = isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.1)'; // Reduced opacity for bright look
    const controlsBgColor = isDarkMode ? 'rgba(0,0,0,0.5)' : 'transparent'; // Clean controls
    const iconColor = isDarkMode ? '#FFFFFF' : '#000000';
    const fadeGradientColors = isDarkMode
        ? ['rgba(0,0,0,0.95)', 'rgba(0,0,0,0.7)', 'transparent']
        : ['transparent', 'transparent', 'transparent']; // Removed white gradient overlay
    const fadeGradientColorsReverse = isDarkMode
        ? ['transparent', 'rgba(0,0,0,0.7)', 'rgba(0,0,0,0.95)']
        : ['transparent', 'transparent', 'transparent']; // Removed white gradient overlay

    // Track playback state
    useEffect(() => {
        const checkState = async () => {
            const state = await TrackPlayer.getPlaybackState();
            setIsPlaying(state.state === 'playing');
        };
        checkState();
        const interval = setInterval(checkState, 500);
        return () => clearInterval(interval);
    }, []);

    // Smooth artwork transition when song changes
    useEffect(() => {
        if (currentSong?.artwork) {
            // Fade out, then update artwork, then fade in
            backgroundOpacity.value = withTiming(0, { duration: 300 }, () => {
                // This will be called after fade out
            });
            // Small delay then set new artwork and fade in
            const timeout = setTimeout(() => {
                setCurrentArtwork(currentSong.artwork);
                backgroundOpacity.value = withTiming(1, { duration: 500 });
            }, 300);
            return () => clearTimeout(timeout);
        }
    }, [currentSong?.artwork]);

    // Load animation setting on mount
    useEffect(() => {
        if (visible) {
            GetLyricsAnimationStyle().then(style => setAnimationStyle(style));
            backgroundOpacity.value = withTiming(1, { duration: 500 });
        }
    }, [visible]);

    // Find active line with improved accuracy
    useEffect(() => {
        if (!lyrics || lyrics.length === 0) return;

        const currentTime = position * 1000; // Convert to ms

        // Find the line that's currently active
        let newIndex = -1;
        for (let i = 0; i < lyrics.length; i++) {
            const line = lyrics[i];
            const nextLine = lyrics[i + 1];

            if (currentTime >= line.time && (!nextLine || currentTime < nextLine.time)) {
                newIndex = i;
                break;
            }
        }

        if (newIndex !== -1 && newIndex !== activeLineIndex) {
            setActiveLineIndex(newIndex);
        }
    }, [position, lyrics]);

    // Calculate layout dimensions - Edge to edge design
    const HEADER_HEIGHT = 56;
    const HEADER_PADDING_TOP = insets.top;
    const CONTROLS_HEIGHT = 80;
    const CONTROLS_PADDING_BOTTOM = insets.bottom;
    const VISIBLE_LYRICS_HEIGHT = height - HEADER_HEIGHT - HEADER_PADDING_TOP - CONTROLS_HEIGHT - CONTROLS_PADDING_BOTTOM;
    const ITEM_HEIGHT = 80;

    // Center first/last lines properly
    const CONTENT_PADDING_TOP = VISIBLE_LYRICS_HEIGHT / 2 - ITEM_HEIGHT / 2;
    const CONTENT_PADDING_BOTTOM = VISIBLE_LYRICS_HEIGHT / 2 - ITEM_HEIGHT / 2;

    // Auto-scroll - Keep active line CENTERED in visible area
    // Using viewPosition: 0.5 ensures the item is centered in the viewport
    useEffect(() => {
        if (activeLineIndex >= 0 && !isUserScrolling && flatListRef.current && lyrics.length > 0) {
            flatListRef.current.scrollToIndex({
                index: activeLineIndex,
                animated: true,
                viewPosition: 0.5
            });
        }
    }, [activeLineIndex, isUserScrolling, lyrics.length]);

    const onScrollToIndexFailed = (info) => {
        const wait = new Promise(resolve => setTimeout(resolve, 100));
        wait.then(() => {
            if (flatListRef.current) {
                flatListRef.current.scrollToIndex({ index: info.index, animated: true, viewPosition: 0.5 });
            }
        });
    };

    const handleScrollBegin = () => {
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };

    const handleScrollEnd = () => {
        // Resume auto-scroll after a delay
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 3000);
    };

    const handleLinePress = async (time) => {
        await TrackPlayer.seekTo(time / 1000);
        setIsUserScrolling(false);
    };

    const renderItem = useCallback(({ item, index }) => {
        const isActive = index === activeLineIndex;
        const isPast = index < activeLineIndex;
        const distance = activeLineIndex >= 0 ? Math.abs(index - activeLineIndex) : 0;

        return (
            <LyricsLine
                text={item.text}
                isActive={isActive}
                isPast={isPast}
                distance={distance}
                onPress={() => handleLinePress(item.time)}
                animationStyle={animationStyle}
                activeColor={activeTextColor}
                inactiveColor={inactiveTextColor}
                isDarkMode={isDarkMode}
            />
        );
    }, [activeLineIndex, animationStyle, activeTextColor, inactiveTextColor, isDarkMode]);



    // Animated background style
    const animatedBackgroundStyle = useAnimatedStyle(() => ({
        opacity: backgroundOpacity.value,
    }));

    if (!visible) return null;

    const artworkSource = currentArtwork
        ? (typeof currentArtwork === 'string' ? { uri: currentArtwork } : currentArtwork)
        : null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
            statusBarTranslucent={true}
        >
            <StatusBar translucent backgroundColor="transparent" barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
            <View style={[styles.container, { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' }]}>

                {/* Blurred Artwork Background with smooth transition */}
                {artworkSource ? (
                    <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
                        <ImageBackground
                            source={artworkSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={40}
                        >
                            {/* Theme-aware overlay */}
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
                        </ImageBackground>
                    </Animated.View>
                ) : (
                    /* Fallback Gradient Background */
                    <LinearGradient
                        colors={isDarkMode
                            ? [colors.primaryContainer || '#1a1a1a', '#000000']
                            : [colors.primaryContainer || '#f5f5f5', '#FFFFFF']
                        }
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                )}

                {/* Header - Now uses paddingTop instead of marginTop for edge-to-edge */}
                <View style={[styles.header, { paddingTop: HEADER_PADDING_TOP }]}>
                    <IconButton
                        icon="chevron-down"
                        size={30}
                        onPress={onClose}
                        iconColor={iconColor}
                    />
                    <View style={styles.headerTitle}>
                        <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold', color: iconColor }}>
                            Now Playing
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1} style={{ color: isDarkMode ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)' }}>
                            {currentSong?.title || ""}
                        </Text>
                    </View>
                    <IconButton icon="dots-horizontal" onPress={() => { }} iconColor={iconColor} />
                </View>

                {/* Lyrics Content */}
                {isLoading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : !lyrics || lyrics.length === 0 ? (
                    <View style={styles.centerContent}>
                        <Text variant="headlineSmall" style={{ color: isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.5)' }}>
                            No lyrics available
                        </Text>
                    </View>
                ) : (
                    <View style={styles.lyricsContainer}>
                        <FlatList
                            ref={flatListRef}
                            data={lyrics}
                            renderItem={renderItem}
                            keyExtractor={(item, index) => index.toString()}
                            contentContainerStyle={{
                                paddingTop: CONTENT_PADDING_TOP,
                                paddingBottom: CONTENT_PADDING_BOTTOM,
                            }}
                            onScrollBeginDrag={handleScrollBegin}
                            onMomentumScrollEnd={handleScrollEnd}
                            getItemLayout={null} // Let FlatList measure items dynamically
                            onScrollToIndexFailed={onScrollToIndexFailed}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={20}
                            maxToRenderPerBatch={15}
                            windowSize={11}
                            removeClippedSubviews={false}
                        />
                    </View>
                )}

                {/* Smooth Fading edges - ArchiveTune style with multiple color stops */}
                <LinearGradient
                    colors={fadeGradientColors}
                    locations={[0, 0.5, 1]}
                    style={[styles.topFade, { top: HEADER_HEIGHT + HEADER_PADDING_TOP }]}
                    pointerEvents="none"
                />
                <LinearGradient
                    colors={fadeGradientColorsReverse}
                    locations={[0, 0.5, 1]}
                    style={[styles.bottomFade, { bottom: CONTROLS_HEIGHT + CONTROLS_PADDING_BOTTOM }]}
                    pointerEvents="none"
                />

                {/* Playback Controls - Bottom with theme-aware styling */}
                <View style={[styles.playbackControls, {
                    paddingBottom: CONTROLS_PADDING_BOTTOM + 16,
                    backgroundColor: controlsBgColor
                }]}>
                    <IconButton
                        icon="skip-previous"
                        size={32}
                        onPress={async () => await TrackPlayer.skipToPrevious()}
                        iconColor={iconColor}
                    />
                    <IconButton
                        icon={isPlaying ? "pause" : "play"}
                        size={40}
                        onPress={async () => {
                            const state = await TrackPlayer.getPlaybackState();
                            if (state.state === 'playing') {
                                await TrackPlayer.pause();
                                setIsPlaying(false);
                            } else {
                                await TrackPlayer.play();
                                setIsPlaying(true);
                            }
                        }}
                        iconColor={iconColor}
                        style={[styles.playButton, {
                            backgroundColor: isDarkMode ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.05)'
                        }]}
                    />
                    <IconButton
                        icon="skip-next"
                        size={32}
                        onPress={async () => await TrackPlayer.skipToNext()}
                        iconColor={iconColor}
                    />
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 8,
        paddingBottom: 8,
        zIndex: 20,
    },
    headerTitle: {
        flex: 1,
        alignItems: 'center',
    },
    centerContent: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    lyricsContainer: {
        flex: 1,
    },
    topFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 72, // ArchiveTune uses 72dp for fading edges
        zIndex: 5,
    },
    bottomFade: {
        position: 'absolute',
        left: 0,
        right: 0,
        height: 72, // ArchiveTune uses 72dp for fading edges
        zIndex: 5,
    },
    playbackControls: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 24,
        paddingVertical: 16,
        zIndex: 15,
    },
    playButton: {
        borderRadius: 24,
    },
});

export default LyricsPage;
