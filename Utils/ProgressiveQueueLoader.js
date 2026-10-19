/**
 * ProgressiveQueueLoader.js
 *
 * A service that manages progressive loading of large playlists to prevent UI lag.
 * Loads songs in batches based on playback position, ensuring smooth UI while
 * maintaining seamless playback experience.
 *
 * Key Features:
 * - Loads initial batch (20 songs) for instant playback
 * - Monitors track position and loads more when approaching end of the queue
 * - Works with shuffle, play all, and individual song playback
 * - Non-blocking: Uses InteractionManager and setImmediate
 *
 * Position is measured against the player's real queue (length minus active
 * index). SmartPrefetchManager trims played tracks from the front of the
 * queue, so the active index is NOT a position in the playlist and must never
 * be compared with how many songs this loader has added.
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import { InteractionManager, DeviceEventEmitter } from 'react-native';
import { getIndexQuality } from '../MusicPlayerFunctions';
import { getQueueLength, invalidateQueueSnapshot } from './QueueSnapshot';

// Configuration constants
const INITIAL_BATCH_SIZE = 20; // First batch for instant playback
const BACKGROUND_BATCH_SIZE = 15; // Subsequent batches
const LOAD_THRESHOLD = 5; // Load more when 5 songs from end of the queue
const BATCH_DELAY_MS = 50; // Delay between batch additions for UI responsiveness

class ProgressiveQueueLoader {
  constructor() {
    this.sourceSongs = []; // Full playlist (potentially shuffled)
    this.nextSourceIndex = 0; // Next song in sourceSongs to process
    this.loadedCount = 0; // How many songs were actually added (skips excluded)
    this.totalCount = 0; // Total songs in playlist
    this.indexOffset = 0; // Position of sourceSongs[0] in the original playlist
    this.isLoading = false; // Prevent concurrent batch loads
    this.trackChangeListener = null; // Event listener reference
    this.isActive = false; // Whether progressive loading is active
    this.qualityIndex = 4; // Default to 320kbps
    this.processSingleSong = null; // Song processing function reference
    this.session = 0; // Bumped on every cleanup; stale async work checks it
  }

  /** True while the loading session returned by initialize() is still current. */
  isCurrentSession(session) {
    return this.isActive && session === this.session;
  }

  /**
   * Initialize progressive queue loading
   * @param {Array} songs - Full array of songs to load (can be pre-shuffled)
   * @param {Function} processSingleSong - (song, playlistIndex, isFirstSong) => track|null
   * @param {number} startIndex - Index to start from (for individual song play)
   * @param {Object} options
   * @param {number} options.indexOffset - Playlist position of songs[0]
   *   (e.g. 20 when the caller already queued the first 20 songs)
   * @param {boolean} options.firstSongIsCurrent - True only when songs[startIndex]
   *   is the song that starts playing now. When the caller already started
   *   playback, it must be false, otherwise a later song is treated as the
   *   current one (eager stream fetch + "now loading" UI for the wrong song).
   */
  async initialize(
    songs,
    processSingleSong,
    startIndex = 0,
    { indexOffset = 0, firstSongIsCurrent = false } = {}
  ) {
    // Cleanup any existing state
    this.cleanup();

    if (!songs || songs.length === 0) {
      return { initialBatch: [], success: false };
    }

    // Store state
    this.sourceSongs = songs.slice(startIndex); // Songs from start index onwards
    this.totalCount = this.sourceSongs.length;
    this.indexOffset = indexOffset + startIndex;
    this.isActive = true;
    this.processSingleSong = processSingleSong;

    const session = this.session;

    // Get quality setting
    this.qualityIndex = await getIndexQuality();

    // Calculate initial batch size (don't exceed total)
    const initialSize = Math.min(INITIAL_BATCH_SIZE, this.totalCount);
    const initialSongs = this.sourceSongs.slice(0, initialSize);

    const processedInitial = await Promise.all(
      initialSongs.map((song, index) =>
        processSingleSong(
          song,
          this.indexOffset + index,
          firstSongIsCurrent && index === 0
        )
      )
    );
    const validInitialSongs = processedInitial.filter((song) => song !== null);

    // Another playlist started while this one was processing
    if (session !== this.session) {
      return { initialBatch: [], success: false, session };
    }

    this.nextSourceIndex = initialSize;
    this.loadedCount = validInitialSongs.length;

    // Setup track change listener for threshold-based loading
    this._setupTrackChangeListener();

    return {
      initialBatch: validInitialSongs,
      success: true,
      hasMore: this.nextSourceIndex < this.totalCount,
      session,
    };
  }

  /** Songs queued after the active track, from the player's real queue. */
  async _remainingInQueue(activeIndex) {
    const index =
      activeIndex !== undefined && activeIndex !== null
        ? activeIndex
        : await TrackPlayer.getActiveTrackIndex();
    if (index === undefined || index === null) {
      return null;
    }
    const queueLength = await getQueueLength();
    return queueLength - index - 1;
  }

  /**
   * Setup listener for track changes to trigger batch loading
   */
  _setupTrackChangeListener() {
    // Remove any existing listener
    if (this.trackChangeListener) {
      this.trackChangeListener.remove();
    }

    this.trackChangeListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (!this.isActive || this.nextSourceIndex >= this.totalCount) {
          return;
        }

        const remaining = await this._remainingInQueue(event.index);
        if (remaining !== null && remaining <= LOAD_THRESHOLD) {
          await this._loadNextBatch();
        }
      }
    );
  }

  /**
   * Load the next batch of songs
   */
  async _loadNextBatch() {
    if (
      this.isLoading ||
      !this.isActive ||
      this.nextSourceIndex >= this.totalCount
    ) {
      return;
    }

    this.isLoading = true;

    try {
      // Use InteractionManager to avoid blocking UI
      await new Promise((resolve) => {
        InteractionManager.runAfterInteractions(() => {
          resolve();
        });
      });

      // Calculate batch range in the source list (not the loaded count:
      // skipped songs would otherwise shift the range and re-add songs)
      const batchStart = this.nextSourceIndex;
      const batchEnd = Math.min(
        batchStart + BACKGROUND_BATCH_SIZE,
        this.totalCount
      );
      const batchSongs = this.sourceSongs.slice(batchStart, batchEnd);
      if (batchSongs.length === 0) {
        return;
      }

      // Small delay to ensure UI stays responsive
      await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY_MS));
      if (!this.isActive) {
        return;
      }

      // Process batch - no songs need stream fetch (lazy load)
      const processedBatch = await Promise.all(
        batchSongs.map((song, batchIndex) =>
          this.processSingleSong(
            song,
            this.indexOffset + batchStart + batchIndex,
            false
          )
        )
      );
      // A newer playlist may have started while this batch was processing
      if (!this.isActive) {
        return;
      }
      const validBatch = processedBatch.filter((song) => song !== null);

      this.nextSourceIndex = batchEnd;
      if (validBatch.length > 0) {
        await TrackPlayer.add(validBatch);
        invalidateQueueSnapshot();
        this.loadedCount += validBatch.length;

        // Emit event for UI updates (debounced in ContextState)
        DeviceEventEmitter.emit('queue-updated', {
          count: this.loadedCount,
          total: this.totalCount,
          isProgressiveBatch: true,
        });
      }
    } catch (error) {
      console.error(
        '❌ ProgressiveQueueLoader: Error loading batch:',
        error.message
      );
    } finally {
      this.isLoading = false;

      // Check if more songs need to be loaded immediately
      // (in case user skipped ahead quickly)
      if (this.isActive && this.nextSourceIndex < this.totalCount) {
        try {
          const remaining = await this._remainingInQueue();
          if (remaining !== null && remaining <= LOAD_THRESHOLD) {
            // Schedule another batch load
            setImmediate(() => this._loadNextBatch());
          }
        } catch (e) {
          // Player not ready; the next track change will retry
        }
      }
    }
  }

  /**
   * Force load remaining songs (e.g., for queue view)
   */
  async loadAllRemaining() {
    while (
      this.isActive &&
      this.nextSourceIndex < this.totalCount
    ) {
      const before = this.nextSourceIndex;
      await this._loadNextBatch();
      if (this.nextSourceIndex === before && !this.isLoading) {
        break; // No progress (error); avoid spinning forever
      }
      // Small delay between batches
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
  }

  /**
   * Get current loading status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      loadedCount: this.loadedCount,
      totalCount: this.totalCount,
      isLoading: this.isLoading,
      progress:
        this.totalCount > 0 ? this.nextSourceIndex / this.totalCount : 0,
    };
  }

  /**
   * Cleanup and reset state
   */
  cleanup() {
    if (this.trackChangeListener) {
      this.trackChangeListener.remove();
      this.trackChangeListener = null;
    }

    this.sourceSongs = [];
    this.nextSourceIndex = 0;
    this.loadedCount = 0;
    this.totalCount = 0;
    this.indexOffset = 0;
    this.isLoading = false;
    this.isActive = false;
    this.processSingleSong = null;
    this.session++;
  }
}

// Export singleton instance
export default new ProgressiveQueueLoader();
