import { StorageManager } from './StorageManager';
import { downloadFileWithAnalytics } from './FileUtils';
import { ToastAndroid } from 'react-native';
import EventRegister from './EventRegister';
import { getIndexQuality } from '../MusicPlayerFunctions';
import { embedMetadataInFile, hasMetadataSupportByExtension } from './NativeMetadataWriter';
import RNFS from 'react-native-fs';

/**
 * Unified Download Service
 * This service provides a single, consistent way to download songs across the entire app
 */

export class UnifiedDownloadService {

  /**
   * Downloads a song with proper metadata saving and analytics tracking
   * @param {Object} song - Song object with id, title, artist, url, artwork, etc.
   * @param {Function} onProgress - Optional progress callback (percentage) => void
   * @returns {Promise<boolean>} - Success status
   */
  static async downloadSong(song, onProgress = null) {
    try {
      // Validate input
      if (!song || !song.id) {
        ToastAndroid.show('Invalid song data', ToastAndroid.SHORT);
        return false;
      }

      // Check if already downloaded
      const isAlreadyDownloaded = await StorageManager.isSongDownloaded(song.id);
      if (isAlreadyDownloaded) {
        ToastAndroid.show('Song already downloaded', ToastAndroid.SHORT);
        return true;
      }

      // Emit download started event
      EventRegister.emit('download-started', song.id);

      // Ensure directories exist
      await StorageManager.ensureDirectoriesExist();

      // Get download URL
      const downloadUrl = await this.getDownloadUrl(song);
      if (!downloadUrl) {
        throw new Error('No valid download URL found');
      }

      // Get file paths (pass source for correct file extension)
      // Use isDabTrack as fallback for source detection
      const effectiveSource = song.source || (song.isDabTrack ? 'dab' : null);
      console.log('📂 Getting song path with source:', effectiveSource, '(original:', song.source, ', isDabTrack:', song.isDabTrack, ')');
      const songPath = await StorageManager.getSongPath(song.id, song.title, effectiveSource);
      const artworkPath = await StorageManager.getArtworkPath(song.id);

      // Download song file
      const songDownloadSuccess = await downloadFileWithAnalytics(
        downloadUrl,
        songPath,
        {
          id: song.id,
          name: song.title || 'Unknown',
          type: 'song'
        }
      );

      if (!songDownloadSuccess) {
        throw new Error('Failed to download song file');
      }

      // Download artwork if available (to temp location for embedding)
      let artworkDownloadSuccess = false;
      const artworkUrl = this.getArtworkUrl(song);
      console.log(`🎨 [Artwork Debug] Song object keys:`, Object.keys(song));
      console.log(`🎨 [Artwork Debug] song.artwork:`, song.artwork);
      console.log(`🎨 [Artwork Debug] song.image:`, song.image);
      console.log(`🎨 [Artwork Debug] Resolved artworkUrl:`, artworkUrl);

      if (artworkUrl) {
        console.log(`🎨 [Artwork] Downloading from: ${artworkUrl}`);
        try {
          artworkDownloadSuccess = await downloadFileWithAnalytics(
            artworkUrl,
            artworkPath,
            {
              id: song.id,
              name: `${song.title} - Artwork`,
              type: 'artwork'
            }
          );

          // Verify downloaded file exists and has content
          if (artworkDownloadSuccess) {
            const fileExists = await RNFS.exists(artworkPath);
            if (fileExists) {
              const fileInfo = await RNFS.stat(artworkPath);
              console.log(`🎨 [Artwork] Download result: success=true, fileSize=${fileInfo.size} bytes`);
              // Ensure file has actual content (at least 100 bytes for a valid image)
              if (fileInfo.size < 100) {
                console.warn(`🎨 [Artwork] Downloaded file too small (${fileInfo.size} bytes), likely invalid`);
                artworkDownloadSuccess = false;
                await RNFS.unlink(artworkPath).catch(() => { });
              }
            } else {
              console.warn(`🎨 [Artwork] Download reported success but file not found`);
              artworkDownloadSuccess = false;
            }
          } else {
            console.warn(`🎨 [Artwork] Download FAILED for: ${song.title}`);
          }
        } catch (artworkError) {
          console.error(`🎨 [Artwork] Error downloading artwork:`, artworkError.message);
          artworkDownloadSuccess = false;
        }
      }

      // Embed metadata and artwork directly into the audio file
      let metadataEmbedded = false;
      if (hasMetadataSupportByExtension(songPath)) {
        try {
          const artworkPathToEmbed = artworkDownloadSuccess ? artworkPath : null;
          console.log(`📝 [Metadata] Embedding into: ${song.title}`);
          console.log(`🎨 [Metadata] Artwork path for embedding: ${artworkPathToEmbed || 'NONE (artwork download failed)'}`);

          metadataEmbedded = await embedMetadataInFile(
            songPath,
            {
              title: song.title || 'Unknown',
              artist: this.formatArtist(song.artist) || 'Unknown Artist',
              album: song.album || 'Unknown Album',
              year: song.year || new Date().getFullYear().toString()
            },
            artworkPathToEmbed
          );

          if (metadataEmbedded) {
            console.log(`Metadata embedded successfully for: ${song.title}`);
            // Clean up separate artwork file since it's now embedded
            if (artworkDownloadSuccess && await RNFS.exists(artworkPath)) {
              try {
                await RNFS.unlink(artworkPath);
                console.log('Cleaned up temp artwork file (now embedded)');
              } catch (cleanupErr) {
                // Non-critical, continue
              }
            }
          }
        } catch (embedError) {
          console.warn(`Failed to embed metadata for ${song.title}:`, embedError);
          // Continue without embedded metadata - file is still playable
        }
      }

      // Prepare metadata for Orbit's internal library
      const metadata = {
        id: song.id,
        title: song.title || 'Unknown',
        artist: this.formatArtist(song.artist) || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        url: downloadUrl,
        artwork: artworkUrl,
        localSongPath: songPath,
        localArtworkPath: (artworkDownloadSuccess && !metadataEmbedded) ? artworkPath : null,
        duration: song.duration || 0,
        language: song.language || '',
        artistID: song.artistID || '',
        source: effectiveSource || 'saavn', // Store source for correct file extension on delete
        isDownloaded: true,
        metadataEmbedded: metadataEmbedded,
        downloadedAt: new Date().toISOString()
      };

      // Save metadata to AsyncStorage for Orbit's internal use
      await StorageManager.saveDownloadedSongMetadata(song.id, metadata);

      console.log(`Download completed successfully for: ${song.title} (ID: ${song.id})`);

      // Emit download completed event
      EventRegister.emit('download-complete', song.id);

      // Show success message
      ToastAndroid.show(`${song.title} Downloaded`, ToastAndroid.SHORT);

      return true;

    } catch (error) {
      console.error(`Download failed for ${song.title}:`, error);
      ToastAndroid.show(`Download failed: ${error.message}`, ToastAndroid.LONG);

      // Clean up any partial metadata
      try {
        await StorageManager.removeDownloadedSongMetadata(song.id);
      } catch (cleanupError) {
        console.error('Error cleaning up failed download metadata:', cleanupError);
      }

      return false;
    }
  }

  /**
   * Gets the best quality download URL from song data
   * @param {Object} song - Song object
   * @returns {Promise<string|null>} - Download URL or null
   */
  static async getDownloadUrl(song) {
    try {
      const quality = await getIndexQuality();

      // Handle DAB Music source - need to fetch stream URL from API
      // Detection: source='dab' OR isDabTrack flag
      if (song.source === 'dab' || song.isDabTrack === true) {
        console.log('🎵 DAB track detected, fetching download URL for ID:', song.id);
        try {
          const dabMusicService = require('./DabMusicService').default;
          await dabMusicService.initialize();

          const streamUrl = await dabMusicService.getStreamUrl(song.id);
          if (streamUrl) {
            console.log('✅ Got DAB download URL successfully');
            return streamUrl;
          }
          console.error('❌ Failed to get DAB download URL - no URL returned');
          return null;
        } catch (dabError) {
          console.error('❌ DAB stream URL fetch error:', dabError.message);
          return null;
        }
      }

      // Method 1: downloadUrl array (Saavn format - most common)
      if (song.downloadUrl && Array.isArray(song.downloadUrl)) {
        if (song.downloadUrl[quality]?.url) {
          return song.downloadUrl[quality].url;
        }
        // Fallback to any available URL
        for (let i = song.downloadUrl.length - 1; i >= 0; i--) {
          if (song.downloadUrl[i]?.url) {
            return song.downloadUrl[i].url;
          }
        }
      }

      // Method 2: download_url array (alternative format)
      if (song.download_url && Array.isArray(song.download_url)) {
        if (song.download_url[quality]?.url) {
          return song.download_url[quality].url;
        }
        // Fallback to any available URL
        for (let i = song.download_url.length - 1; i >= 0; i--) {
          if (song.download_url[i]?.url) {
            return song.download_url[i].url;
          }
        }
      }

      // Method 3: url array (from EachSongCard format)
      if (song.url && Array.isArray(song.url)) {
        if (song.url[quality]?.url) {
          return song.url[quality].url;
        }
        // Fallback to any available URL
        for (let i = song.url.length - 1; i >= 0; i--) {
          if (song.url[i]?.url) {
            return song.url[i].url;
          }
        }
      }

      // Method 4: Direct URL string (YTMusic or pre-resolved)
      if (typeof song.url === 'string' && song.url.startsWith('http')) {
        return song.url;
      }

      console.error('No valid download URL found in song data:', song);
      return null;

    } catch (error) {
      console.error('Error getting download URL:', error);
      return null;
    }
  }

  /**
   * Gets the artwork URL from song data
   * @param {Object} song - Song object
   * @returns {string|null} - Artwork URL or null
   */
  static getArtworkUrl(song) {
    // Helper to check if URL is valid (not a placeholder)
    const isValidUrl = (url) => {
      if (!url || typeof url !== 'string') return false;
      if (!url.startsWith('http')) return false;
      // Filter out common placeholder URLs
      if (url.includes('placeholder') || url.includes('htmlcolorcodes.com')) return false;
      return true;
    };

    // Method 1: Direct artwork property (string)
    if (isValidUrl(song.artwork)) {
      return song.artwork;
    }

    // Method 2: artwork as object with uri (React Native Image format)
    if (song.artwork && typeof song.artwork === 'object' && isValidUrl(song.artwork.uri)) {
      return song.artwork.uri;
    }

    // Method 3: image property (string)
    if (isValidUrl(song.image)) {
      return song.image;
    }

    // Method 4: image as object with uri
    if (song.image && typeof song.image === 'object' && !Array.isArray(song.image) && isValidUrl(song.image.uri)) {
      return song.image.uri;
    }

    // Method 5: image array (get highest quality - last one)
    if (song.image && Array.isArray(song.image) && song.image.length > 0) {
      for (let i = song.image.length - 1; i >= 0; i--) {
        const item = song.image[i];
        if (typeof item === 'string' && isValidUrl(item)) {
          return item;
        }
        if (item?.url && isValidUrl(item.url)) {
          return item.url;
        }
        if (item?.uri && isValidUrl(item.uri)) {
          return item.uri;
        }
        if (item?.link && isValidUrl(item.link)) {
          return item.link;
        }
      }
    }

    // Method 6: cover property (alternative naming)
    if (isValidUrl(song.cover)) {
      return song.cover;
    }

    // Method 7: thumbnail property
    if (isValidUrl(song.thumbnail)) {
      return song.thumbnail;
    }

    // Method 8: images array (Spotify format)
    if (song.images && Array.isArray(song.images) && song.images.length > 0) {
      for (let i = song.images.length - 1; i >= 0; i--) {
        const item = song.images[i];
        if (typeof item === 'string' && isValidUrl(item)) {
          return item;
        }
        if (item?.url && isValidUrl(item.url)) {
          return item.url;
        }
      }
    }

    return null;
  }

  /**
   * Formats artist name(s) consistently
   * @param {string|Array|Object} artist - Artist data
   * @returns {string} - Formatted artist string
   */
  static formatArtist(artist) {
    if (!artist) return 'Unknown Artist';

    if (typeof artist === 'string') {
      return artist;
    }

    if (Array.isArray(artist)) {
      return artist.map(a => typeof a === 'object' ? a.name : a).join(', ');
    }

    if (typeof artist === 'object' && artist.name) {
      return artist.name;
    }

    return 'Unknown Artist';
  }

  /**
   * Checks if a song is downloaded
   * @param {string} songId - Song ID
   * @returns {Promise<boolean>} - Download status
   */
  static async isDownloaded(songId) {
    return await StorageManager.isSongDownloaded(songId);
  }

  /**
   * Removes a downloaded song
   * @param {string} songId - Song ID
   * @returns {Promise<boolean>} - Success status
   */
  static async removeSong(songId) {
    try {
      await StorageManager.removeDownloadedSongMetadata(songId);
      EventRegister.emit('download-removed', songId);
      return true;
    } catch (error) {
      console.error('Error removing downloaded song:', error);
      return false;
    }
  }
}
