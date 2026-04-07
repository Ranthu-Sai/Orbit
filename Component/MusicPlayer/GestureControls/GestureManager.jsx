import React from 'react';
import { View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';

// Import gesture control hooks
import { useNavigationGestureControl } from './NavigationGestureControl';
import { useTapToCloseGestureControl } from './TapToCloseGestureControl';

/**
 * GestureManager Component
 * Combines navigation and tap gesture controls
 */
export const GestureManager = ({ children, onClose, style }) => {
  // Initialize gesture control hooks
  const navigationControl = useNavigationGestureControl();
  const tapControl = useTapToCloseGestureControl(onClose);

  // Create navigation gesture
  const navigationGesture =
    navigationControl.createStandaloneNavigationGesture();

  // Create tap gesture
  const tapGesture = tapControl.createStandaloneTapGesture();

  // Combine gestures with navigation taking priority, then tap
  const combinedGestures = Gesture.Exclusive(navigationGesture, tapGesture);

  return (
    <GestureDetector gesture={combinedGestures}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
};

/**
 * Simplified GestureManager for cases where only specific gestures are needed
 */
export const SimpleGestureManager = ({
  children,
  onClose,
  style,
  enableNavigation = true,
  enableTapToClose = true,
}) => {
  const navigationControl = useNavigationGestureControl();
  const tapControl = useTapToCloseGestureControl(onClose);

  // Build gesture array based on enabled features
  const gestures = [];

  if (enableNavigation && navigationControl) {
    gestures.push(navigationControl.createStandaloneNavigationGesture());
  }

  if (enableTapToClose && tapControl) {
    gestures.push(tapControl.createStandaloneTapGesture());
  }

  // Combine gestures
  const combinedGestures =
    gestures.length > 1
      ? Gesture.Exclusive(...gestures)
      : gestures[0] || Gesture.Tap(); // Fallback to empty tap if no gestures

  return (
    <GestureDetector gesture={combinedGestures}>
      <View style={style}>{children}</View>
    </GestureDetector>
  );
};

// VolumeOnlyGestureManager has been removed as volume gestures are no longer supported
