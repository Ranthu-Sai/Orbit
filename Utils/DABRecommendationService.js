/**
 * DABRecommendationService.js
 * 
 * Intelligent recommendation engine for DAB songs.
 * Uses Last.fm as the "Brain" and MetadataResolver for quality-first playback.
 * 
 * Vibe Maintenance Algorithm:
 * 1. Adaptive Multi-Seed Seeding (1 song = 100%, 2 = 50/50, 3+ = rolling window)
 * 2. Tag Intersection for genre consistency
 * 3. Match score threshold (> 0.7)
 * 4. History exclusion to prevent repetition
 */

import lastFMService from './LastFMService';
import metadataResolver from './MetadataResolver';
import historyManager from './HistoryManager';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Cache key for top played songs (shadow seeds)
const TOP_PLAYED_CACHE_KEY = 'dab_top_played_songs';
const RECOMMENDATION_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

class DABRecommendationService {
    constructor() {
        this.sessionSeeds = []; // Current session's song seeds
        this.sessionTags = [];  // Tags from current session
        this.sessionLanguage = null; // Current session's target language
        this.recentHistory = new Set(); // Recently played IDs
        this.isEnabled = false;
        this.topPlayedSongs = []; // Shadow seeds from history
    }

    /**
     * Initialize the recommendation service
     */
    async initialize() {
        try {
            // Load resolver settings
            await metadataResolver.loadSettings();

            // Load top played songs for cold start
            await this.loadTopPlayedSongs();

            // Load recent history for exclusion
            await this.loadRecentHistory();
        } catch (error) {
            console.error('DABRecommendationService: Init failed', error);
        }
    }

    /**
     * Load top 5 most played songs for "Shadow Seeds" (cold start)
     * @private
     */
    async loadTopPlayedSongs() {
        try {
            const history = await historyManager.getFilteredHistory('mostPlayed');
            if (history && history.length > 0) {
                this.topPlayedSongs = history.slice(0, 5).map(song => ({
                    artist: song.artist,
                    track: song.title,
                    id: song.id
                }));
            }
        } catch (error) {
            console.error('DABRecommendationService: Failed to load top played', error);
        }
    }

    /**
     * Load recent history for exclusion filtering
     * @private
     */
    async loadRecentHistory() {
        try {
            const history = await historyManager.getFilteredHistory('recent');
            if (history && history.length > 0) {
                this.recentHistory = new Set(history.slice(0, 100).map(s => s.id));
            }
        } catch (error) {
            console.error('DABRecommendationService: Failed to load history', error);
        }
    }

    /**
     * Register a song as "played" to update seeds and capture language
     * @param {Object} song - The song that just started playing
     */
    registerSongPlayed(song) {
        if (!song || !song.title || !song.artist) return;

        // Detect language from song metadata
        const detectedLanguage = this._detectLanguage(song);
        if (detectedLanguage) {
            this.sessionLanguage = detectedLanguage;
        }

        // Add to session seeds (max 3 in rolling window)
        this.sessionSeeds.push({
            artist: song.artist,
            track: song.title,
            id: song.id,
            language: detectedLanguage
        });

        // Keep only last 3 seeds
        if (this.sessionSeeds.length > 3) {
            this.sessionSeeds.shift();
        }

        // Add to recent history for exclusion
        if (song.id) {
            this.recentHistory.add(song.id);
        }

        }

    /**
     * Detect language from song metadata
     * @private
     */
    _detectLanguage(song) {
        // Check explicit language field
        if (song.language) {
            return song.language.toLowerCase();
        }

        // Check album name for language hints
        const albumLower = (song.album || '').toLowerCase();
        const titleLower = (song.title || '').toLowerCase();

        // Common language indicators
        const languageHints = {
            'hindi': ['bollywood', 'hindi', 'bhojpuri'],
            'tamil': ['tamil', 'kollywood', 'தமிழ்'],
            'telugu': ['telugu', 'tollywood', 'తెలుగు'],
            'kannada': ['kannada', 'sandalwood', 'ಕನ್ನಡ'],
            'malayalam': ['malayalam', 'mollywood', 'മലയാളം'],
            'punjabi': ['punjabi', 'ਪੰਜਾਬੀ'],
            'bengali': ['bengali', 'bangla', 'বাংলা'],
            'marathi': ['marathi', 'मराठी'],
            'gujarati': ['gujarati', 'ગુજરાતી'],
        };

        for (const [lang, hints] of Object.entries(languageHints)) {
            if (hints.some(h => albumLower.includes(h) || titleLower.includes(h))) {
                return lang;
            }
        }

        // Default to hindi for Indian Bollywood songs (common case)
        return null;
    }

    /**
     * Check if a song matches the current session language filter
     * @private
     */
    _matchesLanguageFilter(song, targetLanguage) {
        if (!targetLanguage) return true; // No filter if language unknown

        const songLanguage = this._detectLanguage(song);

        // Hindi allows Hindi + English
        if (targetLanguage === 'hindi') {
            return !songLanguage || songLanguage === 'hindi';
        }

        // Other Indian languages: strict same-language filter
        return !songLanguage || songLanguage === targetLanguage;
    }

    /**
     * Get recommendations based on current session vibe
     * @param {number} count - Number of recommendations to fetch
     * @returns {Promise<Array<Object>>} - Resolved playable song objects
     */
    async getRecommendations(count = 10) {
        // Determine seeds based on session state
        const seeds = this.getActiveSeeds();
        if (seeds.length === 0) {
            return [];
        }

        // Collect recommendations from all seeds
        const allRecommendations = [];
        const seenTracks = new Set();

        for (const seed of seeds) {
            try {
                const similar = await lastFMService.getSimilarTracks(seed.artist, seed.track, 30);

                for (const rec of similar) {
                    const key = `${rec.artist.toLowerCase()}-${rec.track.toLowerCase()}`;

                    // Skip duplicates only (lower threshold for more variety)
                    if (seenTracks.has(key)) continue;
                    seenTracks.add(key);

                    allRecommendations.push(rec);
                }
            } catch (error) {
                console.error(`🧠 DABRecs: Failed to get similar for ${seed.track}`, error);
            }
        }

        // Sort by match score
        allRecommendations.sort((a, b) => b.match - a.match);

        // Filter by match threshold (> 0.1 for maximum variety)
        const filtered = allRecommendations.filter(r => r.match >= 0.1);
        // SEQUENTIAL RESOLUTION: Process one at a time with delays to avoid rate limits
        const resolved = [];
        const albumCounts = {};  // Track album counts for diversity
        const artistCounts = {}; // Track artist counts for diversity (max 2 per artist)
        const DELAY_MS = 200; // Delay between DAB API calls to avoid rate limiting

        const toResolve = filtered.slice(0, count * 3); // Extra to account for failures

        for (const rec of toResolve) {
            if (resolved.length >= count) break;

            try {
                const result = await metadataResolver.resolve(rec.artist, rec.track);

                if (result && result.song) {
                    const songId = result.song.id || result.song.videoId;

                    // Skip if in recent history
                    if (this.recentHistory.has(songId)) continue;

                    // LANGUAGE filter check - only allow matching language songs
                    if (!this._matchesLanguageFilter(result.song, this.sessionLanguage)) {
                        continue;
                    }

                    // ARTIST diversity check - max 2 songs per artist
                    const artistKey = (result.song.artist || rec.artist || '').toLowerCase();
                    const currentArtistCount = artistCounts[artistKey] || 0;
                    if (currentArtistCount >= 2) {
                        continue;
                    }

                    // ALBUM diversity check - max 2 songs per album
                    const albumId = result.song.albumId || result.song.album || 'unknown';
                    const currentAlbumCount = albumCounts[albumId] || 0;
                    if (currentAlbumCount >= 2) {
                        continue;
                    }

                    // Track counts
                    artistCounts[artistKey] = currentArtistCount + 1;
                    albumCounts[albumId] = currentAlbumCount + 1;

                    resolved.push({
                        ...result.song,
                        // CRITICAL: Set sourceType for queue UI compatibility
                        sourceType: 'online',
                        isRecommendation: true,
                        recommendationSource: 'lastfm',
                        matchScore: rec.match
                    });
                }

                // Add delay between resolutions to avoid rate limiting
                if (resolved.length < count) {
                    await new Promise(resolve => setTimeout(resolve, DELAY_MS));
                }
            } catch (e) {
            }
        }

        const uniqueArtists = Object.keys(artistCounts).length;
        const uniqueAlbums = Object.keys(albumCounts).length;
        return resolved;
    }

    /**
     * Get active seeds based on session state (Adaptive Seeding)
     * @private
     */
    getActiveSeeds() {
        const sessionCount = this.sessionSeeds.length;

        if (sessionCount === 0) {
            // Cold Start: Use top played songs as shadow seeds
            return this.topPlayedSongs.slice(0, 3);
        } else if (sessionCount === 1) {
            // Single seed: 100% weight on current, supplement with shadow seeds
            return [...this.sessionSeeds, ...this.topPlayedSongs.slice(0, 2)];
        } else if (sessionCount === 2) {
            // Two seeds: 50/50 weight
            return this.sessionSeeds;
        } else {
            // 3+ seeds: Rolling window of last 3
            return this.sessionSeeds.slice(-3);
        }
    }

    /**
     * Reset session state (on queue clear or app restart)
     */
    reset() {
        this.sessionSeeds = [];
        this.sessionTags = [];
    }

    /**
     * Enable or disable the recommendation service
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
    }
}

// Singleton instance
const dabRecommendationService = new DABRecommendationService();
export default dabRecommendationService;
