import React, { useState, useEffect } from "react";
import { Dimensions, View, StyleSheet } from "react-native";
import Slider from '@react-native-community/slider';
import { Text, useTheme } from "react-native-paper";
import { useProgress, useActiveTrack, usePlaybackState } from "react-native-track-player";
import { SetProgressSong } from "../../MusicPlayerFunctions";
import TrackPlayer from 'react-native-track-player';

const ProgressBar = () => {
  const theme = useTheme();
  const { position, duration } = useProgress();
  const currentTrack = useActiveTrack();
  const [isSliding, setIsSliding] = useState(false);
  const [sliderValue, setSliderValue] = useState(0);
  const [wasPlaying, setWasPlaying] = useState(false);
  const playbackState = usePlaybackState();
  
  const screenWidth = Dimensions.get('window').width;
  const horizontalPadding = 14; // Reduced from 16 to make slider wider
  const sliderWidth = screenWidth - (horizontalPadding * 2); // Full width minus padding

  // Update slider value when not sliding
  useEffect(() => {
    if (!isSliding && position !== undefined) {
      setSliderValue(position);
    }
  }, [position, isSliding]);

  // Reset slider when track changes
  useEffect(() => {
    setSliderValue(0);
    setIsSliding(false);
  }, [currentTrack?.id]);

  const formatTime = (val) => {
    if (isNaN(val) || val < 0) return "0:00"; // Handle NaN and negative values
    // Round to nearest second for more accurate display
    const time = Math.round(parseFloat(val));
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes}:${seconds < 10 ? "0" : ""}${seconds}`; // Format time as mm:ss
  };

  // Get accurate duration - prefer track metadata over useProgress
  const getAccurateDuration = () => {
    // Try to get duration from track metadata first
    if (currentTrack?.duration && currentTrack.duration > 0) {
      return currentTrack.duration;
    }
    // Fallback to useProgress duration
    return duration || 0;
  };

  const accurateDuration = getAccurateDuration();

  // Debug logging for duration inconsistencies (only in development)
  useEffect(() => {
    if (currentTrack && duration && currentTrack.duration) {
      const trackDuration = currentTrack.duration;
      const progressDuration = duration;
      const difference = Math.abs(trackDuration - progressDuration);

      // Log if there's a significant difference (more than 5 seconds)
      if (difference > 5) {
        console.log('Duration inconsistency detected:', {
          track: currentTrack.title,
          trackMetadataDuration: formatTime(trackDuration),
          useProgressDuration: formatTime(progressDuration),
          difference: formatTime(difference)
        });
      }
    }
  }, [currentTrack?.id, duration, currentTrack?.duration]);

  return (
    <View style={styles.container}>
      <View style={[styles.sliderContainer, { width: sliderWidth }]}>
        {/* Slider */}
        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={Math.max(accurateDuration, 1)}
            value={isSliding ? sliderValue : Math.min(Math.max(position || 0, 0), accurateDuration)}
            onValueChange={(value) => {
              setIsSliding(true);
              setSliderValue(value);
            }}
            onSlidingStart={() => {
              setWasPlaying(playbackState === TrackPlayer.STATE_PLAYING);
              setIsSliding(true);
            }}
            onSlidingComplete={async (value) => {
              try {
                // Update the slider value immediately for better UX
                setSliderValue(value);
                
                // Seek to the new position
                await TrackPlayer.seekTo(value);
                
                // If it was playing before seeking, ensure it continues playing
                if (wasPlaying) {
                  await TrackPlayer.play();
                }
                
                // Update the state after a small delay to ensure smooth transition
                setTimeout(() => {
                  setIsSliding(false);
                }, 100);
              } catch (error) {
                console.error('Error during seek:', error);
                setIsSliding(false);
              }
            }}
            minimumTrackTintColor="white"
            maximumTrackTintColor="rgba(255, 255, 255, 0.3)"
            thumbTintColor="white"
          />
        </View>
        
        {/* Time Stamps */}
        <View style={styles.timeContainer}>
          <View style={styles.timeTextWrapper}>
            <Text variant="bodySmall" style={[styles.timeText, { color: theme.dark ? theme.colors.onSurface : 'white' }]}>
              {formatTime(isSliding ? sliderValue : Math.max(position || 0, 0))}
            </Text>
          </View>
          <View style={styles.timeTextWrapper}>
            <Text variant="bodySmall" style={[styles.timeText, { color: theme.dark ? theme.colors.onSurface : 'white' }]}>
              {formatTime(accurateDuration)}
            </Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    paddingHorizontal: 12,
    marginVertical: 8,
    alignItems: 'center',
  },
  sliderContainer: {
    width: '100%',
  },
  timeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginTop: 4,
  },
  timeTextWrapper: {
    width: 45, // Reduced from 60 for better spacing
    alignItems: 'center',
    marginHorizontal: 6, // Reduced from 12 for better spacing
  },
  slider: {
    width: '100%',
    height: 40,
  },
  sliderWrapper: {
    width: '100%',
  },
  timeText: {
    fontSize: 16,  // Increased from 14 to 16
    opacity: 1,  // More visible
    fontWeight: '600',  // Bolder
    letterSpacing: 0.2,  // Slightly more spacing between letters
  },
});

export default ProgressBar;
