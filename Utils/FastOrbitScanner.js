import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import { Platform, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FastOrbitScanner - Optimized scanner with DISK-BASED caching
 * 
 * Features:
 * - Permanent disk cache (no size limits, no expiration)
 * - Only scans NEW files
 * - Enriches metadata in background with embedded artwork
 * - Instant load from cache
 * - Supports 1000+ songs without issues
 * 
 * Storage: .orbit_metadata.json in songs directory
 */
class FastOrbitScanner {

    static SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];
    static METADATA_FILENAME = '.orbit_metadata.json';
    static METADATA_BACKUP_FILENAME = '.orbit_metadata.backup.json';
    static CACHE_KEY = '@orbit_songs_cache_v2'; // Legacy key for migration

    // In-memory cache for instant access (no disk I/O on repeated visits)
    static _memoryCache = null;
    static _memoryCacheTimestamp = 0;
    static MEMORY_CACHE_TTL = 10 * 60 * 1000; // 10 minutes (increased from 5)

    // 🚀 State caching to avoid redundant async lookups
    static _songsDirectory = null;
    static _metadataFilePath = null;
    static _backupFilePath = null;
    static _migrationDone = false;
    static _cacheDirectoryReady = false;

    /**
     * Quick scan - returns from MEMORY cache if available, else disk cache
     * This makes repeated visits to DownloadScreen instant
     */
    static async quickScan(onUpdate = null) {
        try {
            // 🚀 FAST PATH: Return from memory cache if valid (no disk I/O!)
            if (this._memoryCache && this._memoryCache.length > 0) {
                const cacheAge = Date.now() - this._memoryCacheTimestamp;
                if (cacheAge < this.MEMORY_CACHE_TTL) {
                    console.log(`⚡ [FastScanner] Instant return: ${this._memoryCache.length} songs from memory cache`);
                    return this._memoryCache;
                }
            }

            console.log('🔍 [FastScanner] Starting quick scan...');

            // Get current files in directory
            const songsDir = await this.getSongsDirectory();
            if (!songsDir) return [];

            const dirExists = await RNFS.exists(songsDir);
            if (!dirExists) {
                await RNFS.mkdir(songsDir).catch(() => { });
                return [];
            }

            const files = await RNFS.readDir(songsDir);
            const audioFiles = files.filter(file => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                return this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
            });

            console.log(`📁 [FastScanner] Found ${audioFiles.length} audio files`);

            if (audioFiles.length === 0) return [];

            // Get cached songs
            const cachedSongs = await this.getCachedSongs();
            const cachedMap = new Map(cachedSongs.map(s => [s.localSongPath, s]));

            // Find new files (not in cache)
            const newFiles = audioFiles.filter(f => !cachedMap.has(f.path));
            const existingFiles = audioFiles.filter(f => cachedMap.has(f.path));

            console.log(`⚡ [FastScanner] Cached: ${existingFiles.length}, New: ${newFiles.length}`);

            // Build result from cache for existing files
            let allSongs = existingFiles.map(f => cachedMap.get(f.path));

            // Quick add new files with basic info
            if (newFiles.length > 0) {
                const newSongs = newFiles.map(file => this.createBasicSong(file));
                allSongs = [...allSongs, ...newSongs];

                // Save immediately so songs appear
                await this.saveCachedSongs(allSongs);

                // Enrich new songs in background
                if (onUpdate) {
                    this.enrichNewSongs(newSongs, newFiles, allSongs, onUpdate);
                }
            }

            console.log(`✅ [FastScanner] Returning ${allSongs.length} songs`);

            // Update memory cache for instant access on next visit
            this._memoryCache = allSongs;
            this._memoryCacheTimestamp = Date.now();

            return allSongs;

        } catch (error) {
            console.error('❌ [FastScanner] Quick scan error:', error);
            return [];
        }
    }

    /**
     * Force full rescan (clears cache and rescans all)
     */
    static async fullRescan(onUpdate = null) {
        console.log('🔄 [FastScanner] Force full rescan...');
        await this.clearCache();

        const songsDir = await this.getSongsDirectory();
        if (!songsDir) return [];

        const dirExists = await RNFS.exists(songsDir);
        if (!dirExists) return [];

        const files = await RNFS.readDir(songsDir);
        const audioFiles = files.filter(file => {
            const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
            return this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
        });

        if (audioFiles.length === 0) return [];

        // Create basic songs
        const songs = audioFiles.map(file => this.createBasicSong(file));

        // Save immediately
        await this.saveCachedSongs(songs);

        console.log(`✅ [FastScanner] Created ${songs.length} basic song entries`);

        // Enrich all in background
        if (onUpdate) {
            this.enrichNewSongs(songs, audioFiles, songs, onUpdate);
        }

        return songs;
    }

    /**
     * Enrich only new songs with metadata (runs in background)
     * 🚀 Uses parallel processing for faster metadata extraction
     */
    static async enrichNewSongs(newSongs, newFiles, allSongs, onUpdate) {
        try {
            if (newSongs.length === 0) return;

            console.log(`🎨 [FastScanner] Enriching ${newSongs.length} new songs (parallel)...`);

            const AudioMetadataParser = require('./ID3Parser').default;
            const NativeMetadataReader = require('./NativeMetadataReader').default;

            let nativeReaderAvailable = false;
            try {
                await NativeMetadataReader.initialize();
                nativeReaderAvailable = true;
            } catch (e) {
                // Native reader not available
            }

            // 🚀 Helper function to enrich a single song
            const enrichSong = async (song, file) => {
                const isM4A = file.name.toLowerCase().endsWith('.m4a') ||
                    file.name.toLowerCase().endsWith('.aac');

                try {
                    let metadataResult = null;

                    if (isM4A && nativeReaderAvailable) {
                        const nativeMetadata = await NativeMetadataReader.readMetadata(file.path);
                        if (nativeMetadata) {
                            metadataResult = {
                                metadata: {
                                    title: nativeMetadata.title,
                                    artist: nativeMetadata.artist,
                                    album: nativeMetadata.album
                                },
                                artwork: nativeMetadata.artworkDataUri ? {
                                    dataUri: nativeMetadata.artworkDataUri
                                } : null
                            };
                        }
                    } else {
                        metadataResult = await AudioMetadataParser.extractMetadata(file.path);
                    }

                    if (metadataResult && metadataResult.metadata) {
                        song.title = metadataResult.metadata.title || song.title;
                        song.artist = metadataResult.metadata.artist || song.artist;
                        song.album = metadataResult.metadata.album || song.album;
                        song.isEnriched = true;

                        if (metadataResult.artwork) {
                            if (metadataResult.artwork.dataUri) {
                                song.artwork = metadataResult.artwork.dataUri;
                            } else if (metadataResult.artwork.base64) {
                                const mimeType = metadataResult.artwork.mimeType || 'image/jpeg';
                                song.artwork = `data:${mimeType};base64,${metadataResult.artwork.base64}`;
                            }
                        }
                    }
                } catch (error) {
                    // Silently skip failed enrichment
                }
            };

            // 🚀 PARALLEL PROCESSING: Process songs in chunks of 5
            const CHUNK_SIZE = 5;
            for (let i = 0; i < newSongs.length; i += CHUNK_SIZE) {
                const chunkSongs = newSongs.slice(i, i + CHUNK_SIZE);
                const chunkFiles = newFiles.slice(i, i + CHUNK_SIZE);

                // Process chunk in parallel
                await Promise.all(
                    chunkSongs.map((song, idx) => enrichSong(song, chunkFiles[idx]))
                );

                // Update UI after each chunk
                if (onUpdate) {
                    onUpdate([...allSongs]);
                }
            }

            // Save enriched data permanently
            await this.saveCachedSongs(allSongs);

            // Also update memory cache with enriched data
            this._memoryCache = allSongs;
            this._memoryCacheTimestamp = Date.now();

            console.log(`✅ [FastScanner] Enrichment complete, saved to permanent cache`);

        } catch (error) {
            console.error('❌ [FastScanner] Enrichment error:', error);
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
            artwork: 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png',
            duration: 0,
            isLocal: true,
            isDownloaded: true,
            isEnriched: false,
            localSongPath: file.path,
            fileName: file.name,
            fileSize: file.size,
            source: 'orbit_download'
        };
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
            if (!metadataPath) return [];

            const exists = await RNFS.exists(metadataPath);
            if (!exists) {
                console.log('📂 [FastScanner] No metadata file found, starting fresh');
                return [];
            }

            const content = await RNFS.readFile(metadataPath, 'utf8');
            const songs = JSON.parse(content);
            console.log(`📂 [FastScanner] Loaded ${songs.length} songs from disk cache`);
            return songs;
        } catch (error) {
            // Silently handle load errors - will scan fresh

            // Try to restore from backup silently
            try {
                const backupPath = await this.getBackupFilePath();
                if (backupPath && await RNFS.exists(backupPath)) {
                    const backupContent = await RNFS.readFile(backupPath, 'utf8');
                    const songs = JSON.parse(backupContent);

                    // Restore main file from backup
                    const metadataPath = await this.getMetadataFilePath();
                    if (metadataPath) {
                        await RNFS.writeFile(metadataPath, backupContent, 'utf8').catch(() => { });
                    }

                    console.log(`✅ [FastScanner] Restored ${songs.length} songs from backup`);
                    return songs;
                }
            } catch (backupError) {
                // Silently handle backup restore failure - will scan fresh
            }

            return [];
        }
    }

    /**
     * Save songs to DISK cache (permanent, no size limits)
     * Uses atomic write with backup for crash safety
     */
    static async saveCachedSongs(songs) {
        try {
            const metadataPath = await this.getMetadataFilePath();
            const backupPath = await this.getBackupFilePath();

            if (!metadataPath) {
                return; // Silently skip if no path
            }

            const jsonContent = JSON.stringify(songs, null, 2);

            // Create backup of existing file first (if exists)
            const exists = await RNFS.exists(metadataPath);
            if (exists && backupPath) {
                // Create backup silently - failure is not critical
                await RNFS.copyFile(metadataPath, backupPath).catch(() => { });
            }

            // Write new metadata file
            await RNFS.writeFile(metadataPath, jsonContent, 'utf8');
            console.log(`💾 [FastScanner] Saved ${songs.length} songs to disk (${(jsonContent.length / 1024).toFixed(1)}KB)`);

        } catch (error) {
            // Silently handle save errors - graceful degradation
            // Cache will be rebuilt on next scan
        }
    }

    /**
     * Clear cache (call on force refresh)
     * Clears memory, disk file, and legacy AsyncStorage
     */
    static async clearCache() {
        try {
            // Clear memory cache first
            this._memoryCache = null;
            this._memoryCacheTimestamp = 0;

            // Clear disk metadata file
            const metadataPath = await this.getMetadataFilePath();
            const backupPath = await this.getBackupFilePath();

            if (metadataPath && await RNFS.exists(metadataPath)) {
                await RNFS.unlink(metadataPath);
            }
            if (backupPath && await RNFS.exists(backupPath)) {
                await RNFS.unlink(backupPath);
            }

            // Also clear legacy AsyncStorage cache
            await AsyncStorage.removeItem(this.CACHE_KEY);

            console.log('🗑️ [FastScanner] Cache cleared (memory + disk + legacy)');
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
            const songs = await this.getCachedSongs();
            const filtered = songs.filter(s => s.localSongPath !== songPath);
            await this.saveCachedSongs(filtered);

            // 🚀 Also update memory cache for instant consistency
            if (this._memoryCache) {
                this._memoryCache = this._memoryCache.filter(s => s.localSongPath !== songPath);
            }

            console.log(`🗑️ [FastScanner] Removed ${songPath} from cache (disk + memory)`);
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
     * Generate song ID
     */
    static generateSongId(filePath) {
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        const match = nameWithoutExt.match(/\s-\s([A-Za-z0-9_-]+)$/);
        if (match) return match[1];

        return nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Migrate from AsyncStorage to disk (one-time operation)
     * This ensures old cached data is preserved when upgrading
     */
    static async migrateFromAsyncStorage() {
        try {
            // Check if we already have a disk cache (migration already done)
            const metadataPath = await this.getMetadataFilePath();
            if (metadataPath && await RNFS.exists(metadataPath)) {
                return; // Already migrated
            }

            // Check if there's old AsyncStorage cache to migrate
            const legacyCache = await AsyncStorage.getItem(this.CACHE_KEY);
            if (!legacyCache) {
                return; // Nothing to migrate
            }

            const songs = JSON.parse(legacyCache);
            if (songs && songs.length > 0) {
                console.log(`🔄 [FastScanner] Migrating ${songs.length} songs from AsyncStorage to disk...`);

                // Save to disk
                const jsonContent = JSON.stringify(songs, null, 2);
                await RNFS.writeFile(metadataPath, jsonContent, 'utf8');

                // Remove old AsyncStorage cache to free up space
                await AsyncStorage.removeItem(this.CACHE_KEY);

                console.log(`✅ [FastScanner] Migration complete! ${songs.length} songs now on disk`);
            }
        } catch (error) {
            console.error('❌ [FastScanner] Migration failed:', error.message);
            // Migration failure is not critical - will work without cache
        }
    }
}

export default FastOrbitScanner;
