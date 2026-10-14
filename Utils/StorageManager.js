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
    let actualPathUsed = downloadPref; // Track what path we're actually using

    if (Platform.OS === 'android') {
      const downloadDir = RNFS.DownloadDirectoryPath;

      // Use Downloads directory as default (Music directory is often unavailable on Android)
      if (downloadDir) {
        publicDir = downloadDir;
      } else {
        console.warn(
          'StorageManager: Download directory not available. Falling back.'
        );
        publicDir = RNFS.ExternalDirectoryPath || RNFS.DocumentDirectoryPath;
        actualPathUsed = 'External/Fallback';
      }
    } else {
      publicDir = RNFS.DocumentDirectoryPath;
    }

    if (!publicDir) {
      console.error(
        'StorageManager: Could not determine any valid storage directory. Falling back to app-specific documents directory.'
      );
      publicDir = RNFS.DocumentDirectoryPath;
      // actualPathUsed = 'App Documents (fallback)';
    }

    const finalPath = `${publicDir}/orbit`;
    return finalPath;
  } catch (error) {
    console.error('StorageManager: Error determining base directory:', error);
    const fallbackPath = `${RNFS.DocumentDirectoryPath}/orbit_music`;
    return fallbackPath;
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
    }
  } catch (error) {
    console.error('Error ensuring directories exist:', error);
  }
};

// Gets the full path for a song file
// Helper function to sanitize filename
const sanitizeFilename = (filename) => {
  if (!filename) {
    return '';
  }

  // Convert to string and remove any path traversal attempts
  let sanitized = String(filename)
    .replace(/\.\./g, '') // Remove path traversal attempts
    .replace(/[<>:"/\\|?*\x00-\x1f]/g, '') // Remove invalid characters including control chars
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .trim();

  // Ensure filename doesn't start with dangerous patterns
  if (
    sanitized.startsWith('/') ||
    sanitized.startsWith('\\') ||
    sanitized.startsWith('.')
  ) {
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

/**
 * Gets the full path for a song file with correct extension based on source
 * @param {string} songId - Song ID
 * @param {string} songTitle - Song title for filename
 * @param {string} source - Source: 'dab', 'ytmusic', 'saavn' (default)
 * @returns {Promise<string>} - Full file path
 */
const getSongPath = async (songId, songTitle = null, source = null) => {
  if (!songId) {
    console.warn('Invalid songId provided to getSongPath');
    return '';
  }
  const baseDir = await getBaseDir();

  // Determine file extension based on source
  let extension = '.mp3'; // default for Saavn
  if (source === 'dab') {
    extension = '.flac'; // DAB provides FLAC files
  } else if (source === 'ytmusic') {
    extension = '.m4a'; // YTMusic default (AAC)
  } else if (source === 'ytmusic_m4a') {
    extension = '.m4a'; // YTMusic M4A/AAC
  } else if (source === 'ytmusic_webm' || source === 'ytmusic_opus') {
    extension = '.opus'; // YTMusic Opus format (WebM container -> use .opus)
  } else if (source && source.startsWith('ytmusic_')) {
    // Handle any other ytmusic formats - extract extension from source
    const fmt = source.replace('ytmusic_', '');
    extension = `.${fmt}`;
  }

  if (songTitle) {
    const sanitizedTitle = sanitizeFilename(songTitle);
    return `${baseDir}/songs/${sanitizedTitle} - ${String(songId)}${extension}`;
  }

  // Fallback to just ID if no title provided
  return `${baseDir}/songs/${String(songId)}${extension}`;
};

/**
 * Resolves the on-disk path of a downloaded song.
 * Downloads are saved as "<title> - <id>.<ext>"; older builds saved "<id>.<ext>".
 * Returns the first candidate that exists, or null.
 * @param {string} songId - Song ID
 * @param {Object} metadata - Stored download metadata (title, source)
 */
const resolveDownloadedSongPath = async (songId, metadata = null) => {
  if (!songId) {
    return null;
  }
  const candidates = [];
  // Exact path recorded at download time is the most reliable
  if (typeof metadata?.localSongPath === 'string') {
    candidates.push(metadata.localSongPath.replace(/^file:\/\//, ''));
  }
  if (metadata?.title) {
    candidates.push(await getSongPath(songId, metadata.title, metadata.source));
  }
  candidates.push(await getSongPath(songId, null, metadata?.source));
  if (metadata?.source) {
    // Legacy files may have been saved with the default extension
    candidates.push(await getSongPath(songId, metadata?.title || null, null));
    candidates.push(await getSongPath(songId, null, null));
  }

  for (const candidate of candidates) {
    if (candidate && (await safeExists(candidate))) {
      return candidate;
    }
  }
  return null;
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

// AsyncStorage on Android defaults to a ~6MB total limit. When the metadata
// blob grows close to that, drop entries whose files no longer exist.
// Entries for songs that are still on disk are never removed.
const METADATA_SIZE_SOFT_LIMIT = 4 * 1024 * 1024;

const checkStorageQuota = async () => {
  try {
    const allMetadata = await getAllDownloadedSongsMetadata();
    const estimatedSize = JSON.stringify(allMetadata).length;
    if (estimatedSize >= METADATA_SIZE_SOFT_LIMIT) {
      await cleanupOrphanedMetadata();
    }
  } catch (error) {
    console.error('Error checking storage quota:', error);
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
      JSON.stringify(allMetadata)
    );
  } catch (error) {
    console.error('Error saving downloaded song metadata:', error);

    // If storage is full, try cleanup and retry once
    if (
      error.message?.includes('storage') ||
      error.message?.includes('quota')
    ) {
      try {
        await cleanupOrphanedMetadata();

        // Retry save after cleanup
        const retryMetadata = await getAllDownloadedSongsMetadata();
        retryMetadata[songId] = {
          ...metadata,
          downloadTime: Date.now(),
        };
        await AsyncStorage.setItem(
          STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
          JSON.stringify(retryMetadata)
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
      STORAGE_KEYS.DOWNLOADED_SONGS_METADATA
    );
    return metadataJson ? JSON.parse(metadataJson) : {};
  } catch (error) {
    console.error('Error getting all downloaded songs metadata:', error);
    return {};
  }
};

// Removes a song's metadata and its associated files
// @param {string} songId - The song ID
// @param {string} localFilePath - Optional: Direct file path to delete (used when path is known, e.g., from scanner)
const removeDownloadedSongMetadata = async (songId, localFilePath = null) => {
  try {
    // Get metadata BEFORE deletion to access song info
    const allMetadata = await getAllDownloadedSongsMetadata();
    const metadata = allMetadata[songId];

    // Determine the file path to delete
    let songPath = localFilePath;

    // If localFilePath is provided (from scanner), use it directly
    if (localFilePath) {
      // Handle file:// prefix if present
      if (localFilePath.startsWith('file://')) {
        songPath = localFilePath.replace('file://', '');
      }
    } else if (metadata) {
      // Find the actual file (titled or legacy id-only name)
      songPath =
        (await resolveDownloadedSongPath(songId, metadata)) ||
        (await getSongPath(songId, metadata.title, metadata.source));
    }

    // Delete song file from external storage
    if (songPath) {
      try {
        // Just try to unlink directly - no need for multiple exist checks
        await RNFS.unlink(songPath);
      } catch (unlinkError) {
        // If file doesn't exist, ignore the error
        if (
          unlinkError.message.includes('no such file or directory') ||
          unlinkError.message.includes('File does not exist')
        ) {
        } else {
          console.error(
            '❌ [StorageManager] RNFS.unlink error:',
            unlinkError.message
          );
          // Don't throw for artwork or non-critical file issues, but here it's the main song
          throw unlinkError;
        }
      }
    } else {
    }

    // Skip artwork deletion - artwork is embedded in the audio file

    // Remove from AsyncStorage after files are deleted
    if (allMetadata[songId]) {
      delete allMetadata[songId];
      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
        JSON.stringify(allMetadata)
      );
    }
  } catch (error) {
    console.error(`❌ Error removing downloaded song ${songId}:`, error);
    throw error; // Re-throw to allow caller to handle
  }
};

// Checks if a song is actually downloaded (metadata exists AND file exists on disk)
const isSongDownloaded = async (songId) => {
  if (!songId) {
    return false;
  }
  try {
    const allMetadata = await getAllDownloadedSongsMetadata();
    const metadata = allMetadata[String(songId)];

    // If no metadata, definitely not downloaded
    if (!metadata) {
      return false;
    }

    // Verify file actually exists on disk (titled or legacy id-only name)
    const songPath = await resolveDownloadedSongPath(String(songId), metadata);

    // If metadata exists but file doesn't, clean up the orphaned metadata
    if (!songPath) {
      delete allMetadata[String(songId)];
      await AsyncStorage.setItem(
        STORAGE_KEYS.DOWNLOADED_SONGS_METADATA,
        JSON.stringify(allMetadata)
      );
      return false;
    }

    return true;
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
      console.error('Invalid artwork URL or path:', {
        artworkUrl,
        artworkPath,
      });
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
      const songPath = await resolveDownloadedSongPath(songId, metadata);
      if (!songPath) {
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
        JSON.stringify(allMetadata)
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
      JSON.stringify(cacheData)
    );
  } catch (error) {
    console.error('Error saving local music cache:', error);
  }
};

// Retrieves local music cache from AsyncStorage
const getLocalMusicCache = async () => {
  try {
    const cacheJson = await AsyncStorage.getItem(
      STORAGE_KEYS.LOCAL_MUSIC_CACHE
    );
    // No expiry: the cache is only a fast first paint. A fresh scan always
    // runs afterwards and replaces it, so an old cache is never wrong for long.
    return cacheJson ? JSON.parse(cacheJson) : null;
  } catch (error) {
    console.error('Error getting local music cache:', error);
    return null;
  }
};

// Clears local music cache
const clearLocalMusicCache = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.LOCAL_MUSIC_CACHE);
  } catch (error) {
    console.error('Error clearing local music cache:', error);
  }
};

// Updates directories when download path changes
const updateDownloadPathDirectories = async () => {
  try {
    await ensureDirectoriesExist();
  } catch (error) {
    console.error('Error updating download path directories:', error);
  }
};

// Gets information about the current download path
const getDownloadPathInfo = async () => {
  try {
    const downloadPref = await GetDownloadPath();
    const baseDir = await getBaseDir();
    const songsDir = `${baseDir}/songs`;

    return {
      requestedPath: downloadPref,
      actualBasePath: baseDir,
      songsPath: songsDir,
      artworkPath: `${baseDir}/artwork`,
    };
  } catch (error) {
    console.error('Error getting download path info:', error);
    return null;
  }
};

export const StorageManager = {
  ensureDirectoriesExist,
  getSongPath,
  resolveDownloadedSongPath,
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
  updateDownloadPathDirectories,
  getDownloadPathInfo,
};
