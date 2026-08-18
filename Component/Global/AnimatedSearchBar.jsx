import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import { GlassBox } from './GlassBox';

const circleGradient = {
  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
  stops: [
    { offset: '0%', opacity: 0.0 },
    { offset: '40%', opacity: 0.5 },
    { offset: '60%', opacity: 0.5 },
    { offset: '100%', opacity: 0.0 },
  ],
};

const CircularGlassBox = ({ id, size = 42, children, style }) => (
  <GlassBox
    id={id}
    gradientConfig={circleGradient}
    style={[
      {
        width: size,
        height: size,
        borderRadius: size / 2,
        alignItems: 'center',
        justifyContent: 'center',
      },
      style,
    ]}
  >
    {children}
  </GlassBox>
);

export const AnimatedSearchBar = ({
  onChange,
  navigation,
  placeholder = 'Search songs...',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef(null);
  const theme = useTheme();

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 150);
    }
  }, [isExpanded]);

  // Debounced search function
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (text) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          if (onChange) {
            onChange(text);
          }
        }, 300);
      };
    })(),
    [onChange]
  );

  // Handle text change
  const handleTextChange = (text) => {
    setSearchText(text);
    debouncedSearch(text);
  };

  // Handle search icon press
  const handleSearchPress = () => {
    setIsExpanded(true);
  };

  // Handle clear/close press
  const handleClosePress = () => {
    setSearchText('');
    setIsExpanded(false);
    if (onChange) {
      onChange('');
    }
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  if (isExpanded) {
    // Expanded state: fill all available space with input + close button
    return (
      <Animated.View
        entering={FadeIn.duration(200)}
        style={styles.expandedContainer}
      >
        <View style={styles.expandedInputWrapper}>
          <Feather
            name="search"
            size={18}
            color="rgba(255, 255, 255, 0.5)"
            style={{ marginLeft: 12, marginRight: 8 }}
          />
          <TextInput
            ref={inputRef}
            value={searchText}
            onChangeText={handleTextChange}
            placeholder={placeholder}
            placeholderTextColor="rgba(255, 255, 255, 0.4)"
            style={styles.input}
            cursorColor="rgb(255, 255, 255)"
            autoCapitalize="none"
          />
        </View>
        <Pressable onPress={handleClosePress} style={styles.closeButton}>
          <Entypo
            name="cross"
            size={20}
            color={theme.colors.text}
          />
        </Pressable>
      </Animated.View>
    );
  }

  // Collapsed state: just the glass search icon
  return (
    <CircularGlassBox id="animated-search-glass" size={42}>
      <Pressable
        onPress={handleSearchPress}
        style={styles.iconButton}
      >
        <Feather
          name="search"
          size={22}
          color={theme.colors.text}
        />
      </Pressable>
    </CircularGlassBox>
  );
};

const styles = StyleSheet.create({
  expandedContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 12,
  },
  expandedInputWrapper: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.12)',
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 15,
    fontFamily: 'roboto',
    padding: 0,
    paddingRight: 12,
    height: 40,
  },
  iconButton: {
    width: 42,
    height: 42,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 21,
  },
  closeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
});
