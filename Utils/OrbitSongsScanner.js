import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import NativeMetadataReader from './NativeMetadataReader';
import { Platform } from 'react-native';

/**
 * OrbitSongsScanner - Scans the orbit/songs folder and extracts embedded metadata
 * 
 * This service reads music files directly from the file system and extracts
 * embedded metadata (title, artist, album, artwork) using the native metadata reader.
 */
class OrbitSongsScanner {

    // Supported audio file extensions
    static SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];

    /**
     * Scan the orbit/songs folder and return all songs with metadata
     * @param {boolean} useCache - Use cached results if available (default: true)
     * @returns {Promise<Array>} Array of song objects with metadata
     */
    static async scanOrbitSongs(useCache = true) {
        const { ToastAndroid } = require('react-native');

        try {
            ToastAndroid.show('Starting scan...', ToastAndroid.SHORT);

            // Initialize metadata reader
            const initResult = await NativeMetadataReader.initialize();
            if (!initResult) {
                ToastAndroid.show('❌ Native module failed to initialize', ToastAndroid.LONG);
                return [];
            }

            // Get the songs directory path
            const songsDir = await this.getSongsDirectory();
            ToastAndroid.show(`Path: ${songsDir}`, ToastAndroid.LONG);

            if (!songsDir) {
                console.error('❌ [OrbitScanner] Could not determine songs directory');
                ToastAndroid.show('❌ Could not determine songs directory', ToastAndroid.LONG);
                return [];
            }

            // Check if directory exists
            const dirExists = await RNFS.exists(songsDir);
            ToastAndroid.show(`Directory exists: ${dirExists}`, ToastAndroid.SHORT);

            if (!dirExists) {
                ToastAndroid.show('Creating directory...', ToastAndroid.SHORT);
                try {
                    await RNFS.mkdir(songsDir, { NSURLIsExcludedFromBackupKey: true });
                } catch (mkdirError) {
                    console.error('❌ [OrbitScanner] Failed to create directory:', mkdirError);
                    ToastAndroid.show(`Failed to create dir: ${mkdirError.message}`, ToastAndroid.LONG);
                }
                return [];
            }

            // Read all files in the directory
            ToastAndroid.show('Reading directory...', ToastAndroid.SHORT);

            const files = await RNFS.readDir(songsDir);
            ToastAndroid.show(`Found ${files.length} total items`, ToastAndroid.SHORT);

            // Log first few files for debugging
            if (files.length > 0) {
                }

            // Filter for audio files only
            const audioFiles = files.filter(file => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                const isAudio = this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
                if (isAudio) {
                    }
                return isAudio;
            });
            ToastAndroid.show(`Found ${audioFiles.length} audio files`, ToastAndroid.LONG);

            if (audioFiles.length === 0) {
                ToastAndroid.show('⚠️ No audio files found', ToastAndroid.LONG);
                return [];
            }

            // Extract metadata from all files using batch operation
            const filePaths = audioFiles.map(file => file.path);
            ToastAndroid.show(`Extracting metadata from ${filePaths.length} files...`, ToastAndroid.SHORT);

            let metadataArray = [];
            try {
                metadataArray = await NativeMetadataReader.readMetadataBatch(filePaths);
                ToastAndroid.show(`✅ Extracted ${metadataArray.length} metadata`, ToastAndroid.SHORT);

                // Log sample metadata
                if (metadataArray.length > 0) {
                }
            } catch (metadataError) {
                console.error('❌ [OrbitScanner] Failed to extract metadata:', metadataError);
                console.error('❌ [OrbitScanner] Error details:', metadataError.message, metadataError.stack);
                ToastAndroid.show(`❌ Metadata error: ${metadataError.message}`, ToastAndroid.LONG);
                // Return empty array if metadata extraction fails
                return [];
            }

            // Format songs for display
            const songs = metadataArray.map((metadata, index) => {
                const file = audioFiles[index];

                // Generate unique ID from file path or use filename
                const songId = this.generateSongId(file.path);

                return {
                    id: songId,
                    title: metadata.title || file.name.replace(/\.[^/.]+$/, ''),
                    artist: metadata.artist || 'Unknown Artist',
                    album: metadata.album || 'Unknown Album',
                    year: metadata.year || '',
                    genre: metadata.genre || '',
                    url: `file://${file.path}`,
                    artwork: metadata.artworkDataUri || 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png',
                    duration: 0, // Duration can be added if needed
                    isLocal: true,
                    isDownloaded: true,
                    localSongPath: file.path,
                    fileName: file.name,
                    fileSize: file.size,
                    source: 'orbit_download'
                };
            });
            ToastAndroid.show(`✅ Successfully scanned ${songs.length} songs`, ToastAndroid.LONG);
            return songs;

        } catch (error) {
            console.error('❌ [OrbitScanner] Error scanning orbit songs:', error);
            console.error('❌ [OrbitScanner] Error stack:', error.stack);
            ToastAndroid.show(`❌ Scanner error: ${error.message}`, ToastAndroid.LONG);
            return [];
        }
    }

    /**
     * Get the songs directory path
     * @returns {Promise<string|null>} Path to songs directory
     */
    static async getSongsDirectory() {
        try {
            // Use StorageManager to get the correct path
            const songsDir = await StorageManager.getDownloadsDirectory();
            return songsDir;
        } catch (error) {
            console.error('Error getting songs directory:', error);

            // Fallback: construct path manually
            if (Platform.OS === 'android') {
                const downloadDir = RNFS.DownloadDirectoryPath;
                return `${downloadDir}/orbit/songs`;
            }

            return null;
        }
    }

    /**
     * Generate a unique song ID from file path
     * @param {string} filePath - File path
     * @returns {string} Unique ID
     */
    static generateSongId(filePath) {
        // Extract filename without extension
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        // Try to extract ID from filename format: "Title - ID.ext"
        const match = nameWithoutExt.match(/\s-\s([A-Za-z0-9_-]+)$/);
        if (match) {
            return match[1];
        }

        // Fallback: use filename hash or just filename
        return nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    }

    /**
     * Scan and return a single song by file path
     * @param {string} filePath - Absolute path to audio file
     * @returns {Promise<Object|null>} Song object or null
     */
    static async scanSingleSong(filePath) {
        try {
            const exists = await RNFS.exists(filePath);
            if (!exists) {
                return null;
            }

            const metadata = await NativeMetadataReader.readMetadata(filePath);
            if (!metadata) {
                return null;
            }

            const stat = await RNFS.stat(filePath);
            const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
            const songId = this.generateSongId(filePath);

            return {
                id: songId,
                title: metadata.title || fileName.replace(/\.[^/.]+$/, ''),
                artist: metadata.artist || 'Unknown Artist',
                album: metadata.album || 'Unknown Album',
                year: metadata.year || '',
                genre: metadata.genre || '',
                url: `file://${filePath}`,
                artwork: metadata.artworkDataUri || 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png',
                duration: 0,
                isLocal: true,
                isDownloaded: true,
                localSongPath: filePath,
                fileName: fileName,
                fileSize: stat.size,
                source: 'orbit_download'
            };

        } catch (error) {
            console.error(`Error scanning single song ${filePath}:`, error);
            return null;
        }
    }

    /**
     * Get count of songs in orbit folder
     * @returns {Promise<number>} Number of audio files
     */
    static async getSongCount() {
        try {
            const songsDir = await this.getSongsDirectory();
            if (!songsDir) return 0;

            const dirExists = await RNFS.exists(songsDir);
            if (!dirExists) return 0;

            const files = await RNFS.readDir(songsDir);
            const audioFiles = files.filter(file => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                return this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
            });

            return audioFiles.length;
        } catch (error) {
            console.error('Error getting song count:', error);
            return 0;
        }
    }
}

export default OrbitSongsScanner;
