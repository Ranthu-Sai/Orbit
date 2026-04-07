import axios from 'axios';

/**
 * Performs an API request with a fallback to a secondary URL if the primary fails.
 *
 * @param {string} primaryUrl - The primary API endpoint URL.
 * @param {string} secondaryUrl - The fallback API endpoint URL.
 * @param {object} config - The Axios request configuration.
 * @returns {Promise<object>} The data from the successful API response.
 * @throws {Error} If both primary and secondary API requests fail.
 */
export async function requestWithFallback(primaryUrl, secondaryUrl, config) {
  try {
    const response = await axios.request({ ...config, url: primaryUrl });

    // The private API can return a 200 OK status with an internal error message.
    // We treat these cases as failures to trigger the fallback.
    if (response.data?.success === false || response.data?.data === 'NO_DATA') {
      throw new Error(
        `Primary API responded with success=false or NO_DATA: ${
          response.data.message || ''
        }`
      );
    }
    return response.data;
  } catch (primaryError) {
    console.warn(
      `Primary API request to ${primaryUrl} failed. Falling back to secondary.`,
      primaryError.message
    );
    try {
      const response = await axios.request({ ...config, url: secondaryUrl });
      return response.data;
    } catch (secondaryError) {
      console.error(
        `Secondary API request to ${secondaryUrl} also failed.`,
        secondaryError.message
      );
      // If secondary API fails with network error (domain not found, timeout, etc.)
      // and primary API had a different kind of error, we should still throw the primary error
      // But if primary API succeeded, we wouldn't reach this catch block
      throw primaryError;
    }
  }
}