import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { isAudioFile, pathToKey } from './LocalMusicUtils';

const MAX_ENRICH_ATTEMPTS = 3; // Retry songs whose tag read failed, up to this many scans
const DEFAULT_ARTWORK =
  'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';

/**
 * FastOrbitScanner - Optimized scanner with DISK-BASED caching
 *
 * Features:
 * - Permanent disk cache (no size limits, no expiration)
 * - Only reads tags for new, changed or previously failed files
 * - Tags read on a background native thread when available; covers are
 *   written as image files (never embedded in the JSON cache)
 * - Instant load from cache, always reconciled with the folder contents
 *
 * Storage: .orbit_metadata.json in the app's internal cache directory
 */
class FastOrbitScanner {
  static METADATA_FILENAME = '.orbit_metadata.json';
  static METADATA_BACKUP_FILENAME = '.orbit_metadata.backup.json';
  static ARTWORK_DIRNAME = 'artwork';
  static CACHE_KEY = '@orbit_songs_cache_v2'; // Legacy key for migration

  // In-memory cache for instant access (no JSON parse on repeated visits)
  static _memoryCache = null;

  // 🚀 State caching to avoid redundant async lookups
  static _metadataFilePath = null;
  static _backupFilePath = null;
  static _migrationDone = false;
  static _cacheDirectoryReady = false;
  static _isEnriching = false;

  static async _listAudioFiles() {
    const songsDir = await this.getSongsDirectory();
    if (!songsDir) {
      return [];
    }
    if (!(await RNFS.exists(songsDir))) {
      await RNFS.mkdir(songsDir).catch(() => {});
      return [];
    }
    const files = await RNFS.readDir(songsDir);
    return files.filter((file) => file.isFile() && isAudioFile(file.name));
  }

  static _needsEnrichment(song, file) {
    if (!song) {
      return true;
    }
    // File replaced since it was read
    if (file && song.fileSize && file.size && song.fileSize !== file.size) {
      return true;
    }
    // Old cache format stored covers inline; move them to files
    if (typeof song.artwork === 'string' && song.artwork.startsWith('data:')) {
      return true;
    }
    return !song.isEnriched && (song.enrichAttempts || 0) < MAX_ENRICH_ATTEMPTS;
  }

  /**
   * Quick scan - lists the songs folder (one cheap readDir) and reconciles it
   * with the cache, so new and deleted files always show up immediately.
   */
  static async quickScan(onUpdate = null) {
    try {
      const audioFiles = await this._listAudioFiles();
      if (audioFiles.length === 0) {
        this._memoryCache = [];
        return [];
      }

      // Memory cache first; disk cache only on the first visit
      const cachedSongs = this._memoryCache || (await this.getCachedSongs());
      const cachedMap = new Map(cachedSongs.map((s) => [s.localSongPath, s]));

      let changed = cachedSongs.length !== audioFiles.length;
      const allSongs = audioFiles.map((file) => {
        const cached = cachedMap.get(file.path);
        if (cached) {
          return cached;
        }
        changed = true;
        return this.createBasicSong(file);
      });
      this._ensureUniqueIds(allSongs);

      const fileByPath = new Map(audioFiles.map((f) => [f.path, f]));
      const toEnrich = allSongs.filter((song) =>
        this._needsEnrichment(song, fileByPath.get(song.localSongPath))
      );

      this._memoryCache = allSongs;
      if (changed) {
        // Save immediately so songs appear (and deletions persist)
        await this.saveCachedSongs(allSongs);
      }

      if (toEnrich.length > 0) {
        this.enrichNewSongs(toEnrich, allSongs, onUpdate);
      }

      return allSongs;
    } catch (error) {
      console.error('❌ [FastScanner] Quick scan error:', error);
      return this._memoryCache || [];
    }
  }

  /**
   * Force full rescan (clears cache and rescans all)
   */
  static async fullRescan(onUpdate = null) {
    await this.clearCache();
    try {
      const audioFiles = await this._listAudioFiles();
      if (audioFiles.length === 0) {
        this._memoryCache = [];
        return [];
      }

      const songs = audioFiles.map((file) => this.createBasicSong(file));
      this._ensureUniqueIds(songs);

      this._memoryCache = songs;
      await this.saveCachedSongs(songs);
      this.enrichNewSongs(songs, songs, onUpdate);

      return songs;
    } catch (error) {
      console.error('❌ [FastScanner] Full rescan error:', error);
      return [];
    }
  }

  /**
   * Read tags for the given songs in the background.
   * Each song object is replaced (not mutated) so React lists see the change.
   * @param {Array} songsToEnrich - Songs needing tags (must be items of allSongs)
   * @param {Array} allSongs - Full list; updated in place by index
   * @param {Function|null} onUpdate - Receives a new array after each chunk
   */
  static async enrichNewSongs(songsToEnrich, allSongs, onUpdate) {
    if (songsToEnrich.length === 0 || this._isEnriching) {
      return;
    }
    this._isEnriching = true;
    try {
      const NativeMetadataReader = require('./NativeMetadataReader').default;
      const AudioMetadataParser = require('./ID3Parser').default;
      const artworkDir = await this.ensureArtworkDirectoryExists();

      const enrichSong = async (song) => {
        const artworkFile = `${artworkDir}/${pathToKey(song.localSongPath)}.jpg`;
        let title = null;
        let artist = null;
        let album = null;
        let duration = song.duration || 0;
        let artwork = null;

        // Native reader: background thread, cover written straight to disk
        const native = await NativeMetadataReader.readMetadataToFile(
          song.localSongPath,
          artworkFile
        );
        if (native) {
          ({ title, artist, album } = native);
          duration = native.duration || duration;
          artwork = native.artworkPath ? `file://${native.artworkPath}` : null;
        } else {
          const result = await AudioMetadataParser.extractMetadata(
            song.localSongPath
          );
          if (!result) {
            return {
              ...song,
              enrichAttempts: (song.enrichAttempts || 0) + 1,
            };
          }
          ({ title, artist, album } = result.metadata || {});
          if (result.artwork?.base64) {
            await RNFS.writeFile(artworkFile, result.artwork.base64, 'base64');
            artwork = `file://${artworkFile}`;
          }
        }

        return {
          ...song,
          title: title || song.title,
          artist: artist || song.artist,
          album: album || song.album,
          duration,
          artwork: artwork || DEFAULT_ARTWORK,
          isEnriched: true,
          enrichAttempts: 0,
        };
      };

      const indexByPath = new Map(
        allSongs.map((s, i) => [s.localSongPath, i])
      );

      // 🚀 PARALLEL PROCESSING: native reads are serialized on their own
      // thread; small chunks keep the UI updating without flooding the bridge
      const CHUNK_SIZE = 5;
      for (let i = 0; i < songsToEnrich.length; i += CHUNK_SIZE) {
        const chunk = songsToEnrich.slice(i, i + CHUNK_SIZE);
        const results = await Promise.all(
          chunk.map((song) =>
            enrichSong(song).catch(() => ({
              ...song,
              enrichAttempts: (song.enrichAttempts || 0) + 1,
            }))
          )
        );
        results.forEach((updated) => {
          const index = indexByPath.get(updated.localSongPath);
          if (index !== undefined) {
            allSongs[index] = updated;
          }
        });

        // Update UI after each chunk
        if (onUpdate) {
          onUpdate([...allSongs]);
        }
      }

      // A newer scan may have replaced the list meanwhile: carry the
      // enriched entries over to it instead of losing them
      if (this._memoryCache && this._memoryCache !== allSongs) {
        const enrichedByPath = new Map(
          allSongs.map((s) => [s.localSongPath, s])
        );
        this._memoryCache = this._memoryCache.map((s) => {
          const enriched = enrichedByPath.get(s.localSongPath);
          return enriched && enriched.isEnriched && !s.isEnriched
            ? { ...enriched, id: s.id }
            : s;
        });
      }

      // Save enriched data permanently
      await this.saveCachedSongs(this._memoryCache || allSongs);
    } catch (error) {
      console.error('❌ [FastScanner] Enrichment error:', error);
    } finally {
      this._isEnriching = false;
    }
  }

  /**
   * Create basic song object from file
   */
  static createBasicSong(file) {
    const fileName = file.name.replace(/\.[^/.]+$/, '');
    const songId = this.generateSongId(file.path);

    let title = fileName;
    if (fileName.includes(' - ')) {
      const parts = fileName.split(' - ');
      const lastPart = parts[parts.length - 1];
      if (lastPart.length <= 15 && /^[A-Za-z0-9_-]+$/.test(lastPart)) {
        parts.pop();
        title = parts.join(' - ');
      }
    }

    return {
      id: songId,
      title: title || fileName,
      artist: 'Unknown Artist',
      album: 'Downloads',
      url: `file://${file.path}`,
      artwork: DEFAULT_ARTWORK,
      duration: 0,
      isLocal: true,
      isDownloaded: true,
      isEnriched: false,
      enrichAttempts: 0,
      localSongPath: file.path,
      fileName: file.name,
      fileSize: file.size,
      source: 'orbit_download',
    };
  }

  // Two files can share an extracted ID (e.g. the same song downloaded
  // twice); list keys and queue IDs must be unique.
  static _ensureUniqueIds(songs) {
    const seen = new Set();
    songs.forEach((song, index) => {
      if (seen.has(song.id)) {
        songs[index] = { ...song, id: `${song.id}_${pathToKey(song.localSongPath)}` };
      }
      seen.add(songs[index].id);
    });
  }

  /**
   * Get app-internal cache directory for metadata (avoids scoped storage issues)
   * Uses DocumentDirectoryPath which is always writable by the app
   */
  static getAppCacheDirectory() {
    // Use app's internal document directory - always has write permission
    return `${RNFS.DocumentDirectoryPath}/orbit_cache`;
  }

  /**
   * Ensure cache directory exists (cached after first call)
   */
  static async ensureCacheDirectoryExists() {
    // 🚀 Return cached result if already verified
    if (this._cacheDirectoryReady) {
      return this.getAppCacheDirectory();
    }

    const cacheDir = this.getAppCacheDirectory();
    try {
      const exists = await RNFS.exists(cacheDir);
      if (!exists) {
        await RNFS.mkdir(cacheDir);
      }
      this._cacheDirectoryReady = true;
    } catch (e) {
      // Silently handle - directory might already exist
      this._cacheDirectoryReady = true;
    }
    return cacheDir;
  }

  static async ensureArtworkDirectoryExists() {
    const dir = `${await this.ensureCacheDirectoryExists()}/${
      this.ARTWORK_DIRNAME
    }`;
    if (!(await RNFS.exists(dir))) {
      await RNFS.mkdir(dir).catch(() => {});
    }
    return dir;
  }

  /**
   * Get metadata file path (cached after first call)
   */
  static async getMetadataFilePath() {
    // 🚀 Return cached path if available
    if (this._metadataFilePath) {
      return this._metadataFilePath;
    }
    const cacheDir = await this.ensureCacheDirectoryExists();
    this._metadataFilePath = `${cacheDir}/${this.METADATA_FILENAME}`;
    return this._metadataFilePath;
  }

  /**
   * Get backup metadata file path (cached after first call)
   */
  static async getBackupFilePath() {
    // 🚀 Return cached path if available
    if (this._backupFilePath) {
      return this._backupFilePath;
    }
    const cacheDir = await this.ensureCacheDirectoryExists();
    this._backupFilePath = `${cacheDir}/${this.METADATA_BACKUP_FILENAME}`;
    return this._backupFilePath;
  }

  /**
   * Get cached songs from DISK (permanent, no size limits)
   */
  static async getCachedSongs() {
    try {
      // 🚀 Skip migration check if already done
      if (!this._migrationDone) {
        await this.migrateFromAsyncStorage();
        this._migrationDone = true;
      }

      const metadataPath = await this.getMetadataFilePath();
      if (!metadataPath) {
        return [];
      }

      const exists = await RNFS.exists(metadataPath);
      if (!exists) {
        return [];
      }

      const content = await RNFS.readFile(metadataPath, 'utf8');
      const songs = JSON.parse(content);
      return Array.isArray(songs) ? songs : [];
    } catch (error) {
      // Main file unreadable - try to restore from backup silently
      try {
        const backupPath = await this.getBackupFilePath();
        if (backupPath && (await RNFS.exists(backupPath))) {
          const backupContent = await RNFS.readFile(backupPath, 'utf8');
          const songs = JSON.parse(backupContent);

          // Restore main file from backup
          const metadataPath = await this.getMetadataFilePath();
          if (metadataPath) {
            await RNFS.writeFile(metadataPath, backupContent, 'utf8').catch(
              () => {}
            );
          }
          return Array.isArray(songs) ? songs : [];
        }
      } catch (backupError) {
        // Silently handle backup restore failure - will scan fresh
      }

      return [];
    }
  }

  /**
   * Save songs to DISK cache (permanent, no size limits)
   * Keeps the previous file as a backup for crash safety
   */
  static async saveCachedSongs(songs) {
    try {
      const metadataPath = await this.getMetadataFilePath();
      const backupPath = await this.getBackupFilePath();

      if (!metadataPath) {
        return; // Silently skip if no path
      }

      // Compact JSON: covers are files now, so this stays small
      const jsonContent = JSON.stringify(songs);

      // Create backup of existing file first (if exists)
      const exists = await RNFS.exists(metadataPath);
      if (exists && backupPath) {
        // Create backup silently - failure is not critical
        await RNFS.copyFile(metadataPath, backupPath).catch(() => {});
      }

      // Write new metadata file
      await RNFS.writeFile(metadataPath, jsonContent, 'utf8');
    } catch (error) {
      // Silently handle save errors - graceful degradation
      // Cache will be rebuilt on next scan
    }
  }

  /**
   * Clear cache (call on force refresh)
   * Clears memory, disk file, extracted covers and legacy AsyncStorage
   */
  static async clearCache() {
    try {
      // Clear memory cache first
      this._memoryCache = null;

      // Clear disk metadata file
      const metadataPath = await this.getMetadataFilePath();
      const backupPath = await this.getBackupFilePath();

      if (metadataPath && (await RNFS.exists(metadataPath))) {
        await RNFS.unlink(metadataPath);
      }
      if (backupPath && (await RNFS.exists(backupPath))) {
        await RNFS.unlink(backupPath);
      }

      const artworkDir = `${this.getAppCacheDirectory()}/${
        this.ARTWORK_DIRNAME
      }`;
      if (await RNFS.exists(artworkDir)) {
        await RNFS.unlink(artworkDir).catch(() => {});
      }

      // Also clear legacy AsyncStorage cache
      await AsyncStorage.removeItem(this.CACHE_KEY);
    } catch (error) {
      console.error('Failed to clear cache:', error.message);
    }
  }

  /**
   * Remove a song from cache (call when deleted)
   */
  static async removeSongFromCache(songPath) {
    try {
      // Update disk cache
      const songs = this._memoryCache || (await this.getCachedSongs());
      const filtered = songs.filter((s) => s.localSongPath !== songPath);
      this._memoryCache = filtered;
      await this.saveCachedSongs(filtered);

      // Remove the extracted cover too
      const artworkFile = `${this.getAppCacheDirectory()}/${
        this.ARTWORK_DIRNAME
      }/${pathToKey(songPath)}.jpg`;
      if (await RNFS.exists(artworkFile)) {
        await RNFS.unlink(artworkFile).catch(() => {});
      }
    } catch (error) {
      console.error('Failed to remove from cache:', error);
    }
  }

  /**
   * Get songs directory
   */
  static async getSongsDirectory() {
    try {
      return await StorageManager.getDownloadsDirectory();
    } catch (error) {
      if (Platform.OS === 'android') {
        return `${RNFS.DownloadDirectoryPath}/orbit/songs`;
      }
      return null;
    }
  }

  /**
   * Generate song ID.
   * Orbit downloads are named "<title> - <sourceId>.<ext>"; that source ID is
   * reused so the file matches its download record. Anything else gets a
   * collision-free hash of the path (works for non-Latin names too).
   */
  static generateSongId(filePath) {
    const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
    const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

    const match = nameWithoutExt.match(/\s-\s([A-Za-z0-9_-]+)$/);
    // Must look like a source ID (has a digit, or an 11-char YouTube ID),
    // so a suffix like "- Remix" isn't mistaken for one
    if (match && (/\d/.test(match[1]) || match[1].length === 11)) {
      return match[1];
    }

    return pathToKey(filePath);
  }

  /**
   * Migrate from AsyncStorage to disk (one-time operation)
   * This ensures old cached data is preserved when upgrading
   */
  static async migrateFromAsyncStorage() {
    try {
      // Check if we already have a disk cache (migration already done)
      const metadataPath = await this.getMetadataFilePath();
      if (metadataPath && (await RNFS.exists(metadataPath))) {
        return; // Already migrated
      }

      // Check if there's old AsyncStorage cache to migrate
      const legacyCache = await AsyncStorage.getItem(this.CACHE_KEY);
      if (!legacyCache) {
        return; // Nothing to migrate
      }

      const songs = JSON.parse(legacyCache);
      if (songs && songs.length > 0) {
        await RNFS.writeFile(metadataPath, JSON.stringify(songs), 'utf8');

        // Remove old AsyncStorage cache to free up space
        await AsyncStorage.removeItem(this.CACHE_KEY);
      }
    } catch (error) {
      console.error('❌ [FastScanner] Migration failed:', error.message);
      // Migration failure is not critical - will work without cache
    }
  }
}

export default FastOrbitScanner;
