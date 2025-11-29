import AsyncStorage from '@react-native-async-storage/async-storage';
import PythonBridgeAPI from './PythonBridgeAPI';

export interface CacheConfig {
  homeFeedCacheDuration: number;
  searchCacheDuration: number;
  streamCacheDuration: number;
  chartsCacheDuration: number;
}

const DEFAULT_CACHE_CONFIG: CacheConfig = {
  homeFeedCacheDuration: 4 * 60 * 60 * 1000, // 4 hours
  searchCacheDuration: 1 * 60 * 60 * 1000, // 1 hour
  streamCacheDuration: 2 * 60 * 60 * 1000, // 2 hours (stream URLs expire)
  chartsCacheDuration: 6 * 60 * 60 * 1000, // 6 hours
};

export class PythonBridgeService {
  private static initialized = false;
  private static cacheConfig = DEFAULT_CACHE_CONFIG;

  /**
   * Initialize the Python bridge service
   */
  static async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      const success = await PythonBridgeAPI.initialize();
      if (success) {
        this.initialized = true;
        console.log('Python Bridge Service initialized successfully');
        return true;
      }
      return false;
    } catch (error) {
      console.error('Python Bridge Service initialization failed:', error);
      return false;
    }
  }

  /**
   * Set cache configuration
   */
  static setCacheConfig(config: Partial<CacheConfig>): void {
    this.cacheConfig = { ...this.cacheConfig, ...config };
    console.log('Python Bridge Service cache config updated:', this.cacheConfig);
  }

  /**
   * Get cached result with timestamp check
   */
  private static async getCachedResult(key: string): Promise<any | null> {
    try {
      const cached = await AsyncStorage.getItem(key);
      if (cached) {
        const { data, timestamp, cacheType } = JSON.parse(cached);
        const now = Date.now();
        const cacheDuration = this.cacheConfig[`${cacheType}CacheDuration` as keyof CacheConfig];

        if (now - timestamp < cacheDuration) {
          console.log(`Returning cached ${cacheType} result for key: ${key}`);
          return data;
        } else {
          // Remove expired cache
          await AsyncStorage.removeItem(key);
          console.log(`Expired cache removed for key: ${key}`);
        }
      }
    } catch (error) {
      console.warn('Error reading from cache:', error);
    }
    return null;
  }

  /**
   * Set cached result with timestamp
   */
  private static async setCachedResult(key: string, data: any, cacheType: string): Promise<void> {
    try {
      const cacheEntry = {
        data,
        timestamp: Date.now(),
        cacheType
      };
      await AsyncStorage.setItem(key, JSON.stringify(cacheEntry));
      console.log(`Cached ${cacheType} result for key: ${key}`);
    } catch (error) {
      console.warn('Error writing to cache:', error);
    }
  }

  /**
   * Get home feed with caching
   */
  static async getHomeFeed(limit: number = 10, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_home_feed_${limit}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        // Refresh in background if cache is old (>2 hours)
        const checkCacheAge = async () => {
          try {
            const cachedItem = await AsyncStorage.getItem(cacheKey);
            if (cachedItem) {
              const { timestamp } = JSON.parse(cachedItem);
              const cacheAge = Date.now() - timestamp;
              const backgroundRefreshThreshold = 2 * 60 * 60 * 1000; // 2 hours

              if (cacheAge > backgroundRefreshThreshold) {
                console.log('Refreshing home feed in background');
                try {
                  const freshData = await PythonBridgeAPI.getHomeFeed(limit);
                  await this.setCachedResult(cacheKey, freshData, 'homeFeed');
                } catch (error) {
                  console.warn('Background refresh failed:', error);
                }
              }
            }
          } catch (error) {
            // Ignore background refresh errors
          }
        };

        // Don't await the background refresh
        checkCacheAge();

        return cached;
      }
    }

    console.log('Fetching fresh home feed');
    const freshData = await PythonBridgeAPI.getHomeFeed(limit);
    await this.setCachedResult(cacheKey, freshData, 'homeFeed');
    return freshData;
  }

  /**
   * Search with caching
   */
  static async search(query: string, filter: string = 'songs', limit: number = 10, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_search_${query}_${filter}_${limit}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Searching for: ${query} with filter: ${filter}`);
    const results = await PythonBridgeAPI.search(query, filter, limit);
    await this.setCachedResult(cacheKey, results, 'search');
    return results;
  }

  /**
   * Get stream URL with caching
   */
  static async getStreamUrl(videoId: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_stream_${videoId}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting stream URL for video: ${videoId}`);
    const streamResult = await PythonBridgeAPI.getStreamUrl(videoId);
    await this.setCachedResult(cacheKey, streamResult, 'stream');
    return streamResult;
  }

  /**
   * Search and stream (combines search + stream operations)
   */
  static async searchAndStream(songName: string, artistName: string = '', forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_search_stream_${songName}_${artistName}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Searching and streaming: "${songName}" by "${artistName}"`);
    const result = await PythonBridgeAPI.searchAndStream(songName, artistName);
    await this.setCachedResult(cacheKey, result, 'stream');
    return result;
  }

  /**
   * Get charts with caching
   */
  static async getCharts(countryCode?: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_charts_${countryCode || 'auto'}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting charts for country: ${countryCode || 'auto-detected'}`);
    const charts = await PythonBridgeAPI.getCharts(countryCode);
    await this.setCachedResult(cacheKey, charts, 'charts');
    return charts;
  }

  /**
   * Clear all cached data
   */
  static async clearCache(): Promise<{ success: boolean; message: string }> {
    try {
      console.log('Clearing Python service cache');

      // Clear JavaScript-side cache
      const keys = await AsyncStorage.getAllKeys();
      const pythonCacheKeys = keys.filter(key => key.startsWith('python_'));
      await AsyncStorage.multiRemove(pythonCacheKeys);

      // Clear Python-side cache
      const result = await PythonBridgeAPI.clearCache();

      console.log('Python service cache cleared successfully');
      return {
        success: true,
        message: `Cleared ${pythonCacheKeys.length} cached items`
      };
    } catch (error) {
      console.error('Failed to clear cache:', error);
      return {
        success: false,
        message: `Cache clear failed: ${error}`
      };
    }
  }

  /**
   * Get detailed video information using pytubefix
   */
  static async getVideoInfo(videoId: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_video_info_${videoId}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting video info for: ${videoId}`);
    const info = await PythonBridgeAPI.getVideoInfo(videoId);
    await this.setCachedResult(cacheKey, info, 'stream'); // Use stream cache duration
    return info;
  }

  /**
   * Get adaptive streams for high quality playback
   */
  static async getAdaptiveStreams(videoId: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_adaptive_streams_${videoId}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting adaptive streams for: ${videoId}`);
    const streams = await PythonBridgeAPI.getAdaptiveStreams(videoId);
    await this.setCachedResult(cacheKey, streams, 'stream');
    return streams;
  }

  /**
   * Get highest quality stream available
   */
  static async getHighestQualityStream(videoId: string, audioOnly: boolean = true, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_highest_quality_${videoId}_${audioOnly}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting highest quality ${audioOnly ? 'audio' : 'video'} stream for: ${videoId}`);
    const stream = await PythonBridgeAPI.getHighestQualityStream(videoId, audioOnly);
    await this.setCachedResult(cacheKey, stream, 'stream');
    return stream;
  }

  /**
   * Get playlist details and tracks with caching
   */
  static async getPlaylist(playlistId: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_playlist_${playlistId}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting playlist: ${playlistId}`);
    const playlist = await PythonBridgeAPI.getPlaylist(playlistId);
    await this.setCachedResult(cacheKey, playlist, 'homeFeed'); // Use homeFeed cache duration
    return playlist;
  }

  /**
   * Get album details and tracks with caching
   */
  static async getAlbum(albumId: string, forceFresh: boolean = false) {
    if (!this.initialized) {
      await this.initialize();
    }

    const cacheKey = `python_album_${albumId}`;

    if (!forceFresh) {
      const cached = await this.getCachedResult(cacheKey);
      if (cached) {
        return cached;
      }
    }

    console.log(`Getting album: ${albumId}`);
    const album = await PythonBridgeAPI.getAlbum(albumId);
    await this.setCachedResult(cacheKey, album, 'homeFeed'); // Use homeFeed cache duration
    return album;
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats() {
    try {
      const pythonStats = await PythonBridgeAPI.getCacheStats();

      // Get local AsyncStorage keys
      const keys = await AsyncStorage.getAllKeys();
      const pythonCacheKeys = keys.filter(key => key.startsWith('python_'));

      return {
        ...pythonStats,
        localCacheItems: pythonCacheKeys.length,
        localCacheKeys: pythonCacheKeys
      };
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      return {
        error: `Failed to get cache stats: ${error}`
      };
    }
  }
}

export default PythonBridgeService;
