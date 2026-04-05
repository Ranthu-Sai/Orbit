import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Platform,
  PermissionsAndroid,
  ToastAndroid,
  Linking,
} from 'react-native';
import { check, request, PERMISSIONS, RESULTS } from 'react-native-permissions';
import { StorageManager } from '../../../Utils/StorageManager';
import LocalTracksMetadataManager from './LocalTracksMetadataManager';
import NetInfo from '@react-native-community/netinfo';
import Cover from '../../../Images/Music.jpeg';

export const useDeviceLibrary = () => {
  const [localMusic, setLocalMusic] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);

  // Subscribe to metadata updates from background processor
  useEffect(() => {
    const unsubscribe = LocalTracksMetadataManager.subscribe((manifest) => {
      setLocalMusic((currentTracks) => {
        if (currentTracks.length === 0) {
          return currentTracks;
        }
        return currentTracks.map((track) => {
          const id = LocalTracksMetadataManager.generateId(track.path);
          const meta = manifest[id];
          if (meta) {
            // Merge all cached metadata including artist, album, etc.
            return {
              ...track,
              title: meta.title || track.title,
              artist: meta.artist || track.artist,
              album: meta.album || track.album,
              year: meta.year,
              genre: meta.genre,
              artwork: meta.localArtworkPath
                ? { uri: meta.localArtworkPath }
                : track.artwork,
              cover: meta.localArtworkPath
                ? { uri: meta.localArtworkPath }
                : track.cover,
            };
          }
          return track;
        });
      });
    });
    return unsubscribe;
  }, []);

  const requestStoragePermission = async () => {
    try {
      const androidVersion = Platform.Version;
      let permissionResult;

      if (androidVersion >= 33) {
        permissionResult = await check(PERMISSIONS.ANDROID.READ_MEDIA_AUDIO);
        if (permissionResult !== RESULTS.GRANTED) {
          permissionResult = await request(
            PERMISSIONS.ANDROID.READ_MEDIA_AUDIO
          );
        }
      } else {
        const alreadyGranted = await PermissionsAndroid.check(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE
        );
        if (alreadyGranted) {
          return { granted: true };
        }
        permissionResult = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
          {
            title: 'Music App Storage Permission',
            message:
              'This app needs access to your storage to fetch music files.',
            buttonNeutral: 'Ask Me Later',
            buttonNegative: 'Cancel',
            buttonPositive: 'OK',
          }
        );
      }

      if (
        permissionResult === RESULTS.GRANTED ||
        permissionResult === PermissionsAndroid.RESULTS.GRANTED
      ) {
        return { granted: true };
      } else if (
        permissionResult === RESULTS.BLOCKED ||
        permissionResult === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
      ) {
        return { granted: false, neverAskAgain: true };
      } else {
        return { granted: false };
      }
    } catch (err) {
      return { granted: false };
    }
  };

  const fetchLocalMusic = useCallback(async (useCache = true) => {
    setLoading(true);
    setError(null);

    // 1. Try Cache First
    let hasCachedData = false;
    if (useCache) {
      try {
        const cachedData = await StorageManager.getLocalMusicCache();
        let initialTracks = [];

        if (cachedData && cachedData.music && cachedData.music.length > 0) {
          initialTracks = cachedData.music;
        } else if (
          cachedData &&
          Array.isArray(cachedData) &&
          cachedData.length > 0
        ) {
          initialTracks = cachedData;
        }

        if (initialTracks.length > 0) {
          await LocalTracksMetadataManager.initialize();
          const enrichedInitial = initialTracks.map((track) => {
            const id = LocalTracksMetadataManager.generateId(track.path);
            const meta = LocalTracksMetadataManager.getMetadata(id);
            if (meta) {
              return {
                ...track,
                title: meta.title || track.title,
                artist: meta.artist || track.artist,
                album: meta.album || track.album,
                year: meta.year,
                genre: meta.genre,
                artwork: meta.localArtworkPath
                  ? { uri: meta.localArtworkPath }
                  : track.artwork,
                cover: meta.localArtworkPath
                  ? { uri: meta.localArtworkPath }
                  : track.cover,
              };
            }
            return track;
          });

          setLocalMusic(enrichedInitial);
          hasCachedData = true;
          setLoading(false);
        }
      } catch (e) {
        console.warn('Cache load failed', e);
      }
    }

    // 2. Request Permission
    const permissionStatus = await requestStoragePermission();
    if (!permissionStatus.granted) {
      if (permissionStatus.neverAskAgain) {
        setError(
          'Permission denied permanently. Please enable it in settings.'
        );
        Linking.openSettings();
      } else {
        setError('Permission denied.');
      }
      setLoading(false);
      return;
    }

    try {
      const RNFS = require('react-native-fs');
      const directories = [
        RNFS.ExternalStorageDirectoryPath + '/Music',
        RNFS.ExternalStorageDirectoryPath + '/Download',
        RNFS.ExternalStorageDirectoryPath + '/Downloads',
        RNFS.ExternalStorageDirectoryPath + '/Documents',
        RNFS.ExternalStorageDirectoryPath + '/WhatsApp/Media/WhatsApp Audio',
        RNFS.ExternalStorageDirectoryPath + '/Telegram/Telegram Audio',
      ];

      const isMusicFile = (filename) => {
        if (!filename) {
          return false;
        }
        return /\.(mp3|m4a|wav|ogg|flac|aac|opus)$/i.test(filename);
      };

      const scanDirectory = async (dirPath) => {
        try {
          const items = await RNFS.readDir(dirPath);
          let results = [];
          for (const item of items) {
            if (item.isDirectory()) {
              if (!item.name.startsWith('.')) {
                results = [...results, ...(await scanDirectory(item.path))];
              }
            } else if (item.isFile() && isMusicFile(item.name)) {
              results.push(item);
            }
          }
          return results;
        } catch (e) {
          return [];
        }
      };

      const scanPromises = directories.map((dir) => scanDirectory(dir));
      const allFiles = (await Promise.all(scanPromises)).flat();

      // Dedupe by path
      const uniqueFiles = Array.from(
        new Map(allFiles.map((item) => [item.path, item])).values()
      );

      // Convert to Track Objects
      const tracks = uniqueFiles.map((file, index) => {
        const title = file.name.replace(/\.[^/.]+$/, '');
        return {
          id: `${file.path}_${index}`,
          path: file.path,
          title: title,
          artist: 'Unknown Artist',
          duration: 0,
          size: file.size,
          cover: Cover,
          artwork: Cover,
          isLocal: true,
          sourceType: 'mymusic',
        };
      });

      // Sync with Manager - This triggers background metadata extraction
      await LocalTracksMetadataManager.sync(tracks);

      // Enrich with existing manifest data
      const finalTracks = tracks.map((track) => {
        const id = LocalTracksMetadataManager.generateId(track.path);
        const meta = LocalTracksMetadataManager.getMetadata(id);
        if (meta) {
          return {
            ...track,
            title: meta.title || track.title,
            artist: meta.artist || track.artist,
            album: meta.album,
            year: meta.year,
            genre: meta.genre,
            artwork: meta.localArtworkPath
              ? { uri: meta.localArtworkPath }
              : track.artwork,
            cover: meta.localArtworkPath
              ? { uri: meta.localArtworkPath }
              : track.cover,
          };
        }
        return track;
      });

      await StorageManager.saveLocalMusicCache(finalTracks);
      setLocalMusic(finalTracks);
    } catch (err) {
      console.warn(err);
      if (!hasCachedData) {
        setError('Failed to scan music.');
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    fetchLocalMusic();

    return () => unsubscribe();
  }, [fetchLocalMusic]);

  return {
    localMusic,
    loading,
    error,
    isOffline,
    refetch: () => fetchLocalMusic(false),
  };
};
