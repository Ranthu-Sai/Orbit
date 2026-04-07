import { Dimensions, View } from 'react-native';
import { Heading } from '../Global/Heading';
import { Spacer } from '../Global/Spacer';
import LinearGradient from 'react-native-linear-gradient';
import { useTheme } from '@react-navigation/native';
import { AddPlaylist, getIndexQuality } from '../../MusicPlayerFunctions';
import { useContext } from 'react';
import Context from '../../Context/Context';
import { PlayButton } from '../Playlist/PlayButton';

// Function to safely extract image URI from different formats
const getImageUri = (imageSource) => {
  try {
    // Case 1: Image is a string (direct URL)
    if (typeof imageSource === 'string') {
      return imageSource;
    }

    // Case 2: Image is an array (happens with favorite playlist)
    if (Array.isArray(imageSource)) {
      // Try to extract URL from the array (e.g., image[2].url format)
      for (const item of imageSource) {
        if (item && typeof item === 'object' && item.url) {
          return item.url;
        }
      }
      // If no object with url found, try first item if it's a string
      if (imageSource.length > 0) {
        if (typeof imageSource[0] === 'string') {
          return imageSource[0];
        } else if (typeof imageSource[0] === 'object' && imageSource[0]?.url) {
          return imageSource[0].url;
        }
      }
      // Fallback to empty string if nothing works
      return '';
    }

    // Case 3: Image is an object with url property
    if (imageSource && typeof imageSource === 'object' && imageSource.url) {
      return imageSource.url;
    }

    // Default fallback - try to convert to string
    return String(imageSource || '');
  } catch (error) {
    console.error('Error in getImageUri:', error);
    return ''; // Safe fallback
  }
};

// Function to safely extract URL from different formats
const getSafeUrl = (urlSource, quality = 0) => {
  try {
    // Case 1: URL is a string (direct URL)
    if (typeof urlSource === 'string') {
      return urlSource;
    }

    // Case 2: URL is an array (common pattern)
    if (Array.isArray(urlSource)) {
      // Try to get the URL at the specified quality
      if (urlSource.length > quality && urlSource[quality]?.url) {
        return urlSource[quality].url;
      }
      // Fallback to first URL if quality not available
      if (urlSource.length > 0) {
        if (typeof urlSource[0] === 'string') {
          return urlSource[0];
        } else if (urlSource[0]?.url) {
          return urlSource[0].url;
        }
      }
      // No valid URL found in array
      return '';
    }

    // Case 3: URL is an object with url property
    if (urlSource && typeof urlSource === 'object' && urlSource.url) {
      return urlSource.url;
    }

    // Default fallback - empty string
    return '';
  } catch (error) {
    console.error('Error in getSafeUrl:', error);
    return ''; // Safe fallback
  }
};

export const LikedDetails = ({ name, Data, dontShowPlayButton, textStyle }) => {
  const { updateTrack } = useContext(Context);

  async function AddToPlayer() {
    const quality = await getIndexQuality();
    const ForPlayer = [];

    Data.forEach((e) => {
      if (e) {
        // Get safe image URI for artwork
        const artworkUri = getImageUri(e?.artwork || e?.image);

        // Get safe URL
        const songUrl = getSafeUrl(e?.url, quality);

        // Skip songs with no URL
        if (!songUrl) {
          return;
        }

        ForPlayer.push({
          url: songUrl,
          title: e?.title || 'Unknown',
          artist: e?.artist || 'Unknown',
          artwork: artworkUri,
          duration: e?.duration || 0,
          id: e?.id || '',
          language: e?.language || '',
        });
      }
    });

    if (ForPlayer.length > 0) {
      await AddPlaylist(ForPlayer);
      updateTrack();
    } else {
    }
  }

  const theme = useTheme();
  const width = Dimensions.get('window').width;
  return (
    <LinearGradient
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      colors={['rgba(44,44,44,0)', 'rgb(21,21,21)', theme.colors.background]}
      style={{
        padding: 10,
        alignItems: 'center',
        justifyContent: 'space-between',
        flexDirection: 'row',
      }}
    >
      <View
        style={{
          paddingLeft: 5,
          maxWidth: width * 0.8,
        }}
      >
        <Heading text={name} style={textStyle} />
        <Spacer />
      </View>
      {!dontShowPlayButton && (
        <PlayButton
          onPress={() => {
            AddToPlayer();
          }}
        />
      )}
    </LinearGradient>
  );
};
