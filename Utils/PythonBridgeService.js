import { NativeModules } from 'react-native';

const { PythonBridge } = NativeModules;

class PythonBridgeService {
    static initialized = false;

    /**
     * Initialize the Python bridge
     */
    static async initialize() {
        try {
            if (!PythonBridge) {
                console.error('❌ PythonBridge native module not available');
                return false;
            }

            if (this.initialized) {
                console.log('✅ Python bridge already initialized');
                return true;
            }

            await PythonBridge.initializePython();
            this.initialized = true;
            console.log('✅ Python bridge initialized successfully');
            return true;
        } catch (error) {
            console.error('❌ Failed to initialize Python bridge:', error);
            return false;
        }
    }

    /**
     * Call a generic Python function
     */
    static async callPythonFunction(functionName, params = {}) {
        try {
            // Ensure Python is initialized
            if (!this.initialized) {
                await this.initialize();
            }

            if (!PythonBridge) {
                throw new Error('PythonBridge native module not available');
            }

            console.log(`🐍 Calling Python function: ${functionName}`, params);
            const result = await PythonBridge.callPythonFunction(functionName, params);

            // Parse the JSON response
            const parsedResult = JSON.parse(result);

            // Check for errors in the response
            if (parsedResult.error) {
                console.error(`❌ Python function ${functionName} returned error:`, parsedResult.error);
                throw new Error(parsedResult.error);
            }

            return parsedResult;
        } catch (error) {
            console.error(`❌ Error calling Python function ${functionName}:`, error);
            throw error;
        }
    }

    /**
     * Get stream URL for a video ID
     */
    static async getStreamUrl(videoId) {
        try {
            console.log(`🎵 Getting stream URL for video ID: ${videoId}`);
            const result = await this.callPythonFunction('get_stream_url', { video_id: videoId });

            if (result.error) {
                console.error(`❌ Error getting stream URL for ${videoId}:`, result.error);
                return null;
            }

            console.log(`✅ Stream URL fetched successfully for ${videoId}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to get stream URL for ${videoId}:`, error);
            return null;
        }
    }

    /**
     * Search for songs/artists/albums/playlists
     */
    static async search(query, filter = 'songs', limit = 20) {
        try {
            console.log(`🔍 Searching for: ${query} (filter: ${filter}, limit: ${limit})`);
            const result = await this.callPythonFunction('search', {
                query: query,
                filter: filter,
                limit: limit
            });

            // The result should already be an array from Python
            if (Array.isArray(result)) {
                return result;
            }

            console.error('❌ Search returned non-array result:', result);
            return [];
        } catch (error) {
            console.error(`❌ Search error for "${query}":`, error);
            return [];
        }
    }

    /**
     * Get home feed
     */
    static async getHomeFeed(limit = 10, forceRefresh = false) {
        try {
            console.log(`🏠 Getting home feed (limit: ${limit}, forceRefresh: ${forceRefresh})`);
            const result = await this.callPythonFunction('get_home', { limit: limit });

            // The Python function returns a JSON string, which is already parsed by callPythonFunction
            if (Array.isArray(result)) {
                return result;
            }

            console.error('❌ Home feed returned non-array result:', result);
            return [];
        } catch (error) {
            console.error('❌ Home feed error:', error);
            return [];
        }
    }

    /**
     * Get playlist data
     */
    static async getPlaylist(playlistId) {
        try {
            console.log(`📋 Getting playlist: ${playlistId}`);
            const result = await this.callPythonFunction('get_playlist', { playlist_id: playlistId });

            return result;
        } catch (error) {
            console.error(`❌ Playlist error for ${playlistId}:`, error);
            return { error: error.message };
        }
    }

    /**
     * Get album data
     */
    static async getAlbum(albumId) {
        try {
            console.log(`💿 Getting album: ${albumId}`);
            const result = await this.callPythonFunction('get_album', { album_id: albumId });

            return result;
        } catch (error) {
            console.error(`❌ Album error for ${albumId}:`, error);
            return { error: error.message };
        }
    }

    /**
     * Get charts
     */
    static async getCharts(country = 'IN') {
        try {
            console.log(`📊 Getting charts for country: ${country}`);
            const result = await this.callPythonFunction('get_charts', { country: country });

            return result;
        } catch (error) {
            console.error(`❌ Charts error for ${country}:`, error);
            return { videos: [], artists: [], genres: [] };
        }
    }

    /**
     * Get DASH adaptive audio streams for a video
     */
    static async getDashAudio(videoId) {
        try {
            console.log(`🎵 Getting DASH audio streams for video ID: ${videoId}`);
            const result = await this.callPythonFunction('get_dash_audio', { video_id: videoId });

            if (result.error) {
                console.error(`❌ Error getting DASH audio for ${videoId}:`, result.error);
                return null;
            }

            console.log(`✅ DASH audio streams fetched successfully for ${videoId}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to get DASH audio for ${videoId}:`, error);
            return null;
        }
    }

    /**
     * Search and get stream in one call
     */
    static async searchAndStream(songName, artistName = '') {
        try {
            console.log(`🔍🎵 Searching and streaming: ${songName} by ${artistName}`);
            const result = await this.callPythonFunction('search_and_stream', {
                song_name: songName,
                artist_name: artistName
            });

            if (result.error) {
                console.error(`❌ Error in search and stream for "${songName}":`, result.error);
                return null;
            }

            console.log(`✅ Search and stream successful for ${songName}`);
            return result;
        } catch (error) {
            console.error(`❌ Failed to search and stream "${songName}":`, error);
            return null;
        }
    }

    /**
     * Clear Python cache
     */
    static async clearCache() {
        try {
            console.log('🧹 Clearing Python cache...');
            const result = await this.callPythonFunction('clear_cache', {});
            console.log('✅ Python cache cleared');
            return result;
        } catch (error) {
            console.error('❌ Failed to clear Python cache:', error);
            return { error: error.message };
        }
    }

    /**
     * Reset YTMusic session
     */
    static async resetSession() {
        try {
            console.log('🔄 Resetting YTMusic session...');
            const result = await this.callPythonFunction('reset_ytmusic_session', {});
            console.log('✅ YTMusic session reset');
            return result;
        } catch (error) {
            console.error('❌ Failed to reset YTMusic session:', error);
            return { error: error.message };
        }
    }

    /**
     * Get diagnostics
     */
    static async getDiagnostics() {
        try {
            console.log('🔍 Getting Python diagnostics...');
            const result = await this.callPythonFunction('get_diagnostics', {});
            return result;
        } catch (error) {
            console.error('❌ Failed to get diagnostics:', error);
            return { error: error.message };
        }
    }
}

export default PythonBridgeService;
