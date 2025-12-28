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
        // PERFORMANCE: Cache cookies in memory to avoid AsyncStorage on every call
        this.cachedCookies = null;
        this.cookiesCacheTimestamp = 0;
        this.COOKIES_CACHE_TTL = 300000; // 5 minutes
    }

    /**
     * Get streaming URL using Native NewPipe Module
     * Uses 3-hour cache to avoid repeated API calls
     * 
     * @param {string} videoId - YouTube video ID
     * @param {boolean} preferM4A - If true, prefer M4A format for download (metadata support). Default false for streaming.
     * @returns {Promise<{url: string, headers: object, thumbnail: string, duration: number, title: string, format: string}|null>}
     */
    async getStreamUrl(videoId, preferM4A = false) {
        try {
            // For downloads (preferM4A=true), skip cache to ensure we get the right format
            // For streaming, use cache
            if (!preferM4A) {
                // Step 1: CHECK CACHE FIRST (Hybrid: RAM -> Disk) - only for streaming
                const cachedData = await CacheManager.getStreamUrlAsync(videoId, 'ytmusic');
                if (cachedData && cachedData.url) {
                    console.log(`🚀 [Cache] Stream URL cache HIT for ${videoId} (format: ${cachedData.format})`);
                    // Estimate bitrate based on codec if not cached
                    const estimatedBitrate = cachedData.bitrate ||
                        (cachedData.mimeType?.includes('webm') ? 148000 : 256000);
                    return {
                        url: cachedData.url,
                        headers: {
                            'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
                            'Range': 'bytes=0-'
                        },
                        format: cachedData.format || 'opus',
                        mimeType: cachedData.mimeType || 'audio/webm',
                        bitrate: estimatedBitrate,
                        fromCache: true
                    };
                }
            }

            // Step 2: Fetch from Native NewPipe
            const mode = preferM4A ? 'Download (M4A)' : 'Streaming (Best Quality)';
            console.log(`🎯 [${preferM4A ? 'Download' : 'Stream'}] Getting stream for video: ${videoId} - ${mode}`);

            // Orbit VIP Mode: Inject Cookies if available (CACHED)
            // PERFORMANCE: Use cached cookies to avoid AsyncStorage on every call
            if (!this.cachedCookies || (Date.now() - this.cookiesCacheTimestamp > this.COOKIES_CACHE_TTL)) {
                this.cachedCookies = await AsyncStorage.getItem('yt_cookies');
                this.cookiesCacheTimestamp = Date.now();
            }
            const cookies = this.cachedCookies;
            if (cookies) {
                console.log('🍪 Using VIP Cookies for stream fetch');
            }

            // Call appropriate native method based on use case
            // - getStreamUrlForDownload: Prioritizes M4A for metadata embedding
            // - getStreamUrl: Selects highest bitrate for best quality
            const result = preferM4A
                ? await NativeStreaming.getStreamUrlForDownload(videoId, cookies || '')
                : await NativeStreaming.getStreamUrl(videoId, cookies || '');

            // Verbose logging removed for cleaner console

            if (result && result.url) {
                console.log(`✅ Native streaming successful (format: ${result.format})`);

                // Determine format from native result
                const format = result.format || (preferM4A ? 'm4a' : 'opus');
                const mimeType = result.mimeType || (preferM4A ? 'audio/mp4' : 'audio/webm');

                // Step 3: CACHE THE STREAM URL WITH FORMAT METADATA (3-hour TTL)
                // Cache regardless of mode - useful for both streaming and download
                CacheManager.setStreamUrl(videoId, result.url, 'ytmusic', {
                    format: format,
                    mimeType: mimeType,
                });
                // Cache log removed for cleaner console

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
                    // Format info for correct file extension
                    format: format,
                    mimeType: mimeType,
                    bitrate: result.bitrate,
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

