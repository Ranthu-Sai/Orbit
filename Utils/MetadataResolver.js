/**
 * MetadataResolver.js
 * 
 * Resolves Last.fm recommendation metadata to playable streams.
 * Implements Quality-First hierarchy: DAB (FLAC) -> Saavn (320kbps) -> YTMusic (160kbps)
 * 
 * Used by the recommendation system to find the best quality source for each song.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import dabMusicService from './DabMusicService';
import { getSearchSongData } from '../Api/Songs';
import { getYTMusicSearchSongData } from '../Api/YTMusic';

// Settings keys
const STRICT_FLAC_KEY = 'dab_strict_flac_mode';

class MetadataResolver {
    constructor() {
        this.strictFlacMode = false;
    }

    /**
     * Load user preference for strict FLAC mode
     */
    async loadSettings() {
        try {
            const strictFlac = await AsyncStorage.getItem(STRICT_FLAC_KEY);
            this.strictFlacMode = strictFlac === 'true';
        } catch (error) {
            console.error('MetadataResolver: Failed to load settings', error);
        }
    }

    /**
     * Set strict FLAC mode
     * @param {boolean} enabled - If true, skip songs not available on DAB
     */
    async setStrictFlacMode(enabled) {
        this.strictFlacMode = enabled;
        await AsyncStorage.setItem(STRICT_FLAC_KEY, enabled ? 'true' : 'false');
    }

    /**
     * Get current strict FLAC mode setting
     */
    isStrictFlacMode() {
        return this.strictFlacMode;
    }

    /**
     * Resolve metadata to a playable song object
     * Follows quality hierarchy: DAB -> Saavn -> YTMusic
     * 
     * @param {string} artist - Artist name
     * @param {string} track - Track name  
     * @returns {Promise<{song: Object, source: string}|null>}
     */
    async resolve(artist, track) {
        // 1. Try DAB first (FLAC quality)
        const dabResult = await this.searchDAB(artist, track);
        if (dabResult) {
            return { song: dabResult, source: 'dab' };
        }

        // If strict FLAC mode is enabled, skip this song
        if (this.strictFlacMode) {
            return null;
        }

        // 2. Try Saavn (320kbps)
        const saavnResult = await this.searchSaavn(artist, track);
        if (saavnResult) {
            return { song: saavnResult, source: 'saavn' };
        }

        // 3. Fallback to YTMusic (160kbps)
        const ytResult = await this.searchYTMusic(artist, track);
        if (ytResult) {
            return { song: ytResult, source: 'ytmusic' };
        }
        return null;
    }

    /**
     * Search on DAB Music (FLAC source)
     * @private
     */
    async searchDAB(artist, track) {
        try {
            // Check if user is authenticated with DAB
            if (!dabMusicService.isAuthenticated()) {
                return null;
            }

            const query = `${track} ${artist}`;
            const results = await dabMusicService.searchTracks(query, 5);

            if (results && results.length > 0) {
                // Find best match
                const match = this.findBestMatch(results, artist, track);
                if (match) {
                    return {
                        ...match,
                        sourceType: 'dab',
                        qualityLabel: match.qualityLabel || 'FLAC'
                    };
                }
            }
        } catch (error) {
            if (error.message === 'AUTH_REQUIRED') {
            } else {
                console.error('MetadataResolver: DAB search failed', error);
            }
        }
        return null;
    }

    /**
     * Search on JioSaavn (320kbps source)
     * @private
     */
    async searchSaavn(artist, track) {
        try {
            const query = `${track} ${artist}`;
            const response = await getSearchSongData(query, 1, 5);

            if (response?.success && response?.data?.results?.length > 0) {
                const results = response.data.results;
                const match = this.findBestMatch(results, artist, track, 'saavn');

                if (match) {
                    return {
                        ...match,
                        sourceType: 'saavn',
                        qualityLabel: '320kbps'
                    };
                }
            }
        } catch (error) {
            console.error('MetadataResolver: Saavn search failed', error);
        }
        return null;
    }

    /**
     * Search on YouTube Music (160kbps fallback)
     * @private
     */
    async searchYTMusic(artist, track) {
        try {
            const query = `${track} ${artist}`;
            const response = await getYTMusicSearchSongData(query, 1, 5);

            if (response?.success && response?.data?.results?.length > 0) {
                const results = response.data.results;
                const match = this.findBestMatch(results, artist, track, 'ytmusic');

                if (match) {
                    return {
                        id: match.id || match.videoId,
                        videoId: match.id || match.videoId,
                        title: match.title || match.name,
                        artist: match.artist || match.primaryArtists,
                        artwork: match.artwork || match.image?.[0]?.url,
                        duration: match.duration,
                        sourceType: 'ytmusic',
                        source: 'ytmusic',
                        isYTMusic: true,
                        qualityLabel: 'Opus 160kbps'
                    };
                }
            }
        } catch (error) {
            console.error('MetadataResolver: YTMusic search failed', error);
        }
        return null;
    }

    /**
     * Find the best matching result from search results
     * @private
     */
    findBestMatch(results, artist, track, source = 'dab') {
        const normalizedArtist = this.normalize(artist);
        const normalizedTrack = this.normalize(track);

        for (const result of results) {
            const resultTitle = this.normalize(result.title || result.name || '');
            const resultArtist = this.normalize(
                result.artist ||
                result.primaryArtists ||
                result.artists?.primary?.[0]?.name ||
                ''
            );

            // Check if title and artist are similar enough
            const titleMatch = resultTitle.includes(normalizedTrack) ||
                normalizedTrack.includes(resultTitle) ||
                this.similarity(resultTitle, normalizedTrack) > 0.7;

            const artistMatch = resultArtist.includes(normalizedArtist) ||
                normalizedArtist.includes(resultArtist) ||
                this.similarity(resultArtist, normalizedArtist) > 0.6;

            if (titleMatch && artistMatch) {
                return result;
            }
        }

        // If no good match, return first result as fallback
        return results.length > 0 ? results[0] : null;
    }

    /**
     * Normalize string for comparison
     * @private
     */
    normalize(str) {
        return str
            .toLowerCase()
            .replace(/[^\w\s]/g, '')
            .replace(/\s+/g, ' ')
            .trim();
    }

    /**
     * Simple similarity score between two strings
     * @private
     */
    similarity(s1, s2) {
        if (s1 === s2) return 1;
        if (s1.length === 0 || s2.length === 0) return 0;

        const longer = s1.length > s2.length ? s1 : s2;
        const shorter = s1.length > s2.length ? s2 : s1;

        const longerLength = longer.length;
        if (longerLength === 0) return 1.0;

        const editDistance = this.levenshteinDistance(longer, shorter);
        return (longerLength - editDistance) / longerLength;
    }

    /**
     * Levenshtein distance for string similarity
     * @private
     */
    levenshteinDistance(s1, s2) {
        const m = s1.length;
        const n = s2.length;
        const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));

        for (let i = 0; i <= m; i++) dp[i][0] = i;
        for (let j = 0; j <= n; j++) dp[0][j] = j;

        for (let i = 1; i <= m; i++) {
            for (let j = 1; j <= n; j++) {
                if (s1[i - 1] === s2[j - 1]) {
                    dp[i][j] = dp[i - 1][j - 1];
                } else {
                    dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
                }
            }
        }

        return dp[m][n];
    }
}

// Singleton instance
const metadataResolver = new MetadataResolver();
export default metadataResolver;
