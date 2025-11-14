import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { GetDownloadPath } from '../LocalStorage/AppSettings';
import { safeExists } from './FileUtils';

// Determines the base directory based on user settings and platform
const getBaseDir = async () => {
  try {
    const downloadPref = await GetDownloadPath(); // 'Music' or 'Download'
    let publicDir;

    if (Platform.OS === 'android') {
      const musicDir = RNFS.MusicDirectoryPath;
      const downloadDir = RNFS.DownloadDirectoryPath;

      if (downloadPref === 'Music' && musicDir) {
        publicDir = musicDir;
      } else if (downloadDir) {
        publicDir = downloadDir;
      } else {
        console.warn(`Preferred directory '${downloadPref}' not available. Falling back.`);
        publicDir = RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
      }
    } else {
      publicDir = RNFS.DocumentDirectoryPath;
    }

    if (!publicDir) {
      console.error('Could not determine any valid storage directory. Falling back to app-specific documents directory.');
      publicDir = RNFS.DocumentDirectoryPath;
    }

    return `${publicDir}/orbit`;
  } catch (error) {
    console.error('Error determining base directory:', error);
    return `${RNFS.DocumentDirectoryPath}/orbit_music`;
  }
};

// Ensures all necessary subdirectories exist
const ensureDirectoriesExist = async () => {
  try {
    const baseDir = await getBaseDir();
    const dirs = [
      baseDir,
      `${baseDir}/songs`,
      `${baseDir}/artwork`,
      `${baseDir}/metadata`,
    ];

    for (const dir of dirs) {
      if (!(await safeExists(dir))) {
        await RNFS.mkdir(dir);
      }
    }

    // Create .nomedia file in artwork directory to hide from gallery
    const artworkDir = `${baseDir}/artwork`;
    const nomediaPath = `${artworkDir}/.nomedia`;
    if (!(await safeExists(nomediaPath))) {
      await RNFS.writeFile(nomediaPath, '', 'utf8');
      console.log('Created .nomedia file to hide artwork from gallery');
    }
  } catch (error) {
    console.error('Error ensuring directories exist:', error);
  }
};

// Gets the full path for a song file
// Helper function to sanitize filename
const sanitizeFilename = (filename) => {
  if (!filename) return '';

  // Convert to string and remove any path traversal attempts
  let sanitized = String(filename)
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters including control chars
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Ensure filename doesn't start with dangerous patterns
  if (sanitized.startsWith('/') || sanitized.startsWith('\\') || sanitized.startsWith('.')) {
    sanitized = sanitized.substring(1);
  }

  // Limit length to avoid path issues and ensure reasonable filename
  sanitized = sanitized.substring(0, 100);

  // Ensure we have a valid filename
  if (!sanitized || sanitized.length === 0) {
    sanitized = 'unknown_file';
  }

  return sanitized;
};

const getSongPath = async (songId, songTitle = null) => {
  if (!songId) {
    console.warn('Invalid songId provided to getSongPath');
    return '';
  }
  const baseDir = await getBaseDir();

  if (songTitle) {
    const sanitizedTitle = sanitizeFilename(songTitle);
    return `${baseDir}/songs/${sanitizedTitle} - ${String(songId)}.mp3`;
  }

  // Fallback to just ID if no title provided
  return `${baseDir}/songs/${String(songId)}.mp3`;
};

// Gets the full path for an artwork file
const getArtworkPath = async (songId) => {
  if (!songId) {
    console.warn('Invalid songId provided to getArtworkPath');
    return '';
  }
  const baseDir = await getBaseDir();
  return `${baseDir}/artwork/${String(songId)}.jpg`;
};

// Gets the full path for the downloads directory
const getDownloadsDirectory = async () => {
  const baseDir = await getBaseDir();
  return `${baseDir}/songs`;
};

const STORAGE_KEYS = {
  DOWNLOADED_SONGS_METADATA: '@orbit_downloaded_songs_metadata',
  LOCAL_MUSIC_CACHE: '@orbit_local_music_cache',
};

// Storage quota management
const STORAGE_QUOTA = {
  MAX_TOTAL_SIZE: 50 * 1024 * 1024, // 50MB max total storage
  MAX_SONGS_COUNT: 500, // Max 500 songs
  CLEANUP_THRESHOLD: 40 * 1024 * 1024, // Start cleanup at 40MB
};

// Check storage quota before saving
const checkStorageQuota = async () => {
  try {
    const allMetadata = await getAllDownloadedSongsMetadata();
    const songCount = Object.keys(allMetadata).length;

    // Check if we're approaching limits
    if (songCount >= STORAGE_QUOTA.MAX_SONGS_COUNT) {
      await cleanupOldMetadata(allMetadata);
    }

    // Estimate storage size (rough calculation)
    const estimatedSize = JSON.stringify(allMetadata).length;
    if (estimatedSize >= STORAGE_QUOTA.CLEANUP_THRESHOLD) {
      await cleanupOldMetadata(allMetadata);
    }
  } catch (error) {
    console.error('Error checking storage quota:', error);
  }
};

// Cleanup old metadata entries
const cleanupOldMetadata = async (allMetadata) => {
  try {
    const entries = Object.entries(allMetadata);
    if (entries.length === 0) return;

    // Sort by download time (oldest first)
    entries.sort((a, b) => a[1].downloadTime - b[1].downloadTime);

    // Remove oldest 20% of entries
    const removeCount = Math.ceil(entries.length * 0.2);
    const keepEntries = entries.slice(removeCount);

    const cleanedMetadata = {};
    keepEntries.forEach(([id, metadata]) => {
      cleanedMetadata[id] = metadata;
    });

    await AsyncStorage.setItem(
      STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
      JSON.stringify(cleanedMetadata),
    );

    console.log(`Cleaned up ${removeCount} old metadata entries`);
  } catch (error) {
    console.error('Error cleaning up old metadata:', error);
  }
};

// Saves metadata for a downloaded song to AsyncStorage
const saveDownloadedSongMetadata = async (songId, metadata) => {
  try {
    // Check quota before saving
    await checkStorageQuota();

    const allMetadata = await getAllDownloadedSongsMetadata();
    allMetadata[songId] = {
      ...metadata,
      downloadTime: Date.now(),
    };

    await AsyncStorage.setItem(
      STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
      JSON.stringify(allMetadata),
    );
  } catch (error) {
    console.error('Error saving downloaded song metadata:', error);

    // If storage is full, try cleanup and retry once
    if (error.message?.includes('storage') || error.message?.includes('quota')) {
      try {
        const allMetadata = await getAllDownloadedSongsMetadata();
        await cleanupOldMetadata(allMetadata);

        // Retry save after cleanup
        const retryMetadata = await getAllDownloadedSongsMetadata();
        retryMetadata[songId] = {
          ...metadata,
          downloadTime: Date.now(),
        };
        await AsyncStorage.setItem(
          STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
          JSON.stringify(retryMetadata),
        );
      } catch (retryError) {
        console.error('Error saving metadata even after cleanup:', retryError);
        throw retryError;
      }
    } else {
      throw error;
    }
  }
};

// Retrieves all downloaded songs' metadata from AsyncStorage
const getAllDownloadedSongsMetadata = async () => {
  try {
    const metadataJson = await AsyncStorage.getItem(
      STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
    );
    return metadataJson ? JSON.parse(metadataJson) : {};
  } catch (error) {
    console.error('Error getting all downloaded songs metadata:', error);
    return {};
  }
};

// Removes a song's metadata and its associated files
const removeDownloadedSongMetadata = async (songId) => {
  try {
    // Remove from AsyncStorage
    const allMetadata = await getAllDownloadedSongsMetadata();
    if (allMetadata[songId]) {
      delete allMetadata[songId];
      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
        JSON.stringify(allMetadata),
      );
    }

    // Delete song and artwork files
    const metadata = allMetadata[songId];
    const songPath = await getSongPath(songId, metadata?.title);
    const artworkPath = await getArtworkPath(songId);

    if (await safeExists(songPath)) {
      await RNFS.unlink(songPath);
    }
    if (await safeExists(artworkPath)) {
      await RNFS.unlink(artworkPath);
    }
  } catch (error) {
    console.error(`Error removing downloaded song ${songId}:`, error);
  }
};

// Checks if a song is downloaded by checking its metadata
const isSongDownloaded = async (songId) => {
  if (!songId) return false;
  try {
    const allMetadata = await getAllDownloadedSongsMetadata();
    return Object.keys(allMetadata).includes(String(songId));
  } catch (error) {
    console.error('Error checking if song is downloaded:', error);
    return false;
  }
};

// Downloads and saves artwork from a URL
const saveArtwork = async (songId, artworkUrl) => {
  try {
    await ensureDirectoriesExist();
    const artworkPath = await getArtworkPath(songId);

    if (!artworkUrl || typeof artworkUrl !== 'string' || !artworkPath) {
      console.error('Invalid artwork URL or path:', { artworkUrl, artworkPath });
      return null;
    }

    await RNFS.downloadFile({
      fromUrl: artworkUrl,
      toFile: artworkPath,
    }).promise;

    return (await safeExists(artworkPath)) ? artworkPath : null;
  } catch (error) {
    console.error('Error saving artwork:', error);
    return null;
  }
};

// Cleans up orphaned metadata (metadata without corresponding files)
const cleanupOrphanedMetadata = async () => {
  try {
    const allMetadata = await getAllDownloadedSongsMetadata();
    const orphanedIds = [];

    for (const [songId, metadata] of Object.entries(allMetadata)) {
      const songPath = await getSongPath(songId, metadata.title);
      const songExists = await safeExists(songPath);

      if (!songExists) {
        orphanedIds.push(songId);
      }
    }

    // Remove orphaned metadata
    if (orphanedIds.length > 0) {
      for (const songId of orphanedIds) {
        delete allMetadata[songId];
      }

      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
        JSON.stringify(allMetadata),
      );
    }

    return orphanedIds.length;
  } catch (error) {
    return 0;
  }
};

// Saves local music cache to AsyncStorage
const saveLocalMusicCache = async (musicData) => {
  try {
    const cacheData = {
      music: musicData,
      timestamp: Date.now(),
    };
    await AsyncStorage.setItem(
      STORAGE_KEYS.LOCAL_MUSIC_CACHE,
      JSON.stringify(cacheData),
    );
    console.log('Local music cache saved successfully');
  } catch (error) {
    console.error('Error saving local music cache:', error);
  }
};

// Retrieves local music cache from AsyncStorage
const getLocalMusicCache = async () => {
  try {
    const cacheJson = await AsyncStorage.getItem(STORAGE_KEYS.LOCAL_MUSIC_CACHE);
    if (cacheJson) {
      const cacheData = JSON.parse(cacheJson);
      // Check if cache is less than 24 hours old
      const cacheAge = Date.now() - (cacheData.timestamp || 0);
      const maxCacheAge = 24 * 60 * 60 * 1000; // 24 hours in milliseconds

      if (cacheAge < maxCacheAge) {
        console.log('Retrieved local music cache (age:', Math.round(cacheAge / (60 * 1000)), 'minutes)');
        return cacheData;
      } else {
        console.log('Local music cache expired, clearing...');
        await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_MUSIC_CACHE);
        return null;
      }
    }
    return null;
  } catch (error) {
    console.error('Error getting local music cache:', error);
    return null;
  }
};

// Clears local music cache
const clearLocalMusicCache = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_MUSIC_CACHE);
    console.log('Local music cache cleared');
  } catch (error) {
    console.error('Error clearing local music cache:', error);
  }
};

export const StorageManager = {
  ensureDirectoriesExist,
  getSongPath,
  getArtworkPath,
  getDownloadsDirectory,
  saveDownloadedSongMetadata,
  getAllDownloadedSongsMetadata,
  removeDownloadedSongMetadata,
  isSongDownloaded,
  saveArtwork,
  cleanupOrphanedMetadata,
  saveLocalMusicCache,
  getLocalMusicCache,
  clearLocalMusicCache,
};