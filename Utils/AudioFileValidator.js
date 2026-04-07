import RNFS from 'react-native-fs';

/**
 * AudioFileValidator - Utility for validating audio files before playback
 * Helps prevent playback errors by checking file format, size, and accessibility
 */
export class AudioFileValidator {
  // Supported audio formats with their MIME types
  static SUPPORTED_FORMATS = {
    '.mp3': 'audio/mpeg',
    '.m4a': 'audio/mp4',
    '.aac': 'audio/aac',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.flac': 'audio/flac',
  };

  // Problematic file patterns that often cause playback issues
  static PROBLEMATIC_PATTERNS = [
    'ElevenLabs_', // AI-generated audio files
    '_pvc_', // Specific pattern causing issues
    '.tmp', // Temporary files
    '.part', // Partial downloads
    '.download', // Incomplete downloads
    '.crdownload', // Chrome partial downloads
    '.opdownload', // Opera partial downloads
  ];

  // Minimum file size (in bytes) for a valid audio file
  static MIN_FILE_SIZE = 1024; // 1KB

  // Maximum file size (in bytes) to prevent memory issues
  static MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB

  /**
   * Validate a single audio file
   * @param {Object} file - File object with path, name, and other properties
   * @returns {Promise<Object>} Validation result with isValid, reason, and file info
   */
  static async validateFile(file) {
    const result = {
      isValid: false,
      reason: '',
      file: file,
      warnings: [],
    };

    try {
      // Check if file object is valid
      if (!file || typeof file !== 'object') {
        result.reason = 'Invalid file object';
        return result;
      }

      // Check if file has required properties
      if (!file.path && !file.url) {
        result.reason = 'File path or URL is missing';
        return result;
      }

      const filePath = file.path || file.url;
      const fileName = file.name || file.title || 'Unknown';

      // Check for problematic file patterns
      const hasProblematicPattern = this.PROBLEMATIC_PATTERNS.some(
        (pattern) => fileName.includes(pattern) || filePath.includes(pattern)
      );

      if (hasProblematicPattern) {
        result.reason = 'File contains problematic pattern';
        result.warnings.push(
          'File may cause playback issues due to naming pattern'
        );
        return result;
      }

      // Check file extension
      const fileExtension = this.getFileExtension(fileName);
      if (!fileExtension || !this.SUPPORTED_FORMATS[fileExtension]) {
        result.reason = `Unsupported file format: ${
          fileExtension || 'unknown'
        }`;
        return result;
      }

      // For local files, perform additional checks
      if (file.path && !file.path.startsWith('http')) {
        const fileValidation = await this.validateLocalFile(file.path);
        if (!fileValidation.isValid) {
          result.reason = fileValidation.reason;
          result.warnings = fileValidation.warnings;
          return result;
        }
        result.warnings.push(...fileValidation.warnings);
      }

      // If we reach here, the file passed all validations
      result.isValid = true;
      result.reason = 'File validation passed';

      return result;
    } catch (error) {
      result.reason = `Validation error: ${error.message}`;
      return result;
    }
  }

  /**
   * Validate a local file's accessibility and properties
   * @param {string} filePath - Path to the local file
   * @returns {Promise<Object>} Validation result
   */
  static async validateLocalFile(filePath) {
    const result = {
      isValid: false,
      reason: '',
      warnings: [],
    };

    try {
      // Check if file exists
      const fileExists = await RNFS.exists(filePath);
      if (!fileExists) {
        result.reason = 'File does not exist';
        return result;
      }

      // Get file stats
      const stats = await RNFS.stat(filePath);

      // Check file size
      if (stats.size < this.MIN_FILE_SIZE) {
        result.reason = `File too small (${stats.size} bytes)`;
        return result;
      }

      if (stats.size > this.MAX_FILE_SIZE) {
        result.reason = `File too large (${Math.round(
          stats.size / 1024 / 1024
        )}MB)`;
        return result;
      }

      // Check if file is readable
      try {
        await RNFS.readFile(filePath, 'base64', 0, 100); // Read first 100 bytes
      } catch (readError) {
        result.reason = 'File is not readable';
        return result;
      }

      // Add warnings for potentially problematic files
      if (stats.size < 10 * 1024) {
        // Less than 10KB
        result.warnings.push('File is very small, may be corrupted');
      }

      if (stats.size > 100 * 1024 * 1024) {
        // Larger than 100MB
        result.warnings.push('Large file may cause performance issues');
      }

      result.isValid = true;
      result.reason = 'Local file validation passed';
      return result;
    } catch (error) {
      result.reason = `Local file validation error: ${error.message}`;
      return result;
    }
  }

  /**
   * Validate multiple files and return filtered results
   * @param {Array} files - Array of file objects
   * @returns {Promise<Object>} Object with valid files, invalid files, and summary
   */
  static async validateFiles(files) {
    if (!Array.isArray(files)) {
      return {
        validFiles: [],
        invalidFiles: [],
        summary: {
          total: 0,
          valid: 0,
          invalid: 0,
          warnings: 0,
        },
      };
    }

    const validFiles = [];
    const invalidFiles = [];
    let warningCount = 0;

    for (const file of files) {
      const validation = await this.validateFile(file);

      if (validation.isValid) {
        validFiles.push({
          ...file,
          validationWarnings: validation.warnings,
        });
        if (validation.warnings.length > 0) {
          warningCount++;
        }
      } else {
        invalidFiles.push({
          ...file,
          validationReason: validation.reason,
          validationWarnings: validation.warnings,
        });
      }
    }

    return {
      validFiles,
      invalidFiles,
      summary: {
        total: files.length,
        valid: validFiles.length,
        invalid: invalidFiles.length,
        warnings: warningCount,
      },
    };
  }

  /**
   * Get file extension from filename
   * @param {string} filename - The filename
   * @returns {string} File extension (including dot) or null
   */
  static getFileExtension(filename) {
    if (!filename || typeof filename !== 'string') {
      return null;
    }

    const lastDotIndex = filename.lastIndexOf('.');
    if (lastDotIndex === -1 || lastDotIndex === filename.length - 1) {
      return null;
    }

    return filename.substring(lastDotIndex).toLowerCase();
  }

  /**
   * Check if a file format is supported
   * @param {string} filename - The filename
   * @returns {boolean} True if format is supported
   */
  static isSupportedFormat(filename) {
    const extension = this.getFileExtension(filename);
    return extension && this.SUPPORTED_FORMATS.hasOwnProperty(extension);
  }

  /**
   * Get MIME type for a file
   * @param {string} filename - The filename
   * @returns {string} MIME type or 'application/octet-stream' if unknown
   */
  static getMimeType(filename) {
    const extension = this.getFileExtension(filename);
    return this.SUPPORTED_FORMATS[extension] || 'application/octet-stream';
  }

  /**
   * Log validation summary
   * @param {Object} validationResult - Result from validateFiles
   */
  static logValidationSummary(_validationResult) {
    // Silent validation summary for production
  }
}

export default AudioFileValidator;
