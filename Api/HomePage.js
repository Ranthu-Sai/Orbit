import axios from 'axios';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { requestWithFallback } from './apiUtils';

async function getHomePageData(languages, forceRefresh = false) {
  // Create a cache key based on the languages
  const cacheKey = `home_v4_${languages}`;

  // Define the fetch function that will be called if cache miss
  const fetchFunction = async () => {
    const primaryUrl = `https://saavn.sumit.co/api/modules?language=${languages}${
      forceRefresh ? `&_t=${Date.now()}` : ''
    }`;
    const secondaryUrl = `https://saavn.sumit.co/api/modules?language=${languages}`;

    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };

    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  // Use cache manager with 60 minute expiration for homepage data
  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.HOME,
      forceRefresh
    );
  } catch (error) {
    console.error(
      `Error getting homepage data for languages ${languages}:`,
      error
    );
    throw error;
  }
}

export { getHomePageData };
