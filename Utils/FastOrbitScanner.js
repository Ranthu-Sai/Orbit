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

    static async enrichMetadata(songs, files, onUpdate) {
        try {
            console.log('🎨 [FastScanner] Starting metadata enrichment...');

            // Import parsers
            const AudioMetadataParser = require('./ID3Parser').default;
            const NativeMetadataReader = require('./NativeMetadataReader').default;

            // Initialize native reader for M4A files
            let nativeReaderAvailable = false;
            try {
                await NativeMetadataReader.initialize();
                nativeReaderAvailable = true;
                console.log('✅ [FastScanner] Native metadata reader available for M4A');
            } catch (e) {
                console.log('⚠️ [FastScanner] Native reader not available, using JS parser');
            }

            let enrichedCount = 0;

            // Process each song
            for (let i = 0; i < songs.length; i++) {
                const song = songs[i];
                const file = files[i];
                const isM4A = file.name.toLowerCase().endsWith('.m4a') ||
                    file.name.toLowerCase().endsWith('.aac');

                console.log(`\n📖 [FastScanner] Reading: ${file.name}`);
                console.log(`   Current title: "${song.title}"`);

                try {
                    let metadataResult = null;

                    // Use native reader for M4A files (JAudioTagger reads what it wrote)
                    if (isM4A && nativeReaderAvailable) {
                        console.log('   Using native reader for M4A...');
                        const nativeMetadata = await NativeMetadataReader.readMetadata(file.path);
                        if (nativeMetadata) {
                            metadataResult = {
                                metadata: {
                                    title: nativeMetadata.title,
                                    artist: nativeMetadata.artist,
                                    album: nativeMetadata.album,
                                    year: nativeMetadata.year,
                                    genre: nativeMetadata.genre
                                },
                                // NativeMetadataReader returns artworkDataUri (already formatted as data:...)
                                artwork: nativeMetadata.artworkDataUri ? {
                                    dataUri: nativeMetadata.artworkDataUri
                                } : null
                            };
                        }
                    } else {
                        // Use JS parser for FLAC and other formats
                        metadataResult = await AudioMetadataParser.extractMetadata(file.path);
                    }

                    console.log(`   Metadata result:`, {
                        hasMetadata: !!metadataResult?.metadata,
                        title: metadataResult?.metadata?.title,
                        artist: metadataResult?.metadata?.artist,
                        album: metadataResult?.metadata?.album,
                        hasArtwork: !!metadataResult?.artwork?.base64
                    });

                    if (metadataResult && metadataResult.metadata) {
                        const oldTitle = song.title;
                        const oldArtist = song.artist;

                        song.title = metadataResult.metadata.title || song.title;
                        song.artist = metadataResult.metadata.artist || song.artist;
                        song.album = metadataResult.metadata.album || song.album;

                        console.log(`   Updated: "${oldTitle}" -> "${song.title}"`);
                        console.log(`   Artist: "${oldArtist}" -> "${song.artist}"`);

                        // Handle both dataUri (from native reader) and base64 (from JS parser)
                        if (metadataResult.artwork) {
                            if (metadataResult.artwork.dataUri) {
                                // M4A files - already formatted
                                song.artwork = metadataResult.artwork.dataUri;
                                console.log(`   ✅ Artwork loaded (native)`);
                            } else if (metadataResult.artwork.base64) {
                                // FLAC files - need to format
                                const mimeType = metadataResult.artwork.mimeType || 'image/jpeg';
                                song.artwork = `data:${mimeType};base64,${metadataResult.artwork.base64}`;
                                console.log(`   ✅ Artwork loaded (JS parser)`);
                            }
                        }

                        enrichedCount++;

                        if (enrichedCount % 2 === 0 || i === songs.length - 1) {
                            console.log(`🎨 [FastScanner] Enriched ${enrichedCount}/${songs.length} songs`);
                            onUpdate([...songs]);
                        }
                    } else {
                        console.log(`   ⚠️ No metadata found in file`);
                    }
                } catch (error) {
                    console.error(`   ❌ Error: ${error.message}`);
                }
            }

            await this.cacheResults(songs, files.map(f => f.path));
            console.log(`\n✅ [FastScanner] Metadata enrichment complete (${enrichedCount}/${songs.length})`);

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

        // Remove ID suffix pattern: " - ID" where ID is alphanumeric
        // Example: "Bachalo - _xfffc7K" -> "Bachalo"
        // Example: "Tere Hawaale - Z0VbANbyH2o" -> "Tere Hawaale"
        if (fileName.includes(' - ')) {
            const parts = fileName.split(' - ');
            // Check if last part looks like an ID (alphanumeric, often with special chars)
            const lastPart = parts[parts.length - 1];
            if (lastPart.length <= 15 && /^[A-Za-z0-9_-]+$/.test(lastPart)) {
                // It's likely an ID, remove it
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
