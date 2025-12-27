import { useEffect, useState, useCallback, useRef } from "react";
import { View, Modal, TextInput, Pressable, Text, FlatList, StyleSheet, Animated, Easing, ToastAndroid, Dimensions, ScrollView, BackHandler } from "react-native";
import { GetCustomPlaylists, CreateCustomPlaylist } from "../../LocalStorage/CustomPlaylists";
import { GetLikedPlaylist } from "../../LocalStorage/StoreLikedPlaylists";
import { useTheme } from "@react-navigation/native";
import { Heading } from "../../Component/Global/Heading";
import { SmallText } from "../../Component/Global/SmallText";
import { Spacer } from "../../Component/Global/Spacer";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import { FileInput, Import } from "lucide-react-native";
import FastImage from "react-native-fast-image";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserPlaylists, createPlaylist, clearPlaylistCache, deletePlaylist, updatePlaylist } from "../../Utils/PlaylistManager";
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS } from '../../Utils/CacheConfig';
import { ImportPlaylistModal } from "../../Component/Playlist/ImportPlaylistModal";
import { DeviceEventEmitter, RefreshControl } from "react-native";
import { Playlist } from "../Playlist";
import { PlaylistListSkeleton } from "../../Component/Global/PlaylistListSkeleton";
import { PlaylistMenuDrawer } from "../../Component/Global/PlaylistMenuDrawer";


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import default wave image for empty playlists
const DEFAULT_WAVE_IMAGE = require('../../Images/wav.png');

export const CustomPlaylist = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [importModalVisible, setImportModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlists, setPlaylists] = useState({});
  const [hasPlaylists, setHasPlaylists] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [likedPlaylists, setLikedPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  // State for embedded playlist view
  const [showPlaylistDetail, setShowPlaylistDetail] = useState(false);
  const [selectedPlaylistId, setSelectedPlaylistId] = useState(null);
  const [selectedPlaylistData, setSelectedPlaylistData] = useState(null);

  // Track mount state
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // CACHE-FIRST LOADING for playlists
  const loadPlaylists = async (forceRefresh = false) => {
    if (!isMounted.current) return;

    const cacheKey = CACHE_KEYS.CUSTOM_PLAYLISTS;

    try {
      // Check cache first (unless force refresh) - HYBRID: RAM -> Disk
      if (!forceRefresh) {
        const cached = await CacheManager.getAsync(cacheKey);
        if (cached) {
          console.log('[CustomPlaylist] Using cached data - no API call needed');
          setPlaylists(cached.playlists || {});
          setUserPlaylists(cached.userPlaylists || []);
          setLikedPlaylists(cached.likedPlaylists || []);
          setHasPlaylists(cached.hasPlaylists || false);
          setLoading(false);
          return;
        }
      }

      // Only show loading on initial load
      if (isInitialLoad.current) {
        setLoading(true);
      }

      setError(null);
      console.log('[CustomPlaylist] Fetching playlist data...');

      // Load legacy custom playlists
      const customPlaylists = await GetCustomPlaylists();
      setPlaylists(customPlaylists);

      // Load user playlists from the new PlaylistManager
      const newUserPlaylists = await getUserPlaylists();
      console.log('Loaded user playlists:', newUserPlaylists?.length || 0);

      // Ensure we're setting a valid array to state
      if (Array.isArray(newUserPlaylists)) {
        setUserPlaylists(newUserPlaylists);
      } else {
        console.warn('User playlists is not an array:', newUserPlaylists);
        setUserPlaylists([]);
      }

      // Load liked playlists
      const likedPlaylistsData = await GetLikedPlaylist();

      // Convert liked playlists object to array (robust conversion)
      const filteredLikedPlaylists = Object.values(likedPlaylistsData.playlist || {})
        .filter(Boolean)
        .sort((a, b) => (a.count || 0) - (b.count || 0));

      console.log('Loaded liked playlists:', filteredLikedPlaylists.length);
      setLikedPlaylists(filteredLikedPlaylists);

      // Check if we have any playlists from all sources
      const hasAnyPlaylists =
        Object.keys(customPlaylists).length > 0 ||
        (Array.isArray(newUserPlaylists) && newUserPlaylists.length > 0) ||
        filteredLikedPlaylists.length > 0;

      setHasPlaylists(hasAnyPlaylists);

      // Cache the data
      if (isMounted.current) {
        CacheManager.set(cacheKey, {
          playlists: customPlaylists,
          userPlaylists: Array.isArray(newUserPlaylists) ? newUserPlaylists : [],
          likedPlaylists: filteredLikedPlaylists,
          hasPlaylists: hasAnyPlaylists
        }, CACHE_TTL.LIBRARY_DATA);
        console.log('[CustomPlaylist] Data cached');
      }
    } catch (error) {
      console.error('Error loading playlists:', error);
      setError('Failed to load playlists');
      ToastAndroid.show('Failed to load playlists', ToastAndroid.SHORT);
    } finally {
      if (isMounted.current) {
        setLoading(false);
        setRefreshing(false);
        isInitialLoad.current = false;
      }
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    // Hard refresh: Clear cache and force reload
    CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
    clearPlaylistCache();
    // Load fresh data
    loadPlaylists(true);
  }, []);

  const handleCreatePlaylist = async () => {
    if (playlistName.trim()) {
      try {
        // Use the PlaylistManager to create the playlist instead of legacy function
        const createdPlaylist = await createPlaylist(playlistName.trim());
        if (createdPlaylist) {
          setPlaylistName('');
          setModalVisible(false);
          await loadPlaylists();
          ToastAndroid.show('Playlist created successfully', ToastAndroid.SHORT);
        }
      } catch (error) {
        console.error('Error creating playlist:', error);
        ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
      }
    } else {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
    }
  };

  const onImportSuccess = useCallback(() => {
    console.log('Import successful, refreshing playlists...');
    // Clear cache and reload immediately
    CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
    clearPlaylistCache();
    loadPlaylists(true);
  }, []);

  // Listen for playlist updates (imports, creates, deletes)
  useEffect(() => {
    const subscription = DeviceEventEmitter.addListener('playlist-updated', () => {
      console.log('Playlist update event received, refreshing...');
      CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
      clearPlaylistCache();
      loadPlaylists(true);
    });

    loadPlaylists(false);

    return () => {
      isMounted.current = false;
      subscription.remove();
    };
  }, []);

  // Removed BackHandler - let RootRoute handle navigation

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });



  // Delete playlist - receives playlist data directly from drawer callback
  const handleMenuDelete = async (playlist) => {
    if (!playlist) {
      console.log('No playlist data received for delete');
      return;
    }

    console.log('Deleting playlist:', playlist.name, 'type:', playlist.type);

    try {
      if (playlist.type === 'user') {
        // Use proper file-based delete from PlaylistManager
        const success = await deletePlaylist(playlist.id);
        if (success) {
          // Invalidate cache and reload
          CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
          loadPlaylists(true);
        }
      } else if (playlist.type === 'legacy') {
        // Delete legacy playlist from AsyncStorage
        const customPlaylists = await GetCustomPlaylists();
        delete customPlaylists[playlist.name];
        await AsyncStorage.setItem('CustomPlaylists', JSON.stringify(customPlaylists));
        CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
        ToastAndroid.show('Playlist deleted', ToastAndroid.SHORT);
        loadPlaylists(true);
      } else if (playlist.type === 'liked') {
        ToastAndroid.show("Cannot delete liked playlists from here", ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error deleting playlist:', error);
      ToastAndroid.show('Failed to delete playlist', ToastAndroid.SHORT);
    }
  };

  // Rename playlist - receives playlist data directly from drawer callback
  const handleMenuRename = (playlist) => {
    if (!playlist) {
      console.log('No playlist data received for rename');
      return;
    }

    console.log('Renaming playlist:', playlist.name, 'type:', playlist.type);
    setSelectedPlaylist(playlist);
    setNewPlaylistName(playlist.name || '');
    setEditModalVisible(true);
  };

  const handleUpdatePlaylistName = async () => {
    if (!newPlaylistName.trim()) {
      ToastAndroid.show('Please enter a valid name', ToastAndroid.SHORT);
      return;
    }

    if (!selectedPlaylist) {
      ToastAndroid.show('No playlist selected', ToastAndroid.SHORT);
      return;
    }

    try {
      if (selectedPlaylist.type === 'user') {
        // Use proper file-based update from PlaylistManager
        const success = await updatePlaylist(selectedPlaylist.id, {
          name: newPlaylistName.trim()
        });

        if (success) {
          setEditModalVisible(false);
          CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
          ToastAndroid.show('Playlist renamed', ToastAndroid.SHORT);
          loadPlaylists(true);
        }
      } else if (selectedPlaylist.type === 'legacy') {
        // Rename legacy playlist in AsyncStorage
        const oldName = selectedPlaylist.name;
        const customPlaylists = await GetCustomPlaylists();
        const trimmedName = newPlaylistName.trim();

        if (customPlaylists[trimmedName] && trimmedName !== oldName) {
          ToastAndroid.show('Playlist with this name already exists', ToastAndroid.SHORT);
          return;
        }

        customPlaylists[trimmedName] = customPlaylists[oldName];
        if (trimmedName !== oldName) {
          delete customPlaylists[oldName];
        }

        await AsyncStorage.setItem('CustomPlaylists', JSON.stringify(customPlaylists));
        setEditModalVisible(false);
        CacheManager.invalidate(CACHE_KEYS.CUSTOM_PLAYLISTS);
        ToastAndroid.show('Playlist renamed', ToastAndroid.SHORT);
        loadPlaylists(true);
      }
    } catch (error) {
      console.error('Error renaming playlist:', error);
      ToastAndroid.show('Failed to rename playlist', ToastAndroid.SHORT);
    }
  };

  const handlePlaylistOptions = (playlist, event, type = 'legacy') => {
    // Normalize playlist data for the drawer
    let playlistData = null;

    if (type === 'legacy') {
      // Legacy 'playlist' arg is just the name (string)
      playlistData = {
        name: playlist,
        songs: playlists[playlist],
        type: 'legacy'
      };
    } else if (type === 'user') {
      // User 'playlist' arg is the full object
      playlistData = {
        ...playlist,
        type: 'user'
      };
    } else if (type === 'liked') {
      playlistData = {
        ...playlist,
        type: 'liked'
      };
    }

    setSelectedPlaylist(playlistData);
    setMenuVisible(true);
  };



  const renderPlaylist = ({ item, index }) => {
    const handlePlaylistPress = () => {
      const playlist = playlists[item];
      if (playlist) {
        navigation.navigate("CustomPlaylistView", {
          songs: playlist,
          playlistName: item,
          previousScreen: "CustomPlaylist"
        });
      }
    };

    // Get the last song's artwork for the playlist cover
    const getPlaylistCover = () => {
      const playlist = playlists[item];
      if (!playlist || playlist.length === 0) {
        return DEFAULT_WAVE_IMAGE;
      }

      // Get the last song in the playlist
      const lastSong = playlist[playlist.length - 1];
      const artwork = lastSong?.artwork || lastSong?.image;

      // If artwork exists and is a valid URL string, use it
      if (artwork && typeof artwork === 'string' && artwork.trim() !== '') {
        return { uri: artwork };
      }

      // Otherwise, use default image
      return DEFAULT_WAVE_IMAGE;
    };

    return (
      <Pressable
        style={styles.playlistItem}
        onPress={handlePlaylistPress}
        onLongPress={(e) => handlePlaylistOptions(item, e, 'legacy')}
        android_ripple={{ color: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)', borderless: false }}
      >
        <View style={styles.playlistCoverContainer}>
          <FastImage
            source={getPlaylistCover()}
            style={styles.playlistCover}
            resizeMode={FastImage.resizeMode.cover}
          />
        </View>
        <View style={styles.playlistDetails}>
          <Text style={[styles.playlistName, { color: theme.colors.text }]}>
            {item}
          </Text>
          <Text style={[styles.songCount, { color: theme.colors.textSecondary }]}>
            {playlists[item] ? playlists[item].length : 0} songs
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderUserPlaylist = ({ item, index }) => {
    // Reduce logging to avoid console spam
    // console.log(`Rendering user playlist: ${item.name} (${item.id})`);

    const handlePlaylistPress = () => {
      // Navigate to the playlist view with the songs from this playlist
      if (item.songs && item.songs.length > 0) {
        navigation.navigate("CustomPlaylistView", {
          songs: item.songs,
          playlistName: item.name,
          playlistId: item.id,
          previousScreen: "CustomPlaylist"
        });
      } else {
        ToastAndroid.show('This playlist is empty', ToastAndroid.SHORT);
      }
    };

    // Get the last song's artwork for the playlist cover
    const getPlaylistCover = () => {
      if (!item.songs || item.songs.length === 0) {
        return DEFAULT_WAVE_IMAGE;
      }

      // Get the last song in the playlist
      const lastSong = item.songs[item.songs.length - 1];
      const artwork = lastSong?.artwork || lastSong?.image;

      // If artwork exists and is a valid URL string, use it
      if (artwork && typeof artwork === 'string' && artwork.trim() !== '') {
        return { uri: artwork };
      }

      // Otherwise, use default image
      return DEFAULT_WAVE_IMAGE;
    };

    return (
      <Pressable
        style={styles.playlistItem}
        onPress={handlePlaylistPress}
        onLongPress={(e) => handlePlaylistOptions(item, e, 'user')}
        android_ripple={{ color: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)', borderless: false }}
      >
        <View style={styles.playlistCoverContainer}>
          <FastImage
            source={getPlaylistCover()}
            style={styles.playlistCover}
            resizeMode={FastImage.resizeMode.cover}
          />
        </View>
        <View style={styles.playlistDetails}>
          <Text style={[styles.playlistName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.songCount, { color: theme.colors.textSecondary }]}>
            {item.songs ? item.songs.length : 0} songs
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderLikedPlaylist = ({ item, index }) => {
    const handlePlaylistPress = () => {
      // Instead of navigating, toggle embedded view
      if (item.id) {
        // Check if it's a YouTube Music ID (typically starts with VL, PL, RD, OL, UC or is long)
        const isYT = item.id.length > 20 ||
          item.id.startsWith('PL') ||
          item.id.startsWith('VL') ||
          item.id.startsWith('RD') ||
          item.id.startsWith('OL') ||
          item.id.startsWith('UC');

        // Store playlist data for embedded view
        setSelectedPlaylistId(item.id);
        setSelectedPlaylistData({
          id: item.id,
          name: item.name,
          image: item.image,
          follower: item.follower,
          source: isYT ? 'ytmusic' : 'saavn',
        });
        setShowPlaylistDetail(true);
      } else {
        ToastAndroid.show('Invalid playlist', ToastAndroid.SHORT);
      }
    };

    // Extract image URL from various formats
    const getImageUrl = (imageData) => {
      if (!imageData) return null;
      if (typeof imageData === 'string') return imageData;
      if (Array.isArray(imageData) && imageData.length > 0) {
        return imageData[imageData.length - 1]?.url || imageData[0]?.url || null;
      }
      if (typeof imageData === 'object' && imageData.url) return imageData.url;
      return null;
    };

    const imageUrl = getImageUrl(item.image);

    return (
      <Pressable
        style={styles.playlistItem}
        onPress={handlePlaylistPress}
        onLongPress={(e) => handlePlaylistOptions(item, e, 'liked')}
        android_ripple={{ color: theme.dark ? 'rgba(255, 255, 255, 0.15)' : 'rgba(0, 0, 0, 0.05)', borderless: false }}
      >
        {imageUrl ? (
          <FastImage
            source={{ uri: imageUrl }}
            style={styles.playlistCover}
            resizeMode={FastImage.resizeMode.cover}
          />
        ) : (
          <View style={styles.playlistCoverContainer}>
            <FastImage
              source={DEFAULT_WAVE_IMAGE}
              style={styles.playlistCover}
              resizeMode={FastImage.resizeMode.cover}
            />
          </View>
        )}
        <View style={styles.playlistDetails}>
          <Text style={[styles.playlistName, { color: theme.colors.text }]}>
            {item.name}
          </Text>
          <Text style={[styles.songCount, { color: theme.colors.textSecondary }]}>
            {item.follower || 'Playlist'}
          </Text>
        </View>
      </Pressable>
    );
  };

  const renderPlaylists = () => {
    // Convert object keys to array for legacy playlists
    const playlistNames = Object.keys(playlists);
    const hasLegacyPlaylists = playlistNames.length > 0;
    const hasNewPlaylists = userPlaylists.length > 0;
    const hasLikedPlaylists = likedPlaylists.length > 0;

    if (loading) {
      return (
        <PlaylistListSkeleton count={10} />
      );
    }

    if (error) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="alert-circle-outline" size={64} color="#6E6E6E" />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            {error}
          </Text>
          <Pressable
            style={[styles.retryButton, { backgroundColor: theme.colors.primary }]}
            onPress={loadPlaylists}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      );
    }

    if (!hasLegacyPlaylists && !hasNewPlaylists && !hasLikedPlaylists) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialIcons name="playlist-add" size={64} color="#6E6E6E" />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            You don't have any playlists yet.
          </Text>
          <Spacer height={20} />
          <Pressable
            style={[styles.createButton, { backgroundColor: theme.colors.primary }]}
            onPress={() => setModalVisible(true)}
            android_ripple={{ color: 'rgba(255,255,255,0.2)' }}
          >
            <Text style={styles.createButtonText}>Create Playlist</Text>
          </Pressable>
        </View>
      );
    }

    // Render all playlists in one unified section
    return (
      <ScrollView
        style={styles.playlistsScrollContainer}
        contentContainerStyle={[styles.playlistsContentContainer, { paddingBottom: 150 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[theme.colors.primary]}
            progressBackgroundColor={theme.colors.card}
          />
        }
      >
        <View style={styles.playlistsSection}>
          {/* Render user-created playlists */}
          {userPlaylists.map((item, index) => (
            <View key={item.id || `user-playlist-${index}`}>
              {renderUserPlaylist({ item, index })}
            </View>
          ))}

          {/* Render liked/favorited playlists */}
          {likedPlaylists.map((item, index) => (
            <View key={item.id || `liked-playlist-${index}`}>
              {renderLikedPlaylist({ item, index: index + userPlaylists.length })}
            </View>
          ))}

          {/* Render legacy playlists */}
          {playlistNames.map((item, index) => (
            <View key={item || `legacy-playlist-${index}`}>
              {renderPlaylist({ item, index: index + userPlaylists.length + likedPlaylists.length })}
            </View>
          ))}
        </View>
      </ScrollView>
    );
  };

  // Add back handler to handle embedded view and library navigation
  useEffect(() => {
    const handleBack = () => {
      console.log('Back pressed in CustomPlaylist');

      // If showing playlist detail, return to list view
      if (showPlaylistDetail) {
        setShowPlaylistDetail(false);
        setSelectedPlaylistId(null);
        setSelectedPlaylistData(null);
        return true; // Prevent default back action
      }

      // Otherwise, navigate back to Library main screen
      navigation.navigate('Library', { screen: 'LibraryPage' });
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => backHandler.remove();
  }, [navigation, showPlaylistDetail]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      {/* Conditional rendering: Show playlist detail or list */}
      {showPlaylistDetail && selectedPlaylistData ? (
        <Playlist
          id={selectedPlaylistData.id}
          name={selectedPlaylistData.name}
          image={
            typeof selectedPlaylistData.image === 'string'
              ? selectedPlaylistData.image
              : Array.isArray(selectedPlaylistData.image)
                ? selectedPlaylistData.image[selectedPlaylistData.image.length - 1]?.url ||
                selectedPlaylistData.image[0]?.url || ''
                : selectedPlaylistData.image?.url || ''
          }
          follower={selectedPlaylistData.follower}
          source={selectedPlaylistData.source}
          isEmbedded={true}
          onBackPress={() => {
            setShowPlaylistDetail(false);
            setSelectedPlaylistId(null);
            setSelectedPlaylistData(null);
          }}
        />
      ) : (
        <>
          <View style={styles.header}>
            <Heading text="Playlists" nospace={true} style={{ marginLeft: 0, paddingLeft: 12, fontSize: 28, fontWeight: '900' }} />
            <View style={styles.headerButtons}>
              <Pressable
                style={styles.addButton}
                onPress={() => setImportModalVisible(true)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
              >
                <FileInput size={30} color={theme.colors.primary} />
              </Pressable>
              <Pressable
                style={styles.addButton}
                onPress={() => setModalVisible(true)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
              >
                <MaterialIcons name="playlist-add" size={30} color={theme.colors.primary} />
              </Pressable>
            </View>
          </View>

          <View style={[styles.content, { flex: 1 }]}>
            {renderPlaylists()}
          </View>
        </>
      )}

      {/* Import Playlist Modal */}
      <ImportPlaylistModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportSuccess={onImportSuccess}
      />

      {/* Options Menu Drawer */}
      <PlaylistMenuDrawer
        visible={menuVisible}
        onClose={() => setMenuVisible(false)}
        playlist={selectedPlaylist}
        onRename={handleMenuRename}
        onDelete={handleMenuDelete}
      />

      {/* Create Playlist Modal */}
      <Modal
        animationType="fade"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.backdrop || 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Heading text="Create New Playlist" />
            <SmallText text="Enter playlist name" style={[styles.modalLabel, { color: theme.colors.textSecondary || theme.colors.text }]} />
            <TextInput
              placeholder="Playlist name"
              placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.5)' : '#000000'}
              value={playlistName}
              onChangeText={setPlaylistName}
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.dark ? (theme.colors.input || theme.colors.border) : '#F0F0F0', borderColor: theme.colors.border }]}
              autoFocus
            />
            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createPlaylistButton, { backgroundColor: theme.colors.primary || '#1DB954' }]}
                onPress={handleCreatePlaylist}
              >
                <Text style={styles.createButtonText}>Create</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Playlist Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={editModalVisible}
        onRequestClose={() => setEditModalVisible(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: theme.colors.backdrop || 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.modalContent, { backgroundColor: theme.colors.card }]}>
            <Heading text="Edit Playlist Name" />
            <SmallText text="Enter new playlist name" style={[styles.modalLabel, { color: theme.colors.textSecondary || theme.colors.text }]} />
            <TextInput
              placeholder="Playlist name"
              placeholderTextColor={theme.dark ? 'rgba(255,255,255,0.5)' : '#000000'}
              value={newPlaylistName}
              onChangeText={setNewPlaylistName}
              style={[styles.input, { color: theme.colors.text, backgroundColor: theme.dark ? (theme.colors.input || theme.colors.border) : '#F0F0F0', borderColor: theme.colors.border }]}
              autoFocus
            />
            <View style={styles.modalButtonContainer}>
              <Pressable
                style={[styles.cancelButton, { backgroundColor: theme.colors.border }]}
                onPress={() => setEditModalVisible(false)}
              >
                <Text style={[styles.cancelButtonText, { color: theme.colors.text }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.createPlaylistButton, { backgroundColor: theme.colors.primary || '#1DB954' }]}
                onPress={handleUpdatePlaylistName}
              >
                <Text style={styles.createButtonText}>Update</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>

      {/* Import Playlist Modal */}
      <ImportPlaylistModal
        visible={importModalVisible}
        onClose={() => setImportModalVisible(false)}
        onImportSuccess={onImportSuccess}
      />

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 16,
    paddingLeft: 8,
    paddingRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  addButton: {
    padding: 10,
    borderRadius: 24,
    backgroundColor: 'rgba(255,255,255,0.07)',
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },

  content: {
    flex: 1,
    paddingHorizontal: 8,
  },
  contentContainer: {
    paddingBottom: 50, // Add padding for the minimized player
  },
  playlistsContainer: {
    flex: 1,
  },
  playlistsScrollContainer: {
    flex: 1,
  },
  playlistsContentContainer: {
    paddingBottom: 80, // Add padding for the minimized player
  },
  playlistsSection: {
    marginBottom: 20,
    paddingBottom: 8,
  },
  list: {
    flex: 0,
    height: 'auto',
  },
  playlistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16, // Match list style
    marginVertical: 0,
    borderRadius: 0,
    backgroundColor: 'transparent',
  },
  playlistIcon: {
    width: 50,
    height: 50,
    borderRadius: 8,
    backgroundColor: '#333',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  playlistCover: {
    width: 55,
    height: 55,
    borderRadius: 8,
    backgroundColor: '#333',
  },
  playlistCoverContainer: {
    width: 55,
    height: 55,
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#333',
  },
  playlistDetails: {
    flex: 1,
    marginLeft: 16,
  },
  playlistName: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 6,
  },
  songCount: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.7)',
  },
  optionsButton: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.7)',
  },
  modalContent: {
    width: '85%',
    maxWidth: 400,
    backgroundColor: '#1E1E1E',
    borderRadius: 12,
    padding: 20,
    elevation: 5,
  },
  modalLabel: {
    marginTop: 20,
    marginBottom: 10,
    color: 'rgba(255,255,255,0.7)',
    fontSize: 16,
  },
  input: {
    height: 50,
    borderWidth: 1,
    borderColor: '#333',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: 'white',
    backgroundColor: '#333',
    marginTop: 12,
    fontSize: 16,
  },
  modalButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  createPlaylistButton: {
    flex: 1,
    backgroundColor: '#1DB954',
    padding: 15,
    alignItems: 'center',
    borderRadius: 12,
    marginLeft: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: '#444',
    padding: 15,
    alignItems: 'center',
    borderRadius: 12,
    marginRight: 8,
  },
  createButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  cancelButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '500',
  },
  retryButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 20,
    marginTop: 16,
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: '600',
  },
  text: {
    fontSize: 12,
  },
  menuModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  menuContainer: {
    position: 'absolute',
    backgroundColor: '#1E1E1E',
    borderRadius: 8,
    overflow: 'hidden',
    width: 180,
    elevation: 5,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  menuItemText: {
    color: 'white',
    marginLeft: 12,
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyText: {
    fontSize: 16,
    color: 'rgba(255,255,255,0.7)',
    marginTop: 12,
    textAlign: 'center',
  },
  createButton: {
    backgroundColor: '#1DB954',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 20,
  },

});