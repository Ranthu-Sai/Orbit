import { StorageManager } from './StorageManager';
import { downloadFileWithAnalytics, detectAudioFormat, renameToCorrectExtension } from './FileUtils';
import { ToastAndroid } from 'react-native';
import EventRegister from './EventRegister';
import { getIndexQuality } from '../MusicPlayerFunctions';
import { embedMetadataInFile } from './NativeMetadataWriter';
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

      // Get download URL (may return object with headers for YTMusic/DAB)
      const downloadResult = await this.getDownloadUrl(song);
      if (!downloadResult) {
        throw new Error('No valid download URL found');
      }

      // Extract URL and headers (YTMusic returns object, others return string)
      let downloadUrl;
      let downloadHeaders = null;
      let audioFormat = null; // Actual audio format from stream (webm, m4a, etc.)
      if (typeof downloadResult === 'object' && downloadResult.url) {
        downloadUrl = downloadResult.url;
        downloadHeaders = downloadResult.headers || null;
        audioFormat = downloadResult.format || null; // e.g., 'webm', 'm4a', 'opus'
      } else {
        downloadUrl = downloadResult;
      }

      // Get file paths (pass source for correct file extension)
      // Use isDabTrack as fallback for source detection
      const isYTMusic = song.source === 'ytmusic' ||
        (song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isDabTrack && !song.isLocalMusic);

      // For YTMusic, use the actual format from the stream, or default format
      // Pass the format as the source so StorageManager uses correct extension
      let effectiveSource;
      if (isYTMusic && audioFormat) {
        // Use format-based source for correct extension (e.g., 'ytmusic_webm', 'ytmusic_m4a')
        effectiveSource = `ytmusic_${audioFormat}`;
      } else if (isYTMusic) {
        effectiveSource = 'ytmusic';
      } else {
        effectiveSource = song.source || (song.isDabTrack ? 'dab' : null);
      }
      const songPath = await StorageManager.getSongPath(song.id, song.title, effectiveSource);
      const artworkPath = await StorageManager.getArtworkPath(song.id);

      // Download song file (with headers for YTMusic and progress tracking)
      const songDownloadSuccess = await downloadFileWithAnalytics(
        downloadUrl,
        songPath,
        {
          id: String(song.id),
          name: String(song.title || 'Unknown'),
          type: 'song'
        },
        downloadHeaders, // Pass headers (null for non-YTMusic sources)
        // Progress callback - emit global events AND call provided callback
        (progress) => {
          // Emit global event so all components can update
          EventRegister.emit('download-progress', { songId: song.id, progress });
          // Also call the direct callback if provided
          if (typeof onProgress === 'function') {
            onProgress(progress);
          }
        }
      );

      if (!songDownloadSuccess) {
        throw new Error('Failed to download song file');
      }

      // Download artwork if available (to temp location for embedding)
      let artworkDownloadSuccess = false;
      const artworkUrl = this.getArtworkUrl(song);
      if (artworkUrl) {
        try {
          artworkDownloadSuccess = await downloadFileWithAnalytics(
            artworkUrl,
            artworkPath,
            {
              id: String(song.id),
              name: String(song.title || 'Unknown') + ' - Artwork',
              type: 'artwork'
            }
          );

          // Verify downloaded file exists and has content
          if (artworkDownloadSuccess) {
            const fileExists = await RNFS.exists(artworkPath);
            if (fileExists) {
              const fileInfo = await RNFS.stat(artworkPath);
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

      // Detect actual file format using magic bytes before attempting metadata embedding
      // This prevents errors when YouTube returns WebM/Opus but claims M4A
      const formatInfo = await detectAudioFormat(songPath);
      // If file has wrong extension, rename it
      let finalSongPath = songPath;
      if (formatInfo.actualExtension && !songPath.toLowerCase().endsWith(formatInfo.actualExtension)) {
        const renamedPath = await renameToCorrectExtension(songPath, formatInfo.actualExtension);
        if (renamedPath) {
          finalSongPath = renamedPath;
        }
      }

      // Embed metadata and artwork directly into the audio file
      let metadataEmbedded = false;
      if (formatInfo.canEmbedMetadata) {
        try {
          const artworkPathToEmbed = artworkDownloadSuccess ? artworkPath : null;
          metadataEmbedded = await embedMetadataInFile(
            finalSongPath,
            {
              title: String(song.title || 'Unknown'),
              artist: String(this.formatArtist(song.artist) || 'Unknown Artist'),
              album: String(song.album || 'Unknown Album'),
              year: String(song.year || new Date().getFullYear().toString())
            },
            artworkPathToEmbed
          );

          if (metadataEmbedded) {
            // Clean up separate artwork file since it's now embedded
            if (artworkDownloadSuccess && await RNFS.exists(artworkPath)) {
              try {
                await RNFS.unlink(artworkPath);
              } catch (cleanupErr) {
                // Non-critical, continue
              }
            }
          }
        } catch (embedError) {
          console.warn(`Failed to embed metadata for ${song.title}:`, embedError);
          // Continue without embedded metadata - file is still playable
        }
      } else {
      }

      // Prepare metadata for Orbit's internal library
      const metadata = {
        id: song.id,
        title: song.title || 'Unknown',
        artist: this.formatArtist(song.artist) || 'Unknown Artist',
        album: song.album || 'Unknown Album',
        url: downloadUrl,
        artwork: artworkUrl,
        localSongPath: finalSongPath,
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
   * For YTMusic and DAB, returns { url, headers } object
   * For other sources (Saavn), returns just the URL string
   * @param {Object} song - Song object
   * @returns {Promise<string|{url: string, headers: Object}|null>} - Download URL/object or null
   */
  static async getDownloadUrl(song) {
    try {
      const quality = await getIndexQuality();

      // ============================================================
      // YTMUSIC SOURCE - Fetch stream URL with required headers
      // Detection: source='ytmusic' OR 11-character ID (YouTube video ID format)
      // ============================================================
      const isYTMusic = song.source === 'ytmusic' ||
        (song.id && typeof song.id === 'string' && song.id.length === 11 && !song.isDabTrack && !song.isLocalMusic);

      if (isYTMusic) {
        try {
          const youtubeStreamingService = require('./YouTubeStreamingService').default;
          // Pass preferM4A=true for downloads to get M4A format (supports metadata embedding)
          const streamData = await youtubeStreamingService.getStreamUrl(song.id, true);

          if (streamData && streamData.url) {
            // Return object with URL, headers, and format metadata
            return {
              url: streamData.url,
              headers: streamData.headers || {
                'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 12; en_IN)',
                'Range': 'bytes=0-'
              },
              thumbnail: streamData.thumbnail,
              format: streamData.format || null,
              mimeType: streamData.mimeType || null,
              source: 'ytmusic'
            };
          }
          console.error('❌ Failed to get YTMusic download URL - no URL returned');
          return null;
        } catch (ytError) {
          console.error('❌ YTMusic stream URL fetch error:', ytError.message);
          return null;
        }
      }

      // ============================================================
      // SPOTIFY SOURCE - Map to YTMusic first, then get stream URL
      // Detection: source='spotify' OR spotifyId OR _needsSpotifyMapping flag
      // Uses same logic as SmartPrefetchManager for playback
      // ============================================================
      if (song.source === 'spotify' || song.spotifyId || song._needsSpotifyMapping || (typeof song.url === 'string' && song.url?.startsWith('spotify://'))) {
        try {
          const YouTubeMusicService = require('./YouTubeMusicService').default;
          const ytMusicResult = await YouTubeMusicService.searchAndStream(
            song.title || song.name,
            song.artist || song.primaryArtists || song.artists || ''
          );

          if (ytMusicResult && ytMusicResult.url && !ytMusicResult.error) {
            return {
              url: ytMusicResult.url,
              headers: ytMusicResult.headers || {
                'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 12; en_IN)',
                'Range': 'bytes=0-'
              },
              format: ytMusicResult.format || null,
              source: 'ytmusic' // Mark as ytmusic since we're downloading from YTMusic
            };
          }
          console.error('❌ Failed to map Spotify track to YTMusic for download:', song.title);
          return null;
        } catch (spotifyError) {
          console.error('❌ Spotify mapping error for download:', spotifyError.message);
          return null;
        }
      }

      // ============================================================
      // DAB MUSIC SOURCE - Fetch stream URL from API
      // Detection: source='dab' OR isDabTrack flag
      // ============================================================
      if (song.source === 'dab' || song.isDabTrack === true) {
        try {
          const dabMusicService = require('./DabMusicService').default;
          await dabMusicService.initialize();

          const streamUrl = await dabMusicService.getStreamUrl(song.id);
          if (streamUrl) {
            return streamUrl;
          }
          console.error('❌ Failed to get DAB download URL - no URL returned');
          return null;
        } catch (dabError) {
          console.error('❌ DAB stream URL fetch error:', dabError.message);
          return null;
        }
      }

      // ============================================================
      // SAAVN SOURCE - Use downloadUrl/download_url arrays
      // ============================================================
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

      // Method 4: Direct URL string (pre-resolved)
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
