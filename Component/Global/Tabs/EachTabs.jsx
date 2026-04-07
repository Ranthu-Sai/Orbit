import { Dimensions, Pressable, Text, View } from 'react-native';
import Animated, { ZoomIn, ZoomOut } from 'react-native-reanimated';
import { memo } from 'react';
import { useTheme } from '@react-navigation/native';

function EachTabs({ item, isActive, index, setActive }) {
  const theme = useTheme();
  const width = Dimensions.get('window').width;
  return (
    <Pressable
      style={{ padding: 7, alignItems: 'center' }}
      onPress={() => {
        setActive(index);
      }}
    >
      {!isActive && (
        <View
          style={{
            borderRadius: 100000000000,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: theme.colors.textSecondary,
              fontSize: width * 0.04,
              fontFamily: 'roboto',
              fontWeight: 700,
              paddingHorizontal: 10,
            }}
          >
            {item}
          </Text>
        </View>
      )}
      {isActive && (
        <Animated.View
          entering={ZoomIn.duration(300)}
          exiting={ZoomOut.duration(300)}
          style={{
            backgroundColor: theme.colors.tabBarActive || theme.colors.primary,
            borderRadius: 100000000000,
            paddingVertical: 7,
          }}
        >
          <Text
            style={{
              color: isActive ? 'white' : theme.colors.textSecondary,
              fontSize: width * 0.04,
              fontFamily: 'roboto',
              fontWeight: 700,
              paddingHorizontal: 10,
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
