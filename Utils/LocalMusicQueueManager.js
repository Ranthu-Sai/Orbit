/**
 * LocalMusicQueueManager.js
 *
 * A lightweight queue manager specifically designed for local music playback.
 * Implements progressive loading to prevent UI lag when playing from large libraries (200+ songs).
 *
 * Key Features:
 * - Loads initial batch (20 songs) for instant playback
 * - Progressively adds more songs as user approaches end of loaded queue
 * - Cleans up old tracks to maintain optimal memory usage
 * - Supports circular playlist behavior
 */

import TrackPlayer, { Event } from 'react-native-track-player';
import { getQueueLength, invalidateQueueSnapshot } from './QueueSnapshot';
import { DeviceEventEmitter } from 'react-native';

// Configuration constants
const INITIAL_BATCH_SIZE = 20; // First batch for instant playback
const BACKGROUND_BATCH_SIZE = 15; // Subsequent batches
const LOAD_THRESHOLD = 5; // Load more when 5 songs from end of loaded queue
const CLEANUP_THRESHOLD = 30; // Keep max 30 tracks behind current position
const RESTART_THRESHOLD_SEC = 3; // "Previous" restarts the song after this point

class LocalMusicQueueManager {
  constructor() {
    this.allSongs = []; // Full list of all local songs
    this.loadedStartIndex = 0; // Start index in allSongs of loaded tracks
    this.loadedEndIndex = 0; // End index in allSongs of loaded tracks
    this.isLoading = false; // Prevent concurrent batch loads
    this.loadingPromise = null; // In-flight batch load, shared by all callers
    this.sourceType = null; // sourceType applied to every queued track
    this.trackChangeListener = null; // Event listener reference
    this.isActive = false; // Whether progressive loading is active
    this.startOffset = 0; // Original start index when initialized
  }

  /**
   * Format a local song for TrackPlayer
   * @param {Object} song - Local song object
   * @returns {Object} Formatted track object
   */
  _formatTrack(song) {
    if (!song || !song.path) {
      return null;
    }

    return {
      id: song.id,
      url: song.url || `file://${song.path}`,
      title: this._formatTitle(song.title),
      artist: this._formatArtist(song.artist),
      artwork: this._getArtwork(song),
      isLocal: true,
      sourceType: 'mymusic',
      duration: song.duration || 0,
    };
  }

  _formatTitle(title) {
    if (!title) {
      return 'Unknown Title';
    }
    let formatted = title.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');
    return formatted.length > 50
      ? formatted.substring(0, 50) + '...'
      : formatted;
  }

  _formatArtist(artist) {
    if (!artist) {
      return 'Unknown Artist';
    }
    let formatted = artist.replace(/\.(mp3|m4a|wav|ogg|flac)$/i, '');
    return formatted.length > 50
      ? formatted.substring(0, 50) + '...'
      : formatted;
  }

  _getArtwork(song) {
    // TrackPlayer (and the media notification) expect a URI string
    if (song.cover && typeof song.cover === 'object' && song.cover.uri) {
      return song.cover.uri;
    }
    if (song.artwork && typeof song.artwork === 'object' && song.artwork.uri) {
      return song.artwork.uri;
    }
    if (typeof song.artwork === 'string' && song.artwork) {
      return song.artwork;
    }
    // Return default cover - will be resolved by component
    return null;
  }

  /**
   * Start playback at songs[startIndex] as fast as possible: the tapped song
   * is added and played first, the rest of the first batch follows.
   * @param {Array} songs - Full list of local songs
   * @param {number} startIndex - Index of the song to play
   * @param {Object} options
   * @param {string} options.sourceType - Track sourceType ('mymusic' | 'download')
   * @returns {Promise<boolean>} true when playback started
   */
  async playFrom(songs, startIndex = 0, { sourceType = 'mymusic' } = {}) {
    const { initialBatch, success } = await this.initialize(songs, startIndex);
    if (!success || initialBatch.length === 0) {
      return false;
    }
    const tracks = initialBatch.map((track) => ({ ...track, sourceType }));
    this.sourceType = sourceType;

    await TrackPlayer.reset();
    await TrackPlayer.add(tracks[0]);
    await TrackPlayer.play();

    if (tracks.length > 1) {
      await TrackPlayer.add(tracks.slice(1));
    }
    invalidateQueueSnapshot();
    return true;
  }

  /**
   * Skip forward inside the existing queue (no rebuild).
   * @returns {Promise<boolean>} false when there is no active local queue
   */
  // True when the player is still playing the queue this manager built
  // (the user may have started something else since)
  async _ownsActiveQueue() {
    if (!this.isActive) {
      return false;
    }
    const track = await TrackPlayer.getActiveTrack();
    return !!track && track.isLocal === true && track.sourceType === this.sourceType;
  }

  async skipNext() {
    if (!(await this._ownsActiveQueue())) {
      return false;
    }
    const [activeIndex, queueLength] = await Promise.all([
      TrackPlayer.getActiveTrackIndex(),
      getQueueLength(),
    ]);
    if (activeIndex === undefined || activeIndex === null) {
      return false;
    }
    if (
      activeIndex >= queueLength - 1 &&
      this.loadedEndIndex < this.allSongs.length
    ) {
      await this._loadNextBatch();
    }
    try {
      await TrackPlayer.skipToNext();
    } catch (e) {
      // End of the library: wrap to the first queued song
      await TrackPlayer.skip(0);
    }
    await TrackPlayer.play();
    return true;
  }

  /**
   * Go back inside the existing queue; restarts the song if past a few seconds.
   * @returns {Promise<boolean>} false when there is no active local queue
   */
  async skipPrevious() {
    if (!(await this._ownsActiveQueue())) {
      return false;
    }
    const [activeIndex, progress] = await Promise.all([
      TrackPlayer.getActiveTrackIndex(),
      TrackPlayer.getProgress(),
    ]);
    if (activeIndex === undefined || activeIndex === null) {
      return false;
    }
    if (activeIndex === 0 || progress.position > RESTART_THRESHOLD_SEC) {
      await TrackPlayer.seekTo(0);
    } else {
      await TrackPlayer.skipToPrevious();
    }
    await TrackPlayer.play();
    return true;
  }

  /**
   * Initialize progressive queue loading for local music
   * @param {Array} songs - Full array of local songs
   * @param {number} startIndex - Index of the song to start playing
   * @returns {Object} { initialBatch, success }
   */
  async initialize(songs, startIndex = 0) {
    // Cleanup any existing state
    this.cleanup();

    if (!songs || songs.length === 0) {
      return { initialBatch: [], success: false };
    }

    // Filter to only valid songs with paths
    const validSongs = songs.filter((song) => song && song.path);

    if (validSongs.length === 0) {
      return { initialBatch: [], success: false };
    }

    // Reorder songs: starting from startIndex, wrapping around to beginning
    this.allSongs = [
      ...validSongs.slice(startIndex),
      ...validSongs.slice(0, startIndex),
    ];
    this.startOffset = startIndex;
    this.isActive = true;

    // Calculate initial batch size
    const initialSize = Math.min(INITIAL_BATCH_SIZE, this.allSongs.length);

    // Process initial batch
    const initialBatch = [];
    for (let i = 0; i < initialSize; i++) {
      const formatted = this._formatTrack(this.allSongs[i]);
      if (formatted) {
        initialBatch.push(formatted);
      }
    }

    this.loadedStartIndex = 0;
    this.loadedEndIndex = initialBatch.length;

    // Setup track change listener for threshold-based loading
    this._setupTrackChangeListener();

    return {
      initialBatch,
      success: true,
      hasMore: this.loadedEndIndex < this.allSongs.length,
    };
  }

  /**
   * Setup listener for track changes to trigger batch loading and cleanup
   */
  _setupTrackChangeListener() {
    // Remove any existing listener
    if (this.trackChangeListener) {
      this.trackChangeListener.remove();
    }

    this.trackChangeListener = TrackPlayer.addEventListener(
      Event.PlaybackActiveTrackChanged,
      async (event) => {
        if (!this.isActive) {
          return;
        }

        const currentIndex = event.index;
        if (currentIndex === undefined || currentIndex === null) {
          return;
        }

        // Check if we need to load more songs (approaching end of loaded queue)
        const queueLength = await getQueueLength();
        const remainingLoaded = queueLength - currentIndex - 1;

        if (
          remainingLoaded <= LOAD_THRESHOLD &&
          this.loadedEndIndex < this.allSongs.length
        ) {
          await this._loadNextBatch();
        }

        // Check if we need to cleanup old tracks
        if (currentIndex > CLEANUP_THRESHOLD) {
          await this._cleanupOldTracks(currentIndex);
        }
      }
    );
  }

  /**
   * Load the next batch of songs
   */
  _loadNextBatch() {
    // Callers (e.g. skipNext at the queue end) wait for an in-flight load
    // instead of continuing before the next tracks exist
    if (this.loadingPromise) {
      return this.loadingPromise;
    }
    if (!this.isActive || this.loadedEndIndex >= this.allSongs.length) {
      return Promise.resolve();
    }

    this.isLoading = true;
    this.loadingPromise = this._addBatch().finally(() => {
      this.isLoading = false;
      this.loadingPromise = null;
    });
    return this.loadingPromise;
  }

  async _addBatch() {
    try {
      // Calculate batch range. Formatting 15 plain objects is cheap, so no
      // artificial delay: a late batch would make "next" wait at queue end.
      const batchStart = this.loadedEndIndex;
      const batchEnd = Math.min(
        batchStart + BACKGROUND_BATCH_SIZE,
        this.allSongs.length
      );

      // Process batch
      const batch = [];
      for (let i = batchStart; i < batchEnd; i++) {
        const formatted = this._formatTrack(this.allSongs[i]);
        if (formatted) {
          batch.push(
            this.sourceType ? { ...formatted, sourceType: this.sourceType } : formatted
          );
        }
      }

      if (batch.length > 0) {
        await TrackPlayer.add(batch);
        invalidateQueueSnapshot();
      }
      // Advance even if nothing was playable, so the range can't stall
      this.loadedEndIndex = batchEnd;

      // Emit event for UI updates
      DeviceEventEmitter.emit('queue-updated', {
        count: this.loadedEndIndex,
        total: this.allSongs.length,
        isLocalMusic: true,
      });
    } catch (error) {
      console.error(
        '❌ LocalMusicQueueManager: Error loading batch:',
        error.message
      );
    }
  }

  /**
   * Cleanup old tracks that are far behind current position
   * @param {number} currentIndex - Current track index in player queue
   */
  async _cleanupOldTracks(currentIndex) {
    if (!this.isActive) {
      return;
    }

    try {
      // Only cleanup if we have enough tracks behind us
      const tracksToRemove = currentIndex - CLEANUP_THRESHOLD;

      if (tracksToRemove > 0) {
        // Remove tracks from the beginning of the queue
        const indicesToRemove = [];
        for (let i = 0; i < Math.min(tracksToRemove, 10); i++) {
          indicesToRemove.push(i);
        }

        if (indicesToRemove.length > 0) {
          // One bridge call instead of one per track
          await TrackPlayer.remove(indicesToRemove);
          invalidateQueueSnapshot();

          this.loadedStartIndex += indicesToRemove.length;
        }
      }
    } catch (error) {
      console.error(
        '❌ LocalMusicQueueManager: Error cleaning up:',
        error.message
      );
    }
  }

  /**
   * Get current loading status
   */
  getStatus() {
    return {
      isActive: this.isActive,
      loadedCount: this.loadedEndIndex - this.loadedStartIndex,
      totalCount: this.allSongs.length,
      isLoading: this.isLoading,
      progress:
        this.allSongs.length > 0
          ? this.loadedEndIndex / this.allSongs.length
          : 0,
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

    this.allSongs = [];
    this.loadedStartIndex = 0;
    this.loadedEndIndex = 0;
    this.isLoading = false;
    this.loadingPromise = null;
    this.isActive = false;
    this.startOffset = 0;
    this.sourceType = null;
  }
}

// Export singleton instance
export default new LocalMusicQueueManager();
