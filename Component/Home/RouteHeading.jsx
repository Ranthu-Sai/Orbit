import { Dimensions, Pressable, Text, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import Feather from 'react-native-vector-icons/Feather';
import { Spacer } from '../Global/Spacer';
import SimpleLineIcons from 'react-native-vector-icons/SimpleLineIcons';
import { GetCurrentDaytime } from '../../Utils/GetCurrentDaytime';
import { useGetUserName } from '../../hooks/useGetUserName';
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

export const RouteHeading = ({
  bottomText,
  showSearch,
  showSettings,
  showAbout,
  topText,
  onSearchPress,
}) => {
  const userName = useGetUserName();
  const theme = useTheme();
  const width = Dimensions.get('window').width;
  const navigation = useNavigation();

  return (
    <>
      <Spacer />
      <View
        style={{
          paddingHorizontal: 10,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 8,
        }}
      >
        <View>
          {topText !== '' && (
            <Text
              style={{
                fontWeight: 900,
                color: theme.colors.text,
                fontSize: width * 0.055,
                fontFamily: 'roboto',
              }}
            >
              {topText || `Hey, ${userName}`}
            </Text>
          )}
          {/*<SmallText text=/>*/}
          <Text
            style={{
              fontWeight: bottomText === 'History' ? 900 : 500,
              color: theme.colors.text,
              fontSize: bottomText === 'History' ? width * 0.055 : width * 0.04,
              fontFamily: 'roboto',
            }}
          >
            {bottomText ? bottomText : GetCurrentDaytime()}
          </Text>
        </View>
        <View style={{ flex: 1 }} />
        {showSearch && (
          <Pressable
            onPress={() => {
              if (onSearchPress) {
                onSearchPress();
              } else {
                navigation.navigate('Search');
              }
            }}
          >
            <GlassBox
              id="heading-search"
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
        )}
        {showSearch && (
          <Pressable
            onPress={() => {
              navigation.navigate('HistoryPage');
            }}
          >
            <GlassBox
              id="heading-history"
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
        )}
        {showSettings && (
          <Pressable
            onPress={() => {
              navigation.navigate('Settings');
            }}
          >
            <GlassBox
              id="heading-settings"
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
        )}
        {showAbout && (
          <Pressable
            onPress={() => {
              navigation.navigate('AboutProject');
            }}
          >
            <GlassBox
              id="heading-about"
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
                name={'info'}
                size={width * 0.055}
                color={theme.colors.text}
              />
            </GlassBox>
          </Pressable>
        )}
      </View>
      <Spacer />
    </>
  );
};
