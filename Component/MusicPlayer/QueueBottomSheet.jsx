import React, { useRef, useState, useCallback, useEffect } from "react";
import BottomSheet from "@gorhom/bottom-sheet";
import QueueRenderSongs from "./QueueRenderSongs";
import { PlainText } from "../Global/PlainText";
import { SmallText } from "../Global/SmallText";
import { View, StyleSheet, Dimensions, Text, ActivityIndicator, ToastAndroid } from "react-native";
import { TouchableOpacity as Pressable } from "react-native";
import { Minus, ListPlus, ListX, Shuffle } from 'lucide-react-native';
import Svg, { Circle } from "react-native-svg";
import { useThemeContext } from "../../Context/ThemeContext";
import TrackPlayer from 'react-native-track-player';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const QueueBottomSheet = ({ index, onChange, enablePanDownToClose = true }) => {
  const { theme, themeMode } = useThemeContext();
  const bottomSheetRef = useRef(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [isShuffling, setIsShuffling] = useState(false);

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

  return (
    <BottomSheet
      index={index}
      onChange={onChange}
      enablePanDownToClose={enablePanDownToClose}
      animateOnMount={true}
      snapPoints={[40, '20%', '60%']}
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
              <PlainText
                text={"Queue"}
                style={[styles.headerText, { color: getTextColor() }]}
              />
            </View>
            <View style={styles.headerRight}>
              <Pressable
                onPress={async () => {
                  try {
                    setIsShuffling(true);
                    
                    // Get current playback state
                    const currentState = await TrackPlayer.getState();
                    const isPlaying = currentState === TrackPlayer.STATE_PLAYING;
                    const currentPosition = await TrackPlayer.getPosition();
                    const currentTrack = await TrackPlayer.getTrack(await TrackPlayer.getCurrentTrack());
                    
                    if (!currentTrack) {
                      ToastAndroid.show('No track is currently playing', ToastAndroid.SHORT);
                      return;
                    }
                    
                    // Get current queue
                    const queue = await TrackPlayer.getQueue();
                    
                    if (queue.length <= 1) {
                      ToastAndroid.show('Not enough songs to shuffle', ToastAndroid.SHORT);
                      return;
                    }
                    
                    // Create a new queue with the current track first, followed by shuffled tracks
                    const remainingTracks = queue.filter(track => track.id !== currentTrack.id);
                    
                    // Fisher-Yates shuffle algorithm
                    for (let i = remainingTracks.length - 1; i > 0; i--) {
                      const j = Math.floor(Math.random() * (i + 1));
                      [remainingTracks[i], remainingTracks[j]] = [remainingTracks[j], remainingTracks[i]];
                    }
                    
                    // Create new queue with current track first, then shuffled tracks
                    const newQueue = [currentTrack, ...remainingTracks];
                    
                    // Temporarily pause playback if it's playing
                    if (isPlaying) {
                      await TrackPlayer.pause();
                    }
                    
                    try {
                      // Get the current track's ID and position
                      const currentTrackId = currentTrack.id;
                      
                      // Update the queue
                      await TrackPlayer.reset();
                      await TrackPlayer.add(newQueue);
                      
                      // Find the new index of the current track in the shuffled queue
                      const newIndex = newQueue.findIndex(track => track.id === currentTrackId);
                      
                      if (newIndex >= 0) {
                        // Skip to the current track in the new queue
                        await TrackPlayer.skip(newIndex);
                        // Restore the exact position
                        await TrackPlayer.seekTo(currentPosition);
                        
                        // Restore playback state without any delay
                        if (isPlaying) {
                          // Use a small delay to ensure the track is ready
                          setTimeout(async () => {
                            await TrackPlayer.play();
                          }, 50);
                        }
                      }
                      
                      ToastAndroid.show('Queue shuffled', ToastAndroid.SHORT);
                    } catch (error) {
                      console.error('Error updating queue:', error);
                      ToastAndroid.show('Error updating queue', ToastAndroid.SHORT);
                      // If there was an error, try to restore playback
                      if (isPlaying) {
                        await TrackPlayer.play().catch(console.error);
                      }
                    }
                  } catch (error) {
                    console.error('Error in shuffle operation:', error);
                    ToastAndroid.show('Failed to shuffle queue', ToastAndroid.SHORT);
                  } finally {
                    setIsShuffling(false);
                  }
                }}
                style={[styles.actionButton, { marginRight: 10 }]}
                disabled={isShuffling}
              >
                {isShuffling ? (
                  <ActivityIndicator size={20} color={getTextColor()} />
                ) : (
                  <Shuffle size={20} color={getTextColor()} />
                )}
              </Pressable>
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
            text={reorderMode ? "Drag songs to reorder" : "Swipe left to delete"}
            style={[styles.subHeaderText, { color: getTextColor() }]}
          />
        </View>
      )}
    >
      <QueueRenderSongs reorderMode={reorderMode}/>
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
    marginBottom: 4,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    padding: 8,
    borderRadius: 20,
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
    marginTop: 4,
    fontWeight: '500',
    // Color will be applied dynamically via theme
  }
});

export default QueueBottomSheet;