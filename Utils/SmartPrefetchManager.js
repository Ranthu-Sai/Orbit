/**
 * SmartPrefetchManager
 * 
 * Simple, non-blocking prefetch strategy:
 * 1. When song plays → prefetch next 3 songs with 2-3s intervals
 * 2. Prefetched URLs stored and tracks REPLACED in queue
 * 3. When user reaches 3rd prefetched song → prefetch next 3
 * 4. Random song selection → on-demand fetch with 1 retry
 * 
 * This ensures buttery smooth transitions without blocking the main thread.
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import youtubeStreamingService from './YouTubeStreamingService';

class SmartPrefetchManager {
    constructor() {
        this.prefetchedTracks = new Map(); // id -> { url, headers, timestamp }
        this.prefetchInProgress = new Set(); // Currently prefetching IDs
        this.lastPrefetchedIndex = -1;
        this.isInitialized = false;
        this.prefetchCount = 3; // Prefetch 3 songs ahead
        this.prefetchInterval = 2500; // 2.5 seconds between prefetches
    }

    /**
     * Initialize the prefetch manager
     */
    initialize() {
        if (this.isInitialized) return;

        // Listen for track changes to trigger prefetch
        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, async (event) => {
            if (event.index !== undefined && event.index !== null) {
                console.log(`🎵 Track changed to index ${event.index}, starting prefetch...`);
                await this.onTrackChanged(event.index);
            }
        });

        this.isInitialized = true;
        console.log('✨ SmartPrefetchManager initialized');
    }

    /**
     * Called when track changes - starts prefetching next songs
     */
    async onTrackChanged(currentIndex) {
        // Prefetch next 3 songs with staggered timing
        for (let i = 1; i <= this.prefetchCount; i++) {
            const targetIndex = currentIndex + i;

            // Staggered prefetch: 0s, 2.5s, 5s
            const delay = (i - 1) * this.prefetchInterval;

            setTimeout(async () => {
                await this.prefetchTrackAtIndex(targetIndex);
            }, delay);
        }
    }

    /**
     * Prefetch a single track by queue index
     */
    async prefetchTrackAtIndex(index) {
        try {
            const queue = await TrackPlayer.getQueue();

            if (index < 0 || index >= queue.length) {
                return; // Invalid index
            }

            const track = queue[index];

            // Skip if not a YouTube track or already has valid URL
            if (!this.needsStream(track)) {
                console.log(`⏭️ Track ${index} doesn't need prefetch`);
                return;
            }

            // Skip if already prefetched and not expired (2 min TTL)
            const cached = this.prefetchedTracks.get(track.id);
            if (cached && Date.now() - cached.timestamp < 2 * 60 * 1000) {
                console.log(`✅ Track ${index} already prefetched: ${track.title}`);
                return;
            }

            // Skip if already prefetching this track
            if (this.prefetchInProgress.has(track.id)) {
                console.log(`⏳ Track ${index} prefetch already in progress`);
                return;
            }

            this.prefetchInProgress.add(track.id);

            console.log(`🔄 Prefetching track ${index}: ${track.title}`);

            const streamData = await youtubeStreamingService.getStreamUrl(track.id);

            if (streamData && streamData.url) {
                // Store prefetched data
                this.prefetchedTracks.set(track.id, {
                    url: streamData.url,
                    headers: streamData.headers,
                    timestamp: Date.now()
                });

                // CRITICAL: Replace track in queue with valid URL
                await this.replaceTrackInQueue(index, track, streamData);

                console.log(`✅ Prefetched & replaced track ${index}: ${track.title}`);
            }

        } catch (error) {
            console.error(`❌ Prefetch failed for index ${index}:`, error.message);
        } finally {
            // Clean up in-progress set
            const queue = await TrackPlayer.getQueue();
            if (index < queue.length) {
                this.prefetchInProgress.delete(queue[index]?.id);
            }
        }
    }

    /**
     * Replace a track in queue with updated URL
     * This is the key - we can't update URL, so we remove and re-add
     */
    async replaceTrackInQueue(index, originalTrack, streamData) {
        try {
            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            // Don't replace the currently playing track
            if (index === currentIndex) {
                console.log(`⚠️ Can't replace currently playing track`);
                return;
            }

            // Create updated track object
            const updatedTrack = {
                ...originalTrack,
                url: streamData.url,
                headers: streamData.headers,
                userAgent: streamData.headers?.['User-Agent'],
                _needsStream: false, // Mark as ready
                _prefetched: true
            };

            // Remove old track and insert new one at same position
            await TrackPlayer.remove(index);
            await TrackPlayer.add(updatedTrack, index);

            console.log(`🔄 Replaced track at index ${index}`);

        } catch (error) {
            console.error('Error replacing track:', error);
        }
    }

    /**
     * Check if track needs stream fetching
     */
    needsStream(track) {
        if (!track) return false;

        // Check if it's a YouTube track needing stream
        const isYTMusic = track.id && typeof track.id === 'string' &&
            track.id.length === 11 && !track.isLocalMusic;

        if (!isYTMusic) return false;

        // Check if URL is placeholder or missing
        const url = track.url || '';
        return !url || url.startsWith('ytmusic://') || url.includes('music.youtube.com');
    }

    /**
     * Get prefetched stream for a track
     */
    getPrefetchedStream(trackId) {
        const cached = this.prefetchedTracks.get(trackId);
        if (!cached) return null;

        // Check if expired (2 min TTL)
        if (Date.now() - cached.timestamp > 2 * 60 * 1000) {
            this.prefetchedTracks.delete(trackId);
            return null;
        }

        return cached;
    }

    /**
     * On-demand fetch for random song selection (with 1 retry)
     */
    async fetchOnDemand(trackId) {
        console.log(`🎯 On-demand fetch for: ${trackId}`);

        // Check prefetch cache first
        const cached = this.getPrefetchedStream(trackId);
        if (cached) {
            console.log(`✅ Using prefetched stream for: ${trackId}`);
            return cached;
        }

        // Fetch with 1 retry
        for (let attempt = 1; attempt <= 2; attempt++) {
            try {
                console.log(`🔄 Fetch attempt ${attempt}/2 for: ${trackId}`);

                const streamData = await youtubeStreamingService.getStreamUrl(trackId);

                if (streamData && streamData.url) {
                    // Cache it
                    this.prefetchedTracks.set(trackId, {
                        url: streamData.url,
                        headers: streamData.headers,
                        timestamp: Date.now()
                    });

                    console.log(`✅ On-demand fetch successful for: ${trackId}`);
                    return streamData;
                }

            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

                if (attempt < 2) {
                    // Wait 200ms before retry
                    await new Promise(resolve => setTimeout(resolve, 200));
                }
            }
        }

        console.error(`❌ On-demand fetch failed after 2 attempts: ${trackId}`);
        return null;
    }

    /**
     * Clear all prefetched data
     */
    clearCache() {
        this.prefetchedTracks.clear();
        this.prefetchInProgress.clear();
        this.lastPrefetchedIndex = -1;
        console.log('🗑️ Prefetch cache cleared');
    }
}

// Singleton instance
const smartPrefetchManager = new SmartPrefetchManager();

export default smartPrefetchManager;
