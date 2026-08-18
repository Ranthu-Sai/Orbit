import { useState, useEffect } from 'react';
import { ToastAndroid } from 'react-native';
import { StorageManager } from '../../../Utils/StorageManager';
import { UnifiedDownloadService } from '../../../Utils/UnifiedDownloadService';
import { resolveSongSource } from '../../../Utils/PlaybackUtils';

export const useSongDownload = (song, propIsDownloaded, onDelete, closeMenu) => {
  const [isDownloaded, setIsDownloaded] = useState(propIsDownloaded || false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);

  // Check if song is already downloaded when component mounts
  useEffect(() => {
    if (propIsDownloaded !== null && propIsDownloaded !== undefined) {
      // If prop is provided, use it
      setIsDownloaded(propIsDownloaded);
    } else if (song?.id) {
      // Otherwise check storage
      checkIfDownloaded(song.id);
    }
  }, [song?.id, propIsDownloaded]);

  // Function to check if a song is already downloaded
  const checkIfDownloaded = async (songId) => {
    try {
      if (!songId) {
        return false;
      }

      // Use StorageManager to check if song is downloaded
      const downloaded = await StorageManager.isSongDownloaded(songId);
      setIsDownloaded(downloaded);
      return downloaded;
    } catch (error) {
      console.error('Error checking download status:', error);
      return false;
    }
  };

  const downloadSong = async () => {
    // Close menu if it's open
    if (closeMenu) {
      closeMenu();
    }

    if (!song?.id) {
      ToastAndroid.show('Invalid song data', ToastAndroid.SHORT);
      return;
    }

    try {
      // Check if already downloaded or downloading
      if (isDownloaded) {
        ToastAndroid.show('Song already downloaded', ToastAndroid.SHORT);
        return;
      }

      if (isDownloading) {
        ToastAndroid.show(
          `Download in progress: ${downloadProgress}%`,
          ToastAndroid.SHORT
        );
        return;
      }

      setIsDownloading(true);
      setDownloadProgress(0);

      const actualSource = resolveSongSource(song);

      // Use the unified download service with proper source
      const success = await UnifiedDownloadService.downloadSong(
        {
          ...song,
          source: actualSource,
          isDabTrack: actualSource === 'dab',
        },
        (progress) => {
          setDownloadProgress(progress);
        }
      );

      if (success) {
        setIsDownloaded(true);
        setDownloadProgress(100);
        ToastAndroid.show('Download completed', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Download failed:', error);
      ToastAndroid.show(`Download failed: ${error.message}`, ToastAndroid.LONG);
    } finally {
      setIsDownloading(false);
    }
  };

  const deleteSong = async () => {
    if (closeMenu) {
      closeMenu();
    }
    
    if (!song?.id) {
      ToastAndroid.show('Invalid song data', ToastAndroid.SHORT);
      return;
    }

    try {
      // Check if song is actually downloaded
      if (!isDownloaded) {
        ToastAndroid.show('Song is not downloaded', ToastAndroid.SHORT);
        return;
      }

      // Call the delete callback if provided
      if (onDelete) {
        await onDelete(song.id, song.title);
      } else {
        // Fallback: directly delete using StorageManager with localSongPath if available
        await StorageManager.removeDownloadedSongMetadata(
          song.id,
          song.localSongPath
        );
        setIsDownloaded(false);
        ToastAndroid.show('Song deleted', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Delete failed:', error);
      ToastAndroid.show(`Delete failed: ${error.message}`, ToastAndroid.LONG);
    }
  };

  return { isDownloaded, isDownloading, downloadProgress, downloadSong, deleteSong };
};
