import Animated, {
  interpolate,
  useAnimatedStyle,
  useScrollViewOffset,
} from 'react-native-reanimated';
import {
  Dimensions,
  View,
  Pressable,
  TouchableOpacity,
  ToastAndroid,
  StyleSheet,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useMemo, useState, useEffect, useContext } from 'react';
import AntDesign from 'react-native-vector-icons/AntDesign';
import { useNavigation, useTheme } from '@react-navigation/native';
import Ionicons from 'react-native-vector-icons/Ionicons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getPlaylistData } from '../../Api/Playlist';
import {
  SetLikedPlaylist,
  DeleteALikedPlaylist,
} from '../../LocalStorage/StoreLikedPlaylists';
import LinearGradient from 'react-native-linear-gradient';
import { Heading } from '../Global/Heading';
import { SmallText } from '../Global/SmallText';
import { PlayButton } from './PlayButton';
import { DownloadButton } from '../Global/DownloadButton';
import { useThemeContext } from '../../Context/ThemeContext';

// Helper to validate image URL or provide default
const getValidImageUrl = (url) => {
  if (
    !url ||
    url === 'null' ||
    url === 'undefined' ||
    typeof url !== 'string' ||
    url.trim() === ''
  ) {
    // Return a default image if URL is null/undefined/empty
    return require('../../Images/default.jpg');
  }
  return { uri: url };
};

export const PlaylistTopHeader = ({
  AnimatedRef,
  url,
  playlistId, // Original: for like button
  name, // Original: for like button data fetch if needed
  follower, // Original: for like button data fetch if needed
  style,

  // New props for details display
  detailsName, // Main title for display
  releaseYear, // Optional: for albums "Released in YYYY"
  songsData, // Array of songs for PlayButton & DownloadButton
  isAlbumScreen, // Boolean to conditionally show elements like releaseYear
  contentIdForPlayer, // ID for player context (playlistId or albumId)
  playerLoading, // Loading state for PlayButton
  isPlayingState, // isPlaying state for PlayButton
  onPlayPress, // Function to handle play button press
  updateLikedPlaylist, // Function to update liked playlists
}) => {
  const navigation = useNavigation();
  const { colors } = useTheme(); // For styling new text elements
  const { theme } = useThemeContext(); // For more specific theme access if needed by buttons
  const [liked, setLiked] = useState(false);

  const gradientColors = useMemo(() => {
    const topColor = 'rgba(0, 0, 0, 0)'; // Transparent black
    let bottomColor;
    if (theme === 'dark') {
      // For dark theme, a more subtle black shade
      bottomColor = 'rgba(0, 0, 0, 0.6)'; // Adjust opacity as needed
    } else {
      // For light theme, a more pronounced black shade
      bottomColor = 'rgba(0, 0, 0, 0.9)'; // Adjust opacity as needed
    }
    return [topColor, bottomColor];
  }, [theme]);

  // Get responsive dimensions for our image
  const width1 = Dimensions.get('window').width;
  const height1 = Dimensions.get('window').height;
  const responsiveStyles = {
    imageSize: width1 * 0.3, // Image size set to 30% of screen width
    imageRadius: 8,
    containerHeight: height1 * 0.4, // Container height set to 40% of screen height
  };

  // Check if this playlist is already liked
  useEffect(() => {
    const checkLiked = async () => {
      try {
        if (!playlistId) {
          return;
        }

        const playlists = await AsyncStorage.getItem('LikedPlaylists');
        if (playlists) {
          try {
            const parsedPlaylists = JSON.parse(playlists);
            if (parsedPlaylists && parsedPlaylists.playlist) {
              const isAlreadyLiked =
                parsedPlaylists.playlist[playlistId] !== undefined;
              setLiked(isAlreadyLiked);
            } else {
              // If wrong format, initialize correctly
              const initialData = {
                playlist: {},
                count: 0,
              };
              await AsyncStorage.setItem(
                'LikedPlaylists',
                JSON.stringify(initialData)
              );
              setLiked(false);
            }
          } catch (parseError) {
            console.error('Error parsing liked playlists:', parseError);
            // If there's a parse error, reset the storage with proper structure
            const initialData = {
              playlist: {},
              count: 0,
            };
            await AsyncStorage.setItem(
              'LikedPlaylists',
              JSON.stringify(initialData)
            );
            setLiked(false);
          }
        }
      } catch (error) {
        console.error('Error checking liked status:', error);
      }
    };
    checkLiked();
  }, [playlistId]);

  const ScrollOffset = useScrollViewOffset(AnimatedRef);

  // Animation style for the main image
  const AnimatedImageStyle = useAnimatedStyle(() => {
    const imageSize = responsiveStyles.imageSize;

    return {
      transform: [
        {
          translateY: interpolate(
            ScrollOffset.value,
            [-imageSize, 0, imageSize],
            [-imageSize / 2, 0, imageSize * 1.2]
          ),
        },
        {
          scale: interpolate(
            ScrollOffset.value,
            [imageSize, 0, imageSize],
            [0, 1, 0]
          ),
        },
      ],
    };
  });

  // Animation style for the background image
  const AnimatedImageStyle2 = useAnimatedStyle(() => {
    const imageSize = responsiveStyles.imageSize;

    return {
      transform: [
        {
          translateY: interpolate(
            ScrollOffset.value,
            [-imageSize, 0, imageSize],
            [0, 0, 0] // Fixed position - no movement on scroll
          ),
        },
        {
          scale: interpolate(
            ScrollOffset.value,
            [-imageSize, 0, imageSize],
            [1.05, 1.05, 1.05] // Consistent scale to ensure full coverage
          ),
        },
      ],
    };
  });

  const toggleLike = async () => {
    try {
      if (!playlistId) {
        return;
      }

      if (liked) {
        // Remove from liked playlists
        await DeleteALikedPlaylist(playlistId);
        ToastAndroid.show('Removed from Favorites', ToastAndroid.SHORT);
        // Update state first to give immediate feedback
        setLiked(false);
        // Then trigger the playlist refresh
        if (updateLikedPlaylist) {
          setTimeout(() => {
            updateLikedPlaylist();
          }, 100);
        }
      } else {
        // Add to liked playlists
        try {
          // If we don't have complete data, fetch it
          let playlistData = null;
          if (!name || !url) {
            playlistData = await getPlaylistData(playlistId);
          }

          const displayImage = url || playlistData?.data?.image || '';
          const displayName = name || playlistData?.data?.name || 'Playlist';
          const displayFollower =
            follower || playlistData?.data?.follower || '';

          // Add to liked playlists
          await SetLikedPlaylist(
            displayImage,
            displayName,
            displayFollower,
            playlistId
          );
          ToastAndroid.show('Added to Favorites', ToastAndroid.SHORT);
          // Update state first to give immediate feedback
          setLiked(true);
          // Then trigger the playlist refresh
          if (updateLikedPlaylist) {
            setTimeout(() => {
              updateLikedPlaylist();
            }, 100);
          }
        } catch (error) {
          console.error('Error liking playlist:', error);
          ToastAndroid.show('Failed to add to Favorites', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error('Error handling like/unlike:', error);
      ToastAndroid.show('Error updating favorites', ToastAndroid.SHORT);
    }
  };

  // Check if this is a playlist (not an album)
  const isPlaylist = playlistId && !playlistId.startsWith('album_');

  return (
    <View
      style={[
        {
          alignItems: 'center',
          justifyContent: 'center',
          height: responsiveStyles.containerHeight,
          maxHeight: height1 * 0.4, // Strictly limit to 40% of screen height
          backgroundColor: 'transparent', // Completely transparent to show the background image
          position: 'relative',
          paddingTop: 0, // No padding to maximize space
          marginTop: 0, // No margin to ensure exact sizing
          marginBottom: 0, // No margin to ensure exact sizing
          overflow: 'hidden', // Ensure content doesn't spill out
        },
        style, // Apply any additional styles passed as props
      ]}
    >
      {/* Back Button - Removed */}

      {/* Like Button - positioned at the top right of the component - only shown for playlists
      {isPlaylist && (
        <TouchableOpacity
          onPress={toggleLike}
          style={{
            position: "absolute",
            top: 16,
            right: 16,
            zIndex: 10,
            backgroundColor: "rgba(0,0,0,0.5)",
            borderRadius: 24,
            padding: 8,
          }}
        >
          <AntDesign
            name={liked ? "heart" : "hearto"}
            size={30}
            color={liked ? 'rgb(230, 28, 28)' : "#ffffff"}
          />
        </TouchableOpacity>
      )}
      */}

      {/* Background blurred image - only show if URL is provided */}
      {url && url.trim() !== '' && (
        <Animated.View
          style={[
            {
              height: responsiveStyles.containerHeight, // Use exact height from responsive styles
              maxHeight: height1 * 0.4, // Strictly limit to 40% of screen height
              width: '100%',
              position: 'absolute',
              top: 0, // Align with the top of the container
              left: 0,
              right: 0,
              zIndex: -1,
              overflow: 'hidden',
            },
            AnimatedImageStyle2,
          ]}
        >
          <FastImage
            source={getValidImageUrl(url)}
            style={{
              height: responsiveStyles.containerHeight, // Use exact height from responsive styles
              maxHeight: height1 * 0.4, // Strictly limit to 40% of screen height
              width: '100%',
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
            }}
            blurRadius={20} // Slightly reduced blur for better image clarity
            resizeMode={FastImage.resizeMode.cover}
          />
          {/* Add a gradient overlay for smoother transition */}
          <LinearGradient
            style={{
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 120, // Significantly increased height of the gradient overlay
            }}
            start={{ x: 0, y: 0 }}
            end={{ x: 0, y: 1 }}
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.7)']}
          />
          {/* Add a top gradient for better visibility of controls */}
          <LinearGradient
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              height: 80, // Top gradient for header controls
            }}
            start={{ x: 0, y: 1 }}
            end={{ x: 0, y: 0 }}
            colors={['rgba(0,0,0,0)', 'rgba(0,0,0,0.5)']}
          />
        </Animated.View>
      )}

      {/* Details Section: Title, Subtitle, Play/Download Buttons */}
      <View style={styles.detailsContainer}>
        <LinearGradient
          colors={gradientColors}
          start={{ x: 0.5, y: 0 }} // Gradient from top of its own bounds
          end={{ x: 0.5, y: 1 }} // to bottom of its own bounds
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0, // Stick to the bottom of detailsContainer
            height: 120, // Increased height of the shade effect
            // This gradient is the first child, subsequent children will render on top.
          }}
        />
        <View style={styles.detailsTextWrapper}>
          {detailsName && (
            <Heading
              text={detailsName}
              style={[styles.detailsTitle, { color: '#FFFFFF' }]}
              numberOfLines={2}
            />
          )}
          {isAlbumScreen && releaseYear && (
            <SmallText
              text={`Released in ${releaseYear}`}
              style={[styles.detailsSubtitle, { color: '#FFFFFF' }]}
            />
          )}
        </View>
        <View style={styles.detailsControlsWrapper}>
          {songsData && detailsName && (
            <DownloadButton
              songs={songsData}
              albumName={detailsName}
              size="normal"
            />
          )}
          {onPlayPress && (
            <PlayButton
              onPress={onPlayPress}
              Loading={playerLoading}
              isPlaying={isPlayingState}
              size="normal"
              playlistId={contentIdForPlayer} // Pass the relevant ID for player context
            />
          )}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  mainContainer: {
    // This style is applied dynamically along with responsiveStyles in the component
  },
  detailsContainer: {
    position: 'absolute',
    bottom: 0, // Removed bottom spacing
    left: 0,
    right: 0,
    paddingHorizontal: 20, // Horizontal padding for the details section
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 5, // Ensure details are above gradients if necessary
  },
  detailsTextWrapper: {
    flex: 1, // Allow text to take available space
    marginRight: 15, // Space between text and buttons
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: '800', // Made font weight more explicitly bold
    // Color is set dynamically using theme
  },
  detailsSubtitle: {
    fontSize: 14,
    opacity: 0.8,
    marginTop: 3,
    // Color is set dynamically using theme
  },
  detailsControlsWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 15, // Space between Download and Play buttons
  },
});
