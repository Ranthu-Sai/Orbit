import RNFS from 'react-native-fs';

/**
 * AudioMetadataParser - Extracts embedded artwork and metadata from audio files
 * 
 * Supports:
 * - MP3 files (ID3v2 tags)
 * - M4A/AAC/MP4 files (MP4 atoms)
 * - FLAC files (Vorbis comments and FLAC metadata blocks)
 * - OGG files (Vorbis comments)
 */
class AudioMetadataParser {

    /**
     * Extract artwork and metadata from an audio file
     * @param {string} filePath - Path to the audio file
     * @returns {Promise<{artwork: {base64: string, mimeType: string}, metadata: object} | null>}
     */
    static async extractMetadata(filePath) {
        try {
            // Check file exists
            const exists = await RNFS.exists(filePath);
            if (!exists) {
                return null;
            }

            // Determine file type
            const extension = filePath.toLowerCase().split('.').pop();

            if (extension === 'mp3') {
                return await this.extractID3Metadata(filePath);
            } else if (['m4a', 'aac', 'mp4', 'm4b', 'm4p'].includes(extension)) {
                return await this.extractM4AMetadata(filePath);
            } else if (extension === 'flac') {
                return await this.extractFLACMetadata(filePath);
            } else if (extension === 'ogg') {
                return await this.extractOGGMetadata(filePath);
            } else {
                return null;
            }

        } catch (error) {
            // Silently handle errors - file might be corrupted or inaccessible
            return null;
        }
    }

    /**
     * Legacy method for backward compatibility - only returns artwork
     */
    static async extractArtwork(filePath) {
        const result = await this.extractMetadata(filePath);
        return result?.artwork || null;
    }

    /**
     * Extract metadata from FLAC files
     * FLAC uses metadata blocks, including VORBIS_COMMENT for tags and PICTURE for artwork
     */
    static async extractFLACMetadata(filePath) {
        try {
            const MAX_READ_SIZE = 2 * 1024 * 1024; // 2MB

            const stats = await RNFS.stat(filePath);
            const readSize = Math.min(stats.size, MAX_READ_SIZE);

            const base64Data = await RNFS.read(filePath, readSize, 0, 'base64');
            const bytes = this.base64ToBytes(base64Data);

            // Check for "fLaC" signature
            if (!(bytes[0] === 0x66 && bytes[1] === 0x4C && bytes[2] === 0x61 && bytes[3] === 0x43)) {
                return null;
            }

            let offset = 4; // Skip "fLaC"
            let artwork = null;
            let metadata = {};

            // Read metadata blocks
            while (offset < bytes.length - 4) {
                const isLast = (bytes[offset] & 0x80) !== 0;
                const blockType = bytes[offset] & 0x7F;
                const blockLength = (bytes[offset + 1] << 16) | (bytes[offset + 2] << 8) | bytes[offset + 3];

                offset += 4;

                if (offset + blockLength > bytes.length) break;

                // VORBIS_COMMENT block (type 4)
                if (blockType === 4) {
                    metadata = this.parseVorbisComments(bytes.slice(offset, offset + blockLength));
                }

                // PICTURE block (type 6)
                if (blockType === 6) {
                    artwork = this.parseFLACPictureBlock(bytes.slice(offset, offset + blockLength));
                }

                offset += blockLength;
                if (isLast) break;
            }

            return { artwork, metadata };

        } catch (error) {
            return null;
        }
    }

    /**
     * Parse FLAC PICTURE metadata block
     */
    static parseFLACPictureBlock(bytes) {
        try {
            let pos = 0;

            // Picture type (4 bytes)
            pos += 4;

            // MIME type length
            const mimeLength = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
            pos += 4;

            // MIME type
            let mimeType = '';
            for (let i = 0; i < mimeLength; i++) {
                mimeType += String.fromCharCode(bytes[pos++]);
            }

            // Description length
            const descLength = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
            pos += 4 + descLength;

            // Skip width, height, depth, colors (16 bytes)
            pos += 16;

            // Picture data length
            const dataLength = (bytes[pos] << 24) | (bytes[pos + 1] << 16) | (bytes[pos + 2] << 8) | bytes[pos + 3];
            pos += 4;

            if (dataLength > 0 && pos + dataLength <= bytes.length) {
                const imageBytes = bytes.slice(pos, pos + dataLength);
                const base64 = this.bytesToBase64(imageBytes);
                return { base64, mimeType: mimeType || 'image/jpeg' };
            }

            return null;
        } catch (error) {
            return null;
        }
    }

    /**
     * Parse Vorbis comments (used in FLAC and OGG)
     */
    static parseVorbisComments(bytes) {
        try {
            let pos = 0;
            const metadata = {};

            // Vendor string length
            const vendorLength = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
            pos += 4 + vendorLength;

            // Number of comments
            const numComments = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
            pos += 4;

            for (let i = 0; i < numComments && pos < bytes.length; i++) {
                const commentLength = bytes[pos] | (bytes[pos + 1] << 8) | (bytes[pos + 2] << 16) | (bytes[pos + 3] << 24);
                pos += 4;

                if (pos + commentLength > bytes.length) break;

                let comment = '';
                for (let j = 0; j < commentLength; j++) {
                    comment += String.fromCharCode(bytes[pos++]);
                }

                const [key, ...valueParts] = comment.split('=');
                const value = valueParts.join('=');

                if (key && value) {
                    const normalizedKey = key.toLowerCase();
                    if (normalizedKey === 'artist') metadata.artist = value;
                    else if (normalizedKey === 'album') metadata.album = value;
                    else if (normalizedKey === 'title') metadata.title = value;
                    else if (normalizedKey === 'date' || normalizedKey === 'year') metadata.year = value;
                    else if (normalizedKey === 'genre') metadata.genre = value;
                }
            }

            return metadata;
        } catch (error) {
            return {};
        }
    }

    /**
     * Extract metadata from OGG files
     */
    static async extractOGGMetadata(filePath) {
        // OGG parsing is complex - for now return null
        // Can be implemented if needed
        return null;
    }

    /**
     * Extract metadata from M4A/AAC files
     */
    static async extractM4AMetadata(filePath) {
        try {
            const MAX_READ_SIZE = 2 * 1024 * 1024;

            const stats = await RNFS.stat(filePath);
            const readSize = Math.min(stats.size, MAX_READ_SIZE);

            const base64Data = await RNFS.read(filePath, readSize, 0, 'base64');
            const bytes = this.base64ToBytes(base64Data);

            const artwork = this.findCovrAtom(bytes);
            const metadata = this.findM4AMetadata(bytes);

            return { artwork, metadata };

        } catch (error) {
            return null;
        }
    }

    /**
     * Find M4A metadata atoms (©nam, ©ART, ©alb, etc.)
     */
    static findM4AMetadata(bytes) {
        const metadata = {};

        // Search for metadata atoms
        const atoms = {
            '\xa9nam': 'title',    // ©nam
            '\xa9ART': 'artist',   // ©ART
            '\xa9alb': 'album',    // ©alb
            '\xa9day': 'year',     // ©day
            '\xa9gen': 'genre'     // ©gen
        };

        for (const [atomName, metaKey] of Object.entries(atoms)) {
            const value = this.findM4AAtomValue(bytes, atomName);
            if (value) metadata[metaKey] = value;
        }

        return metadata;
    }

    /**
     * Find specific M4A atom value
     */
    static findM4AAtomValue(bytes, atomName) {
        for (let i = 0; i < bytes.length - 8; i++) {
            if (String.fromCharCode(bytes[i], bytes[i + 1], bytes[i + 2], bytes[i + 3]) === atomName) {
                // Found atom, look for data
                for (let j = i; j < Math.min(i + 200, bytes.length - 16); j++) {
                    if (bytes[j] === 0x64 && bytes[j + 1] === 0x61 && bytes[j + 2] === 0x74 && bytes[j + 3] === 0x61) {
                        const dataSize = (bytes[j - 4] << 24) | (bytes[j - 3] << 16) | (bytes[j - 2] << 8) | bytes[j - 1];
                        const textStart = j + 8; // Skip 'data' + flags
                        const textLength = dataSize - 16;

                        if (textLength > 0 && textStart + textLength <= bytes.length) {
                            // Properly decode UTF-8 bytes
                            const textBytes = bytes.slice(textStart, textStart + textLength);
                            try {
                                // Use TextDecoder for proper UTF-8 handling
                                const text = this.decodeUTF8(textBytes);
                                return text.trim();
                            } catch (e) {
                                // Fallback: decode as Latin-1
                                let text = '';
                                for (let k = 0; k < textLength; k++) {
                                    const char = bytes[textStart + k];
                                    if (char > 0) {
                                        text += String.fromCharCode(char);
                                    }
                                }
                                return text.trim();
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Decode UTF-8 bytes to string
     */
    static decodeUTF8(bytes) {
        let result = '';
        let i = 0;

        while (i < bytes.length) {
            const byte1 = bytes[i];

            if (byte1 === 0) {
                // Null terminator
                i++;
                continue;
            } else if (byte1 < 0x80) {
                // Single byte (ASCII)
                result += String.fromCharCode(byte1);
                i++;
            } else if ((byte1 & 0xE0) === 0xC0) {
                // Two bytes
                if (i + 1 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    const codePoint = ((byte1 & 0x1F) << 6) | (byte2 & 0x3F);
                    result += String.fromCharCode(codePoint);
                    i += 2;
                } else {
                    i++;
                }
            } else if ((byte1 & 0xF0) === 0xE0) {
                // Three bytes
                if (i + 2 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    const byte3 = bytes[i + 2];
                    const codePoint = ((byte1 & 0x0F) << 12) | ((byte2 & 0x3F) << 6) | (byte3 & 0x3F);
                    result += String.fromCharCode(codePoint);
                    i += 3;
                } else {
                    i++;
                }
            } else if ((byte1 & 0xF8) === 0xF0) {
                // Four bytes (surrogate pair)
                if (i + 3 < bytes.length) {
                    const byte2 = bytes[i + 1];
                    const byte3 = bytes[i + 2];
                    const byte4 = bytes[i + 3];
                    let codePoint = ((byte1 & 0x07) << 18) | ((byte2 & 0x3F) << 12) | ((byte3 & 0x3F) << 6) | (byte4 & 0x3F);
                    // Convert to surrogate pair
                    codePoint -= 0x10000;
                    result += String.fromCharCode((codePoint >> 10) + 0xD800);
                    result += String.fromCharCode((codePoint & 0x3FF) + 0xDC00);
                    i += 4;
                } else {
                    i++;
                }
            } else {
                // Invalid byte, skip
                i++;
            }
        }

        return result;
    }

    /**
     * Find 'covr' atom in MP4 data
     */
    static findCovrAtom(bytes) {
        for (let i = 0; i < bytes.length - 20; i++) {
            if (bytes[i] === 0x63 && bytes[i + 1] === 0x6F && bytes[i + 2] === 0x76 && bytes[i + 3] === 0x72) {
                const covrSize = (bytes[i - 4] << 24) | (bytes[i - 3] << 16) | (bytes[i - 2] << 8) | bytes[i - 1];

                if (covrSize > 8 && covrSize < bytes.length - i + 4) {
                    for (let j = i + 4; j < i + covrSize - 4 && j < bytes.length - 16; j++) {
                        if (bytes[j] === 0x64 && bytes[j + 1] === 0x61 && bytes[j + 2] === 0x74 && bytes[j + 3] === 0x61) {
                            const dataSize = (bytes[j - 4] << 24) | (bytes[j - 3] << 16) | (bytes[j - 2] << 8) | bytes[j - 1];

                            if (dataSize > 16 && dataSize < 5 * 1024 * 1024) {
                                const imageStart = j + 4 + 4 + 4;
                                const imageSize = dataSize - 16;

                                if (imageStart + imageSize <= bytes.length) {
                                    const imageBytes = bytes.slice(imageStart, imageStart + imageSize);
                                    const base64 = this.bytesToBase64(imageBytes);

                                    let mimeType = 'image/jpeg';
                                    if (imageBytes[0] === 0x89 && imageBytes[1] === 0x50) {
                                        mimeType = 'image/png';
                                    }

                                    return { base64, mimeType };
                                }
                            }
                        }
                    }
                }
            }
        }
        return null;
    }

    /**
     * Extract metadata from MP3 files
     */
    static async extractID3Metadata(filePath) {
        try {
            const MAX_READ_SIZE = 512 * 1024;

            const stats = await RNFS.stat(filePath);
            const readSize = Math.min(stats.size, MAX_READ_SIZE);

            const base64Data = await RNFS.read(filePath, readSize, 0, 'base64');
            const bytes = this.base64ToBytes(base64Data);

            if (!this.hasID3v2Header(bytes)) {
                return null;
            }

            const headerInfo = this.parseID3v2Header(bytes);
            if (!headerInfo) {
                return null;
            }

            const artwork = this.findAPICFrame(bytes, headerInfo);
            const metadata = this.extractID3Frames(bytes, headerInfo);

            return { artwork, metadata };

        } catch (error) {
            return null;
        }
    }

    /**
     * Extract ID3 text frames
     */
    static extractID3Frames(bytes, headerInfo) {
        const metadata = {};
        let offset = headerInfo.headerSize;
        const maxOffset = Math.min(offset + headerInfo.size, bytes.length);

        while (offset < maxOffset - 10) {
            const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);

            if (bytes[offset] === 0x00) break;

            let frameSize;
            if (headerInfo.version === 4) {
                frameSize = (bytes[offset + 4] << 21) | (bytes[offset + 5] << 14) | (bytes[offset + 6] << 7) | bytes[offset + 7];
            } else {
                frameSize = (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
            }

            const dataOffset = offset + 10;

            // Extract text frames
            if (frameId === 'TIT2') metadata.title = this.extractTextFrame(bytes, dataOffset, frameSize);
            else if (frameId === 'TPE1') metadata.artist = this.extractTextFrame(bytes, dataOffset, frameSize);
            else if (frameId === 'TALB') metadata.album = this.extractTextFrame(bytes, dataOffset, frameSize);
            else if (frameId === 'TYER' || frameId === 'TDRC') metadata.year = this.extractTextFrame(bytes, dataOffset, frameSize);
            else if (frameId === 'TCON') metadata.genre = this.extractTextFrame(bytes, dataOffset, frameSize);

            offset += 10 + frameSize;
        }

        return metadata;
    }

    /**
     * Extract text from ID3 text frame with proper encoding support
     * ID3v2 supports: ISO-8859-1 (0x00), UTF-16 with BOM (0x01), UTF-16BE (0x02), UTF-8 (0x03)
     */
    static extractTextFrame(bytes, offset, size) {
        try {
            if (size < 2) return null;
            const encoding = bytes[offset];
            const textStart = offset + 1;
            const textEnd = offset + size;

            if (textStart >= bytes.length) return null;

            let text = '';

            // ISO-8859-1 (Latin-1) - encoding 0x00
            if (encoding === 0x00 || encoding === 0x03) {
                for (let i = textStart; i < textEnd && i < bytes.length; i++) {
                    const char = bytes[i];
                    if (char === 0) break; // Null terminator
                    text += String.fromCharCode(char);
                }
            }
            // UTF-16 with BOM or UTF-16BE - encoding 0x01 or 0x02
            else if (encoding === 0x01 || encoding === 0x02) {
                let i = textStart;

                // Check for BOM if encoding is 0x01
                let littleEndian = false;
                if (encoding === 0x01 && i + 1 < textEnd) {
                    if (bytes[i] === 0xFF && bytes[i + 1] === 0xFE) {
                        littleEndian = true;
                        i += 2; // Skip BOM
                    } else if (bytes[i] === 0xFE && bytes[i + 1] === 0xFF) {
                        littleEndian = false;
                        i += 2; // Skip BOM
                    }
                }

                // Read UTF-16 characters (2 bytes each)
                while (i + 1 < textEnd && i + 1 < bytes.length) {
                    let charCode;
                    if (littleEndian) {
                        charCode = bytes[i] | (bytes[i + 1] << 8);
                    } else {
                        charCode = (bytes[i] << 8) | bytes[i + 1];
                    }

                    // Stop at null terminator (0x0000 in UTF-16)
                    if (charCode === 0) break;

                    text += String.fromCharCode(charCode);
                    i += 2;
                }
            }
            // Fallback: try to read as UTF-8
            else {
                for (let i = textStart; i < textEnd && i < bytes.length; i++) {
                    const char = bytes[i];
                    if (char === 0) break;
                    text += String.fromCharCode(char);
                }
            }

            return text.trim() || null;
        } catch (e) {
            return null;
        }
    }

    static hasID3v2Header(bytes) {
        if (bytes.length < 10) return false;
        return bytes[0] === 0x49 && bytes[1] === 0x44 && bytes[2] === 0x33;
    }

    static parseID3v2Header(bytes) {
        if (bytes.length < 10) return null;
        const version = bytes[3];
        const size = (bytes[6] << 21) | (bytes[7] << 14) | (bytes[8] << 7) | bytes[9];
        return { version, size, headerSize: 10 };
    }

    static findAPICFrame(bytes, headerInfo) {
        let offset = headerInfo.headerSize;
        const maxOffset = Math.min(offset + headerInfo.size, bytes.length);

        while (offset < maxOffset - 10) {
            const frameId = String.fromCharCode(bytes[offset], bytes[offset + 1], bytes[offset + 2], bytes[offset + 3]);

            if (bytes[offset] === 0x00) break;

            let frameSize;
            if (headerInfo.version === 4) {
                frameSize = (bytes[offset + 4] << 21) | (bytes[offset + 5] << 14) | (bytes[offset + 6] << 7) | bytes[offset + 7];
            } else {
                frameSize = (bytes[offset + 4] << 24) | (bytes[offset + 5] << 16) | (bytes[offset + 6] << 8) | bytes[offset + 7];
            }

            const dataOffset = offset + 10;

            if (frameId === 'APIC') {
                return this.parseAPICFrame(bytes, dataOffset, frameSize);
            }

            offset += 10 + frameSize;
        }

        return null;
    }

    static parseAPICFrame(bytes, offset, size) {
        try {
            const endOffset = offset + size;
            let pos = offset;

            const encoding = bytes[pos++];

            let mimeType = '';
            while (pos < endOffset && bytes[pos] !== 0x00) {
                mimeType += String.fromCharCode(bytes[pos++]);
            }
            pos++;

            pos++; // Picture type

            if (encoding === 0x00 || encoding === 0x03) {
                while (pos < endOffset && bytes[pos] !== 0x00) pos++;
                pos++;
            } else {
                while (pos < endOffset - 1 && !(bytes[pos] === 0x00 && bytes[pos + 1] === 0x00)) pos++;
                pos += 2;
            }

            const imageLength = endOffset - pos;
            if (imageLength <= 0) return null;

            const imageBytes = bytes.slice(pos, endOffset);
            const base64 = this.bytesToBase64(imageBytes);

            if (!mimeType || mimeType === 'image/jpg') mimeType = 'image/jpeg';

            return { base64, mimeType };

        } catch (error) {
            return null;
        }
    }

    static base64ToBytes(base64) {
        const binaryString = atob(base64);
        const len = binaryString.length;
        const bytes = new Uint8Array(len);
        for (let i = 0; i < len; i++) {
            bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
    }

    static bytesToBase64(bytes) {
        let binary = '';
        const len = bytes.length;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    }
}

export default AudioMetadataParser;
