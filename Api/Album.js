import axios from "axios";
import { getCachedData, CACHE_GROUPS } from './CacheManager';
import { getYTMusicAlbumData } from './YTMusic';

async function getAlbumData(id) {
  // Create a cache key for the album
  const cacheKey = `album_${id}`;

  // Check if this is a YouTube Music album ID (various YouTube album ID patterns)
  const isYouTubeAlbum = id && (
    id.startsWith('MPRE') ||    // YouTube Music album IDs (MPREb_, MPRE...)
    id.startsWith('OLAK') ||    // YouTube Music album IDs (OLAK5uy_...)
    id.startsWith('RDCLAK') ||  // YouTube Music radio/album IDs
    id.includes('youtube') ||
    id.includes('youtu.be')
  );

  // If it's a YouTube Music album, use the YTMusic API
  if (isYouTubeAlbum) {
    try {
      const ytResult = await getYTMusicAlbumData(id);
      if (ytResult && ytResult.success && ytResult.data) {
        // Transform YTMusic response to match expected format
        return {
          status: "SUCCESS",
          message: ytResult.message || "Album loaded successfully",
          data: ytResult.data,
          success: true
        };
      } else {
        // Fall through to JioSaavn API as fallback
      }
    } catch (ytError) {
      // Fall through to JioSaavn API as fallback
    }
  }

  // Define the fetch function that will be called if cache miss (JioSaavn API)
  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: "https://jiosavan-api-with-playlist.vercel.app/api/albums?id=" + id,
      headers: { },
    };

    try {
      const response = await axios.request(config);
      return response.data;
    }
    catch (error) {
      throw error;
    }
  };

  // Use cache manager with 60 minute expiration for album data
  try {
    return await getCachedData(cacheKey, fetchFunction, 60, CACHE_GROUPS.ALBUMS);
  } catch (error) {
    // If there's a storage error, try fetching directly without caching
    if (error.message && (error.message.includes('SQLITE_FULL') || error.message.includes('storage_full'))) {
      console.warn(`Storage full when fetching album ${id}, bypassing cache`);
      try {
        // Fetch directly without caching
        const data = await fetchFunction();
        return { ...data, fromCache: false, cacheBypass: true };
      } catch (fetchError) {
        console.error(`Direct fetch failed for album ${id}:`, fetchError);
        throw fetchError;
      }
    }

    console.error(`Error getting album data for ID ${id}:`, error);
    throw error;
  }
}

async function getSearchAlbumData(searchText, page, limit) {
  // Create a cache key based on the search parameters
  const cacheKey = `album_search_${searchText}_page${page}_limit${limit}`;
  
  // Define the fetch function that will be called if cache miss
  const fetchFunction = async () => {
    let config = {
      method: 'get',
      maxBodyLength: Infinity,
      url: `https://jiosavan-api-with-playlist.vercel.app/api/search/albums?query=${searchText}&page=${page}&limit=${limit}`,
      headers: { },
    };
    
    try {
      const response = await axios.request(config);
      return response.data;
    }
    catch (error) {
      throw error;
    }
  };
  
  // Use cache manager with 5 minute expiration for album search results
  try {
    return await getCachedData(cacheKey, fetchFunction, 5, CACHE_GROUPS.SEARCH);
  } catch (error) {
    // If there's a storage error, try fetching directly without caching
    if (error.message && (error.message.includes('SQLITE_FULL') || error.message.includes('storage_full'))) {
      console.warn(`Storage full when searching albums "${searchText}", bypassing cache`);
      try {
        // Fetch directly without caching
        const data = await fetchFunction();
        return { ...data, fromCache: false, cacheBypass: true };
      } catch (fetchError) {
        console.error(`Direct fetch failed for album search "${searchText}":`, fetchError);
        throw fetchError;
      }
    }
    
    console.error(`Error getting album search data for "${searchText}":`, error);
    throw error;
  }
}

export {getAlbumData, getSearchAlbumData}
