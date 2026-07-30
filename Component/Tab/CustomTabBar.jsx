import React, { useContext, useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Vibration,
  Pressable,
  Keyboard,
} from 'react-native'; // Keep Vibration just in case user re-enables perm
import { Home, Compass, ListMusic } from 'lucide-react-native';
import Animated, {
  withSpring,
  useAnimatedStyle,
  withTiming,
  FadeIn,
} from 'react-native-reanimated';
import Context from '../../Context/Context';
import { useTheme } from '@react-navigation/native';
import { useActiveTrack } from 'react-native-track-player';
import { Text } from 'react-native-paper';

// Extracted TabItem component to safe-guard Hooks at top level
const TabItem = React.memo(
  ({ route, index, state, descriptors, navigation, colors, dark }) => {
    const { options } = descriptors[route.key];
    const label = options.tabBarLabel ?? options.title ?? route.name;
    const isFocused = state.index === index;

    // Hooks must be at the top level of the component
    const pillContainerStyle = useAnimatedStyle(() => {
      return {
        transform: [
          {
            scale: withSpring(isFocused ? 1 : 0.8, {
              damping: 15,
              stiffness: 200,
            }),
          },
        ],
        opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
      };
    });



    const labelStyle = useAnimatedStyle(() => {
      return {
        opacity: withTiming(isFocused ? 1 : 0.7, { duration: 200 }),
        transform: [
          { translateY: withSpring(isFocused ? 0 : 2, { damping: 15 }) },
        ],
      };
    });

    const onPress = () => {
      const event = navigation.emit({
        type: 'tabPress',
        target: route.key,
      });

      if (!isFocused && !event.defaultPrevented) {
        navigation.navigate(route.name);
      }
    };

    return (
      <Pressable onPress={onPress} style={styles.touchable}>
        <View style={styles.itemContent}>
          <Animated.View style={[styles.activeBackground, pillContainerStyle]}>
            {/* Inner background tint */}
            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.primary, opacity: 0.15, borderRadius: 27 }]} />
            {/* Glass effect border */}
            <GlassBox 
              id={`active-tab-${route.key}`}
              rectInset={0.5}
              borderOutside
              style={{ flex: 1, backgroundColor: 'transparent' }}
              gradientConfig={{
                x1: '0%', y1: '0%', x2: '0%', y2: '100%',
                stops: [
                  { offset: '0%', opacity: 0.5, color: colors.primary },
                  { offset: '50%', opacity: 0.25, color: colors.primary },
                  { offset: '100%', opacity: 0.5, color: colors.primary },
                ],
              }}
            />
          </Animated.View>
          
          <View style={styles.iconWrapper}>
            {GetIcon(label, isFocused, colors)}
          </View>

          <Animated.View style={labelStyle}>
            <Text
              style={[
                styles.label,
                {
                  color: isFocused ? colors.primary : colors.textSecondary,
                  fontWeight: isFocused ? '700' : '500',
                },
              ]}
              numberOfLines={1}
            >
              {label === 'Discover' ? 'Explore' : label}
            </Text>
          </Animated.View>
        </View>
      </Pressable>
    );
  }
);

function GetIcon(label, isFocused, colors) {
  const activeColor = colors.primary; // Use primary color for active state
  const inactiveColor = colors.textSecondary;
  const color = isFocused ? activeColor : inactiveColor;
  const size = 24;

  // Fill effect for active state if supported by icons, or just stroke width
  const strokeWidth = isFocused ? 2.5 : 2;

  if (label === 'Home') {
    return <Home color={color} size={size} strokeWidth={strokeWidth} />;
  } else if (label === 'Discover') {
    return <Compass color={color} size={size} strokeWidth={strokeWidth} />;
  } else if (label === 'Library') {
    return <ListMusic color={color} size={size} strokeWidth={strokeWidth} />;
  }
}

import { GlassBox } from '../Global/GlassBox';

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { setIndex, Index, musicPreviousScreen } = useContext(Context);
  const previousFullscreenState = useRef(false);
  const previousTabIndex = useRef(state.index);
  const { colors, dark } = useTheme();
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false);

  // Track keyboard visibility to hide tab bar when keyboard is open
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setIsKeyboardVisible(true)
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setIsKeyboardVisible(false)
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  // Track tab changes
  useEffect(() => {
    if (state.index !== previousTabIndex.current) {
      previousTabIndex.current = state.index;
    }
  }, [state.index]);

  // Fullscreen exit logic
  useEffect(() => {
    if (previousFullscreenState.current && Index === 0) {
      setTimeout(() => {
        if (musicPreviousScreen) {
          const parts = musicPreviousScreen.split('/');
          const tabName = parts[0];
          const currentState = navigation.getState();
          const isInCorrectTab =
            currentState?.routes?.[currentState.index]?.state?.index !==
              undefined &&
            currentState.routes[currentState.index].state.routes.some(
              (route) => route.name === tabName && route.state
            );

          if (!isInCorrectTab && tabName === 'Library') {
            navigation.navigate('Library');
          }
        }
      }, 200);
    }
    previousFullscreenState.current = Index === 1;
  }, [Index, navigation, musicPreviousScreen]);

  const activeTrack = useActiveTrack();
  const isPlayerActive = activeTrack != null;

  // Hide tab bar when in fullscreen mode OR when keyboard is visible
  if (Index === 1 || isKeyboardVisible) {
    return null;
  }

  return (
    <GlassBox
      id="bottom-tab"
      rectInset={0.5}
      borderOutside
      gradientConfig={{
        x1: '0%', y1: '0%', x2: '5%', y2: '172%',
        stops: [
          { offset: '0%', opacity: 0.4 },
          { offset: '38%', opacity: 0.4 },
          { offset: '45%', opacity: 0.0 },
          { offset: '55%', opacity: 0.0 },
          { offset: '62%', opacity: 0.5 },
          { offset: '100%', opacity: 0.5 },
        ],
      }}
      style={[
        styles.mainContainer,
        {
          backgroundColor: dark
            ? 'rgba(18, 18, 18, 0.85)'
            : 'rgba(255, 255, 255, 0.85)',
        },
      ]}
    >
      {state.routes.map((route, index) => (
        <TabItem
          key={route.key}
          route={route}
          index={index}
          state={state}
          descriptors={descriptors}
          navigation={navigation}
          colors={colors}
          dark={dark}
        />
      ))}
    </GlassBox>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: 'row',
    height: 70, 
    alignItems: 'center',
    position: 'absolute',
    bottom: 20,
    alignSelf: 'center',
    width: '90%',
    borderRadius: 35,
    elevation: 0,
  },
  touchable: {
    flex: 1,
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  itemContent: {
    alignItems: 'center',
    justifyContent: 'center',
    height: '100%',
    width: '100%',
  },
  iconWrapper: {
    width: 64, 
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: -2,
  },
  activeBackground: {
    position: 'absolute',
    width: '85%',
    height: 54,
    borderRadius: 27, // Half of 54 to make a perfect pill
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  },
});
