import React, { useState, useEffect, useCallback } from 'react';
import { DeviceEventEmitter } from 'react-native';
import { StorageManager } from '../../Utils/StorageManager';
import useOffline from '../../hooks/useOffline';

/**
 * DownloadedSongsManager - Manages downloaded songs metadata and storage operations
 * Handles metadata operations, storage management, and provides download status checking
 */
const DownloadedSongsManager = ({ 
  onDownloadedSongsChanged,
  onDownloadStatusChanged,
  autoCleanup = true
}) => {
  const [downloadedSongs, setDownloadedSongs] = useState([]);
  const [downloadedSongsMetadata, setDownloadedSongsMetadata] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  
  const { isOffline } = useOffline();

  // Load all downloaded songs metadata
  const loadDownloadedSongs = useCallback(async () => {
    try {
      setIsLoading(true);

      // Clean up orphaned metadata if auto cleanup is enabled
      if (autoCleanup) {
        await StorageManager.cleanupOrphanedMetadata();
      }

      const allMetadata = await StorageManager.getAllDownloadedSongsMetadata();

      if (!allMetadata || Object.keys(allMetadata).length === 0) {
        setDownloadedSongs([]);
        setDownloadedSongsMetadata({});
        return [];
      }

      setDownloadedSongsMetadata(allMetadata);

      // Convert metadata to array format for easier handling
      const songsArray = [];
      
      for (const [songId, metadata] of Object.entries(allMetadata)) {
        try {
          // Verify the song file still exists
          const songExists = await StorageManager.isSongDownloaded(songId);
          
          if (songExists) {
            const songPath = await StorageManager.getSongPath(songId);
            const artworkPath = await StorageManager.getArtworkPath(songId);
            
            const song = {
              id: songId,
              title: metadata.title || 'Unknown Title',
              artist: metadata.artist || 'Unknown Artist',
              album: metadata.album || 'Unknown Album',
              duration: metadata.duration || 0,
              downloadTime: metadata.downloadTime || Date.now(),
              quality: metadata.quality || 'unknown',
              fileSize: metadata.fileSize || 0,
              songPath,
              artworkPath,
              isLocal: true,
              sourceType: 'download',
              ...metadata
            };
            
            songsArray.push(song);
          } else {
            console.warn(`DownloadedSongsManager: Song file not found for ${songId}, will be cleaned up`);
          }
        } catch (songError) {
          console.error(`DownloadedSongsManager: Error processing song ${songId}:`, songError);
        }
      }

      // Sort by download time (newest first)
      songsArray.sort((a, b) => (b.downloadTime || 0) - (a.downloadTime || 0));
      
      setDownloadedSongs(songsArray);
      
      if (onDownloadedSongsChanged) {
        onDownloadedSongsChanged(songsArray);
      }
      return songsArray;
      
    } catch (error) {
      console.error('DownloadedSongsManager: Error loading downloaded songs:', error);
      setDownloadedSongs([]);
      setDownloadedSongsMetadata({});
      return [];
    } finally {
      setIsLoading(false);
    }
  }, [autoCleanup, onDownloadedSongsChanged]);

  // Check if a specific song is downloaded
  const isSongDownloaded = useCallback(async (songId) => {
    try {
      if (!songId) {
        return false;
      }

      // If offline and the song is in our metadata, it's likely downloaded
      if (isOffline && downloadedSongsMetadata[songId]) {
        return true;
      }

      // Use StorageManager to check
      const isDownloaded = await StorageManager.isSongDownloaded(songId);
      
      if (onDownloadStatusChanged) {
        onDownloadStatusChanged(songId, isDownloaded);
      }
      
      return isDownloaded;
    } catch (error) {
      console.error(`DownloadedSongsManager: Error checking download status for ${songId}:`, error);
      return false;
    }
  }, [isOffline, downloadedSongsMetadata, onDownloadStatusChanged]);

  // Get downloaded song metadata
  const getDownloadedSongMetadata = useCallback((songId) => {
    return downloadedSongsMetadata[songId] || null;
  }, [downloadedSongsMetadata]);

  // Remove a downloaded song
  const removeDownloadedSong = useCallback(async (songId) => {
    try {
      // Remove using StorageManager
      await StorageManager.removeDownloadedSongMetadata(songId);
      
      // Update local state
      setDownloadedSongs(prev => prev.filter(song => song.id !== songId));
      setDownloadedSongsMetadata(prev => {
        const updated = { ...prev };
        delete updated[songId];
        return updated;
      });
      
      if (onDownloadedSongsChanged) {
        onDownloadedSongsChanged(downloadedSongs.filter(song => song.id !== songId));
      }
      
      if (onDownloadStatusChanged) {
        onDownloadStatusChanged(songId, false);
      }
      return true;
    } catch (error) {
      console.error(`DownloadedSongsManager: Error removing song ${songId}:`, error);
      return false;
    }
  }, [downloadedSongs, onDownloadedSongsChanged, onDownloadStatusChanged]);

  // Get download statistics
  const getDownloadStats = useCallback(() => {
    const totalSongs = downloadedSongs.length;
    const totalSize = downloadedSongs.reduce((sum, song) => sum + (song.fileSize || 0), 0);
    const oldestDownload = downloadedSongs.length > 0 ? 
      Math.min(...downloadedSongs.map(song => song.downloadTime || Date.now())) : null;
    const newestDownload = downloadedSongs.length > 0 ? 
      Math.max(...downloadedSongs.map(song => song.downloadTime || Date.now())) : null;
    
    return {
      totalSongs,
      totalSize,
      oldestDownload,
      newestDownload,
      averageFileSize: totalSongs > 0 ? totalSize / totalSongs : 0
    };
  }, [downloadedSongs]);

  // Search downloaded songs
  const searchDownloadedSongs = useCallback((query) => {
    if (!query || query.trim() === '') {
      return downloadedSongs;
    }
    
    const searchTerm = query.toLowerCase().trim();
    
    return downloadedSongs.filter(song => 
      song.title.toLowerCase().includes(searchTerm) ||
      song.artist.toLowerCase().includes(searchTerm) ||
      song.album.toLowerCase().includes(searchTerm)
    );
  }, [downloadedSongs]);

  // Filter downloaded songs by criteria
  const filterDownloadedSongs = useCallback((criteria) => {
    let filtered = [...downloadedSongs];
    
    if (criteria.artist) {
      filtered = filtered.filter(song => 
        song.artist.toLowerCase().includes(criteria.artist.toLowerCase())
      );
    }
    
    if (criteria.album) {
      filtered = filtered.filter(song => 
        song.album.toLowerCase().includes(criteria.album.toLowerCase())
      );
    }
    
    if (criteria.quality) {
      filtered = filtered.filter(song => song.quality === criteria.quality);
    }
    
    if (criteria.dateRange) {
      const { start, end } = criteria.dateRange;
      filtered = filtered.filter(song => {
        const downloadTime = song.downloadTime || 0;
        return downloadTime >= start && downloadTime <= end;
      });
    }
    
    return filtered;
  }, [downloadedSongs]);

  // Listen for download events
  useEffect(() => {
    const downloadListener = DeviceEventEmitter.addListener(
      'songDownloaded',
      (data) => {
        loadDownloadedSongs();
      }
    );

    const deleteListener = DeviceEventEmitter.addListener(
      'songDeleted',
      (data) => {
        loadDownloadedSongs();
      }
    );

    return () => {
      downloadListener.remove();
      deleteListener.remove();
    };
  }, [loadDownloadedSongs]);

  // Load downloaded songs on mount
  useEffect(() => {
    let mounted = true;

    const initializeOnce = async () => {
      if (mounted) {
        await loadDownloadedSongs();
      }
    };

    initializeOnce();

    return () => {
      mounted = false;
    };
  }, []); // Remove dependencies to prevent re-initialization

  return {
    downloadedSongs,
    downloadedSongsMetadata,
    isLoading,
    loadDownloadedSongs,
    isSongDownloaded,
    getDownloadedSongMetadata,
    removeDownloadedSong,
    getDownloadStats,
    searchDownloadedSongs,
    filterDownloadedSongs
  };
};

export default DownloadedSongsManager;
