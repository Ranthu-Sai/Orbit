import AsyncStorage from '@react-native-async-storage/async-storage';
import { isNetworkAvailable, clearCache, CACHE_GROUPS } from './CacheManager';

/**
 * CacheInitializer - Handles cache maintenance during app startup
 * 
 * This module:
 * 1. Performs cache cleanup to remove stale entries
 * 2. Prunes cache when it gets too large
 * 3. Configures cache settings based on device capabilities
 */

// Constants
const MAX_CACHE_SIZE_MB = 100; // Increased to 100MB for more storage capacity
const CACHE_VERSION = '1.0.2'; // Force clear all cache on next app restart
const CACHE_LAST_CLEANUP_KEY = 'cache_last_cleanup_time';
const CLEANUP_INTERVAL_HOURS = 6; // Run cleanup every 6 hours for proactive maintenance

/**
 * Initialize and maintain cache system
 * Should be called during app startup
 */
const initializeCache = async () => {
  try {
    // Check if we need to perform cleanup
    const shouldCleanup = await shouldPerformCleanup();
    if (shouldCleanup) {
      await performCacheCleanup();
    }

    // Check cache version
    await validateCacheVersion();
    return true;
  } catch (error) {
    console.error('Error during cache initialization:', error);
    return false;
  }
};

/**
 * Check if we should perform cache cleanup based on time elapsed
 */
const shouldPerformCleanup = async () => {
  try {
    const lastCleanupTime = await AsyncStorage.getItem(CACHE_LAST_CLEANUP_KEY);
    if (!lastCleanupTime) return true;

    const lastCleanup = parseInt(lastCleanupTime, 10);
    const currentTime = new Date().getTime();
    const hoursSinceLastCleanup = (currentTime - lastCleanup) / (1000 * 60 * 60);

    return hoursSinceLastCleanup >= CLEANUP_INTERVAL_HOURS;
  } catch (error) {
    console.error('Error checking cleanup status:', error);
    return true; // Default to cleaning up on error
  }
};

/**
 * Perform cache cleanup tasks
 */
const performCacheCleanup = async () => {
  try {
    // Record cleanup time
    await AsyncStorage.setItem(CACHE_LAST_CLEANUP_KEY, new Date().getTime().toString());

    // Get all AsyncStorage keys
    const keys = await AsyncStorage.getAllKeys();
    const cacheKeys = keys.filter(key => key.startsWith('api_cache_'));

    // Check if network is available for expired item pruning
    const networkAvailable = await isNetworkAvailable();

    if (cacheKeys.length > 0) {
      // Get all cache items with their metadata
      const cacheItems = await Promise.all(
        cacheKeys.map(async (key) => {
          try {
            const item = await AsyncStorage.getItem(key);
            if (!item) return null;

            const parsed = JSON.parse(item);
            const size = item.length;
            return { key, data: parsed, size };
          } catch (e) {
            console.warn(`Error reading cache item ${key}:`, e);
            return null;
          }
        })
      );

      // Filter out nulls
      const validCacheItems = cacheItems.filter(item => item !== null);

      // Check total cache size
      const totalSizeBytes = validCacheItems.reduce((sum, item) => sum + item.size, 0);
      const totalSizeMB = totalSizeBytes / (1024 * 1024);



      // Check for expired items (already handled by CacheManager, but good for cleanup)
      const currentTime = new Date().getTime();
      const expiredItems = validCacheItems.filter(item => {
        const { timestamp, expiration } = item.data;
        return currentTime - timestamp > expiration * 60 * 1000;
      });

      // Remove expired items
      if (expiredItems.length > 0) {
        await AsyncStorage.multiRemove(expiredItems.map(item => item.key));
      }

      // If cache is too large, remove the oldest items until under limit
      if (totalSizeMB > MAX_CACHE_SIZE_MB) {

        // Sort by timestamp (oldest first)
        validCacheItems.sort((a, b) => a.data.timestamp - b.data.timestamp);

        let currentSize = totalSizeBytes;
        const itemsToRemove = [];

        // Remove oldest items until we're under the limit
        for (const item of validCacheItems) {
          if (currentSize / (1024 * 1024) <= MAX_CACHE_SIZE_MB * 0.7) {
            // Stop when we reach 70% of the limit (more aggressive pruning)
            break;
          }

          itemsToRemove.push(item.key);
          currentSize -= item.size;
        }

        if (itemsToRemove.length > 0) {
          await AsyncStorage.multiRemove(itemsToRemove);
        }
      }
    }

    return true;
  } catch (error) {
    return false;
  }
};

/**
 * Validate cache version and clear if version changed
 */
const validateCacheVersion = async () => {
  try {
    const storedVersion = await AsyncStorage.getItem('cache_version');

    if (storedVersion !== CACHE_VERSION) {
      await clearCache();
      await AsyncStorage.setItem('cache_version', CACHE_VERSION);
    }
  } catch (error) {
    // Silent error handling
  }
};

// Optional method for forcing cache refresh of specific sections
const refreshCacheGroup = async (group) => {
  if (!Object.values(CACHE_GROUPS).includes(group)) {
    console.error(`Invalid cache group: ${group}`);
    return false;
  }
  await clearCache(group);
  return true;
};

export {
  initializeCache,
  refreshCacheGroup,
  performCacheCleanup
}; 