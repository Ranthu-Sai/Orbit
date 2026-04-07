import { Pressable, Text, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

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
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: dark
            ? 'rgba(255, 255, 255, 0.08)'
            : 'rgba(0, 0, 0, 0.04)',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon size={16} color={dark ? '#FFFFFF' : '#000000'} />
      </View>

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
