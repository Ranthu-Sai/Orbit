import axios from "axios";
import { getCachedData, CACHE_GROUPS, isNetworkAvailable } from './CacheManager';

async function getRecommendedSongs(id) {
  try {
    // Skip recommendation requests for YouTube Music songs (11-character IDs)
    if (id && typeof id === 'string' && id.length === 11 && !/[\/.]/.test(id)) {
      console.log(`Skipping recommendations for YouTube song: ${id}`);
      return { data: [], success: true, message: "Recommendations not available for YouTube songs" };
    }

    // Skip recommendation requests for local files
    if (id && (
      typeof id === 'string' && (
        id.startsWith('/') ||
        id.startsWith('file://') ||
        id.includes('/storage/') ||
        id.includes('.mp3') ||
        id.includes('.m4a') ||
        id.includes('.wav') ||
        id.includes('.flac') ||
        id.includes('.ogg')
      )
    )) {
      console.log(`Skipping recommendations for local file: ${id}`);
      return { data: [], success: true, message: "No recommendations for local files" };
    }

    // First check if we're offline
    const isOnline = await isNetworkAvailable();
    if (!isOnline) {
      console.log(`Device offline, skipping recommendations for song ID ${id}`);
      return { data: [], success: true, message: "Offline mode - recommendations not available" };
    }

    // Create a cache key for recommendations
    const cacheKey = `recommendations_${id}`;

    // Define the fetch function that will be called if cache miss
    const fetchFunction = async () => {
      let config = {
        method: 'get',
        maxBodyLength: Infinity,
        url: `https://jiosavan-api-with-playlist.vercel.app/api/songs/${id}/suggestions`,
        headers: {},
      };

      try {
        const response = await axios.request(config);
        return response.data;
      }
      catch (error) {
        throw error;
      }
    };

    // Use cache manager with 30 minute expiration for recommendations
    try {
      return await getCachedData(cacheKey, fetchFunction, 30, CACHE_GROUPS.RECOMMENDATIONS);
    } catch (error) {
      // Handle offline case specially
      if (error.message && error.message.includes('No network connection')) {
        console.log(`Offline error when getting recommendations for song ID ${id} - returning empty results`);
        return { data: [], success: true, message: "Offline mode - recommendations not available" };
      }

      console.error(`Error getting recommendations for song ID ${id}:`, error);
      // Return empty result instead of throwing
      return { data: [], success: false, message: "Failed to load recommendations" };
    }
  } catch (error) {
    console.error(`Unexpected error in getRecommendedSongs for ID ${id}:`, error);
    // Return empty result instead of throwing
    return { data: [], success: false, message: "Failed to load recommendations" };
  }
}

export { getRecommendedSongs }
