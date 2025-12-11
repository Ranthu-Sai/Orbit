import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeStreaming from './NativeStreaming';
import { CacheManager } from './NavigationCacheManager';

/**
 * YouTube Streaming Service
 * 
 * Provides YouTube Music streaming URLs with proper authentication headers.
 * Uses Direct Native NewPipe Extraction (via StreamModule).
 * 
 * CACHING: Stream URLs are cached for 3 hours to avoid repeated API calls.
 */

// Android client configuration for InnerTube API
const ANDROID_CLIENT = {
    headers: {
        'User-Agent': 'com.google.android.youtube/19.09.37 (Linux; U; Android 12; en_IN)',
        'X-YouTube-Client-Name': '3',
        'X-YouTube-Client-Version': '19.09.37',
    }
};

class YouTubeStreamingService {
    constructor() {
        this.cookies = null;
        this.cookiesLoaded = false;
    }

    /**
     * Get streaming URL using Native NewPipe Module
     * Uses 3-hour cache to avoid repeated API calls
     * 
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<{url: string, headers: object, thumbnail: string, duration: number, title: string}|null>}
     */
    async getStreamUrl(videoId) {
        try {
            // Step 1: CHECK CACHE FIRST (Hybrid: RAM -> Disk)
            const cachedUrl = await CacheManager.getStreamUrlAsync(videoId, 'ytmusic');
            if (cachedUrl) {
                console.log(`🚀 [Cache] Stream URL cache HIT for ${videoId}`);
                return {
                    url: cachedUrl,
                    headers: {
                        'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
                        'Range': 'bytes=0-'
                    },
                    fromCache: true
                };
            }

            // Step 2: Cache miss - fetch from Native NewPipe
            console.log(`🎯 [Cache MISS] Getting stream for video: ${videoId} using Native NewPipe...`);

            // Orbit VIP Mode: Inject Cookies if available
            const cookies = await AsyncStorage.getItem('yt_cookies');
            if (cookies) {
                console.log('🍪 Using VIP Cookies for stream fetch');
            }

            const result = await NativeStreaming.getStreamUrl(videoId, cookies || '');

            if (result && result.url) {
                console.log('✅ Native streaming successful');

                // Step 3: CACHE THE STREAM URL (3-hour TTL)
                CacheManager.setStreamUrl(videoId, result.url, 'ytmusic');
                console.log(`📦 [Cache] Stream URL cached for ${videoId} (3-hour TTL)`);

                return {
                    url: result.url,
                    headers: {
                        'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
                        'Range': 'bytes=0-'
                    },
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    title: result.title,
                    author: result.author,
                    fromCache: false
                };
            }

            throw new Error('Native module returned empty result');

        } catch (error) {
            console.error(`❌ Native Streaming failed for ${videoId}:`, error);
            return null;
        }
    }
}

// Create singleton instance
const youtubeStreamingService = new YouTubeStreamingService();

export default youtubeStreamingService;

