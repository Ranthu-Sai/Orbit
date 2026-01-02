/**
 * LocalRecommendationService.js
 * 
 * Implements OuterTune-style "Quick Picks" by generating recommendations locally
 * based on the user's recent listening history.
 * 
 * Strategy:
 * 1. Get last N played songs from HistoryManager (local DB)
 * 2. Fetch "Up Next" / "Radio" for these songs using InnerTube API
 * 3. Aggregate results, deduplicate, and shuffle
 * 4. Cache results to avoid API spam
 * 
 * This provides highly personalized recommendations even if YouTube's server-side
 * visitorData/personalization is lagging or generic.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import historyManager from './HistoryManager';
import InnerTubeClient from '../Api/InnertubeClient';

const CACHE_KEY = 'orbit_local_quick_picks';
const CACHE_EXPIRY = 1000 * 60 * 60 * 2; // 2 hours (reduced API calls while maintaining freshness)
const SEED_SONGS_COUNT = 5; // Use last 5 songs as seeds
const MIN_SONGS_PER_SEED = 5;

class LocalRecommendationService {

    /**
     * Get Quick Picks based on local history
     * Returns: Array of Song objects
     */
    async getQuickPicks(forceRefresh = false) {
        try {
            // Check cache first
            if (!forceRefresh) {
                const cached = await this.getFromCache();
                if (cached) {
                    return cached;
                }
            }
            // 1. Get recent history
            const history = await historyManager.getFilteredHistory('recent');
            if (!history || history.length === 0) {
                return [];
            }

            // Get unique video IDs from history, limited to SEED_SONGS_COUNT
            const recentSongs = history
                .filter(item => item.id && (item.sourceType === 'ytmusic' || item.sourceType === 'online'))
                // Filter out duplicate IDs in history itself
                .filter((item, index, self) => index === self.findIndex(t => t.id === item.id))
                .slice(0, SEED_SONGS_COUNT);

            if (recentSongs.length === 0) {
                return [];
            }
            // 2. Fetch "Up Next" for each seed song in parallel
            // We use getNext(videoId) which returns the radio/mix for that song
            const promises = recentSongs.map(song =>
                InnerTubeClient.getNext(song.id)
                    .catch(e => {
                        return null;
                    })
            );

            const results = await Promise.all(promises);

            // 3. Aggregate and deduplicate
            const validResults = results.filter(r => r && r.items && r.items.length > 0);

            if (validResults.length === 0) {
                return [];
            }

            // Dynamic distribution: If we have few seeds, take more from each to fill the grid
            // Target ~20 songs total. We use 24 to be safe (divisible by 4).
            const songsToTakePerSeed = Math.ceil(24 / validResults.length);
            let aggregatedSongs = [];
            const seenIds = new Set();

            // Add seed songs themselves to seen set so we don't recommend what was just played
            recentSongs.forEach(s => seenIds.add(s.id));

            validResults.forEach(result => {
                // Take songs from each radio result based on dynamic count
                const candidates = result.items.slice(0, songsToTakePerSeed);

                candidates.forEach(song => {
                    const id = song.videoId || song.id;
                    if (id && !seenIds.has(id)) {
                        seenIds.add(id);
                        aggregatedSongs.push(song);
                    }
                });
            });

            // 4. Shuffle the results
            aggregatedSongs = this.shuffleArray(aggregatedSongs);

            // Limit total to 20 (4 columns * 5 rows or 5 cols * 4 rows)
            const targetCount = 20;
            aggregatedSongs = aggregatedSongs.slice(0, targetCount);
            // 5. Cache results
            await this.saveToCache(aggregatedSongs);

            return aggregatedSongs;

        } catch (error) {
            console.error('LocalRecommendationService error:', error);
            return [];
        }
    }

    /**
     * Fisher-Yates Shuffle
     */
    shuffleArray(array) {
        const arr = [...array];
        for (let i = arr.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [arr[i], arr[j]] = [arr[j], arr[i]];
        }
        return arr;
    }

    async getFromCache() {
        try {
            const data = await AsyncStorage.getItem(CACHE_KEY);
            if (!data) return null;

            const parsed = JSON.parse(data);
            if (Date.now() - parsed.timestamp > CACHE_EXPIRY) {
                return null; // Expired
            }
            return parsed.songs;
        } catch (e) {
            return null;
        }
    }

    async saveToCache(songs) {
        try {
            await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
                timestamp: Date.now(),
                songs: songs
            }));
        } catch (e) { }
    }

    async clearCache() {
        try {
            await AsyncStorage.removeItem(CACHE_KEY);
        } catch (e) { }
    }
}

const localRecommendationService = new LocalRecommendationService();
export default localRecommendationService;
