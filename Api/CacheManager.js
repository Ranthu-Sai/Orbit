import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import { apiCache, playlistCache, albumCache, chartCache } from '../Utils/LRUCache';

/**
 * CacheManager - A utility for managing API response caching
 *
 * Features:
 * - Cache API responses with configurable expiration
 * - Check for cached data before making API calls
 * - Automatic cache invalidation based on time
 * - Network status detection for offline fallback
 * - Enhanced performance by reducing redundant API calls
 */

// Default cache expiration time (in minutes)
const DEFAULT_CACHE_EXPIRATION = 30;

// Cache groups for batch invalidation
const CACHE_GROUPS = {
  HOME: 'home',
  SEARCH: 'search',
  SONGS: 'songs',
  PLAYLISTS: 'playlists',
  ALBUMS: 'albums',
  CHARTS: 'charts',
  LYRICS: 'lyrics',
  RECOMMENDATIONS: 'recommendations',
  PODCASTS: 'podcasts',
};

// Memory cache for search results and playlists/albums
const searchMemoryCache = new Map();
const playlistMemoryCache = new Map();
const albumMemoryCache = new Map();

// Maximum number of items to keep in each memory cache
const MAX_MEMORY_ITEMS = {
  SEARCH: 5,
  PLAYLISTS: 10,
  ALBUMS: 10,
};

// Add a global offline mode flag that can be checked anywhere
let _isOfflineMode = false;
let _lastNetworkCheck = 0;
const NETWORK_CHECK_INTERVAL = 10000; // 10 seconds

/**
 * Check if the network is available
 * @returns {Promise<boolean>} Whether network is available
 */
const isNetworkAvailable = async () => {
  try {
    // Use cached result if checked recently to avoid too many NetInfo calls
    const now = Date.now();
    if (now - _lastNetworkCheck < NETWORK_CHECK_INTERVAL) {
      return !_isOfflineMode;
    }

    _lastNetworkCheck = now;
    const state = await NetInfo.fetch();
    const isConnected = state.isConnected && state.isInternetReachable;

    // Update the global offline mode flag
    _isOfflineMode = !isConnected;

    return isConnected;
  } catch (error) {
    console.warn('Error checking network status:', error);
    // Assume offline if there's an error
    _isOfflineMode = true;
    return false;
  }
};

// Add a function to explicitly set offline mode
const setOfflineMode = (isOffline) => {
  _isOfflineMode = isOffline;
};

// Add a function to check if we're in offline mode without a network check
const isOfflineMode = () => {
  return _isOfflineMode;
};

/**
 * Clean a memory cache to keep it under the size limit
 * @param {Map} cache The memory cache to clean
 * @param {number} maxItems Maximum number of items to keep
 */
const cleanMemoryCache = (cache, maxItems) => {
  if (cache.size <= maxItems) {
    return;
  }

  // Find the oldest entries and delete them
  const entries = [...cache.entries()];
  entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

  const toRemove = entries.slice(0, entries.length - maxItems);
  for (const [key] of toRemove) {
    cache.delete(key);
  }
};

/**
 * Helper to get the appropriate LRU manager and sanitized key
 * Ensures compatibility with existing key patterns
 */
const getCacheContext = (key) => {
  if (key.startsWith('playlist_')) {
    return { manager: playlistCache, rawKey: key.replace(/^playlist_/, '') };
  }
  if (key.startsWith('album_') && !key.includes('album_search_')) {
    return { manager: albumCache, rawKey: key.replace(/^album_/, '') };
  }
  if (key.startsWith('chart_')) {
    return { manager: chartCache, rawKey: key.replace(/^chart_/, '') };
  }
  return { manager: apiCache, rawKey: key };
};

/**
 * Get data from cache
 * @param {string} key Cache key
 * @returns {Promise<Object|null>} Cached data or null if not found/expired
 */
const getFromCache = async (key) => {
  try {
    // Check memory caches first

    // Check search memory cache
    if (key.includes('search_')) {
      const memItem = searchMemoryCache.get(key);
      if (memItem) {
        const { data, timestamp, expiration } = memItem;
        const currentTime = new Date().getTime();

        // Check if memory cache has expired
        if (currentTime - timestamp > expiration * 60 * 1000) {
          searchMemoryCache.delete(key);
          return null;
        }

        return data;
      }
      return null;
    }

    // Check playlist memory cache
    if (key.includes('playlist_')) {
      const memItem = playlistMemoryCache.get(key);
      if (memItem) {
        const { data, timestamp, expiration } = memItem;
        const currentTime = new Date().getTime();

        // Check if memory cache has expired
        if (currentTime - timestamp > expiration * 60 * 1000) {
          playlistMemoryCache.delete(key);
          return null;
        }

        return data;
      }
    }

    // Check album memory cache
    if (key.includes('album_') && !key.includes('album_search_')) {
      const memItem = albumMemoryCache.get(key);
      if (memItem) {
        const { data, timestamp, expiration } = memItem;
        const currentTime = new Date().getTime();

        // Check if memory cache has expired
        if (currentTime - timestamp > expiration * 60 * 1000) {
          albumMemoryCache.delete(key);
          return null;
        }

        return data;
      }
    }

    // If not in memory, try LRU Manager as fallback
    try {
      const { manager, rawKey } = getCacheContext(key);
      const data = await manager.get(rawKey);

      if (!data) {
        return null;
      }

      // Store in memory for faster access next time
      if (key.includes('playlist_')) {
        playlistMemoryCache.set(key, {
          data,
          timestamp: Date.now(),
          expiration: DEFAULT_CACHE_EXPIRATION,
        });
        cleanMemoryCache(playlistMemoryCache, MAX_MEMORY_ITEMS.PLAYLISTS);
      } else if (key.includes('album_') && !key.includes('album_search_')) {
        albumMemoryCache.set(key, {
          data,
          timestamp: Date.now(),
          expiration: DEFAULT_CACHE_EXPIRATION,
        });
        cleanMemoryCache(albumMemoryCache, MAX_MEMORY_ITEMS.ALBUMS);
      }

      return data;
    } catch (storageError) {
      console.warn('Cache access failed:', storageError);
      return null;
    }
  } catch (error) {
    console.error(`Error retrieving from cache for key ${key}:`, error);
    return null;
  }
};

/**
 * Save data to cache
 * @param {string} key Cache key
 * @param {Object} data Data to cache
 * @param {number} expiration Expiration time in minutes
 * @param {string|null} group Cache group for batch invalidation
 * @returns {Promise<void>}
 */
const saveToCache = async (
  key,
  data,
  expiration = DEFAULT_CACHE_EXPIRATION,
  group = null
) => {
  try {
    const cacheItem = {
      data,
      timestamp: new Date().getTime(),
      expiration,
      group,
    };

    // Store search results in memory only
    if (key.includes('search_') || group === CACHE_GROUPS.SEARCH) {
      // Clean up memory cache to stay under limit
      cleanMemoryCache(searchMemoryCache, MAX_MEMORY_ITEMS.SEARCH);
      searchMemoryCache.set(key, cacheItem);
      return;
    }

    // Store playlists in memory first
    if (key.includes('playlist_') || group === CACHE_GROUPS.PLAYLISTS) {
      cleanMemoryCache(playlistMemoryCache, MAX_MEMORY_ITEMS.PLAYLISTS);
      playlistMemoryCache.set(key, cacheItem);
    }

    // Store albums in memory first
    if (
      (key.includes('album_') && !key.includes('album_search_')) ||
      (group === CACHE_GROUPS.ALBUMS && !key.includes('search_'))
    ) {
      cleanMemoryCache(albumMemoryCache, MAX_MEMORY_ITEMS.ALBUMS);
      albumMemoryCache.set(key, cacheItem);
    }

    // For playlists and albums, we'll try to store in Disk via LRU Manager
    const { manager, rawKey } = getCacheContext(key);
    const success = await manager.set(rawKey, data, expiration);

    if (success && group && group !== CACHE_GROUPS.SEARCH) {
      try {
        const groupKey = `cache_group_${group}`;
        const groupItems = (await AsyncStorage.getItem(groupKey)) || '[]';
        const items = JSON.parse(groupItems);

        if (!items.includes(key)) {
          items.push(key);
          if (items.length > 20) {
            items.splice(0, items.length - 20);
          }
          await AsyncStorage.setItem(groupKey, JSON.stringify(items));
        }
      } catch (groupError) {
        console.warn('Failed to update cache group index:', groupError.message);
      }
    }
  } catch (error) {
    console.error(`Error saving to cache for key ${key}:`, error);
  }
};

/**
 * Clear all cache or specific group
 * @param {string|null} group Optional group to clear
 * @returns {Promise<void>}
 */
const clearCache = async (group = null) => {
  try {
    // Always clear memory caches appropriately
    if (!group || group === CACHE_GROUPS.SEARCH) {
      searchMemoryCache.clear();
    }

    if (!group || group === CACHE_GROUPS.PLAYLISTS) {
      playlistMemoryCache.clear();
    }

    if (!group || group === CACHE_GROUPS.ALBUMS) {
      albumMemoryCache.clear();
    }

    // Try to clear AsyncStorage as well
    try {
      if (group) {
        // Clear specific group
        const groupKey = `cache_group_${group}`;
        const groupItems = (await AsyncStorage.getItem(groupKey)) || '[]';
        const items = JSON.parse(groupItems);

        // Remove all items in the group
        for (const key of items) {
          await AsyncStorage.removeItem(key);
        }

        // Clear the group index
        await AsyncStorage.removeItem(groupKey);
      } else {
        // Get all keys
        const keys = await AsyncStorage.getAllKeys();

        // Filter only cache keys (ignore other app settings)
        const cacheKeys = keys.filter(
          (key) =>
            key.startsWith('api_cache_') || key.startsWith('cache_group_')
        );

        // Clear all cache keys
        if (cacheKeys.length > 0) {
          await AsyncStorage.multiRemove(cacheKeys);
        }
      }
    } catch (storageError) {
      console.warn('AsyncStorage clear failed:', storageError);
    }
  } catch (error) {
    console.error(
      `Error clearing cache${group ? ` for group ${group}` : ''}:`,
      error
    );
  }
};

/**
 * Get cached data or fetch from API with better offline handling
 * @param {string} key Cache key
 * @param {Function} fetchFunction Function to fetch data if not cached
 * @param {number} expiration Expiration time in minutes
 * @param {string|null} group Cache group for batch invalidation
 * @param {boolean} forceRefresh Force refresh from API
 * @returns {Promise<Object>} Data from cache or API
 */
const getCachedData = async (
  key,
  fetchFunction,
  expiration = DEFAULT_CACHE_EXPIRATION,
  group = null,
  forceRefresh = false
) => {
  try {
    // First check if we're in offline mode
    const networkAvailable = await isNetworkAvailable();

    // In offline mode, don't even attempt network requests
    if (!networkAvailable) {
      // Try to get from cache first
      const cachedData = await getFromCache(key);

      if (cachedData) {
        // Add a flag to indicate this came from cache during offline mode
        return { ...cachedData, fromCache: true, offlineMode: true };
      }

      // If there's no cached data and we're offline, return a standard offline response
      return {
        success: false,
        error: 'Offline mode - data not available',
        offlineMode: true,
      };
    }

    // For online mode, proceed as before - check cache first unless force refresh
    if (!forceRefresh) {
      const cachedData = await getFromCache(key);

      if (cachedData) {
        // Add a flag to indicate this came from cache
        return { ...cachedData, fromCache: true };
      }
    }

    // Nothing in cache or force refresh, so fetch from API
    try {
      const data = await fetchFunction();

      // CRITICAL: Only cache successful responses - NEVER cache errors
      // Check for explicit success=true, or absence of error/success=false
      const isValidResponse =
        data &&
        !data.error &&
        data.success !== false &&
        !(data.status === 'FAILED');

      if (isValidResponse) {
        await saveToCache(key, data, expiration, group);
      }

      return data;
    } catch (fetchError) {
      // Handle network errors more gracefully
      console.error(`Error fetching data for key ${key}:`, fetchError);

      // Check if we've gone offline during this request
      const stillOnline = await isNetworkAvailable();
      if (!stillOnline) {
        // We're offline now, try cache again as last resort
        const cachedData = await getFromCache(key);

        if (cachedData) {
          return { ...cachedData, fromCache: true, offlineMode: true };
        }
      }

      // Return a standardized error response
      return {
        success: false,
        error: fetchError.message || 'Network error occurred',
        offlineMode: !stillOnline,
      };
    }
  } catch (error) {
    console.error(`Error in getCachedData for key ${key}:`, error);

    // Last resort - return a generic error
    return {
      success: false,
      error: 'Cache operation failed',
      offlineMode: _isOfflineMode,
    };
  }
};

export {
  getCachedData,
  clearCache,
  isNetworkAvailable,
  isOfflineMode,
  setOfflineMode,
  CACHE_GROUPS,
  DEFAULT_CACHE_EXPIRATION,
};
