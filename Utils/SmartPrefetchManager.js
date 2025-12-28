/**
 * SmartPrefetchManager
 * 
 * YOUTUBE MUSIC ONLY - Saavn doesn't need prefetching as it provides direct stream URLs
 * 
 * Fixed prefetch strategy that PREVENTS race conditions:
 * 
 * 1. Listen for PlaybackState.Playing (not track change)
 * 2. Wait 2 seconds after playback starts
 * 3. Prefetch ONLY the next song (not 3)
 * 4. Handle playback errors with on-demand fetch fallback
 * 5. Cancel prefetch if track changes before completion
 * 
 * This ensures tracks are ready BEFORE auto-progression occurs.
 */

import TrackPlayer, { Event, State } from 'react-native-track-player';
import youtubeStreamingService from './YouTubeStreamingService';
import { InteractionManager } from 'react-native';

// Constants for configuration
const PREFETCH_DELAY_MS = 2000; // 2 seconds after playback starts
const CACHE_TTL_MS = 2 * 60 * 1000; // 2 minutes cache TTL
const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 200;

class SmartPrefetchManager {
    constructor() {
        // Cache and state management
        this.prefetchedTracks = new Map(); // id -> { url, headers, timestamp }
        this.prefetchInProgress = new Set(); // Currently prefetching IDs

        // Timing control
        this.prefetchTimer = null;
        this.currentTrackIndex = -1;
        this.isInitialized = false;

        // Error handling
        this.errorHandlerRegistered = false;

        // Circuit Breaker (Prevent looping storms)
        this.consecutiveErrors = 0;
        this.lastErrorTimestamp = 0;

        // Recovery lock - prevents queue cleanup during error recovery
        this.isRecovering = false;

        // Abort controller for cancelling in-flight prefetches on skip
        this.prefetchAbortController = null;
    }

    /**
     * Cancel all pending prefetch operations (called when user skips)
     */
    cancelAllPrefetches() {
        if (this.prefetchAbortController) {
            this.prefetchAbortController.abort();
            this.prefetchAbortController = null;
        }
        this.prefetchInProgress.clear();
    }

    // ==========================================
    // INITIALIZATION
    // ==========================================

    /**
     * Initialize the prefetch manager with correct event listeners
     */
    initialize() {
        if (this.isInitialized) return;

        // FIXED: Listen to PlaybackState instead of track change
        TrackPlayer.addEventListener(Event.PlaybackState, this._handlePlaybackState.bind(this));

        // Listen for track changes to cancel pending prefetches
        TrackPlayer.addEventListener(Event.PlaybackActiveTrackChanged, this._handleTrackChanged.bind(this));

        // CRITICAL: Listen for playback errors to handle auto-completion failures
        TrackPlayer.addEventListener(Event.PlaybackError, this._handlePlaybackError.bind(this));

        this.isInitialized = true;
        this.errorHandlerRegistered = true;
        console.log('✨ SmartPrefetchManager initialized (FIXED VERSION)');
    }

    // ==========================================
    // EVENT HANDLERS
    // ==========================================

    /**
     * Handle playback state changes
     * Triggers prefetch 2 seconds after playback starts
     */
    /**
     * Handle playback state changes
     * Triggers N+2 prefetch 2 seconds after playback starts
     */
    async _handlePlaybackState(event) {
        if (event.state === State.Playing) {
            // Check if current track is a YouTube Music track (by source, not by stream status)
            // We always want to prefetch next tracks for YTMusic, even if current track is ready
            const currentTrack = await TrackPlayer.getActiveTrack();
            if (!currentTrack) return;

            // Check if it's YouTube Music source - always prefetch for YT tracks
            const isYTMusic = currentTrack.source === 'ytmusic' ||
                currentTrack.isYTMusic === true ||
                (currentTrack.id && currentTrack.id.length === 11 && !currentTrack.isLocalMusic);

            if (!isYTMusic) {
                // Silently skip - not a YouTube Music track (e.g., Saavn)
                return;
            }

            // Get current track index
            const currentIndex = await TrackPlayer.getActiveTrackIndex();

            // Cancel any pending prefetch
            this._cancelPendingPrefetch();

            // Store current index for validation
            this.currentTrackIndex = currentIndex;

            // Wait 2 seconds, then prefetch ONLY N+1 (Next song)
            // Simple and reliable - avoids bridge saturation
            this.prefetchTimer = setTimeout(async () => {
                // Validate we're still on the same track
                const nowPlaying = await TrackPlayer.getActiveTrackIndex();
                if (nowPlaying === this.currentTrackIndex) {
                    console.log(`🎵 Prefetching next song (N+1)...`);
                    this._prefetchTrackAtIndex(nowPlaying + 1)
                        .catch(err => {
                            // Only log real errors, not expected ones like 'track doesn't exist'
                            if (!err.message?.includes("doesn't exist") && !err.message?.includes('Invalid index')) {
                                console.log('Prefetch error:', err.message);
                            }
                        });
                }
            }, PREFETCH_DELAY_MS);
        }
    }

    /**
     * Handle track changes - cancel pending prefetch
     */
    /**
     * Handle track changes - IMMEDIATE N+1, N+2, N+3 prefetch + queue cleanup
     * PERFORMANCE FIX: Deferred with InteractionManager to prevent UI lag
     */
    _handleTrackChanged(event) {
        // Check if track is a YouTube Music track (by source, not by stream status)
        // We always want to prefetch next tracks for YTMusic, even if current track is ready
        const track = event.track;
        if (!track) {
            // Log but don't exit - index might still be valid
            console.log('🔔 SmartPrefetch: Track changed event', {
                index: event.index,
                trackId: undefined
            });
        } else {
            // Check if it's YouTube Music source
            const isYTMusic = track.source === 'ytmusic' ||
                track.isYTMusic === true ||
                (track.id && track.id.length === 11 && !track.isLocalMusic);

            if (!isYTMusic) {
                // Silently skip - this is not a YouTube Music track
                return;
            }

            // Debug: Log event to verify handler is called (only for YTMusic)
            console.log('🔔 SmartPrefetch: Track changed event', {
                index: event.index,
                trackId: track.id
            });
        }

        if (event.index !== undefined && event.index !== null) {
            this._cancelPendingPrefetch();

            // PERFORMANCE FIX: Defer heavy operations to prevent UI lag during playback start
            InteractionManager.runAfterInteractions(() => {
                this._handleTrackChangedAsync(event).catch(err =>
                    console.error('SmartPrefetch: Background handler error:', err)
                );
            });
        }
    }

    /**
     * Async handler for track changed - contains the heavy lifting
     * Runs in background via InteractionManager
     * @private
     */
    async _handleTrackChangedAsync(event) {
        let effectiveIndex = event.index;

        // 🧹 QUEUE CLEANUP: Remove old tracks, keep only 5 previous
        // CRITICAL: Skip cleanup if we're in recovery mode to prevent index shifts
        if (!this.isRecovering) {
            effectiveIndex = await this._cleanupOldTracks(event.index);
        } else {
            console.log('⏳ Skipping queue cleanup - recovery in progress');
        }

        this.currentTrackIndex = effectiveIndex;

        // 🎵 SEQUENTIAL PREFETCH: N+1 first, then N+2 after N+1 completes
        // IMPORTANT: Use dynamic index lookup to handle queue rearrangement
        console.log(`🎵 Track Changed: Starting prefetch sequence from current position`);

        // Prefetch N+1 first (uses fresh index lookup internally)
        try {
            await this._prefetchNextFromCurrent();

            // Only after N+1 completes, start N+2 (non-blocking)
            // Use setImmediate to ensure UI thread is not blocked
            setImmediate(async () => {
                try {
                    // Get FRESH current index - queue may have been rearranged
                    const currentIdx = await TrackPlayer.getActiveTrackIndex();
                    if (currentIdx !== null && currentIdx !== undefined) {
                        console.log(`🎵 N+1 done, starting N+2 at index ${currentIdx + 2}`);
                        await this._prefetchTrackAtIndex(currentIdx + 2);
                        console.log(`✅ N+2 prefetch complete`);
                    }
                } catch (err) {
                    // Silence expected errors
                    if (!err.message?.includes("doesn't exist")) {
                        console.log('N+2 prefetch skipped:', err.message);
                    }
                }
            });
        } catch (err) {
            // Silence expected errors
            if (!err.message?.includes("doesn't exist")) {
                console.log('N+1 prefetch error:', err.message);
            }
        }
    }

    /**
     * Prefetch the next song relative to CURRENT playing position
     * Uses fresh index lookup to handle queue rearrangement
     */
    async _prefetchNextFromCurrent() {
        const currentIdx = await TrackPlayer.getActiveTrackIndex();
        if (currentIdx !== null && currentIdx !== undefined) {
            console.log(`🎵 Prefetching N+1 at index ${currentIdx + 1}`);
            await this._prefetchTrackAtIndex(currentIdx + 1);
        }
    }

    /**
     * CRITICAL: Handle playback errors for auto-completion failures
     * This is the key fix - when TrackPlayer fails on placeholder URL,
     * we fetch on-demand and retry playback
     */
    async _handlePlaybackError(event) {
        const now = Date.now();

        // Circuit Breaker Reset (if error was long ago)
        if (now - this.lastErrorTimestamp > 5000) {
            this.consecutiveErrors = 0;
        }

        this.lastErrorTimestamp = now;
        this.consecutiveErrors++;

        console.log(`🔴 PlaybackError detected (Count: ${this.consecutiveErrors})`);

        // STOP if looping too fast (Max 3 retries in 5 seconds)
        if (this.consecutiveErrors > 3) {
            console.error('⚡ CIRCUIT BREAKER TRIPPED: Stopping playback to prevent freeze.');
            await TrackPlayer.pause();
            this.consecutiveErrors = 0;
            this.isRecovering = false;
            return;
        }

        // Set recovery lock to prevent queue cleanup during recovery
        this.isRecovering = true;

        try {
            const currentTrack = await TrackPlayer.getActiveTrack();

            if (!currentTrack) {
                console.log('⚠️ No current track during error');
                this.isRecovering = false;
                return;
            }

            // Check if track needs stream (has placeholder URL)
            if (this.needsStream(currentTrack)) {
                console.log(`🔄 Auto-recovery: fetching stream for: ${currentTrack.title}`);

                // Fetch stream on-demand
                const streamData = await this.fetchOnDemand(currentTrack.id);

                if (streamData && streamData.url) {
                    // Replace current track with valid URL using ID-based lookup
                    await this._replaceAndPlayTrackById(currentTrack, streamData);
                    console.log('✅ Auto-recovery successful');
                    this.consecutiveErrors = 0; // Reset on success
                } else {
                    // Failed to get stream - skip to next
                    console.log('⚠️ Recovery failed, skipping to next track');
                    await this._skipToNextValidTrackById(currentTrack.id);
                }
            }
        } catch (error) {
            console.error('❌ Error in playback error handler:', error.message);
        } finally {
            // Release recovery lock after a delay to let queue stabilize
            setTimeout(() => {
                this.isRecovering = false;
            }, 500);
        }
    }

    // ==========================================
    // PREFETCH OPERATIONS
    // ==========================================

    /**
     * Prefetch ONLY the next song (not multiple)
     */
    async _prefetchNextSong(currentIndex) {
        const nextIndex = currentIndex + 1;
        await this._prefetchTrackAtIndex(nextIndex);
    }

    /**
     * Prefetch a single track by queue index
     */
    async _prefetchTrackAtIndex(index) {
        let trackId = null; // Track ID for cleanup in finally block

        try {
            const queue = await TrackPlayer.getQueue();

            if (index < 0 || index >= queue.length) {
                // Silent return - this is normal when queue is empty or at end
                return; // Invalid index
            }

            const track = queue[index];
            trackId = track.id; // Capture ID for finally block

            // Skip if not a YouTube track or already has valid URL
            if (!this.needsStream(track)) {
                // Only log if it's actually a YouTube track to avoid cluttering logs
                const isYT = track.source === 'ytmusic' || track.isYTMusic;
                if (isYT) {
                    console.log(`⏭️ Track ${index} (${track.title}) doesn't need prefetch (already has URL)`);
                }
                return;
            }

            // Skip if already prefetched and not expired
            const cached = this.getPrefetchedStream(track.id);
            if (cached) {
                console.log(`✅ Track ${index} already prefetched: ${track.title}`);
                // Still replace in queue if needed
                await this._replaceTrackInQueue(index, track, cached);
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
                this._cacheStream(track.id, streamData);

                // NON-BLOCKING: Defer queue replacement to avoid blocking UI
                // Use setImmediate to run after current call stack clears
                setImmediate(() => {
                    // Re-validate queue position before replacing (user may have skipped)
                    TrackPlayer.getQueue().then(currentQueue => {
                        // Find track by ID (index may have shifted)
                        const currentIndex = currentQueue.findIndex(t => t.id === track.id);
                        if (currentIndex !== -1 && currentQueue[currentIndex]?._needsStream) {
                            this._replaceTrackInQueue(currentIndex, track, streamData)
                                .then(() => console.log(`✅ Prefetched & replaced track ${currentIndex}: ${track.title}`))
                                .catch(err => console.log('Queue replacement failed:', err.message));
                        }
                    }).catch(() => { });
                });
            }

        } catch (error) {
            console.error(`❌ Prefetch failed for index ${index}:`, error.message);
        } finally {
            // Clean up in-progress set only if trackId was set
            if (trackId) {
                this.prefetchInProgress.delete(trackId);
            }
        }
    }

    // ==========================================
    // QUEUE OPERATIONS
    // ==========================================

    /**
     * Replace a track and WAIT for completion (for manual skips)
     * SAFE: Verifies track ID before replacing to handle queue rearrangement
     */
    async replaceTrackAndWait(index, originalTrack, streamData) {
        try {
            // Get FRESH queue state
            const queue = await TrackPlayer.getQueue();

            // Find track by ID - don't trust the index parameter
            const actualIndex = queue.findIndex(t => t.id === originalTrack.id);

            if (actualIndex === -1) {
                console.log(`⚠️ Track ${originalTrack.id} no longer in queue, skipping replacement`);
                return;
            }

            // Verify the track at this index is the one we expect
            const trackAtIndex = queue[actualIndex];
            if (trackAtIndex.id !== originalTrack.id) {
                console.log(`⚠️ Track ID mismatch at index ${actualIndex}, skipping replacement`);
                return;
            }

            // Skip if already has valid URL (already replaced)
            if (!this.needsStream(trackAtIndex)) {
                console.log(`⏭️ Track ${actualIndex} already has URL, skipping replacement`);
                return;
            }

            const updatedTrack = this._createUpdatedTrack(originalTrack, streamData);

            // Remove old track and insert new one at ACTUAL index (found by ID)
            await TrackPlayer.remove(actualIndex);
            await TrackPlayer.add(updatedTrack, actualIndex);

            console.log(`🔄 Replaced track at index ${actualIndex}`);
        } catch (error) {
            console.error('Error replacing track:', error.message);
        }
    }

    /**
     * Replace a track in queue with updated URL
     * CRITICAL FIX: MUST await completion to prevent playback errors
     */
    async _replaceTrackInQueue(index, originalTrack, streamData) {
        // WAIT for replacement to complete - this is CRITICAL
        // Previous fire-and-forget caused race conditions where player
        // would advance to tracks before their URLs were updated
        await this.replaceTrackAndWait(index, originalTrack, streamData);
    }

    /**
     * Replace CURRENT track and restart playback (for error recovery)
     * @deprecated Use _replaceAndPlayTrackById instead for race-condition safety
     */
    async _replaceAndPlayTrack(index, originalTrack, streamData) {
        // Delegate to ID-based method for safety
        await this._replaceAndPlayTrackById(originalTrack, streamData);
    }

    /**
     * Replace track by ID and restart playback (race-condition safe)
     * Finds track by ID instead of relying on index which may shift
     */
    async _replaceAndPlayTrackById(originalTrack, streamData) {
        try {
            const queue = await TrackPlayer.getQueue();

            // Find track by ID - this is stable even if queue indices shift
            const currentIndex = queue.findIndex(t => t.id === originalTrack.id);

            if (currentIndex === -1) {
                console.warn('⚠️ Track no longer in queue:', originalTrack.id);
                // Track was removed - try to play whatever is current
                await TrackPlayer.play();
                return;
            }

            const updatedTrack = this._createUpdatedTrack(originalTrack, streamData);

            // Remove old track and insert new one at same position
            await TrackPlayer.remove(currentIndex);
            await TrackPlayer.add(updatedTrack, currentIndex);

            // Skip to it and play
            await TrackPlayer.skip(currentIndex);
            await TrackPlayer.play();

            console.log(`✅ Replaced and playing track at index ${currentIndex} (ID: ${originalTrack.id})`);

        } catch (error) {
            console.error('Error in replaceAndPlayTrackById:', error.message);
            // Last resort - try to just play
            try {
                await TrackPlayer.play();
            } catch (e) {
                console.error('Failed to resume playback:', e.message);
            }
        }
    }

    /**
     * Skip to next valid track when current one fails completely
     * @deprecated Use _skipToNextValidTrackById instead
     */
    async _skipToNextValidTrack(failedIndex) {
        // Find track ID at that index first
        try {
            const queue = await TrackPlayer.getQueue();
            if (queue[failedIndex]) {
                await this._skipToNextValidTrackById(queue[failedIndex].id);
            }
        } catch (e) {
            console.error('Error in legacy skipToNextValidTrack:', e.message);
        }
    }

    /**
     * Skip to next valid track when current one fails completely (ID-based)
     */
    async _skipToNextValidTrackById(failedTrackId) {
        // Short delay to prevent CPU spike
        await new Promise(resolve => setTimeout(resolve, 300));

        try {
            const queue = await TrackPlayer.getQueue();

            // Find the failed track by ID
            const failedIndex = queue.findIndex(t => t.id === failedTrackId);

            if (failedIndex === -1) {
                // Track already removed - just try to play current
                console.log('⏭️ Failed track already removed, playing current');
                await TrackPlayer.play();
                return;
            }

            // Remove the failed track
            await TrackPlayer.remove(failedIndex);

            // Get new queue state
            const newQueue = await TrackPlayer.getQueue();

            if (newQueue.length === 0) {
                console.log('⏹️ Queue empty after removing failed track');
                await TrackPlayer.stop();
                return;
            }

            // Try to play the next track (now at same index or first)
            const nextIndex = Math.min(failedIndex, newQueue.length - 1);
            const nextTrack = newQueue[nextIndex];

            if (nextTrack && this.needsStream(nextTrack)) {
                // Fetch stream on-demand for next track
                const streamData = await this.fetchOnDemand(nextTrack.id);
                if (streamData && streamData.url) {
                    await this._replaceAndPlayTrackById(nextTrack, streamData);
                    return;
                }
            }

            // Just try to skip and play
            await TrackPlayer.skip(nextIndex);
            await TrackPlayer.play();

        } catch (error) {
            console.error('Error skipping to next valid track:', error.message);
            // Last resort
            try {
                await TrackPlayer.play();
            } catch (e) { }
        }
    }

    // ==========================================
    // UTILITY METHODS
    // ==========================================

    /**
     * Create updated track object with stream data
     */
    _createUpdatedTrack(originalTrack, streamData) {
        return {
            ...originalTrack,
            url: streamData.url,
            headers: streamData.headers,
            userAgent: streamData.headers?.['User-Agent'],
            _needsStream: false,
            _prefetched: true
        };
    }

    /**
     * Check if track needs stream fetching
     */
    needsStream(track) {
        if (!track) return false;

        // Explicit flags take priority (set by AddSongsToQueue, AutoRecommendations)
        if (track._prefetched === true) return false;
        if (track._needsStream === true) return true;

        // Check if it's a YouTube track needing stream
        // Check multiple indicators: ID length, isYTMusic flag, source property
        const hasYouTubeIdFormat = track.id && typeof track.id === 'string' &&
            track.id.length === 11 && !track.isLocalMusic;
        const hasYTMusicFlag = track.isYTMusic === true;
        const hasYTMusicSource = track.source === 'ytmusic';

        const isYTMusic = hasYouTubeIdFormat || hasYTMusicFlag || hasYTMusicSource;

        if (!isYTMusic) return false;

        // Check if URL is placeholder or missing
        const url = track.url || '';
        return !url || url.startsWith('ytmusic://') || url.includes('music.youtube.com');
    }

    /**
     * Cancel pending prefetch timer
     */
    _cancelPendingPrefetch() {
        if (this.prefetchTimer) {
            clearTimeout(this.prefetchTimer);
            this.prefetchTimer = null;
        }
    }

    /**
     * 🧹 QUEUE CLEANUP: Remove old tracks to save memory and prevent queue bloat
     * Keeps only 5 previous songs before current track
     */
    async _cleanupOldTracks(currentIndex) {
        try {
            // Only cleanup if we have more than 5 songs before current
            if (currentIndex <= 5) return currentIndex;

            const tracksToRemove = currentIndex - 5;

            // Remove tracks from the beginning of the queue
            const removeIndices = [];
            for (let i = 0; i < tracksToRemove; i++) {
                removeIndices.push(i);
            }

            if (removeIndices.length > 0) {
                console.log(`🧹 Queue Cleanup: Removing ${removeIndices.length} old tracks...`);
                await TrackPlayer.remove(removeIndices);

                // Update current track index after removal
                this.currentTrackIndex = 5; // After cleanup, current is always at index 5

                console.log(`✅ Queue cleaned. Current track now at index 5`);
                return 5;
            }
            return currentIndex;
        } catch (error) {
            console.error('Queue cleanup error:', error.message);
            return currentIndex;
        }
    }

    // ==========================================
    // CACHE OPERATIONS
    // ==========================================

    /**
     * Cache stream data
     */
    _cacheStream(trackId, streamData) {
        this.prefetchedTracks.set(trackId, {
            url: streamData.url,
            headers: streamData.headers,
            timestamp: Date.now()
        });
    }

    /**
     * Get prefetched stream for a track
     */
    getPrefetchedStream(trackId) {
        const cached = this.prefetchedTracks.get(trackId);
        if (!cached) return null;

        // Check if expired
        if (Date.now() - cached.timestamp > CACHE_TTL_MS) {
            this.prefetchedTracks.delete(trackId);
            return null;
        }

        return cached;
    }

    /**
     * On-demand fetch for random song selection (with retry)
     */
    async fetchOnDemand(trackId) {
        console.log(`🎯 On-demand fetch for: ${trackId}`);

        // Check prefetch cache first
        const cached = this.getPrefetchedStream(trackId);
        if (cached) {
            console.log(`✅ Using prefetched stream for: ${trackId}`);
            return cached;
        }

        // Fetch with retry
        for (let attempt = 1; attempt <= MAX_RETRY_ATTEMPTS; attempt++) {
            try {
                console.log(`🔄 Fetch attempt ${attempt}/${MAX_RETRY_ATTEMPTS} for: ${trackId}`);

                const streamData = await youtubeStreamingService.getStreamUrl(trackId);

                if (streamData && streamData.url) {
                    // Cache it
                    this._cacheStream(trackId, streamData);
                    console.log(`✅ On-demand fetch successful for: ${trackId}`);
                    return streamData;
                }

            } catch (error) {
                console.warn(`⚠️ Attempt ${attempt} failed:`, error.message);

                if (attempt < MAX_RETRY_ATTEMPTS) {
                    // Wait before retry
                    await new Promise(resolve => setTimeout(resolve, RETRY_DELAY_MS));
                }
            }
        }

        console.error(`❌ On-demand fetch failed after ${MAX_RETRY_ATTEMPTS} attempts: ${trackId}`);
        return null;
    }

    /**
     * Clear all prefetched data
     */
    clearCache() {
        this._cancelPendingPrefetch();
        this.prefetchedTracks.clear();
        this.prefetchInProgress.clear();
        this.currentTrackIndex = -1;
        console.log('🗑️ Prefetch cache cleared');
    }
}

// Singleton instance
const smartPrefetchManager = new SmartPrefetchManager();

export default smartPrefetchManager;
