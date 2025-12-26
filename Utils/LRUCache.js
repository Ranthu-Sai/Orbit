/**
 * LRUCache - Least Recently Used Cache with AsyncStorage Integration
 * 
 * A reusable, modular LRU cache implementation that:
 * - Tracks access timestamps for each cached item
 * - Evicts least recently used items when capacity is reached
 * - Works seamlessly with AsyncStorage
 * - Provides graceful degradation on storage errors
 * 
 * Usage:
 *   const cache = new LRUCache({ maxEntries: 50, namespace: 'playlist' });
 *   await cache.set('key', data);
 *   const data = await cache.get('key');
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Default configuration
const DEFAULT_CONFIG = {
    maxEntries: 50,           // Maximum number of entries to keep
    evictionPercent: 0.2,     // Remove 20% of oldest entries on eviction
    namespace: 'lru_cache',   // Prefix for AsyncStorage keys
    metadataKey: '_lru_meta', // Key for storing access metadata
};

/**
 * LRU Cache Manager Class
 * Provides smart cache eviction based on access patterns
 */
class LRUCacheManager {
    constructor(config = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
        this.namespace = this.config.namespace;

        // In-memory metadata cache for fast access time lookups
        // Structure: { key: { lastAccessed: timestamp, size: bytes } }
        this.metadata = new Map();

        // Flag to track if metadata has been loaded from storage
        this.metadataLoaded = false;

        // Lock to prevent concurrent evictions
        this.evictionInProgress = false;
    }

    /**
     * Generate namespaced key for AsyncStorage
     */
    _getStorageKey(key) {
        return `${this.namespace}_${key}`;
    }

    /**
     * Get the metadata storage key
     */
    _getMetadataStorageKey() {
        return `${this.namespace}${this.config.metadataKey}`;
    }

    /**
     * Load metadata from AsyncStorage (called once on first access)
     */
    async _ensureMetadataLoaded() {
        if (this.metadataLoaded) return;

        try {
            const stored = await AsyncStorage.getItem(this._getMetadataStorageKey());
            if (stored) {
                const parsed = JSON.parse(stored);
                this.metadata = new Map(Object.entries(parsed));
            }
            this.metadataLoaded = true;
        } catch (error) {
            console.warn(`[LRUCache:${this.namespace}] Failed to load metadata:`, error.message);
            this.metadataLoaded = true; // Continue with empty metadata
        }
    }

    /**
     * Persist metadata to AsyncStorage
     */
    async _saveMetadata() {
        try {
            const metaObject = Object.fromEntries(this.metadata);
            await AsyncStorage.setItem(
                this._getMetadataStorageKey(),
                JSON.stringify(metaObject)
            );
        } catch (error) {
            // Non-critical - metadata will be rebuilt on next access
            console.warn(`[LRUCache:${this.namespace}] Failed to save metadata:`, error.message);
        }
    }

    /**
     * Update access time for a key
     */
    _touch(key, size = 0) {
        this.metadata.set(key, {
            lastAccessed: Date.now(),
            size: size || this.metadata.get(key)?.size || 0,
        });
    }

    /**
     * Get eviction candidates sorted by last access time (oldest first)
     */
    getEvictionCandidates(count) {
        const entries = [...this.metadata.entries()];

        // Sort by lastAccessed ascending (oldest first)
        entries.sort((a, b) => a[1].lastAccessed - b[1].lastAccessed);

        // Return the oldest N keys
        return entries.slice(0, count).map(([key]) => key);
    }

    /**
     * Reconcile metadata with actual keys in storage
     * Useful for manual migration or after metadata corruption
     */
    async reconcile() {
        try {
            const allKeys = await AsyncStorage.getAllKeys();
            const relevantKeys = allKeys.filter(key => key.startsWith(`${this.namespace}_`));

            console.log(`[LRUCache:${this.namespace}] Reconciling ${relevantKeys.length} keys...`);

            for (const storageKey of relevantKeys) {
                const key = storageKey.replace(`${this.namespace}_`, '');
                if (!this.metadata.has(key)) {
                    // Just set a default timestamp if we don't want to read every item
                    // Reading every item just for reconcile might be too slow if there are hundreds
                    this.metadata.set(key, {
                        lastAccessed: Date.now() - 1000 * 60 * 60, // Assume 1 hour old
                        size: 0
                    });
                }
            }

            await this._saveMetadata();
            return relevantKeys.length;
        } catch (error) {
            console.warn(`[LRUCache:${this.namespace}] Reconciliation failed:`, error.message);
            return 0;
        }
    }

    /**
     * Evict oldest entries to make room for new data
     * @param {number} count - Number of entries to evict (default: 20% of max)
     * @returns {Promise<number>} - Number of entries evicted
     */
    async evictOldest(count = null) {
        // Prevent concurrent evictions
        if (this.evictionInProgress) {
            console.log(`[LRUCache:${this.namespace}] Eviction already in progress, skipping`);
            return 0;
        }

        this.evictionInProgress = true;

        try {
            await this._ensureMetadataLoaded();

            // If we have no metadata but might have keys on disk, try one quick reconciliation
            if (this.metadata.size === 0) {
                const found = await this.reconcile();
                if (found === 0) return 0;
            }

            // Calculate how many to evict
            const evictCount = count || Math.ceil(this.metadata.size * this.config.evictionPercent);


            if (evictCount <= 0 || this.metadata.size === 0) {
                return 0;
            }

            const candidates = this.getEvictionCandidates(evictCount);

            if (candidates.length === 0) {
                return 0;
            }

            console.log(`[LRUCache:${this.namespace}] 🧹 LRU eviction: Removing ${candidates.length} oldest entries`);

            // Remove from AsyncStorage
            const keysToRemove = candidates.map(key => this._getStorageKey(key));
            await AsyncStorage.multiRemove(keysToRemove);

            // Remove from metadata
            for (const key of candidates) {
                this.metadata.delete(key);
            }

            // Save updated metadata
            await this._saveMetadata();

            console.log(`[LRUCache:${this.namespace}] ✅ Evicted ${candidates.length} entries`);
            return candidates.length;

        } catch (error) {
            console.error(`[LRUCache:${this.namespace}] Eviction failed:`, error.message);
            return 0;
        } finally {
            this.evictionInProgress = false;
        }
    }

    /**
     * Get an item from cache
     * @param {string} key - Cache key
     * @returns {Promise<any|null>} - Cached data or null
     */
    async get(key) {
        try {
            await this._ensureMetadataLoaded();

            const storageKey = this._getStorageKey(key);
            const stored = await AsyncStorage.getItem(storageKey);

            if (!stored) {
                // Clean up orphaned metadata
                if (this.metadata.has(key)) {
                    this.metadata.delete(key);
                }
                return null;
            }

            const { data, timestamp, expiration } = JSON.parse(stored);

            // Check expiration if set
            if (expiration && Date.now() - timestamp > expiration * 60 * 1000) {
                await this.remove(key);
                return null;
            }

            // Update access time (LRU tracking)
            this._touch(key);

            // Debounce metadata saves (don't save on every get)
            // Metadata will be saved on next set/evict operation

            return data;

        } catch (error) {
            console.warn(`[LRUCache:${this.namespace}] Get failed for ${key}:`, error.message);
            return null;
        }
    }

    /**
     * Set an item in cache with automatic eviction if needed
     * @param {string} key - Cache key
     * @param {any} data - Data to cache
     * @param {number} expiration - Expiration in minutes (optional)
     * @returns {Promise<boolean>} - Success status
     */
    async set(key, data, expiration = null) {
        try {
            await this._ensureMetadataLoaded();

            const cacheItem = {
                data,
                timestamp: Date.now(),
                expiration,
            };

            const dataString = JSON.stringify(cacheItem);
            const dataSize = dataString.length;

            // Skip extremely large items (>500KB) to prevent SQLite issues
            if (dataSize > 500000) {
                console.log(`[LRUCache:${this.namespace}] Data too large (${dataSize} bytes), keeping in memory only`);
                return false;
            }

            const storageKey = this._getStorageKey(key);

            // Attempt to save
            try {
                await AsyncStorage.setItem(storageKey, dataString);

                // Update metadata
                this._touch(key, dataSize);
                await this._saveMetadata();

                // Check if we need proactive eviction (before hitting capacity)
                if (this.metadata.size > this.config.maxEntries) {
                    // Evict in background (don't await)
                    this.evictOldest().catch(e =>
                        console.warn(`[LRUCache:${this.namespace}] Background eviction failed:`, e.message)
                    );
                }

                return true;

            } catch (storageError) {
                // Check for disk full error
                if (this._isDiskFullError(storageError)) {
                    console.log(`[LRUCache:${this.namespace}] ⚠️ Disk full detected, performing LRU eviction...`);

                    // Evict oldest entries
                    const evicted = await this.evictOldest();

                    if (evicted > 0) {
                        // Retry save after eviction
                        try {
                            await AsyncStorage.setItem(storageKey, dataString);
                            this._touch(key, dataSize);
                            await this._saveMetadata();
                            console.log(`[LRUCache:${this.namespace}] ✅ Saved after eviction`);
                            return true;
                        } catch (retryError) {
                            console.warn(`[LRUCache:${this.namespace}] Save failed even after eviction`);
                        }
                    }
                }

                throw storageError;
            }

        } catch (error) {
            console.warn(`[LRUCache:${this.namespace}] Set failed for ${key}:`, error.message);
            return false;
        }
    }

    /**
     * Check if an error is a disk full error
     */
    _isDiskFullError(error) {
        if (!error?.message) return false;
        const msg = error.message.toLowerCase();
        return msg.includes('code 13') ||
            msg.includes('full') ||
            msg.includes('sqlite_full') ||
            msg.includes('disk');
    }

    /**
     * Remove an item from cache
     * @param {string} key - Cache key
     */
    async remove(key) {
        try {
            await AsyncStorage.removeItem(this._getStorageKey(key));
            this.metadata.delete(key);
            // Don't save metadata immediately for single removes
        } catch (error) {
            console.warn(`[LRUCache:${this.namespace}] Remove failed for ${key}:`, error.message);
        }
    }

    /**
     * Clear all cache entries for this namespace
     */
    async clear() {
        try {
            await this._ensureMetadataLoaded();

            // Get all keys to remove
            const keysToRemove = [...this.metadata.keys()].map(key => this._getStorageKey(key));
            keysToRemove.push(this._getMetadataStorageKey());

            if (keysToRemove.length > 0) {
                await AsyncStorage.multiRemove(keysToRemove);
            }

            this.metadata.clear();
            console.log(`[LRUCache:${this.namespace}] Cache cleared`);

        } catch (error) {
            console.error(`[LRUCache:${this.namespace}] Clear failed:`, error.message);
        }
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        await this._ensureMetadataLoaded();

        let totalSize = 0;
        let oldestAccess = Infinity;
        let newestAccess = 0;

        for (const [, meta] of this.metadata) {
            totalSize += meta.size || 0;
            oldestAccess = Math.min(oldestAccess, meta.lastAccessed);
            newestAccess = Math.max(newestAccess, meta.lastAccessed);
        }

        return {
            entries: this.metadata.size,
            maxEntries: this.config.maxEntries,
            totalSize,
            oldestAccessAge: oldestAccess < Infinity ? Date.now() - oldestAccess : 0,
            newestAccessAge: newestAccess > 0 ? Date.now() - newestAccess : 0,
        };
    }
}

// Pre-configured cache instances for common use cases
const playlistCache = new LRUCacheManager({
    namespace: 'playlist',
    maxEntries: 30,
    evictionPercent: 0.2,
});

const albumCache = new LRUCacheManager({
    namespace: 'album',
    maxEntries: 30,
    evictionPercent: 0.2,
});

const apiCache = new LRUCacheManager({
    namespace: 'api_cache',
    maxEntries: 50,
    evictionPercent: 0.25,
});

export {
    LRUCacheManager,
    playlistCache,
    albumCache,
    apiCache,
};

export default LRUCacheManager;
