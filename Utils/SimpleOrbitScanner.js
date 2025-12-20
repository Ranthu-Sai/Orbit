import RNFS from 'react-native-fs';
import { StorageManager } from './StorageManager';
import { Platform, ToastAndroid } from 'react-native';

/**
 * SimpleOrbitScanner - Scans orbit/songs folder WITHOUT native metadata reading
 * This is a simpler fallback that just lists files and uses filenames
 */
class SimpleOrbitScanner {

    // Supported audio file extensions
    static SUPPORTED_EXTENSIONS = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.opus'];

    /**
     * Scan the orbit/songs folder and return all songs
     * @returns {Promise<Array>} Array of song objects
     */
    static async scanOrbitSongs() {
        try {
            console.log('🔍 [SimpleScanner] Starting scan...');
            ToastAndroid.show('📂 Scanning orbit/songs...', ToastAndroid.SHORT);

            // Import ID3Parser for metadata reading
            const AudioMetadataParser = require('./ID3Parser').default;

            // Get the songs directory path
            const songsDir = await this.getSongsDirectory();
            console.log(`📂 [SimpleScanner] Songs directory: ${songsDir}`);
            ToastAndroid.show(`Path: ${songsDir}`, ToastAndroid.LONG);

            if (!songsDir) {
                console.error('❌ [SimpleScanner] Could not determine songs directory');
                ToastAndroid.show('❌ Could not find directory', ToastAndroid.LONG);
                return [];
            }

            // Check if directory exists
            const dirExists = await RNFS.exists(songsDir);
            console.log(`📁 [SimpleScanner] Directory exists: ${dirExists}`);
            ToastAndroid.show(`Dir exists: ${dirExists}`, ToastAndroid.SHORT);

            if (!dirExists) {
                console.log('📭 [SimpleScanner] Directory does not exist, creating...');
                try {
                    await RNFS.mkdir(songsDir);
                    ToastAndroid.show('Created directory', ToastAndroid.SHORT);
                } catch (err) {
                    console.error('Failed to create directory:', err);
                }
                return [];
            }

            // Read all files
            console.log('📖 [SimpleScanner] Reading files...');
            const files = await RNFS.readDir(songsDir);
            console.log(`📄 [SimpleScanner] Found ${files.length} total files`);
            ToastAndroid.show(`Found ${files.length} files`, ToastAndroid.SHORT);

            // Filter for audio files
            const audioFiles = files.filter(file => {
                const ext = file.name.toLowerCase().substring(file.name.lastIndexOf('.'));
                return this.SUPPORTED_EXTENSIONS.includes(ext) && file.isFile();
            });

            console.log(`🎵 [SimpleScanner] Found ${audioFiles.length} audio files`);
            ToastAndroid.show(`${audioFiles.length} audio files found`, ToastAndroid.SHORT);

            if (audioFiles.length === 0) {
                ToastAndroid.show('⚠️ No audio files', ToastAndroid.LONG);
                return [];
            }

            // Extract metadata from each file
            console.log('🔍 [SimpleScanner] Reading metadata...');
            ToastAndroid.show('Reading metadata...', ToastAndroid.SHORT);

            const songs = await Promise.all(
                audioFiles.map(async (file) => {
                    const fileName = file.name.replace(/\.[^/.]+$/, ''); // Remove extension
                    const songId = this.generateSongId(file.path);

                    // Default values
                    let title = fileName;
                    let artist = 'Unknown Artist';
                    let album = 'Downloaded Songs';
                    let artworkUri = 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png';

                    // Try to read embedded metadata
                    try {
                        const metadataResult = await AudioMetadataParser.extractMetadata(file.path);

                        if (metadataResult && metadataResult.metadata) {
                            title = metadataResult.metadata.title || title;
                            artist = metadataResult.metadata.artist || artist;
                            album = metadataResult.metadata.album || album;

                            // Extract artwork if available
                            if (metadataResult.artwork && metadataResult.artwork.base64) {
                                const mimeType = metadataResult.artwork.mimeType || 'image/jpeg';
                                artworkUri = `data:${mimeType};base64,${metadataResult.artwork.base64}`;
                            }
                        }
                    } catch (metadataError) {
                        console.warn(`Failed to read metadata for ${file.name}:`, metadataError.message);
                        // Continue with filename-based title
                    }

                    // Fallback: Try to parse title from filename if metadata reading failed
                    if (title === fileName && fileName.includes(' - ')) {
                        const parts = fileName.split(' - ');
                        title = parts[0];
                    }

                    return {
                        id: songId,
                        title: title,
                        artist: artist,
                        album: album,
                        year: '',
                        genre: '',
                        url: `file://${file.path}`,
                        artwork: artworkUri,
                        duration: 0,
                        isLocal: true,
                        isDownloaded: true,
                        localSongPath: file.path,
                        fileName: file.name,
                        fileSize: file.size,
                        source: 'orbit_download'
                    };
                })
            );

            console.log(`✅ [SimpleScanner] Scanned ${songs.length} songs successfully`);
            ToastAndroid.show(`✅ Loaded ${songs.length} songs with metadata`, ToastAndroid.LONG);
            return songs;

        } catch (error) {
            console.error('❌ [SimpleScanner] Error:', error);
            ToastAndroid.show(`❌ Error: ${error.message}`, ToastAndroid.LONG);
            return [];
        }
    }

    /**
     * Get the songs directory path
     */
    static async getSongsDirectory() {
        try {
            const songsDir = await StorageManager.getDownloadsDirectory();
            return songsDir;
        } catch (error) {
            console.error('Error getting songs directory:', error);

            // Fallback
            if (Platform.OS === 'android') {
                const downloadDir = RNFS.DownloadDirectoryPath;
                return `${downloadDir}/orbit/songs`;
            }

            return null;
        }
    }

    /**
     * Generate a unique song ID from file path
     */
    static generateSongId(filePath) {
        const fileName = filePath.substring(filePath.lastIndexOf('/') + 1);
        const nameWithoutExt = fileName.replace(/\.[^/.]+$/, '');

        // Try to extract ID from filename format: "Title - ID.ext"
        const match = nameWithoutExt.match(/\s-\s([A-Za-z0-9_-]+)$/);
        if (match) {
            return match[1];
        }

        // Fallback: use filename
        return nameWithoutExt.replace(/[^a-zA-Z0-9]/g, '_');
    }
}

export default SimpleOrbitScanner;
