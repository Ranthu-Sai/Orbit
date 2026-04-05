import AsyncStorage from '@react-native-async-storage/async-storage';
import * as RNFS from 'react-native-fs';

// Storage keys (legacy)
const HISTORY_STORAGE_KEY = 'orbit_listening_history';
const WEEKLY_STATS_KEY = 'orbit_weekly_stats';

// File paths
const HISTORY_FILE_PATH = `${RNFS.DocumentDirectoryPath}/orbit_history.json`;
const WEEKLY_STATS_FILE_PATH = `${RNFS.DocumentDirectoryPath}/orbit_weekly_stats.json`;

// History entry structure
const createHistoryEntry = (song, listenDuration = 0) => ({
  id: song.id || Date.now().toString(),
  title: song.title || 'Unknown Title',
  artist: song.artist || 'Unknown Artist',
  artwork: song.artwork || song.image || '',
  url: song.url || '',
  duration: song.duration || 0,
  listenDuration: Math.max(0, listenDuration),
  playCount: 1,
  lastPlayed: Date.now(),
  firstPlayed: Date.now(),
  sourceType:
    song.sourceType ||
    (song.isLocal ? 'local' : song.path ? 'download' : 'online'),
  isLocal: song.isLocal || false,
  path: song.path || null,
  // Store YouTube video ID for songs that need stream fetching (Spotify mapped to YTMusic, etc.)
  videoId: song.videoId || null,
  // Store source for proper stream fetching (ytmusic, spotify, saavn, dab)
  source: song.source || null,
  // Store original Spotify ID if this was mapped from Spotify
  spotifyId: song.spotifyId || (song.source === 'spotify' ? song.id : null),
});

class HistoryManager {
  constructor() {
    this.history = []; // In-memory cache
    this.currentTrack = null;
    this.startTime = null;
    this.isTracking = false;
    this.isPaused = false;
    this.pausedDuration = 0;
    this.pauseStartTime = null;
    this.lastSavedDuration = 0;
    this.minListenDuration = 10000; // 10 seconds
    this.hasCountedPlay = false;
    this.isBackgroundMode = false;
    this.isInitialized = false;
  }

  // Getter for external access to tracking state
  get isCurrentlyTracking() {
    return this.isTracking;
  }

  // Initialize history tracking
  async initialize() {
    if (this.isInitialized) {
      return;
    }
    try {
      // Load history into memory once
      const historyFileExists = await RNFS.exists(HISTORY_FILE_PATH);
      if (historyFileExists) {
        const content = await RNFS.readFile(HISTORY_FILE_PATH, 'utf8');
        this.history = content ? JSON.parse(content) : [];
      } else {
        // Try migration from legacy storage if exists
        await this.migrateFromAsyncStorage();
      }

      this.isInitialized = true;
    } catch (error) {
      console.error('HistoryManager: Initialization failed:', error);
      this.history = [];
      this.isInitialized = true;
    }
  }

  // Migrate data from AsyncStorage to File System
  async migrateFromAsyncStorage() {
    try {
      const historyFileExists = await RNFS.exists(HISTORY_FILE_PATH);
      const statsFileExists = await RNFS.exists(WEEKLY_STATS_FILE_PATH);

      // Only migrate if files don't exist yet and we have data in AsyncStorage
      if (!historyFileExists) {
        const legacyHistory = await AsyncStorage.getItem(HISTORY_STORAGE_KEY);
        if (legacyHistory) {
          await RNFS.writeFile(HISTORY_FILE_PATH, legacyHistory, 'utf8');
          // Don't remove from AsyncStorage yet, wait for verification or just leave it as backup
          // AsyncStorage.removeItem(HISTORY_STORAGE_KEY);
        }
      }

      if (!statsFileExists) {
        const legacyStats = await AsyncStorage.getItem(WEEKLY_STATS_KEY);
        if (legacyStats) {
          await RNFS.writeFile(WEEKLY_STATS_FILE_PATH, legacyStats, 'utf8');
          // AsyncStorage.removeItem(WEEKLY_STATS_KEY);
        }
      }
    } catch (error) {
      console.error('HistoryManager: Migration failed:', error);
    }
  }

  // Helper to read JSON from file
  async readJsonFile(path, defaultValue = null) {
    try {
      const exists = await RNFS.exists(path);
      if (!exists) {
        return defaultValue;
      }

      const content = await RNFS.readFile(path, 'utf8');
      return content ? JSON.parse(content) : defaultValue;
    } catch (error) {
      console.error(`HistoryManager: Error reading file ${path}:`, error);
      return defaultValue;
    }
  }

  // Helper to write JSON to file
  async writeJsonFile(path, data) {
    try {
      const content = JSON.stringify(data);
      await RNFS.writeFile(path, content, 'utf8');
      return true;
    } catch (error) {
      console.error(`HistoryManager: Error writing file ${path}:`, error);
      return false;
    }
  }

  // Start tracking a song
  async startTracking(song) {
    try {
      if (!song || !song.id) {
        return;
      }

      // Check if we're already tracking this same song
      if (
        this.isTracking &&
        this.currentTrack &&
        this.currentTrack.id === song.id
      ) {
        return;
      }

      // Stop previous tracking if any
      if (this.isTracking) {
        await this.stopTracking();
      }

      // Quick check in-memory history instead of file read
      const existingEntry = this.history.find(
        (item) => item && item.id === song.id
      );
      const isRecentPlay =
        existingEntry && Date.now() - existingEntry.lastPlayed < 300000; // 5 minutes

      this.currentTrack = song;
      this.startTime = Date.now();
      this.lastSavedDuration = 0;
      this.isTracking = true;
      this.isPaused = false;
      this.pausedDuration = 0;
      this.pauseStartTime = null;
      this.hasCountedPlay = isRecentPlay && existingEntry ? true : false;

      // Add to history list immediately in memory
      this.addToHistoryMemory(song);
    } catch (error) {
      console.error('HistoryManager: Error starting tracking:', error);
    }
  }

  // Add song to memory history and trigger async save
  addToHistoryMemory(song) {
    try {
      const existingIndex = this.history.findIndex(
        (item) => item && item.id === song.id
      );

      if (existingIndex !== -1) {
        // Move to top and update timestamp
        const entry = this.history[existingIndex];
        entry.lastPlayed = Date.now();
        entry.playCount = (entry.playCount || 0) + 1;
        this.history.splice(existingIndex, 1);
        this.history.unshift(entry);
      } else {
        // Create new entry
        const newEntry = createHistoryEntry(song, 0);
        this.history.unshift(newEntry);
      }

      // Trim history
      if (this.history.length > 500) {
        this.history = this.history.slice(0, 500);
      }

      // Async write to disk without awaiting
      this.saveHistoryToDisk();
    } catch (err) {
      console.error('HistoryManager: Error in addToHistoryMemory:', err);
    }
  }

  // debounced disk write
  async saveHistoryToDisk() {
    if (this._saveTimeout) {
      clearTimeout(this._saveTimeout);
    }
    this._saveTimeout = setTimeout(async () => {
      try {
        await this.writeJsonFile(HISTORY_FILE_PATH, this.history);
      } catch (err) {
        console.error('HistoryManager: Disk write error:', err);
      }
    }, 2000); // Wait 2s before writing to batch any quick changes
  }

  // Stop tracking current song
  async stopTracking() {
    try {
      if (!this.isTracking || !this.currentTrack) {
        return;
      }

      // No longer saving progress incrementally to avoid any lag
      // const title = this.currentTrack.title;
      this.isTracking = false;
      this.currentTrack = null;
      this.startTime = null;
    } catch (error) {
      this.isTracking = false;
    }
  }

  // Pause tracking (when music is paused)
  pauseTracking() {
    try {
      if (!this.isTracking || this.isPaused) {
        return;
      }

      this.isPaused = true;
      this.pauseStartTime = Date.now();
    } catch (error) {
      console.error('HistoryManager: Error pausing tracking:', error);
    }
  }

  // Resume tracking (when music resumes)
  resumeTracking() {
    try {
      if (!this.isTracking || !this.isPaused) {
        return;
      }

      // Add the paused time to total paused duration
      if (this.pauseStartTime) {
        this.pausedDuration += Date.now() - this.pauseStartTime;
        this.pauseStartTime = null;
      }

      this.isPaused = false;
    } catch (error) {
      console.error('HistoryManager: Error resuming tracking:', error);
    }
  }

  // Save current progress (Disabled for performance)
  async saveProgress(_isFinal = false) {
    // Progress tracking disabled per user request to eliminate all lag
    return;
  }

  // Get full history from memory
  async getHistory() {
    return this.history;
  }

  // Get filtered history from memory
  async getFilteredHistory(filter = 'recent', searchQuery = '') {
    try {
      let filtered = [...this.history];

      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        filtered = filtered.filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.artist.toLowerCase().includes(query)
        );
      }

      switch (filter) {
        case 'most_played':
          filtered.sort((a, b) => b.playCount - a.playCount);
          break;
        case 'most_time':
          filtered.sort((a, b) => b.listenDuration - a.listenDuration);
          break;
        case 'recent':
        default:
          filtered.sort((a, b) => b.lastPlayed - a.lastPlayed);
          break;
      }

      return filtered;
    } catch (error) {
      console.error('HistoryManager: Filter error:', error);
      return this.history;
    }
  }

  // Simplified getter for stats (return defaults since user wants them removed)
  async getWeeklyStats() {
    return {
      weekStart: Date.now(),
      totalListenTime: 0,
      songsPlayed: 0,
      dailyStats: [0, 0, 0, 0, 0, 0, 0],
    };
  }

  async getHistoryStats() {
    const totalTime = this.history.reduce(
      (sum, item) => sum + (item.listenDuration || 0),
      0
    );
    return {
      totalSongs: this.history.length,
      totalPlayCount: this.history.reduce(
        (sum, item) => sum + (item.playCount || 0),
        0
      ),
      totalListenTime: totalTime,
      weeklyStats: await this.getWeeklyStats(),
      averageListenTime:
        this.history.length > 0 ? totalTime / this.history.length : 0,
    };
  }

  // Format duration for display (consistent across app)
  formatDuration(milliseconds) {
    if (!milliseconds || milliseconds < 0) {
      return '0:00';
    }

    const totalSeconds = Math.floor(milliseconds / 1000);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds
        .toString()
        .padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  }

  // Format time for statistics display (hours/minutes format)
  static formatTimeForStats(milliseconds) {
    if (!milliseconds || milliseconds < 0) {
      return '<1m';
    }

    const hours = Math.floor(milliseconds / (1000 * 60 * 60));
    const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    } else if (minutes > 0) {
      return `${minutes}m`;
    } else {
      return '<1m';
    }
  }

  // Save progress for background/cleanup (lightweight)
  async saveProgressBackground() {
    await this.saveProgress(true);
  }

  // Set background mode
  setBackgroundMode(isBackground) {
    this.isBackgroundMode = isBackground;
  }

  // Get current tracking info
  getCurrentTrackingInfo() {
    return {
      isTracking: this.isTracking,
      currentTrack: this.currentTrack,
      hasCountedPlay: this.hasCountedPlay,
      startTime: this.startTime,
      lastSavedDuration: this.lastSavedDuration,
      duration: this.startTime ? Date.now() - this.startTime : 0,
    };
  }

  // Clear all history
  async clearHistory() {
    try {
      this.history = [];
      await this.writeJsonFile(HISTORY_FILE_PATH, []);
      return true;
    } catch (err) {
      console.error('HistoryManager: Error clearing history:', err);
      return false;
    }
  }

  // Reset play counts
  async resetPlayCounts() {
    try {
      this.history = this.history.map((item) => ({ ...item, playCount: 1 }));
      await this.saveHistoryToDisk();
      return true;
    } catch (err) {
      return false;
    }
  }

  cleanup() {
    this.saveProgress(true);
    this.isTracking = false;
    this.currentTrack = null;
    this.startTime = null;
    this.isBackgroundMode = false;
  }
}

// Create singleton instance
const historyManager = new HistoryManager();

export default historyManager;
