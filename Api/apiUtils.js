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
const API_HOSTS = [
  'https://jiosaavn-c451wwyru-sumit-kolhes-projects-94a4846a.vercel.app',
  'https://jio-saavan-api.vercel.app',
  'https://nepotuneapi.vercel.app',
  'https://jiosaavn-api-privatecvc2.vercel.app',
  'https://saavn.sumit.co/api',
];

function getUrlsToTry(primaryUrl, secondaryUrl) {
  const urls = [];
  const addUrlAndFallbacks = (url) => {
    if (!url) return;
    
    // Extract path generically
    let path = '';
    const cleanUrl = url.replace('https://', '').replace('http://', '');
    const slashIndex = cleanUrl.indexOf('/');
    if (slashIndex !== -1) {
      path = cleanUrl.substring(slashIndex);
    } else {
      urls.push(url);
      return;
    }

    // Normalize path by stripping /api prefix if it exists
    if (path.startsWith('/api/')) {
      path = path.substring(4);
    }
    
    API_HOSTS.forEach((host) => {
      const targetUrl = `${host}${path}`;
      if (!urls.includes(targetUrl)) {
        urls.push(targetUrl);
      }
    });
  };

  addUrlAndFallbacks(primaryUrl);
  addUrlAndFallbacks(secondaryUrl);
  return urls;
}

export async function requestWithFallback(primaryUrl, secondaryUrl, config) {
  const urlsToTry = getUrlsToTry(primaryUrl, secondaryUrl);
  let lastError = null;

  for (let i = 0; i < urlsToTry.length; i++) {
    const url = urlsToTry[i];
    try {
      const response = await axios.request({ ...config, url });

      if (response.data?.success === false || response.data?.data === 'NO_DATA') {
        throw new Error(
          `API responded with success=false or NO_DATA: ${
            response.data.message || ''
          }`
        );
      }
      return response.data;
    } catch (error) {
      console.warn(
        `API request to ${url} failed. Trying next fallback if available. Error:`,
        error.message
      );
      lastError = error;
    }
  }

  console.error('All API fallbacks failed.');
  throw lastError || new Error('All API requests failed');
}