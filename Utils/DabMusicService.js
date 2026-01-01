/**
 * DAB Music Service - Production-Ready Implementation
 * Handles search and streaming for DAB Music API
 * 
 * @module DabMusicService
 * @description Modular, clean service layer for DAB Music integration
 * CACHING: Stream URLs are cached for 3 hours via NavigationCacheManager
 */

import axios from 'axios';
import { ToastAndroid } from 'react-native';
import DabAuthService from './DabAuthService';
import { CacheManager } from './NavigationCacheManager';

// Configuration
const DAB_API_BASE = 'https://dabmusic.xyz/api';
const REQUEST_TIMEOUT = 15000;
const MAX_RETRIES = 2;

/**
 * DAB Music Service Class
 * Singleton pattern for consistent state management
 */
class DabMusicService {
    constructor() {
        this.isInitialized = false;
        this.searchCache = new Map();
        this.streamCache = new Map();
        this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    }

    /**
     * Initialize the service
     */
    async initialize() {
        if (this.isInitialized) return;

        try {
            await DabAuthService.init();
            this.isInitialized = true;
            console.log('✅ DAB Music Service initialized');
        } catch (error) {
            console.error('❌ DAB Service initialization failed:', error);
        }
    }

    /**
     * Check if user is authenticated
     * @returns {boolean}
     */
    isAuthenticated() {
        return DabAuthService.isAuth();
    }

    /**
     * Get current user
     * @returns {Object|null}
     */
    getCurrentUser() {
        return DabAuthService.getUser();
    }

    /**
     * Search for tracks with caching - AUTH REQUIRED
     * @param {string} query - Search query
     * @param {number} limit - Results limit (1-50)
     * @returns {Promise<Array>} Transformed tracks array
     */
    async searchTracks(query, limit = 20) {
        if (!query || query.length < 2) {
            return [];
        }

        // Check authentication - DAB requires login
        if (!this.isAuthenticated()) {
            throw new Error('AUTH_REQUIRED');
        }

        // Check cache first
        const cacheKey = `search_${query}_${limit}`;
        const cached = this._getFromCache(this.searchCache, cacheKey);
        if (cached) {
            console.log('🎯 Using cached DAB search results');
            return cached;
        }

        try {
            console.log(`🔍 Searching DAB for: "${query}"`);

            const response = await axios.get(`${DAB_API_BASE}/search`, {
                params: {
                    q: query,
                    type: 'track',
                    limit: Math.min(limit, 50)
                },
                timeout: REQUEST_TIMEOUT,
                withCredentials: true, // Important for authenticated requests
            });

            const tracks = response.data?.tracks || [];
            const transformed = tracks.map(this._transformTrack.bind(this));

            // Cache results
            this._setInCache(this.searchCache, cacheKey, transformed);

            console.log(`✅ Found ${transformed.length} DAB tracks`);
            return transformed;
        } catch (error) {
            console.error('❌ DAB search error:', error.message);
            this._handleError(error, 'Search failed');
            return [];
        }
    }

    /**
     * Search for albums with caching - AUTH REQUIRED
     * @param {string} query - Search query
     * @param {number} limit - Results limit (1-50)
     * @returns {Promise<Array>} Transformed albums array
     */
    async searchAlbums(query, limit = 20) {
        if (!query || query.length < 2) {
            return [];
        }

        if (!this.isAuthenticated()) {
            throw new Error('AUTH_REQUIRED');
        }

        const cacheKey = `album_search_${query}_${limit}`;
        const cached = this._getFromCache(this.searchCache, cacheKey);
        if (cached) {
            console.log('🎯 Using cached DAB album search results');
            return cached;
        }

        try {
            console.log(`🔍 Searching DAB albums for: "${query}"`);

            const response = await axios.get(`${DAB_API_BASE}/search`, {
                params: {
                    q: query,
                    type: 'album',
                    offset: 0,
                    limit: Math.min(limit, 50)
                },
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            });

            const albums = response.data?.albums || [];
            const transformed = albums.map(this._transformAlbum.bind(this));

            this._setInCache(this.searchCache, cacheKey, transformed);

            console.log(`✅ Found ${transformed.length} DAB albums`);
            return transformed;
        } catch (error) {
            console.error('❌ DAB album search error:', error.message);
            this._handleError(error, 'Album search failed');
            return [];
        }
    }

    /**
     * Get album details with tracks - AUTH REQUIRED
     * @param {string} albumId - Album ID
     * @returns {Promise<Object>} Album details with tracks
     */
    async getAlbumDetails(albumId) {
        if (!albumId) {
            throw new Error('Album ID is required');
        }

        if (!this.isAuthenticated()) {
            throw new Error('AUTH_REQUIRED');
        }

        const cacheKey = `album_details_${albumId}`;
        const cached = this._getFromCache(this.searchCache, cacheKey);
        if (cached) {
            console.log('🎯 Using cached DAB album details');
            return cached;
        }

        try {
            console.log(`📀 Getting DAB album details: ${albumId}`);

            const response = await axios.get(`${DAB_API_BASE}/album`, {
                params: { albumId },
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            });

            const albumData = response.data;
            const transformed = this._transformAlbumDetails(albumData);

            // Cache for 30 minutes
            this._setInCache(this.searchCache, cacheKey, transformed, 30 * 60 * 1000);

            console.log(`✅ Got DAB album: "${transformed.name}" with ${transformed.songs?.length || 0} tracks`);
            return transformed;
        } catch (error) {
            console.error('❌ DAB album details error:', error.message);
            this._handleError(error, 'Failed to get album details');
            throw error;
        }
    }

    /**
     * Get highest quality streaming URL for a track
     * @param {string} trackId - Track ID
     * @returns {Promise<string>} Stream URL
     */
    async getStreamUrl(trackId) {
        if (!trackId) {
            throw new Error('Track ID is required');
        }

        // CHECK CENTRALIZED CACHE FIRST (Hybrid: RAM -> Disk)
        const cachedData = await CacheManager.getStreamUrlAsync(trackId, 'dab');
        if (cachedData && cachedData.url) {
            console.log(`🚀 [Cache] DAB stream URL cache HIT for ${trackId} (format: ${cachedData.format})`);
            return cachedData.url;
        }

        try {
            console.log(`🎵 Getting stream URL for track: ${trackId}`);

            // Get authentication token
            const user = this.getCurrentUser();
            console.log('Current user:', user);

            // Request highest quality (you can make this configurable)
            const quality = '27'; // Default quality code

            // Build headers with auth token if available
            const headers = { 'Content-Type': 'application/json' };
            const sessionToken = await DabAuthService.getSessionToken();
            const token = user?.token || sessionToken;

            if (token) {
                headers['Authorization'] = `Bearer ${token}`;
                console.log('✅ Added auth token to stream request');
            } else {
                console.log('ℹ️ No auth token found for stream request (using cookies)');
            }

            const response = await axios.get(`${DAB_API_BASE}/stream`, {
                params: {
                    trackId,
                    quality
                },
                headers,
                timeout: REQUEST_TIMEOUT,
                withCredentials: true,
            });

            console.log('📦 Full stream API response:', JSON.stringify(response.data, null, 2));
            console.log('Response status:', response.status);

            // API returns "url" not "streamUrl"
            const streamUrl = response.data?.url;

            if (!streamUrl) {
                console.error('❌ No url in response. Response data:', response.data);
                throw new Error('No stream URL returned');
            }

            // CACHE THE URL with 3-hour TTL via NavigationCacheManager with format metadata
            // DAB provides FLAC files
            CacheManager.setStreamUrl(trackId, streamUrl, 'dab', {
                format: 'flac',
                mimeType: 'audio/flac',
            });
            console.log(`📦 [Cache] DAB stream URL cached for ${trackId} (format: flac, 3-hour TTL)`);

            console.log('✅ Got DAB stream URL');
            return streamUrl;
        } catch (error) {
            console.error('❌ DAB stream URL error:', error.message);
            if (error.response) {
                console.error('Error response data:', error.response.data);
                console.error('Error response status:', error.response.status);
            }
            this._handleError(error, 'Failed to get stream URL');
            throw error;
        }
    }

    /**
     * Transform DAB track to app format (Saavn-like)
     * @private
     */
    _transformTrack(track) {
        const imageArray = track.albumCover ? [
            { url: track.albumCover, quality: '50x50' },
            { url: track.albumCover, quality: '150x150' },
            { url: track.albumCover, quality: '500x500' }
        ] : [{
            url: 'https://via.placeholder.com/150',
            quality: '150x150'
        }];

        return {
            id: String(track.id),
            name: track.title,
            title: track.title,
            subtitle: track.artist || 'Unknown Artist',
            type: 'song',
            source: 'dab',
            isDabTrack: true, // Marker for easy detection
            image: imageArray,
            artist: track.artist || 'Unknown Artist',
            artists: {
                primary: track.artist ? [{ name: track.artist, id: track.artistId }] : []
            },
            duration: track.duration || 0,
            language: 'unknown',
            year: track.releaseDate ? track.releaseDate.split('-')[0] : '',
            albumId: String(track.albumId || ''),
            album: track.albumTitle || '',
            genre: track.genre || '',
            downloadUrl: String(track.id), // Store ID for streaming
            url: '', // Will be populated when playing
            artwork: imageArray[imageArray.length - 1]?.url, // Highest quality for player
            // DAB-specific metadata
            audioQuality: track.audioQuality || null,
            isHiRes: track.audioQuality?.isHiRes || false,
            maximumBitDepth: track.audioQuality?.maximumBitDepth || null,
            maximumSamplingRate: track.audioQuality?.maximumSamplingRate || null,
            qualityLabel: this._getQualityLabel(track.audioQuality),
        };
    }

    /**
     * Get quality label for track
     * @private
     */
    _getQualityLabel(audioQuality) {
        if (!audioQuality) return 'FLAC';

        const { isHiRes, maximumBitDepth, maximumSamplingRate } = audioQuality;

        if (isHiRes && maximumBitDepth && maximumSamplingRate) {
            return `Hi-Res ${maximumBitDepth}bit/${maximumSamplingRate}kHz`;
        }

        if (maximumBitDepth && maximumSamplingRate) {
            return `FLAC ${maximumBitDepth}bit/${maximumSamplingRate}kHz`;
        }

        return 'FLAC';
    }

    /**
     * Transform DAB album for search results
     * @private
     */
    _transformAlbum(album) {
        const imageUrl = album.cover || album.albumCover || '';
        const imageArray = imageUrl ? [
            { url: imageUrl, quality: '50x50' },
            { url: imageUrl, quality: '150x150' },
            { url: imageUrl, quality: '500x500' }
        ] : [{ url: 'https://via.placeholder.com/150', quality: '150x150' }];

        return {
            id: String(album.id),
            name: album.title || album.name || 'Unknown Album',
            title: album.title || album.name || 'Unknown Album',
            type: 'album',
            source: 'dab',
            isDabAlbum: true,
            image: imageArray,
            artist: album.artist || 'Unknown Artist',
            artistName: album.artist || 'Unknown Artist',
            year: album.releaseDate ? album.releaseDate.split('-')[0] : '',
            songCount: album.trackCount || album.numberOfTracks || 0,
            // DAB-specific metadata
            isHiRes: album.audioQuality?.isHiRes || false,
            qualityLabel: this._getQualityLabel(album.audioQuality),
            totalDuration: album.duration || 0, // Total duration in seconds
        };
    }

    /**
     * Transform DAB album details (full album with tracks)
     * @private
     */
    _transformAlbumDetails(albumData) {
        console.log('📀 [DAB] Raw album API response:', JSON.stringify(albumData, null, 2).substring(0, 500));

        // DAB API wraps album data in an "album" property
        const album = albumData.album || albumData;
        console.log(`📀 [DAB] Extracted album: ${album.title}, tracks: ${album.tracks?.length || 0}`);
        // DAB API may use different field names: cover/albumCover, title/name, tracks/items
        const imageUrl = album.cover || album.albumCover || album.image || '';
        const imageArray = imageUrl ? [
            { url: imageUrl, quality: '50x50' },
            { url: imageUrl, quality: '150x150' },
            { url: imageUrl, quality: '500x500' }
        ] : [{ url: 'https://via.placeholder.com/150', quality: '150x150' }];

        // DAB API may return 'items' or 'tracks' for the song list
        const rawTracks = album.tracks || album.items || album.songs || [];
        console.log(`📀 [DAB] Found ${rawTracks.length} tracks in album`);

        // Transform tracks
        const tracks = rawTracks.map((track) => this._transformTrack({
            ...track,
            albumCover: imageUrl, // Ensure album cover is passed to tracks
            albumTitle: album.title || album.name,
            albumId: album.id,
        }));

        // Calculate total duration from tracks if not provided
        let totalDuration = album.duration || 0;
        if (!totalDuration && tracks.length > 0) {
            totalDuration = tracks.reduce((sum, t) => sum + (t.duration || 0), 0);
        }

        // DAB may use 'name' instead of 'title' for album name
        const albumTitle = album.title || album.name || 'Unknown Album';
        // DAB may use 'artists' array or 'artist' string
        let artistName = album.artist || 'Unknown Artist';
        if (!artistName && album.artists && Array.isArray(album.artists)) {
            artistName = album.artists.map(a => a.name || a).join(', ');
        }

        // Extract quality info - from album level or first track
        let audioQuality = album.audioQuality || album.quality;
        if (!audioQuality && rawTracks.length > 0 && rawTracks[0].audioQuality) {
            audioQuality = rawTracks[0].audioQuality;
        }
        const isHiRes = audioQuality?.isHiRes || audioQuality?.hi_res || album.hires || false;
        const qualityLabel = this._getQualityLabel(audioQuality);

        return {
            id: String(album.id),
            name: albumTitle,
            title: albumTitle,
            type: 'album',
            source: 'dab',
            isDabAlbum: true,
            image: imageArray,
            artist: artistName,
            artistName: artistName,
            year: album.releaseDate ? album.releaseDate.split('-')[0] : '',
            releaseDate: album.releaseDate || '',
            songCount: tracks.length,
            // Enhanced DAB metadata for header
            isHiRes: isHiRes,
            qualityLabel: qualityLabel,
            totalDuration: totalDuration, // Total duration in seconds
            // Songs array for album page
            songs: tracks,
            data: { songs: tracks }, // For compatibility with existing code
        };
    }

    /**
     * Get from cache if not expired
     * @private
     */
    _getFromCache(cache, key) {
        const cached = cache.get(key);
        if (cached && Date.now() - cached.timestamp < cached.timeout) {
            return cached.data;
        }
        cache.delete(key);
        return null;
    }

    /**
     * Set in cache with timestamp
     * @private
     */
    _setInCache(cache, key, data, timeout = this.cacheTimeout) {
        cache.set(key, {
            data,
            timestamp: Date.now(),
            timeout
        });
    }

    /**
     * Handle API errors
     * @private
     */
    _handleError(error, userMessage) {
        if (error.response) {
            const status = error.response.status;
            if (status === 401) {
                console.log('⚠️ DAB authentication required');
            } else if (status === 404) {
                console.log('⚠️ DAB resource not found');
            } else if (status === 429) {
                ToastAndroid.show('Rate limited. Please wait...', ToastAndroid.SHORT);
            }
        } else if (error.request) {
            console.log('⚠️ DAB network error');
            ToastAndroid.show('Network error. Check connection.', ToastAndroid.SHORT);
        }
    }

    /**
     * Clear all caches
     */
    clearCache() {
        this.searchCache.clear();
        this.streamCache.clear();
        console.log('🗑️ DAB caches cleared');
    }

    /**
     * Get cache stats for debugging
     */
    getCacheStats() {
        return {
            searchCacheSize: this.searchCache.size,
            streamCacheSize: this.streamCache.size,
        };
    }
}

// Export singleton instance
const dabMusicService = new DabMusicService();

export default dabMusicService;
