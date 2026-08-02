import { Pressable, Text, View, StyleSheet } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { GlassBox } from '../Global/GlassBox';
import { BlurView } from '@react-native-community/blur';

export const DiscoverCard = ({ width, icon: Icon, text, navigate }) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { dark } = theme;

  const handlePress = () => {
    // Special handling for podcasts
    if (navigate.toLowerCase() === 'podcasts') {
      navigation.navigate('PodcastScreen');
    } else {
      navigation.navigate('ShowPlaylistofType', {
        Searchtext: navigate.toLowerCase(),
      });
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        width: width,
        height: 100,
        borderRadius: 12,
        backgroundColor: dark ? '#1F1F1F' : '#E5E5E5',
        padding: 16,
        justifyContent: 'space-between',
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Icon container */}
      <GlassBox
        id={`discover-card-icon-${text.replace(/\s+/g, '-').toLowerCase()}`}
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'transparent',
          borderWidth: 0,
        }}
        gradientConfig={{
          x1: '0%', y1: '0%', x2: '100%', y2: '100%',
          stops: [
            { offset: '0%', opacity: 0.0 },
            { offset: '30%', opacity: 0.6 },
            { offset: '70%', opacity: 0.6 },
            { offset: '100%', opacity: 0.0 },
          ],
        }}
      >
        <BlurView
          style={StyleSheet.absoluteFill}
          blurType={dark ? 'dark' : 'light'}
          blurAmount={8}
          reducedTransparencyFallbackColor={dark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.04)'}
        />
        <Icon size={16} color={dark ? '#FFFFFF' : '#000000'} />
      </GlassBox>

      {/* Text */}
      <Text
        style={{
          fontSize: 16,
          fontWeight: '600',
          color: dark ? '#FFFFFF' : '#000000',
        }}
      >
        {text}
      </Text>
    </Pressable>
  );
};
