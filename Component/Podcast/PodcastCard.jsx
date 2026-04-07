import React, { useState, memo } from 'react';
import { Pressable, Text, View } from 'react-native';
import { useNavigation, useTheme } from '@react-navigation/native';
import { Mic } from 'lucide-react-native';
import FastImage from 'react-native-fast-image';

const FALLBACK_IMAGE = 'https://via.placeholder.com/300?text=Podcast';

/**
 * PodcastCard - Square card component for displaying podcasts
 * @param {Object} podcast - Podcast data object
 * @param {number} width - Card width (default 140)
 * @param {Function} onPress - Optional custom press handler
 * @param {boolean} noMargin - Disable right margin (for grid layouts)
 */
export const PodcastCard = ({
  podcast,
  width = 140,
  onPress,
  noMargin = false,
}) => {
  const navigation = useNavigation();
  const theme = useTheme();
  const { dark } = theme;
  const [imageError, setImageError] = useState(false);

  // Get the best available image URL
  const getImageUrl = () => {
    const url = podcast.artwork || podcast.image || podcast.imageUrl || '';

    // Validate URL
    if (!url || typeof url !== 'string' || url.trim() === '') {
      return null;
    }

    return url;
  };

  const imageUrl = getImageUrl();
  const hasValidImage = imageUrl && !imageError;

  const handlePress = () => {
    if (onPress) {
      onPress();
    } else {
      navigation.navigate('PodcastDetail', {
        feedId: podcast.feedId || podcast.id,
        podcast: podcast,
      });
    }
  };

  const handleImageError = () => {
    setImageError(true);
  };

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => ({
        width: width,
        marginRight: noMargin ? 0 : 12,
        opacity: pressed ? 0.7 : 1,
      })}
    >
      {/* Podcast Cover - Square */}
      <View
        style={{
          width: width,
          height: width,
          borderRadius: 12,
          overflow: 'hidden',
          backgroundColor: dark ? '#2E2E2E' : '#E5E5E5',
          elevation: 3,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.1,
          shadowRadius: 4,
        }}
      >
        {!hasValidImage ? (
          // Show placeholder icon when no image or image failed
          <View
            style={{
              width: '100%',
              height: '100%',
              alignItems: 'center',
              justifyContent: 'center',
              backgroundColor: dark ? '#3E3E3E' : '#D5D5D5',
            }}
          >
            <Mic size={width * 0.35} color={dark ? '#666' : '#999'} />
          </View>
        ) : (
          <FastImage
            source={{
              uri: imageUrl,
              priority: FastImage.priority.normal,
              headers: {
                'User-Agent':
                  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
                Accept: 'image/webp,image/apng,image/*,*/*;q=0.8',
              },
            }}
            style={{
              width: '100%',
              height: '100%',
            }}
            resizeMode={FastImage.resizeMode.cover}
            onError={handleImageError}
          />
        )}
      </View>

      {/* Podcast Title */}
      <Text
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{
          marginTop: 8,
          fontSize: 13,
          fontWeight: '600',
          color: dark ? '#FFFFFF' : '#000000',
          lineHeight: 18,
        }}
      >
        {podcast.title || podcast.name}
      </Text>

      {/* Author */}
      <Text
        numberOfLines={1}
        ellipsizeMode="tail"
        style={{
          marginTop: 2,
          fontSize: 12,
          color: dark ? '#B3B3B3' : '#666666',
        }}
      >
        {podcast.author}
      </Text>
    </Pressable>
  );
};

export default PodcastCard;
