import React, { memo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

const EASE_OUT = Easing.bezier(0.23, 1, 0.32, 1);
export const SCROLL_SPRING = { duration: 750, dampingRatio: 0.88 };
// Lines below the active one start their move later, one after another
const WAVE_STEP_MS = 45;
const WAVE_MAX_LINES = 8;

const UNSUNG_OPACITY = 0.3;
const FEATHER_OPACITY = 0.55;
const KARAOKE_STYLES = ['Apple', 'Karaoke', 'Glow'];
const GLOW_MIN_MS = 1000;

const clamp01 = (x) => {
  'worklet';
  return x < 0 ? 0 : x > 1 ? 1 : x;
};

/**
 * One word of a line near the active one. The bright copy sits in an
 * absolutely positioned clip whose width follows the sung progress; a wider,
 * fainter clip in front of it gives the fill a soft leading edge.
 */
const KaraokeWord = memo(
  ({ word, timeMs, lead, lineActive, textStyle, gap, glow, color, lift, feather }) => {
    const [wordWidth, setWordWidth] = useState(0);
    const [wordHeight, setWordHeight] = useState(0);
    const { start, end } = word;

    // Reanimated 3 only tracks shared values read directly inside a worklet,
    // not ones reached through a nested helper. Reading timeMs here makes
    // every style below re-run each frame as the clock advances.
    const progress = useDerivedValue(() => {
      const t = timeMs.value + lead;
      if (end <= start) return t >= start ? 1 : 0;
      return clamp01((t - start) / (end - start));
    }, [start, end, lead]);

    // Sung words rise slightly and stay up until the line ends
    const wordStyle = useAnimatedStyle(() => {
      const p = progress.value;
      const rise = 1 - (1 - p) * (1 - p);
      return {
        transform: [{ translateY: -lift * rise * lineActive.value }],
      };
    }, [lift]);
    const baseStyle = useAnimatedStyle(() => ({
      opacity: 1 - (1 - UNSUNG_OPACITY) * lineActive.value,
    }));
    // The window slides right to reveal; the text inside slides back by the
    // same amount so it stays aligned with the dim copy underneath
    const fillOffset = useDerivedValue(
      () => Math.min(wordWidth, progress.value * wordWidth) - wordWidth,
      [wordWidth]
    );
    const featherOffset = useDerivedValue(
      () => Math.min(wordWidth, progress.value * wordWidth + feather) - wordWidth,
      [wordWidth, feather]
    );
    // Hidden until the word starts: an unsung word's bright copy is parked
    // off to the left and must never show if its counter-offset lags a frame
    const fillWindowStyle = useAnimatedStyle(() => ({
      opacity: progress.value > 0 ? lineActive.value : 0,
      transform: [{ translateX: fillOffset.value }],
    }));
    const fillTextAnim = useAnimatedStyle(() => ({
      transform: [{ translateX: -fillOffset.value }],
    }));
    const featherWindowStyle = useAnimatedStyle(() => {
      const p = progress.value;
      return {
        opacity:
          lineActive.value * FEATHER_OPACITY * clamp01(p * 8) * clamp01((1 - p) * 8),
        transform: [{ translateX: featherOffset.value }],
      };
    });
    const featherTextAnim = useAnimatedStyle(() => ({
      transform: [{ translateX: -featherOffset.value }],
    }));

    const windowSize = { width: wordWidth, height: wordHeight };
    const fillTextStyle = [
      textStyle,
      styles.fillText,
      windowSize,
      glow && {
        textShadowColor: color,
        textShadowRadius: 10,
        textShadowOffset: { width: 0, height: 0 },
      },
    ];

    return (
      <Animated.View style={[{ marginRight: gap }, wordStyle]}>
        {/* Animated props go on Views: Text nodes don't reliably pick up
            per-frame updates on the old architecture */}
        <Animated.View
          style={baseStyle}
          onLayout={(e) => {
            setWordWidth(Math.ceil(e.nativeEvent.layout.width));
            setWordHeight(Math.ceil(e.nativeEvent.layout.height));
          }}
        >
          <Text style={textStyle}>{word.text}</Text>
        </Animated.View>
        {wordWidth > 0 && (
          <>
            <Animated.View
              pointerEvents="none"
              style={[styles.clip, windowSize, featherWindowStyle]}
            >
              <Animated.View style={[windowSize, featherTextAnim]}>
                <Text style={fillTextStyle}>{word.text}</Text>
              </Animated.View>
            </Animated.View>
            <Animated.View
              pointerEvents="none"
              style={[styles.clip, windowSize, fillWindowStyle]}
            >
              <Animated.View style={[windowSize, fillTextAnim]}>
                <Text style={fillTextStyle}>{word.text}</Text>
              </Animated.View>
            </Animated.View>
          </>
        )}
      </Animated.View>
    );
  }
);

const LyricsLine = ({
  line,
  index,
  isNear,
  activeIndex,
  scrollCmd,
  scrollPos,
  autoScroll,
  timeMs,
  lead,
  synced,
  fontSize,
  activeColor,
  animationStyle,
  reducedMotion,
  onPress,
  onLayout,
}) => {
  const lineActive = useSharedValue(0);
  const rest = useSharedValue(synced ? 0.4 : 0.9);
  // This line's own copy of the scroll position; trailing it creates the wave
  const linePos = useSharedValue(0);
  const width = useSharedValue(0);

  // Everything below reacts on the UI thread, in the same frame the active
  // line changes, without waiting for React to re-render
  useAnimatedReaction(
    () => activeIndex.value,
    (current) => {
      if (!synced) return;
      const isActive = current === index;
      const distance = current < 0 ? index + 1 : Math.abs(index - current);
      lineActive.value = withTiming(isActive ? 1 : 0, {
        duration: isActive ? 300 : 500,
        easing: EASE_OUT,
      });
      rest.value = withTiming(Math.max(0.16, 0.42 - distance * 0.05), {
        duration: 500,
        easing: EASE_OUT,
      });
    },
    [synced, index]
  );

  useAnimatedReaction(
    () => scrollCmd.value,
    (cmd, prev) => {
      if (!cmd) return;
      // A freshly mounted line joins wherever the list currently is
      if (prev === null || cmd.mode === 'jump') {
        linePos.value = cmd.mode === 'jump' ? cmd.target : scrollPos.value;
        return;
      }
      if (cmd.mode === 'follow') {
        linePos.value = cmd.from;
        linePos.value = withSpring(cmd.target, SCROLL_SPRING);
        return;
      }
      const behind = index - activeIndex.value;
      const delay = behind <= 0 ? 0 : Math.min(behind, WAVE_MAX_LINES) * WAVE_STEP_MS;
      linePos.value = withDelay(delay, withSpring(cmd.target, SCROLL_SPRING));
    },
    [index]
  );

  const containerStyle = useAnimatedStyle(() => {
    const a = lineActive.value;
    const scale = reducedMotion ? 1 : 0.96 + 0.04 * a;
    const lag =
      autoScroll.value && !reducedMotion ? scrollPos.value - linePos.value : 0;
    return {
      opacity: rest.value + (1 - rest.value) * a,
      transform: [
        { translateY: lag },
        // RN 0.73 has no transformOrigin: keep left-aligned text anchored left
        { translateX: (-width.value * (1 - scale)) / 2 },
        { scale },
      ],
    };
  });

  const textStyle = {
    color: activeColor,
    fontSize,
    lineHeight: Math.round(fontSize * 1.25),
    fontWeight: '800',
    letterSpacing: -0.4,
  };
  const gap = Math.round(fontSize * 0.27);
  const karaoke =
    synced && isNear && KARAOKE_STYLES.includes(animationStyle) && line.words;

  const words =
    line.words ||
    line.text.split(' ').map((text, i, arr) => ({
      text,
      spaceAfter: i < arr.length - 1,
    }));

  return (
    <Pressable
      onPress={synced ? () => onPress(line.time) : undefined}
      onLayout={(e) => onLayout(index, e.nativeEvent.layout)}
      style={styles.pressable}
    >
      <Animated.View
        style={[styles.row, containerStyle]}
        onLayout={(e) => {
          width.value = e.nativeEvent.layout.width;
        }}
      >
        {words.map((word, i) => {
          const wordGap = word.spaceAfter ? gap : 0;
          if (karaoke) {
            return (
              <KaraokeWord
                key={i}
                word={word}
                timeMs={timeMs}
                lead={lead}
                lineActive={lineActive}
                textStyle={textStyle}
                gap={wordGap}
                color={activeColor}
                lift={reducedMotion ? 0 : fontSize * 0.06}
                feather={fontSize * 0.6}
                glow={
                  animationStyle === 'Glow' ||
                  (!line.estimated && word.end - word.start >= GLOW_MIN_MS)
                }
              />
            );
          }
          return (
            <View key={i} style={{ marginRight: wordGap }}>
              <Text style={textStyle}>{word.text}</Text>
            </View>
          );
        })}
      </Animated.View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  pressable: {
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignSelf: 'flex-start',
  },
  clip: {
    position: 'absolute',
    left: 0,
    top: 0,
    overflow: 'hidden',
  },
  fillText: {
    position: 'absolute',
    left: 0,
    top: 0,
  },
});

export default memo(LyricsLine);
