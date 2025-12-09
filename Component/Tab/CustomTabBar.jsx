import React, { useContext, useEffect, useRef } from "react";
import { View, StyleSheet, Platform, Vibration, Pressable } from "react-native"; // Keep Vibration just in case user re-enables perm
import { Home, Compass, ListMusic } from "lucide-react-native";
import Animated, { withSpring, useAnimatedStyle, withTiming, FadeIn } from "react-native-reanimated";
import Context from "../../Context/Context";
import { useTheme } from "@react-navigation/native";
import { Text } from "react-native-paper";

// Extracted TabItem component to safe-guard Hooks at top level
const TabItem = React.memo(({ route, index, state, descriptors, navigation, colors, dark }) => {
  const { options } = descriptors[route.key];
  const label = options.tabBarLabel ?? options.title ?? route.name;
  const isFocused = state.index === index;

  // Hooks must be at the top level of the component
  const pillStyle = useAnimatedStyle(() => {
    const activeColor = dark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
    return {
      transform: [{ scale: withSpring(isFocused ? 1 : 0, { damping: 15, stiffness: 200 }) }],
      opacity: withTiming(isFocused ? 1 : 0, { duration: 200 }),
      backgroundColor: activeColor,
    };
  });

  const labelStyle = useAnimatedStyle(() => {
    return {
      opacity: withTiming(isFocused ? 1 : 0.7, { duration: 200 }),
      transform: [{ translateY: withSpring(isFocused ? 0 : 2, { damping: 15 }) }]
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
    <Pressable
      onPress={onPress}
      style={styles.touchable}
    >
      <View style={styles.itemContent}>
        <View style={styles.iconWrapper}>
          <Animated.View style={[styles.pill, pillStyle]} />
          {GetIcon(label, isFocused, colors)}
        </View>

        <Animated.View style={labelStyle}>
          <Text
            style={[
              styles.label,
              {
                color: isFocused ? colors.primary : colors.textSecondary,
                fontWeight: isFocused ? '700' : '500'
              }
            ]}
            numberOfLines={1}
          >
            {label === "Discover" ? "Explore" : label}
          </Text>
        </Animated.View>
      </View>
    </Pressable>
  );
});

function GetIcon(label, isFocused, colors) {
  const activeColor = colors.primary; // Use primary color for active state
  const inactiveColor = colors.textSecondary;
  const color = isFocused ? activeColor : inactiveColor;
  const size = 24;

  // Fill effect for active state if supported by icons, or just stroke width
  const strokeWidth = isFocused ? 2.5 : 2;

  if (label === "Home") {
    return <Home color={color} size={size} strokeWidth={strokeWidth} />
  } else if (label === "Discover") {
    return <Compass color={color} size={size} strokeWidth={strokeWidth} />
  } else if (label === "Library") {
    return <ListMusic color={color} size={size} strokeWidth={strokeWidth} />
  }
}

export default function CustomTabBar({ state, descriptors, navigation }) {
  const { setIndex, Index, musicPreviousScreen } = useContext(Context);
  const previousFullscreenState = useRef(false);
  const previousTabIndex = useRef(state.index);
  const { colors, dark } = useTheme();

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
          const isInCorrectTab = currentState?.routes?.[currentState.index]?.state?.index !== undefined &&
            currentState.routes[currentState.index].state.routes.some(
              route => route.name === tabName && route.state
            );

          if (!isInCorrectTab && tabName === 'Library') {
            navigation.navigate('Library');
          }
        }
      }, 200);
    }
    previousFullscreenState.current = (Index === 1);
  }, [Index, navigation, musicPreviousScreen]);

  if (Index === 1) return null;

  return (
    <View style={[styles.mainContainer, {
      backgroundColor: dark ? 'rgba(18, 18, 18, 0.85)' : 'rgba(255, 255, 255, 0.85)', // More transparent (reduced from 0.95)
      borderTopColor: dark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
    }]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flexDirection: 'row',
    height: 70, // Reduced from 80
    alignItems: "center",
    paddingBottom: 4, // Spacing for home bar
    borderTopWidth: 0, // Removed upper border
    position: 'absolute', // For transparency to work over content if needed, or just standard
    bottom: 0,
    left: 0,
    right: 0,
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
    paddingTop: 8,
  },
  iconWrapper: {
    width: 64, // Standard M3 pill width
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  pill: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 16, // Stadium shape
  },
  label: {
    fontSize: 12,
    letterSpacing: 0.2,
  }
});
