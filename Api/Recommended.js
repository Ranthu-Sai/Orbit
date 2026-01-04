import axios from "axios";
import { getCachedData, CACHE_GROUPS, isNetworkAvailable } from './CacheManager';

async function getRecommendedSongs(id) {
  try {
    // Skip if no ID provided
    if (!id || typeof id !== 'string') {
      return { data: [], success: true, message: "No valid ID provided" };
    }

    // Skip recommendation requests for Spotify songs (22-character alphanumeric IDs)
    // Spotify IDs are exactly 22 chars, containing only letters and numbers (Base62)
    const isSpotifyId = id.length === 22 && /^[a-zA-Z0-9]+$/.test(id);
    if (isSpotifyId) {
      return { data: [], success: true, message: "Spotify uses its own recommendation system" };
    }

    // Skip recommendation requests for YouTube Music songs (11-character IDs)
    // YouTube video IDs are 11 chars, can contain letters, numbers, hyphens, and underscores
    const isYouTubeId = id.length === 11 && /^[a-zA-Z0-9_-]+$/.test(id);
    if (isYouTubeId) {
      return { data: [], success: true, message: "YouTube Music uses its own recommendation system" };
    }

    // Skip recommendation requests for DAB songs (purely numeric, typically 9-12 digits)
    // DAB uses Last.fm recommendations via DABRecommendationService, not Saavn
    const isDabId = /^\d{6,15}$/.test(id);
    if (isDabId) {
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
      return { data: [], success: true, message: "No recommendations for local files" };
    }

    // First check if we're offline
    const isOnline = await isNetworkAvailable();
    if (!isOnline) {
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
