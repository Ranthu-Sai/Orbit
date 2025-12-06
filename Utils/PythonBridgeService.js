import InnerTubeClient from '../Api/InnertubeClient';
import NativeStreaming from './NativeStreaming';

/**
 * PythonBridgeService Shim
 * 
 * Migrated to Pure JS + Native Streaming.
 * Keeps the same API surface for backward compatibility.
 */
class PythonBridgeService {
    static initialized = true;

    static async initialize() {
        return true;
    }

    // Shim methods
    static async getStreamUrl(videoId) {
        const stream = await NativeStreaming.getStreamUrl(videoId);
        // Map native result to expected format
        return {
            ...stream,
            url: stream.url,
            // Add formats structure if needed (Native returns one best stream)
            all_formats: [],
            format: 'audio/mp4'
        };
    }

    static async search(query, filter = 'songs', limit = 20) {
        return await InnerTubeClient.search(query, filter);
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

    static async getNext(videoId, playlistId = null, continuation = null) {
        return await InnerTubeClient.getNext(videoId, playlistId, continuation);
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

    // Legacy stubs
    static async clearCache() { return { status: "success" }; }
    static async resetSession() { return { status: "success" }; }
    static async getDiagnostics() { return { status: "migrated_to_js" }; }
}

export default PythonBridgeService;
