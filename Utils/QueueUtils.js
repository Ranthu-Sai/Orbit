import { StorageManager } from './StorageManager';
import TrackPlayer from 'react-native-track-player';

/**
 * Shared queue utilities to eliminate duplication between QueueManager and useQueueManager
 */

// Queue operation states
export const QueueOperationStates = {
  IDLE: 'idle',
  INITIALIZING: 'initializing',
  FILTERING: 'filtering',
  ADDING: 'adding',
  REMOVING: 'removing',
  CLEARING: 'clearing',
};

// Track source types
export const TrackSourceTypes = {
  ONLINE: 'online',
  DOWNLOAD: 'download',
  MYMUSIC: 'mymusic',
  LOCAL: 'local',
};

/**
 * Check if track is local (downloaded or local file)
 * @param {Object} track - Track object
 * @returns {boolean} True if track is local
 */
export const isLocalTrack = (track) => {
  if (!track) {
    return false;
  }
  return Boolean(
    track.isLocalMusic ||
      track.isLocal ||
      track.isDownloaded ||
      track.path ||
      (track.url &&
        (track.url.startsWith('file://') ||
          track.url.includes('content://') ||
          track.url.includes('/storage/')))
  );
};

/**
 * Get source type for a track
 * @param {Object} track - Track object
 * @returns {string} Source type
 */
export const getTrackSourceType = (track) => {
  if (!track) {
    return TrackSourceTypes.ONLINE;
  }

  if (track.sourceType) {
    // Normalize some legacy/alternate sourceType values to our canonical set
    const st = String(track.sourceType).toLowerCase();
    if (st === 'downloaded' || st === 'local') {
      return TrackSourceTypes.DOWNLOAD;
    }
    if (st === 'mymusic' || st === 'my_music' || st === 'my-music') {
      return TrackSourceTypes.MYMUSIC;
    }
    if (st === 'download') {
      return TrackSourceTypes.DOWNLOAD;
    }
    // Fall back to the value provided if it's already one of our canonical values
    return st;
  }

  if (isLocalTrack(track)) {
    return TrackSourceTypes.DOWNLOAD;
  }

  return TrackSourceTypes.ONLINE;
};

/**
 * Get downloaded tracks from storage
 * @returns {Promise<Array>} Array of downloaded track objects
 */
export const getDownloadedTracks = async () => {
  try {
    const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();

    if (!allMetadata || Object.keys(allMetadata).length === 0) {
      return [];
    }

    return Object.values(allMetadata).map((metadata) => {
      const artworkPath = StorageManager.getArtworkPath(metadata.id);
      const songPath = StorageManager.getSongPath(metadata.id);

      return {
        id: metadata.id,
        url: `file://${songPath}`,
        title: metadata.title || 'Unknown',
        artist: metadata.artist || 'Unknown',
        artwork: `file://${artworkPath}`,
        localArtworkPath: artworkPath,
        duration: metadata.duration || 0,
        isLocal: true,
        isDownloaded: true,
        sourceType: TrackSourceTypes.DOWNLOAD,
      };
    });
  } catch (error) {
    console.error('Error getting downloaded tracks:', error);
    return [];
  }
};

/**
 * Filter queue by source type
 * @param {Object} currentTrack - Current playing track
 * @param {boolean} isOffline - Whether app is offline
 * @returns {Promise<Array>} Filtered queue
 */
export const filterQueueBySource = async (currentTrack, isOffline = false) => {
  try {
    if (!currentTrack) {
      return [];
    }

    const downloadedTracks = await getDownloadedTracks();
    const sourceType = getTrackSourceType(currentTrack);
    if (sourceType === TrackSourceTypes.MYMUSIC) {
      const fullQueue = await TrackPlayer.getQueue();
      const myMusicTracks = fullQueue.filter(
        (track) => getTrackSourceType(track) === TrackSourceTypes.MYMUSIC
      );

      if (myMusicTracks.length === 0) {
        return [currentTrack];
      }

      return [
        currentTrack,
        ...myMusicTracks.filter((track) => track.id !== currentTrack.id),
      ];
    }

    if (
      sourceType === TrackSourceTypes.DOWNLOAD ||
      (isLocalTrack(currentTrack) && !currentTrack.sourceType)
    ) {
      const fullQueue = await TrackPlayer.getQueue();
      const downloadSourceTracks = fullQueue.filter(
        (track) =>
          getTrackSourceType(track) === TrackSourceTypes.DOWNLOAD ||
          (isLocalTrack(track) && !track.sourceType)
      );

      let combinedTracks =
        downloadSourceTracks.length > 0 ? downloadSourceTracks : [];

      if (downloadedTracks.length > 0) {
        const existingIds = new Set(combinedTracks.map((t) => t.id));
        const additionalDownloads = downloadedTracks.filter(
          (t) => !existingIds.has(t.id)
        );
        combinedTracks = [...combinedTracks, ...additionalDownloads];
      }

      if (combinedTracks.length === 0) {
        combinedTracks = [currentTrack];
      } else {
        const currentTrackIndex = combinedTracks.findIndex(
          (t) => t.id === currentTrack.id
        );
        if (currentTrackIndex > 0) {
          const currentTrackItem = combinedTracks.splice(
            currentTrackIndex,
            1
          )[0];
          combinedTracks = [currentTrackItem, ...combinedTracks];
        } else if (currentTrackIndex === -1) {
          combinedTracks = [currentTrack, ...combinedTracks];
        }
      }

      return combinedTracks;
    }

    // Online tracks
    if (!isOffline) {
      const fullQueue = await TrackPlayer.getQueue();

      if (fullQueue.length === 0) {
        return [currentTrack];
      }

      const onlineTracks = fullQueue.filter(
        (track) => !track.sourceType && !isLocalTrack(track)
      );

      if (onlineTracks.length > 0) {
        const currentTrackIndex = onlineTracks.findIndex(
          (t) => t.id === currentTrack.id
        );
        if (currentTrackIndex > 0) {
          const currentTrackItem = onlineTracks.splice(currentTrackIndex, 1)[0];
          return [currentTrackItem, ...onlineTracks];
        } else if (currentTrackIndex === -1) {
          if (!isLocalTrack(currentTrack)) {
            return [currentTrack, ...onlineTracks];
          }
        }
        return onlineTracks;
      }

      return [currentTrack];
    } else {
      // Offline mode fallback
      if (downloadedTracks.length > 0) {
        return [
          currentTrack,
          ...downloadedTracks.filter((t) => t.id !== currentTrack.id),
        ];
      }

      return [currentTrack];
    }
  } catch (error) {
    console.error('Error filtering queue by source:', error);
    return currentTrack ? [currentTrack] : [];
  }
};

/**
 * Remove duplicate tracks from queue
 * @param {Array} tracks - Array of tracks
 * @returns {Array} Array with duplicates removed
 */
export const removeDuplicateTracks = (tracks) => {
  if (!Array.isArray(tracks)) {
    return [];
  }

  const uniqueIds = new Set();
  return tracks.filter((track) => {
    if (!track || !track.id || uniqueIds.has(track.id)) {
      return false;
    }
    uniqueIds.add(track.id);
    return true;
  });
};

/**
 * Ensure current track is first in queue
 * @param {Array} tracks - Array of tracks
 * @param {Object} currentTrack - Current playing track
 * @returns {Array} Queue with current track first
 */
export const ensureCurrentTrackFirst = (tracks, currentTrack) => {
  if (!Array.isArray(tracks) || !currentTrack || !currentTrack.id) {
    return tracks;
  }

  const currentTrackIndex = tracks.findIndex((t) => t.id === currentTrack.id);

  if (currentTrackIndex > 0) {
    const currentTrackItem = tracks.splice(currentTrackIndex, 1)[0];
    return [currentTrackItem, ...tracks];
  } else if (currentTrackIndex === -1) {
    return [currentTrack, ...tracks];
  }

  return tracks;
};

/**
 * Queue operation wrapper with state management
 */
export class QueueOperationManager {
  constructor() {
    this.currentOperation = QueueOperationStates.IDLE;
    this.operationQueue = [];
  }

  /**
   * Execute operation with state management
   * @param {string} operationType - Type of operation
   * @param {Function} operation - Operation function
   * @returns {Promise<any>} Operation result
   */
  async executeOperation(operationType, operation) {
    return new Promise((resolve, reject) => {
      this.operationQueue.push(async () => {
        if (this.currentOperation !== QueueOperationStates.IDLE) {
          reject(
            new Error(
              `Queue operation already in progress: ${this.currentOperation}`
            )
          );
          return;
        }

        this.currentOperation = operationType;

        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          this.currentOperation = QueueOperationStates.IDLE;
          this.processNextOperation();
        }
      });

      this.processNextOperation();
    });
  }

  /**
   * Process next operation in queue
   */
  async processNextOperation() {
    if (
      this.operationQueue.length > 0 &&
      this.currentOperation === QueueOperationStates.IDLE
    ) {
      const nextOperation = this.operationQueue.shift();
      nextOperation();
    }
  }

  /**
   * Get current operation state
   */
  getCurrentState() {
    return {
      currentOperation: this.currentOperation,
      queueLength: this.operationQueue.length,
    };
  }
}

// Create singleton instance
export const queueOperationManager = new QueueOperationManager();
