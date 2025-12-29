import React, { useRef, useState, useCallback, useEffect, useMemo } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import QueueRenderSongs from "./QueueRenderSongs";
import { PlainText } from "../Global/PlainText";
import { SmallText } from "../Global/SmallText";
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, ToastAndroid } from "react-native";
import { TouchableOpacity as Pressable } from "react-native";
import { Minus, ListPlus, ListX, Shuffle, Sparkles } from 'lucide-react-native';
import Svg, { Circle } from "react-native-svg";
import { useThemeContext } from "../../Context/ThemeContext";
import TrackPlayer from 'react-native-track-player';
import { shuffleQueuePreservingCurrent } from '../../Utils/SmartShuffleUtils';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QueueBottomSheet = ({ index, onChange, enablePanDownToClose = true }) => {
  const { theme, themeMode } = useThemeContext();
  const bottomSheetRef = useRef(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [isSmartShuffleActive, setIsSmartShuffleActive] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

  // Memoize snap points
  const snapPoints = useMemo(() => [40, '20%', '80%'], []);

  // Theme-aware colors
  const getBackgroundColor = () => {
    return themeMode === 'light'
      ? 'rgba(244, 245, 252, 0.95)' // Light theme background
      : 'rgba(10, 10, 10, 0.95)'; // Dark theme background
  };

  const getTextColor = () => {
    return theme.colors.text;
  };

  const getShadowColor = () => {
    return themeMode === 'light' ? "#000" : "#000";
  };

  // Handle smart shuffle
  const handleSmartShuffle = useCallback(async () => {
    if (isShuffling) return;

    try {
      setIsShuffling(true);

      // Get current queue and track
      const currentTrackIndex = await TrackPlayer.getCurrentTrack();
      const queue = await TrackPlayer.getQueue();

      if (!queue || queue.length <= 1) {
        ToastAndroid.show('Not enough songs to shuffle', ToastAndroid.SHORT);
        setIsShuffling(false);
        return;
      }

      // Toggle smart shuffle mode
      const newMode = !isSmartShuffleActive;
      setIsSmartShuffleActive(newMode);

      // Shuffle the queue while preserving current track
      const shuffledQueue = await shuffleQueuePreservingCurrent(
        queue,
        currentTrackIndex,
        newMode // Use smart shuffle if activating, standard if deactivating
      );

      // Remove all tracks
      const indicesToRemove = queue.map((_, index) => index);
      await TrackPlayer.remove(indicesToRemove);

      // Add shuffled tracks
      await TrackPlayer.add(shuffledQueue);

      // Skip to the preserved current track (should be at same index)
      if (currentTrackIndex !== null && currentTrackIndex < shuffledQueue.length) {
        await TrackPlayer.skip(currentTrackIndex);
      }

      ToastAndroid.show(
        newMode ? '✨ Smart Shuffle Active' : 'Standard Shuffle',
        ToastAndroid.SHORT
      );
    } catch (error) {
      console.error('Error shuffling queue:', error);
      ToastAndroid.show('Failed to shuffle queue', ToastAndroid.SHORT);
    } finally {
      setIsShuffling(false);
    }
  }, [isSmartShuffleActive, isShuffling]);

  return (
    <BottomSheet
      index={index}
      onChange={onChange}
      enablePanDownToClose={enablePanDownToClose}
      animateOnMount={true}
      snapPoints={snapPoints}
      ref={bottomSheetRef}
      style={{
        backgroundColor: getBackgroundColor(),
        shadowColor: getShadowColor(),
        shadowOffset: {
          width: 0,
          height: -3,
        },
        shadowOpacity: 0.27,
        shadowRadius: 4.65,
        elevation: 6,
      }}
      enableContentPanningGesture={false}
      enableHandlePanningGesture={true}
      backgroundStyle={{
        backgroundColor: "transparent",
      }}
      handleStyle={{
        backgroundColor: getBackgroundColor(),
        paddingVertical: 10,
        borderTopLeftRadius: 15,
        borderTopRightRadius: 15,
      }}
      handleComponent={() => (
        <View style={[styles.handleContainer, { backgroundColor: getBackgroundColor() }]}>
          <View style={styles.minusIconContainer}>
            <Minus size={24} color={getTextColor()} />
          </View>
          <View style={styles.headerRow}>
            <View style={styles.headerLeft}>
              <Pressable
                onPress={handleSmartShuffle}
                disabled={isShuffling}
                style={[
                  styles.actionButton,
                  isSmartShuffleActive && styles.smartShuffleActive
                ]}
              >
                {isShuffling ? (
                  <ActivityIndicator size="small" color={isSmartShuffleActive ? '#FFD700' : getTextColor()} />
                ) : (
                  <Shuffle
                    size={20}
                    color={isSmartShuffleActive ? '#FFD700' : getTextColor()}
                    fill={isSmartShuffleActive ? '#FFD700' : 'transparent'}
                    strokeWidth={isSmartShuffleActive ? 2.5 : 2}
                  />
                )}
              </Pressable>
            </View>
            <View style={styles.headerCenter}>
              <PlainText
                text={"Queue"}
                style={[styles.headerText, { color: getTextColor() }]}
              />
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={() => setReorderMode(!reorderMode)}
                style={styles.actionButton}
              >
                {reorderMode ? (
                  <ListX size={20} color={getTextColor()} />
                ) : (
                  <ListPlus size={20} color={getTextColor()} />
                )}
              </Pressable>
            </View>
          </View>
          <SmallText
            text={
              isShuffling
                ? "Shuffling queue..."
                : reorderMode
                  ? "Drag songs to reorder"
                  : isSmartShuffleActive
                    ? "✨ Smart Shuffle Active"
                    : "Swipe left to delete"
            }
            style={[
              styles.subHeaderText,
              {
                color: isSmartShuffleActive ? '#FFD700' : getTextColor(),
                fontWeight: isSmartShuffleActive ? '600' : '500'
              }
            ]}
          />
        </View>
      )}
    >
      <QueueRenderSongs reorderMode={reorderMode} />
    </BottomSheet>
  );
};

// Circular Progress Component
const CircularProgress = ({ progress = 0, size = 40, thickness = 4 }) => {
  const { theme, themeMode } = useThemeContext();
  const circumference = 2 * Math.PI * ((size - thickness) / 2);
  const strokeDashoffset = circumference * (1 - progress / 100);

  const getProgressColor = () => {
    return theme.colors.playingColor || theme.colors.primary;
  };

  const getBackgroundBorderColor = () => {
    return themeMode === 'light'
      ? 'rgba(0, 0, 0, 0.2)'
      : 'rgba(255, 255, 255, 0.2)';
  };

  const getTextColor = () => {
    return theme.colors.text;
  };

  return (
    <View style={{
      width: size,
      height: size,
      position: 'relative',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <View style={{
        width: size,
        height: size,
        borderRadius: size / 2,
        borderWidth: thickness,
        borderColor: getBackgroundBorderColor(),
        position: 'absolute',
      }} />
      <Svg
        width={size}
        height={size}
        style={{
          position: 'absolute',
          transform: [{ rotate: '-90deg' }],
        }}
      >
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={(size - thickness) / 2}
          strokeWidth={thickness}
          stroke={getProgressColor()}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={{
        color: getTextColor(),
        fontSize: size * 0.3,
        fontWeight: 'bold',
      }}>{Math.round(progress)}%</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  handleContainer: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
    height: 90,
    width: SCREEN_WIDTH,
    paddingVertical: 5,
  },
  minusIconContainer: {
    marginBottom: 1, // Reduced from 2 to 1
    transform: [{ scaleY: 2.5 }, { scaleX: 1.2 }], // Increased Y scale for boldness, added X scale for width
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 16,
    marginBottom: 0,
  },
  headerLeft: {
    flex: 1,
    alignItems: 'flex-start',
  },
  headerCenter: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerRight: {
    flex: 1,
    alignItems: 'flex-end',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
  },
  smartShuffleActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  headerText: {
    fontWeight: 'bold',
    fontSize: 18,
    marginTop: -5, // Reduced from -3 to -5 to bring text closer to icon
    // Color will be applied dynamically via theme
  },
  reorderToggle: {
    padding: 4,
    borderRadius: 4,
    position: 'absolute',
    right: 20, // Position on the right side
  },
  subHeaderText: {
    fontSize: 12,
    marginTop: 0,
    fontWeight: '500',
    // Color will be applied dynamically via theme
  }
});

export default QueueBottomSheet;