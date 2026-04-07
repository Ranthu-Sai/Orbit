import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  TextInput,
  Pressable,
  Dimensions,
  StyleSheet,
} from 'react-native';
import { useTheme } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import Entypo from 'react-native-vector-icons/Entypo';
import Animated, {
  useAnimatedStyle,
  withTiming,
  withSpring,
  FadeIn,
} from 'react-native-reanimated';

export const AnimatedSearchBar = ({
  onChange,
  navigation,
  placeholder = 'Type to search...',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [searchText, setSearchText] = useState('');
  const inputRef = useRef(null);
  const width = Dimensions.get('window').width;
  const theme = useTheme();

  // Animation values
  const containerWidth = useAnimatedStyle(() => {
    return {
      width: isExpanded
        ? withTiming(width * 0.65, { duration: 300 })
        : withTiming(40, { duration: 300 }),
      backgroundColor: isExpanded
        ? withTiming('rgba(30, 30, 30, 0.8)', { duration: 300 })
        : withTiming('rgba(0, 0, 0, 0)', { duration: 300 }),
    };
  });

  // Focus input when expanded
  useEffect(() => {
    if (isExpanded && inputRef.current) {
      setTimeout(() => {
        inputRef.current.focus();
      }, 100);
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
        }, 300); // 300ms delay
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
      onChange(''); // Call immediately for clear
    }
    if (navigation && navigation.canGoBack()) {
      navigation.goBack();
    }
  };

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.searchContainer, containerWidth]}>
        {isExpanded ? (
          <Animated.View
            entering={FadeIn.duration(200)}
            style={styles.inputContainer}
          >
            <TextInput
              ref={inputRef}
              value={searchText}
              onChangeText={handleTextChange}
              placeholder={placeholder}
              placeholderTextColor="rgba(255, 255, 255, 0.5)"
              style={styles.input}
              cursorColor="rgb(255, 255, 255)"
              autoCapitalize="none"
            />
          </Animated.View>
        ) : null}

        {!isExpanded ? (
          <Pressable onPress={handleSearchPress} style={styles.iconButton}>
            <Feather
              name="search"
              size={width * 0.055}
              color={theme.colors.text}
            />
          </Pressable>
        ) : (
          <Pressable onPress={handleClosePress} style={styles.closeButton}>
            <Entypo
              name="cross"
              size={width * 0.045}
              color={theme.colors.text}
            />
          </Pressable>
        )}
      </Animated.View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    height: 50,
    paddingHorizontal: 10,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  inputContainer: {
    flex: 1,
    paddingLeft: 15,
  },
  input: {
    flex: 1,
    color: 'white',
    fontSize: 16,
    fontFamily: 'roboto',
    padding: 0,
  },
  iconButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
