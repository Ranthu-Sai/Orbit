import AsyncStorage from '@react-native-async-storage/async-storage';
import { ToastAndroid, DeviceEventEmitter } from 'react-native';

// Cache for playlists to avoid frequent AsyncStorage reads
let playlistCache = null;
let cacheTimestamp = null;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

/**
 * Clear the playlist cache
 */
export const clearPlaylistCache = () => {
  playlistCache = null;
  cacheTimestamp = null;
};

/**
 * Check if cache is valid
 */
const isCacheValid = () => {
  if (!playlistCache || !cacheTimestamp) return false;
  return Date.now() - cacheTimestamp < CACHE_DURATION;
};

/**
 * Get all user playlists
 * @returns {Array} Array of playlist objects
 */
export const getUserPlaylists = async () => {
  try {
    // Return cached data if valid
    if (isCacheValid()) {
      return playlistCache;
    }

    const storedPlaylists = await AsyncStorage.getItem('userPlaylists');
    const playlists = storedPlaylists ? JSON.parse(storedPlaylists) : [];

    // Ensure we always return an array
    const validPlaylists = Array.isArray(playlists) ? playlists : [];

    // Update cache
    playlistCache = validPlaylists;
    cacheTimestamp = Date.now();

    return validPlaylists;
  } catch (error) {
    console.error('Error getting user playlists:', error);
    return [];
  }
};

/**
 * Create a new playlist
 * @param {string} name - Playlist name
 * @param {Object} firstSong - Optional first song to add to playlist
 * @returns {Object|null} Created playlist object or null if failed
 */
export const createPlaylist = async (name, firstSong = null) => {
  try {
    if (!name || !name.trim()) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return null;
    }

    const existingPlaylists = await getUserPlaylists();

    // Check if playlist with same name already exists
    const nameExists = existingPlaylists.some(
      playlist => playlist.name.toLowerCase() === name.trim().toLowerCase()
    );

    if (nameExists) {
      ToastAndroid.show('Playlist with this name already exists', ToastAndroid.SHORT);
      return null;
    }

    const newPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: name.trim(),
      songs: firstSong ? [firstSong] : [],
      createdAt: Date.now(),
      lastModified: Date.now(),
      coverImage: firstSong?.artwork || null
    };

    const updatedPlaylists = [...existingPlaylists, newPlaylist];
    await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));

    // Clear cache to force refresh
    clearPlaylistCache();

    console.log(`Created playlist: ${name} with ID: ${newPlaylist.id}`);
    DeviceEventEmitter.emit('playlist-updated');
    return newPlaylist;
  } catch (error) {
    console.error('Error creating playlist:', error);
    ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    return null;
  }
};

/**
 * Create a new playlist with songs (for imports)
 * @param {string} name - Playlist name
 * @param {Array} songs - Array of song objects
 * @param {string} coverImage - Optional cover image URL
 * @returns {Object|null} Created playlist object or null if failed
 */
export const createPlaylistWithSongs = async (name, songs = [], coverImage = null) => {
  try {
    if (!name || !name.trim()) {
      ToastAndroid.show('Please enter a playlist name', ToastAndroid.SHORT);
      return null;
    }

    const existingPlaylists = await getUserPlaylists();

    // Check if playlist with same name already exists - append (Imported) if so or handle duplicate?
    // For now, let's allow duplicates but maybe warn? Or just let it be.
    // The previous createPlaylist prevented duplicates. Let's keep that logic for consistency.
    let playlistName = name.trim();
    let counter = 1;
    let nameExists = existingPlaylists.some(
      playlist => playlist.name.toLowerCase() === playlistName.toLowerCase()
    );

    // Auto-rename if exists: "My Playlist (1)"
    while (nameExists) {
      playlistName = `${name.trim()} (${counter})`;
      counter++;
      nameExists = existingPlaylists.some(
        playlist => playlist.name.toLowerCase() === playlistName.toLowerCase()
      );
    }

    const newPlaylist = {
      id: `playlist_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: playlistName,
      songs: songs,
      createdAt: Date.now(),
      lastModified: Date.now(),
      coverImage: coverImage || (songs.length > 0 ? songs[0].artwork : null)
    };

    const updatedPlaylists = [...existingPlaylists, newPlaylist];
    await AsyncStorage.setItem('userPlaylists', JSON.stringify(updatedPlaylists));

    // Clear cache to force refresh
    clearPlaylistCache();

    console.log(`Created imported playlist: ${playlistName} with ${songs.length} songs`);
    DeviceEventEmitter.emit('playlist-updated');
    return newPlaylist;
  } catch (error) {
    console.error('Error creating imported playlist:', error);
    ToastAndroid.show('Failed to create playlist', ToastAndroid.SHORT);
    return null;
  }
};

/**
 * Add a song to an existing playlist
 * @param {string} playlistId - Playlist ID
 * @param {Object} song - Song object to add
 * @returns {boolean} Success status
 */
export const addSongToPlaylist = async (playlistId, song) => {
  try {
    if (!playlistId || !song) {
      console.error('Invalid parameters for addSongToPlaylist');
      return false;
    }

    const playlists = await getUserPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      ToastAndroid.show('Playlist not found', ToastAndroid.SHORT);
      return false;
    }

    // Check if song already exists in playlist
    const existingSong = playlists[playlistIndex].songs.find(s => s.id === song.id);
    if (existingSong) {
      ToastAndroid.show('Song already exists in playlist', ToastAndroid.SHORT);
      return false;
    }

    // Add song to playlist
    playlists[playlistIndex].songs.push(song);
    playlists[playlistIndex].lastModified = Date.now();

    // Update cover image if playlist was empty
    if (playlists[playlistIndex].songs.length === 1 && song.artwork) {
      playlists[playlistIndex].coverImage = song.artwork;
    }

    await AsyncStorage.setItem('userPlaylists', JSON.stringify(playlists));

    // Clear cache to force refresh
    clearPlaylistCache();

    ToastAndroid.show(`Added "${song.title}" to "${playlists[playlistIndex].name}"`, ToastAndroid.SHORT);
    console.log(`Added song "${song.title}" to playlist "${playlists[playlistIndex].name}"`);
    DeviceEventEmitter.emit('playlist-updated');
    return true;
  } catch (error) {
    console.error('Error adding song to playlist:', error);
    ToastAndroid.show('Failed to add song to playlist', ToastAndroid.SHORT);
    return false;
  }
};

/**
 * Remove a song from a playlist
 * @param {string} playlistId - Playlist ID
 * @param {string} songId - Song ID to remove
 * @returns {boolean} Success status
 */
export const removeSongFromPlaylist = async (playlistId, songId) => {
  try {
    const playlists = await getUserPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      ToastAndroid.show('Playlist not found', ToastAndroid.SHORT);
      return false;
    }

    const songIndex = playlists[playlistIndex].songs.findIndex(s => s.id === songId);
    if (songIndex === -1) {
      ToastAndroid.show('Song not found in playlist', ToastAndroid.SHORT);
      return false;
    }

    // Remove song from playlist
    const removedSong = playlists[playlistIndex].songs.splice(songIndex, 1)[0];
    playlists[playlistIndex].lastModified = Date.now();

    await AsyncStorage.setItem('userPlaylists', JSON.stringify(playlists));

    // Clear cache to force refresh
    clearPlaylistCache();

    ToastAndroid.show(`Removed "${removedSong.title}" from playlist`, ToastAndroid.SHORT);
    DeviceEventEmitter.emit('playlist-updated');
    return true;
  } catch (error) {
    console.error('Error removing song from playlist:', error);
    ToastAndroid.show('Failed to remove song from playlist', ToastAndroid.SHORT);
    return false;
  }
};

/**
 * Delete a playlist
 * @param {string} playlistId - Playlist ID to delete
 * @returns {boolean} Success status
 */
export const deletePlaylist = async (playlistId) => {
  try {
    const playlists = await getUserPlaylists();
    const filteredPlaylists = playlists.filter(p => p.id !== playlistId);

    if (filteredPlaylists.length === playlists.length) {
      ToastAndroid.show('Playlist not found', ToastAndroid.SHORT);
      return false;
    }

    await AsyncStorage.setItem('userPlaylists', JSON.stringify(filteredPlaylists));

    // Clear cache to force refresh
    clearPlaylistCache();

    ToastAndroid.show('Playlist deleted', ToastAndroid.SHORT);
    DeviceEventEmitter.emit('playlist-updated');
    return true;
  } catch (error) {
    console.error('Error deleting playlist:', error);
    ToastAndroid.show('Failed to delete playlist', ToastAndroid.SHORT);
    return false;
  }
};

/**
 * Get a specific playlist by ID
 * @param {string} playlistId - Playlist ID
 * @returns {Object|null} Playlist object or null if not found
 */
export const getPlaylistById = async (playlistId) => {
  try {
    const playlists = await getUserPlaylists();
    return playlists.find(p => p.id === playlistId) || null;
  } catch (error) {
    console.error('Error getting playlist by ID:', error);
    return null;
  }
};

/**
 * Update playlist metadata (name, cover image, etc.)
 * @param {string} playlistId - Playlist ID
 * @param {Object} updates - Object containing fields to update
 * @returns {boolean} Success status
 */
export const updatePlaylist = async (playlistId, updates) => {
  try {
    const playlists = await getUserPlaylists();
    const playlistIndex = playlists.findIndex(p => p.id === playlistId);

    if (playlistIndex === -1) {
      ToastAndroid.show('Playlist not found', ToastAndroid.SHORT);
      return false;
    }

    // Update playlist with new data
    playlists[playlistIndex] = {
      ...playlists[playlistIndex],
      ...updates,
      lastModified: Date.now()
    };

    await AsyncStorage.setItem('userPlaylists', JSON.stringify(playlists));

    // Clear cache to force refresh
    clearPlaylistCache();

    return true;
  } catch (error) {
    console.error('Error updating playlist:', error);
    ToastAndroid.show('Failed to update playlist', ToastAndroid.SHORT);
    return false;
  }
};
