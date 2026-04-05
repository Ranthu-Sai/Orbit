/**
 * Album utility functions for deduplication and processing
 */

/**
 * Normalize album name for comparison (lowercase, remove special chars)
 * @param {string} name - Album name
 * @returns {string} Normalized name
 */
const normalizeAlbumName = (name) => {
  if (!name) {
    return '';
  }
  return name
    .toLowerCase()
    .replace(/[^\w\s]/gi, '') // Remove special characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
};

/**
 * Deduplicate albums array, prioritizing Saavn over YTMusic
 * @param {Array} albums - Array of album objects
 * @returns {Array} Deduplicated array
 */
export const deduplicateAlbums = (albums) => {
  if (!Array.isArray(albums) || albums.length === 0) {
    return [];
  }

  // Group albums by normalized name
  const albumGroups = {};

  albums.forEach((album) => {
    if (!album || !album.name) {
      return;
    }

    const normalizedName = normalizeAlbumName(album.name);

    if (!albumGroups[normalizedName]) {
      albumGroups[normalizedName] = [];
    }

    albumGroups[normalizedName].push(album);
  });

  // For each group, prioritize Saavn over YTMusic
  const deduplicatedAlbums = [];

  Object.values(albumGroups).forEach((group) => {
    if (group.length === 1) {
      // Only one album with this name
      deduplicatedAlbums.push(group[0]);
    } else {
      // Multiple albums with same name - prioritize Saavn
      const saavnAlbum = group.find(
        (album) =>
          album.source !== 'ytmusic' &&
          album.source !== 'youtube' &&
          !album.id?.length === 11 // YTMusic IDs are typically 11 chars
      );

      if (saavnAlbum) {
        deduplicatedAlbums.push(saavnAlbum);
      } else {
        // No Saavn album found, use first one
        deduplicatedAlbums.push(group[0]);
      }
    }
  });

  return deduplicatedAlbums;
};

/**
 * Check if an album is from YTMusic
 * @param {Object} album - Album object
 * @returns {boolean} True if from YTMusic
 */
export const isYTMusicAlbum = (album) => {
  if (!album) {
    return false;
  }

  return (
    album.source === 'ytmusic' ||
    album.source === 'youtube' ||
    (album.id && typeof album.id === 'string' && album.id.length === 11)
  );
};
