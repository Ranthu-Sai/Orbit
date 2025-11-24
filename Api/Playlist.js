import axios from "axios";
import { getCachedData, CACHE_GROUPS, isOfflineMode } from './CacheManager';
import { getYTMusicPlaylistData } from './YTMusic';

async function getPlaylistData(id) {
  // Create a cache key for the playlist
  const cacheKey = `playlist_${id}`;

  // Check if this is a YouTube Music playlist ID (various YouTube playlist ID patterns)
  const isYouTubePlaylist = id && (
    id.startsWith('PL') || // Standard playlist
    id.startsWith('RD') || // Mix/Recommended playlist
    id.startsWith('VL') || // Video list
    id.includes('youtube') ||
    id.includes('youtu.be') ||
    id.length > 20 // YouTube IDs are typically long
  );

  // If it's a YouTube Music playlist, use the YTMusic API
  if (isYouTubePlaylist) {
    console.log(`Detected YouTube Music playlist ID: ${id}, using YTMusic API`);
    try {
      const ytResult = await getYTMusicPlaylistData(id);
      if (ytResult && ytResult.success && ytResult.data) {
        // Transform YTMusic response to match expected format
        return {
          status: "SUCCESS",
          message: ytResult.message || "Playlist loaded successfully",
          data: ytResult.data,
          success: true
        };
      } else {
        console.log(`YTMusic API failed for playlist ${id}, falling back to JioSaavn`);
        // Fall through to JioSaavn API as fallback
      }
    } catch (ytError) {
      console.log(`YTMusic API error for playlist ${id}:`, ytError.message);
      // Fall through to JioSaavn API as fallback
    }
  }

  // Check if we're offline before doing anything
  if (isOfflineMode()) {
    console.log(`Device is offline - looking for cached playlist ${id}`);

    try {
      // Try to get the cached data directly (getCachedData handles this but just to be safe)
      const result = await getCachedData(cacheKey, null, 30, CACHE_GROUPS.PLAYLISTS);
      if (result && !result.error) {
        return result;
      }

      // Return a standardized offline response without error
      return {
        success: false,
        offlineMode: true,
        message: 'Playlist not available offline'
      };
    } catch (cacheError) {
      console.log(`No cached data found for playlist ${id} in offline mode`);
      return {
        success: false,
        offlineMode: true,
        message: 'Playlist not available offline'
      };
    }
  }

  // Define the fetch function that will be called if cache miss (JioSaavn API)
  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/playlists?id=${id}&limit=100000`,
      headers: { },
      timeout: 10000 // Add timeout to prevent hanging requests
    };

    try {
      const response = await axios.request(config);
      return response.data;
    }
    catch (error) {
      // Don't throw error, return error object
      console.log(`Error fetching playlist ${id}:`, error.message || 'Unknown error');
      return {
        success: false,
        error: error.message || 'Network error',
        message: 'Failed to load playlist'
      };
    }
  };

  // Use cache manager with 30 minute expiration for playlist data
  try {
    console.log(`Fetching playlist data for ID: ${id} using JioSaavn API`);
    return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.PLAYLISTS);
  } catch (error) {
    // Don't throw error, return error object
    console.log(`Error getting playlist data for ID ${id}:`, error.message || 'Unknown error');
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Failed to load playlist'
    };
  }
}

async function getSearchPlaylistData(searchText, page, limit) {
  // Create a cache key based on the search parameters
  const cacheKey = `playlist_search_${searchText}_page${page}_limit${limit}`;
  
  // Check if we're offline before doing anything
  if (isOfflineMode()) {
    console.log(`Device is offline - looking for cached playlist search ${searchText}`);
    
    try {
      // Try to get the cached data directly
      const result = await getCachedData(cacheKey, null, 5, CACHE_GROUPS.SEARCH);
      if (result && !result.error) {
        return result;
      }
      
      // Return a standardized offline response without error
      return {
        success: false,
        offlineMode: true,
        message: 'Search not available offline'
      };
    } catch (cacheError) {
      console.log(`No cached data found for playlist search ${searchText} in offline mode`);
      return {
        success: false,
        offlineMode: true,
        message: 'Search not available offline'
      };
    }
  }
  
  // Define the fetch function that will be called if cache miss
  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jio-savan-api-sigma.vercel.app/search/playlists?query=${searchText}&page=${page}&limit=${limit}`,
      headers: { },
      timeout: 8000 // Add timeout to prevent hanging requests
    };
    
    try {
      const response = await axios.request(config);
      return response.data;
    }
    catch (error) {
      // Don't throw error, return error object
      console.log(`Error searching playlists for "${searchText}":`, error.message || 'Unknown error');
      return {
        success: false,
        error: error.message || 'Network error',
        message: 'Failed to search playlists'
      };
    }
  };
  
  // Use cache manager with 5 minute expiration for playlist search results
  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    // Don't throw error, return error object
    console.log(`Error getting playlist search data for "${searchText}":`, error.message || 'Unknown error');
    return {
      success: false,
      error: error.message || 'Unknown error',
      message: 'Failed to search playlists'
    };
  }
}

export {getPlaylistData, getSearchPlaylistData}
