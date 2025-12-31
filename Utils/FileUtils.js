import * as RNFS from 'react-native-fs';
import { Platform } from 'react-native';
import { analyticsService, AnalyticsEvents } from './AnalyticsUtils';

/**
 * Ensures that a path is converted to a string, with fallbacks for object paths
 * @param {any} path - Path that might be an object or string
 * @returns {string} A string representation of the path
 */
export const safePath = (path) => {
  // Handle null, undefined or empty values
  if (path === null || path === undefined) {
    console.warn('NULL or undefined path provided to safePath');
    return '';
  }

  // If it's already a string, just return it
  if (typeof path === 'string') {
    return path;
  }

  // Special handling for path objects
  try {
    // Log object type for debugging - will help identify the issue
    console.log('Received non-string path:',
      typeof path,
      path && path.constructor ? path.constructor.name : 'unknown'
    );

    // If it's an array, return empty string to prevent errors
    if (Array.isArray(path)) {
      console.warn('Array provided as path, returning empty string');
      return '';
    }

    // Handle specific file objects from RNFS
    if (path.path && typeof path.path === 'string') {
      return path.path;
    }

    // Handle file objects that may have a name property too
    if (path.name && typeof path.name === 'string') {
      if (path.path && typeof path.path === 'string') {
        return path.path;
      }
    }

    // Handle URI objects (like image sources)
    if (path.uri && typeof path.uri === 'string') {
      return path.uri;
    }

    // Handle Promise objects - this could be causing the error
    if (path instanceof Promise || (path.then && typeof path.then === 'function')) {
      console.warn('Promise provided as path, returning empty string to prevent errors');
      return '';
    }

    // Try to convert to string without calling methods that might throw
    try {
      if (path.toString && typeof path.toString === 'function' &&
        path.toString !== Object.prototype.toString) {
        const result = path.toString();
        if (typeof result === 'string') {
          return result;
        }
      }
    } catch (stringError) {
      console.warn('toString() failed:', stringError);
      // Continue to next fallback
    }

    // Final fallback with extra safety
    try {
      return '' + path; // String coercion
    } catch (coerceError) {
      console.warn('String coercion failed:', coerceError);
      return '';
    }
  } catch (e) {
    console.error('Failed to convert path to string:', e);
    return ''; // Return empty string as fallback
  }
};

/**
 * Safely checks if a file exists, handling non-string paths
 * @param {any} path - Path to check 
 * @returns {Promise<boolean>} True if file exists, false otherwise
 */
export const safeExists = async (path) => {
  try {
    const stringPath = safePath(path);
    if (!stringPath) {
      console.warn('Empty path provided to safeExists');
      return false;
    }
    return await RNFS.exists(stringPath);
  } catch (error) {
    console.error('Error in safeExists:', error);
    return false;
  }
};

/**
 * Safely deletes a file, handling non-string paths and non-existent files
 * @param {any} path - Path to delete
 * @returns {Promise<boolean>} True if successfully deleted or didn't exist
 */
export const safeUnlink = async (path) => {
  try {
    const stringPath = safePath(path);
    if (!stringPath) {
      console.warn('Empty path provided to safeUnlink');
      return false;
    }

    try {
      if (await safeExists(stringPath)) {
        await RNFS.unlink(stringPath);
        return true;
      }
      return true; // File didn't exist, so technically "deleted"
    } catch (unlinkError) {
      console.error('Error unlinking file:', unlinkError);
      return false;
    }
  } catch (error) {
    console.error('Error in safeUnlink:', error);
    return false;
  }
};

/**
 * Safely creates a directory, handling non-string paths
 * @param {any} path - Path to create
 * @returns {Promise<boolean>} True if successfully created or already existed
 */
export const safeMkdir = async (path) => {
  try {
    const stringPath = safePath(path);
    if (!stringPath) {
      console.warn('Empty path provided to safeMkdir');
      return false;
    }

    try {
      const exists = await safeExists(stringPath);
      if (!exists) {
        await RNFS.mkdir(stringPath);
      }
      return true;
    } catch (mkdirError) {
      console.error('Error creating directory:', mkdirError);
      return false;
    }
  } catch (error) {
    console.error('Error in safeMkdir:', error);
    return false;
  }
};

/**
 * Ensures that a directory exists, creating it and any parent directories if needed
 * @param {any} path - Directory path to ensure exists
 * @returns {Promise<boolean>} True if directory exists or was created successfully
 */
export const ensureDirectoryExists = async (path) => {
  try {
    const stringPath = safePath(path);
    if (!stringPath) {
      console.warn('Empty path provided to ensureDirectoryExists');
      return false;
    }

    try {
      // Check if directory already exists
      const exists = await safeExists(stringPath);
      if (exists) {
        return true;
      }

      // Create directory with recursive option to create parent directories
      await RNFS.mkdir(stringPath);
      return true;
    } catch (mkdirError) {
      console.error('Error ensuring directory exists:', mkdirError);
      return false;
    }
  } catch (error) {
    console.error('Error in ensureDirectoryExists:', error);
    return false;
  }
};



/**
 * Safely downloads a file, handling non-string paths
 * @param {string} url - URL to download from
 * @param {any} path - Path to save to
 * @param {Object} customHeaders - Optional custom headers for the download request
 * @param {Function} onProgress - Optional progress callback (percentage: number) => void
 * @returns {Promise<boolean>} True if successfully downloaded
 */
export const safeDownloadFile = async (url, path, customHeaders = null, onProgress = null) => {
  const stringPath = safePath(path);
  try {
    if (!url || typeof url !== 'string') {
      console.warn('Invalid URL provided to safeDownloadFile');
      return false;
    }

    if (!stringPath) {
      console.warn('Empty path provided to safeDownloadFile');
      return false;
    }

    // Build download options
    const downloadOptions = {
      fromUrl: url,
      toFile: stringPath,
    };

    // Add progress callback if provided
    if (typeof onProgress === 'function') {
      downloadOptions.begin = (res) => {
        // Report 0% when download begins
        onProgress(0);
      };
      downloadOptions.progress = (res) => {
        // Calculate percentage (handle cases where contentLength is -1 or 0)
        if (res.contentLength > 0) {
          const percentage = Math.round((res.bytesWritten / res.contentLength) * 100);
          onProgress(percentage);
        } else {
          // If content length unknown, show indeterminate progress (pulse between 10-90%)
          const fakeProgress = Math.min(90, Math.max(10, (res.bytesWritten / 1000000) * 10));
          onProgress(Math.round(fakeProgress));
        }
      };
      // Throttle progress updates to avoid excessive callbacks
      downloadOptions.progressInterval = 100; // Update every 100ms
      downloadOptions.progressDivider = 1; // Report all progress
    }

    // Priority 1: Use custom headers if provided (e.g., YTMusic requires specific User-Agent)
    if (customHeaders && typeof customHeaders === 'object') {
      downloadOptions.headers = customHeaders;
      console.log('📥 [Download] Using custom headers for download');
    }
    // Priority 2: Add User-Agent for specific CDNs
    else if (url.includes('qobuz.com') || url.includes('akamaized.net')) {
      downloadOptions.headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'image/*,*/*',
      };
    }

    const result = await RNFS.downloadFile(downloadOptions).promise;

    // Accept both 200 (OK) and 206 (Partial Content) as success
    // YouTube/Google streams return 206 for range requests
    if (result.statusCode === 200 || result.statusCode === 206) {
      // Report 100% on successful completion
      if (typeof onProgress === 'function') {
        onProgress(100);
      }
      if (Platform.OS === 'android') {
        try {
          await RNFS.scanFile(stringPath);
        } catch (scanError) {
          // Non-critical error, don't fail the download
        }
      }
      return true;
    } else {
      console.error(`Download failed with status code: ${result.statusCode} for URL: ${url.substring(0, 80)}...`);
      await safeUnlink(stringPath);
      return false;
    }
  } catch (error) {
    console.error('Error in safeDownloadFile:', error.message, 'URL:', url.substring(0, 80));
    await safeUnlink(stringPath);
    return false;
  }
};



/**
 * Downloads a file with analytics tracking
 * @param {string} url - URL to download from
 * @param {any} path - Path to save to
 * @param {Object} metadata - Metadata about the content being downloaded
 * @param {Object} headers - Optional custom headers for the download request
 * @param {Function} onProgress - Optional progress callback (percentage: number) => void
 * @returns {Promise<boolean>} True if successfully downloaded
 */
export const downloadFileWithAnalytics = async (url, path, metadata = {}, headers = null, onProgress = null) => {
  const { id, name, type = 'song' } = metadata;

  try {
    // Track download start
    if (id && name) {
      analyticsService.logDownloadStart(id, type, name);
    }

    // Perform the download with optional headers and progress callback
    const success = await safeDownloadFile(url, path, headers, onProgress);

    // Track download completion
    if (id && name) {
      analyticsService.logDownloadComplete(id, type, name, success);
    }

    return success;
  } catch (error) {
    console.error('Error in downloadFileWithAnalytics:', error);

    // Track failed download
    if (id && name) {
      analyticsService.logDownloadComplete(id, type, name, false);
    }

    return false;
  }
};

/**
 * Detects the actual audio format of a file by reading its magic bytes
 * This is essential because YouTube sometimes returns different formats than expected
 * 
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<{format: string, canEmbedMetadata: boolean, actualExtension: string}>}
 */
export const detectAudioFormat = async (filePath) => {
  try {
    const stringPath = safePath(filePath);
    if (!stringPath || !(await safeExists(stringPath))) {
      return { format: 'unknown', canEmbedMetadata: false, actualExtension: '' };
    }

    // Read first 12 bytes to detect format
    const fileHandle = await RNFS.read(stringPath, 12, 0, 'base64');
    const bytes = Uint8Array.from(atob(fileHandle), c => c.charCodeAt(0));

    // Check for WebM/Matroska: 0x1A 0x45 0xDF 0xA3
    if (bytes[0] === 0x1A && bytes[1] === 0x45 && bytes[2] === 0xDF && bytes[3] === 0xA3) {
      console.log('🔍 [Format Detection] WebM/Matroska container detected');
      return { format: 'webm', canEmbedMetadata: false, actualExtension: '.opus' };
    }

    // Check for MP4/M4A: 'ftyp' at offset 4
    if (bytes[4] === 0x66 && bytes[5] === 0x74 && bytes[6] === 0x79 && bytes[7] === 0x70) { // 'ftyp'
      console.log('🔍 [Format Detection] MP4/M4A container detected');
      return { format: 'm4a', canEmbedMetadata: true, actualExtension: '.m4a' };
    }

    // Check for FLAC: 'fLaC'
    if (bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43) {
      console.log('🔍 [Format Detection] FLAC format detected');
      return { format: 'flac', canEmbedMetadata: true, actualExtension: '.flac' };
    }

    // Check for MP3: ID3 tag or frame sync
    if ((bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33) || // 'ID3'
      (bytes[0] === 0xFF && (bytes[1] & 0xE0) === 0xE0)) { // Frame sync
      console.log('🔍 [Format Detection] MP3 format detected');
      return { format: 'mp3', canEmbedMetadata: true, actualExtension: '.mp3' };
    }

    // Check for OGG: 'OggS'
    if (bytes[0] === 0x4F && bytes[1] === 0x67 && bytes[2] === 0x67 && bytes[3] === 0x53) {
      console.log('🔍 [Format Detection] OGG container detected');
      return { format: 'ogg', canEmbedMetadata: true, actualExtension: '.ogg' };
    }

    // Check for WAV: 'RIFF'...'WAVE'
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x41 && bytes[10] === 0x56 && bytes[11] === 0x45) {
      console.log('🔍 [Format Detection] WAV format detected');
      return { format: 'wav', canEmbedMetadata: true, actualExtension: '.wav' };
    }

    console.log('🔍 [Format Detection] Unknown format, first bytes:',
      Array.from(bytes.slice(0, 8)).map(b => b.toString(16).padStart(2, '0')).join(' '));
    return { format: 'unknown', canEmbedMetadata: false, actualExtension: '' };

  } catch (error) {
    console.error('🔍 [Format Detection] Error:', error.message);
    return { format: 'unknown', canEmbedMetadata: false, actualExtension: '' };
  }
};

/**
 * Renames a file to have the correct extension based on its actual format
 * @param {string} currentPath - Current file path
 * @param {string} newExtension - New extension (including dot, e.g., '.opus')
 * @returns {Promise<string|null>} New file path or null if failed
 */
export const renameToCorrectExtension = async (currentPath, newExtension) => {
  try {
    const stringPath = safePath(currentPath);
    if (!stringPath || !newExtension) return null;

    // Get the base path without extension
    const lastDotIndex = stringPath.lastIndexOf('.');
    const basePath = lastDotIndex > 0 ? stringPath.substring(0, lastDotIndex) : stringPath;
    const newPath = basePath + newExtension;

    // If already correct extension, return current path
    if (stringPath.toLowerCase().endsWith(newExtension.toLowerCase())) {
      return stringPath;
    }

    // Rename file
    await RNFS.moveFile(stringPath, newPath);
    console.log(`📝 [File Rename] ${stringPath} -> ${newPath}`);

    // Scan new file for media library
    if (Platform.OS === 'android') {
      try {
        await RNFS.scanFile(newPath);
      } catch (e) {
        // Non-critical
      }
    }

    return newPath;
  } catch (error) {
    console.error('📝 [File Rename] Error:', error.message);
    return null;
  }
};
