import Animated, { FadeIn } from 'react-native-reanimated';
import { View, Text } from 'react-native';
import { MainWrapper } from '../Layout/MainWrapper';
import { useTheme } from '@react-navigation/native';
import { useEffect, useState } from 'react';
import { GetLanguageValue } from '../LocalStorage/Languages';
import { initializeCache } from '../Api/CacheInitializer';

export const InitialScreen = ({ navigation }) => {
  const theme = useTheme();
  const [statusMessage, setStatusMessage] = useState('');

  async function InitialCall() {
    try {
      // First initialize the cache system
      setStatusMessage('Preparing app data...');
      await initializeCache();

      // Then proceed with normal app initialization
      setStatusMessage('Loading preferences...');
      const lang = await GetLanguageValue();

      if (lang !== '') {
        navigation.replace('MainRoute');
      } else {
        navigation.replace('Onboarding');
      }
    } catch (error) {
      console.error('Error during app initialization:', error);
      // Still proceed to main app even if cache initialization fails
      const lang = await GetLanguageValue();
      if (lang !== '') {
        navigation.replace('MainRoute');
      } else {
        navigation.replace('Onboarding');
      }
    }
  }

  useEffect(() => {
    // Start initialization with a slight delay to allow the splash screen to render
    setTimeout(() => {
      InitialCall();
    }, 500);
  }, []);

  return (
    <MainWrapper>
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Animated.Text
          entering={FadeIn.delay(100).duration(300)}
          style={{
            fontSize: 40,
            color: theme.colors.text,
            fontWeight: 500,
          }}
        >
          Orbit
        </Animated.Text>
        <Animated.Text
          entering={FadeIn.delay(300)}
          style={{
            fontSize: 15,
            color: theme.colors.primary,
            marginBottom: 30,
          }}
        >
          Where Universe Takes You
        </Animated.Text>

        {statusMessage ? (
          <Animated.Text
            entering={FadeIn.delay(400)}
            style={{
              fontSize: 12,
              color: theme.colors.textSecondary,
              position: 'absolute',
              bottom: 40,
            }}
          >
            {statusMessage}
          </Animated.Text>
        ) : null}
      </View>
    </MainWrapper>
  );
};
