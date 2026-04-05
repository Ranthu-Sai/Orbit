import axios from 'axios';
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { getYTMusicAlbumData } from './YTMusic';
import { requestWithFallback } from './apiUtils';
import { getChartData } from './Chart';

async function getAlbumData(id) {
  // Create a cache key for the album
  const cacheKey = `album_v3_${id}`;

  // Check if this is a YouTube Music album ID
  const isYouTubeAlbum =
    id &&
    (id.startsWith('MPRE') ||
      id.startsWith('OLAK') ||
      id.startsWith('RDCLAK') ||
      id.includes('youtube') ||
      id.includes('youtu.be'));

  if (isYouTubeAlbum) {
    try {
      const ytResult = await getYTMusicAlbumData(id);
      if (ytResult && ytResult.success && ytResult.data) {
        return {
          status: 'SUCCESS',
          message: ytResult.message || 'Album loaded successfully',
          data: ytResult.data,
          success: true,
        };
      }
    } catch (ytError) {
      // Fall through to JioSaavn API
    }
  }

  const isChart = id && id.startsWith('chart:');
  if (isChart) {
    const chartId = id.split(':')[1];
    try {
      const chartResult = await getChartData(chartId);
      if (chartResult && chartResult.success && chartResult.data) {
        return {
          status: 'SUCCESS',
          message: chartResult.message || 'Chart loaded successfully',
          data: chartResult.data,
          success: true,
        };
      }
    } catch (chartError) {
      console.error(`Error fetching chart data for ID ${chartId}:`, chartError);
      // Fall through to JioSaavn API if needed, or handle error
    }
  }

  // Define the fetch function for JioSaavn API with fallback
  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/albums?id=${id}`;
    const secondaryUrl = `https://saavn.dev/api/albums?id=${id}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  // Use cache manager
  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      60,
      CACHE_GROUPS.ALBUMS
    );
  } catch (error) {
    console.error(`Error getting album data for ID ${id}:`, error);
    throw error;
  }
}

async function getSearchAlbumData(searchText, page, limit) {
  // Create a cache key based on the search parameters
  const cacheKey = `album_search_v3_${searchText}_page${page}_limit${limit}`;

  // Define the fetch function with fallback
  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/albums?query=${searchText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://saavn.dev/api/search/albums?query=${searchText}&page=${page}&limit=${limit}`;
    const config = {
      method: 'get',
      maxBodyLength: Infinity,
      headers: {},
    };
    return requestWithFallback(primaryUrl, secondaryUrl, config);
  };

  // Use cache manager
  try {
    return await getCachedData(
      cacheKey,
      fetchFunction,
      1440, // 24-hour cache for search results
      CACHE_GROUPS.SEARCH
    );
  } catch (error) {
    console.error(
      `Error getting album search data for query "${searchText}":`,
      error
    );
    throw error;
  }
}

export { getAlbumData, getSearchAlbumData };
