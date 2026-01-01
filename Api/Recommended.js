import axios from "axios";
import { getCachedData, CACHE_GROUPS, isNetworkAvailable } from './CacheManager';

async function getRecommendedSongs(id) {
  try {
    // Skip recommendation requests for YouTube Music songs (11-character IDs)
    // ONLY if it's not explicitly a Saavn song OR doesn't have Saavn download URLs
    const isYouTubeId = id && typeof id === 'string' && id.length === 11 && !/[\\/.]/.test(id);
    if (isYouTubeId) {
      // If we have access to the song object, we could be more precise.
      // For now, let's assume if it's 11 chars AND doesn't look like a Saavn ID (optional)
      // But Saavn IDs can be anything. Better to check if we're in a Saavn context.
      console.log(`Checking if 11-char ID ${id} is YouTube or Saavn...`);
    }

    if (isYouTubeId && !id.startsWith('_')) { // Many Saavn IDs start with underscores
      console.log(`Skipping recommendations for likely YouTube song: ${id}`);
      return { data: [], success: true, message: "Recommendations not available for YouTube songs" };
    }

    // Skip recommendation requests for DAB songs (purely numeric, typically 9-12 digits)
    // DAB uses Last.fm recommendations via DABRecommendationService, not Saavn
    const isDabId = id && typeof id === 'string' && /^\d{6,15}$/.test(id);
    if (isDabId) {
      console.log(`Skipping Saavn recommendations for DAB song: ${id}`);
      return { data: [], success: true, message: "DAB uses Last.fm recommendations" };
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
