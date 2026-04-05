import React from 'react';
import { View, Text, Alert } from 'react-native';
import { GestureManager, SimpleGestureManager } from './index';

/**
 * Test component to verify gesture controls work correctly
 * This can be used for testing the gesture functionality
 */
export const GestureTest = () => {
  const handleClose = () => {
    Alert.alert('Gesture Test', 'Tap-to-close gesture triggered!');
  };

  return (
    <View
      style={{
        flex: 1,
        backgroundColor: '#000',
        justifyContent: 'center',
        alignItems: 'center',
      }}
    >
      <Text style={{ color: 'white', fontSize: 18, marginBottom: 20 }}>
        Gesture Controls Test
      </Text>

      {/* Test full GestureManager */}
      <GestureManager
        onClose={handleClose}
        style={{
          width: 200,
          height: 200,
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Full Gesture Manager{'\n'}• Horizontal swipe: Navigation{'\n'}• Tap:
          Close
        </Text>
      </GestureManager>

      {/* Test SimpleGestureManager with navigation only */}
      <SimpleGestureManager
        onClose={handleClose}
        enableNavigation={true}
        enableTapToClose={true}
        style={{
          width: 200,
          height: 100,
          backgroundColor: 'rgba(0,255,0,0.1)',
          borderRadius: 10,
          justifyContent: 'center',
          alignItems: 'center',
          marginBottom: 20,
        }}
      >
        <Text style={{ color: 'white', textAlign: 'center' }}>
          Navigation + Tap Only{'\n'}• Horizontal swipe: Navigation{'\n'}• Tap:
          Close
        </Text>
      </SimpleGestureManager>
    </View>
  );
};

/**
 * Instructions for testing:
 *
 * 1. Navigation Test:
 *    - Swipe horizontally left/right on the gesture area
 *    - Should trigger next/previous song functions
 *
 * 2. Tap-to-Close Test:
 *    - Tap on gesture areas that support it
 *    - Should show alert dialog
 *
 * 3. Integration Test:
 *    - Test combinations of gestures
 *    - Ensure gestures don't interfere with each other
 */
