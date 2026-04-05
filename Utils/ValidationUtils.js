/**
 * Shared validation utilities to eliminate duplication across components
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Validation result structure
export const ValidationResult = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
};

/**
 * Create validation result
 * @param {string} status - Validation status
 * @param {string} message - Validation message
 * @param {any} data - Additional data
 * @returns {Object} Validation result object
 */
export const createValidationResult = (status, message = '', data = null) => ({
  status,
  message,
  data,
  timestamp: Date.now(),
});

/**
 * Validate song object structure
 * @param {Object} song - Song object to validate
 * @returns {Object} Validation result
 */
export const validateSong = (song) => {
  if (!song) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Song object is null or undefined'
    );
  }

  if (typeof song !== 'object') {
    return createValidationResult(
      ValidationResult.ERROR,
      'Song must be an object'
    );
  }

  // Check required fields
  const requiredFields = ['id'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (!(field in song) || song[field] === null || song[field] === undefined) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return createValidationResult(
      ValidationResult.ERROR,
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }

  // Validate field types and formats
  const warnings = [];

  if (song.id && typeof song.id !== 'string' && typeof song.id !== 'number') {
    warnings.push('Song ID should be string or number');
  }

  if (song.title && typeof song.title !== 'string') {
    warnings.push('Song title should be string');
  }

  if (song.artist && typeof song.artist !== 'string') {
    warnings.push('Song artist should be string');
  }

  if (
    song.duration &&
    (typeof song.duration !== 'number' || song.duration < 0)
  ) {
    warnings.push('Song duration should be positive number');
  }

  if (song.url && typeof song.url !== 'string') {
    warnings.push('Song URL should be string');
  }

  const result = createValidationResult(
    ValidationResult.SUCCESS,
    'Song validation passed'
  );
  if (warnings.length > 0) {
    result.warnings = warnings;
    result.status = ValidationResult.WARNING;
    result.message = `Song validation passed with warnings: ${warnings.join(
      ', '
    )}`;
  }

  return result;
};

/**
 * Validate playlist object structure
 * @param {Object} playlist - Playlist object to validate
 * @returns {Object} Validation result
 */
export const validatePlaylist = (playlist) => {
  if (!playlist) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Playlist object is null or undefined'
    );
  }

  if (typeof playlist !== 'object') {
    return createValidationResult(
      ValidationResult.ERROR,
      'Playlist must be an object'
    );
  }

  // Check required fields
  const requiredFields = ['id', 'name'];
  const missingFields = [];

  for (const field of requiredFields) {
    if (
      !(field in playlist) ||
      playlist[field] === null ||
      playlist[field] === undefined
    ) {
      missingFields.push(field);
    }
  }

  if (missingFields.length > 0) {
    return createValidationResult(
      ValidationResult.ERROR,
      `Missing required fields: ${missingFields.join(', ')}`,
      { missingFields }
    );
  }

  // Validate songs array if present
  if (playlist.songs && !Array.isArray(playlist.songs)) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Playlist songs must be an array'
    );
  }

  // Validate individual songs if present
  if (playlist.songs && playlist.songs.length > 0) {
    const songValidationResults = playlist.songs.map((song) =>
      validateSong(song)
    );
    const invalidSongs = songValidationResults.filter(
      (result) => result.status === ValidationResult.ERROR
    );

    if (invalidSongs.length > 0) {
      return createValidationResult(
        ValidationResult.ERROR,
        `${invalidSongs.length} invalid songs found in playlist`,
        { invalidSongs }
      );
    }
  }

  return createValidationResult(
    ValidationResult.SUCCESS,
    'Playlist validation passed'
  );
};

/**
 * Validate user input (search queries, etc.)
 * @param {string} input - Input to validate
 * @param {Object} options - Validation options
 * @returns {Object} Validation result
 */
export const validateUserInput = (input, options = {}) => {
  const {
    minLength = 1,
    maxLength = 100,
    allowEmpty = false,
    allowedChars = null,
  } = options;

  if (!input && !allowEmpty) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Input cannot be empty'
    );
  }

  if (input && typeof input !== 'string') {
    return createValidationResult(
      ValidationResult.ERROR,
      'Input must be a string'
    );
  }

  if (input && input.length < minLength) {
    return createValidationResult(
      ValidationResult.ERROR,
      `Input must be at least ${minLength} characters long`
    );
  }

  if (input && input.length > maxLength) {
    return createValidationResult(
      ValidationResult.ERROR,
      `Input cannot exceed ${maxLength} characters`
    );
  }

  if (input && allowedChars && !allowedChars.test(input)) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Input contains invalid characters'
    );
  }

  return createValidationResult(
    ValidationResult.SUCCESS,
    'Input validation passed'
  );
};

/**
 * Validate URL format and accessibility
 * @param {string} url - URL to validate
 * @returns {Object} Validation result
 */
export const validateUrl = (url) => {
  if (!url) {
    return createValidationResult(ValidationResult.ERROR, 'URL is required');
  }

  if (typeof url !== 'string') {
    return createValidationResult(
      ValidationResult.ERROR,
      'URL must be a string'
    );
  }

  try {
    const urlObj = new URL(url);

    // Check protocol
    const allowedProtocols = ['http:', 'https:', 'file:'];
    if (!allowedProtocols.includes(urlObj.protocol)) {
      return createValidationResult(
        ValidationResult.ERROR,
        `Invalid URL protocol. Allowed: ${allowedProtocols.join(', ')}`
      );
    }

    // Check for suspicious patterns
    const suspiciousPatterns = [
      /javascript:/i,
      /data:/i,
      /vbscript:/i,
      /<script/i,
      /onload=/i,
      /onerror=/i,
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(url)) {
        return createValidationResult(
          ValidationResult.ERROR,
          'URL contains suspicious patterns'
        );
      }
    }

    return createValidationResult(
      ValidationResult.SUCCESS,
      'URL validation passed'
    );
  } catch (error) {
    return createValidationResult(ValidationResult.ERROR, 'Invalid URL format');
  }
};

/**
 * Validate file path for security
 * @param {string} filePath - File path to validate
 * @returns {Object} Validation result
 */
export const validateFilePath = (filePath) => {
  if (!filePath) {
    return createValidationResult(
      ValidationResult.ERROR,
      'File path is required'
    );
  }

  if (typeof filePath !== 'string') {
    return createValidationResult(
      ValidationResult.ERROR,
      'File path must be a string'
    );
  }

  // Check for path traversal attempts
  const traversalPatterns = [/\.\.\//g, /\.\.\\/g, /\.\./g];

  for (const pattern of traversalPatterns) {
    if (pattern.test(filePath)) {
      return createValidationResult(
        ValidationResult.ERROR,
        'File path contains path traversal attempts'
      );
    }
  }

  // Check for absolute paths that shouldn't be allowed
  if (
    filePath.startsWith('/') ||
    filePath.startsWith('\\') ||
    filePath.includes(':')
  ) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Absolute file paths are not allowed'
    );
  }

  // Check for valid characters
  const invalidChars = /[<>:"|?*\x00-\x1f]/;
  if (invalidChars.test(filePath)) {
    return createValidationResult(
      ValidationResult.ERROR,
      'File path contains invalid characters'
    );
  }

  return createValidationResult(
    ValidationResult.SUCCESS,
    'File path validation passed'
  );
};

/**
 * Validate network configuration
 * @param {Object} config - Network configuration
 * @returns {Object} Validation result
 */
export const validateNetworkConfig = (config) => {
  if (!config) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Network config is required'
    );
  }

  if (typeof config !== 'object') {
    return createValidationResult(
      ValidationResult.ERROR,
      'Network config must be an object'
    );
  }

  const warnings = [];

  // Validate timeout
  if (config.timeout !== undefined) {
    if (typeof config.timeout !== 'number' || config.timeout < 0) {
      return createValidationResult(
        ValidationResult.ERROR,
        'Timeout must be a positive number'
      );
    }

    if (config.timeout > 60000) {
      warnings.push('Very long timeout may cause poor user experience');
    }
  }

  // Validate retry attempts
  if (config.retryAttempts !== undefined) {
    if (typeof config.retryAttempts !== 'number' || config.retryAttempts < 0) {
      return createValidationResult(
        ValidationResult.ERROR,
        'Retry attempts must be a non-negative number'
      );
    }
  }

  // Validate URLs if present
  if (config.url) {
    const urlValidation = validateUrl(config.url);
    if (urlValidation.status === ValidationResult.ERROR) {
      return urlValidation;
    }
  }

  if (config.urls && Array.isArray(config.urls)) {
    for (const url of config.urls) {
      const urlValidation = validateUrl(url);
      if (urlValidation.status === ValidationResult.ERROR) {
        return urlValidation;
      }
    }
  }

  const result = createValidationResult(
    ValidationResult.SUCCESS,
    'Network config validation passed'
  );
  if (warnings.length > 0) {
    result.warnings = warnings;
    result.status = ValidationResult.WARNING;
  }

  return result;
};

/**
 * Validate storage quota and availability
 * @param {Object} options - Validation options
 * @returns {Promise<Object>} Validation result
 */
export const validateStorageAvailability = async (options = {}) => {
  const { requiredSpace = 0, _checkWriteAccess = true } = options;

  try {
    // Check if AsyncStorage is available
    const testKey = '__storage_test__';
    const testValue = 'test';

    try {
      await AsyncStorage.setItem(testKey, testValue);
      await AsyncStorage.removeItem(testKey);
    } catch (error) {
      return createValidationResult(
        ValidationResult.ERROR,
        'Storage is not available or full',
        { error: error.message }
      );
    }

    // Check required space if specified
    if (requiredSpace > 0) {
      // This is a simplified check - in a real implementation,
      // you'd check actual storage space
      const estimatedAvailable = 50 * 1024 * 1024; // 50MB estimate

      if (requiredSpace > estimatedAvailable) {
        return createValidationResult(
          ValidationResult.WARNING,
          'May not have enough storage space',
          { requiredSpace, estimatedAvailable }
        );
      }
    }

    return createValidationResult(
      ValidationResult.SUCCESS,
      'Storage validation passed'
    );
  } catch (error) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Storage validation failed',
      { error: error.message }
    );
  }
};

/**
 * Batch validation for multiple items
 * @param {Array} items - Items to validate
 * @param {Function} validator - Validation function
 * @returns {Object} Batch validation result
 */
export const validateBatch = (items, validator) => {
  if (!Array.isArray(items)) {
    return createValidationResult(
      ValidationResult.ERROR,
      'Items must be an array'
    );
  }

  const results = items.map((item, index) => ({
    index,
    result: validator(item),
  }));

  const errors = results.filter(
    (r) => r.result.status === ValidationResult.ERROR
  );
  const warnings = results.filter(
    (r) => r.result.status === ValidationResult.WARNING
  );
  const successes = results.filter(
    (r) => r.result.status === ValidationResult.SUCCESS
  );

  return {
    total: items.length,
    errors: errors.length,
    warnings: warnings.length,
    successes: successes.length,
    results,
    status:
      errors.length > 0
        ? ValidationResult.ERROR
        : warnings.length > 0
        ? ValidationResult.WARNING
        : ValidationResult.SUCCESS,
  };
};

/**
 * Sanitize string input for safe storage and display
 * @param {string} input - Input to sanitize
 * @param {Object} options - Sanitization options
 * @returns {string} Sanitized string
 */
export const sanitizeString = (input, options = {}) => {
  const {
    maxLength = 255,
    removeHtml = true,
    removeSpecialChars = false,
    allowedChars = null,
  } = options;

  if (!input || typeof input !== 'string') {
    return '';
  }

  let sanitized = input;

  // Remove HTML tags if requested
  if (removeHtml) {
    sanitized = sanitized.replace(/<[^>]*>/g, '');
  }

  // Remove or replace special characters
  if (removeSpecialChars) {
    sanitized = sanitized.replace(/[^\w\s\-_.]/g, '');
  }

  // Apply character filter if provided
  if (allowedChars && allowedChars instanceof RegExp) {
    sanitized = sanitized.replace(
      new RegExp(`[^${allowedChars.source}]`, 'g'),
      ''
    );
  }

  // Trim and limit length
  sanitized = sanitized.trim().substring(0, maxLength);

  return sanitized;
};

/**
 * Validate and sanitize filename
 * @param {string} filename - Filename to validate and sanitize
 * @returns {Object} Validation and sanitization result
 */
export const validateAndSanitizeFilename = (filename) => {
  const validation = validateFilePath(filename);

  if (validation.status === ValidationResult.ERROR) {
    return {
      validation,
      sanitized: 'invalid_filename',
      safe: false,
    };
  }

  // Sanitize filename
  let sanitized = filename;

  // Remove invalid characters
  sanitized = sanitized.replace(/[<>:"/\\|?*\x00-\x1f]/g, '');

  // Replace spaces with underscores for better compatibility
  sanitized = sanitized.replace(/\s+/g, '_');

  // Remove multiple underscores
  sanitized = sanitized.replace(/_+/g, '_');

  // Trim underscores from ends
  sanitized = sanitized.replace(/^_+|_+$/g, '');

  // Ensure minimum length
  if (sanitized.length === 0) {
    sanitized = 'unnamed_file';
  }

  // Limit length
  if (sanitized.length > 100) {
    sanitized = sanitized.substring(0, 100);
  }

  return {
    validation: createValidationResult(
      ValidationResult.SUCCESS,
      'Filename is valid'
    ),
    sanitized,
    safe: true,
  };
};
