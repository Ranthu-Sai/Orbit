import { useEffect, useState, useCallback, useRef } from "react";
import { View, Modal, TextInput, Pressable, Text, FlatList, StyleSheet, Animated, Easing, ToastAndroid, Dimensions, ScrollView, BackHandler } from "react-native";
import { GetCustomPlaylists, CreateCustomPlaylist } from "../../LocalStorage/CustomPlaylists";
import { useTheme } from "@react-navigation/native";
import { Heading } from "../../Component/Global/Heading";
import { SmallText } from "../../Component/Global/SmallText";
import { Spacer } from "../../Component/Global/Spacer";
import MaterialIcons from "react-native-vector-icons/MaterialIcons";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import FastImage from "react-native-fast-image";
import { useNavigation } from "@react-navigation/native";
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getUserPlaylists, createPlaylist, clearPlaylistCache } from "../../Utils/PlaylistManager";
import { CacheManager } from '../../Utils/NavigationCacheManager';
import { CACHE_TTL, CACHE_KEYS } from '../../Utils/CacheConfig';


const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Import default wave image for empty playlists
const DEFAULT_WAVE_IMAGE = require('../../Images/wav.png');

export const CustomPlaylist = () => {
  const navigation = useNavigation();
  const theme = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [playlistName, setPlaylistName] = useState('');
  const [playlists, setPlaylists] = useState({});
  const [hasPlaylists, setHasPlaylists] = useState(false);
  const [userPlaylists, setUserPlaylists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [animationsInitialized, setAnimationsInitialized] = useState(false);

  const [animationValues] = useState({
    translateY: new Map(),
    opacity: new Map()
  });

  // Track mount state
  const isMounted = useRef(true);
  const isInitialLoad = useRef(true);

  // Initialize animation value for an item if it doesn't exist
  const getAnimationValues = (id, index) => {
    const key = id || `item-${index}`;

    if (!animationValues.translateY.has(key)) {
      animationValues.translateY.set(key, new Animated.Value(20));
      animationValues.opacity.set(key, new Animated.Value(0));
    }

    return {
      translateY: animationValues.translateY.get(key),
      opacity: animationValues.opacity.get(key)
    };
  };

  // CACHE-FIRST LOADING for playlists
  const loadPlaylists = async (forceRefresh = false) => {
    if (!isMounted.current) return;

    const cacheKey = CACHE_KEYS.CUSTOM_PLAYLISTS;

    try {
      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cached = CacheManager.get(cacheKey);
        if (cached) {
          console.log('[CustomPlaylist] Using cached data - no API call needed');
          setPlaylists(cached.playlists || {});
          setUserPlaylists(cached.userPlaylists || []);
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

      // Check if we have any playlists from either source
      const hasAnyPlaylists =
        Object.keys(customPlaylists).length > 0 ||
        (Array.isArray(newUserPlaylists) && newUserPlaylists.length > 0);

      setHasPlaylists(hasAnyPlaylists);

      // Cache the data
      if (isMounted.current) {
        CacheManager.set(cacheKey, {
          playlists: customPlaylists,
          userPlaylists: Array.isArray(newUserPlaylists) ? newUserPlaylists : [],
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
        isInitialLoad.current = false;
      }
    }
  };

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

  // Run animations once when playlists are loaded
  useEffect(() => {
    if ((userPlaylists.length > 0 || Object.keys(playlists).length > 0) && !animationsInitialized) {
      // Animate user playlists
      userPlaylists.forEach((item, index) => {
        const key = item.id || `item-${index}`;
        const vals = getAnimationValues(key, index);

        Animated.timing(vals.translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          delay: index * 100,
          useNativeDriver: true,
        }).start();

        Animated.timing(vals.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 100,
          useNativeDriver: true,
        }).start();
      });

      // Animate legacy playlists
      Object.keys(playlists).forEach((item, index) => {
        const key = item;
        const vals = getAnimationValues(key, index);

        Animated.timing(vals.translateY, {
          toValue: 0,
          duration: 300,
          easing: Easing.out(Easing.cubic),
          delay: index * 100 + (userPlaylists.length * 100), // Start after user playlists
          useNativeDriver: true,
        }).start();

        Animated.timing(vals.opacity, {
          toValue: 1,
          duration: 300,
          delay: index * 100 + (userPlaylists.length * 100),
          useNativeDriver: true,
        }).start();
      });

      setAnimationsInitialized(true);
    }
  }, [userPlaylists, playlists, animationsInitialized, animationValues]);

  // NO useFocusEffect - only load on mount (instant back navigation)
  // Pull-to-refresh is the way to force refresh
  useEffect(() => {
    loadPlaylists(false);

    return () => {
      isMounted.current = false;
    };
  }, []);

  // Removed BackHandler - let RootRoute handle navigation

  const [editModalVisible, setEditModalVisible] = useState(false);
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [menuVisible, setMenuVisible] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });



  const handleDeletePlaylist = async (playlistName) => {
    const customPlaylists = await GetCustomPlaylists();
    delete customPlaylists[playlistName];
    await AsyncStorage.setItem('CustomPlaylists', JSON.stringify(customPlaylists));
    loadPlaylists();
    setMenuVisible(false);
    ToastAndroid.show('Playlist deleted', ToastAndroid.SHORT);
  };

  const handleDeleteUserPlaylist = async (playlistId) => {
    try {
      // Get existing playlists
      const allPlaylists = await getUserPlaylists();

      // Filter out the playlist to delete
      const updatedPlaylists = allPlaylists.filter(p => p.id !== playlistId);

      // Save the updated playlists - await to ensure operation completes
      await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));

      // Clear playlist cache to ensure fresh data
      clearPlaylistCache();

      // Close modal first
      setMenuVisible(false);

      // Show feedback
      ToastAndroid.show('Playlist deleted', ToastAndroid.SHORT);

      // Reload playlists after a short delay to ensure AsyncStorage is updated
      setTimeout(() => {
        loadPlaylists();
      }, 300);
    } catch (error) {
      console.error('Error deleting user playlist:', error);
      ToastAndroid.show('Failed to delete playlist', ToastAndroid.SHORT);
      setMenuVisible(false);
    }
  };

  const handleEditPlaylist = () => {
    // For user playlists, get the name; for legacy playlists, use the name directly
    const nameToEdit = typeof selectedPlaylist === 'object' ? selectedPlaylist.name : selectedPlaylist;
    setNewPlaylistName(nameToEdit);
    setEditModalVisible(true);
    setMenuVisible(false);
  };

  const handleUpdatePlaylistName = async () => {
    if (!newPlaylistName.trim()) {
      ToastAndroid.show('Please enter a valid name', ToastAndroid.SHORT);
      return;
    }

    try {
      // Handle updating user playlist vs legacy playlist
      if (typeof selectedPlaylist === 'object' && selectedPlaylist.id) {
        // This is a user playlist object
        const userPlaylists = await getUserPlaylists();
        const playlistIndex = userPlaylists.findIndex(p => p.id === selectedPlaylist.id);

        if (playlistIndex !== -1) {
          // Update the name
          userPlaylists[playlistIndex].name = newPlaylistName.trim();
          userPlaylists[playlistIndex].lastModified = Date.now();

          // Save updated playlists
          await AsyncStorage.setItem('userPlaylists', JSON.stringify(userPlaylists));
          loadPlaylists();
          setEditModalVisible(false);
          ToastAndroid.show('Playlist name updated', ToastAndroid.SHORT);
        }
      } else if (typeof selectedPlaylist === 'string') {
        // This is a legacy playlist name
        const customPlaylists = await GetCustomPlaylists();
        customPlaylists[newPlaylistName] = customPlaylists[selectedPlaylist];
        delete customPlaylists[selectedPlaylist];

        await AsyncStorage.setItem('CustomPlaylists', JSON.stringify(customPlaylists));
        loadPlaylists();
        setEditModalVisible(false);
        ToastAndroid.show('Playlist name updated', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Error updating playlist name:', error);
      ToastAndroid.show('Failed to update playlist name', ToastAndroid.SHORT);
    }
  };

  const handlePlaylistOptions = (playlist, event) => {
    // Set the selected playlist - could be an object (user playlist) or string (legacy playlist)
    setSelectedPlaylist(playlist);

    // Position the menu near the three dots
    setMenuPosition({
      x: event.nativeEvent.pageX - 150, // Position menu to the left of touch point
      y: event.nativeEvent.pageY - 20,  // Position slightly above touch point
    });

    // Show the menu
    setMenuVisible(true);
  };



  const renderPlaylist = ({ item, index }) => {
    // Use the pre-calculated animation values
    const animations = getAnimationValues(item, index);

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

    return (
      <Animated.View style={{ transform: [{ translateY: animations.translateY }], opacity: animations.opacity }}>
        <Pressable
          style={styles.playlistItem}
          onPress={handlePlaylistPress}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          <View style={styles.playlistCoverContainer}>
            <FastImage
              source={DEFAULT_WAVE_IMAGE}
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

          {/* Three-dot menu button */}
          <Pressable
            style={styles.optionsButton}
            onPress={(event) => handlePlaylistOptions(item, event)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };

  const renderUserPlaylist = ({ item, index }) => {
    // Reduce logging to avoid console spam
    // console.log(`Rendering user playlist: ${item.name} (${item.id})`);

    // Use the pre-calculated animation values
    const animations = getAnimationValues(item.id, index);

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

    return (
      <Animated.View style={{ transform: [{ translateY: animations.translateY }], opacity: animations.opacity, width: '100%' }}>
        <Pressable
          style={styles.playlistItem}
          onPress={handlePlaylistPress}
          android_ripple={{ color: theme.colors.card, borderless: false }}
        >
          {item.coverImage ? (
            <FastImage
              source={{ uri: item.coverImage }}
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
              {item.songs ? item.songs.length : 0} songs
            </Text>
          </View>

          {/* Three-dot menu button */}
          <Pressable
            style={styles.optionsButton}
            onPress={(event) => handlePlaylistOptions(item, event)}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialCommunityIcons name="dots-vertical" size={24} color={theme.colors.text} />
          </Pressable>
        </Pressable>
      </Animated.View>
    );
  };

  const renderPlaylists = () => {
    // Convert object keys to array for legacy playlists
    const playlistNames = Object.keys(playlists);
    const hasLegacyPlaylists = playlistNames.length > 0;
    const hasNewPlaylists = userPlaylists.length > 0;

    if (loading) {
      return (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="playlist-music" size={64} color="#6E6E6E" />
          <Text style={[styles.emptyText, { color: theme.colors.textSecondary }]}>
            Loading playlists...
          </Text>
        </View>
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

    if (!hasLegacyPlaylists && !hasNewPlaylists) {
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

    // Use manual rendering instead of nested FlatLists
    return (
      <ScrollView
        style={styles.playlistsScrollContainer}
        contentContainerStyle={styles.playlistsContentContainer}
      >
        {/* New Playlists Section */}
        {hasNewPlaylists && (
          <View style={styles.playlistsSection}>
            {/* <Heading text="Your Playlists" /> */}
            {userPlaylists.map((item, index) => (
              <View key={item.id || `user-playlist-${index}`}>
                {renderUserPlaylist({ item, index })}
              </View>
            ))}
          </View>
        )}

        {/* Legacy Playlists Section */}
        {hasLegacyPlaylists && (
          <View style={styles.playlistsSection}>
            {hasNewPlaylists && <Spacer height={20} />}
            <Heading text="Legacy Playlists" />
            {playlistNames.map((item, index) => (
              <View key={item || `legacy-playlist-${index}`}>
                {renderPlaylist({ item, index })}
              </View>
            ))}
          </View>
        )}
      </ScrollView>
    );
  };

  // Add a separate useEffect for loadPlaylists
  useEffect(() => {
    loadPlaylists();
  }, []);

  // Add back handler to ensure we go back to Library
  useEffect(() => {
    const handleBack = () => {
      console.log('Back pressed in CustomPlaylist');
      // Navigate back to Library main screen
      navigation.navigate('Library', { screen: 'LibraryPage' });
      return true; // Prevent default back action
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', handleBack);

    return () => backHandler.remove();
  }, [navigation]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={styles.header}>
        <Heading text="Your Playlists" />
        <View style={styles.headerButtons}>
          <Pressable
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
            android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: true, radius: 20 }}
          >
            <MaterialIcons name="playlist-add" size={30} color={theme.colors.primary} />
          </Pressable>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        showsVerticalScrollIndicator={true}
        contentContainerStyle={styles.contentContainer}
      >
        {renderPlaylists()}
      </ScrollView>

      {/* Options Menu Modal */}
      <Modal
        visible={menuVisible}
        transparent={true}
        onRequestClose={() => setMenuVisible(false)}
        animationType="fade"
      >
        <Pressable
          style={styles.menuModalOverlay}
          onPress={() => setMenuVisible(false)}
        >
          <View
            style={[
              styles.menuContainer,
              {
                top: menuPosition.y,
                left: menuPosition.x
              }
            ]}
          >
            <Pressable
              style={styles.menuItem}
              onPress={handleEditPlaylist}
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            >
              <MaterialIcons name="edit" size={24} color="white" />
              <Text style={styles.menuItemText}>Rename</Text>
            </Pressable>
            <Pressable
              style={styles.menuItem}
              onPress={() => {
                // Check if this is a user playlist object or legacy playlist name
                if (typeof selectedPlaylist === 'object' && selectedPlaylist.id) {
                  handleDeleteUserPlaylist(selectedPlaylist.id);
                } else if (typeof selectedPlaylist === 'string') {
                  handleDeletePlaylist(selectedPlaylist);
                }
              }}
              android_ripple={{ color: 'rgba(255,255,255,0.1)' }}
            >
              <MaterialIcons name="delete" size={24} color="#FF5252" />
              <Text style={[styles.menuItemText, { color: '#FF5252' }]}>Delete</Text>
            </Pressable>
          </View>
        </Pressable>
      </Modal>

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
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
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
    padding: 14,
    marginVertical: 6,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.05)',
    marginHorizontal: 2,
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