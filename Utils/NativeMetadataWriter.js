import { NativeModules, Platform } from 'react-native';

const { MetadataWriter } = NativeModules;

/**
 * NativeMetadataWriter - JavaScript bridge to native metadata embedding
 * 
 * Uses JAudioTagger under the hood to embed ID3/MP4/Vorbis tags
 * Supports: MP3, M4A, AAC, FLAC, OGG, WAV
 */

/**
 * Embeds metadata and artwork into an audio file
 * 
 * @param {string} filePath - Absolute path to the audio file
 * @param {Object} metadata - Metadata object { title, artist, album, year }
 * @param {string|null} artworkPath - Optional path to artwork image file
 * @returns {Promise<boolean>} - True if successful, false otherwise
 */
export async function embedMetadataInFile(filePath, metadata, artworkPath = null) {
    // Only supported on Android
    if (Platform.OS !== 'android') {
        console.warn('NativeMetadataWriter: Metadata embedding only supported on Android');
        return false;
    }

    if (!MetadataWriter) {
        console.error('NativeMetadataWriter: Native module not available');
        return false;
    }

    try {
        await MetadataWriter.embedMetadata(
            filePath,
            metadata.title || null,
            metadata.artist || null,
            metadata.album || null,
            metadata.year?.toString() || null,
            artworkPath
        );
        console.log(`NativeMetadataWriter: Successfully embedded metadata into ${filePath}`);
        return true;
    } catch (error) {
        console.error('NativeMetadataWriter: Failed to embed metadata:', error);
        return false;
    }
}

/**
 * Checks if a file format is supported for metadata embedding
 * 
 * @param {string} filePath - Path to the audio file
 * @returns {Promise<boolean>} - True if format is supported
 */
export async function isFormatSupported(filePath) {
    if (Platform.OS !== 'android' || !MetadataWriter) {
        return false;
    }

    try {
        return await MetadataWriter.isFormatSupported(filePath);
    } catch (error) {
        return false;
    }
}

/**
 * Determines if a file is likely an MP3 or M4A based on extension
 * (Quick check without needing native call)
 * 
 * @param {string} filePath - Path to the audio file
 * @returns {boolean} - True if file extension suggests metadata support
 */
export function hasMetadataSupportByExtension(filePath) {
    if (!filePath || typeof filePath !== 'string') return false;

    const supportedExtensions = ['.mp3', '.m4a', '.aac', '.flac', '.ogg', '.wav', '.wma', '.opus'];
    const lowerPath = filePath.toLowerCase();

    return supportedExtensions.some(ext => lowerPath.endsWith(ext));
}

export default {
    embedMetadataInFile,
    isFormatSupported,
    hasMetadataSupportByExtension
};
