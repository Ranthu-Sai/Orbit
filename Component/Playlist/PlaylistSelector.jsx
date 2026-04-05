import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useTheme } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ToastAndroid,
  BackHandler,
  Dimensions,
  ScrollView,
} from 'react-native';
import {
  getUserPlaylists,
  addSongToPlaylist,
  createPlaylist,
} from '../../Utils/PlaylistManager';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');
const MAX_MODAL_HEIGHT = SCREEN_HEIGHT * 0.7;

// Default wave image for empty playlists
const DEFAULT_WAVE_IMAGE = require('../../Images/wav.png');

const staticStyles = StyleSheet.create({
  closeButton: {
    padding: 8,
  },
  playlistListContainer: {
    maxHeight: SCREEN_HEIGHT * 0.4,
  },
  playlistList: {
    padding: 16,
  },
  fallbackCover: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  waveImage: {
    width: 50,
    height: 50,
    borderRadius: 4,
  },
  playlistInfo: {
    flex: 1,
    marginLeft: 12,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  modalButton: {
    flex: 1,
    padding: 15,
    borderRadius: 8,
    alignItems: 'center',
    marginHorizontal: 8,
  },
  buttonText: {
    fontSize: 16,
    fontWeight: '500',
  },
});

const getDynamicStyles = (theme) =>
  StyleSheet.create({
    modalOverlay: {
      flex: 1,
      backgroundColor: theme.dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
      justifyContent: 'flex-end',
    },
    centeredModalOverlay: {
      flex: 1,
      backgroundColor: theme.dark ? 'rgba(0,0,0,0.7)' : 'rgba(0,0,0,0.5)',
      justifyContent: 'center',
      alignItems: 'center',
    },
    container: {
      width: '100%',
      maxHeight: MAX_MODAL_HEIGHT,
      backgroundColor: theme.colors.card,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: 16,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    title: {
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    },
    createNewButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 16,
      backgroundColor: theme.colors.card,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    createNewText: {
      marginLeft: 12,
      fontSize: 16,
      color: theme.colors.primary,
    },
    playlistItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 12,
      backgroundColor: theme.colors.background,
      borderRadius: 8,
      marginBottom: 8,
    },
    playlistCover: {
      width: 50,
      height: 50,
      borderRadius: 4,
      backgroundColor: theme.colors.border,
      overflow: 'hidden',
    },
    playlistName: {
      fontSize: 16,
      marginBottom: 4,
      color: theme.colors.text,
    },
    songCount: {
      color: theme.colors.textSecondary,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      marginTop: 16,
    },
    emptySubtext: {
      color: theme.colors.textSecondary,
      opacity: 0.7,
      marginTop: 8,
    },
    createPlaylistModalContent: {
      width: '85%',
      maxWidth: 400,
      backgroundColor: theme.colors.card,
      borderRadius: 12,
      padding: 20,
      elevation: 5,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      marginBottom: 16,
      textAlign: 'center',
      color: theme.colors.text,
    },
    cancelButton: {
      backgroundColor: theme.colors.border,
    },
    createButton: {
      backgroundColor: theme.colors.primary,
    },
  });

export const PlaylistSelector = ({ visible, onClose, song }) => {
  const theme = useTheme();
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');

  const styles = useMemo(() => getDynamicStyles(theme), [theme]);

  const getContrastingTextColor = useCallback(
    (hexColor) => {
      if (
        !hexColor ||
        typeof hexColor !== 'string' ||
        !/^#[0-9A-F]{6}$/i.test(hexColor)
      ) {
        return theme.colors.text;
      }
      const r = parseInt(hexColor.slice(1, 3), 16);
      const g = parseInt(hexColor.slice(3, 5), 16);
      const b = parseInt(hexColor.slice(5, 7), 16);
      const yiq = (r * 299 + g * 587 + b * 114) / 1000;
      return yiq >= 128
        ? theme.colors.black || '#000000'
        : theme.colors.white || '#FFFFFF';
    },
    [theme]
  );

  const loadPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      const userPlaylists = await getUserPlaylists();
      setPlaylists(userPlaylists);
    } catch (error) {
      console.error('Error loading playlists:', error);
      ToastAndroid.show('Failed to load playlists', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  }, []); // Dependencies: setIsLoading, setPlaylists, getUserPlaylists are stable

  useEffect(() => {
    if (visible) {
      loadPlaylists();
    }
  }, [visible, loadPlaylists]);

  useEffect(() => {
    const backAction = () => {
      if (showNewPlaylistModal) {
        setShowNewPlaylistModal(false);
        return true;
      }
      // If main modal is open (visible=true), but not the new playlist modal, then onClose will close it.
      // The BackHandler should consume the event if the main modal is visible.
      if (visible) {
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener(
      'hardwareBackPress',
      backAction
    );
    return () => backHandler.remove();
  }, [visible, showNewPlaylistModal, onClose, setShowNewPlaylistModal]);

  const handleAddToPlaylist = useCallback(
    async (playlistId) => {
      try {
        const success = await addSongToPlaylist(playlistId, song);
        if (success) {
          onClose();
        }
      } catch (error) {
        console.error('Error adding song to playlist:', error);
        ToastAndroid.show('Failed to add to playlist', ToastAndroid.SHORT);
      }
    },
    [song, onClose]
  ); // Dependencies: addSongToPlaylist, ToastAndroid.show, console.error are stable

  const handleCreateNewPlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return;
    }

    try {
      const createdPlaylist = await createPlaylist(newPlaylistName, song);
      if (createdPlaylist) {
        setShowNewPlaylistModal(false);
        setNewPlaylistName('');
        loadPlaylists(); // Refresh playlists after creating a new one
        onClose();
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    }
  }, [newPlaylistName, song, loadPlaylists, onClose]); // Dependencies: createPlaylist, setShowNewPlaylistModal, setNewPlaylistName, ToastAndroid.show, console.error are stable

  const renderPlaylistItem = useCallback(
    (item) => (
      <TouchableOpacity
        style={styles.playlistItem}
        onPress={() => handleAddToPlaylist(item.id)}
        key={item.id}
      >
        {item.coverImage ? (
          <FastImage
            source={{ uri: item.coverImage }}
            style={styles.playlistCover}
            defaultSource={DEFAULT_WAVE_IMAGE} // Keep defaultSource for FastImage if desired
          />
        ) : (
          <View style={[styles.playlistCover, staticStyles.fallbackCover]}>
            <FastImage
              source={DEFAULT_WAVE_IMAGE}
              style={staticStyles.waveImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
        )}
        <View style={staticStyles.playlistInfo}>
          <PlainText text={item.name} style={styles.playlistName} />
          <SmallText
            text={`${item.songs ? item.songs.length : 0} songs`}
            style={styles.songCount}
          />
        </View>
        <MaterialCommunityIcons
          name="plus-circle"
          size={24}
          color={theme.colors.primary}
        />
      </TouchableOpacity>
    ),
    [styles, handleAddToPlaylist, theme.colors.primary]
  ); // Dependencies: staticStyles, DEFAULT_WAVE_IMAGE are constants

  if (!visible) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="slide"
      onRequestClose={onClose} // Main modal closes via this or back button logic
    >
      <View style={styles.modalOverlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <PlainText text="Add to Playlist" style={styles.title} />
            <TouchableOpacity
              onPress={onClose}
              style={staticStyles.closeButton}
            >
              <MaterialCommunityIcons
                name="close"
                size={24}
                color={theme.colors.text}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.createNewButton}
            onPress={() => setShowNewPlaylistModal(true)}
          >
            <MaterialCommunityIcons
              name="playlist-plus"
              size={24}
              color={theme.colors.primary}
            />
            <PlainText
              text="Create New Playlist"
              style={styles.createNewText}
            />
          </TouchableOpacity>

          <ScrollView
            style={staticStyles.playlistListContainer}
            contentContainerStyle={staticStyles.playlistList}
            showsVerticalScrollIndicator={true}
          >
            {isLoading ? (
              <View style={staticStyles.emptyState}>
                <PlainText
                  text="Loading playlists..."
                  style={styles.emptyText}
                />
              </View>
            ) : playlists.length > 0 ? (
              playlists.map(renderPlaylistItem) // Use the memoized renderPlaylistItem
            ) : (
              <View style={staticStyles.emptyState}>
                <MaterialCommunityIcons
                  name="playlist-music"
                  size={48}
                  color={theme.colors.textSecondary}
                />
                <PlainText text="No playlists yet" style={styles.emptyText} />
                <SmallText
                  text="Create a new playlist to add this song"
                  style={styles.emptySubtext}
                />
              </View>
            )}
          </ScrollView>
        </View>
      </View>

      {/* New Playlist Modal */}
      <Modal
        visible={showNewPlaylistModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowNewPlaylistModal(false)} // Specific close for this modal
      >
        <View style={styles.centeredModalOverlay}>
          <View style={styles.createPlaylistModalContent}>
            <PlainText text="Create New Playlist" style={styles.modalTitle} />

            <TextInput
              style={[
                staticStyles.input,
                {
                  borderColor: theme.colors.border,
                  color: theme.colors.text,
                  backgroundColor: theme.colors.background,
                },
              ]}
              placeholder="Playlist Name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus
            />

            <View style={staticStyles.modalButtons}>
              <TouchableOpacity
                style={[staticStyles.modalButton, styles.cancelButton]}
                onPress={() => setShowNewPlaylistModal(false)}
              >
                <Text
                  style={[
                    staticStyles.buttonText,
                    { color: theme.colors.text },
                  ]}
                >
                  Cancel
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[staticStyles.modalButton, styles.createButton]}
                onPress={handleCreateNewPlaylist}
              >
                <Text
                  style={[
                    staticStyles.buttonText,
                    { color: getContrastingTextColor(theme.colors.primary) },
                  ]}
                >
                  Create
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </Modal>
  );
};
