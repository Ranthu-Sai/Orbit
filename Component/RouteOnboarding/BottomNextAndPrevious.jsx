import React from 'react';
import { Pressable, View } from 'react-native';
import { PlainText } from '../Global/PlainText';
import { useTheme } from '@react-navigation/native';
import Animated, { FadeInDown } from 'react-native-reanimated';
import Ionicons from 'react-native-vector-icons/Ionicons';

export const BottomNextAndPrevious = ({
  showPrevious,
  delay,
  onNextPress,
  onPreviousPress,
  nextText,
}) => {
  const theme = useTheme();
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 30,
        marginHorizontal: 20,
        gap: 10,
      }}
    >
      {showPrevious && (
        <Animated.View
          entering={FadeInDown.delay(delay)}
          style={{
            flex: 1,
            backgroundColor: '#32CD32',
            borderRadius: 10,
          }}
        >
          <Pressable
            onPress={onPreviousPress}
            style={{
              width: '100%',
              padding: 15,
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons
                name="arrow-back"
                size={16}
                color="black"
                style={{ marginRight: 5 }}
              />
              <PlainText
                text={'Prev'}
                style={{ color: 'black', fontWeight: 'bold' }}
              />
            </View>
          </Pressable>
        </Animated.View>
      )}
      <Animated.View
        entering={FadeInDown.delay(delay + 100)}
        style={{
          flex: 1,
          backgroundColor: '#32CD32',
          borderRadius: 15,
        }}
      >
        <Pressable
          style={{
            width: '100%',
            padding: 15,
            alignItems: 'center',
            justifyContent: 'center',
          }}
          onPress={onNextPress}
        >
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <PlainText
              text={`${nextText ? nextText : 'Next'}`}
              style={{ color: 'black', fontWeight: 'bold' }}
            />
            <Ionicons
              name="arrow-forward"
              size={16}
              color="black"
              style={{ marginLeft: 5 }}
            />
          </View>
        </Pressable>
      </Animated.View>
    </View>
  );
};

export default BottomNextAndPrevious;
