import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { View, StyleSheet, Dimensions, FlatList, Modal, TouchableOpacity, ImageBackground } from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import Animated, {
    useSharedValue,
    useAnimatedStyle,
    withTiming,
    FadeIn,
    FadeOut
} from 'react-native-reanimated';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useContext } from 'react';
import ContextState from '../../Context/ContextState'; // Adjust path if needed
import LyricsLine from './LyricsLine';
import { GetLyricsAnimationStyle } from '../../LocalStorage/AppSettings';
import TrackPlayer, { State, useProgress } from 'react-native-track-player';

const { width, height } = Dimensions.get('window');

const LyricsPage = ({ visible, onClose, currentSong, lyrics, isLoading }) => {
    const { colors } = useTheme();
    const insets = useSafeAreaInsets();
    const { position } = useProgress(200); // 200ms update interval
    const flatListRef = useRef(null);

    const [activeLineIndex, setActiveLineIndex] = useState(-1);
    const [animationStyle, setAnimationStyle] = useState('Smooth');
    const [isUserScrolling, setIsUserScrolling] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const scrollTimeoutRef = useRef(null);

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

    // Load animation setting on mount
    useEffect(() => {
        if (visible) {
            GetLyricsAnimationStyle().then(style => setAnimationStyle(style));
        }
    }, [visible]);

    // Find active line
    useEffect(() => {
        if (!lyrics || lyrics.length === 0) return;

        // Find the last line that has started
        const index = lyrics.findIndex((line, i) => {
            const nextLine = lyrics[i + 1];
            const currentTime = position * 1000; // Convert to ms
            return currentTime >= line.time && (!nextLine || currentTime < nextLine.time);
        });

        if (index !== -1 && index !== activeLineIndex) {
            setActiveLineIndex(index);
        }
    }, [position, lyrics]);

    // Layout constants - memoized for stable references
    const layoutConfig = useMemo(() => ({
        ITEM_HEIGHT: 80, // Approximate height per lyric line
        CONTENT_PADDING_TOP: height / 2, // Center first line in viewport
        CONTENT_PADDING_BOTTOM: height / 2, // Allow last line to center
    }), []);

    const { ITEM_HEIGHT, CONTENT_PADDING_TOP, CONTENT_PADDING_BOTTOM } = layoutConfig;

    // Auto-scroll - Use scrollToIndex with viewPosition for perfect centering
    useEffect(() => {
        if (activeLineIndex >= 0 && !isUserScrolling && flatListRef.current && lyrics.length > 0) {
            try {
                // scrollToIndex with viewPosition: 0.5 centers the item in viewport
                flatListRef.current.scrollToIndex({
                    index: activeLineIndex,
                    animated: true,
                    viewPosition: 0.5, // 0.5 = center of viewport
                });
            } catch (error) {
                // Fallback to scrollToOffset if scrollToIndex fails
                const targetOffset = CONTENT_PADDING_TOP + (activeLineIndex * ITEM_HEIGHT) - (height / 2) + (ITEM_HEIGHT / 2);
                flatListRef.current.scrollToOffset({
                    offset: Math.max(0, targetOffset),
                    animated: true
                });
            }
        }
    }, [activeLineIndex, isUserScrolling, lyrics.length]);

    const handleScrollBegin = () => {
        setIsUserScrolling(true);
        if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
    };

    const handleScrollEnd = () => {
        // Resume auto-scroll after a delay
        scrollTimeoutRef.current = setTimeout(() => {
            setIsUserScrolling(false);
        }, 3000); // Wait 3 seconds
    };

    const handleLinePress = async (time) => {
        await TrackPlayer.seekTo(time / 1000);
        // Resume auto-scroll immediately
        setIsUserScrolling(false);
    };

    const renderItem = useCallback(({ item, index }) => {
        const isActive = index === activeLineIndex;
        const isPast = index < activeLineIndex;
        // Calculate distance from active line for blur/opacity effects
        const distance = activeLineIndex >= 0 ? Math.abs(index - activeLineIndex) : 0;

        return (
            <LyricsLine
                text={item.text}
                isActive={isActive}
                isPast={isPast}
                distance={distance}
                onPress={() => handleLinePress(item.time)}
                animationStyle={animationStyle}
                activeColor="#FFFFFF"  // Bright white for active
                inactiveColor="#6E6E6E" // Darker gray for inactive
            />
        );
    }, [activeLineIndex, animationStyle]);

    // getItemLayout must account for content padding for accurate scroll positioning
    const getItemLayout = useCallback((data, index) => ({
        length: ITEM_HEIGHT,
        offset: CONTENT_PADDING_TOP + (ITEM_HEIGHT * index),
        index,
    }), [layoutConfig]);

    if (!visible) return null;

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <View style={[styles.container, { backgroundColor: colors.background }]}>

                {/* Blurred Artwork Background */}
                {currentSong?.artwork ? (
                    <ImageBackground
                        source={typeof currentSong.artwork === 'string' ? { uri: currentSong.artwork } : currentSong.artwork}
                        style={StyleSheet.absoluteFill}
                        blurRadius={50}
                        resizeMode="cover"
                    >
                        {/* Dark overlay for better text visibility */}
                        <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(0, 0, 0, 0.7)' }]} />
                    </ImageBackground>
                ) : (
                    /* Fallback Gradient Background */
                    <LinearGradient
                        colors={[colors.primaryContainer || '#1a1a1a', colors.background || '#000000']}
                        style={StyleSheet.absoluteFill}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                    />
                )}

                {/* Header */}
                <View style={[styles.header, { marginTop: insets.top }]}>
                    <IconButton
                        icon="chevron-down"
                        size={30}
                        onPress={onClose}
                        iconColor={colors.text}
                    />
                    <View style={styles.headerTitle}>
                        <Text variant="titleMedium" numberOfLines={1} style={{ fontWeight: 'bold', color: colors.text }}>
                            {currentSong?.title || "Lyrics"}
                        </Text>
                        <Text variant="bodySmall" numberOfLines={1} style={{ color: colors.onSurfaceVariant }}>
                            {currentSong?.artist || ""}
                        </Text>
                    </View>
                    <IconButton icon="dots-horizontal" onPress={() => { }} iconColor={colors.text} />
                </View>

                {/* Lyrics Content */}
                {isLoading ? (
                    <View style={styles.centerContent}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : !lyrics || lyrics.length === 0 ? (
                    <View style={styles.centerContent}>
                        <Text variant="headlineSmall" style={{ color: colors.onSurfaceVariant }}>
                            No lyrics available
                        </Text>
                    </View>
                ) : (
                    <View style={styles.lyricsContainer}>
                        {/* Top fading edge */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0.95)', 'rgba(0,0,0,0)']}
                            style={styles.topFade}
                            pointerEvents="none"
                        />

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
                            getItemLayout={getItemLayout}
                            showsVerticalScrollIndicator={false}
                            initialNumToRender={20}
                            maxToRenderPerBatch={15}
                            windowSize={11}
                            removeClippedSubviews={false}
                            onScrollToIndexFailed={(info) => {
                                // Fallback: scroll to approximate position
                                const offset = CONTENT_PADDING_TOP + (info.index * ITEM_HEIGHT) - (height / 2) + (ITEM_HEIGHT / 2);
                                flatListRef.current?.scrollToOffset({
                                    offset: Math.max(0, offset),
                                    animated: true
                                });
                            }}
                        />

                        {/* Bottom fading edge */}
                        <LinearGradient
                            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.95)']}
                            style={styles.bottomFade}
                            pointerEvents="none"
                        />
                    </View>
                )}

                {/* Playback Controls - Bottom */}
                <View style={[styles.playbackControls, { paddingBottom: insets.bottom + 16 }]}>
                    <IconButton
                        icon="skip-previous"
                        size={32}
                        onPress={async () => await TrackPlayer.skipToPrevious()}
                        iconColor="#FFFFFF"
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
                        iconColor="#FFFFFF"
                        style={styles.playButton}
                    />
                    <IconButton
                        icon="skip-next"
                        size={32}
                        onPress={async () => await TrackPlayer.skipToNext()}
                        iconColor="#FFFFFF"
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
        zIndex: 10,
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
        position: 'relative',
    },
    topFade: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: 80,
        zIndex: 10,
    },
    bottomFade: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: 120,
        zIndex: 10,
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
        backgroundColor: 'rgba(0, 0, 0, 0.3)',
    },
    playButton: {
        backgroundColor: 'rgba(255, 255, 255, 0.15)',
        borderRadius: 24,
    },
});

export default LyricsPage;
