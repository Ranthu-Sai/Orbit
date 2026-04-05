import React from 'react';
import { View, Pressable } from 'react-native';
import { useTheme } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';
import { PlainText } from '../Global/PlainText';
import {
  getValidImageUrl,
  formatFollowerCount,
  safeString,
} from '../../Utils/ArtistUtils';

/**
 * ArtistHeader component - displays artist image, name, followers, and play button
 * @param {object} props - Component props
 * @param {object} props.artistData - Artist data object
 * @param {string} props.artistName - Fallback artist name
 * @param {function} props.onPlayAll - Function to call when play all button is pressed
 * @returns {JSX.Element} - ArtistHeader component
 */
const ArtistHeader = ({ artistData, artistName, onPlayAll }) => {
  const theme = useTheme();

  const displayName = safeString(
    artistData?.data?.name || artistName,
    'Unknown Artist'
  );
  const followerCount = formatFollowerCount(artistData?.data?.followerCount);
  const isVerified = artistData?.data?.isVerified;
  const artistImage = getValidImageUrl(artistData?.data?.image);

  return (
    <View style={{ position: 'relative' }}>
      <View style={{ height: 300, position: 'relative' }}>
        <FastImage
          source={{ uri: artistImage }}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
        {/* Black shade overlay for both light and dark themes */}
        <LinearGradient
          colors={[
            'transparent',
            'rgba(0,0,0,0.3)',
            'rgba(0,0,0,0.6)',
            'rgba(0,0,0,0.8)',
          ]}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: 0,
            height: '100%',
          }}
        />
        <View
          style={{
            position: 'absolute',
            bottom: 20,
            left: 20,
            right: 20,
          }}
        >
          <Heading
            text={displayName}
            style={{
              color: 'white',
              fontSize: 28,
              fontWeight: 'bold',
              marginBottom: 2,
            }}
          />
          <View
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 10,
            }}
          >
            {isVerified && (
              <MaterialIcons
                name="verified"
                size={20}
                color="#1DB954"
                style={{ marginRight: 8 }}
              />
            )}
            <SmallText
              text={`${followerCount} followers`}
              style={{ color: 'white', opacity: 0.9, fontSize: 14 }}
            />
          </View>

          <Pressable
            onPress={onPlayAll}
            style={{
              backgroundColor: theme.colors.primary,
              paddingHorizontal: 24,
              paddingVertical: 12,
              borderRadius: 25,
              flexDirection: 'row',
              alignItems: 'center',
              alignSelf: 'flex-start',
              marginTop: 10,
            }}
          >
            <Ionicons
              name="play"
              size={20}
              color="white"
              style={{ marginRight: 8 }}
            />
            <PlainText
              text="Play All"
              style={{ color: 'white', fontWeight: 'bold' }}
            />
          </Pressable>
        </View>
      </View>
    </View>
  );
};

export default ArtistHeader;
