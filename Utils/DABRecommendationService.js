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

            console.log('🧠 DABRecommendationService: Initialized');
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
                console.log(`🧠 Loaded ${this.topPlayedSongs.length} shadow seeds`);
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
                console.log(`🧠 Loaded ${this.recentHistory.size} recent songs for exclusion`);
            }
        } catch (error) {
            console.error('DABRecommendationService: Failed to load history', error);
        }
    }

    /**
     * Register a song as "played" to update seeds
     * @param {Object} song - The song that just started playing
     */
    registerSongPlayed(song) {
        if (!song || !song.title || !song.artist) return;

        // Add to session seeds (max 3 in rolling window)
        this.sessionSeeds.push({
            artist: song.artist,
            track: song.title,
            id: song.id
        });

        // Keep only last 3 seeds
        if (this.sessionSeeds.length > 3) {
            this.sessionSeeds.shift();
        }

        // Add to recent history for exclusion
        if (song.id) {
            this.recentHistory.add(song.id);
        }

        console.log(`🧠 DABRecs: Registered seed "${song.title}" (${this.sessionSeeds.length} seeds)`);
    }

    /**
     * Get recommendations based on current session vibe
     * @param {number} count - Number of recommendations to fetch
     * @returns {Promise<Array<Object>>} - Resolved playable song objects
     */
    async getRecommendations(count = 10) {
        console.log(`🧠 DABRecs: Fetching ${count} recommendations...`);

        // Determine seeds based on session state
        const seeds = this.getActiveSeeds();
        if (seeds.length === 0) {
            console.log('🧠 DABRecs: No seeds available');
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

        console.log(`🧠 DABRecs: Got ${filtered.length} unique recommendations`);

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

                    // ARTIST diversity check - max 2 songs per artist
                    const artistKey = (result.song.artist || rec.artist || '').toLowerCase();
                    const currentArtistCount = artistCounts[artistKey] || 0;
                    if (currentArtistCount >= 2) {
                        console.log(`🧠 DABRecs: Skipping "${rec.track}" (artist diversity limit)`);
                        continue;
                    }

                    // ALBUM diversity check - max 2 songs per album
                    const albumId = result.song.albumId || result.song.album || 'unknown';
                    const currentAlbumCount = albumCounts[albumId] || 0;
                    if (currentAlbumCount >= 2) {
                        console.log(`🧠 DABRecs: Skipping "${rec.track}" (album diversity limit)`);
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
                console.log(`🧠 DABRecs: Failed to resolve "${rec.track}":`, e.message);
            }
        }

        const uniqueArtists = Object.keys(artistCounts).length;
        const uniqueAlbums = Object.keys(albumCounts).length;
        console.log(`🧠 DABRecs: Resolved ${resolved.length} songs from ${uniqueArtists} artists, ${uniqueAlbums} albums`);
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
            console.log('🧠 DABRecs: Cold Start - using shadow seeds');
            return this.topPlayedSongs.slice(0, 3);
        } else if (sessionCount === 1) {
            // Single seed: 100% weight on current, supplement with shadow seeds
            console.log('🧠 DABRecs: 1 seed - supplementing with shadows');
            return [...this.sessionSeeds, ...this.topPlayedSongs.slice(0, 2)];
        } else if (sessionCount === 2) {
            // Two seeds: 50/50 weight
            console.log('🧠 DABRecs: 2 seeds - balanced');
            return this.sessionSeeds;
        } else {
            // 3+ seeds: Rolling window of last 3
            console.log('🧠 DABRecs: 3+ seeds - rolling window');
            return this.sessionSeeds.slice(-3);
        }
    }

    /**
     * Reset session state (on queue clear or app restart)
     */
    reset() {
        this.sessionSeeds = [];
        this.sessionTags = [];
        console.log('🧠 DABRecs: Session reset');
    }

    /**
     * Enable or disable the recommendation service
     */
    setEnabled(enabled) {
        this.isEnabled = enabled;
        console.log(`🧠 DABRecs: ${enabled ? 'Enabled' : 'Disabled'}`);
    }
}

// Singleton instance
const dabRecommendationService = new DABRecommendationService();
export default dabRecommendationService;
