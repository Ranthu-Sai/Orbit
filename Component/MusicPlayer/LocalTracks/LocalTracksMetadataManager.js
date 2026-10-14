import RNFS from 'react-native-fs';
import { InteractionManager } from 'react-native';
import AudioMetadataParser from '../../../Utils/ID3Parser';
import NativeMetadataReader from '../../../Utils/NativeMetadataReader';
import { pathToKey } from '../../../Utils/LocalMusicUtils';

const MANIFEST_FILE = 'local_music_manifest.json';
const MANIFEST_BACKUP_FILE = 'local_music_manifest.backup.json';
const CACHE_DIR = 'covers';

// Bump when extraction logic changes so existing entries are re-read once.
// v2: native reader (full multi-value tags, duration, artwork written to file)
const MANIFEST_VERSION = 2;

const BATCH_SIZE = 8; // Tracks per batch before yielding to the UI
const MAX_ATTEMPTS = 3; // Failed tracks are retried on later syncs up to this many times
const NOTIFY_INTERVAL_MS = 1500; // Throttle UI updates while processing
const SAVE_DEBOUNCE_MS = 2000; // Coalesce manifest writes

const yieldToUI = () =>
  new Promise((resolve) => {
    InteractionManager.runAfterInteractions(() => setTimeout(resolve, 0));
  });

/**
 * LocalTracksMetadataManager - Singleton service for managing persistent local music metadata
 *
 * Metadata is read on a background native thread when available (falls back
 * to the JS parser), persisted to a manifest with a backup copy, and pushed
 * to subscribers in throttled batches so the list doesn't re-render constantly.
 */
class LocalTracksMetadataManager {
  constructor() {
    this.manifest = {};
    this.processingQueue = [];
    this.isProcessing = false;
    this.subscribers = new Set();
    this.isLoaded = false;
    this.initPromise = null;
    this.knownPaths = null; // Paths seen in the latest complete scan

    // Throttled notification state
    this.pendingChangedIds = new Set();
    this.notifyTimer = null;
    this.lastNotifyTime = 0;
    this.saveTimer = null;

    // Progress of the current processing run
    this.progress = { processed: 0, total: 0 };

    // Set up paths
    this.baseDir = RNFS.DocumentDirectoryPath;
    this.manifestPath = `${this.baseDir}/${MANIFEST_FILE}`;
    this.backupPath = `${this.baseDir}/${MANIFEST_BACKUP_FILE}`;
    this.cacheDir = `${this.baseDir}/${CACHE_DIR}`;
  }

  /**
   * Load the manifest once. Concurrent callers share the same promise so a
   * second load can never overwrite in-memory updates.
   */
  initialize() {
    if (this.isLoaded) {
      return Promise.resolve();
    }
    if (!this.initPromise) {
      this.initPromise = this._load().finally(() => {
        this.isLoaded = true;
      });
    }
    return this.initPromise;
  }

  async _readManifestFile(path) {
    if (!(await RNFS.exists(path))) {
      return null;
    }
    const content = await RNFS.readFile(path, 'utf8');
    return JSON.parse(content);
  }

  async _load() {
    try {
      if (!(await RNFS.exists(this.cacheDir))) {
        await RNFS.mkdir(this.cacheDir);
      }
    } catch (e) {
      // Directory may already exist
    }

    let data = null;
    try {
      data = await this._readManifestFile(this.manifestPath);
    } catch (error) {
      // Main manifest is corrupt: keep it aside instead of overwriting it
      // with an empty one, then fall back to the backup.
      await RNFS.moveFile(
        this.manifestPath,
        `${this.manifestPath}.corrupt`
      ).catch(() => {});
      try {
        data = await this._readManifestFile(this.backupPath);
      } catch (backupError) {
        data = null;
      }
    }

    // Old format: plain { id: entry } object without a version
    const isVersioned = data && typeof data === 'object' && data.entries;
    const version = isVersioned ? data.version || 1 : 1;
    const rawEntries = (isVersioned ? data.entries : data) || {};

    // Re-key every entry with the collision-free key for its path
    const entries = {};
    for (const entry of Object.values(rawEntries)) {
      if (!entry || !entry.path) {
        continue;
      }
      const id = pathToKey(entry.path);
      entries[id] = { ...entry, id };
      if (version < MANIFEST_VERSION) {
        // Re-read once with the current extractor; keep old values meanwhile
        entries[id].isProcessed = false;
        entries[id].attempts = 0;
      }
    }

    this.manifest = entries;
    if (version < MANIFEST_VERSION && Object.keys(entries).length > 0) {
      await this.saveManifest();
    }
  }

  /**
   * @param {(manifest: Object, changedIds: Set<string>|null, progress: Object) => void} callback
   *   changedIds is null when every entry may have changed.
   */
  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  getProgress() {
    return { ...this.progress, isProcessing: this.isProcessing };
  }

  _emit(changedIds) {
    this.lastNotifyTime = Date.now();
    const progress = this.getProgress();
    for (const callback of this.subscribers) {
      try {
        callback(this.manifest, changedIds, progress);
      } catch (e) {
        // A failing subscriber must not break processing
      }
    }
  }

  /**
   * Queue a throttled notification. Pass null to signal a full refresh.
   */
  notifySubscribers(changedIds = null, { immediate = false } = {}) {
    if (changedIds === null) {
      this.pendingChangedIds = null;
    } else if (this.pendingChangedIds) {
      changedIds.forEach((id) => this.pendingChangedIds.add(id));
    }

    const flush = () => {
      this.notifyTimer = null;
      const ids = this.pendingChangedIds;
      this.pendingChangedIds = new Set();
      this._emit(ids);
    };

    if (immediate) {
      if (this.notifyTimer) {
        clearTimeout(this.notifyTimer);
      }
      flush();
      return;
    }
    if (this.notifyTimer) {
      return;
    }
    const wait = Math.max(
      0,
      NOTIFY_INTERVAL_MS - (Date.now() - this.lastNotifyTime)
    );
    this.notifyTimer = setTimeout(flush, wait);
  }

  /**
   * Write the manifest, keeping the previous version as a backup so a crash
   * mid-write can always be recovered.
   */
  async saveManifest() {
    if (this.saveTimer) {
      clearTimeout(this.saveTimer);
      this.saveTimer = null;
    }
    try {
      if (await RNFS.exists(this.manifestPath)) {
        await RNFS.copyFile(this.manifestPath, this.backupPath).catch(() => {});
      }
      await RNFS.writeFile(
        this.manifestPath,
        JSON.stringify({ version: MANIFEST_VERSION, entries: this.manifest }),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving manifest:', error);
    }
  }

  saveManifestSoon() {
    if (this.saveTimer) {
      return;
    }
    this.saveTimer = setTimeout(() => {
      this.saveTimer = null;
      this.saveManifest();
    }, SAVE_DEBOUNCE_MS);
  }

  generateId(path) {
    return pathToKey(path);
  }

  getMetadata(trackId) {
    return this.manifest[trackId];
  }

  _needsProcessing(entry, track) {
    if (!entry) {
      return true;
    }
    // File replaced or edited since we read it
    if (
      (track.size && entry.size && track.size !== entry.size) ||
      (track.mtime && entry.mtime && track.mtime !== entry.mtime)
    ) {
      return true;
    }
    if (!entry.isProcessed) {
      return true;
    }
    // Retry transient failures a limited number of times
    return !!entry.failed && (entry.attempts || 0) < MAX_ATTEMPTS;
  }

  /**
   * Reconcile the manifest with a scan result and queue tracks needing work.
   * @param {Array} scannedTracks - [{ path, title, artist, size, mtime }]
   * @param {Object} options
   * @param {boolean} options.prune - Remove entries for files not in this scan.
   *   Pass false when the scan may be incomplete (unreadable folders), otherwise
   *   a partial scan would wipe metadata and covers for every missing file.
   */
  async sync(scannedTracks, { prune = true } = {}) {
    await this.initialize();

    let hasChanges = false;

    if (prune) {
      const currentPaths = new Set(scannedTracks.map((t) => t.path));
      this.knownPaths = currentPaths;
      for (const id of Object.keys(this.manifest)) {
        const entry = this.manifest[id];
        if (!currentPaths.has(entry.path)) {
          await this.deleteCachedArtwork(entry.localArtworkPath);
          delete this.manifest[id];
          hasChanges = true;
        }
      }
      // Drop queued work for files that are gone
      this.processingQueue = this.processingQueue.filter((t) =>
        currentPaths.has(t.path)
      );
    } else if (this.knownPaths) {
      // Partial scan: nothing is removed, but newly found files are valid
      scannedTracks.forEach((t) => this.knownPaths.add(t.path));
    }

    for (const track of scannedTracks) {
      const id = this.generateId(track.path);
      if (this._needsProcessing(this.manifest[id], track)) {
        this.addToQueue({
          id,
          path: track.path,
          title: track.title,
          artist: track.artist,
          size: track.size,
          mtime: track.mtime,
        });
      }
    }

    if (hasChanges) {
      await this.saveManifest();
      this.notifySubscribers(null, { immediate: true });
    }

    this.startBackgroundProcessing();
  }

  async deleteCachedArtwork(path) {
    if (!path) {
      return;
    }
    try {
      const cleanPath = path.replace('file://', '');
      if (await RNFS.exists(cleanPath)) {
        await RNFS.unlink(cleanPath);
      }
    } catch (e) {
      // Ignore errors
    }
  }

  addToQueue(task) {
    if (!task.id) {
      task.id = this.generateId(task.path);
    }
    if (!this.processingQueue.find((t) => t.id === task.id)) {
      this.processingQueue.push(task);
      if (this.isProcessing) {
        this.progress.total++;
      }
    }
  }

  /**
   * Start background processing after current interactions finish
   */
  startBackgroundProcessing() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    InteractionManager.runAfterInteractions(() => {
      this.processQueueInBatches();
    });
  }

  async processQueueInBatches() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    this.progress = { processed: 0, total: this.processingQueue.length };
    this.notifySubscribers(new Set(), { immediate: true });

    try {
      while (this.processingQueue.length > 0) {
        const batch = this.processingQueue.splice(0, BATCH_SIZE);
        const changed = new Set();

        for (const task of batch) {
          // Skip files removed by a newer scan while this task was queued
          if (this.knownPaths && !this.knownPaths.has(task.path)) {
            this.progress.processed++;
            continue;
          }
          await this.processTrack(task);
          changed.add(task.id);
          this.progress.processed++;
        }

        this.saveManifestSoon();
        this.notifySubscribers(changed);

        // Let touches, scrolling and playback controls run between batches
        await yieldToUI();
      }
    } finally {
      this.isProcessing = false;
      await this.saveManifest();
      this.notifySubscribers(new Set(), { immediate: true });
    }
  }

  /**
   * Extract metadata for one track. Never throws; failures are recorded with
   * an attempt count so the track is retried on a later sync.
   */
  async processTrack(task) {
    const previous = this.manifest[task.id] || {};
    const base = {
      id: task.id,
      path: task.path,
      size: task.size,
      mtime: task.mtime,
    };
    const artworkFile = `${this.cacheDir}/${task.id}.jpg`;

    try {
      // 1) Native reader: background thread, artwork written straight to disk
      const native = await NativeMetadataReader.readMetadataToFile(
        task.path,
        artworkFile
      );
      if (native) {
        const localArtworkPath = native.artworkPath
          ? `file://${native.artworkPath}`
          : null;
        this.manifest[task.id] = {
          ...base,
          title: native.title || task.title || 'Unknown',
          artist: native.artist || task.artist || 'Unknown Artist',
          album: native.album || null,
          year: native.year || null,
          genre: native.genre || null,
          duration: native.duration || 0,
          localArtworkPath,
          isProcessed: true,
          attempts: 0,
        };
        await this._dropStaleArtwork(previous, localArtworkPath);
        return;
      }

      // 2) JS parser fallback (older native build or unsupported by the library)
      const result = await AudioMetadataParser.extractMetadata(task.path);
      if (!result) {
        this._recordFailure(task, base, previous, { noMetadata: true });
        return;
      }

      const { artwork, metadata } = result;
      let localArtworkPath = null;
      if (artwork && artwork.base64) {
        await RNFS.writeFile(artworkFile, artwork.base64, 'base64');
        localArtworkPath = `file://${artworkFile}`;
      }

      this.manifest[task.id] = {
        ...base,
        title: metadata?.title || task.title || 'Unknown',
        artist: metadata?.artist || task.artist || 'Unknown Artist',
        album: metadata?.album || null,
        year: metadata?.year || null,
        genre: metadata?.genre || null,
        duration: previous.duration || 0,
        localArtworkPath,
        isProcessed: true,
        attempts: 0,
      };
      await this._dropStaleArtwork(previous, localArtworkPath);
    } catch (error) {
      this._recordFailure(task, base, previous, { failed: true });
    }
  }

  // Remove a cover file left over from an earlier read (e.g. old key format)
  async _dropStaleArtwork(previous, currentArtworkPath) {
    if (
      previous.localArtworkPath &&
      previous.localArtworkPath !== currentArtworkPath
    ) {
      await this.deleteCachedArtwork(previous.localArtworkPath);
    }
  }

  _recordFailure(task, base, previous, flags) {
    const attempts = (previous.attempts || 0) + 1;
    this.manifest[task.id] = {
      ...previous,
      ...base,
      // Keep any previously extracted values rather than blanking them
      title: previous.title || task.title || 'Unknown',
      artist: previous.artist || task.artist || 'Unknown Artist',
      isProcessed: true,
      // Missing tags are final; read errors are retried up to MAX_ATTEMPTS
      failed: attempts < MAX_ATTEMPTS ? true : !!flags.failed,
      noMetadata: !!flags.noMetadata,
      attempts,
    };
  }

  /**
   * Force re-process all tracks
   */
  async reprocessAll() {
    await this.initialize();
    for (const id of Object.keys(this.manifest)) {
      const entry = this.manifest[id];
      entry.isProcessed = false;
      entry.attempts = 0;
      this.addToQueue({
        id,
        path: entry.path,
        title: entry.title,
        artist: entry.artist,
        size: entry.size,
        mtime: entry.mtime,
      });
    }
    await this.saveManifest();
    this.startBackgroundProcessing();
  }
}

export default new LocalTracksMetadataManager();
