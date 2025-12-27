import React, { useState, useEffect, useRef } from 'react';
import { Modal, View, Text, StyleSheet, TextInput, Pressable } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlaySong, PauseSong } from '../../MusicPlayerFunctions';
import { useThemeContext } from '../../Context/ThemeContext'; // Added for theme support
import { usePlaybackState } from 'react-native-track-player';
import { IconButton } from 'react-native-paper';

// Global timer state to persist across component unmounts
let globalTimerRef = null;
let globalCountdownRef = null;
let globalEndTime = 0;
let globalPausedTime = 0; // Track paused duration
let isGlobalTimerActive = false;
let isGlobalTimerPaused = false;

const getStyles = (theme, themeMode) => StyleSheet.create({
  container: {
    alignItems: 'center',
    marginTop: 15,
  },
  button: {
    alignItems: 'center',
  },
  remainingTime: {
    color: themeMode === 'light' ? theme.colors.text : 'white',
    fontSize: 12,
    marginTop: 4,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: themeMode === 'light' ? 'rgba(0, 0, 0, 0.2)' : 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    backgroundColor: themeMode === 'light' ? theme.colors.card : '#282828',
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  modalTitle: {
    color: themeMode === 'light' ? theme.colors.text : 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  timerOption: {
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: themeMode === 'light' ? theme.colors.border : '#404040',
  },
  optionText: {
    color: themeMode === 'light' ? theme.colors.text : 'white',
    fontSize: 16,
    textAlign: 'center',
  },
  customTimerContainer: {
    marginTop: 15,
    borderTopWidth: 1,
    borderTopColor: themeMode === 'light' ? theme.colors.border : '#404040',
    paddingTop: 15,
  },
  customTimerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  customTimerInput: {
    flex: 1,
    backgroundColor: themeMode === 'light' ? theme.colors.searchBar : '#363636',
    color: themeMode === 'light' ? theme.colors.text : 'white',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    textAlign: 'center',
    marginRight: 10,
  },
  customTimerButton: {
    backgroundColor: '#1DB954', // Consider theming this if needed
    borderRadius: 8,
    marginTop: 5,
    borderBottomWidth: 0,
  },
  unitSelector: {
    flexDirection: 'row',
    backgroundColor: themeMode === 'light' ? theme.colors.searchBar : '#363636', // Updated this line
    borderRadius: 8,
    overflow: 'hidden',
  },
  unitButton: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  unitButtonActive: {
    backgroundColor: '#1DB954', // Consider theming this if needed
  },
  unitButtonText: {
    color: themeMode === 'light' ? theme.colors.placeholder : '#888',
    fontSize: 14,
    fontWeight: 'bold',
  },
  unitButtonTextActive: {
    color: themeMode === 'light' ? theme.colors.primary : 'white',
  },
  cancelButton: {
    marginTop: 20,
    paddingVertical: 15,
  },
  cancelText: {
    color: themeMode === 'light' ? theme.colors.notification : '#ff4444',
    fontSize: 16,
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export const SleepTimerButton = ({ size = 25, iconColor }) => {
  const { theme, themeMode } = useThemeContext(); // Added for theme support
  const styles = getStyles(theme, themeMode);
  const playerState = usePlaybackState(); // Track playback state
  const [isTimerActive, setIsTimerActive] = useState(isGlobalTimerActive);
  const [isTimerPaused, setIsTimerPaused] = useState(isGlobalTimerPaused);
  const [modalVisible, setModalVisible] = useState(false);
  const [customTime, setCustomTime] = useState('');
  const [timeUnit, setTimeUnit] = useState('minutes');
  const [remainingTime, setRemainingTime] = useState(
    isGlobalTimerActive ? Math.max(0, Math.floor((globalEndTime - Date.now() - globalPausedTime) / 1000)) : 0
  );
  const timerRef = useRef(globalTimerRef);
  const countdownRef = useRef(globalCountdownRef);
  const pauseStartTimeRef = useRef(null);

  const timerOptions = [
    { label: '15 minutes', value: 15 * 60 },
    { label: '30 minutes', value: 30 * 60 },
    { label: '45 minutes', value: 45 * 60 },
    { label: '1 hour', value: 60 * 60 },
  ];

  // Handle playback state changes for timer pause/resume
  useEffect(() => {
    if (!isTimerActive) return;

    console.log('Sleep Timer: Playback state changed to:', playerState.state, 'Timer paused:', isTimerPaused);

    if (playerState.state === 'playing') {
      // Resume timer if it was paused
      if (isTimerPaused) {
        console.log('Sleep Timer: Resuming timer');
        resumeTimer();
      }
    } else if (playerState.state === 'paused' || playerState.state === 'stopped') {
      // Pause timer when music is paused/stopped
      if (!isTimerPaused) {
        console.log('Sleep Timer: Pausing timer');
        pauseTimer();
      }
    }
  }, [playerState.state, isTimerActive, isTimerPaused]);

  // Sync with global timer state on mount
  useEffect(() => {
    if (isGlobalTimerActive) {
      const secondsRemaining = Math.max(0, Math.floor((globalEndTime - Date.now() - globalPausedTime) / 1000));
      setRemainingTime(secondsRemaining);
      setIsTimerPaused(isGlobalTimerPaused);
      if (!isGlobalTimerPaused) {
        setupCountdown(secondsRemaining);
      }
    }

    return () => {
      // Don't clear timers on unmount, just save references
      if (timerRef.current) {
        globalTimerRef = timerRef.current;
      }
      if (countdownRef.current) {
        globalCountdownRef = countdownRef.current;
      }
    };
  }, []);

  const pauseTimer = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
      globalCountdownRef = null;
    }
    pauseStartTimeRef.current = Date.now();
    setIsTimerPaused(true);
    isGlobalTimerPaused = true;
  };

  const resumeTimer = () => {
    console.log('Sleep Timer: resumeTimer called');
    if (pauseStartTimeRef.current) {
      const pauseDuration = Date.now() - pauseStartTimeRef.current;
      globalPausedTime += pauseDuration;
      globalEndTime += pauseDuration; // Extend end time by pause duration
      pauseStartTimeRef.current = null;
      console.log('Sleep Timer: Extended end time by', pauseDuration, 'ms');
    }

    const secondsRemaining = Math.max(0, Math.floor((globalEndTime - Date.now()) / 1000));
    console.log('Sleep Timer: Seconds remaining after resume:', secondsRemaining);

    if (secondsRemaining > 0) {
      setupCountdown();
      setRemainingTime(secondsRemaining);
    } else {
      // Timer expired while paused
      clearTimer();
    }

    setIsTimerPaused(false);
    isGlobalTimerPaused = false;
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
      globalTimerRef = null;
    }
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
      countdownRef.current = null;
      globalCountdownRef = null;
    }
    setIsTimerActive(false);
    setIsTimerPaused(false);
    isGlobalTimerActive = false;
    isGlobalTimerPaused = false;
    globalEndTime = 0;
    globalPausedTime = 0;
    setRemainingTime(0);
    pauseStartTimeRef.current = null;
  };

  const setupCountdown = () => {
    if (countdownRef.current) {
      clearInterval(countdownRef.current);
    }

    countdownRef.current = setInterval(() => {
      // Only count down if timer is not paused
      if (isGlobalTimerPaused) {
        return;
      }

      const secondsRemaining = Math.max(0, Math.floor((globalEndTime - Date.now()) / 1000));

      if (secondsRemaining <= 0) {
        clearInterval(countdownRef.current);
        countdownRef.current = null;
        globalCountdownRef = null;
        PauseSong(); // Pause playback when countdown reaches zero
        setIsTimerActive(false);
        setIsTimerPaused(false);
        isGlobalTimerActive = false;
        isGlobalTimerPaused = false;
        setRemainingTime(0);
        globalEndTime = 0;
        globalPausedTime = 0;
      } else {
        setRemainingTime(secondsRemaining);
      }
    }, 1000);

    globalCountdownRef = countdownRef.current;
  };

  const setSleepTimer = (seconds) => {
    clearTimer();
    PlaySong(); // Start playback when the timer is set

    const endTime = Date.now() + (seconds * 1000);
    globalEndTime = endTime;
    globalPausedTime = 0; // Reset paused time

    setupCountdown();
    setRemainingTime(seconds);

    timerRef.current = setTimeout(() => {
      PauseSong(); // Ensure playback stops after the specified duration
      clearTimer();
    }, seconds * 1000);

    globalTimerRef = timerRef.current;
    setIsTimerActive(true);
    setIsTimerPaused(false);
    isGlobalTimerActive = true;
    isGlobalTimerPaused = false;
    setModalVisible(false);
    setCustomTime('');
  };

  const handleCustomTimer = () => {
    const time = parseInt(customTime, 10);
    if (!isNaN(time) && time > 0) {
      const seconds = timeUnit === 'hours' ? time * 3600 : time * 60;
      setSleepTimer(seconds);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const resolvedIconColor = iconColor || (themeMode === 'light' ? theme.colors.text : theme.colors.icon);
  const resolvedLabelColor = iconColor ? iconColor : (themeMode === 'light' ? theme.colors.text : 'white');

  return (
    <>
      <IconButton
        icon={() => (
          <MaterialCommunityIcons
            name={isTimerActive ? (isTimerPaused ? "pause-circle-outline" : "timer-off") : "timer-outline"}
            size={size}
            color={isTimerActive ? theme.colors.primary : resolvedIconColor}
          />
        )}
        size={32}
        onPress={() => (isTimerActive ? clearTimer() : setModalVisible(true))}
        style={{ margin: 0, padding: 0 }}
        rippleColor="rgba(255, 255, 255, 0.2)"
      />

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Set Sleep Timer</Text>

            {timerOptions.map((option) => (
              <Pressable
                key={option.value}
                style={styles.timerOption}
                onPress={() => setSleepTimer(option.value)}
              >
                <Text style={styles.optionText}>{option.label}</Text>
              </Pressable>
            ))}

            <View style={styles.customTimerContainer}>
              <View style={styles.customTimerRow}>
                <TextInput
                  style={styles.customTimerInput}
                  placeholder={`Enter ${timeUnit}`}
                  placeholderTextColor="#888"
                  keyboardType="number-pad"
                  value={customTime}
                  onChangeText={setCustomTime}
                />
                <View style={styles.unitSelector}>
                  <Pressable
                    style={[
                      styles.unitButton,
                      timeUnit === 'minutes' && styles.unitButtonActive,
                    ]}
                    onPress={() => setTimeUnit('minutes')}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        timeUnit === 'minutes' && styles.unitButtonTextActive,
                      ]}
                    >
                      Min
                    </Text>
                  </Pressable>
                  <Pressable
                    style={[
                      styles.unitButton,
                      timeUnit === 'hours' && styles.unitButtonActive,
                    ]}
                    onPress={() => setTimeUnit('hours')}
                  >
                    <Text
                      style={[
                        styles.unitButtonText,
                        timeUnit === 'hours' && styles.unitButtonTextActive,
                      ]}
                    >
                      Hour
                    </Text>
                  </Pressable>
                </View>
              </View>
              <Pressable
                style={[styles.timerOption, styles.customTimerButton]}
                onPress={handleCustomTimer}
              >
                <Text style={styles.optionText}>Set Custom Timer</Text>
              </Pressable>
            </View>

            <Pressable
              style={styles.cancelButton}
              onPress={() => {
                setModalVisible(false);
                setCustomTime('');
              }}
            >
              <Text style={styles.cancelText}>Cancel</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </>
  );
};

export default SleepTimerButton;