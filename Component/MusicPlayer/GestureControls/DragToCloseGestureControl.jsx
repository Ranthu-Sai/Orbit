import { useCallback } from 'react';
import { Gesture } from 'react-native-gesture-handler';
import { runOnJS, useSharedValue } from 'react-native-reanimated';

/**
 * Custom hook for drag-to-close gesture control
 * Handles vertical drag gestures to close the fullscreen player
 */
export const useDragToCloseGestureControl = (onClose) => {
    // Shared values must be created at the top level of the hook, not inside callbacks
    const startY = useSharedValue(0);
    const customStartY = useSharedValue(0);

    /**
     * Creates a drag-to-close gesture handler
     * Only triggers on vertical downward drag to close the player
     * @returns {Gesture} Pan gesture for closing player
     */
    const createDragToCloseGesture = useCallback(() => {
        return Gesture.Pan()
            // Only activate when vertical movement exceeds 10px
            .activeOffsetY([10, 1000])
            // Fail when horizontal movement exceeds 15px (let horizontal swipe handle it)
            .failOffsetX([-15, 15])
            .onBegin((e) => {
                'worklet';
                startY.value = e.absoluteY;
            })
            .onFinalize((e) => {
                'worklet';
                // Only close if dragging downward with significant movement
                const verticalDominance = Math.abs(e.velocityY) > Math.abs(e.velocityX) * 1.5;
                const significantDownwardMovement = e.translationY > 50;
                const fastDownwardSwipe = e.velocityY > 500;

                // Trigger close on either fast swipe or significant drag
                if (verticalDominance && (significantDownwardMovement || fastDownwardSwipe)) {
                    runOnJS(onClose)();
                }
            });
    }, [onClose, startY]);

    /**
     * Creates a drag-to-close gesture with custom threshold
     * @param {number} threshold - Minimum Y translation to trigger close (default: 50)
     * @param {number} velocityThreshold - Minimum Y velocity to trigger close (default: 500)
     * @returns {Gesture} Pan gesture with custom thresholds
     */
    const createCustomDragToCloseGesture = useCallback((threshold = 50, velocityThreshold = 500) => {
        return Gesture.Pan()
            .activeOffsetY([10, 1000])
            .failOffsetX([-15, 15])
            .onBegin((e) => {
                'worklet';
                customStartY.value = e.absoluteY;
            })
            .onFinalize((e) => {
                'worklet';
                const verticalDominance = Math.abs(e.velocityY) > Math.abs(e.velocityX) * 1.5;
                const significantDownwardMovement = e.translationY > threshold;
                const fastDownwardSwipe = e.velocityY > velocityThreshold;

                if (verticalDominance && (significantDownwardMovement || fastDownwardSwipe)) {
                    runOnJS(onClose)();
                }
            });
    }, [onClose, customStartY]);

    /**
     * Analyzes if a gesture event represents a valid drag-to-close action
     * @param {Object} gestureEvent - The gesture event object
     * @returns {Object} Analysis of the drag gesture
     */
    const analyzeDragGesture = useCallback((gestureEvent) => {
        const verticalDominance = Math.abs(gestureEvent.velocityY) > Math.abs(gestureEvent.velocityX) * 1.5;
        const significantDownwardMovement = gestureEvent.translationY > 50;
        const fastDownwardSwipe = gestureEvent.velocityY > 500;

        const isValidDragToClose = verticalDominance && (significantDownwardMovement || fastDownwardSwipe);

        return {
            isVerticalDrag: verticalDominance,
            isDragDown: gestureEvent.translationY > 0,
            isSignificantMovement: significantDownwardMovement,
            isFastSwipe: fastDownwardSwipe,
            shouldClose: isValidDragToClose,
            dragDistance: gestureEvent.translationY,
            dragVelocity: gestureEvent.velocityY
        };
    }, []);

    return {
        createDragToCloseGesture,
        createCustomDragToCloseGesture,
        analyzeDragGesture
    };
};
