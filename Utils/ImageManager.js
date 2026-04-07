/**
 * Optimized Image Manager for React Native
 * Provides efficient image loading and caching
 */

import FastImage from 'react-native-fast-image';

// Optimized image sources - using require for bundled images
export const OPTIMIZED_IMAGES = {
  // Core UI Images (small, essential)
  DEFAULT_ALBUM: require('../Images/default.jpg'),
  DEFAULT_MUSIC: require('../Images/Music.jpeg'),
  LOCAL_MUSIC: require('../Images/Music.jpeg'),
  DEFAULT_PLAYLIST: require('../Images/wav.png'),

  // Animation GIFs (small, essential)
  PLAYING_ANIMATION: require('../Images/playing.gif'),
  PAUSED_ANIMATION: require('../Images/songPaused.gif'),

  // Essential UI images
  OFFLINE_INDICATOR: require('../Images/offline.png'),
  LIKED_MUSIC: require('../Images/likedMusic.webp'),
  APP_LOGO: require('../Images/Logo.jpg'),

  // Category/Genre images
  LOFI_GENRE: require('../Images/lofi.jpg'),
  POP_GENRE: require('../Images/pop.png'),
  TRENDING_IMAGE: require('../Images/trending.png'),

  // Feature images
  LIKED_PLAYLIST: require('../Images/LikedPlaylist.png'),
  LIKED_SONG: require('../Images/LikedSong.png'),
  MOST_SEARCHED: require('../Images/MostSearched.png'),
};

// Default fallback URLs for remote images
export const FALLBACK_URLS = {
  ARTIST_PLACEHOLDER:
    'https://via.placeholder.com/500x500/cccccc/666666?text=Artist',
  ALBUM_PLACEHOLDER:
    'https://via.placeholder.com/500x500/cccccc/666666?text=Album',
  GENERIC_PLACEHOLDER:
    'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png',
};

/**
 * Get optimized image source for different use cases
 */
export const getOptimizedImageSource = (type, customSource = null) => {
  switch (type) {
    case 'album':
      return customSource
        ? { uri: customSource }
        : OPTIMIZED_IMAGES.DEFAULT_ALBUM;

    case 'music':
      return customSource
        ? { uri: customSource }
        : OPTIMIZED_IMAGES.DEFAULT_MUSIC;

    case 'local-music':
      return customSource
        ? { uri: customSource }
        : OPTIMIZED_IMAGES.LOCAL_MUSIC;

    case 'playlist':
      return customSource
        ? { uri: customSource }
        : OPTIMIZED_IMAGES.DEFAULT_PLAYLIST;

    case 'playing':
      return OPTIMIZED_IMAGES.PLAYING_ANIMATION;

    case 'paused':
      return OPTIMIZED_IMAGES.PAUSED_ANIMATION;

    case 'local-collapsed':
      return OPTIMIZED_IMAGES.DEFAULT_MUSIC;

    case 'artist':
      return customSource
        ? { uri: customSource }
        : { uri: FALLBACK_URLS.ARTIST_PLACEHOLDER };

    default:
      return OPTIMIZED_IMAGES.DEFAULT_MUSIC;
  }
};

/**
 * Enhanced artwork URL processing with quality optimization
 */
export const getOptimizedArtworkUrl = (artworkUrl, quality = 'high') => {
  if (!artworkUrl || artworkUrl === 'null' || artworkUrl === 'undefined') {
    return null;
  }

  try {
    // For local files, return as is
    if (artworkUrl.startsWith('file://')) {
      return artworkUrl;
    }

    // Special handling for JioSaavn CDN
    if (artworkUrl.includes('saavncdn.com')) {
      const qualityMap = {
        low: '150x150',
        medium: '500x500',
        high: '500x500',
      };

      return artworkUrl.replace(
        /50x50|150x150|500x500/g,
        qualityMap[quality] || '500x500'
      );
    }

    // For other URLs, try to add quality parameter
    try {
      const url = new URL(artworkUrl);
      if (quality === 'high') {
        url.searchParams.set('quality', '100');
      }
      return url.toString();
    } catch (e) {
      // If URL parsing fails, return original
      return artworkUrl;
    }
  } catch (error) {
    console.warn('Error optimizing artwork URL:', error);
    return artworkUrl;
  }
};

/**
 * Smart image source resolver with fallbacks
 */
export const resolveImageSource = (imageData, fallbackType = 'music') => {
  // Handle null/undefined
  if (!imageData) {
    return getOptimizedImageSource(fallbackType);
  }

  // Handle string URLs
  if (typeof imageData === 'string') {
    const optimizedUrl = getOptimizedArtworkUrl(imageData);
    return optimizedUrl
      ? { uri: optimizedUrl }
      : getOptimizedImageSource(fallbackType);
  }

  // Handle require() results (numbers)
  if (typeof imageData === 'number') {
    return imageData;
  }

  // Handle objects with uri property
  if (imageData && typeof imageData === 'object' && imageData.uri) {
    const optimizedUrl = getOptimizedArtworkUrl(imageData.uri);
    return optimizedUrl
      ? { uri: optimizedUrl }
      : getOptimizedImageSource(fallbackType);
  }

  // Handle arrays (try to get best quality)
  if (Array.isArray(imageData)) {
    for (const item of imageData) {
      if (typeof item === 'string' && item.trim() !== '') {
        const optimizedUrl = getOptimizedArtworkUrl(item);
        return optimizedUrl
          ? { uri: optimizedUrl }
          : getOptimizedImageSource(fallbackType);
      }
      if (item && typeof item === 'object' && (item.url || item.link)) {
        const url = item.url || item.link;
        const optimizedUrl = getOptimizedArtworkUrl(url);
        return optimizedUrl
          ? { uri: optimizedUrl }
          : getOptimizedImageSource(fallbackType);
      }
    }
  }

  // Handle objects with url/link properties
  if (imageData && typeof imageData === 'object') {
    const url = imageData.url || imageData.link;
    if (url) {
      const optimizedUrl = getOptimizedArtworkUrl(url);
      return optimizedUrl
        ? { uri: optimizedUrl }
        : getOptimizedImageSource(fallbackType);
    }
  }

  // Final fallback
  return getOptimizedImageSource(fallbackType);
};

/**
 * Preload critical images for better performance
 */
export const preloadCriticalImages = () => {
  const criticalImages = [
    OPTIMIZED_IMAGES.PLAYING_ANIMATION,
    OPTIMIZED_IMAGES.PAUSED_ANIMATION,
    OPTIMIZED_IMAGES.DEFAULT_MUSIC,
    OPTIMIZED_IMAGES.LOCAL_MUSIC,
    OPTIMIZED_IMAGES.DEFAULT_ALBUM,
  ];

  FastImage.preload(criticalImages.map((source) => ({ uri: source })));
};

/**
 * Clear image cache when needed
 */
export const clearImageCache = () => {
  FastImage.clearMemoryCache();
  FastImage.clearDiskCache();
};

export default {
  OPTIMIZED_IMAGES,
  FALLBACK_URLS,
  getOptimizedImageSource,
  getOptimizedArtworkUrl,
  resolveImageSource,
  preloadCriticalImages,
  clearImageCache,
};
