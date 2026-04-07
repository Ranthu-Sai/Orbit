import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { EachPlaylistCard } from '../Global/EachPlaylistCard';
import { useTheme } from '@react-navigation/native';

// Helper function to get language display name
const getLanguageDisplay = (langCode) => {
  if (!langCode) {
    return null;
  }

  // Map of language codes to display names
  const languageMap = {
    en: 'English',
    hi: 'Hindi',
    te: 'Telugu',
    ta: 'Tamil',
    ml: 'Malayalam',
    pa: 'Punjabi',
    mr: 'Marathi',
    gu: 'Gujarati',
    bn: 'Bengali',
    kn: 'Kannada',
  };

  return languageMap[langCode.toLowerCase()] || langCode;
};

export const PlaylistItemWrapper = ({
  item,
  cardWidth,
  source,
  searchText,
  navigationSource,
}) => {
  const theme = useTheme();
  const displayLanguage = getLanguageDisplay(item.language);

  // Function to truncate text
  const truncateText = (text, limit = 22) => {
    if (!text) {
      return '';
    }
    return text.length > limit ? text.substring(0, limit) + '...' : text;
  };

  // Safe image URL extraction
  const getImageUrl = (imageData) => {
    if (!imageData) {
      return '';
    }

    // If it's already a string, return it
    if (typeof imageData === 'string') {
      return imageData;
    }

    // If it's an array, try to get the highest quality image
    if (Array.isArray(imageData)) {
      // Try to get image[2] first (usually highest quality)
      if (imageData[2]?.link) {
        return imageData[2].link;
      }
      if (imageData[2]?.url) {
        return imageData[2].url;
      }

      // Fallback to any available image
      for (const img of imageData) {
        if (img?.link) {
          return img.link;
        }
        if (img?.url) {
          return img.url;
        }
        if (typeof img === 'string') {
          return img;
        }
      }
    }

    // If it's an object with link or url
    if (imageData.link) {
      return imageData.link;
    }
    if (imageData.url) {
      return imageData.url;
    }

    return '';
  };

  return (
    <View style={styles.container}>
      <EachPlaylistCard
        name={truncateText(item.name, 22)}
        follower={truncateText('Total ' + item.songCount + ' Songs', 22)}
        image={getImageUrl(item.image)}
        id={item.id}
        language={displayLanguage}
        source={source}
        searchText={searchText}
        navigationSource={navigationSource}
        MainContainerStyle={{
          width: cardWidth - 16,
          marginHorizontal: 8,
          marginVertical: 4,
          height: cardWidth * 1.3,
          backgroundColor: 'transparent',
        }}
        ImageStyle={{
          height: cardWidth - 12,
          width: cardWidth - 12,
          borderRadius: 10,
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
  },
});
