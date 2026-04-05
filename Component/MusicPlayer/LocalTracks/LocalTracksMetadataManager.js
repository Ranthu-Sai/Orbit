import RNFS from 'react-native-fs';
import { InteractionManager } from 'react-native';
import AudioMetadataParser from '../../../Utils/ID3Parser';

const MANIFEST_FILE = 'local_music_manifest.json';
const CACHE_DIR = 'covers';
const BATCH_SIZE = 5; // Process 5 tracks at a time
const BATCH_DELAY = 1000; // 1 second delay between batches

/**
 * LocalTracksMetadataManager - Singleton service for managing persistent local music metadata
 *
 * Optimized for background processing without blocking UI
 */
class LocalTracksMetadataManager {
  constructor() {
    this.manifest = {};
    this.processingQueue = [];
    this.isProcessing = false;
    this.subscribers = new Set();
    this.isLoaded = false;

    // Set up paths
    this.baseDir = RNFS.DocumentDirectoryPath;
    this.manifestPath = `${this.baseDir}/${MANIFEST_FILE}`;
    this.cacheDir = `${this.baseDir}/${CACHE_DIR}`;
  }

  async initialize() {
    if (this.isLoaded) {
      return;
    }

    try {
      const cacheExists = await RNFS.exists(this.cacheDir);
      if (!cacheExists) {
        await RNFS.mkdir(this.cacheDir);
      }

      const manifestExists = await RNFS.exists(this.manifestPath);
      if (manifestExists) {
        const content = await RNFS.readFile(this.manifestPath, 'utf8');
        this.manifest = JSON.parse(content);
      } else {
        this.manifest = {};
      }

      this.isLoaded = true;
    } catch (error) {
      console.error('Error initializing LocalTracksMetadataManager:', error);
      this.manifest = {};
      this.isLoaded = true;
    }
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  notifySubscribers() {
    const manifestCopy = { ...this.manifest };
    for (const callback of this.subscribers) {
      callback(manifestCopy);
    }
  }

  async saveManifest() {
    try {
      await RNFS.writeFile(
        this.manifestPath,
        JSON.stringify(this.manifest),
        'utf8'
      );
    } catch (error) {
      console.error('Error saving manifest:', error);
    }
  }

  generateId(path) {
    return path?.replace(/[^a-zA-Z0-9]/g, '_') || 'unknown';
  }

  getMetadata(trackId) {
    return this.manifest[trackId];
  }

  async sync(scannedTracks) {
    if (!this.isLoaded) {
      await this.initialize();
    }

    const currentPaths = new Set(scannedTracks.map((t) => t.path));

    // Remove entries for deleted files
    let hasChanges = false;
    for (const id in this.manifest) {
      const entry = this.manifest[id];
      if (!currentPaths.has(entry.path)) {
        await this.deleteCachedArtwork(entry.localArtworkPath);
        delete this.manifest[id];
        hasChanges = true;
      }
    }

    // Queue tracks that need processing
    for (const track of scannedTracks) {
      const id = this.generateId(track.path);
      if (!this.manifest[id] || !this.manifest[id].isProcessed) {
        this.addToQueue({
          id,
          path: track.path,
          title: track.title,
          artist: track.artist,
        });
      }
    }

    if (hasChanges) {
      await this.saveManifest();
      this.notifySubscribers();
    }

    // Start background processing using InteractionManager
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
    if (!this.processingQueue.find((t) => t.id === task.id)) {
      this.processingQueue.push(task);
    }
  }

  /**
   * Start background processing using InteractionManager
   * This ensures processing only happens when the app is idle
   */
  startBackgroundProcessing() {
    if (this.isProcessing) {
      return;
    }

    // Wait for all interactions to complete before starting
    InteractionManager.runAfterInteractions(() => {
      this.processQueueInBatches();
    });
  }

  /**
   * Process queue in small batches with long delays
   * This prevents blocking the UI thread
   */
  async processQueueInBatches() {
    if (this.isProcessing || this.processingQueue.length === 0) {
      return;
    }

    this.isProcessing = true;
    let totalProcessed = 0;
    let totalArtworkFound = 0;

    while (this.processingQueue.length > 0) {
      // Process a small batch
      const batch = this.processingQueue.splice(0, BATCH_SIZE);

      for (const task of batch) {
        try {
          const result = await this.processTrack(task);
          if (result?.hasArtwork) {
            totalArtworkFound++;
          }
          totalProcessed++;
        } catch (error) {
          // Silently mark as processed
          this.manifest[task.id] = {
            path: task.path,
            title: task.title || 'Unknown',
            artist: task.artist || 'Unknown Artist',
            isProcessed: true,
            failed: true,
          };
          totalProcessed++;
        }
      }

      // Save manifest after each batch
      await this.saveManifest();
      this.notifySubscribers();

      // Long delay between batches to let UI breathe
      if (this.processingQueue.length > 0) {
        await new Promise((resolve) => setTimeout(resolve, BATCH_DELAY));
      }
    }

    this.isProcessing = false;
  }

  /**
   * Process a single track - Extract complete metadata
   * Optimized with smaller read sizes
   */
  async processTrack(task) {
    try {
      // Extract metadata with optimized read size
      const result = await AudioMetadataParser.extractMetadata(task.path);

      if (!result) {
        this.manifest[task.id] = {
          path: task.path,
          title: task.title || 'Unknown',
          artist: task.artist || 'Unknown Artist',
          isProcessed: true,
          noMetadata: true,
        };
        return { hasArtwork: false };
      }

      const { artwork, metadata } = result;
      let localArtworkPath = null;

      // Save artwork if found
      if (artwork && artwork.base64) {
        const extension = artwork.mimeType === 'image/png' ? 'png' : 'jpg';
        const fileName = `${task.id}_art.${extension}`;
        const filePath = `${this.cacheDir}/${fileName}`;

        await RNFS.writeFile(filePath, artwork.base64, 'base64');
        localArtworkPath = `file://${filePath}`;
      }

      // Update manifest with complete metadata
      this.manifest[task.id] = {
        path: task.path,
        title: metadata?.title || task.title || 'Unknown',
        artist: metadata?.artist || task.artist || 'Unknown Artist',
        album: metadata?.album || null,
        year: metadata?.year || null,
        genre: metadata?.genre || null,
        localArtworkPath,
        isProcessed: true,
        artworkMimeType: artwork?.mimeType,
      };

      return { hasArtwork: !!localArtworkPath };
    } catch (error) {
      // Gracefully handle errors
      this.manifest[task.id] = {
        path: task.path,
        title: task.title || 'Unknown',
        artist: task.artist || 'Unknown Artist',
        isProcessed: true,
        failed: true,
      };
      throw error;
    }
  }

  /**
   * Force re-process all tracks
   */
  async reprocessAll() {
    for (const id in this.manifest) {
      this.manifest[id].isProcessed = false;
      this.addToQueue(this.manifest[id]);
    }
    this.startBackgroundProcessing();
  }
}

export default new LocalTracksMetadataManager();
