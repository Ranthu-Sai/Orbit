/**
 * Centralized API error handling to eliminate duplication across API calls
 */

// Error types
export const ApiErrorTypes = {
  NETWORK: 'network',
  TIMEOUT: 'timeout',
  RATE_LIMIT: 'rate_limit',
  AUTHENTICATION: 'authentication',
  AUTHORIZATION: 'authorization',
  NOT_FOUND: 'not_found',
  SERVER: 'server',
  CLIENT: 'client',
  VALIDATION: 'validation',
  QUOTA_EXCEEDED: 'quota_exceeded',
  SERVICE_UNAVAILABLE: 'service_unavailable',
  UNKNOWN: 'unknown'
};

// Error severity levels
export const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical'
};

/**
 * API Error class for structured error handling
 */
export class ApiError extends Error {
  constructor(type, message, originalError = null, severity = ErrorSeverity.MEDIUM, context = {}) {
    super(message);
    this.name = 'ApiError';
    this.type = type;
    this.severity = severity;
    this.originalError = originalError;
    this.context = context;
    this.timestamp = Date.now();

    // Maintain proper stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /**
   * Get user-friendly error message
   */
  getUserMessage() {
    switch (this.type) {
      case ApiErrorTypes.NETWORK:
        return 'Network connection error. Please check your internet connection and try again.';
      case ApiErrorTypes.TIMEOUT:
        return 'Request timed out. Please try again.';
      case ApiErrorTypes.RATE_LIMIT:
        return 'Too many requests. Please wait a moment and try again.';
      case ApiErrorTypes.AUTHENTICATION:
        return 'Authentication failed. Please log in again.';
      case ApiErrorTypes.AUTHORIZATION:
        return 'You don\'t have permission to perform this action.';
      case ApiErrorTypes.NOT_FOUND:
        return 'The requested content was not found.';
      case ApiErrorTypes.SERVER:
        return 'Server error. Please try again later.';
      case ApiErrorTypes.QUOTA_EXCEEDED:
        return 'Usage limit exceeded. Please try again later.';
      case ApiErrorTypes.SERVICE_UNAVAILABLE:
        return 'Service temporarily unavailable. Please try again later.';
      case ApiErrorTypes.VALIDATION:
        return 'Invalid request data. Please check your input.';
      default:
        return 'An unexpected error occurred. Please try again.';
    }
  }

  /**
   * Check if error should be retried
   */
  shouldRetry() {
    const retryableTypes = [
      ApiErrorTypes.NETWORK,
      ApiErrorTypes.TIMEOUT,
      ApiErrorTypes.SERVER,
      ApiErrorTypes.SERVICE_UNAVAILABLE,
      ApiErrorTypes.RATE_LIMIT
    ];

    return retryableTypes.includes(this.type) && this.severity !== ErrorSeverity.CRITICAL;
  }

  /**
   * Get retry delay in milliseconds
   */
  getRetryDelay(attemptNumber = 1) {
    switch (this.type) {
      case ApiErrorTypes.RATE_LIMIT:
        return Math.min(30000, 1000 * Math.pow(2, attemptNumber)); // Exponential backoff, max 30s
      case ApiErrorTypes.SERVER:
        return 2000 * attemptNumber; // Linear backoff
      case ApiErrorTypes.NETWORK:
      case ApiErrorTypes.TIMEOUT:
        return 1000 * attemptNumber; // Linear backoff
      default:
        return 1000; // Default 1 second
    }
  }
}

/**
 * Parse error from various sources (axios, fetch, etc.)
 * @param {Error|Object} error - Error object
 * @param {Object} context - Additional context
 * @returns {ApiError} Parsed API error
 */
export const parseApiError = (error, context = {}) => {
  // Handle axios errors
  if (error.response) {
    const { status, data } = error.response;

    switch (status) {
      case 400:
        return new ApiError(
          ApiErrorTypes.VALIDATION,
          data?.message || 'Bad request',
          error,
          ErrorSeverity.MEDIUM,
          { ...context, status, responseData: data }
        );
      case 401:
        return new ApiError(
          ApiErrorTypes.AUTHENTICATION,
          'Authentication required',
          error,
          ErrorSeverity.HIGH,
          { ...context, status }
        );
      case 403:
        return new ApiError(
          ApiErrorTypes.AUTHORIZATION,
          'Access forbidden',
          error,
          ErrorSeverity.HIGH,
          { ...context, status }
        );
      case 404:
        return new ApiError(
          ApiErrorTypes.NOT_FOUND,
          'Resource not found',
          error,
          ErrorSeverity.MEDIUM,
          { ...context, status }
        );
      case 429:
        return new ApiError(
          ApiErrorTypes.RATE_LIMIT,
          'Rate limit exceeded',
          error,
          ErrorSeverity.MEDIUM,
          { ...context, status }
        );
      case 500:
      case 502:
      case 503:
      case 504:
        return new ApiError(
          status === 503 ? ApiErrorTypes.SERVICE_UNAVAILABLE : ApiErrorTypes.SERVER,
          `Server error: ${status}`,
          error,
          ErrorSeverity.HIGH,
          { ...context, status }
        );
      default:
        return new ApiError(
          ApiErrorTypes.SERVER,
          `HTTP ${status} error`,
          error,
          ErrorSeverity.MEDIUM,
          { ...context, status }
        );
    }
  }

  // Handle network errors
  if (error.code) {
    switch (error.code) {
      case 'ECONNABORTED':
      case 'ETIMEDOUT':
        return new ApiError(
          ApiErrorTypes.TIMEOUT,
          'Request timeout',
          error,
          ErrorSeverity.MEDIUM,
          context
        );
      case 'ENOTFOUND':
      case 'ECONNREFUSED':
      case 'ENETUNREACH':
        return new ApiError(
          ApiErrorTypes.NETWORK,
          'Network connection failed',
          error,
          ErrorSeverity.MEDIUM,
          { ...context, errorCode: error.code }
        );
      case 'QUOTA_EXCEEDED':
      case 'STORAGE_FULL':
        return new ApiError(
          ApiErrorTypes.QUOTA_EXCEEDED,
          'Storage quota exceeded',
          error,
          ErrorSeverity.HIGH,
          context
        );
    }
  }

  // Handle message-based errors
  if (error.message) {
    const message = error.message.toLowerCase();

    if (message.includes('network') || message.includes('connection')) {
      return new ApiError(
        ApiErrorTypes.NETWORK,
        'Network error',
        error,
        ErrorSeverity.MEDIUM,
        context
      );
    }

    if (message.includes('timeout')) {
      return new ApiError(
        ApiErrorTypes.TIMEOUT,
        'Request timeout',
        error,
        ErrorSeverity.MEDIUM,
        context
      );
    }

    if (message.includes('rate limit') || message.includes('429')) {
      return new ApiError(
        ApiErrorTypes.RATE_LIMIT,
        'Rate limit exceeded',
        error,
        ErrorSeverity.MEDIUM,
        context
      );
    }

    if (message.includes('unauthorized') || message.includes('401')) {
      return new ApiError(
        ApiErrorTypes.AUTHENTICATION,
        'Authentication failed',
        error,
        ErrorSeverity.HIGH,
        context
      );
    }

    if (message.includes('forbidden') || message.includes('403')) {
      return new ApiError(
        ApiErrorTypes.AUTHORIZATION,
        'Access forbidden',
        error,
        ErrorSeverity.HIGH,
        context
      );
    }

    if (message.includes('not found') || message.includes('404')) {
      return new ApiError(
        ApiErrorTypes.NOT_FOUND,
        'Resource not found',
        error,
        ErrorSeverity.MEDIUM,
        context
      );
    }
  }

  // Default unknown error
  return new ApiError(
    ApiErrorTypes.UNKNOWN,
    error.message || 'Unknown error occurred',
    error,
    ErrorSeverity.MEDIUM,
    context
  );
};

/**
 * Retry configuration
 */
export const RetryConfig = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 30000,
  backoffFactor: 2,
  retryableErrors: [
    ApiErrorTypes.NETWORK,
    ApiErrorTypes.TIMEOUT,
    ApiErrorTypes.SERVER,
    ApiErrorTypes.SERVICE_UNAVAILABLE,
    ApiErrorTypes.RATE_LIMIT
  ]
};

/**
 * Retry API call with exponential backoff
 * @param {Function} apiCall - API call function
 * @param {Object} options - Retry options
 * @returns {Promise<any>} API response
 */
export const retryApiCall = async (apiCall, options = {}) => {
  const {
    maxAttempts = RetryConfig.maxAttempts,
    baseDelay = RetryConfig.baseDelay,
    maxDelay = RetryConfig.maxDelay,
    backoffFactor = RetryConfig.backoffFactor,
    retryableErrors = RetryConfig.retryableErrors,
    onRetry = null
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const result = await apiCall();

      // Success - return result
      return result;

    } catch (error) {
      lastError = parseApiError(error, { attempt, maxAttempts });

      // Check if error is retryable
      if (attempt < maxAttempts && retryableErrors.includes(lastError.type)) {
        const delay = Math.min(
          baseDelay * Math.pow(backoffFactor, attempt - 1),
          maxDelay
        );

        if (onRetry) {
          onRetry(lastError, attempt, delay);
        }

        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      // Non-retryable error or max attempts reached
      throw lastError;
    }
  }

  // This should never be reached, but just in case
  throw lastError;
};

/**
 * Handle API errors with user feedback
 * @param {Error} error - Error to handle
 * @param {Object} options - Handling options
 * @returns {ApiError} Processed error
 */
export const handleApiError = (error, options = {}) => {
  const {
    showToast = true,
    logError = true,
    context = {},
    fallbackMessage = null
  } = options;

  const apiError = parseApiError(error, context);

  if (logError) {
    console.error('API Error:', {
      type: apiError.type,
      message: apiError.message,
      severity: apiError.severity,
      context: apiError.context,
      originalError: apiError.originalError
    });
  }

  if (showToast) {
    const message = fallbackMessage || apiError.getUserMessage();
    ToastAndroid.show(message, ToastAndroid.LONG);
  }

  return apiError;
};

/**
 * Create API call wrapper with error handling
 * @param {Function} apiCall - API call function
 * @param {Object} options - Wrapper options
 * @returns {Function} Wrapped API call
 */
export const createApiCallWrapper = (options = {}) => {
  const {
    enableRetry = true,
    enableErrorHandling = true,
    retryOptions = {},
    errorOptions = {}
  } = options;

  return async (apiCall, callOptions = {}) => {
    try {
      let result;

      if (enableRetry) {
        result = await retryApiCall(apiCall, { ...retryOptions, ...callOptions });
      } else {
        result = await apiCall();
      }

      return result;

    } catch (error) {
      if (enableErrorHandling) {
        return handleApiError(error, { ...errorOptions, ...callOptions });
      }

      throw error;
    }
  };
};

/**
 * Batch API calls with error handling
 * @param {Array<Function>} apiCalls - Array of API call functions
 * @param {Object} options - Batch options
 * @returns {Promise<Array>} Array of results/errors
 */
export const batchApiCalls = async (apiCalls, options = {}) => {
  const {
    concurrent = true,
    stopOnError = false,
    enableRetry = true,
    retryOptions = {}
  } = options;

  if (concurrent) {
    // Execute all calls concurrently
    const promises = apiCalls.map(async (apiCall, index) => {
      try {
        if (enableRetry) {
          return await retryApiCall(apiCall, retryOptions);
        } else {
          return await apiCall();
        }
      } catch (error) {
        if (stopOnError) {
          throw error;
        }
        return parseApiError(error, { index });
      }
    });

    return Promise.all(promises);
  } else {
    // Execute calls sequentially
    const results = [];

    for (let i = 0; i < apiCalls.length; i++) {
      try {
        const result = enableRetry
          ? await retryApiCall(apiCalls[i], retryOptions)
          : await apiCalls[i]();

        results.push(result);
      } catch (error) {
        if (stopOnError) {
          throw error;
        }
        results.push(parseApiError(error, { index: i }));
      }
    }

    return results;
  }
};

/**
 * API response validator
 * @param {Object} response - API response
 * @param {Object} schema - Expected response schema
 * @returns {Object} Validation result
 */
export const validateApiResponse = (response, schema = {}) => {
  if (!response) {
    return createValidationResult(ValidationResult.ERROR, 'Response is null or undefined');
  }

  if (typeof response !== 'object') {
    return createValidationResult(ValidationResult.ERROR, 'Response must be an object');
  }

  // Check required fields in schema
  if (schema.required && Array.isArray(schema.required)) {
    const missingFields = [];

    for (const field of schema.required) {
      if (!(field in response)) {
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
  }

  // Validate field types if specified
  if (schema.properties) {
    const typeErrors = [];

    for (const [field, expectedType] of Object.entries(schema.properties)) {
      if (field in response) {
        const actualValue = response[field];
        const actualType = Array.isArray(actualValue) ? 'array' : typeof actualValue;

        if (actualType !== expectedType) {
          typeErrors.push(`${field}: expected ${expectedType}, got ${actualType}`);
        }
      }
    }

    if (typeErrors.length > 0) {
      return createValidationResult(
        ValidationResult.WARNING,
        `Type mismatches: ${typeErrors.join(', ')}`,
        { typeErrors }
      );
    }
  }

  return createValidationResult(ValidationResult.SUCCESS, 'Response validation passed');
};

/**
 * Create standardized API response
 * @param {boolean} success - Success status
 * @param {any} data - Response data
 * @param {string} message - Response message
 * @param {Object} metadata - Additional metadata
 * @returns {Object} Standardized response
 */
export const createApiResponse = (success, data = null, message = '', metadata = {}) => ({
  success,
  data,
  message,
  metadata,
  timestamp: Date.now()
});

/**
 * Handle API response with validation
 * @param {Object} response - Raw API response
 * @param {Object} schema - Expected response schema
 * @returns {Object} Processed response
 */
export const processApiResponse = (response, schema = {}) => {
  const validation = validateApiResponse(response, schema);

  if (validation.status === ValidationResult.ERROR) {
    throw new ApiError(
      ApiErrorTypes.VALIDATION,
      validation.message,
      null,
      ErrorSeverity.MEDIUM,
      { validation }
    );
  }

  return createApiResponse(
    true,
    response,
    validation.status === ValidationResult.SUCCESS ? 'Success' : validation.message,
    { validation }
  );
};