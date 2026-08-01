import Animated, { FadeInUp, FadeOutUp } from 'react-native-reanimated';
import { SmallText } from '../Global/SmallText';
import { memo } from 'react';
import LinearGradient from 'react-native-linear-gradient';
import { useGetUserName } from '../../hooks/useGetUserName';
import { PlainText } from '../Global/PlainText';
import { PaddingConatiner } from '../../Layout/PaddingConatiner';
import { SpaceBetween } from '../../Layout/SpaceBetween';
import { Dimensions, Pressable, View } from 'react-native';
import Feather from 'react-native-vector-icons/Feather';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Heading } from '../Global/Heading';
import { History } from 'lucide-react-native';
import { GlassBox } from '../Global/GlassBox';

const circleGradient = {
  x1: '0%', y1: '0%', x2: '100%', y2: '100%',
  stops: [
    { offset: '0%', opacity: 0.5 },
    { offset: '40%', opacity: 0.0 },
    { offset: '60%', opacity: 0.0 },
    { offset: '100%', opacity: 0.5 },
  ],
};

export const TopHeader = memo(({ showHeader }) => {
  const navigation = useNavigation();
  const { width } = Dimensions.get('window');
  const theme = useTheme();
  return (
    <>
      {showHeader && (
        <Animated.View
          entering={FadeInUp}
          exiting={FadeOutUp}
          style={{
            height: 50,
            width: '100%',
            backgroundColor: 'transparent',
            position: 'absolute',
            zIndex: 100,
          }}
        >
          <LinearGradient
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            colors={[
              theme.dark ? 'rgba(16,16,16,0.87)' : 'rgba(244,245,252,0.87)',
              theme.dark ? 'rgba(16,16,16,0.98)' : 'rgba(244,245,252,0.98)',
            ]}
            style={{
              flex: 1,
              height: 50,
              justifyContent: 'flex-end',
            }}
          >
            <PaddingConatiner>
              <SpaceBetween>
                <View style={{ flex: 1 }}>
                  <Heading text={'Orbit'} />
                </View>
                <View style={{ flexDirection: 'row', gap: 8 }}>
                  <Pressable
                    onPress={() => {
                      navigation.navigate('Search');
                    }}
                  >
                    <GlassBox
                      id="topheader-search"
                      gradientConfig={circleGradient}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <Feather
                        name={'search'}
                        size={width * 0.055}
                        color={theme.colors.text}
                      />
                    </GlassBox>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      navigation.navigate('HistoryPage');
                    }}
                  >
                    <GlassBox
                      id="topheader-history"
                      gradientConfig={circleGradient}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <History size={width * 0.055} color={theme.colors.text} />
                    </GlassBox>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      navigation.navigate('Settings');
                    }}
                  >
                    <GlassBox
                      id="topheader-settings"
                      gradientConfig={circleGradient}
                      style={{
                        width: 40,
                        height: 40,
                        borderRadius: 20,
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      <SimpleLineIcons
                        name={'settings'}
                        size={width * 0.055}
                        color={theme.colors.text}
                      />
                    </GlassBox>
                  </Pressable>
                </View>
              </SpaceBetween>
            </PaddingConatiner>
          </LinearGradient>
        </Animated.View>
      )}
    </>
  );
});
