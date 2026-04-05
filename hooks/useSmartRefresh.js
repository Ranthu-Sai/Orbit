/**
 * useSmartRefresh Hook
 *
 * Provides pull-to-refresh functionality with smart refresh logic.
 * Only refreshes when user explicitly pulls, never on back navigation.
 *
 * Usage:
 * const { refreshing, onRefresh, refreshControl } = useSmartRefresh(fetchFn);
 *
 * <ScrollView refreshControl={refreshControl}>
 *   ...
 * </ScrollView>
 */

import { useState, useCallback, useMemo } from 'react';
import { RefreshControl } from 'react-native';
import { CacheManager } from '../Utils/NavigationCacheManager';

/**
 * Custom hook for smart pull-to-refresh
 * @param {function} refreshFn - Async function to refresh data
 * @param {object} options - Additional options
 * @param {string} options.cacheKey - Cache key to invalidate on refresh
 * @param {string[]} options.cacheKeysToInvalidate - Multiple cache keys to invalidate
 * @param {number} options.tintColor - Refresh indicator color
 * @param {function} options.onRefreshStart - Callback when refresh starts
 * @param {function} options.onRefreshComplete - Callback when refresh completes
 * @returns {object} - { refreshing, onRefresh, refreshControl }
 */
export function useSmartRefresh(refreshFn, options = {}) {
  const {
    cacheKey = null,
    cacheKeysToInvalidate = [],
    tintColor = '#1DB954',
    onRefreshStart = null,
    onRefreshComplete = null,
  } = options;

  const [refreshing, setRefreshing] = useState(false);

  /**
   * Handle refresh action
   */
  const onRefresh = useCallback(async () => {
    if (refreshing) {
      return;
    }

    setRefreshing(true);

    // Callback: refresh started
    if (onRefreshStart) {
      onRefreshStart();
    }

    try {
      // Invalidate cache(s) before refresh
      if (cacheKey) {
        CacheManager.invalidate(cacheKey);
      }

      if (cacheKeysToInvalidate.length > 0) {
        cacheKeysToInvalidate.forEach((key) => {
          CacheManager.invalidate(key);
        });
      }

      // Execute refresh function
      await refreshFn();
    } catch (error) {
      console.error('[SmartRefresh] Refresh failed:', error);
    } finally {
      setRefreshing(false);

      // Callback: refresh complete
      if (onRefreshComplete) {
        onRefreshComplete();
      }
    }
  }, [
    refreshing,
    refreshFn,
    cacheKey,
    cacheKeysToInvalidate,
    onRefreshStart,
    onRefreshComplete,
  ]);

  /**
   * Pre-configured RefreshControl component
   */
  const refreshControl = useMemo(
    () => (
      <RefreshControl
        refreshing={refreshing}
        onRefresh={onRefresh}
        tintColor={tintColor}
        colors={[tintColor]}
        progressBackgroundColor="#1E1E1E"
      />
    ),
    [refreshing, onRefresh, tintColor]
  );

  return {
    refreshing,
    onRefresh,
    refreshControl,
  };
}

/**
 * Hook for background refresh without UI indicator
 * Silently refreshes data without showing loading state
 */
export function useBackgroundRefresh(refreshFn, options = {}) {
  const { cacheKey = null, onComplete = null } = options;

  const refreshInBackground = useCallback(async () => {
    try {
      const newData = await refreshFn();

      // Update cache with fresh data
      if (cacheKey && newData) {
        CacheManager.set(cacheKey, newData);
      }

      if (onComplete) {
        onComplete(newData);
      }

      return newData;
    } catch (error) {
      console.error('[BackgroundRefresh] Failed:', error);
      return null;
    }
  }, [refreshFn, cacheKey, onComplete]);

  return { refreshInBackground };
}

export default useSmartRefresh;
