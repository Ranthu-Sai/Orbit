/**
 * useCachedData Hook
 *
 * Custom hook for fetching data with automatic caching.
 * Eliminates unnecessary API calls on back navigation by returning
 * cached data when available.
 *
 * Usage:
 * const { data, loading, error, refresh } = useCachedData({
 *   cacheKey: 'playlist_abc123',
 *   fetchFn: () => fetchPlaylistData(playlistId),
 *   ttl: CACHE_TTL.PLAYLIST_DATA,
 * });
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { CacheManager } from '../Utils/NavigationCacheManager';
import { CACHE_TTL } from '../Utils/CacheConfig';

/**
 * Custom hook for cached data fetching
 * @param {object} options - Hook options
 * @param {string} options.cacheKey - Unique key for caching
 * @param {function} options.fetchFn - Async function to fetch data
 * @param {number} options.ttl - Time-to-live in milliseconds
 * @param {boolean} options.enabled - Whether to fetch (default: true)
 * @param {any} options.initialData - Initial data before fetch
 * @param {function} options.onSuccess - Callback on successful fetch
 * @param {function} options.onError - Callback on fetch error
 * @returns {object} - { data, loading, error, refresh, isCached }
 */
export function useCachedData({
  cacheKey,
  fetchFn,
  ttl = CACHE_TTL.DEFAULT,
  enabled = true,
  initialData = null,
  onSuccess = null,
  onError = null,
}) {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isCached, setIsCached] = useState(false);

  // Track if component is mounted
  const isMounted = useRef(true);
  const fetchInProgress = useRef(false);

  // Cleanup on unmount
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  /**
   * Load data - first from cache, then fetch if needed
   */
  const loadData = useCallback(
    async (forceRefresh = false) => {
      if (!enabled || !cacheKey) {
        return;
      }

      // Prevent duplicate fetches
      if (fetchInProgress.current && !forceRefresh) {
        return;
      }

      // Check cache first (unless force refresh)
      if (!forceRefresh) {
        // HYBRID CACHE: Check RAM -> Disk
        const cachedData = await CacheManager.getAsync(cacheKey);

        if (cachedData !== null) {
          if (isMounted.current) {
            setData(cachedData);
            setIsCached(true);
            setLoading(false);
            setError(null);
          }
          return;
        }
      }

      // Fetch fresh data
      fetchInProgress.current = true;

      if (isMounted.current) {
        setLoading(true);
        setError(null);
        setIsCached(false);
      }

      try {
        const freshData = await fetchFn();

        if (isMounted.current) {
          // Update state
          setData(freshData);
          setLoading(false);

          // Cache the data
          CacheManager.set(cacheKey, freshData, ttl);
          // Success callback
          if (onSuccess) {
            onSuccess(freshData);
          }
        }
      } catch (err) {
        console.error(`[useCachedData] Fetch error for ${cacheKey}:`, err);

        if (isMounted.current) {
          setError(err);
          setLoading(false);

          // Error callback
          if (onError) {
            onError(err);
          }
        }
      } finally {
        fetchInProgress.current = false;
      }
    },
    [cacheKey, fetchFn, ttl, enabled, onSuccess, onError]
  );

  /**
   * Force refresh data (bypasses cache)
   */
  const refresh = useCallback(() => {
    return loadData(true);
  }, [loadData]);

  /**
   * Invalidate cache without refetching
   */
  const invalidate = useCallback(() => {
    if (cacheKey) {
      CacheManager.invalidate(cacheKey);
    }
  }, [cacheKey]);

  // Initial load on mount
  useEffect(() => {
    loadData(false);
  }, [cacheKey, loadData]); // Re-load when cache key changes

  return {
    data,
    loading,
    error,
    refresh,
    invalidate,
    isCached,
  };
}

/**
 * Hook for caching screen data without fetch logic
 * Use this when you already have data and just want to cache it
 */
export function useCacheStore(cacheKey, ttl = CACHE_TTL.DEFAULT) {
  const store = useCallback(
    (data) => {
      if (cacheKey && data !== undefined) {
        CacheManager.set(cacheKey, data, ttl);
      }
    },
    [cacheKey, ttl]
  );

  const retrieve = useCallback(() => {
    return CacheManager.get(cacheKey);
  }, [cacheKey]);

  const invalidate = useCallback(() => {
    CacheManager.invalidate(cacheKey);
  }, [cacheKey]);

  return { store, retrieve, invalidate };
}

export default useCachedData;
