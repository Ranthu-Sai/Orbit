import axios from 'axios';
import { getCachedData, CACHE_GROUPS, isOfflineMode } from './CacheManager';
import { getYTMusicPlaylistData } from './YTMusic';
import { requestWithFallback } from './apiUtils';

async function getPlaylistData(id) {
  // Create a cache key for the playlist
  const cacheKey = `playlist_v4_${id}`;

  // Check if this is a YouTube Music playlist ID
  const isYouTubePlaylist =
    id &&
    (id.startsWith('PL') ||
      id.startsWith('RD') ||
      id.startsWith('VL') ||
      id.includes('youtube') ||
      id.includes('youtu.be') ||
      id.length > 20);

  if (isYouTubePlaylist) {
    try {
      const ytResult = await getYTMusicPlaylistData(id);
      if (ytResult && ytResult.success && ytResult.data) {
        return {
          status: 'SUCCESS',
          message: ytResult.message || 'Playlist loaded successfully',
          data: ytResult.data,
          success: true,
        };
      }
    } catch (ytError) {
      // Fall through to JioSaavn API
    }
  }

  // Define the fetch function for JioSaavn API with fallback
  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/playlists?id=${id}`;
    const secondaryUrl = `https://saavn.sumit.co/api/playlists?id=${id}`;
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
      CACHE_GROUPS.PLAYLISTS
    );
  } catch (error) {
    console.error(`Error getting playlist data for ID ${id}:`, error);
    throw error;
  }
}

async function getSearchPlaylistData(searchText, page, limit) {
  const encodedText = encodeURIComponent(searchText || '');
  // Create a cache key based on the search parameters
  const cacheKey = `playlist_search_v3_${searchText}_page${page}_limit${limit}`;

  // Define the fetch function with fallback
  const fetchFunction = async () => {
    const primaryUrl = `https://jiosaavn-api-privatecvc2.vercel.app/search/playlists?query=${encodedText}&page=${page}&limit=${limit}`;
    const secondaryUrl = `https://saavn.sumit.co/api/search/playlists?query=${encodedText}&page=${page}&limit=${limit}`;
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
      `Error getting playlist search data for query "${searchText}":`,
      error
    );
    throw error;
  }
}

export { getPlaylistData, getSearchPlaylistData };
