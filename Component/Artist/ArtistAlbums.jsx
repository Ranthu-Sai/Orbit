import React from 'react';
import { View, Pressable, Dimensions, ScrollView } from 'react-native';
import { useTheme } from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';
import { PlainText } from '../Global/PlainText';
import { LoadingComponent } from '../Global/Loading';
import { getValidImageUrl, safeString } from '../../Utils/ArtistUtils';

const { width: screenWidth } = Dimensions.get('window');

/**
 * AlbumCard component - renders individual album card
 * @param {object} props - Component props
 * @param {object} props.album - Album object
 * @param {function} props.onPress - Function to call when album is pressed
 * @returns {JSX.Element} - AlbumCard component
 */
const AlbumCard = ({ album, onPress }) => {
  const theme = useTheme();

  return (
    <Pressable
      onPress={() => onPress(album)}
      style={{
        width: (screenWidth - 60) / 2, // Two columns with proper spacing
        marginHorizontal: 5,
        marginBottom: 20, // Add bottom margin to prevent overlapping
      }}
    >
      <View
        style={{
          backgroundColor: 'transparent',
          borderRadius: 10,
          overflow: 'hidden',
        }}
      >
        <FastImage
          source={{ uri: getValidImageUrl(album.image) }}
          style={{
            width: '100%',
            height: (screenWidth - 60) / 2, // Square aspect ratio
            borderRadius: 10,
            marginBottom: 8,
          }}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View
          style={{
            paddingHorizontal: 5,
            paddingBottom: 5, // Add bottom padding for text area
          }}
        >
          <PlainText
            text={safeString(album.name, 'Unknown Album')}
            numberOfLine={2}
            style={{
              color: theme.colors.text,
              fontSize: 14,
              fontWeight: 'bold',
              marginBottom: 4, // Increase margin between title and subtitle
              lineHeight: 18, // Add line height for better text spacing
            }}
          />
          <SmallText
            text={safeString(
              `${album.year || 'Unknown'} • ${album.songCount || 0} songs`
            )}
            style={{
              color: theme.colors.text,
              opacity: 0.8,
              fontSize: 12,
              lineHeight: 16, // Add line height for better text spacing
            }}
            maxLine={1}
          />
        </View>
      </View>
    </Pressable>
  );
};

/**
 * ArtistAlbums component - displays artist albums with load more button
 * @param {object} props - Component props
 * @param {array} props.visibleAlbums - Array of visible albums
 * @param {number} props.totalAlbums - Total number of albums
 * @param {boolean} props.albumLoading - Loading state for albums
 * @param {boolean} props.hasMoreAlbums - Whether there are more albums to load
 * @param {function} props.onLoadMore - Function to load more albums
 * @param {function} props.onAlbumPress - Function to call when album is pressed
 * @returns {JSX.Element} - ArtistAlbums component
 */
const ArtistAlbums = ({
  visibleAlbums,
  totalAlbums,
  albumLoading,
  hasMoreAlbums,
  onLoadMore,
  onAlbumPress,
}) => {
  const theme = useTheme();

  if (!visibleAlbums?.length && !albumLoading) {
    return (
      <View style={{ padding: 40, alignItems: 'center' }}>
        <Ionicons
          name="albums-outline"
          size={48}
          color={theme.colors.text}
          style={{ opacity: 0.3, marginBottom: 16 }}
        />
        <PlainText
          text="No albums available"
          style={{
            color: theme.dark ? '#CCCCCC' : '#666666',
            fontSize: 16,
            fontWeight: '600',
          }}
        />
      </View>
    );
  }

  return (
    <View style={{ paddingHorizontal: 20 }}>
      <View
        style={{
          flexDirection: 'row',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 15,
        }}
      >
        <Heading
          text="Albums"
          style={{ color: theme.colors.text, fontSize: 20, marginRight: 30 }}
        />
        <SmallText
          text={safeString(
            `${totalAlbums || visibleAlbums?.length || 0} albums`
          )}
          style={{
            color: theme.colors.text,
            opacity: 0.6,
            fontSize: 14,
            marginRight: 10,
          }}
        />
      </View>

      <View
        style={{
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'space-between',
          marginHorizontal: -5, // Negative margin to offset card margins
          paddingBottom: 10, // Add bottom padding to container
        }}
      >
        {visibleAlbums.map((album, index) => (
          <AlbumCard
            key={`${album.id}_${index}`} // Fixed: Use unique key with index
            album={album}
            onPress={onAlbumPress}
          />
        ))}
      </View>

      {/* Load More Button */}
      {hasMoreAlbums && (
        <Pressable
          onPress={onLoadMore}
          disabled={albumLoading}
          style={{
            backgroundColor: theme.colors.card,
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 25,
            marginTop: 20,
            marginBottom: 10,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: theme.colors.border,
          }}
        >
          {albumLoading ? (
            <LoadingComponent loading={true} height={20} />
          ) : (
            <>
              <Ionicons
                name="add-circle-outline"
                size={20}
                color={theme.colors.text}
                style={{ marginRight: 8 }}
              />
              <PlainText
                text={safeString(
                  `Load More (${
                    (totalAlbums || 0) - (visibleAlbums.length || 0)
                  } remaining)`
                )}
                style={{ color: theme.colors.text, fontWeight: 'bold' }}
              />
            </>
          )}
        </Pressable>
      )}
    </View>
  );
};

export default ArtistAlbums;
