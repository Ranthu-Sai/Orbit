import React, { memo, useMemo } from 'react';
import { View, Pressable, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useThemeContext } from '../../Context/ThemeContext';
import { PlainText } from './PlainText';
import { SmallText } from './SmallText';
import FastImage from 'react-native-fast-image';
import { truncateText } from '../../Utils/FormatTitleAndArtist';
import FontAwesome5 from 'react-native-vector-icons/FontAwesome5';

export const EachArtistCardGrid = memo(function EachArtistCardGrid({
  id,
  name,
  role,
  image,
  followerCount,
  mainContainerStyle,
  source,
  searchText
}) {
  const navigation = useNavigation();
  const { theme } = useThemeContext();
  const { width } = Dimensions.get('window');

  // Calculate responsive dimensions based on screen size
  const responsiveStyles = useMemo(() => {
    // Dynamic width calculation for perfect 2-column grid
    // Screen Width - Horizontal Padding (20) - Inner Spacing (12) / 2
    const cardWidth = (width - 32) / 2;
    // Compact height for better layout
    const cardHeight = cardWidth + 50;

    return {
      container: {
        width: cardWidth,
        height: cardHeight,
        marginHorizontal: 0, // Remove horizontal margin, let columnWrapper handle spacing
        marginVertical: 6,
        alignItems: 'center', // Center content horizontally
      },
      image: {
        height: cardWidth - 24,
        width: cardWidth - 24,
        borderRadius: (cardWidth - 24) / 2, // Circular image
        margin: 12,
      },
      textContainer: {
        paddingHorizontal: 8,
        paddingBottom: 4,
        height: 50,
        justifyContent: 'flex-start',
        alignItems: 'center', // Center text 
        width: '100%',
      }
    };
  }, [width]);

  const handlePress = () => {
    try {
      // Navigate using nested navigation structure
      navigation.navigate("MainRoute", {
        screen: 'Home',
        params: {
          screen: 'ArtistPage',
          params: {
            artistId: id,
            artistName: name,
            source: source,
            searchText: searchText
          }
        }
      });
    } catch (error) {
      console.error('Error navigating to Artist:', error);
      // Fallback navigation to prevent dead-end
      navigation.navigate("MainRoute", {
        screen: 'Home',
        params: { screen: "HomePage" }
      });
    }
  };

  // Add validation for empty image URLs
  const imageSource = image && image !== ""
    ? { uri: image }
    : require('../../Images/default.jpg');

  return (
    <Pressable
      onPress={handlePress}
      style={{
        ...(mainContainerStyle || {}),
        ...responsiveStyles.container,
        // Removed background color, elevation, and shadows for cleaner look
      }}
    >
      {/* Artist Image */}
      <View style={{
        position: 'relative',
        // Removed margins/padding here as they are handled in responsiveStyles.image
      }}>
        <FastImage
          source={imageSource}
          style={{
            ...responsiveStyles.image,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />

        {/* Play button overlay */}
        <View style={{
          position: 'absolute',
          bottom: 18,
          right: 18,
          backgroundColor: theme.colors.primary,
          borderRadius: 20,
          width: 32,
          height: 32,
          justifyContent: 'center',
          alignItems: 'center',
          elevation: 4,
          shadowColor: "#000",
          shadowOffset: {
            width: 0,
            height: 2,
          },
          shadowOpacity: 0.3,
          shadowRadius: 3,
        }}>
          <FontAwesome5
            name="play"
            size={12}
            color="white"
            style={{ marginLeft: 2 }} // Slight offset for visual centering
          />
        </View>
      </View>

      {/* Artist Info */}
      <View style={responsiveStyles.textContainer}>
        <PlainText
          text={truncateText(name, 20)}
          style={{
            color: theme.colors.text,
            fontSize: 15,
            fontWeight: '600',
            textAlign: 'center', // Center text
            marginBottom: 2,
          }}
          numberOfLines={1}
        />
        <SmallText
          text={role || 'Artist'} // Always show 'Artist' or role, ignore follower count
          style={{
            color: theme.colors.textSecondary || theme.colors.text,
            opacity: 0.8,
            fontSize: 13,
            textAlign: 'center', // Center text
          }}
          numberOfLines={1}
        />
      </View>
    </Pressable>
  );
});
