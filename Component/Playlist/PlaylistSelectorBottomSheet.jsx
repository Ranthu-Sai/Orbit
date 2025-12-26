import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useTheme } from '@react-navigation/native';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, ToastAndroid, BackHandler, Dimensions, Keyboard, Platform } from 'react-native';
import BottomSheet, { BottomSheetView, BottomSheetTextInput, BottomSheetScrollView } from '@gorhom/bottom-sheet';
import { getUserPlaylists, addSongToPlaylist, createPlaylist } from '../../Utils/PlaylistManager';
import { PlainText } from '../Global/PlainText';
import { SmallText } from '../Global/SmallText';
import FastImage from 'react-native-fast-image';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const DEFAULT_WAVE_IMAGE = require('../../Images/wav.png');

export const PlaylistSelectorBottomSheet = ({ visible, onClose, song }) => {
  // All hooks must be called in the same order on every render
  // 1. useTheme (useContext)
  const theme = useTheme();

  // 2. All useRef hooks together
  const bottomSheetRef = useRef(null);
  const inputRef = useRef(null);

  // 3. All useState hooks together
  const [playlists, setPlaylists] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showNewPlaylistModal, setShowNewPlaylistModal] = useState(false);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  // 4. useMemo hooks
  const snapPoints = useMemo(() => {
    if (showNewPlaylistModal && keyboardHeight > 0) {
      return ['90%'];
    }
    return ['70%'];
  }, [showNewPlaylistModal, keyboardHeight]);

  // 5. useCallback hooks
  const handleSheetChanges = useCallback((index) => {
    if (index === -1) {
      onClose();
    }
  }, [onClose]);

  const loadPlaylists = useCallback(async () => {
    try {
      setIsLoading(true);
      const userPlaylists = await getUserPlaylists();
      setPlaylists([...userPlaylists].reverse());
    } catch (error) {
      console.error('Error loading playlists:', error);
      ToastAndroid.show('Failed to load playlists', ToastAndroid.SHORT);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleAddToPlaylist = useCallback(async (playlistId) => {
    try {
      const success = await addSongToPlaylist(playlistId, song);
      if (success) {
        onClose();
      }
    } catch (error) {
      console.error('Error adding song to playlist:', error);
      ToastAndroid.show('Failed to add to playlist', ToastAndroid.SHORT);
    }
  }, [song, onClose]);

  const handleCreatePlaylist = useCallback(async () => {
    if (!newPlaylistName.trim()) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return;
    }

    try {
      const newPlaylist = await createPlaylist(newPlaylistName.trim());
      if (newPlaylist) {
        await loadPlaylists();
        await handleAddToPlaylist(newPlaylist.id);
        setNewPlaylistName('');
        setShowNewPlaylistModal(false);
      }
    } catch (error) {
      console.error('Error creating playlist:', error);
      ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    }
  }, [newPlaylistName, handleAddToPlaylist, loadPlaylists]);

  const handleShowNewPlaylistModal = useCallback(() => {
    setShowNewPlaylistModal(true);
    setTimeout(() => {
      inputRef.current?.focus();
    }, 150);
  }, []);

  const renderPlaylistItem = useCallback((item) => (
    <TouchableOpacity
      key={item.id}
      style={styles.playlistItem}
      onPress={() => handleAddToPlaylist(item.id)}
      activeOpacity={0.7}
    >
      <FastImage
        source={item.coverImage ? { uri: item.coverImage } : DEFAULT_WAVE_IMAGE}
        style={styles.playlistImage}
        resizeMode={FastImage.resizeMode.cover}
      />
      <View style={styles.playlistInfo}>
        <PlainText text={item.name} style={[styles.playlistName, { color: theme.colors.text }]} />
        <SmallText text={`${item.songs ? item.songs.length : 0} songs`} style={[styles.songCount, { color: theme.colors.textSecondary }]} />
      </View>
      <MaterialCommunityIcons name="plus-circle" size={24} color={theme.colors.primary} />
    </TouchableOpacity>
  ), [handleAddToPlaylist, theme.colors]);

  // 6. All useEffect hooks together
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      }
    );
    const keyboardDidHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardDidShowListener.remove();
      keyboardDidHideListener.remove();
    };
  }, []);

  useEffect(() => {
    if (showNewPlaylistModal && keyboardHeight > 0) {
      bottomSheetRef.current?.snapToIndex(0);
    }
  }, [showNewPlaylistModal, keyboardHeight]);

  useEffect(() => {
    console.log('📱 PlaylistSelectorBottomSheet visibility changed:', visible);
    if (visible) {
      console.log('📱 Loading playlists and expanding bottom sheet...');
      loadPlaylists();
      setTimeout(() => {
        console.log('📱 Attempting to expand bottom sheet...');
        bottomSheetRef.current?.expand();
      }, 100);
    } else {
      console.log('📱 Closing bottom sheet...');
      bottomSheetRef.current?.close();
    }
  }, [visible, loadPlaylists]);

  useEffect(() => {
    const handleBackPress = () => {
      if (visible) {
        if (showNewPlaylistModal) {
          setShowNewPlaylistModal(false);
          setNewPlaylistName('');
          return true;
        }
        onClose();
        return true;
      }
      return false;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBackPress);
    return () => backHandler.remove();
  }, [visible, onClose, showNewPlaylistModal]);

  return (
    <BottomSheet
      ref={bottomSheetRef}
      index={visible ? 0 : -1}
      snapPoints={snapPoints}
      onChange={handleSheetChanges}
      enablePanDownToClose={true}
      keyboardBehavior="extend"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      backgroundStyle={{ backgroundColor: theme.colors.card }}
      handleIndicatorStyle={{ backgroundColor: theme.colors.text }}
    >
      <View style={[styles.container, { backgroundColor: theme.colors.card }]}>
        <View style={styles.header}>
          <PlainText text="Add to Playlist" style={[styles.title, { color: theme.colors.text }]} />
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <MaterialCommunityIcons name="close" size={24} color={theme.colors.text} />
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={[styles.createNewButton, { backgroundColor: theme.colors.background }]}
          onPress={handleShowNewPlaylistModal}
        >
          <MaterialCommunityIcons name="playlist-plus" size={24} color={theme.colors.primary} />
          <PlainText text="Create New Playlist" style={[styles.createNewText, { color: theme.colors.primary }]} />
        </TouchableOpacity>

        {/* Use BottomSheetScrollView for proper scrolling inside bottom sheet */}
        <BottomSheetScrollView
          style={styles.playlistListContainer}
          contentContainerStyle={styles.playlistList}
          showsVerticalScrollIndicator={true}
          keyboardShouldPersistTaps="handled"
        >
          {isLoading ? (
            <View style={styles.emptyState}>
              <PlainText text="Loading playlists..." style={[styles.emptyText, { color: theme.colors.textSecondary }]} />
            </View>
          ) : playlists.length > 0 ? (
            playlists.map(renderPlaylistItem)
          ) : (
            <View style={styles.emptyState}>
              <MaterialCommunityIcons name="playlist-music" size={48} color={theme.colors.textSecondary} />
              <PlainText text="No playlists yet" style={[styles.emptyText, { color: theme.colors.textSecondary }]} />
              <SmallText text="Create a new playlist to add this song" style={[styles.emptySubtext, { color: theme.colors.textSecondary }]} />
            </View>
          )}
        </BottomSheetScrollView>

        {/* New Playlist Modal - Positioned at top for keyboard visibility */}
        {showNewPlaylistModal && (
          <View style={[
            styles.newPlaylistModal,
            {
              backgroundColor: theme.colors.background,
              paddingTop: 60,
            }
          ]}>
            <PlainText text="Create New Playlist" style={[styles.modalTitle, { color: theme.colors.text }]} />
            <BottomSheetTextInput
              ref={inputRef}
              style={[styles.textInput, {
                backgroundColor: theme.colors.card,
                color: theme.colors.text,
                borderColor: theme.colors.border
              }]}
              placeholder="Enter playlist name"
              placeholderTextColor={theme.colors.textSecondary}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              autoFocus={true}
              onSubmitEditing={handleCreatePlaylist}
              returnKeyType="done"
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.border }]}
                onPress={() => {
                  setShowNewPlaylistModal(false);
                  setNewPlaylistName('');
                  Keyboard.dismiss();
                }}
              >
                <PlainText text="Cancel" style={[styles.modalButtonText, { color: theme.colors.text }]} />
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, { backgroundColor: theme.colors.primary }]}
                onPress={handleCreatePlaylist}
              >
                <PlainText text="Create" style={[styles.modalButtonText, { color: 'white' }]} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </View>
    </BottomSheet>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  closeButton: {
    padding: 4,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginVertical: 12,
    borderRadius: 12,
  },
  createNewText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '600',
  },
  playlistListContainer: {
    flex: 1,
  },
  playlistList: {
    paddingBottom: 20,
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  playlistImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  playlistInfo: {
    flex: 1,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 2,
  },
  songCount: {
    fontSize: 14,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 12,
  },
  emptySubtext: {
    fontSize: 14,
    marginTop: 4,
    textAlign: 'center',
  },
  newPlaylistModal: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  textInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
});
