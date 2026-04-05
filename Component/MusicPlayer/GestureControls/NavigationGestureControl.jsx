import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';
import { PlayNextSong, PlayPreviousSong } from '../../../MusicPlayerFunctions';

/**
 * Custom hook for navigation gesture control
 * Handles horizontal swipe gestures for song navigation (next/previous)
 */
export const useNavigationGestureControl = () => {
  /**
   * Creates a gesture handler for horizontal swipe navigation
   * @param {Object} gestureState - Shared values from parent gesture (isDragging, etc.)
   * @returns {Gesture} Pan gesture for navigation
   */
  const createNavigationGesture = useCallback((gestureState) => {
    return (
      Gesture.Pan()
        // Only activate when horizontal movement exceeds 15px
        .activeOffsetX([-15, 15])
        // Fail (and let parent handle) when vertical movement exceeds 10px
        .failOffsetY([-10, 10])
        .onFinalize((e) => {
          'worklet';
          // Only process gestures if we were actually dragging
          if (gestureState.isDragging && gestureState.isDragging.value) {
            // Enhanced horizontal swipe detection for next/previous song
            // More responsive criteria with better velocity and translation thresholds
            const horizontalDominance =
              Math.abs(e.velocityX) > Math.abs(e.velocityY) * 1.2;
            const significantHorizontalMovement = Math.abs(e.translationX) > 25;

            if (horizontalDominance || significantHorizontalMovement) {
              // Use both velocity and translation with weighted importance for better detection
              if (
                (e.velocityX > 120 && e.translationX > 20) ||
                e.velocityX > 200 ||
                e.translationX > 35
              ) {
                runOnJS(PlayPreviousSong)();
              } else if (
                (e.velocityX < -120 && e.translationX < -20) ||
                e.velocityX < -200 ||
                e.translationX < -35
              ) {
                runOnJS(PlayNextSong)();
              }
            }
          }
        })
    );
  }, []);

  /**
   * Standalone navigation gesture that doesn't depend on other gesture states
   * Used when navigation gesture needs to work independently
   * IMPORTANT: Uses activeOffsetX and failOffsetY to only activate on horizontal swipes,
   * allowing vertical gestures to propagate to parent (BottomSheet) for drag-to-close
   */
  const createStandaloneNavigationGesture = useCallback(() => {
    return (
      Gesture.Pan()
        // Only activate when horizontal movement exceeds 15px
        .activeOffsetX([-15, 15])
        // Fail (and let parent handle) when vertical movement exceeds 10px
        .failOffsetY([-10, 10])
        .onFinalize((e) => {
          'worklet';
          // Enhanced horizontal swipe detection for next/previous song
          const horizontalDominance =
            Math.abs(e.velocityX) > Math.abs(e.velocityY) * 1.2;
          const significantHorizontalMovement = Math.abs(e.translationX) > 25;

          if (horizontalDominance || significantHorizontalMovement) {
            // Use both velocity and translation with weighted importance for better detection
            if (
              (e.velocityX > 120 && e.translationX > 20) ||
              e.velocityX > 200 ||
              e.translationX > 35
            ) {
              runOnJS(PlayPreviousSong)();
            } else if (
              (e.velocityX < -120 && e.translationX < -20) ||
              e.velocityX < -200 ||
              e.translationX < -35
            ) {
              runOnJS(PlayNextSong)();
            }
          }
        })
    );
  }, []);

  /**
   * Utility function to check if a gesture event represents a horizontal swipe
   * @param {Object} gestureEvent - The gesture event object
   * @returns {Object} Analysis of the swipe direction and strength
   */
  const analyzeSwipeGesture = useCallback((gestureEvent) => {
    const horizontalDominance =
      Math.abs(gestureEvent.velocityX) > Math.abs(gestureEvent.velocityY) * 1.2;
    const significantHorizontalMovement =
      Math.abs(gestureEvent.translationX) > 25;

    const isHorizontalSwipe =
      horizontalDominance || significantHorizontalMovement;

    let direction = null;
    let strength = 0;

    if (isHorizontalSwipe) {
      if (
        (gestureEvent.velocityX > 120 && gestureEvent.translationX > 20) ||
        gestureEvent.velocityX > 200 ||
        gestureEvent.translationX > 35
      ) {
        direction = 'previous';
        strength = Math.max(
          Math.abs(gestureEvent.velocityX) / 200,
          Math.abs(gestureEvent.translationX) / 35
        );
      } else if (
        (gestureEvent.velocityX < -120 && gestureEvent.translationX < -20) ||
        gestureEvent.velocityX < -200 ||
        gestureEvent.translationX < -35
      ) {
        direction = 'next';
        strength = Math.max(
          Math.abs(gestureEvent.velocityX) / 200,
          Math.abs(gestureEvent.translationX) / 35
        );
      }
    }

    return {
      isHorizontalSwipe,
      direction,
      strength: Math.min(strength, 1), // Cap at 1.0
    };
  }, []);

  /**
   * Execute navigation based on swipe analysis
   * @param {Object} swipeAnalysis - Result from analyzeSwipeGesture
   */
  const executeNavigation = useCallback((swipeAnalysis) => {
    if (swipeAnalysis.isHorizontalSwipe && swipeAnalysis.direction) {
      if (swipeAnalysis.direction === 'previous') {
        PlayPreviousSong();
      } else if (swipeAnalysis.direction === 'next') {
        PlayNextSong();
      }
    }
  }, []);

  return {
    createNavigationGesture,
    createStandaloneNavigationGesture,
    analyzeSwipeGesture,
    executeNavigation,
  };
};
