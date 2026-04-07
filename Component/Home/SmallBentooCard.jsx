import { Image, Pressable, Text, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

export const SmallBentooCard = ({ width, image, text, navigate }) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { dark } = theme;
  return (
    <Pressable
      onPress={() => {
        navigation.navigate('ShowPlaylistofType', {
          Searchtext: navigate.toLowerCase(),
        });
      }}
      style={{
        height: 170,
        borderRadius: 10,
        elevation: 10,
        overflow: 'hidden',
      }}
    >
      <Image
        source={image}
        style={{
          width: width,
          height: 170,
        }}
      />
      <View
        style={{
          position: 'absolute',
          bottom: 0,
          width: '100%',
          height: '100%',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: 'rgba(0, 0, 0, 0.6)', // Consistent dark overlay
        }}
      >
        <Text
          style={{
            textAlign: 'center',
            fontSize: 20,
            fontWeight: 'bold',
            color: '#FFFFFF', // Consistent white text
          }}
        >
          {text}
        </Text>
        <Text
          style={{
            textAlign: 'center',
            fontSize: 10,
            color: '#FFFFFF',
          }}
        >
          Listen Now
        </Text>
      </View>
    </Pressable>
  );
};
