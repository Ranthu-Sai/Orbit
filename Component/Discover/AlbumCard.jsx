import { Pressable, Text, View, Image } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';

export const AlbumCard = ({
  album,
  width = 140,
  isArtist = false,
  onPress,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { dark } = theme;

  // Extract album cover image
  const coverImage =
    album?.image?.[album.image.length - 1]?.url ||
    album?.images?.[album.images.length - 1]?.url ||
    'https://via.placeholder.com/150';

  const albumTitle = album?.title || album?.name || 'Unknown Album';
  const albumArtist =
    album?.subtitle || album?.artist || album?.artists || 'Unknown Artist';

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      // Default navigation to album page
      const albumId = album?.id || album?.url;
      if (albumId) {
        navigation.navigate('Album', { id: albumId, source: 'ytmusic' });
      }
    }
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        width: width,
        marginRight: 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Album/Artist Cover */}
      <View
        style={{
          width: width,
          height: width,
          borderRadius: isArtist ? width / 2 : 8,
          overflow: 'hidden',
          backgroundColor: dark ? '#2E2E2E' : '#E5E5E5',
        }}
      >
        <Image
          source={{ uri: coverImage }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>

      {/* Album Title */}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: '600',
          color: dark ? '#FFFFFF' : '#000000',
        }}
      >
        {albumTitle}
      </Text>

      {/* Album Artist */}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          marginTop: 2,
          fontSize: 12,
          color: dark ? '#B3B3B3' : '#666666',
        }}
      >
        {albumArtist}
      </Text>
    </Pressable>
  );
};
