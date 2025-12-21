import React, { useState, useRef } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Modal, TouchableOpacity, Text, UIManager, findNodeHandle } from 'react-native';
import FastImage from 'react-native-fast-image';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { useTheme } from '@react-navigation/native';
import TrackPlayer from 'react-native-track-player';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import { ToastAndroid } from 'react-native';
import { StorageManager } from '../../Utils/StorageManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const DownloadedSongCard = ({ song, refetch, onDeleteRequest }) => {
  const { colors, dark } = useTheme();
  const styles = getThemedStyles(colors, dark);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const buttonRef = useRef(null);

  // Extract song properties
  const {
    id,
    title: songTitle,
    artist: songArtist,
    name,
    artists,
    image,
    artwork,
    filePath,
    url,
    localFilePath,
    duration
  } = song || {};

  // Ensure we have values for title and artist
  const title = songTitle || name || 'Unknown Title';
  const artist = songArtist || artists || 'Unknown Artist';
  const artworkUri = image || artwork || 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';
  const songPath = filePath || url || localFilePath;

  const currentPlaying = useActiveTrack();
  const playerState = usePlaybackState();

  // Determine if this song is currently playing
  const isCurrentlyPlaying = currentPlaying?.id === id;
  const isPlaying = isCurrentlyPlaying && playerState?.state === 'playing';
  const isPaused = isCurrentlyPlaying && playerState?.state !== 'playing';

  // Format long titles and artist names
  const formatText = (text, maxLength = 25) => {
    if (!text) return '';
    return text.length > maxLength ? `${text.substring(0, maxLength)}...` : text;
  };

  // Play this downloaded song
  const playSong = async () => {
    try {
      // For downloaded songs, we need to check if the file actually exists
      if (!songPath) {
        console.error('Song file not found for id:', id);
        ToastAndroid.show('Song file not found', ToastAndroid.SHORT);
        return;
      }

      // Make sure the URL has the file:// prefix
      const fileUrl = typeof songPath === 'string' && songPath.startsWith('file://')
        ? songPath
        : `file://${songPath}`;

      console.log('Playing local song with URL:', fileUrl);

      // Prepare the track with all required properties
      const track = {
        id: id,
        url: fileUrl,
        title: title,
        artist: artist,
        artwork: artworkUri,
        duration: duration || 0,
        isLocal: true,
        isDownloaded: true
      };

      // If this song is already playing, just toggle play/pause
      if (isCurrentlyPlaying) {
        if (isPlaying) {
          await TrackPlayer.pause();
        } else {
          await TrackPlayer.play();
        }
        return;
      }

      // Otherwise play this song
      try {
        await TrackPlayer.reset();
        await TrackPlayer.add(track);
        await TrackPlayer.play();
      } catch (playError) {
        console.error('Error in TrackPlayer operations:', playError);
        ToastAndroid.show('Error playing song', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error playing downloaded song:', error);
      ToastAndroid.show('Error playing song', ToastAndroid.SHORT);
    }
  };

  // Show the options menu
  const showMenu = () => {
    if (buttonRef.current) {
      try {
        const handle = findNodeHandle(buttonRef.current);
        UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
          setMenuPosition({
            top: pageY + 40,
            right: 20
          });
          setMenuVisible(true);
        });
      } catch (error) {
        console.log('Error measuring button position:', error);
        // Fallback position
        setMenuPosition({ top: 100, right: 20 });
        setMenuVisible(true);
      }
    } else {
      setMenuVisible(true);
    }
  };

  // Close the menu
  const closeMenu = () => {
    setMenuVisible(false);
  };

  // Play this song next in queue
  const playNext = async () => {
    closeMenu();
    try {
      if (!songPath) {
        ToastAndroid.show('Song file not found', ToastAndroid.SHORT);
        return;
      }

      const fileUrl = typeof songPath === 'string' && songPath.startsWith('file://')
        ? songPath
        : `file://${songPath}`;

      const track = {
        id: id,
        url: fileUrl,
        title: title,
        artist: artist,
        artwork: artworkUri,
        duration: duration || 0,
        isLocal: true,
        isDownloaded: true
      };

      // Get current index
      const currentIndex = await TrackPlayer.getCurrentTrack();

      if (currentIndex === null) {
        // If no track is playing, just start playing this song
        await TrackPlayer.reset();
        await TrackPlayer.add(track);
        await TrackPlayer.play();
      } else {
        // Add right after current track
        await TrackPlayer.add(track, currentIndex + 1);
      }

      ToastAndroid.show(`${title} will play next`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error setting play next:', error);
      ToastAndroid.show('Error setting play next', ToastAndroid.SHORT);
    }
  };

  // Handle delete
  const handleDelete = () => {
    closeMenu();
    if (onDeleteRequest) {
      onDeleteRequest(id, title);
    }
  };

  return (
    <Pressable
      onPress={playSong}
      android_ripple={{
        color: dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)',
        borderless: false,
      }}
      style={styles.container}
    >
      <View style={styles.pressableContent}>
        <FastImage
          source={
            isPlaying ? require('../../Images/playing.gif') :
              isPaused ? require('../../Images/songPaused.gif') :
                { uri: artworkUri }
          }
          style={styles.artwork}
          resizeMode={FastImage.resizeMode.cover}
        />

        <View style={styles.textContainer}>
          <PlainText
            text={formatText(title)}
            style={{
              color: isCurrentlyPlaying ? '#1ED760' : colors.text,
              fontSize: 15,
              fontWeight: isCurrentlyPlaying ? '600' : '500',
              marginBottom: 2
            }}
          />
          <SmallText
            text={formatText(artist)}
            style={[styles.artist, { color: colors.textSecondary }]}
          />
        </View>
      </View>

      <Pressable
        ref={buttonRef}
        onPress={(e) => {
          e.stopPropagation();
          showMenu();
        }}
        style={{
          padding: 8,
          backgroundColor: 'transparent',
          borderRadius: 16,
          marginLeft: 4,
          elevation: 0,
        }}
      >
        <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
      </Pressable>

      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={closeMenu}
      >
        <Pressable style={styles.modalOverlay} onPress={closeMenu}>
          <View style={[styles.menuContainer, { top: menuPosition.top, right: menuPosition.right }]}>
            <TouchableOpacity style={styles.menuItem} onPress={playNext}>
              <MaterialCommunityIcons name="play-speed" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Play next</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem} onPress={handleDelete}>
              <MaterialCommunityIcons name="delete-outline" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Delete</Text>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </Pressable>
  );
};

const getThemedStyles = (colors, dark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    marginHorizontal: 10,
    marginVertical: 2, // Reduced bottom margin
    borderRadius: 8,
    backgroundColor: colors.background // Or transparent if preferred, but card might be better for light theme
  },
  pressableContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingLeft: 4
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: colors.border
  },
  textContainer: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2
  },
  activeTitle: {
    color: '#1ED760', // Spotify green
    fontWeight: '600'
  },
  artist: {
    color: colors.textSecondary,
    fontSize: 13
  },
  optionsButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 2
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: dark ? 'rgba(0,0,0,0.5)' : 'rgba(0,0,0,0.2)',
  },
  menuContainer: {
    position: 'absolute',
    right: 20,
    backgroundColor: colors.card,
    borderRadius: 8,
    padding: 8,
    minWidth: 160,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
  },
  menuText: {
    color: colors.text,
    marginLeft: 10,
    fontSize: 14,
  },
}); 