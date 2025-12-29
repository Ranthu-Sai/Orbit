/**
 * ListeningHistoryService.js
 * 
 * Tracks user's listening history for personalization.
 * After a certain number of songs are played, invalidates the home feed cache
 * to refresh Quick Picks with more personalized recommendations.
 * 
 * This works like OuterTune's personalization - as the user listens to songs,
 * YouTube's visitorData is updated server-side, and we refresh the home feed
 * to get updated personalized recommendations.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import TrackPlayer, { Event } from 'react-native-track-player';
import { debounce } from './EventDebouncer';
import YouTubeMusicService from './YouTubeMusicService';

// Keys for AsyncStorage
const LISTENING_SESSION_KEY = 'ytmusic_listening_session';
const HOME_FEED_CACHE_KEY = 'ytmusic_home_feed_full_v6';
const SONGS_UNTIL_REFRESH = 1; // Refresh after every song for instant personalization (OuterTune style)

class ListeningHistoryService {
    constructor() {
        this.sessionPlayCount = 0;
        this.isInitialized = false;
        this.lastPlayedSongId = null;
        this.subscribers = new Set();
    }

    /**
     * Initialize the service and start listening for track changes
     */
    async initialize() {
        if (this.isInitialized) {
            return;
        }

        console.log('📊 ListeningHistory: Initializing...');

        // Load session data
        await this.loadSession();

        // Set up track change listener with debouncing
        const debouncedHandler = debounce(async (event) => {
            await this.handleTrackChange(event);
        }, 1000); // 1 second debounce

        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, debouncedHandler);

        this.isInitialized = true;
        console.log('📊 ListeningHistory: Initialized. Session play count:', this.sessionPlayCount);
    }

    /**
     * Load session data from storage
     */
    async loadSession() {
        try {
            const sessionData = await AsyncStorage.getItem(LISTENING_SESSION_KEY);
            if (sessionData) {
                const data = JSON.parse(sessionData);
                this.sessionPlayCount = data.playCount || 0;
                this.lastPlayedSongId = data.lastSongId || null;
            }
        } catch (e) {
            console.log('ListeningHistory: Could not load session');
        }
    }

    /**
     * Save session data to storage
     */
    async saveSession() {
        try {
            await AsyncStorage.setItem(LISTENING_SESSION_KEY, JSON.stringify({
                playCount: this.sessionPlayCount,
                lastSongId: this.lastPlayedSongId,
                lastUpdated: Date.now()
            }));
        } catch (e) {
            console.log('ListeningHistory: Could not save session');
        }
    }

    /**
     * Handle track change event
     */
    async handleTrackChange(event) {
        const track = event?.track;

        // Only count YTMusic songs
        if (!track || track.source !== 'ytmusic') {
            return;
        }

        const songId = track.id;

        // Don't count the same song twice (e.g., seeking)
        if (songId === this.lastPlayedSongId) {
            return;
        }

        this.lastPlayedSongId = songId;
        this.sessionPlayCount++;

        console.log(`📊 ListeningHistory: Played song #${this.sessionPlayCount}: "${track.title}"`);

        // Report playback to YouTube to update visitorData/history
        // This makes personalization work (like OuterTune)
        YouTubeMusicService.registerPlayback(songId);

        await this.saveSession();

        // Check if we should refresh the home feed
        if (this.sessionPlayCount >= SONGS_UNTIL_REFRESH && this.sessionPlayCount % SONGS_UNTIL_REFRESH === 0) {
            console.log(`📊 ListeningHistory: Threshold reached (${this.sessionPlayCount} songs). Marking home feed for refresh.`);
            await this.markHomeFeedForRefresh();
        }
    }

    /**
     * Mark the home feed cache as stale so it refreshes on next visit
     * This allows Quick Picks to update with personalized content
     */
    async markHomeFeedForRefresh() {
        try {
            // Clear the home feed cache to force a fresh fetch
            await AsyncStorage.removeItem(HOME_FEED_CACHE_KEY);

            // Set a flag indicating personalized content is available
            await AsyncStorage.setItem('ytmusic_personalized_ready', 'true');

            console.log('📊 ListeningHistory: Home feed cache cleared. Will refresh on next visit.');

            // Notify subscribers (e.g., Home component)
            this.notifySubscribers();
        } catch (e) {
            console.error('ListeningHistory: Could not mark for refresh:', e);
        }
    }

    /**
     * Force an immediate refresh of the home feed
     */
    async forceRefresh() {
        await AsyncStorage.removeItem(HOME_FEED_CACHE_KEY);
        await AsyncStorage.removeItem('innertube_visitor_data');
        this.sessionPlayCount = 0;
        await this.saveSession();
        console.log('📊 ListeningHistory: Forced full refresh');
        this.notifySubscribers();
    }

    /**
     * Check if personalized content is ready
     */
    async isPersonalizedReady() {
        try {
            const ready = await AsyncStorage.getItem('ytmusic_personalized_ready');
            return ready === 'true';
        } catch (e) {
            return false;
        }
    }

    /**
     * Clear the personalized ready flag
     */
    async clearPersonalizedFlag() {
        try {
            await AsyncStorage.removeItem('ytmusic_personalized_ready');
        } catch (e) { }
    }

    /**
     * Get current session stats
     */
    getStats() {
        return {
            songsPlayed: this.sessionPlayCount,
            songsUntilRefresh: SONGS_UNTIL_REFRESH - (this.sessionPlayCount % SONGS_UNTIL_REFRESH),
            lastSongId: this.lastPlayedSongId
        };
    }

    /**
     * Subscribe to refresh notifications
     */
    subscribe(callback) {
        this.subscribers.add(callback);
        return () => this.subscribers.delete(callback);
    }

    /**
     * Notify all subscribers that a refresh is needed
     */
    notifySubscribers() {
        this.subscribers.forEach(callback => {
            try {
                callback();
            } catch (e) {
                console.error('ListeningHistory: Subscriber error:', e);
            }
        });
    }

    /**
     * Reset session (for debugging/testing)
     */
    async reset() {
        this.sessionPlayCount = 0;
        this.lastPlayedSongId = null;
        await AsyncStorage.removeItem(LISTENING_SESSION_KEY);
        await AsyncStorage.removeItem('ytmusic_personalized_ready');
        console.log('📊 ListeningHistory: Session reset');
    }
}

// Singleton instance
const listeningHistoryService = new ListeningHistoryService();

export default listeningHistoryService;
