import React, {
  useRef,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from 'react';
import {
  View,
  StyleSheet,
  Dimensions,
  Modal,
  StatusBar,
  ImageBackground,
  UIManager,
  Platform,
} from 'react-native';
import { Text, IconButton, ActivityIndicator } from 'react-native-paper';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedRef,
  useAnimatedScrollHandler,
  useAnimatedReaction,
  useDerivedValue,
  useFrameCallback,
  useReducedMotion,
  withTiming,
  withSpring,
  cancelAnimation,
  scrollTo,
  runOnJS,
  runOnUI,
} from 'react-native-reanimated';
import BottomSheet, {
  BottomSheetScrollView,
  BottomSheetBackdrop,
} from '@gorhom/bottom-sheet';
import LinearGradient from 'react-native-linear-gradient';
import { GlassBox } from '../Global/GlassBox';
import { BlurView } from '@react-native-community/blur';
import { BlurredBackground } from './Background';

const isBlurNativeAvailable =
  Platform.OS === 'ios' ||
  Boolean(UIManager.getViewManagerConfig?.('AndroidBlurView')) ||
  Boolean(UIManager.AndroidBlurView);

const circleGradient = {
  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
  stops: [
    { offset: '0%', opacity: 0.5 },
    { offset: '40%', opacity: 0.0 },
    { offset: '60%', opacity: 0.0 },
    { offset: '100%', opacity: 0.5 },
  ],
};
import { useTheme } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useThemeContext } from '../../Context/ThemeContext';
import LyricsLine, { SCROLL_SPRING } from './LyricsLine';
import { buildLyricLines } from './LyricsTiming';
import {
  GetLyricsAnimationStyle,
  SetLyricsAnimationStyle,
  GetLyricsFontSize,
  SetLyricsFontSize,
  GetLyricsTheme,
  SetLyricsTheme,
  GetLyricsProvider,
  SetLyricsProvider,
  GetLyricsTextColor,
  SetLyricsTextColor,
} from '../../LocalStorage/AppSettings';
import TrackPlayer, { State, usePlaybackState } from 'react-native-track-player';
import {
  Portal,
  Modal as PaperModal,
  Button,
  List,
  Divider,
} from 'react-native-paper';
import { GestureHandlerRootView } from 'react-native-gesture-handler';

const { width, height } = Dimensions.get('window');

// Lyrics are shown slightly ahead of the audio so the eye leads the voice
const LYRICS_LEAD_MS = 60;
// The move to the next line starts this much before it is sung, so the
// handoff is underway as the previous line's last word finishes
const LINE_HANDOFF_LEAD_MS = 150;
// Karaoke words for upcoming lines are created after the scroll settles,
// never in the same frame as a line change
const KARAOKE_WINDOW_DELAY_MS = 1000;
// Clock drift beyond this means a seek happened: snap instead of easing
const CLOCK_SNAP_MS = 300;
const CLOCK_SYNC_INTERVAL_MS = 250;
// Active line sits in the upper third, like Apple Music
const ACTIVE_LINE_ANCHOR = 0.33;
const AUTO_SCROLL_RESUME_MS = 3000;

// Memoized Settings Component to prevent re-renders from playback progress
const LyricsSettings = React.memo(
  ({
    fontSize,
    onFontSizeChange,
    onRefreshLyrics,
    activeProvider,
    onProviderChange,
    lyricsTheme,
    onThemeChange,
    textColorMode,
    onTextColorModeChange,
    animationStyle,
    onAnimationStyleChange,
    onClose,
  }) => {
    return (
      <BottomSheetScrollView
        style={styles.sheetScrollView}
        contentContainerStyle={styles.sheetScrollContent}
      >
        {/* Title */}
        <Text variant="titleLarge" style={styles.drawerTitle}>
          Lyrics Settings
        </Text>
        <Divider style={styles.divider} />

        {/* Font Size Scaling */}
        <List.Item
          title="Font Size"
          titleStyle={{ color: '#FFFFFF' }}
          left={(props) => (
            <List.Icon {...props} icon="format-size" color="#FFFFFF" />
          )}
          right={() => (
            <View style={styles.row}>
              <IconButton
                icon="minus"
                size={20}
                onPress={() => onFontSizeChange(-2)}
                iconColor="#FFFFFF"
              />
              <Text
                style={{ color: '#FFFFFF', marginHorizontal: 8, fontSize: 16 }}
              >
                {fontSize}
              </Text>
              <IconButton
                icon="plus"
                size={20}
                onPress={() => onFontSizeChange(2)}
                iconColor="#FFFFFF"
              />
            </View>
          )}
        />

        <Divider style={styles.divider} />

        {/* Refresh Lyrics Button */}
        <List.Item
          title="Refresh Lyrics"
          titleStyle={{ color: '#FFFFFF' }}
          description="Re-fetch lyrics for current song"
          descriptionStyle={{ color: 'rgba(255,255,255,0.6)' }}
          left={(props) => (
            <List.Icon {...props} icon="refresh" color="#FFFFFF" />
          )}
          onPress={() => {
            onClose();
            onRefreshLyrics && onRefreshLyrics();
          }}
          style={styles.refreshButton}
        />

        <Divider style={styles.divider} />

        {/* Lyrics Source Selection */}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Lyrics Source
        </Text>
        <View style={styles.chipRow}>
          {['LrcLib', 'BetterLyrics', 'YTMusic'].map((p) => (
            <Button
              key={p}
              mode={activeProvider === p ? 'contained' : 'outlined'}
              onPress={() => onProviderChange(p)}
              style={styles.chip}
              labelStyle={{ fontSize: 12, color: '#FFFFFF' }}
            >
              {p}
            </Button>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Background Theme Selection */}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Background Theme
        </Text>
        <View style={styles.chipRow}>
          {['Blur', 'Glass', 'Solid'].map((t) => (
            <Button
              key={t}
              mode={lyricsTheme === t ? 'contained' : 'outlined'}
              onPress={() => onThemeChange(t)}
              style={styles.chip}
              labelStyle={{ fontSize: 12, color: '#FFFFFF' }}
            >
              {t}
            </Button>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Text Color Selection */}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Text Color
        </Text>
        <View style={styles.chipRow}>
          {['Auto', 'White', 'Black'].map((c) => (
            <Button
              key={c}
              mode={textColorMode === c ? 'contained' : 'outlined'}
              onPress={() => onTextColorModeChange(c)}
              style={styles.chip}
              labelStyle={{ fontSize: 12, color: '#FFFFFF' }}
            >
              {c}
            </Button>
          ))}
        </View>

        <Divider style={styles.divider} />

        {/* Animation Style Selection */}
        <Text variant="labelLarge" style={styles.sectionLabel}>
          Animation Style
        </Text>
        <View style={styles.chipRow}>
          {['Apple', 'Smooth', 'Fade', 'Karaoke', 'Glow'].map((a) => (
            <Button
              key={a}
              mode={animationStyle === a ? 'contained' : 'outlined'}
              onPress={() => onAnimationStyleChange(a)}
              style={styles.chip}
              labelStyle={{ fontSize: 12, color: '#FFFFFF' }}
            >
              {a}
            </Button>
          ))}
        </View>

        <Button
          mode="contained"
          onPress={onClose}
          style={styles.closeMenuButton}
          labelStyle={{ color: '#FFFFFF' }}
        >
          Done
        </Button>
      </BottomSheetScrollView>
    );
  }
);

const LyricsPage = ({
  visible,
  onClose,
  currentSong,
  lyrics,
  isLoading,
  reFetchLyrics,
}) => {
  const { colors, dark } = useTheme();
  const { themeMode } = useThemeContext();
  const insets = useSafeAreaInsets();
  const reducedMotion = useReducedMotion();
  const playbackState = usePlaybackState();
  const isPlaying = playbackState?.state === State.Playing;

  const [activeLineIndex, setActiveLineIndex] = useState(-1);
  const [animationStyle, setAnimationStyle] = useState('Apple');
  const [isUserScrolling, setIsUserScrolling] = useState(false);

  const { lines, synced } = useMemo(() => buildLyricLines(lyrics), [lyrics]);

  // Lines in [center - 1, center + 2] render karaoke words. The center trails
  // the active line, so the next line is already built when it becomes active
  const [karaokeCenter, setKaraokeCenter] = useState(-1);
  useEffect(() => {
    const covered =
      activeLineIndex >= karaokeCenter && activeLineIndex <= karaokeCenter + 1;
    if (!covered) {
      setKaraokeCenter(activeLineIndex);
      return undefined;
    }
    const timer = setTimeout(
      () => setKaraokeCenter(activeLineIndex),
      KARAOKE_WINDOW_DELAY_MS
    );
    return () => clearTimeout(timer);
  }, [activeLineIndex, karaokeCenter]);
  const [activeProvider, setActiveProvider] = useState('LrcLib');
  const [fontSize, setFontSize] = useState(26);
  const [lyricsTheme, setLyricsTheme] = useState('Blur');
  const [textColorMode, setTextColorMode] = useState('Auto');
  const [isMenuVisible, setIsMenuVisible] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const settingsSheetRef = useRef(null);

  // Animated value for background transitions
  const backgroundOpacity = useSharedValue(0);
  const [currentArtwork, setCurrentArtwork] = useState(null);

  // Bottom sheet snap points
  const snapPoints = useMemo(() => ['70%'], []);

  // Handle bottom sheet changes
  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      setIsMenuVisible(false);
    }
  }, []);

  // Open settings sheet
  const openSettingsSheet = useCallback(() => {
    setIsMenuVisible(true);
    settingsSheetRef.current?.snapToIndex(0);
  }, []);

  // Close settings sheet
  const closeSettingsSheet = useCallback(() => {
    settingsSheetRef.current?.close();
  }, []);

  // Render backdrop for bottom sheet
  const renderBackdrop = useCallback(
    (props) => (
      <BottomSheetBackdrop
        {...props}
        disappearsOnIndex={-1}
        appearsOnIndex={0}
        opacity={0.5}
        pressBehavior="close"
      />
    ),
    []
  );

  // Determine if we're in dark mode
  const isDarkMode = themeMode === 'dark' || (themeMode === 'system' && dark);

  // Theme-aware colors with manual override support
  const activeTextColor =
    textColorMode === 'White'
      ? '#FFFFFF'
      : textColorMode === 'Black'
      ? '#000000'
      : isDarkMode
      ? '#FFFFFF'
      : '#000000';
  const inactiveTextColor =
    textColorMode === 'White'
      ? 'rgba(255,255,255,0.5)'
      : textColorMode === 'Black'
      ? 'rgba(0,0,0,0.4)'
      : isDarkMode
      ? 'rgba(255,255,255,0.5)'
      : 'rgba(0,0,0,0.4)';
  const overlayColor = isDarkMode ? 'rgba(0,0,0,0.6)' : 'rgba(255,255,255,0.1)';
  const controlsBgColor = isDarkMode ? 'rgba(0,0,0,0.5)' : 'transparent'; // Clean controls
  const iconColor =
    textColorMode === 'White'
      ? '#FFFFFF'
      : textColorMode === 'Black'
      ? '#000000'
      : isDarkMode
      ? '#FFFFFF'
      : '#000000';
  const fadeGradientColors = ['transparent', 'transparent', 'transparent'];
  const fadeGradientColorsReverse = [
    'transparent',
    'transparent',
    'transparent',
  ];

  // Playback clock on the UI thread. It advances every frame while playing;
  // the JS thread only posts position samples, and the frame callback eases
  // the drift out, so no frame's increment is ever overwritten
  const timeMs = useSharedValue(0);
  const playing = useSharedValue(false);
  const clockSample = useSharedValue({ id: 0, pos: 0, force: false });
  const lastSampleId = useSharedValue(0);
  const pendingDrift = useSharedValue(0);

  useEffect(() => {
    playing.value = isPlaying;
  }, [isPlaying]);

  const clock = useFrameCallback((frame) => {
    let t = timeMs.value;
    const sample = clockSample.value;
    if (sample.id !== lastSampleId.value) {
      lastSampleId.value = sample.id;
      const drift = sample.pos - t;
      if (sample.force || Math.abs(drift) > CLOCK_SNAP_MS) {
        t = sample.pos;
        pendingDrift.value = 0;
      } else {
        pendingDrift.value = drift;
      }
    }
    if (playing.value && frame.timeSincePreviousFrame != null) {
      // Cap the step so a suspended frame can't jump the clock
      t += Math.min(frame.timeSincePreviousFrame, 100);
    }
    const correction = pendingDrift.value * 0.08;
    pendingDrift.value -= correction;
    timeMs.value = t + correction;
  }, false);

  const sampleCounter = useRef(0);
  const postClockSample = useCallback((posMs, force = false) => {
    sampleCounter.current += 1;
    clockSample.value = { id: sampleCounter.current, pos: posMs, force };
  }, []);

  useEffect(() => {
    clock.setActive(visible);
    if (!visible) return undefined;
    let alive = true;
    const sync = async (force) => {
      try {
        const { position } = await TrackPlayer.getProgress();
        if (alive) postClockSample(position * 1000, force);
      } catch (e) {
        // Player not ready yet
      }
    };
    sync(true);
    const interval = setInterval(() => sync(false), CLOCK_SYNC_INTERVAL_MS);
    return () => {
      alive = false;
      clearInterval(interval);
    };
  }, [visible, postClockSample]);

  // Scroll state shared with every line (see LyricsLine for the wave)
  const scrollRef = useAnimatedRef();
  const scrollPos = useSharedValue(0);
  const scrollOffset = useSharedValue(0);
  const scrollCmd = useSharedValue(null);
  const autoScroll = useSharedValue(true);
  const lineCenters = useSharedValue([]);
  const anchorPx = useSharedValue(0);
  const activeIndexSV = useSharedValue(-1);
  const lineStarts = useSharedValue([]);

  const issueScroll = (mode, idx) => {
    'worklet';
    const center = lineCenters.value[idx];
    if (center == null) return;
    scrollCmd.value = {
      mode,
      target: Math.max(0, center - anchorPx.value),
      from: scrollOffset.value,
    };
  };

  useEffect(() => {
    lineStarts.value = synced ? lines.map((l) => l.time) : [];
  }, [lines, synced]);

  // Active line is found on the UI thread; lines and scroll react in the
  // same frame, React only hears about it to swap which lines show karaoke
  useAnimatedReaction(
    () => {
      const starts = lineStarts.value;
      const t = timeMs.value + LYRICS_LEAD_MS + LINE_HANDOFF_LEAD_MS;
      let idx = -1;
      for (let i = 0; i < starts.length; i++) {
        if (starts[i] <= t) idx = i;
        else break;
      }
      return idx;
    },
    (idx, prev) => {
      if (idx === prev) return;
      activeIndexSV.value = idx;
      runOnJS(setActiveLineIndex)(idx);
      if (autoScroll.value && idx >= 0) {
        const advancedOne = prev != null && prev >= 0 && idx === prev + 1;
        issueScroll(advancedOne && !reducedMotion ? 'wave' : 'follow', idx);
      }
    },
    [reducedMotion]
  );

  useAnimatedReaction(
    () => scrollCmd.value,
    (cmd) => {
      if (!cmd) return;
      if (cmd.mode === 'jump') {
        scrollPos.value = cmd.target;
        return;
      }
      if (cmd.mode === 'follow') scrollPos.value = cmd.from;
      scrollPos.value = withSpring(cmd.target, SCROLL_SPRING);
    }
  );

  useDerivedValue(() => {
    if (autoScroll.value) {
      scrollTo(scrollRef, 0, scrollPos.value, false);
    }
  });

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
      GetLyricsAnimationStyle().then((style) => setAnimationStyle(style));
      GetLyricsFontSize().then((size) => setFontSize(size));
      GetLyricsTheme().then((theme) => setLyricsTheme(theme));
      GetLyricsProvider().then((provider) => setActiveProvider(provider));
      GetLyricsTextColor().then((mode) => setTextColorMode(mode));
      backgroundOpacity.value = withTiming(1, { duration: 500 });
    }
  }, [visible]);

  // Auto refetch lyrics when song changes while modal is open
  useEffect(() => {
    if (visible && currentSong?.id && reFetchLyrics) {
      reFetchLyrics();
    }
  }, [currentSong?.id]);

  // Calculate layout dimensions - Edge to edge design
  const HEADER_HEIGHT = 56;
  const HEADER_PADDING_TOP = insets.top;
  const CONTROLS_HEIGHT = 80;
  const CONTROLS_PADDING_BOTTOM = insets.bottom;
  const VISIBLE_LYRICS_HEIGHT =
    height -
    HEADER_HEIGHT -
    HEADER_PADDING_TOP -
    CONTROLS_HEIGHT -
    CONTROLS_PADDING_BOTTOM;

  const CONTENT_PADDING_TOP = VISIBLE_LYRICS_HEIGHT * ACTIVE_LINE_ANCHOR;
  const CONTENT_PADDING_BOTTOM = VISIBLE_LYRICS_HEIGHT * (1 - ACTIVE_LINE_ANCHOR);

  useEffect(() => {
    anchorPx.value = VISIBLE_LYRICS_HEIGHT * ACTIVE_LINE_ANCHOR;
  }, [VISIBLE_LYRICS_HEIGHT]);

  const lineLayouts = useRef([]);
  const layoutFlush = useRef(null);
  const hasInitialScroll = useRef(false);

  useEffect(() => {
    lineLayouts.current = [];
    hasInitialScroll.current = false;
  }, [lines, fontSize]);

  const jumpToActiveLine = useCallback(() => {
    runOnUI(() => {
      'worklet';
      issueScroll('jump', Math.max(0, activeIndexSV.value));
    })();
  }, []);

  // Line positions are batched into one shared array once layout settles
  const handleLineLayout = useCallback(
    (index, layout) => {
      lineLayouts.current[index] = layout.y + layout.height / 2;
      clearTimeout(layoutFlush.current);
      layoutFlush.current = setTimeout(() => {
        lineCenters.value = [...lineLayouts.current];
        if (!hasInitialScroll.current && synced) {
          hasInitialScroll.current = true;
          jumpToActiveLine();
        }
      }, 16);
    },
    [synced, jumpToActiveLine]
  );

  const resumeAutoScroll = useCallback(() => {
    runOnUI(() => {
      'worklet';
      // Start the spring from where the user left the list
      scrollPos.value = scrollOffset.value;
      autoScroll.value = true;
      if (activeIndexSV.value >= 0) issueScroll('follow', activeIndexSV.value);
    })();
    setIsUserScrolling(false);
  }, []);

  const handleScrollBegin = useCallback(() => {
    setIsUserScrolling(true);
    clearTimeout(scrollTimeoutRef.current);
  }, []);

  const handleScrollEnd = useCallback(() => {
    clearTimeout(scrollTimeoutRef.current);
    scrollTimeoutRef.current = setTimeout(
      resumeAutoScroll,
      AUTO_SCROLL_RESUME_MS
    );
  }, [resumeAutoScroll]);

  useEffect(
    () => () => {
      clearTimeout(scrollTimeoutRef.current);
      clearTimeout(layoutFlush.current);
    },
    []
  );

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (e) => {
      scrollOffset.value = e.contentOffset.y;
    },
    onBeginDrag: () => {
      autoScroll.value = false;
      cancelAnimation(scrollPos);
      runOnJS(handleScrollBegin)();
    },
    onEndDrag: () => {
      runOnJS(handleScrollEnd)();
    },
    onMomentumEnd: () => {
      runOnJS(handleScrollEnd)();
    },
  });

  const handleLinePress = useCallback(
    async (time) => {
      postClockSample(time, true);
      clearTimeout(scrollTimeoutRef.current);
      resumeAutoScroll();
      await TrackPlayer.seekTo(time / 1000);
    },
    [postClockSample, resumeAutoScroll]
  );

  const handleFontSizeChange = useCallback(
    (delta) => {
      const newSize = Math.max(18, Math.min(40, fontSize + delta));
      setFontSize(newSize);
      SetLyricsFontSize(newSize);
    },
    [fontSize]
  );

  const handleProviderChange = useCallback(
    async (provider) => {
      setActiveProvider(provider);
      await SetLyricsProvider(provider);
      reFetchLyrics?.();
    },
    [reFetchLyrics]
  );

  const handleThemeChange = useCallback(async (theme) => {
    setLyricsTheme(theme);
    await SetLyricsTheme(theme);
  }, []);

  const handleTextColorModeChange = useCallback(async (mode) => {
    setTextColorMode(mode);
    await SetLyricsTextColor(mode);
  }, []);

  const handleAnimationStyleChange = useCallback(async (style) => {
    setAnimationStyle(style);
    await SetLyricsAnimationStyle(style);
  }, []);

  // Animated background style
  const animatedBackgroundStyle = useAnimatedStyle(() => ({
    opacity: backgroundOpacity.value,
  }));

  if (!visible) {
    return null;
  }

  const artworkSource = currentArtwork
    ? typeof currentArtwork === 'string'
      ? { uri: currentArtwork }
      : currentArtwork
    : null;

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
      statusBarTranslucent={true}
    >
      <GestureHandlerRootView style={{ flex: 1 }}>
        <StatusBar
          translucent
          backgroundColor="transparent"
          barStyle={isDarkMode ? 'light-content' : 'dark-content'}
        />
        <View
          style={[
            styles.container,
            { backgroundColor: isDarkMode ? '#000000' : '#FFFFFF' },
          ]}
        >
          {/* Background Rendering based on theme */}
          {lyricsTheme === 'Blur' && artworkSource ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}
            >
              <ImageBackground
                source={artworkSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                blurRadius={40}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: overlayColor },
                  ]}
                />
              </ImageBackground>
            </Animated.View>
          ) : lyricsTheme === 'Glass' && artworkSource ? (
            <Animated.View
              style={[StyleSheet.absoluteFill, animatedBackgroundStyle]}
            >
              <ImageBackground
                source={artworkSource}
                style={StyleSheet.absoluteFill}
                resizeMode="cover"
                blurRadius={10}
              >
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    {
                      backgroundColor: isDarkMode
                        ? 'rgba(0,0,0,0.8)'
                        : 'rgba(255,255,255,0.7)',
                    },
                  ]}
                />
              </ImageBackground>
            </Animated.View>
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                { backgroundColor: isDarkMode ? '#121212' : '#F5F5F5' },
              ]}
            />
          )}

          {/* Header - Now uses paddingTop instead of marginTop for edge-to-edge */}
          <View style={[styles.header, { paddingTop: HEADER_PADDING_TOP }]}>
            <GlassBox id="lyrics-close" gradientConfig={circleGradient} style={{ borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                icon="chevron-down"
                size={30}
                onPress={onClose}
                iconColor={iconColor}
                style={{ margin: 0 }}
              />
            </GlassBox>
            <View style={styles.headerTitle}>
              <Text
                variant="titleMedium"
                numberOfLines={1}
                style={{ fontWeight: 'bold', color: iconColor }}
              >
                Now Playing
              </Text>
              <Text
                variant="bodySmall"
                numberOfLines={1}
                style={{ color: iconColor, opacity: 0.7 }}
              >
                {currentSong?.title || ''}
              </Text>
            </View>
            <GlassBox id="lyrics-menu" gradientConfig={circleGradient} style={{ borderRadius: 24, width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                icon="dots-horizontal"
                size={24}
                onPress={openSettingsSheet}
                iconColor={iconColor}
                style={{ margin: 0 }}
              />
            </GlassBox>
          </View>

          {/* Lyrics Content */}
          {isLoading ? (
            <View style={styles.centerContent}>
              <ActivityIndicator size="large" color={colors.primary} />
            </View>
          ) : lines.length === 0 ? (
            <View style={styles.centerContent}>
              <Text
                variant="headlineSmall"
                style={{
                  color: isDarkMode
                    ? 'rgba(255,255,255,0.5)'
                    : 'rgba(0,0,0,0.5)',
                }}
              >
                No lyrics available
              </Text>
            </View>
          ) : (
            <View style={styles.lyricsContainer}>
              <Animated.ScrollView
                ref={scrollRef}
                onScroll={scrollHandler}
                scrollEventThrottle={16}
                contentContainerStyle={{
                  paddingTop: synced ? CONTENT_PADDING_TOP : 24,
                  paddingBottom: synced ? CONTENT_PADDING_BOTTOM : 24,
                }}
                showsVerticalScrollIndicator={false}
              >
                {lines.map((line, index) => (
                  <LyricsLine
                    key={line.key}
                    line={line}
                    index={index}
                    isNear={
                      index >= karaokeCenter - 1 && index <= karaokeCenter + 2
                    }
                    activeIndex={activeIndexSV}
                    scrollCmd={scrollCmd}
                    scrollPos={scrollPos}
                    autoScroll={autoScroll}
                    timeMs={timeMs}
                    lead={LYRICS_LEAD_MS}
                    synced={synced}
                    fontSize={fontSize}
                    activeColor={activeTextColor}
                    animationStyle={animationStyle}
                    reducedMotion={reducedMotion}
                    onPress={handleLinePress}
                    onLayout={handleLineLayout}
                  />
                ))}
              </Animated.ScrollView>
            </View>
          )}

          {/* Smooth Fading edges - ArchiveTune style with multiple color stops */}
          <LinearGradient
            colors={fadeGradientColors}
            locations={[0, 0.5, 1]}
            style={[
              styles.topFade,
              { top: HEADER_HEIGHT + HEADER_PADDING_TOP },
            ]}
            pointerEvents="none"
          />
          <LinearGradient
            colors={fadeGradientColorsReverse}
            locations={[0, 0.5, 1]}
            style={[
              styles.bottomFade,
              { bottom: CONTROLS_HEIGHT + CONTROLS_PADDING_BOTTOM },
            ]}
            pointerEvents="none"
          />

          {/* Playback Controls - Bottom with theme-aware styling */}
          <View
            style={[
              styles.playbackControls,
              {
                paddingBottom: CONTROLS_PADDING_BOTTOM + 16,
                backgroundColor: 'transparent',
              },
            ]}
          >
            <GlassBox id="lyrics-prev" gradientConfig={circleGradient} style={{ borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                icon="skip-previous"
                size={32}
                onPress={async () => await TrackPlayer.skipToPrevious()}
                iconColor={iconColor}
                style={{ margin: 0 }}
              />
            </GlassBox>
            
            <GlassBox id="lyrics-play" gradientConfig={circleGradient} style={{ borderRadius: 32, width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                icon={isPlaying ? 'pause' : 'play'}
                size={40}
                onPress={async () => {
                  const state = await TrackPlayer.getPlaybackState();
                  if (state.state === 'playing') {
                    await TrackPlayer.pause();
                  } else {
                    await TrackPlayer.play();
                  }
                }}
                iconColor={iconColor}
                style={{ margin: 0 }}
              />
            </GlassBox>

            <GlassBox id="lyrics-next" gradientConfig={circleGradient} style={{ borderRadius: 28, width: 56, height: 56, alignItems: 'center', justifyContent: 'center' }}>
              <IconButton
                icon="skip-next"
                size={32}
                onPress={async () => await TrackPlayer.skipToNext()}
                iconColor={iconColor}
                style={{ margin: 0 }}
              />
            </GlassBox>
          </View>
        </View>

        {/* Settings Bottom Sheet - Drag to close enabled */}
        <BottomSheet
          ref={settingsSheetRef}
          index={isMenuVisible ? 0 : -1}
          snapPoints={snapPoints}
          onChange={handleSheetChanges}
          enablePanDownToClose={true}
          enableContentPanningGesture={true}
          enableHandlePanningGesture={true}
          backdropComponent={renderBackdrop}
          backgroundStyle={styles.sheetBackground}
          backgroundComponent={({ style }) => (
            <View
              style={[
                style,
                {
                  borderTopLeftRadius: 24,
                  borderTopRightRadius: 24,
                  overflow: 'hidden',
                },
              ]}
            >
              {isBlurNativeAvailable ? (
                <BlurView
                  style={StyleSheet.absoluteFill}
                  blurType="dark"
                  blurAmount={25}
                  overlayColor="rgba(20, 20, 20, 0.65)"
                  reducedTransparencyFallbackColor="#1E1E1E"
                />
              ) : artworkSource ? (
                <BlurredBackground
                  source={artworkSource}
                  blurRadius={35}
                  overlayGradient={[
                    'rgba(15, 15, 15, 0.7)',
                    'rgba(15, 15, 15, 0.85)',
                    'rgba(15, 15, 15, 0.9)',
                    'rgba(15, 15, 15, 0.95)',
                  ]}
                />
              ) : (
                <View
                  style={[
                    StyleSheet.absoluteFill,
                    { backgroundColor: 'rgba(30, 30, 30, 0.85)' },
                  ]}
                />
              )}
            </View>
          )}
          handleIndicatorStyle={styles.sheetHandleIndicator}
        >
          <LyricsSettings
            fontSize={fontSize}
            onFontSizeChange={handleFontSizeChange}
            onRefreshLyrics={reFetchLyrics}
            activeProvider={activeProvider}
            onProviderChange={handleProviderChange}
            lyricsTheme={lyricsTheme}
            onThemeChange={handleThemeChange}
            textColorMode={textColorMode}
            onTextColorModeChange={handleTextColorModeChange}
            animationStyle={animationStyle}
            onAnimationStyleChange={handleAnimationStyleChange}
            onClose={closeSettingsSheet}
          />
        </BottomSheet>
      </GestureHandlerRootView>
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
  // Bottom Sheet styles
  sheetBackground: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandle: {
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandleIndicator: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    width: 40,
  },
  sheetHandleContainer: {
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 8,
    backgroundColor: 'transparent',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  sheetHandleBar: {
    marginBottom: 2,
    transform: [{ scaleY: 2.5 }, { scaleX: 1.2 }],
  },
  drawerTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
    color: '#FFFFFF',
  },
  sheetScrollView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  sheetScrollContent: {
    paddingHorizontal: 24,
    paddingBottom: 40,
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
    color: '#FFFFFF',
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
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 12,
    marginVertical: 4,
  },
});

export default LyricsPage;
