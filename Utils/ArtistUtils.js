/**
 * Utility functions for Artist components
 */

/**
 * Get a valid image URL from an image array, with fallback
 * @param {Array} imageArray - Array of image objects
 * @returns {string} - Valid image URL or placeholder
 */
export const getValidImageUrl = (imageArray) => {
  if (!imageArray || !Array.isArray(imageArray) || imageArray.length === 0) {
    return 'https://via.placeholder.com/500x500/cccccc/666666?text=Artist';
  }
  return (
    imageArray[imageArray.length - 1]?.url ||
    imageArray[0]?.url ||
    'https://via.placeholder.com/500x500/cccccc/666666?text=Artist'
  );
};

/**
 * Format follower count with K/M suffixes
 * @param {number} count - Follower count
 * @returns {string} - Formatted count string
 */
export const formatFollowerCount = (count) => {
  if (!count) {
    return '0';
  }
  if (count >= 1000000) {
    return `${(count / 1000000).toFixed(1)}M`;
  }
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}K`;
  }
  return count.toString();
};

/**
 * Validate and sanitize route parameters
 * @param {object} routeParams - Route parameters object
 * @returns {object} - Sanitized parameters
 */
export const validateRouteParams = (routeParams = {}) => {
  const { artistId, artistName, initialTab } = routeParams;

  return {
    safeArtistId: String(artistId || '').trim(),
    safeArtistName: String(artistName || 'Unknown Artist').trim(),
    safeInitialTab: String(initialTab || 'songs').trim(),
  };
};

/**
 * Format songs for playlist
 * @param {Array} songs - Array of song objects
 * @returns {Array} - Formatted songs array
 */
export const formatSongsForPlaylist = (songs) => {
  if (!songs || !Array.isArray(songs)) {
    return [];
  }

  return songs.map((song, index) => ({
    id: song.id,
    url:
      song.downloadUrl?.[2]?.url ||
      song.downloadUrl?.[1]?.url ||
      song.downloadUrl?.[0]?.url,
    title: song.name,
    artist: song.artists?.primary
      ? song.artists.primary.map((artist) => artist.name).join(', ')
      : 'Unknown Artist',
    artwork: getValidImageUrl(song.image),
    duration: song.duration,
    language: song.language,
    primary_artists_id: song.artists?.primary?.[0]?.id,
    index: index,
  }));
};

/**
 * Process bio data into consistent format
 * @param {any} bioData - Bio data in various formats
 * @returns {Array} - Processed bio array
 */
export const processBioData = (bioData) => {
  try {
    if (!bioData) {
      return [];
    }

    // If bioData is a string, convert it to array format
    if (typeof bioData === 'string') {
      return [{ title: 'Biography', text: bioData }];
    }
    // If bioData is already an array, use it
    else if (Array.isArray(bioData)) {
      return bioData;
    }
    // If bioData is an object, convert to array
    else if (typeof bioData === 'object') {
      return [bioData];
    }

    return [];
  } catch (error) {
    console.error('Error processing bio data:', error);
    return [];
  }
};

/**
 * Check if text should be truncated (more than ~2 lines worth of text)
 * @param {string} text - Text to check
 * @returns {boolean} - Whether text should be truncated
 */
export const shouldTruncateText = (text) => {
  return text && text.length > 140;
};

/**
 * Safe string conversion with fallback
 * @param {any} value - Value to convert
 * @param {string} fallback - Fallback value
 * @returns {string} - Safe string
 */
export const safeString = (value, fallback = '') => {
  return String(value || fallback);
};

/**
 * Navigation loop detection
 * @param {object} navigationState - Navigation state
 * @returns {boolean} - Whether a loop is detected
 */
export const detectNavigationLoop = (navigationState) => {
  const routes = navigationState?.routes || [];
  const artistPageCount = routes.filter(
    (route) => route.name === 'ArtistPage'
  ).length;
  const albumPageCount = routes.filter(
    (route) => route.name === 'Album'
  ).length;

  return artistPageCount >= 3 || (artistPageCount >= 2 && albumPageCount >= 2);
};
