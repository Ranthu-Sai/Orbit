/**
 * Shared song formatting utilities to eliminate duplication across components
 */

// Text truncation options
export const TruncationOptions = {
  NONE: 'none',
  START: 'start',
  MIDDLE: 'middle',
  END: 'end',
};

/**
 * Format song title with proper encoding/decoding
 * @param {string} title - Raw song title
 * @param {Object} options - Formatting options
 * @returns {string} Formatted title
 */
export const formatSongTitle = (title, options = {}) => {
  const {
    decodeHtml = true,
    maxLength = null,
    truncation = TruncationOptions.END,
  } = options;

  if (!title || typeof title !== 'string') {
    return 'Unknown Title';
  }

  let formatted = title;

  // Decode HTML entities if requested
  if (decodeHtml) {
    formatted = formatted
      .replace(/"/g, '"')
      .replace(/&/g, '&')
      .replace(/&#039;/g, "'")
      .replace(/&trade;/g, '™')
      .replace(/&hellip;/g, '…')
      .replace(/&mdash;/g, '—')
      .replace(/&ndash;/g, '–');
  }

  // Apply length limit with truncation
  if (maxLength && formatted.length > maxLength) {
    switch (truncation) {
      case TruncationOptions.START:
        formatted =
          '...' + formatted.substring(formatted.length - maxLength + 3);
        break;
      case TruncationOptions.MIDDLE:
        const halfLength = Math.floor((maxLength - 3) / 2);
        formatted =
          formatted.substring(0, halfLength) +
          '...' +
          formatted.substring(formatted.length - halfLength);
        break;
      case TruncationOptions.END:
      default:
        formatted = formatted.substring(0, maxLength - 3) + '...';
        break;
    }
  }

  return formatted || 'Unknown Title';
};

/**
 * Format artist name(s) from various data structures
 * @param {string|Array|Object} artist - Artist data
 * @param {Object} options - Formatting options
 * @returns {string} Formatted artist string
 */
export const formatArtist = (artist, options = {}) => {
  const {
    separator = ', ',
    maxArtists = 3,
    fallback = 'Unknown Artist',
  } = options;

  if (!artist) {
    return fallback;
  }

  // Handle string artist
  if (typeof artist === 'string') {
    return formatSongTitle(artist);
  }

  // Handle array of artists
  if (Array.isArray(artist)) {
    if (artist.length === 0) {
      return fallback;
    }

    const artists = artist
      .slice(0, maxArtists)
      .map((a) => {
        if (typeof a === 'string') {
          return formatSongTitle(a);
        }
        if (typeof a === 'object' && a.name) {
          return formatSongTitle(a.name);
        }
        return fallback;
      })
      .filter((a) => a !== fallback);

    if (artists.length === 0) {
      return fallback;
    }

    if (artists.length === 1) {
      return artists[0];
    }

    return artists.join(separator);
  }

  // Handle object with primary artists
  if (typeof artist === 'object') {
    if (artist.primary && Array.isArray(artist.primary)) {
      return formatArtist(artist.primary, options);
    }

    if (artist.name) {
      return formatSongTitle(artist.name);
    }

    if (artist.artist && typeof artist.artist === 'string') {
      return formatSongTitle(artist.artist);
    }
  }

  return fallback;
};

/**
 * Format duration from seconds to readable string
 * @param {number} seconds - Duration in seconds
 * @param {boolean} showHours - Whether to show hours
 * @returns {string} Formatted duration
 */
export const formatDuration = (seconds, showHours = false) => {
  if (!seconds || typeof seconds !== 'number' || seconds < 0) {
    return '0:00';
  }

  const totalSeconds = Math.floor(seconds);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const secs = totalSeconds % 60;

  if (showHours && hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
      .toString()
      .padStart(2, '0')}`;
  } else {
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  }
};

/**
 * Format file size in human readable format
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export const formatFileSize = (bytes) => {
  if (!bytes || typeof bytes !== 'number' || bytes < 0) {
    return '0 B';
  }

  const units = ['B', 'KB', 'MB', 'GB'];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

/**
 * Format song for music player with consistent structure
 * @param {Object} song - Raw song data
 * @param {Object} options - Formatting options
 * @returns {Object} Formatted song object
 */
export const formatSongForPlayer = (song, options = {}) => {
  const { includeMetadata = true, validateData = true } = options;

  if (!song) {
    throw new Error('Song data is required');
  }

  // Validate song data if requested
  if (validateData) {
    const { validateSong } = require('./ValidationUtils');
    const validation = validateSong(song);

    if (validation.status === 'error') {
      console.warn('Song validation failed:', validation.message);
    }
  }

  // Extract URLs based on quality preference
  const { getIndexQuality } = require('../MusicPlayerFunctions');
  const quality = getIndexQuality ? getIndexQuality() : 3;

  let songUrl = null;
  if (song.url) {
    if (
      Array.isArray(song.url) &&
      song.url.length > quality &&
      song.url[quality]?.url
    ) {
      songUrl = song.url[quality].url;
    } else if (
      Array.isArray(song.url) &&
      song.url.length > 0 &&
      song.url[0]?.url
    ) {
      songUrl = song.url[0].url;
    } else if (typeof song.url === 'string') {
      songUrl = song.url;
    }
  }

  if (!songUrl && song.downloadUrl) {
    if (
      Array.isArray(song.downloadUrl) &&
      song.downloadUrl.length > quality &&
      song.downloadUrl[quality]?.url
    ) {
      songUrl = song.downloadUrl[quality].url;
    } else if (
      Array.isArray(song.downloadUrl) &&
      song.downloadUrl.length > 0 &&
      song.downloadUrl[0]?.url
    ) {
      songUrl = song.downloadUrl[0].url;
    }
  }

  if (!songUrl && song.download_url) {
    if (
      Array.isArray(song.download_url) &&
      song.download_url.length > quality &&
      song.download_url[quality]?.url
    ) {
      songUrl = song.download_url[quality].url;
    } else if (
      Array.isArray(song.download_url) &&
      song.download_url.length > 0 &&
      song.download_url[0]?.url
    ) {
      songUrl = song.download_url[0].url;
    }
  }

  // Extract artwork using shared utilities
  const { extractImageUri } = require('./ImageUtils');
  const artwork =
    extractImageUri(song.image) ||
    extractImageUri(song.artwork) ||
    extractImageUri(song.albumArt);

  const formattedSong = {
    id: song.id,
    url: songUrl,
    title: formatSongTitle(song.name || song.title),
    artist: formatArtist(song.artist || song.artists?.primary),
    artwork: artwork,
    duration: song.duration || 0,
    language: song.language || 'en',
    source: song.source || song.api || 'unknown',
    sourceType: song.sourceType || song.source || 'online',
  };

  // Include additional metadata if requested
  if (includeMetadata) {
    formattedSong.metadata = {
      album: song.album,
      album_id: song.album_id,
      year: song.year,
      playCount: song.playCount,
      label: song.label,
      copyright: song.copyright,
      hasLyrics: song.hasLyrics,
      releaseDate: song.releaseDate,
      explicitContent: song.explicitContent,
      artists: song.artists,
      downloadUrl: song.downloadUrl || song.download_url,
      originalData: song,
    };
  }

  return formattedSong;
};

/**
 * Format multiple songs for playlist
 * @param {Array} songs - Array of song objects
 * @param {Object} options - Formatting options
 * @returns {Promise<Array>} Array of formatted songs
 */
export const formatSongsForPlaylist = async (songs, options = {}) => {
  if (!Array.isArray(songs)) {
    throw new Error('Songs must be an array');
  }

  const {
    batchSize = 5,
    includeMetadata = true,
    validateData = true,
    onProgress = null,
  } = options;

  const formattedSongs = [];

  // Process songs in batches to avoid blocking
  for (let i = 0; i < songs.length; i += batchSize) {
    const batch = songs.slice(i, i + batchSize);

    const batchPromises = batch.map(async (song) => {
      try {
        return formatSongForPlayer(song, { includeMetadata, validateData });
      } catch (error) {
        console.error(
          `Error formatting song ${song?.title || 'unknown'}:`,
          error
        );
        return null; // Skip invalid songs
      }
    });

    const batchResults = await Promise.all(batchPromises);
    formattedSongs.push(...batchResults.filter((song) => song !== null));

    // Report progress if callback provided
    if (onProgress) {
      const progress = Math.min((i + batchSize) / songs.length, 1);
      onProgress(progress, i + batchSize, songs.length);
    }

    // Small delay between batches to prevent blocking
    if (i + batchSize < songs.length) {
      await new Promise((resolve) => setTimeout(resolve, 10));
    }
  }

  return formattedSongs;
};

/**
 * Format text with truncation for display
 * @param {string} text - Text to format
 * @param {number} maxLength - Maximum length
 * @param {string} truncation - Truncation method
 * @returns {string} Formatted text
 */
export const formatTextWithTruncation = (
  text,
  maxLength = 20,
  truncation = TruncationOptions.END
) => {
  if (!text || typeof text !== 'string') {
    return '';
  }

  if (text.length <= maxLength) {
    return text;
  }

  switch (truncation) {
    case TruncationOptions.START:
      return '...' + text.substring(text.length - maxLength + 3);
    case TruncationOptions.MIDDLE:
      const halfLength = Math.floor((maxLength - 3) / 2);
      return (
        text.substring(0, halfLength) +
        '...' +
        text.substring(text.length - halfLength)
      );
    case TruncationOptions.END:
    default:
      return text.substring(0, maxLength - 3) + '...';
  }
};

/**
 * Format search query for API calls
 * @param {string} query - Raw search query
 * @returns {string} Formatted query
 */
export const formatSearchQuery = (query) => {
  if (!query || typeof query !== 'string') {
    return '';
  }

  return query
    .trim()
    .replace(/\s+/g, ' ') // Replace multiple spaces with single space
    .substring(0, 100); // Limit query length
};

/**
 * Format song count for display
 * @param {number} count - Song count
 * @returns {string} Formatted count
 */
export const formatSongCount = (count) => {
  if (!count || typeof count !== 'number' || count < 0) {
    return '0 songs';
  }

  if (count === 1) {
    return '1 song';
  }

  return `${count.toLocaleString()} songs`;
};

/**
 * Format playlist duration from song durations
 * @param {Array} songs - Array of song objects
 * @returns {string} Formatted duration
 */
export const formatPlaylistDuration = (songs) => {
  if (!Array.isArray(songs) || songs.length === 0) {
    return '0:00';
  }

  const totalSeconds = songs.reduce((total, song) => {
    const duration = song.duration || 0;
    return total + (typeof duration === 'number' ? duration : 0);
  }, 0);

  return formatDuration(totalSeconds, true);
};

/**
 * Format song metadata for display
 * @param {Object} song - Song object
 * @param {Array} fields - Fields to include
 * @returns {Object} Formatted metadata
 */
export const formatSongMetadata = (song, fields = []) => {
  if (!song) {
    return {};
  }

  const metadata = {};

  const fieldMap = {
    album: song.album,
    year: song.year,
    label: song.label,
    copyright: song.copyright,
    releaseDate: song.releaseDate,
    playCount: song.playCount,
    hasLyrics: song.hasLyrics,
    explicitContent: song.explicitContent,
  };

  if (fields.length === 0) {
    // Include all available fields
    Object.keys(fieldMap).forEach((field) => {
      if (fieldMap[field] !== undefined && fieldMap[field] !== null) {
        metadata[field] = fieldMap[field];
      }
    });
  } else {
    // Include only specified fields
    fields.forEach((field) => {
      if (fieldMap[field] !== undefined && fieldMap[field] !== null) {
        metadata[field] = fieldMap[field];
      }
    });
  }

  return metadata;
};

/**
 * Create song display name combining title and artist
 * @param {Object} song - Song object
 * @param {Object} options - Formatting options
 * @returns {string} Display name
 */
export const createSongDisplayName = (song, options = {}) => {
  const { separator = ' - ', maxLength = 50, includeArtist = true } = options;

  if (!song) {
    return 'Unknown Song';
  }

  const title = formatSongTitle(song.name || song.title);
  const artist = includeArtist
    ? formatArtist(song.artist || song.artists?.primary)
    : '';

  let displayName = title;
  if (artist && artist !== 'Unknown Artist') {
    displayName = `${title}${separator}${artist}`;
  }

  return formatTextWithTruncation(displayName, maxLength);
};

/**
 * Format song quality for display
 * @param {string} quality - Quality string
 * @returns {string} Formatted quality
 */
export const formatSongQuality = (quality) => {
  if (!quality) {
    return 'Unknown';
  }

  switch (quality.toUpperCase()) {
    case 'LOSSLESS':
      return 'Lossless';
    case 'HIGH':
      return 'High';
    case 'MEDIUM':
      return 'Medium';
    case 'LOW':
      return 'Low';
    default:
      return quality.charAt(0).toUpperCase() + quality.slice(1).toLowerCase();
  }
};

/**
 * Format source type for display
 * @param {string} source - Source type
 * @returns {string} Formatted source
 */
export const formatSourceType = (source) => {
  if (!source) {
    return 'Unknown';
  }

  switch (source.toLowerCase()) {
    case 'saavn':
      return 'JioSaavn';
    case 'mymusic':
      return 'My Music';
    case 'local':
      return 'Local';
    case 'download':
      return 'Downloaded';
    default:
      return source.charAt(0).toUpperCase() + source.slice(1).toLowerCase();
  }
};

/**
 * Batch format multiple text strings
 * @param {Array<string>} texts - Array of text strings
 * @param {number} maxLength - Maximum length for each text
 * @returns {Array<string>} Array of formatted texts
 */
export const batchFormatText = (texts, maxLength = 20) => {
  if (!Array.isArray(texts)) {
    return [];
  }

  return texts.map((text) => formatTextWithTruncation(text, maxLength));
};

/**
 * Create consistent song hash for comparison
 * @param {Object} song - Song object
 * @returns {string} Song hash
 */
export const createSongHash = (song) => {
  if (!song || !song.id) {
    return '';
  }

  const title = formatSongTitle(song.name || song.title).toLowerCase();
  const artist = formatArtist(
    song.artist || song.artists?.primary
  ).toLowerCase();

  return `${song.id}_${title}_${artist}`.replace(/\s+/g, '_');
};

/**
 * Compare two songs for equality
 * @param {Object} song1 - First song
 * @param {Object} song2 - Second song
 * @returns {boolean} True if songs are equal
 */
export const areSongsEqual = (song1, song2) => {
  if (!song1 || !song2) {
    return false;
  }
  if (song1 === song2) {
    return true;
  }

  return createSongHash(song1) === createSongHash(song2);
};

/**
 * Remove duplicate songs from array
 * @param {Array} songs - Array of songs
 * @returns {Array} Array without duplicates
 */
export const removeDuplicateSongs = (songs) => {
  if (!Array.isArray(songs)) {
    return [];
  }

  const seen = new Set();
  return songs.filter((song) => {
    const hash = createSongHash(song);
    if (seen.has(hash)) {
      return false;
    }
    seen.add(hash);
    return true;
  });
};
