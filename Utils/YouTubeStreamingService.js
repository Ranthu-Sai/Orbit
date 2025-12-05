import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeStreaming from './NativeStreaming';

/**
 * YouTube Streaming Service
 * 
 * Provides YouTube Music streaming URLs with proper authentication headers.
 * Uses Direct Native NewPipe Extraction (via StreamModule).
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
     * 
     * @param {string} videoId - YouTube video ID
     * @returns {Promise<{url: string, headers: object, thumbnail: string, duration: number, title: string}|null>}
     */
    async getStreamUrl(videoId) {
        try {
            console.log(`🎯 Getting stream for video: ${videoId} using Native NewPipe...`);

            // Call Native Module
            const result = await NativeStreaming.getStreamUrl(videoId);

            if (result && result.url) {
                console.log('✅ Native streaming successful');
                return {
                    url: result.url,
                    headers: {
                        'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
                        'Range': 'bytes=0-'
                    },
                    thumbnail: result.thumbnail,
                    duration: result.duration,
                    title: result.title,
                    author: result.author
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
