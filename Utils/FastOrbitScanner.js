import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import { Platform, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FastOrbitScanner - Optimized scanner with PERMANENT caching
 * 
 * Features:
 * - Permanent cache (no expiration)
 * - Only scans NEW files
 * - Enriches metadata in background
 * - Instant load from cache
 */
class FastOrbitScanner {

    static SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];
    static CACHE_KEY = '@orbit_songs_cache_v2';

    /**
     * Quick scan - returns cached results, only scans new files
     */
    static async quickScan(onUpdate = null) {
        try {
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
     */
    static async enrichNewSongs(newSongs, newFiles, allSongs, onUpdate) {
        try {
            if (newSongs.length === 0) return;

            console.log(`🎨 [FastScanner] Enriching ${newSongs.length} new songs...`);

            const AudioMetadataParser = require('./ID3Parser').default;
            const NativeMetadataReader = require('./NativeMetadataReader').default;

            let nativeReaderAvailable = false;
            try {
                await NativeMetadataReader.initialize();
                nativeReaderAvailable = true;
            } catch (e) {
                // Native reader not available
            }

            for (let i = 0; i < newSongs.length; i++) {
                const song = newSongs[i];
                const file = newFiles[i];
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
                    console.warn(`Failed to enrich ${file.name}:`, error.message);
                }

                // Update UI every 2 songs
                if ((i + 1) % 2 === 0 || i === newSongs.length - 1) {
                    onUpdate([...allSongs]);
                }
            }

            // Save enriched data permanently
            await this.saveCachedSongs(allSongs);
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
     * Get cached songs (permanent)
     */
    static async getCachedSongs() {
        try {
            const cached = await AsyncStorage.getItem(this.CACHE_KEY);
            if (!cached) return [];
            return JSON.parse(cached);
        } catch (error) {
            return [];
        }
    }

    /**
     * Save songs to permanent cache
     */
    static async saveCachedSongs(songs) {
        try {
            await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(songs));
        } catch (error) {
            console.error('Failed to save cache:', error);
        }
    }

    /**
     * Clear cache (call on force refresh)
     */
    static async clearCache() {
        try {
            await AsyncStorage.removeItem(this.CACHE_KEY);
            console.log('🗑️ [FastScanner] Cache cleared');
        } catch (error) {
            console.error('Failed to clear cache:', error);
        }
    }

    /**
     * Remove a song from cache (call when deleted)
     */
    static async removeSongFromCache(songPath) {
        try {
            const songs = await this.getCachedSongs();
            const filtered = songs.filter(s => s.localSongPath !== songPath);
            await this.saveCachedSongs(filtered);
            console.log(`🗑️ [FastScanner] Removed ${songPath} from cache`);
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
}

export default FastOrbitScanner;
