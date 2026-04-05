import { Image, Pressable, View } from 'react-native';
import { PlainText } from './PlainText';
import { SmallText } from './SmallText';
import { useTheme } from '@react-navigation/native';
import { memo } from 'react';
import { useNavigation } from '@react-navigation/native';
import navigationHistoryManager from '../../Utils/NavigationHistoryManager';

export const EachArtistCard = memo(function EachArtistCard({
  name,
  role,
  image,
  id,
  url,
  width,
  style,
}) {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const handlePress = () => {
    // Add Search screen to navigation history before navigating to Artist
    navigationHistoryManager.addScreen({
      screenName: 'Search',
      params: {},
    });

    // Navigate to artist page with artist ID using nested navigation
    navigation.navigate('MainRoute', {
      screen: 'Home',
      params: {
        screen: 'ArtistPage',
        params: { artistId: id, artistName: name },
      },
    });
  };

  const safeImageUri =
    image || 'https://via.placeholder.com/150x150/cccccc/666666?text=Artist';

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          backgroundColor: colors.card,
          borderRadius: 15,
          padding: 15,
          flexDirection: 'row',
          alignItems: 'center',
          width: width,
          elevation: 2,
          shadowColor: '#000',
          shadowOffset: {
            width: 0,
            height: 1,
          },
          shadowOpacity: 0.22,
          shadowRadius: 2.22,
        },
        style,
      ]}
    >
      {/* Artist Image */}
      <View
        style={{
          width: 60,
          height: 60,
          borderRadius: 30,
          overflow: 'hidden',
          marginRight: 15,
          backgroundColor: colors.border,
        }}
      >
        <Image
          source={{ uri: safeImageUri }}
          style={{
            width: '100%',
            height: '100%',
          }}
          resizeMode="cover"
        />
      </View>

      {/* Artist Info */}
      <View
        style={{
          flex: 1,
          justifyContent: 'center',
        }}
      >
        <PlainText
          text={name || 'Unknown Artist'}
          style={{
            color: colors.text,
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 4,
          }}
          numberOfLines={1}
        />
        <SmallText
          text={role || 'Artist'}
          style={{
            color: colors.textSecondary || colors.text,
            opacity: 0.7,
            fontSize: 14,
          }}
          numberOfLines={1}
        />
      </View>

      {/* Optional: Add a small arrow or icon to indicate it's clickable */}
      <View
        style={{
          width: 30,
          height: 30,
          borderRadius: 15,
          backgroundColor: colors.primary + '20',
          justifyContent: 'center',
          alignItems: 'center',
        }}
      >
        <PlainText
          text="›"
          style={{
            color: colors.primary,
            fontSize: 18,
            fontWeight: 'bold',
          }}
        />
      </View>
    </Pressable>
  );
});
