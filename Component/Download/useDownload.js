import { useState, useEffect, useCallback, useRef } from 'react';
import { PermissionHandler } from './PermissionHandler';
import { DownloadManager } from './DownloadManager';
import EventRegister from '../../Utils/EventRegister';
import { useUnifiedDownload } from './useUnifiedDownload';

// Global cache for download status to prevent excessive API calls
const downloadStatusCache = new Map();
const cacheExpiry = 30000; // 30 seconds cache

// Cleanup old cache entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of downloadStatusCache.entries()) {
    if (now - value.timestamp > cacheExpiry) {
      downloadStatusCache.delete(key);
    }
  }
}, 60000); // Clean up every minute

/**
 * useDownload - Custom hook for managing download state and functionality
 * Provides a clean interface for components to handle downloads
 * 
 * Note: This is now a wrapper around useUnifiedDownload for backward compatibility
 */
export const useDownload = (songData = null, isOffline = false) => {
  // Use the new unified download hook
  return useUnifiedDownload(songData, isOffline);
};
