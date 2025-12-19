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
 * @returns {Promise<boolean>} True if successfully downloaded
 */
export const safeDownloadFile = async (url, path) => {
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

    // Build download options with headers for specific CDNs
    const downloadOptions = {
      fromUrl: url,
      toFile: stringPath,
    };

    // Add User-Agent for qobuz CDN to prevent blocking
    // Some CDNs block requests without proper User-Agent headers
    if (url.includes('qobuz.com') || url.includes('akamaized.net')) {
      downloadOptions.headers = {
        'User-Agent': 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36',
        'Accept': 'image/*,*/*',
      };
    }

    const result = await RNFS.downloadFile(downloadOptions).promise;

    if (result.statusCode === 200) {
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
 * @returns {Promise<boolean>} True if successfully downloaded
 */
export const downloadFileWithAnalytics = async (url, path, metadata = {}) => {
  const { id, name, type = 'song' } = metadata;

  try {
    // Track download start
    if (id && name) {
      analyticsService.logDownloadStart(id, type, name);
    }

    // Perform the download
    const success = await safeDownloadFile(url, path);

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

