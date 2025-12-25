import { NativeModules } from 'react-native';

const { MetadataReaderModule } = NativeModules;

/**
 * NativeMetadataReader - JavaScript bridge to read embedded metadata from audio files
 * 
 * Uses native JAudioTagger library to extract:
 * - Title, artist, album, year, genre
 * - Embedded artwork images
 * 
 * Supports: MP3, M4A/AAC, FLAC, OGG
 */
class NativeMetadataReader {
    static isInitialized = false;

    /**
   * Initialize the native module
   */
    static async initialize() {
        if (this.isInitialized) {
            console.log('✅ NativeMetadataReader already initialized');
            return true;
        }

        try {
            console.log('🔧 NativeMetadataReader: Checking native module...');

            if (!MetadataReaderModule) {
                console.error('❌ MetadataReaderModule not found - native module not linked properly');
                console.error('Available NativeModules:', Object.keys(NativeModules).filter(k => k.includes('Metadata')));
                return false;
            }

            console.log('✅ MetadataReaderModule found, initializing...');
            await MetadataReaderModule.initialize();
            this.isInitialized = true;
            console.log('✅ NativeMetadataReader initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize NativeMetadataReader:', error);
            console.error('Error details:', error.message, error.stack);
            return false;
        }
    }

    /**
     * Read metadata from a single audio file
     * @param {string} filePath - Absolute path to audio file
     * @returns {Promise<Object|null>} Metadata object or null on error
     */
    static async readMetadata(filePath) {
        try {
            await this.initialize();

            if (!MetadataReaderModule) {
                console.warn('MetadataReaderModule not available');
                return null;
            }

            const metadata = await MetadataReaderModule.readMetadata(filePath);

            // Convert artwork base64 to data URI if present
            if (metadata.artworkBase64) {
                const mimeType = metadata.artworkMimeType || 'image/jpeg';
                metadata.artworkDataUri = `data:${mimeType};base64,${metadata.artworkBase64}`;
                // Clean up base64 to save memory (keep only data URI)
                delete metadata.artworkBase64;
            }

            return metadata;
        } catch (error) {
            console.error(`Failed to read metadata from ${filePath}:`, error.message);
            return null;
        }
    }

    /**
   * Read metadata from multiple files (batch operation)
   * More efficient than calling readMetadata multiple times
   * @param {string[]} filePaths - Array of absolute file paths
   * @returns {Promise<Object[]>} Array of metadata objects
   */
    static async readMetadataBatch(filePaths) {
        try {
            console.log(`📚 [MetadataReader] Reading batch of ${filePaths.length} files...`);

            const initialized = await this.initialize();
            if (!initialized) {
                console.error('❌ [MetadataReader] Not initialized, returning empty array');
                return [];
            }

            if (!MetadataReaderModule) {
                console.warn('❌ [MetadataReader] MetadataReaderModule not available');
                return [];
            }

            console.log('🔍 [MetadataReader] Calling native readMetadataBatch...');
            const metadataArray = await MetadataReaderModule.readMetadataBatch(filePaths);
            console.log(`✅ [MetadataReader] Received ${metadataArray.length} metadata objects`);

            // Convert artwork base64 to data URI for each result
            const processedArray = metadataArray.map((metadata, index) => {
                if (metadata.artworkBase64) {
                    const mimeType = metadata.artworkMimeType || 'image/jpeg';
                    metadata.artworkDataUri = `data:${mimeType};base64,${metadata.artworkBase64}`;
                    delete metadata.artworkBase64;
                }
                return metadata;
            });

            console.log(`✅ [MetadataReader] Processed ${processedArray.length} metadata objects`);
            return processedArray;
        } catch (error) {
            console.error('❌ [MetadataReader] Failed to read metadata batch:', error);
            console.error('❌ [MetadataReader] Error message:', error.message);
            console.error('❌ [MetadataReader] Error stack:', error.stack);
            return [];
        }
    }

    /**
     * Read metadata from a content:// URI
     * This handles files opened from file managers
     * @param {string} contentUri - content:// URI from file intent
     * @returns {Promise<Object|null>} Metadata object with filePath for playback
     */
    static async readMetadataFromUri(contentUri) {
        try {
            await this.initialize();

            if (!MetadataReaderModule || !MetadataReaderModule.readMetadataFromUri) {
                console.warn('MetadataReaderModule.readMetadataFromUri not available');
                return null;
            }

            console.log('📱 Reading metadata from content URI:', contentUri);
            const metadata = await MetadataReaderModule.readMetadataFromUri(contentUri);

            // Convert artwork base64 to data URI if present
            if (metadata.artworkBase64) {
                const mimeType = metadata.artworkMimeType || 'image/jpeg';
                metadata.artworkDataUri = `data:${mimeType};base64,${metadata.artworkBase64}`;
                delete metadata.artworkBase64;
            }

            console.log('✅ Metadata read from URI:', metadata.title);
            return metadata;
        } catch (error) {
            console.error(`Failed to read metadata from URI ${contentUri}:`, error.message);
            return null;
        }
    }

    /**
     * Resolve a content:// URI to a playable file path
     * @param {string} contentUri - content:// URI from file intent
     * @returns {Promise<Object|null>} { filePath, fileName, isTempFile }
     */
    static async resolveContentUri(contentUri) {
        try {
            await this.initialize();

            if (!MetadataReaderModule || !MetadataReaderModule.resolveContentUri) {
                console.warn('MetadataReaderModule.resolveContentUri not available');
                return null;
            }

            console.log('🔍 Resolving content URI:', contentUri);
            return await MetadataReaderModule.resolveContentUri(contentUri);
        } catch (error) {
            console.error(`Failed to resolve content URI ${contentUri}:`, error.message);
            return null;
        }
    }

    /**
     * Check if a file format is supported
     * @param {string} filePath - File path
     * @returns {boolean} True if format is supported
     */
    static isSupportedFormat(filePath) {
        const extension = filePath.toLowerCase().split('.').pop();
        return ['mp3', 'm4a', 'aac', 'mp4', 'flac', 'ogg', 'opus'].includes(extension);
    }
}

export default NativeMetadataReader;
