/**
 * Shared image handling utilities to eliminate duplication across components
 */

// Image quality levels
export const ImageQuality = {
  LOW: 0,
  MEDIUM: 1,
  HIGH: 2,
  ULTRA: 3
};

// Default image dimensions for different use cases
export const ImageDimensions = {
  THUMBNAIL: { width: 40, height: 40 },
  SMALL: { width: 60, height: 60 },
  MEDIUM: { width: 120, height: 120 },
  LARGE: { width: 300, height: 300 },
  SONG_CARD: { width: 50, height: 50 },
  ALBUM_CARD: { width: 45, height: 45 }
};

/**
 * Extract image URI from various image data formats
 * @param {string|Object|Array} imageData - Image data in various formats
 * @param {number} quality - Quality level (0-3)
 * @returns {string|null} Image URI or null
 */
export const extractImageUri = (imageData, quality = ImageQuality.HIGH) => {
  try {
    if (!imageData) return null;

    // Handle string URI
    if (typeof imageData === 'string') {
      return imageData;
    }

    // Handle object with uri property
    if (typeof imageData === 'object') {
      if (imageData.uri && typeof imageData.uri === 'string') {
        return imageData.uri;
      }

      if (imageData.url && typeof imageData.url === 'string') {
        return imageData.url;
      }

      // Handle array of image objects
      if (Array.isArray(imageData) && imageData.length > 0) {
        const imageArray = imageData;

        // Try to get image at specified quality level
        if (imageArray[quality] && typeof imageArray[quality] === 'string') {
          return imageArray[quality];
        }

        // Fallback to any available image
        for (let i = imageArray.length - 1; i >= 0; i--) {
          const img = imageArray[i];
          if (img && typeof img === 'string') {
            return img;
          }

          if (img && typeof img === 'object') {
            if (img.url && typeof img.url === 'string') {
              return img.url;
            }
            if (img.uri && typeof img.uri === 'string') {
              return img.uri;
            }
          }
        }
      }
    }

    return null;
  } catch (error) {
    console.error('Error extracting image URI:', error);
    return null;
  }
};

/**
 * Get artwork URI for a song with fallback handling
 * @param {Object} song - Song object
 * @param {number} quality - Quality level
 * @returns {string|null} Artwork URI or null
 */
export const getSongArtwork = (song, quality = ImageQuality.HIGH) => {
  if (!song) return null;

  // Try different possible image properties
  const possibleImageProps = ['image', 'artwork', 'albumArt', 'cover'];

  for (const prop of possibleImageProps) {
    const imageUri = extractImageUri(song[prop], quality);
    if (imageUri) {
      return imageUri;
    }
  }

  return null;
};

/**
 * Get optimized image source for React Native Image component
 * @param {string|Object|Array} imageData - Image data
 * @param {Object} dimensions - Target dimensions
 * @param {number} quality - Quality level
 * @returns {Object|null} Image source object or null
 */
export const getOptimizedImageSource = (imageData, dimensions = ImageDimensions.MEDIUM, quality = ImageQuality.HIGH) => {
  const imageUri = extractImageUri(imageData, quality);

  if (!imageUri) return null;

  return {
    uri: imageUri,
    width: dimensions.width,
    height: dimensions.height,
    cache: 'default'
  };
};

/**
 * Preload image for better performance
 * @param {string} imageUri - Image URI to preload
 * @returns {Promise<boolean>} Success status
 */
export const preloadImage = (imageUri) => {
  return new Promise((resolve) => {
    if (!imageUri) {
      resolve(false);
      return;
    }

    const img = new Image();
    img.onload = () => resolve(true);
    img.onerror = () => resolve(false);
    img.src = imageUri;
  });
};

/**
 * Get placeholder image based on context
 * @param {string} context - Context (song, album, artist, etc.)
 * @returns {Object} Placeholder image source
 */
export const getPlaceholderImage = (context = 'song') => {
  // In React Native, you'd return require() statements
  // This is a placeholder for the actual implementation
  switch (context) {
    case 'song':
      return require('../Images/default.jpg');
    case 'album':
      return require('../Images/default.jpg');
    case 'artist':
      return require('../Images/default.jpg');
    default:
      return require('../Images/default.jpg');
  }
};

/**
 * Validate image URL format
 * @param {string} url - URL to validate
 * @returns {boolean} True if valid image URL
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string') return false;

  try {
    const urlObj = new URL(url);
    return ['http:', 'https:', 'file:'].includes(urlObj.protocol);
  } catch {
    return false;
  }
};

/**
 * Get image dimensions based on device and context
 * @param {string} context - Context (song, album, etc.)
 * @param {Object} deviceInfo - Device information
 * @returns {Object} Optimal dimensions
 */
export const getOptimalImageDimensions = (context = 'song', deviceInfo = {}) => {
  const { width: screenWidth = 375, height: screenHeight = 667 } = deviceInfo;

  switch (context) {
    case 'song':
      return screenWidth < 400 ? ImageDimensions.SMALL : ImageDimensions.SONG_CARD;
    case 'album':
      return screenWidth < 400 ? { width: 40, height: 40 } : ImageDimensions.ALBUM_CARD;
    case 'artist':
      return { width: 120, height: 120 };
    case 'background':
      return { width: screenWidth, height: screenHeight };
    default:
      return ImageDimensions.MEDIUM;
  }
};

/**
 * Image cache manager for better performance
 */
class ImageCacheManager {
  constructor() {
    this.cache = new Map();
    this.maxSize = 100;
    this.accessOrder = [];
  }

  /**
   * Get cached image or null
   * @param {string} key - Cache key
   * @returns {string|null} Cached image URI or null
   */
  get(key) {
    if (this.cache.has(key)) {
      // Update access order
      const index = this.accessOrder.indexOf(key);
      if (index > -1) {
        this.accessOrder.splice(index, 1);
      }
      this.accessOrder.push(key);

      return this.cache.get(key);
    }
    return null;
  }

  /**
   * Set cached image
   * @param {string} key - Cache key
   * @param {string} uri - Image URI
   */
  set(key, uri) {
    if (this.cache.size >= this.maxSize) {
      // Remove least recently used
      const oldestKey = this.accessOrder.shift();
      if (oldestKey) {
        this.cache.delete(oldestKey);
      }
    }

    this.cache.set(key, uri);
    this.accessOrder.push(key);
  }

  /**
   * Clear cache
   */
  clear() {
    this.cache.clear();
    this.accessOrder = [];
  }

  /**
   * Get cache stats
   */
  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hitRate: this.accessOrder.length > 0 ? (this.accessOrder.length / (this.accessOrder.length + 1)) : 0
    };
  }
}

// Create singleton instance
export const imageCacheManager = new ImageCacheManager();

/**
 * Cached image getter with automatic cache management
 * @param {string} key - Cache key
 * @param {Function} imageGetter - Function to get image if not cached
 * @returns {Promise<string|null>} Image URI or null
 */
export const getCachedImage = async (key, imageGetter) => {
  // Try cache first
  let imageUri = imageCacheManager.get(key);

  if (!imageUri && imageGetter) {
    imageUri = await imageGetter();
    if (imageUri) {
      imageCacheManager.set(key, imageUri);
    }
  }

  return imageUri;
};

/**
 * Generate cache key for image
 * @param {string} baseId - Base identifier (song ID, album ID, etc.)
 * @param {string} context - Context (song, album, artist)
 * @param {number} quality - Quality level
 * @returns {string} Cache key
 */
export const generateImageCacheKey = (baseId, context = 'song', quality = ImageQuality.HIGH) => {
  return `${context}_${baseId}_${quality}`;
};