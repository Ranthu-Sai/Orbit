import axios from 'axios';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { requestWithFallback } from './apiUtils';

async function getChartData(id) {
  // Create a cache key for the chart
  const cacheKey = `chart_v2_${id}`;

  // Define the fetch function with fallback
  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/charts?id=${id}`;
    const secondaryUrl = `https://saavn.dev/api/charts?id=${id}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
      timeout: 10000,
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  // Use cache manager
  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      30,
      CACHE_GROUPS.CHARTS
    );
  } catch (error) {
    console.error(`Error getting chart data for ID ${id}:`, error);
    throw error;
  }
}

export { getChartData };
