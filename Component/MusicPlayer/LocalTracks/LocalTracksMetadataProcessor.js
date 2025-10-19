import { StorageManager } from '../../../Utils/StorageManager';

/**
 * LocalTracksMetadataProcessor - Utility for processing local tracks metadata
 * 
 * This utility provides metadata processing capabilities including:
 * - Converting metadata to track objects
 * - Validating track data
 * - Handling file path resolution
 * - Error handling for individual tracks
 */

export class LocalTracksMetadataProcessor {
  
  /**
   * Process metadata entries into track objects
   * @param {Object} allMetadata - Object containing all metadata entries
   * @returns {Array} Array of processed track objects
   */
  static async processMetadataToTracks(allMetadata) {
    if (!allMetadata || typeof allMetadata !== 'object') {
      console.warn('LocalTracksMetadataProcessor: Invalid metadata provided');
      return [];
    }

    const tracks = [];
    const entries = Object.entries(allMetadata);
    
    console.log(`LocalTracksMetadataProcessor: Processing ${entries.length} metadata entries`);

    for (const [songId, metadata] of entries) {
      try {
        const processedTrack = await this.processIndividualTrack(songId, metadata);
        if (processedTrack) {
          tracks.push(processedTrack);
        }
      } catch (error) {
        console.error(`LocalTracksMetadataProcessor: Error processing track ${songId}:`, error);
        // Continue processing other tracks even if one fails
      }
    }

    console.log(`LocalTracksMetadataProcessor: Successfully processed ${tracks.length} tracks`);
    return tracks;
  }

  /**
   * Process individual track metadata
   * @param {string} songId - The song ID
   * @param {Object} metadata - The metadata object
   * @returns {Object|null} Processed track object or null if invalid
   */
  static async processIndividualTrack(songId, metadata) {
    try {
      // Validate required metadata
      if (!this.validateMetadata(songId, metadata)) {
        return null;
      }

      // Get file paths
      const filePaths = await this.resolveFilePaths(songId);
      if (!filePaths.songPath) {
        console.warn(`LocalTracksMetadataProcessor: Song file not found for ${songId}`);
        return null;
      }

      // Verify file exists
      const songExists = await StorageManager.isSongDownloaded(songId);
      if (!songExists) {
        console.warn(`LocalTracksMetadataProcessor: Song file does not exist for ${songId}`);
        return null;
      }

      // Create track object
      const track = this.createTrackObject(songId, metadata, filePaths);
      
      console.log(`LocalTracksMetadataProcessor: Successfully processed track: ${track.title}`);
      return track;

    } catch (error) {
      console.error(`LocalTracksMetadataProcessor: Error processing individual track ${songId}:`, error);
      return null;
    }
  }

  /**
   * Validate metadata object
   * @param {string} songId - The song ID
   * @param {Object} metadata - The metadata object
   * @returns {boolean} True if valid, false otherwise
   */
  static validateMetadata(songId, metadata) {
    if (!songId) {
      console.warn('LocalTracksMetadataProcessor: Missing song ID');
      return false;
    }

    if (!metadata || typeof metadata !== 'object') {
      console.warn(`LocalTracksMetadataProcessor: Invalid metadata for ${songId}`);
      return false;
    }

    // Check for required fields
    const requiredFields = ['title'];
    for (const field of requiredFields) {
      if (!metadata[field]) {
        console.warn(`LocalTracksMetadataProcessor: Missing required field '${field}' for ${songId}`);
        return false;
      }
    }

    return true;
  }

  /**
   * Resolve file paths for a track
   * @param {string} songId - The song ID
   * @returns {Object} Object containing songPath and artworkPath
   */
  static async resolveFilePaths(songId) {
    try {
      const songPath = await StorageManager.getSongPath(songId);
      const artworkPath = await StorageManager.getArtworkPath(songId);

      return {
        songPath,
        artworkPath
      };
    } catch (error) {
      console.error(`LocalTracksMetadataProcessor: Error resolving file paths for ${songId}:`, error);
      return {
        songPath: null,
        artworkPath: null
      };
    }
  }

  /**
   * Create track object from metadata and file paths
   * @param {string} songId - The song ID
   * @param {Object} metadata - The metadata object
   * @param {Object} filePaths - Object containing file paths
   * @returns {Object} Track object
   */
  static createTrackObject(songId, metadata, filePaths) {
    const { songPath, artworkPath } = filePaths;

    return {
      id: songId,
      title: metadata.title || 'Unknown Title',
      artist: metadata.artist || 'Unknown Artist',
      album: metadata.album || 'Unknown Album',
      duration: metadata.duration || 0,
      url: `file://${songPath}`,
      artwork: artworkPath ? `file://${artworkPath}` : null,
      localArtworkPath: artworkPath,
      isLocal: true,
      isDownloaded: true,
  sourceType: 'download',
      downloadTime: metadata.downloadTime,
      fileSize: metadata.fileSize,
      quality: metadata.quality,
      format: metadata.format,
      // Include all original metadata
      ...metadata,
      // Override with processed values
      id: songId,
      url: `file://${songPath}`,
      artwork: artworkPath ? `file://${artworkPath}` : null,
      isLocal: true,
      isDownloaded: true,
  sourceType: 'download'
    };
  }

  /**
   * Filter tracks by criteria
   * @param {Array} tracks - Array of track objects
   * @param {Object} criteria - Filter criteria
   * @returns {Array} Filtered tracks
   */
  static filterTracks(tracks, criteria = {}) {
    if (!Array.isArray(tracks)) {
      return [];
    }

    return tracks.filter(track => {
      // Filter by artist
      if (criteria.artist && !track.artist.toLowerCase().includes(criteria.artist.toLowerCase())) {
        return false;
      }

      // Filter by album
      if (criteria.album && !track.album.toLowerCase().includes(criteria.album.toLowerCase())) {
        return false;
      }

      // Filter by title
      if (criteria.title && !track.title.toLowerCase().includes(criteria.title.toLowerCase())) {
        return false;
      }

      // Filter by duration range
      if (criteria.minDuration && track.duration < criteria.minDuration) {
        return false;
      }

      if (criteria.maxDuration && track.duration > criteria.maxDuration) {
        return false;
      }

      return true;
    });
  }

  /**
   * Sort tracks by criteria
   * @param {Array} tracks - Array of track objects
   * @param {string} sortBy - Sort criteria ('title', 'artist', 'album', 'duration', 'downloadTime')
   * @param {string} order - Sort order ('asc' or 'desc')
   * @returns {Array} Sorted tracks
   */
  static sortTracks(tracks, sortBy = 'title', order = 'asc') {
    if (!Array.isArray(tracks)) {
      return [];
    }

    const sortedTracks = [...tracks].sort((a, b) => {
      let valueA, valueB;

      switch (sortBy) {
        case 'title':
          valueA = a.title?.toLowerCase() || '';
          valueB = b.title?.toLowerCase() || '';
          break;
        case 'artist':
          valueA = a.artist?.toLowerCase() || '';
          valueB = b.artist?.toLowerCase() || '';
          break;
        case 'album':
          valueA = a.album?.toLowerCase() || '';
          valueB = b.album?.toLowerCase() || '';
          break;
        case 'duration':
          valueA = a.duration || 0;
          valueB = b.duration || 0;
          break;
        case 'downloadTime':
          valueA = a.downloadTime || 0;
          valueB = b.downloadTime || 0;
          break;
        default:
          valueA = a.title?.toLowerCase() || '';
          valueB = b.title?.toLowerCase() || '';
      }

      if (valueA < valueB) {
        return order === 'asc' ? -1 : 1;
      }
      if (valueA > valueB) {
        return order === 'asc' ? 1 : -1;
      }
      return 0;
    });

    return sortedTracks;
  }

  /**
   * Get tracks statistics
   * @param {Array} tracks - Array of track objects
   * @returns {Object} Statistics object
   */
  static getTracksStatistics(tracks) {
    if (!Array.isArray(tracks)) {
      return {
        totalTracks: 0,
        totalDuration: 0,
        totalSize: 0,
        artists: 0,
        albums: 0
      };
    }

    const uniqueArtists = new Set();
    const uniqueAlbums = new Set();
    let totalDuration = 0;
    let totalSize = 0;

    tracks.forEach(track => {
      if (track.artist) uniqueArtists.add(track.artist.toLowerCase());
      if (track.album) uniqueAlbums.add(track.album.toLowerCase());
      totalDuration += track.duration || 0;
      totalSize += track.fileSize || 0;
    });

    return {
      totalTracks: tracks.length,
      totalDuration,
      totalSize,
      artists: uniqueArtists.size,
      albums: uniqueAlbums.size,
      averageDuration: tracks.length > 0 ? totalDuration / tracks.length : 0
    };
  }
}
