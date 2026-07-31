import { Dimensions, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { memo } from 'react';
import { useTheme } from '@react-navigation/native';
import { GlassBox } from '../GlassBox';

function EachTabs({ item, isActive, index, setActive }) {
  const theme = useTheme();
  const width = Dimensions.get('window').width;
  return (
    <Pressable
      style={{ padding: 5, alignItems: 'center' }}
      onPress={() => {
        setActive(index);
      }}
    >
      {!isActive && (
        <GlassBox
          id={`tab-${item}`}
          style={{
            borderRadius: 100,
            paddingVertical: 6,
          }}
          gradientConfig={{
            x1: '0%', y1: '0%', x2: '100%', y2: '100%',
            stops: [
              { offset: '0%', opacity: 0.0 },
              { offset: '30%', opacity: 0.3 },
              { offset: '70%', opacity: 0.3 },
              { offset: '100%', opacity: 0.0 },
            ],
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: width * 0.04,
              fontFamily: 'roboto',
              fontWeight: 700,
              paddingHorizontal: 14,
            }}
          >
            {item}
          </Text>
        </GlassBox>
      )}
      {isActive && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          exiting={ZoomOut.duration(300)}
          style={{
            backgroundColor: theme.colors.tabBarActive || theme.colors.primary,
            borderRadius: 100000000000,
            paddingVertical: 6,
          }}
        >
          <Text
            style={{
              color: isActive ? 'white' : theme.colors.textSecondary,
              fontSize: width * 0.04,
              fontFamily: 'roboto',
              fontWeight: 700,
              paddingHorizontal: 14,
            }}
          >
            {item}
          </Text>
        </Animated.View>
      )}
    </Pressable>
  );
}
export default memo(EachTabs);
