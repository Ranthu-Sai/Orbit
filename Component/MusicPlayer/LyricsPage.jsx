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
import { GetLyricsAnimationStyle, GetLyricsFontSize, SetLyricsFontSize, GetLyricsTheme, SetLyricsTheme, GetLyricsProvider, SetLyricsProvider, GetLyricsTextColor, SetLyricsTextColor } from '../../LocalStorage/AppSettings';
import TrackPlayer, { State, useProgress } from 'react-native-track-player';
import { Portal, Modal as PaperModal, Button, List, Divider } from 'react-native-paper';

const { width, height } = Dimensions.get('window');

const LyricsPage = ({ visible, onClose, currentSong, lyrics, isLoading, reFetchLyrics }) => {
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
    const [activeProvider, setActiveProvider] = useState('LrcLib');
    const [fontSize, setFontSize] = useState(26);
    const [lyricsTheme, setLyricsTheme] = useState('Blur');
    const [textColorMode, setTextColorMode] = useState('Auto');
    const [isMenuVisible, setIsMenuVisible] = useState(false);
    const scrollTimeoutRef = useRef(null);

    // Animated value for background transitions
    const backgroundOpacity = useSharedValue(0);
    const [currentArtwork, setCurrentArtwork] = useState(null);

    // Determine if we're in dark mode
    const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && dark);

    // Theme-aware colors with manual override support
    const activeTextColor = textColorMode === 'White' ? '#FFFFFF' : textColorMode === 'Black' ? '#000000' : (isDarkMode ? '#FFFFFF' : '#000000');
    const inactiveTextColor = textColorMode === 'White' ? 'rgba(255,255,255,0.5)' : textColorMode === 'Black' ? 'rgba(0,0,0,0.4)' : (isDarkMode ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)');
    const overlayColor = isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.1)';
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

    // Load all settings on mount
    useEffect(() => {
        if (visible) {
            GetLyricsAnimationStyle().then(style => setAnimationStyle(style));
            GetLyricsFontSize().then(size => setFontSize(size));
            GetLyricsTheme().then(theme => setLyricsTheme(theme));
            GetLyricsProvider().then(provider => setActiveProvider(provider));
            GetLyricsTextColor().then(mode => setTextColorMode(mode));
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

    const handleFontSizeChange = (delta) => {
        const newSize = Math.max(18, Math.min(40, fontSize + delta));
        setFontSize(newSize);
        SetLyricsFontSize(newSize);
    };

    const handleProviderChange = async (provider) => {
        setActiveProvider(provider);
        await SetLyricsProvider(provider);
        reFetchLyrics?.();
    };

    const handleThemeChange = async (theme) => {
        setLyricsTheme(theme);
        await SetLyricsTheme(theme);
    };

    const handleTextColorModeChange = async (mode) => {
        setTextColorMode(mode);
        await SetLyricsTextColor(mode);
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
                fontSize={fontSize}
            />
        );
    }, [activeLineIndex, animationStyle, activeTextColor, inactiveTextColor, isDarkMode, fontSize]);



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

                {/* Background Rendering based on theme */}
                {lyricsTheme === 'Blur' && artworkSource ? (
                    <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
                        <ImageBackground
                            source={artworkSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={40}
                        >
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: overlayColor }]} />
                        </ImageBackground>
                    </Animated.View>
                ) : lyricsTheme === 'Glass' && artworkSource ? (
                    <Animated.View style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}>
                        <ImageBackground
                            source={artworkSource}
                            style={StyleSheet.absoluteFill}
                            resizeMode="cover"
                            blurRadius={10}
                        >
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? 'rgba(0,0,0,0.8)' : 'rgba(255,255,255,0.7)' }]} />
                        </ImageBackground>
                    </Animated.View>
                ) : (
                    <View style={[StyleSheet.absoluteFill, { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' }]} />
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
                    <IconButton icon="dots-horizontal" onPress={() => setIsMenuVisible(true)} iconColor={iconColor} />
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

            {/* Settings Menu Modal - Using RN Modal to ensure visibility over the lyrics modal */}
            <Modal
                visible={isMenuVisible}
                animationType="fade"
                transparent={true}
                onRequestClose={() => setIsMenuVisible(false)}
            >
                <View style={styles.menuOverlay}>
                    <View style={[styles.menuModal, { backgroundColor: isDarkMode ? '#1E1E1E' : '#FFFFFF' }]}>
                        <Text variant="titleLarge" style={[styles.menuTitle, { color: iconColor }]}>Lyrics Settings</Text>

                        <Divider style={styles.divider} />

                        {/* Font Size Scaling */}
                        <List.Item
                            title="Font Size"
                            titleStyle={{ color: iconColor }}
                            left={props => <List.Icon {...props} icon="format-size" color={iconColor} />}
                            right={() => (
                                <View style={styles.row}>
                                    <IconButton icon="minus" size={20} onPress={() => handleFontSizeChange(-2)} iconColor={iconColor} />
                                    <Text style={{ color: iconColor, marginHorizontal: 8, fontSize: 16 }}>{fontSize}</Text>
                                    <IconButton icon="plus" size={20} onPress={() => handleFontSizeChange(2)} iconColor={iconColor} />
                                </View>
                            )}
                        />

                        <Divider style={styles.divider} />

                        {/* Lyrics Source Selection */}
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: iconColor }]}>Lyrics Source</Text>
                        <View style={styles.chipRow}>
                            {['LrcLib', 'BetterLyrics', 'YTMusic'].map(p => (
                                <Button
                                    key={p}
                                    mode={activeProvider === p ? 'contained' : 'outlined'}
                                    onPress={() => handleProviderChange(p)}
                                    style={styles.chip}
                                    labelStyle={{ fontSize: 12 }}
                                >
                                    {p}
                                </Button>
                            ))}
                        </View>

                        <Divider style={styles.divider} />

                        {/* Background Theme Selection */}
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: iconColor }]}>Background Theme</Text>
                        <View style={styles.chipRow}>
                            {['Blur', 'Glass', 'Solid'].map(t => (
                                <Button
                                    key={t}
                                    mode={lyricsTheme === t ? 'contained' : 'outlined'}
                                    onPress={() => handleThemeChange(t)}
                                    style={styles.chip}
                                    labelStyle={{ fontSize: 12 }}
                                >
                                    {t}
                                </Button>
                            ))}
                        </View>

                        <Divider style={styles.divider} />

                        {/* Text Color Selection */}
                        <Text variant="labelLarge" style={[styles.sectionLabel, { color: iconColor }]}>Text Color</Text>
                        <View style={styles.chipRow}>
                            {['Auto', 'White', 'Black'].map(c => (
                                <Button
                                    key={c}
                                    mode={textColorMode === c ? 'contained' : 'outlined'}
                                    onPress={() => handleTextColorModeChange(c)}
                                    style={styles.chip}
                                    labelStyle={{ fontSize: 12 }}
                                >
                                    {c}
                                </Button>
                            ))}
                        </View>

                        <Button mode="contained" onPress={() => setIsMenuVisible(false)} style={styles.closeMenuButton}>
                            Done
                        </Button>
                    </View>
                </View>
            </Modal>
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
    menuOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    menuModal: {
        width: width * 0.85,
        padding: 24,
        borderRadius: 24,
        elevation: 10,
    },
    menuTitle: {
        fontWeight: 'bold',
        marginBottom: 8,
        textAlign: 'center',
    },
    row: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    divider: {
        marginVertical: 12,
        opacity: 0.3,
    },
    sectionLabel: {
        fontSize: 14,
        fontWeight: 'bold',
        marginTop: 8,
        marginBottom: 12,
        opacity: 0.8,
    },
    chipRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginBottom: 8,
    },
    chip: {
        borderRadius: 12,
    },
    closeMenuButton: {
        marginTop: 20,
        borderRadius: 12,
    },
});

export default LyricsPage;
