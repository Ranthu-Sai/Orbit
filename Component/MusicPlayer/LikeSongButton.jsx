import { useTheme } from "@react-navigation/native";
import AntDesign from "react-native-vector-icons/AntDesign";
import { memo, useContext, useEffect, useState, useRef, useCallback } from "react";
import { DeleteALikedSong, GetLikedSongs, SetLikedSongs } from "../../LocalStorage/StoreLikedSongs";
import { Animated, InteractionManager, ToastAndroid, DeviceEventEmitter } from "react-native";
import { IconButton } from "react-native-paper";
import Context from "../../Context/Context";

export const LikeSongButton = memo(function LikeSongButton({ size = 24, color }) {
  const { currentPlaying } = useContext(Context);
  const theme = useTheme();
  const [Liked, setLiked] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const isProcessingRef = useRef(false);

  const getIsLiked = useCallback(async () => {
    if (!currentPlaying?.id) return;
    const LikedSongs = await GetLikedSongs();
    setLiked(!!LikedSongs.songs[currentPlaying.id]);
  }, [currentPlaying]);

  const handlePress = useCallback(async () => {
    if (isProcessingRef.current || !currentPlaying?.id) return;

    // Button press animation
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.9,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 3,
        useNativeDriver: true,
      })
    ]).start();

    isProcessingRef.current = true;

    try {
      const LikedSongs = await GetLikedSongs();
      if (!LikedSongs.songs[currentPlaying.id]) {
        // Get the URL - handle both direct url and array format
        const songUrl = typeof currentPlaying.url === 'string'
          ? currentPlaying.url
          : (Array.isArray(currentPlaying.url) && currentPlaying.url.length > 0)
            ? (currentPlaying.url[0]?.url || currentPlaying.url[0])
            : '';

        // Get the image - handle both direct image and artwork property
        const songImage = currentPlaying.image || currentPlaying.artwork || '';

        // Only require essential fields: title, artist, id, and url
        if (currentPlaying.title && currentPlaying.artist && currentPlaying.id && songUrl) {
          await SetLikedSongs(
            currentPlaying.title,
            currentPlaying.artist,
            songImage,
            currentPlaying.id,
            songUrl,
            currentPlaying.duration || 0,
            currentPlaying.language || ''
          );
          setLiked(true);
          // Show success toast
          ToastAndroid.show(`Added "${currentPlaying.title}" to favorites`, ToastAndroid.SHORT);
          // Emit event to refresh favorites screen
          DeviceEventEmitter.emit('favorites-updated');
        } else {
          console.warn('Missing required fields for liking song:', {
            hasTitle: !!currentPlaying.title,
            hasArtist: !!currentPlaying.artist,
            hasId: !!currentPlaying.id,
            hasUrl: !!songUrl
          });
          ToastAndroid.show('Unable to add song to favorites', ToastAndroid.SHORT);
        }
      } else {
        await DeleteALikedSong(currentPlaying.id);
        setLiked(false);
        // Show removed toast
        ToastAndroid.show(`Removed "${currentPlaying.title}" from favorites`, ToastAndroid.SHORT);
        // Emit event to refresh favorites screen
        DeviceEventEmitter.emit('favorites-updated');
      }
    } catch (error) {
      console.error('Error toggling like:', error);
      ToastAndroid.show('Failed to update favorites', ToastAndroid.SHORT);
    } finally {
      setTimeout(() => {
        isProcessingRef.current = false;
      }, 300);
    }
  }, [currentPlaying, scaleAnim]);

  useEffect(() => {
    // PERFORMANCE: Defer AsyncStorage call until after animations complete
    const task = InteractionManager.runAfterInteractions(() => {
      getIsLiked();
    });
    return () => task.cancel();
  }, [currentPlaying, getIsLiked]);

  const iconSize = size || 20;

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <IconButton
        icon={() => (
          <AntDesign
            name={Liked ? "heart" : "hearto"}
            size={iconSize}
            color={Liked ? 'rgb(230, 28, 28)' : (color || theme.colors.text)}
          />
        )}
        size={32}
        onPress={handlePress}
        style={{ margin: 0, padding: 0 }}
        rippleColor="rgba(255, 255, 255, 0.2)"
      />
    </Animated.View>
  );
});
