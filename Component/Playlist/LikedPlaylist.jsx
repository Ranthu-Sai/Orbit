import { TouchableOpacity, StyleSheet, ToastAndroid, View } from 'react-native';
import AntDesign from 'react-native-vector-icons/AntDesign';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useContext, useEffect, useState } from 'react';
import Context from '../../Context/Context';
import { getPlaylistData } from '../../Api/Playlist';
import {
  SetLikedPlaylist,
  DeleteALikedPlaylist,
} from '../../LocalStorage/StoreLikedPlaylists';
import { useNavigation } from '@react-navigation/native';

export const LikedPlaylist = ({
  id = '',
  image = '',
  name = '',
  follower = '',
  size = 'normal',
  showNavigationButton = false,
}) => {
  const [isLiked, setIsLiked] = useState(false);
  const { updateLikedPlaylist } = useContext(Context);
  const navigation = useNavigation();

  // Increase icon size for better visibility
  const iconSize = size === 'large' ? 40 : size === 'small' ? 36 : 34;

  useEffect(() => {
    const checkLiked = async () => {
      try {
        if (!id) {
          return;
        }

        const playlists = await AsyncStorage.getItem('LikedPlaylists');
        if (playlists) {
          try {
            const parsedPlaylists = JSON.parse(playlists);
            if (parsedPlaylists && parsedPlaylists.playlist) {
              const isAlreadyLiked = parsedPlaylists.playlist[id] !== undefined;
              setIsLiked(isAlreadyLiked);
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
              setIsLiked(false);
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
            setIsLiked(false);
          }
        }
      } catch (error) {
        console.error('Error checking liked status:', error);
      }
    };
    checkLiked();
  }, [id]);

  async function HandleLike() {
    try {
      if (!id) {
        return;
      }

      if (isLiked) {
        // Remove from liked playlists using the proper function
        await DeleteALikedPlaylist(id);
        ToastAndroid.show('Removed from Likes', ToastAndroid.SHORT);
        // Update state first to give immediate feedback
        setIsLiked(false);
        // Then trigger the playlist refresh
        if (updateLikedPlaylist) {
          setTimeout(() => {
            updateLikedPlaylist();
          }, 100);
        }
      } else {
        // Add to liked playlists using the proper function
        try {
          const Data = await getPlaylistData(id);

          if (Data?.data) {
            // Use the proper function to add to liked playlists
            await SetLikedPlaylist(
              image || Data?.data?.image,
              name || Data?.data?.name || 'Playlist',
              follower || Data?.data?.follower || '',
              id
            );
            ToastAndroid.show('Added to Likes', ToastAndroid.SHORT);
            // Update state first to give immediate feedback
            setIsLiked(true);
            // Then trigger the playlist refresh
            if (updateLikedPlaylist) {
              setTimeout(() => {
                updateLikedPlaylist();
              }, 100);
            }
          } else {
            ToastAndroid.show('Failed to add to Likes', ToastAndroid.SHORT);
          }
        } catch (error) {
          console.error('Error liking playlist:', error);
          ToastAndroid.show('Failed to add to Likes', ToastAndroid.SHORT);
        }
      }
    } catch (error) {
      console.error('Error handling like/unlike:', error);
      ToastAndroid.show('Error updating likes', ToastAndroid.SHORT);
    }
  }

  // Update the navigation to Playlist screen to include previousScreen parameter
  const navigateToPlaylist = (playlistId, playlistData) => {
    navigation.navigate('PlaylistPage', {
      id: playlistId,
      source: 'LikedPlaylists',
      previousScreen: 'LikedPlaylists', // Add this parameter for proper back navigation
      data: playlistData,
      navigationSource: 'Library',
    });
  };

  // If this component is used as a navigation button to a playlist
  if (showNavigationButton) {
    return (
      <TouchableOpacity
        onPress={() => navigateToPlaylist(id, { id, image, name, follower })}
        style={[
          styles.container,
          size === 'small' ? styles.smallContainer : null,
        ]}
        activeOpacity={0.7}
      >
        <AntDesign name="arrowright" color="white" size={iconSize} />
      </TouchableOpacity>
    );
  }

  // Default behavior - like/unlike button
  return (
    <TouchableOpacity
      onPress={HandleLike}
      style={[
        styles.container,
        size === 'small' ? styles.smallContainer : null,
      ]}
      activeOpacity={0.7}
    >
      <AntDesign
        name={isLiked ? 'heart' : 'hearto'}
        color={isLiked ? 'rgb(227,97,97)' : 'white'}
        size={iconSize}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: 'rgba(0,0,0,0.5)',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.3,
    shadowRadius: 2,
  },
  smallContainer: {
    padding: 0,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0,0,0,0.3)',
    marginLeft: 15,
    marginRight: 5,
  },
});
