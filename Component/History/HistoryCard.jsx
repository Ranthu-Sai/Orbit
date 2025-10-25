import React, { useState, useRef, useContext, memo } from 'react';
import { View, Pressable, StyleSheet, Dimensions, Modal, TouchableOpacity, Text, UIManager, findNodeHandle, ToastAndroid } from 'react-native';
import FastImage from 'react-native-fast-image';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { useTheme } from '@react-navigation/native';
import TrackPlayer from 'react-native-track-player';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import Context from '../../Context/Context';
import { PlayOneSong } from '../../MusicPlayerFunctions';
import { StorageManager } from '../../Utils/StorageManager';
import { UnifiedDownloadService } from '../../Utils/UnifiedDownloadService';
import { AddOneSongToPlaylist } from '../../MusicPlayerFunctions';
import historyManager from '../../Utils/HistoryManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const HistoryCard = memo(function HistoryCard({ historyItem, onRefresh }) {
  const { colors, dark } = useTheme();
  const styles = getThemedStyles(colors, dark);
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ top: 0, right: 20 });
  const [isDownloaded, setIsDownloaded] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [isDownloading, setIsDownloading] = useState(false);
  const buttonRef = useRef(null);
  const { setIndex } = useContext(Context);

  // Get current track info
  const currentTrack = useActiveTrack();
  const playerState = usePlaybackState();
  const isCurrentlyPlaying = currentTrack?.id === historyItem.id;
  const isPlaying = isCurrentlyPlaying && playerState.state === 'playing';
  const isPaused = isCurrentlyPlaying && playerState.state !== 'playing';

  // Format text helper
  const formatText = (text) => {
    if (!text) return 'Unknown';
    return text.length > 30 ? text.substring(0, 30) + '...' : text;
  };

  // Format play count
  const formatPlayCount = (count) => {
    if (count === 1) return '1 play';
    return `${count} plays`;
  };

  // Format listen duration
  const formatListenDuration = (duration) => {
    return historyManager.formatDuration(duration);
  };

  // Get artwork URI
  const getArtworkUri = () => {
    if (historyItem.artwork) {
      return historyItem.artwork;
    }
    return 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';
  };

  // Play song
  const playSong = async () => {
    try {
      const songData = {
        id: historyItem.id,
        title: historyItem.title,
        artist: historyItem.artist,
        artwork: historyItem.artwork,
        url: historyItem.url,
        duration: historyItem.duration,
        sourceType: historyItem.sourceType,
        isLocal: historyItem.isLocal,
        path: historyItem.path,
      };

      await PlayOneSong(songData);
      setIndex(1); // Open full screen player
    } catch (error) {
      console.error('Error playing song from history:', error);
      ToastAndroid.show('Error playing song', ToastAndroid.SHORT);
    }
  };

  // Show menu
  const showMenu = () => {
    if (buttonRef.current) {
      const handle = findNodeHandle(buttonRef.current);
      if (handle) {
        UIManager.measure(handle, (x, y, width, height, pageX, pageY) => {
          setMenuPosition({
            top: pageY + height,
            right: SCREEN_WIDTH - pageX - width,
          });
          setMenuVisible(true);
        });
      }
    }
  };

  // Play next
  const playNext = async () => {
    try {
      const songData = {
        id: historyItem.id,
        title: historyItem.title,
        artist: historyItem.artist,
        artwork: historyItem.artwork,
        url: historyItem.url,
        duration: historyItem.duration,
      };

      const queue = await TrackPlayer.getQueue();
      const currentIndex = await TrackPlayer.getCurrentTrack();

      if (currentIndex === null || queue.length === 0) {
        await TrackPlayer.reset();
        await TrackPlayer.add([songData]);
        await TrackPlayer.play();
      } else {
        await TrackPlayer.add(songData, currentIndex + 1);
      }

      setMenuVisible(false);
      ToastAndroid.show('Added to play next', ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error adding to play next:', error);
      ToastAndroid.show('Error adding to queue', ToastAndroid.SHORT);
    }
  };

  // Add to playlist
  const addToPlaylist = () => {
    try {
      const songData = {
        id: historyItem.id,
        title: historyItem.title,
        artist: historyItem.artist,
        artwork: historyItem.artwork,
        url: historyItem.url,
        duration: historyItem.duration,
      };

      AddOneSongToPlaylist(songData);
      setMenuVisible(false);
    } catch (error) {
      console.error('Error adding to playlist:', error);
      ToastAndroid.show('Error adding to playlist', ToastAndroid.SHORT);
    }
  };

  // Download song (only for online songs)
  const downloadSong = async () => {
    if (!historyItem?.id) {
      ToastAndroid.show('Invalid song data', ToastAndroid.SHORT);
      return;
    }

    try {
      // Check if already downloaded or downloading
      if (isDownloaded) {
        ToastAndroid.show('Song already downloaded', ToastAndroid.SHORT);
        return;
      }

      if (isDownloading) {
        ToastAndroid.show(`Download in progress: ${downloadProgress}%`, ToastAndroid.SHORT);
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);
      setMenuVisible(false);

      // Use the unified download service
      const success = await UnifiedDownloadService.downloadSong({
        ...historyItem,
        source: historyItem.source || 'saavn'
      }, (progress) => {
        setDownloadProgress(progress);
      });

      if (success) {
        setIsDownloaded(true);
        setDownloadProgress(100);
        ToastAndroid.show('Download completed', ToastAndroid.SHORT);
      } else {
        ToastAndroid.show('Download failed', ToastAndroid.SHORT);
      }

    } catch (error) {
      console.error('Download failed:', error);
      ToastAndroid.show(`Download failed: ${error.message}`, ToastAndroid.LONG);
    } finally {
      setIsDownloading(false);
    }
  };

  // Check if song is downloaded
  React.useEffect(() => {
    const checkDownloadStatus = async () => {
      if (historyItem.sourceType === 'online') {
        const downloaded = await StorageManager.isSongDownloaded(historyItem.id);
        setIsDownloaded(downloaded);
      }
    };
    checkDownloadStatus();
  }, [historyItem.id, historyItem.sourceType]);

  return (
    <View style={styles.container}>
      <Pressable 
        onPress={playSong}
        android_ripple={{ 
          color: dark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)',
          borderless: false,
          radius: SCREEN_WIDTH * 0.45
        }}
        style={styles.pressableContent}
      >
        <FastImage 
          source={
            isPlaying ? require('../../Images/playing.gif') :
            isPaused ? require('../../Images/songPaused.gif') : 
            { uri: getArtworkUri() }
          }
          style={styles.artwork}
          resizeMode={FastImage.resizeMode.cover}
        />
        
        <View style={styles.textContainer}>
          <PlainText 
            text={formatText(historyItem.title)}
            style={{ 
              color: isCurrentlyPlaying ? '#1ED760' : colors.text,
              fontSize: 15,
              fontWeight: isCurrentlyPlaying ? '600' : '500',
              marginBottom: 2
            }}
          />
          <SmallText 
            text={formatText(historyItem.artist)}
            style={[styles.artist, { color: colors.textSecondary }]}
          />
          <View style={styles.statsContainer}>
            <SmallText 
              text={formatPlayCount(historyItem.playCount)}
              style={[styles.stats, { color: colors.textSecondary }]}
            />
            <SmallText 
              text="•"
              style={[styles.stats, { color: colors.textSecondary, marginHorizontal: 6 }]}
            />
            <SmallText 
              text={formatListenDuration(historyItem.listenDuration)}
              style={[styles.stats, { color: colors.textSecondary }]}
            />
          </View>
        </View>
      </Pressable>
      
      <Pressable
        ref={buttonRef}
        onPress={showMenu}
        style={styles.menuButton}
      >
        <MaterialCommunityIcons name="dots-vertical" size={22} color={colors.text} />
      </Pressable>

      {/* Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setMenuVisible(false)}
        >
          <View style={[styles.menuContainer, { 
            top: menuPosition.top, 
            right: menuPosition.right,
            backgroundColor: colors.card,
            borderColor: colors.border,
          }]}>
            <TouchableOpacity style={styles.menuItem} onPress={playNext}>
              <MaterialIcons name="queue-music" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Play Next</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={styles.menuItem} onPress={addToPlaylist}>
              <MaterialIcons name="playlist-add" size={20} color={colors.text} />
              <Text style={[styles.menuText, { color: colors.text }]}>Add to Playlist</Text>
            </TouchableOpacity>
            
            {historyItem.sourceType === 'online' && !isDownloaded && (
              <TouchableOpacity style={styles.menuItem} onPress={downloadSong}>
                <MaterialIcons name="download" size={20} color={colors.text} />
                <Text style={[styles.menuText, { color: colors.text }]}>
                  {isDownloading ? `Downloading ${downloadProgress}%` : 'Download'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
});

const getThemedStyles = (colors, dark) => StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: colors.background,
  },
  pressableContent: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  artwork: {
    width: 50,
    height: 50,
    borderRadius: 4,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  artist: {
    fontSize: 13,
    marginBottom: 4,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stats: {
    fontSize: 11,
  },
  menuButton: {
    padding: 8,
    borderRadius: 16,
    marginLeft: 4,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  menuContainer: {
    position: 'absolute',
    borderRadius: 8,
    borderWidth: 1,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    minWidth: 150,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  menuText: {
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
});
