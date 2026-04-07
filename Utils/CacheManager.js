import AsyncStorage from '@react-native-async-storage/async-storage';
import { Buffer } from 'buffer';
import { Platform } from 'react-native';

// Configuration for different cache types
const CACHE_CONFIG = {
  // Persistent cache (for playlists and albums)
  PERSISTENT: {
    MAX_SIZE: 1 * 1024 * 1024, // 1MB
    MAX_ITEMS: 5,
    MAX_AGE: 6 * 60 * 60 * 1000, // 6 hours
  },
  // Memory-only cache (for search results)
  MEMORY: {
    MAX_SIZE: 2,
    MAX_AGE: 2 * 60 * 1000, // 2 minutes
  },
};

// Memory cache implementation with strict limits
class MemoryCache {
  constructor() {
    this.cache = new Map();
    this.timestamps = new Map();
  }

  set(key, value) {
    // Always clean up before adding new item
    this.cleanup();

    // If we're at capacity, remove oldest item
    if (this.cache.size >= CACHE_CONFIG.MEMORY.MAX_SIZE) {
      const oldestKey = this.getOldestKey();
      if (oldestKey) {
        this.cache.delete(oldestKey);
        this.timestamps.delete(oldestKey);
      }
    }

    // Only store if we have space
    if (this.cache.size < CACHE_CONFIG.MEMORY.MAX_SIZE) {
      this.cache.set(key, value);
      this.timestamps.set(key, Date.now());
    }
  }

  get(key) {
    const value = this.cache.get(key);
    if (value) {
      // Update timestamp on access
      this.timestamps.set(key, Date.now());
      return value;
    }
    return null;
  }

  getOldestKey() {
    let oldestKey = null;
    let oldestTime = Infinity;

    for (const [key, timestamp] of this.timestamps.entries()) {
      if (timestamp < oldestTime) {
        oldestTime = timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  cleanup() {
    const now = Date.now();
    for (const [key, timestamp] of this.timestamps.entries()) {
      if (now - timestamp > CACHE_CONFIG.MEMORY.MAX_AGE) {
        this.cache.delete(key);
        this.timestamps.delete(key);
      }
    }
  }

  clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

// Initialize memory cache
const memoryCache = new MemoryCache();

// Debounce utility for search operations
class Debouncer {
  constructor(delay = 500) {
    this.delay = delay;
    this.timeout = null;
  }

  debounce(fn) {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
    this.timeout = setTimeout(fn, this.delay);
  }
}

const searchDebouncer = new Debouncer();

// Compression utilities
const Compression = {
  compress: (data) => {
    try {
      const str = JSON.stringify(data);
      if (str.length > CACHE_CONFIG.PERSISTENT.MAX_SIZE) {
        return Buffer.from(str).toString('base64');
      }
      return str;
    } catch (error) {
      console.warn('Compression failed:', error);
      return JSON.stringify(data);
    }
  },

  decompress: (data) => {
    try {
      if (data.startsWith('[') || data.startsWith('{')) {
        return JSON.parse(data);
      }
      return JSON.parse(Buffer.from(data, 'base64').toString());
    } catch (error) {
      console.warn('Decompression failed:', error);
      return null;
    }
  },
};

// Database size management
const DB_SIZE_MANAGER = {
  async getDatabaseSize() {
    try {
      const info = await AsyncStorage.getItem('db_size_info');
      return info ? JSON.parse(info) : { size: 0, lastCleanup: Date.now() };
    } catch {
      return { size: 0, lastCleanup: Date.now() };
    }
  },

  async updateDatabaseSize(size) {
    try {
      await AsyncStorage.setItem(
        'db_size_info',
        JSON.stringify({
          size,
          lastCleanup: Date.now(),
        })
      );
    } catch (error) {
      console.warn('Failed to update database size:', error);
    }
  },

  async cleanupIfNeeded() {
    try {
      const { size, lastCleanup } = await this.getDatabaseSize();
      const now = Date.now();

      // Force cleanup if size is too large or if it's been too long
      if (
        size > CACHE_CONFIG.PERSISTENT.MAX_SIZE ||
        now - lastCleanup > CACHE_CONFIG.PERSISTENT.MAX_AGE
      ) {
        await this.forceCleanup();
      }
    } catch (error) {
      console.warn('Database size check failed:', error);
    }
  },

  async forceCleanup() {
    try {
      const keys = await AsyncStorage.getAllKeys();
      const cacheKeys = keys.filter(
        (key) => key.startsWith('playlist_') || key.startsWith('album_')
      );

      // Remove all cache items
      await Promise.all(cacheKeys.map((key) => AsyncStorage.removeItem(key)));

      // Reset size info
      await this.updateDatabaseSize(0);
    } catch (error) {
      console.warn('Force cleanup failed:', error);
    }
  },
};

export const CacheManager = {
  // Clear old cache entries to prevent storage full errors
  clearOldCacheEntries: async () => {
    try {
      // Get all keys in AsyncStorage
      const keys = await AsyncStorage.getAllKeys();

      // Filter cache keys
      const cacheKeys = keys.filter(
        (key) =>
          key.startsWith('playlist_') ||
          key.startsWith('album_') ||
          key.startsWith('api_cache_')
      );

      // If we have a lot of cached items, remove the older ones
      if (cacheKeys.length > 20) {
        const keysToRemove = cacheKeys.slice(0, cacheKeys.length - 10);
        await AsyncStorage.multiRemove(keysToRemove);
      }

      return true;
    } catch (error) {
      console.warn('Failed to clear old cache entries:', error);
      return false;
    }
  },

  // Save data to cache with type-specific handling
  saveToCache: async (key, data, type = 'playlist') => {
    // For persistent storage (playlists and albums)
    const prefix = type === 'playlist' ? 'playlist_' : 'album_';
    const cacheKey = `${prefix}${key}`;

    try {
      // Handle search results differently - memory only
      if (
        key.includes('api_cache_search_') ||
        key.includes('api_cache_album_search_')
      ) {
        // Store search results in memory only, completely bypass AsyncStorage
        memoryCache.set(key, data);
        return true;
      }

      // Check database size and cleanup if needed
      await DB_SIZE_MANAGER.cleanupIfNeeded();

      // Save to persistent storage
      await AsyncStorage.setItem(
        cacheKey,
        JSON.stringify({
          data,
          timestamp: Date.now(),
        })
      );

      // Update database size
      const { size } = await DB_SIZE_MANAGER.getDatabaseSize();
      await DB_SIZE_MANAGER.updateDatabaseSize(
        size + JSON.stringify(data).length
      );

      return true;
    } catch (error) {
      // If we get a storage full error, force cleanup and retry once
      if (
        error.message?.includes('SQLITE_FULL') ||
        error.message?.includes('storage_full')
      ) {
        try {
          await DB_SIZE_MANAGER.forceCleanup();
          // Retry once after cleanup
          const retryCacheKey = cacheKey;
          await AsyncStorage.setItem(
            retryCacheKey,
            JSON.stringify({
              data,
              timestamp: Date.now(),
            })
          );
          return true;
        } catch (retryError) {
          console.warn('Cache save failed even after cleanup:', retryError);
        }
      }
      return false;
    }
  },

  // Get data from cache with type-specific handling
  getFromCache: async (key, type = 'playlist') => {
    try {
      // Handle search results differently - memory only
      if (
        key.includes('api_cache_search_') ||
        key.includes('api_cache_album_search_')
      ) {
        return memoryCache.get(key);
      }

      // For persistent storage
      const prefix = type === 'playlist' ? 'playlist_' : 'album_';
      const cacheKey = `${prefix}${key}`;

      const cachedData = await AsyncStorage.getItem(cacheKey);
      if (!cachedData) {
        return null;
      }

      const { data, timestamp } = JSON.parse(cachedData);

      // Check if data is expired
      if (Date.now() - timestamp > CACHE_CONFIG.PERSISTENT.MAX_AGE) {
        await AsyncStorage.removeItem(cacheKey);
        return null;
      }

      return data;
    } catch (error) {
      console.warn('Cache read failed:', error);
      return null;
    }
  },

  // Debounced search cache save with increased delay
  debouncedSaveSearchCache: (key, data) => {
    searchDebouncer.debounce(() => {
      // Only store in memory cache, completely bypass AsyncStorage
      memoryCache.set(key, data);
    });
  },

  // Remove specific item from cache
  removeFromCache: async (key) => {
    try {
      if (
        key.includes('api_cache_search_') ||
        key.includes('api_cache_album_search_')
      ) {
        memoryCache.clear();
      } else {
        await AsyncStorage.removeItem(key);
      }
    } catch (error) {
      console.warn('Failed to remove from cache:', error);
    }
  },

  // Clear all cache
  clearAllCache: async () => {
    try {
      await DB_SIZE_MANAGER.forceCleanup();
      memoryCache.clear();
      return true;
    } catch (error) {
      console.warn('Failed to clear all cache:', error);
      return false;
    }
  },
};
