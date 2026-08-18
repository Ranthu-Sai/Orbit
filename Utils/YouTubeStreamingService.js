import AsyncStorage from '@react-native-async-storage/async-storage';
import NativeStreaming from './NativeStreaming';
import { CacheManager } from './NavigationCacheManager';
import { GetYtMusicQuality } from '../LocalStorage/AppSettings';

const ANDROID_CLIENT = {
  headers: {
    'User-Agent':
      'com.google.android.youtube/19.09.37 (Linux; U; Android 12; en_IN)',
    'X-YouTube-Client-Name': '3',
    'X-YouTube-Client-Version': '19.09.37',
  },
};

let cachedQualityPref = null;
let qualityCacheTTL = 0;
const QUALITY_CACHE_TTL = 60000;

class YouTubeStreamingService {
  constructor() {
    this.cookies = null;
    this.cookiesLoaded = false;
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

      if (!preferM4A) {
        const cachedData = await CacheManager.getStreamUrlAsync(
          videoId,
          'ytmusic'
        );
        if (cachedData && cachedData.url) {
          const estimatedBitrate =
            cachedData.bitrate ||
            (cachedData.mimeType?.includes('webm') ? 148000 : 256000);
          return {
            url: cachedData.url,
            headers: {
              'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
              Range: 'bytes=0-',
            },
            format: cachedData.format || 'opus',
            mimeType: cachedData.mimeType || 'audio/webm',
            bitrate: estimatedBitrate,
            fromCache: true,
          };
        }
      }

      let autoQuality = true;
      if (
        Date.now() - qualityCacheTTL > QUALITY_CACHE_TTL ||
        cachedQualityPref === null
      ) {
        cachedQualityPref = await GetYtMusicQuality();
        qualityCacheTTL = Date.now();
      }
      autoQuality = cachedQualityPref !== 'High';

      const _mode = preferM4A
        ? 'Download (M4A)'
        : autoQuality
          ? 'Auto (Fast)'
          : 'High Quality';
      if (
        !this.cachedCookies ||
        Date.now() - this.cookiesCacheTimestamp > this.COOKIES_CACHE_TTL
      ) {
        this.cachedCookies = await AsyncStorage.getItem('yt_cookies');
        this.cookiesCacheTimestamp = Date.now();
      }
      const cookies = this.cachedCookies;
      if (cookies) {
      }

      let result = null;

      // Try InnerTube JS client first (works for both streaming and downloads)
      try {
        const InnerTubeClient = require('../Api/InnertubeClient').default;
        const innertubeResult = await InnerTubeClient.getPlayerResponse(
          videoId,
          cookies,
          preferM4A
        );
        if (innertubeResult && innertubeResult.url) {
          const mimeType = innertubeResult.mimeType || 'audio/webm';
          const isM4A =
            mimeType.includes('mp4') || mimeType.includes('m4a');
          result = {
            url: innertubeResult.url,
            thumbnail: innertubeResult.thumbnail,
            duration: innertubeResult.duration,
            title: innertubeResult.title,
            author: innertubeResult.author,
            format: isM4A ? 'm4a' : 'opus',
            mimeType: mimeType,
            bitrate: innertubeResult.bitrate,
          };
        }
      } catch (innertubeErr) {
        console.warn(
          `⚠️ InnerTube JS player failed for ${videoId}:`,
          innertubeErr.message
        );
      }

      // Fallback to NativeStreaming (NewPipe) if InnerTube failed
      if (!result) {
        try {
          const nativeResult = preferM4A
            ? await NativeStreaming.getStreamUrlForDownload(
                videoId,
                cookies || ''
              )
            : await NativeStreaming.getStreamUrl(
                videoId,
                cookies || '',
                autoQuality
              );

          if (nativeResult && nativeResult.url) {
            result = nativeResult;
          }
        } catch (nativeErr) {
          console.warn(
            `⚠️ NativeStreaming failed for ${videoId}:`,
            nativeErr.message
          );
        }
      }

      if (result && result.url) {
        const format = result.format || (preferM4A ? 'm4a' : 'opus');
        const mimeType =
          result.mimeType || (preferM4A ? 'audio/mp4' : 'audio/webm');
        CacheManager.setStreamUrl(videoId, result.url, 'ytmusic', {
          format: format,
          mimeType: mimeType,
        });

        return {
          url: result.url,
          headers: {
            'User-Agent': ANDROID_CLIENT.headers['User-Agent'],
            Range: 'bytes=0-',
          },
          thumbnail: result.thumbnail,
          duration: result.duration,
          title: result.title,
          author: result.author,
          format: format,
          mimeType: mimeType,
          bitrate: result.bitrate,
          fromCache: false,
        };
      }

      throw new Error('All stream resolution strategies returned empty result');
    } catch (error) {
      console.error(`❌ Streaming failed for ${videoId}:`, error);
      return null;
    }
  }
}

const youtubeStreamingService = new YouTubeStreamingService();

export default youtubeStreamingService;
