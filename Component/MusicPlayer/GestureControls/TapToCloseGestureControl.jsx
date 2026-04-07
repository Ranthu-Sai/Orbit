import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS } from 'react-native-reanimated';

/**
 * Custom hook for tap-to-close gesture control
 * Handles tap gestures to close the fullscreen player
 */
export const useTapToCloseGestureControl = (onClose) => {
  /**
   * Creates a tap gesture handler for closing the player
   * @param {Object} gestureState - Shared values from parent gesture (isDragging, etc.)
   * @returns {Gesture} Tap gesture for closing player
   */
  const createTapToCloseGesture = useCallback(
    (gestureState) => {
      return Gesture.Tap().onEnd(() => {
        'worklet';
        // Only process if we're not in the middle of another gesture
        if (
          !gestureState.isDragging ||
          gestureState.isDragging.value === false
        ) {
          // Can't directly navigate from a worklet, so we need to use runOnJS
          runOnJS(onClose)();
        }
      });
    },
    [onClose]
  );

  /**
   * Creates a standalone tap gesture that doesn't depend on other gesture states
   * Used when tap gesture needs to work independently
   */
  const createStandaloneTapGesture = useCallback(() => {
    return Gesture.Tap().onEnd(() => {
      'worklet';
      runOnJS(onClose)();
    });
  }, [onClose]);

  /**
   * Creates a conditional tap gesture that only triggers under specific conditions
   * @param {Function} shouldTrigger - Function that returns boolean to determine if tap should trigger
   * @returns {Gesture} Conditional tap gesture
   */
  const createConditionalTapGesture = useCallback(
    (shouldTrigger) => {
      return Gesture.Tap().onEnd(() => {
        'worklet';
        if (shouldTrigger && runOnJS(shouldTrigger)()) {
          runOnJS(onClose)();
        }
      });
    },
    [onClose]
  );

  /**
   * Creates a tap gesture with custom validation logic
   * @param {Function} validator - Custom validation function that receives gesture event
   * @returns {Gesture} Validated tap gesture
   */
  const createValidatedTapGesture = useCallback(
    (validator) => {
      return Gesture.Tap().onEnd((event) => {
        'worklet';
        if (validator) {
          runOnJS(validator)(event, () => {
            runOnJS(onClose)();
          });
        } else {
          runOnJS(onClose)();
        }
      });
    },
    [onClose]
  );

  /**
   * Default validation function for tap gestures
   * Checks common conditions that should prevent tap-to-close
   * @param {Object} gestureState - Current gesture state
   * @returns {boolean} Whether tap should be allowed
   */
  const defaultTapValidation = useCallback((gestureState) => {
    // Don't allow tap if currently dragging
    if (gestureState.isDragging && gestureState.isDragging.value === true) {
      return false;
    }

    // Don't allow tap if any other gesture is in progress
    if (
      gestureState.isGestureInProgress &&
      gestureState.isGestureInProgress.value === true
    ) {
      return false;
    }

    return true;
  }, []);

  /**
   * Creates a tap gesture with debouncing to prevent accidental multiple taps
   * @param {number} debounceMs - Debounce time in milliseconds (default: 300)
   * @returns {Gesture} Debounced tap gesture
   */
  const createDebouncedTapGesture = useCallback(
    (debounceMs = 300) => {
      let lastTapTime = 0;

      return Gesture.Tap().onEnd(() => {
        'worklet';
        const currentTime = Date.now();
        if (currentTime - lastTapTime > debounceMs) {
          lastTapTime = currentTime;
          runOnJS(onClose)();
        }
      });
    },
    [onClose]
  );

  return {
    createTapToCloseGesture,
    createStandaloneTapGesture,
    createConditionalTapGesture,
    createValidatedTapGesture,
    createDebouncedTapGesture,
    defaultTapValidation,
  };
};
