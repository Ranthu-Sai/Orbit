import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import { Platform, ToastAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * FastOrbitScanner - Optimized scanner with caching and progressive loading
 */
class FastOrbitScanner {

    static SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];
    static CACHE_KEY = '@orbit_scanner_cache';
    static CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

    /**
   * Quick scan - returns cached results immediately, updates in background
   */
    static async quickScan(onUpdate = null) {
        try {
            // Try to get cached results first
            const cached = await this.getCachedResults();
            if (cached && cached.songs) {
                console.log(`⚡ [FastScanner] Using cached results (${cached.songs.length} songs)`);

                // Return cached results immediately
                if (onUpdate) {
                    setTimeout(() => {
                        // Check for updates in background
                        this.checkForUpdates(cached, onUpdate);
                    }, 100);
                }

                return cached.songs;
            }

            // No cache, do full scan
            return await this.fullScan(onUpdate);

        } catch (error) {
            console.error('❌ [FastScanner] Quick scan error:', error);
            return await this.fullScan(onUpdate);
        }
    }

    /**
     * Full scan - scans directory and reads metadata
     */
    static async fullScan(onUpdate = null) {
        try {
            console.log('🔍 [FastScanner] Starting full scan...');

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

            // Create basic song objects quickly
            const basicSongs = audioFiles.map(file => this.createBasicSong(file));

            // Cache basic results immediately
            await this.cacheResults(basicSongs, audioFiles.map(f => f.path));

            console.log(`✅ [FastScanner] Quick scan complete: ${basicSongs.length} songs`);

            // If callback provided, enrich metadata in background
            if (onUpdate) {
                this.enrichMetadata(basicSongs, audioFiles, onUpdate);
            }

            return basicSongs;

        } catch (error) {
            console.error('❌ [FastScanner] Full scan error:', error);
            return [];
        }
    }

    /**
     * Enrich songs with metadata in background
     */
    static async enrichMetadata(songs, files, onUpdate) {
        try {
            console.log('🎨 [FastScanner] Starting metadata enrichment...');

            // Import ID3Parser for metadata reading
            const AudioMetadataParser = require('./ID3Parser').default;

            let enrichedCount = 0;

            // Process each song
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                const file = files[i];

                try {
                    const metadataResult = await AudioMetadataParser.extractMetadata(file.path);

                    if (metadataResult && metadataResult.metadata) {
                        // Update song with metadata
                        song.title = metadataResult.metadata.title || song.title;
                        song.artist = metadataResult.metadata.artist || song.artist;
                        song.album = metadataResult.metadata.album || song.album;

                        // Update artwork
                        if (metadataResult.artwork && metadataResult.artwork.base64) {
                            const mimeType = metadataResult.artwork.mimeType || 'image/jpeg';
                            song.artwork = `data:${mimeType};base64,${metadataResult.artwork.base64}`;
                        }

                        enrichedCount++;

                        // Notify update every 2 songs or at the end
                        if (enrichedCount % 2 === 0 || i === songs.length - 1) {
                            console.log(`🎨 [FastScanner] Enriched ${enrichedCount}/${songs.length} songs`);
                            onUpdate([...songs]); // Send updated copy
                        }
                    }
                } catch (error) {
                    console.warn(`Failed to enrich metadata for ${file.name}:`, error.message);
                }
            }

            // Update cache with enriched data
            await this.cacheResults(songs, files.map(f => f.path));
            console.log(`✅ [FastScanner] Metadata enrichment complete (${enrichedCount}/${songs.length})`);

        } catch (error) {
            console.error('❌ [FastScanner] Metadata enrichment error:', error);
        }
    }

    /**
     * Create basic song object from file (no metadata reading)
     */
    static createBasicSong(file) {
        const fileName = file.name.replace(/\.[^/.]+$/, '');
        const songId = this.generateSongId(file.path);

        // Parse title from filename
        let title = fileName;
        if (fileName.includes(' - ')) {
            const parts = fileName.split(' - ');
            title = parts[0];
        }

        // Clean up title (remove ID suffix like "_xfffc7K")
        title = title.replace(/[_-][a-zA-Z0-9]{6,}$/, '');

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
            localSongPath: file.path,
            fileName: file.name,
            fileSize: file.size,
            source: 'orbit_download'
        };
    }

    /**
     * Check for updates in background
     */
    static async checkForUpdates(cached) {
        try {
            const songsDir = await this.getSongsDirectory();
            if (!songsDir) return;

            const files = await RNFS.readDir(songsDir);
            const currentPaths = files
                .filter(file => {
                    const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                    return this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
                })
                .map(f => f.path)
                .sort();

            const cachedPaths = (cached.filePaths || []).sort();

            // Check if file list changed
            if (JSON.stringify(currentPaths) !== JSON.stringify(cachedPaths)) {
                console.log('📋 [FastScanner] File list changed, updating cache');
                await this.fullScan();
            }
        } catch (error) {
            console.error('Background update check failed:', error);
        }
    }

    /**
     * Cache results
     */
    static async cacheResults(songs, filePaths) {
        try {
            const cacheData = {
                songs,
                filePaths,
                timestamp: Date.now()
            };
            await AsyncStorage.setItem(this.CACHE_KEY, JSON.stringify(cacheData));
        } catch (error) {
            console.error('Failed to cache results:', error);
        }
    }

    /**
     * Get cached results
     */
    static async getCachedResults() {
        try {
            const cached = await AsyncStorage.getItem(this.CACHE_KEY);
            if (!cached) return null;

            const data = JSON.parse(cached);
            const age = Date.now() - (data.timestamp || 0);

            // Return cache if less than 5 minutes old
            if (age < this.CACHE_DURATION) {
                return data;
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Clear cache (call after download complete)
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
