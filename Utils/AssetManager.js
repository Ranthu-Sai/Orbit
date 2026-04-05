/**
 * Comprehensive Asset Management System
 * Handles images, fonts, and other assets with optimization and caching
 */

import FastImage from 'react-native-fast-image';
import { Platform, Dimensions } from 'react-native';
import ImageManager from './ImageManager';
import FontManager from './FontManager';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

class AssetManager {
  constructor() {
    this.imageCache = new Map();
    this.fontSizeCache = new Map();
    this.isInitialized = false;
  }

  /**
   * Initialize the asset manager
   */
  async initialize() {
    if (this.isInitialized) {
      return;
    }

    try {
      // Preload critical images
      await this.preloadCriticalAssets();

      // Setup image cache configuration
      this.setupImageCaching();

      this.isInitialized = true;
    } catch (error) {
      console.error('❌ Asset Manager initialization failed:', error);
    }
  }

  /**
   * Preload critical assets for better performance
   */
  async preloadCriticalAssets() {
    const criticalImages = [
      ImageManager.OPTIMIZED_IMAGES.PLAYING_ANIMATION,
      ImageManager.OPTIMIZED_IMAGES.PAUSED_ANIMATION,
      ImageManager.OPTIMIZED_IMAGES.DEFAULT_MUSIC,
      ImageManager.OPTIMIZED_IMAGES.DEFAULT_ALBUM,
    ];

    try {
      // Convert require() results to URIs for preloading
      const imageUris = criticalImages
        .filter((img) => typeof img === 'number') // require() results are numbers
        .map((img) => ({ uri: img }));

      if (imageUris.length > 0) {
        await FastImage.preload(imageUris);
      }
    } catch (error) {
      console.warn('⚠️ Failed to preload some images:', error);
    }
  }

  /**
   * Setup image caching configuration
   */
  setupImageCaching() {
    // Configure FastImage cache settings
    FastImage.preload([]);

    // Set cache limits (if supported)
    if (Platform.OS === 'ios') {
      // iOS specific cache configuration
    } else {
      // Android specific cache configuration
    }
  }

  /**
   * Get optimized image source with caching
   */
  getImageSource(type, customSource = null, cacheKey = null) {
    const key = cacheKey || `${type}_${customSource || 'default'}`;

    // Check cache first
    if (this.imageCache.has(key)) {
      return this.imageCache.get(key);
    }

    // Get optimized source
    const source = ImageManager.resolveImageSource(customSource, type);

    // Cache the result
    this.imageCache.set(key, source);

    return source;
  }

  /**
   * Get optimized font style with caching
   */
  getFontStyle(type, customSize = null, preference = 'Medium') {
    const key = `${type}_${customSize || 'default'}_${preference}`;

    // Check cache first
    if (this.fontSizeCache.has(key)) {
      return this.fontSizeCache.get(key);
    }

    // Get optimized font style
    let fontStyle = FontManager.getOptimizedFontStyle(
      type,
      SCREEN_WIDTH,
      customSize
    );

    // Apply user preference
    fontStyle = FontManager.applyFontSizePreference(fontStyle, preference);

    // Cache the result
    this.fontSizeCache.set(key, fontStyle);

    return fontStyle;
  }

  /**
   * Clear caches when memory is low
   */
  clearCaches() {
    // Clear image caches
    this.imageCache.clear();
    FastImage.clearMemoryCache();

    // Clear font cache
    this.fontSizeCache.clear();
  }

  /**
   * Get memory usage statistics
   */
  getMemoryStats() {
    return {
      imageCacheSize: this.imageCache.size,
      fontCacheSize: this.fontSizeCache.size,
      isInitialized: this.isInitialized,
    };
  }

  /**
   * Optimize artwork URL for different quality levels
   */
  getOptimizedArtwork(artworkUrl, quality = 'medium') {
    if (!artworkUrl) {
      return null;
    }

    return ImageManager.getOptimizedArtworkUrl(artworkUrl, quality);
  }

  /**
   * Get performance-optimized text props
   */
  getTextProps(customProps = {}) {
    return FontManager.getOptimizedTextProps(customProps);
  }

  /**
   * Handle low memory warnings
   */
  handleLowMemory() {
    // Clear half of the image cache (keep most recent)
    const imageCacheEntries = Array.from(this.imageCache.entries());
    const keepCount = Math.floor(imageCacheEntries.length / 2);

    this.imageCache.clear();
    imageCacheEntries.slice(-keepCount).forEach(([key, value]) => {
      this.imageCache.set(key, value);
    });

    // Clear disk cache but keep memory cache
    FastImage.clearDiskCache();
  }

  /**
   * Prefetch images for a list of items
   */
  async prefetchImages(items, imageExtractor) {
    if (!Array.isArray(items) || items.length === 0) {
      return;
    }

    const urls = items
      .map(imageExtractor)
      .filter((url) => url && typeof url === 'string' && url.startsWith('http'))
      .slice(0, 10); // Limit to first 10 items

    if (urls.length === 0) {
      return;
    }

    try {
      const sources = urls.map((url) => ({ uri: url }));
      await FastImage.preload(sources);
    } catch (error) {
      console.warn('⚠️ Failed to prefetch some images:', error);
    }
  }

  /**
   * Get asset loading configuration
   */
  getLoadingConfig() {
    return {
      // Image loading configuration
      image: {
        priority: FastImage.priority.normal,
        cache: FastImage.cacheControl.immutable,
        resizeMode: FastImage.resizeMode.cover,
      },

      // Text rendering configuration
      text: FontManager.TEXT_PERFORMANCE_PROPS,
    };
  }
}

// Create singleton instance
const assetManager = new AssetManager();

// Auto-initialize when imported
assetManager.initialize().catch((error) => {
  console.error('Failed to auto-initialize AssetManager:', error);
});

export default assetManager;

// Export utilities for direct use
export { ImageManager, FontManager };
