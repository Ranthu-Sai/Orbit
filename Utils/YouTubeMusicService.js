import InnerTubeClient from '../Api/InnertubeClient';
import NativeStreaming from './NativeStreaming';
import InnertubeNative from '../Api/InnertubeNative';

/**
 * YouTubeMusicService
 * 
 * Unified service layer for YouTube Music API operations.
 * Combines InnerTube API (JS) for metadata and Native Streaming (Kotlin) for audio URLs.
 */
class YouTubeMusicService {
    static initialized = true;

    static async initialize() {
        return true;
    }

    // Stream URL extraction via native bridge
    static async getStreamUrl(videoId) {
        const stream = await NativeStreaming.getStreamUrl(videoId, '');
        // Map native result to expected format, including bitrate and mimeType
        return {
            ...stream,
            url: stream.url,
            // Add formats structure if needed (Native returns one best stream)
            all_formats: [],
            format: stream.format || 'opus',
            mimeType: stream.mimeType || 'audio/webm',
            bitrate: stream.bitrate || 0
        };
    }

    static async search(query, filter = 'songs', limit = 20) {
        return await InnerTubeClient.search(query, filter);
    }

    static async getSearchSuggestions(query) {
        // Use pure JS implementation instead of native bridge (which returns 400 errors)
        return await InnerTubeClient.getSearchSuggestions(query);
    }

    static async getHomeFeed(limit = 10, forceRefresh = false) {
        return await InnerTubeClient.getHome();
    }

    static async getPlaylist(playlistId) {
        return await InnerTubeClient.getPlaylist(playlistId);
    }

    static async getAlbum(albumId) {
        return await InnerTubeClient.getAlbum(albumId);
    }

    static async getArtist(browseId) {
        return await InnerTubeClient.getArtist(browseId);
    }

    static async getSection(browseId, params = null, continuation = null) {
        return await InnerTubeClient.getSection(browseId, params, continuation);
    }

    static async getNext(videoId, playlistId = null, continuation = null) {
        return await InnerTubeClient.getNext(videoId, playlistId, continuation);
    }

    /**
     * Register playback with YouTube to update watch history and visitorData
     * crucial for personalized recommendations
     */
    static async registerPlayback(videoId) {
        // We use getNext as a lightweight way to register the "watch"
        // This updates the visitorData in InnerTubeClient
        console.log(`[YouTubeMusicService] Registering playback for ${videoId} to update history`);
        // we don't await the result to avoid blocking, but we catch errors
        InnerTubeClient.getNext(videoId).catch(e =>
            console.log('[YouTubeMusicService] Failed to register playback:', e.message)
        );
    }

    static async getCharts(country = 'IN') {
        // Not implemented in InnerTubeClient yet, returning empty
        return { videos: [], artists: [], genres: [] };
    }

    static async searchAndStream(songName, artistName = '') {
        const results = await this.search(`${songName} ${artistName}`, 'songs');
        if (results && results.length > 0) {
            const videoId = results[0].videoId;
            const stream = await this.getStreamUrl(videoId);
            return {
                ...stream,
                ...results[0], // Merge metadata
                stream_url: stream.url // legacy key
            };
        }
        return { error: "No results found" };
    }

    // Legacy stubs for backward compatibility
    static async clearCache() { return { status: "success" }; }
    static async resetSession() { return { status: "success" }; }
    static async getDiagnostics() { return { status: "migrated_to_js" }; }
}

export default YouTubeMusicService;
