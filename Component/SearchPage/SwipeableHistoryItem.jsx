import React, { useRef, useState } from 'react';
import { View, StyleSheet, Animated, Pressable, Dimensions } from 'react-native';
import { Swipeable } from 'react-native-gesture-handler';
import { Trash2, Clock } from 'lucide-react-native';
import { useTheme } from '@react-navigation/native';
import { PlainText } from '../Global/PlainText';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const SwipeableHistoryItem = ({
  item,
  onPress,
  onDelete,
  onSwipeableOpen
}) => {
  const { colors, dark } = useTheme();
  const swipeableRef = useRef(null);
  const [isSwiped, setIsSwiped] = useState(false);

  // Handle delete action with haptic feedback
  const handleDelete = () => {
    swipeableRef.current?.close();
    // Add haptic feedback if available
    if (global.HapticFeedback) {
      global.HapticFeedback.impactHeavy();
    }
    onDelete();
  };

  // Handle swipe start/end
  const handleSwipeStart = () => {
    setIsSwiped(true);
  };

  const handleSwipeEnd = () => {
    setIsSwiped(false);
  };

  // Render the delete action that appears when swiping left
  const renderRightActions = (progress, dragX) => {
    const trans = dragX.interpolate({
      inputRange: [0, 50, 100, 101],
      outputRange: [0, 0, 0, 1],
    });

    return (
      <View style={styles.rightAction}>
        <Animated.View style={[styles.actionButton, { transform: [{ translateX: trans }] }]}>
          <Pressable
            style={[styles.deleteButton, { backgroundColor: '#FF3B30' }]}
            onPress={handleDelete}
          >
            <Trash2 size={20} color="white" />
          </Pressable>
        </Animated.View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Swipeable
        ref={swipeableRef}
        renderRightActions={renderRightActions}
        onSwipeableOpen={onSwipeableOpen}
        onSwipeStart={handleSwipeStart}
        onSwipeEnd={handleSwipeEnd}
        rightThreshold={40}
        friction={2}
        overshootFriction={8}
        overshootRight={false}
        containerStyle={styles.swipeableContainer}
      >
        <Pressable
          onPress={onPress}
          android_ripple={{
            color: dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
            borderless: false,
          }}
          style={({ pressed }) => ([
            styles.historyItem,
            {
              backgroundColor: isSwiped
                ? dark
                  ? 'rgba(255, 255, 255, 0.04)'
                  : 'rgba(0, 0, 0, 0.02)'
                : pressed
                  ? dark
                    ? 'rgba(255, 255, 255, 0.02)'
                    : 'rgba(0, 0, 0, 0.01)'
                  : 'transparent',
            }
          ])}
        >
          <View style={styles.contentContainer}>
            <View style={styles.iconContainer}>
              <Clock
                size={18}
                color={colors.text}
                style={styles.historyIcon}
              />
            </View>
            <PlainText
              text={item}
              style={[styles.historyText, { color: colors.text }]}
              numberOfLine={1}
            />
          </View>
        </Pressable>
      </Swipeable>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    overflow: 'hidden',
  },
  swipeableContainer: {
    borderRadius: 0,
    overflow: 'hidden',
  },
  historyItem: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  contentContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  historyIcon: {
    opacity: 0.7,
  },
  historyText: {
    fontSize: 15,
    flex: 1,
    marginRight: 8,
  },
  rightAction: {
    width: 80,
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  actionButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF3B30',
  },
});

export default SwipeableHistoryItem;
