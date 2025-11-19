import { NativeModules } from 'react-native';
import * as RNLocalize from 'react-native-localize';

const { PythonBridge } = NativeModules;

export interface PythonFunctionParams {
  [key: string]: any;
}

export interface PythonBridgeResult {
  status?: string;
  message?: string;
  error?: string;
  code?: string;
  data?: any;

  // Music-specific results
  title?: string;
  artists?: string[];
  video_id?: string;
  stream_url?: string;
  thumbnail?: string;
  quality?: string;
  bitrate?: string;
  duration?: number;
  all_formats?: any[];
}

export interface HomeFeed {
  sections: Array<{
    sectionTitle: string;
    items: Array<{
      type: string;
      id: string;
      title: string;
      artists?: string[];
      thumbnails: any[];
    }>;
  }>;
}

export interface SearchResult {
  results: Array<{
    type: string;
    id: string;
    title: string;
    thumbnails: any[];
    artists?: string[];
  }>;
}

export interface StreamResult {
  url: string;
  title?: string;
  duration?: number;
  thumbnail?: string;
  format?: string;
  quality?: string;
  bitrate?: string;
  error?: string;
}

export interface DetailedStreamResult extends StreamResult {
  artists: string;
  video_id: string;
  codec: string;
  all_formats: any[];
}

export interface ChartsResult {
  songs: any[];
  artists: any[];
  genrePlaylists: any[];
}

export interface VideoInfo {
  video_id: string;
  title: string;
  length: number;
  views: number;
  rating: number;
  description: string;
  thumbnail: string;
  author: string;
}

export interface AdaptiveStreamsResult {
  video_id: string;
  title: string;
  dash_audio: Array<{
    itag: number;
    mime_type: string;
    codecs: string | null;
    quality: string;
    bitrate: number;
    url: string;
    filesize: number | null;
  }>;
  dash_video: Array<{
    itag: number;
    mime_type: string;
    codecs: string | null;
    quality: string;
    fps: number;
    bitrate: number;
    url: string;
    filesize: number | null;
  }>;
}

export class PythonBridgeAPI {
  private static initialized = false;

  /**
   * Initialize the Python bridge
   */
  static async initialize(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    try {
      await PythonBridge.initializePython();
      this.initialized = true;
      return true;
    } catch (error) {
      console.error('Failed to initialize Python bridge:', error);
      return false;
    }
  }

  /**
   * Call a Python function through the bridge
   */
  private static async callPythonFunction(
    functionName: string,
    params: PythonFunctionParams = {}
  ): Promise<any> {
    if (!this.initialized) {
      await this.initialize();
    }

    try {
      const resultStr = await PythonBridge.callPythonFunction(functionName, params);
      const result = JSON.parse(resultStr);

      if (result.error) {
        throw new Error(result.error);
      }

      return result;
    } catch (error) {
      console.error(`Python function ${functionName} failed:`, error);
      throw error;
    }
  }

  /**
   * Get home feed data
   */
  static async getHomeFeed(limit: number = 10): Promise<HomeFeed> {
    return this.callPythonFunction('get_home', { limit });
  }

  /**
   * Search YouTube Music
   */
  static async search(query: string, filter: string = 'songs', limit: number = 10): Promise<SearchResult> {
    return this.callPythonFunction('search', { query, filter, limit });
  }

  /**
   * Get stream URL for a video
   */
  static async getStreamUrl(videoId: string): Promise<StreamResult> {
    return this.callPythonFunction('get_stream_url', { video_id: videoId });
  }

  /**
   * Combined search and get stream (like the original app.py)
   */
  static async searchAndStream(songName: string, artistName: string = ''): Promise<DetailedStreamResult> {
    return this.callPythonFunction('search_and_stream', {
      song_name: songName,
      artist_name: artistName
    });
  }

  /**
   * Get charts for a country (uses device localization if no country provided)
   */
  static async getCharts(countryCode?: string): Promise<ChartsResult> {
    if (!countryCode) {
      // Get country code from device localization
      const locales = RNLocalize.getLocales();
      const countryFromDevice = locales[0]?.countryCode || 'IN';

      // Map some country codes that YouTube Music recognizes
      const countryMap: { [key: string]: string } = {
        'US': 'US',
        'GB': 'GB',
        'IN': 'IN',
        'CA': 'CA',
        'AU': 'AU',
        'DE': 'DE',
        'FR': 'FR',
        'JP': 'JP',
        'KR': 'KR',
        'BR': 'BR',
        'MX': 'MX',
        // Add more mappings as needed
      };

      countryCode = countryMap[countryFromDevice] || countryFromDevice;
      console.log(`Using country code from device localization: ${countryCode}`);
    }

    return this.callPythonFunction('get_charts', { country: countryCode });
  }

  /**
   * Get cache statistics
   */
  static async getCacheStats(): Promise<any> {
    try {
      return await PythonBridge.getCacheStats();
    } catch (error) {
      console.error('Failed to get cache stats:', error);
      throw error;
    }
  }

  /**
   * Get detailed video information using pytubefix
   */
  static async getVideoInfo(videoId: string): Promise<VideoInfo> {
    return this.callPythonFunction('get_video_info', { video_id: videoId });
  }

  /**
   * Get adaptive (DASH) streams for higher quality
   */
  static async getAdaptiveStreams(videoId: string): Promise<AdaptiveStreamsResult> {
    return this.callPythonFunction('get_adaptive_streams', { video_id: videoId });
  }

  /**
   * Get the highest quality stream available
   */
  static async getHighestQualityStream(videoId: string, audioOnly: boolean = true): Promise<StreamResult> {
    return this.callPythonFunction('get_highest_quality_stream', {
      video_id: videoId,
      audio_only: audioOnly
    });
  }

  /**
   * Clear Python cache
   */
  static async clearCache(): Promise<PythonBridgeResult> {
    const result = await this.callPythonFunction('clear_cache', {});
    return JSON.parse(result);
  }
}

export default PythonBridgeAPI;
