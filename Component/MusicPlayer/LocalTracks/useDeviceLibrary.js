import { useState, useEffect, useCallback, useRef } from 'react';
import { Platform, Linking, AppState } from 'react-native';
import RNFS from 'react-native-fs';
import NetInfo from '@react-native-community/netinfo';
import { StorageManager } from '../../../Utils/StorageManager';
import LocalTracksMetadataManager from './LocalTracksMetadataManager';
import { isAudioFile, pathToKey } from '../../../Utils/LocalMusicUtils';
import {
  checkAudioReadPermission,
  requestAudioReadPermission,
  checkAllFilesAccessPermission,
  requestAllFilesAccessPermission,
} from '../../../Utils/PermissionManager';
import Cover from '../../../Images/Music.jpeg';

const MAX_DEPTH = 8; // Deep enough for Artist/Album/Disc layouts
const YIELD_EVERY_DIRS = 15; // Give the UI a frame while walking big trees
const RESCAN_COOLDOWN_MS = 2 * 60 * 1000; // Re-visits within this window reuse the last scan

// Folders that hold chat voice messages, not music
const SKIP_DIR_REGEX = /(voice notes|telegram voice|^\.)/i;

// Survives screen unmounts so revisiting My Music is instant
let lastScan = { tracks: null, at: 0 };

const getScanRoots = async () => {
  const primary = RNFS.ExternalStorageDirectoryPath;
  const volumeRoots = [primary];

  // Secondary volumes (SD cards / USB): derive each root from the app's
  // per-volume files dir, e.g. /storage/1234-ABCD/Android/data/<pkg>/files
  try {
    const dirs = (await RNFS.getAllExternalFilesDirs?.()) || [];
    dirs.forEach((dir) => {
      const idx = dir ? dir.indexOf('/Android/') : -1;
      if (idx > 0) {
        const root = dir.substring(0, idx);
        if (!volumeRoots.includes(root)) {
          volumeRoots.push(root);
        }
      }
    });
  } catch (e) {
    // Only the primary volume is available
  }

  const roots = [];
  volumeRoots.forEach((root) => {
    roots.push(
      `${root}/Music`,
      `${root}/Download`,
      `${root}/Downloads`,
      `${root}/Documents`
    );
  });
  roots.push(
    // Legacy and Android 11+ locations of chat-app audio folders
    `${primary}/WhatsApp/Media/WhatsApp Audio`,
    `${primary}/Android/media/com.whatsapp/WhatsApp/Media/WhatsApp Audio`,
    `${primary}/Telegram/Telegram Audio`,
    `${primary}/Android/media/org.telegram.messenger/Telegram/Telegram Audio`
  );
  return roots;
};

/**
 * Walk the music folders without recursion or quadratic array copies.
 * @returns {{ files: Array, incomplete: boolean }} incomplete is true when an
 *   existing folder could not be read (permission / scoped storage).
 */
const scanMusicFiles = async (onProgress) => {
  const roots = await getScanRoots();
  const files = [];
  const seenDirs = new Set();
  let incomplete = false;
  let dirsSinceYield = 0;

  for (const root of roots) {
    let rootExists = false;
    try {
      rootExists = await RNFS.exists(root);
    } catch (e) {
      rootExists = false;
    }
    if (!rootExists) {
      continue;
    }

    const stack = [{ path: root, depth: 0 }];
    while (stack.length > 0) {
      const { path, depth } = stack.pop();
      if (seenDirs.has(path)) {
        continue;
      }
      seenDirs.add(path);

      let items;
      try {
        items = await RNFS.readDir(path);
      } catch (e) {
        incomplete = true;
        continue;
      }

      for (const item of items) {
        if (item.isDirectory()) {
          if (depth < MAX_DEPTH && !SKIP_DIR_REGEX.test(item.name)) {
            stack.push({ path: item.path, depth: depth + 1 });
          }
        } else if (item.isFile() && isAudioFile(item.name)) {
          files.push({
            path: item.path,
            name: item.name,
            size: item.size,
            mtime: item.mtime ? new Date(item.mtime).getTime() : 0,
          });
        }
      }

      if (++dirsSinceYield >= YIELD_EVERY_DIRS) {
        dirsSinceYield = 0;
        onProgress?.(files.length);
        await new Promise((resolve) => setTimeout(resolve, 0));
      }
    }
  }

  onProgress?.(files.length);
  return { files, incomplete };
};

const artworkSource = (meta, fallback) =>
  meta?.localArtworkPath ? { uri: meta.localArtworkPath } : fallback;

/**
 * Merge extracted metadata into a track. Returns the same object when nothing
 * changed so memoized list rows don't re-render.
 */
const applyMeta = (track, meta) => {
  if (!meta) {
    return track;
  }
  const artwork = artworkSource(meta, Cover);
  const next = {
    title: meta.title || track.fileTitle,
    artist: meta.artist || 'Unknown Artist',
    album: meta.album || null,
    year: meta.year || null,
    genre: meta.genre || null,
    duration: meta.duration || track.duration || 0,
  };
  const sameArtwork =
    (track.artwork?.uri || track.artwork) === (artwork?.uri || artwork);
  if (
    sameArtwork &&
    Object.keys(next).every((key) => track[key] === next[key])
  ) {
    return track;
  }
  return { ...track, ...next, artwork, cover: artwork };
};

const createTrack = (file) => {
  const fileTitle = file.name.replace(/\.[^/.]+$/, '');
  return {
    // The path is unique and never changes between scans, unlike an index
    id: file.path,
    path: file.path,
    url: `file://${file.path}`,
    metaKey: pathToKey(file.path),
    fileTitle,
    title: fileTitle,
    artist: 'Unknown Artist',
    duration: 0,
    size: file.size,
    mtime: file.mtime,
    cover: Cover,
    artwork: Cover,
    isLocal: true,
    sourceType: 'mymusic',
  };
};

// Persist only serializable data; the bundled Cover asset id can change
// between builds, so it is restored at load time instead of being saved.
const toCacheTrack = (track) => {
  const { cover, artwork, ...rest } = track;
  return artwork && typeof artwork === 'object' && artwork.uri
    ? { ...rest, artwork }
    : rest;
};

const fromCacheTrack = (track) => {
  const artwork =
    track.artwork && typeof track.artwork === 'object' && track.artwork.uri
      ? track.artwork
      : Cover;
  return {
    ...track,
    id: track.path || track.id,
    url: track.url || `file://${track.path}`,
    metaKey: track.metaKey || pathToKey(track.path),
    fileTitle: track.fileTitle || track.title,
    artwork,
    cover: artwork,
  };
};

const sortTracks = (tracks) =>
  tracks.sort((a, b) => {
    const byName = a.fileTitle.localeCompare(b.fileTitle, undefined, {
      sensitivity: 'base',
    });
    return byName !== 0 ? byName : a.path.localeCompare(b.path);
  });

export const useDeviceLibrary = () => {
  const [localMusic, setLocalMusic] = useState(lastScan.tracks || []);
  const [loading, setLoading] = useState(!lastScan.tracks);
  const [error, setError] = useState(null);
  const [isOffline, setIsOffline] = useState(false);
  // 'unknown' | 'granted' | 'denied' | 'blocked'
  const [permissionStatus, setPermissionStatus] = useState('unknown');
  const [needsAllFilesAccess, setNeedsAllFilesAccess] = useState(false);
  const [scanState, setScanState] = useState({
    scanning: false,
    found: 0,
    metaProcessed: 0,
    metaTotal: 0,
    processingMeta: false,
  });

  const mountedRef = useRef(true);
  const scanIdRef = useRef(0); // Only the newest scan may update state
  const awaitingSettingsRef = useRef(false);
  const hasDataRef = useRef(!!lastScan.tracks?.length);
  // Latest list (including one restored from cache) for use inside scans
  const localMusicRef = useRef(localMusic);

  useEffect(() => {
    hasDataRef.current = localMusic.length > 0;
    localMusicRef.current = localMusic;
  }, [localMusic]);

  // Merge metadata updates from the background processor
  useEffect(() => {
    const unsubscribe = LocalTracksMetadataManager.subscribe(
      (manifest, changedIds, progress) => {
        if (!mountedRef.current) {
          return;
        }
        setScanState((s) => ({
          ...s,
          metaProcessed: progress.processed,
          metaTotal: progress.total,
          processingMeta: progress.isProcessing,
        }));
        if (changedIds && changedIds.size === 0) {
          return;
        }
        setLocalMusic((current) => {
          let changed = false;
          const next = current.map((track) => {
            if (changedIds && !changedIds.has(track.metaKey)) {
              return track;
            }
            const updated = applyMeta(track, manifest[track.metaKey]);
            if (updated !== track) {
              changed = true;
            }
            return updated;
          });
          if (!changed) {
            return current;
          }
          lastScan = { ...lastScan, tracks: next };
          return next;
        });
      }
    );
    return () => {
      unsubscribe();
    };
  }, []);

  const runScan = useCallback(async () => {
    const scanId = ++scanIdRef.current;
    const isCurrent = () => mountedRef.current && scanId === scanIdRef.current;

    setScanState((s) => ({ ...s, scanning: true, found: 0 }));
    try {
      const { files, incomplete } = await scanMusicFiles((found) => {
        if (isCurrent()) {
          setScanState((s) => ({ ...s, found }));
        }
      });
      if (!isCurrent()) {
        return;
      }

      await LocalTracksMetadataManager.initialize();
      let tracks = files.map((file) =>
        applyMeta(
          createTrack(file),
          LocalTracksMetadataManager.getMetadata(pathToKey(file.path))
        )
      );

      if (incomplete) {
        // Some folders were unreadable: keep previously known tracks that
        // still exist instead of dropping them from the library.
        const scanned = new Set(tracks.map((t) => t.path));
        const previous = (localMusicRef.current || []).filter(
          (t) => !scanned.has(t.path)
        );
        for (const track of previous) {
          if (await RNFS.exists(track.path).catch(() => false)) {
            tracks.push(track);
          }
        }
      }
      tracks = sortTracks(tracks);

      // Never prune metadata/covers based on an incomplete scan.
      // Not awaited: tag reading continues in the background.
      LocalTracksMetadataManager.sync(tracks, { prune: !incomplete }).catch(
        (e) => console.warn('Metadata sync failed:', e)
      );

      if (!isCurrent()) {
        return;
      }
      lastScan = { tracks, at: Date.now() };
      setLocalMusic(tracks);
      setError(null);

      if (!incomplete || tracks.length > 0) {
        StorageManager.saveLocalMusicCache(tracks.map(toCacheTrack));
      }

      if (incomplete && Platform.Version >= 30) {
        const hasAllFiles = await checkAllFilesAccessPermission();
        if (isCurrent()) {
          setNeedsAllFilesAccess(!hasAllFiles);
        }
      } else if (isCurrent()) {
        setNeedsAllFilesAccess(false);
      }
    } catch (err) {
      console.warn('Local music scan failed:', err);
      if (isCurrent() && !hasDataRef.current) {
        setError('Failed to scan music.');
      }
    } finally {
      if (isCurrent()) {
        setScanState((s) => ({ ...s, scanning: false }));
        setLoading(false);
      }
    }
  }, []);

  /**
   * @param {Object} options
   * @param {boolean} options.force - Ignore the re-scan cooldown
   * @param {boolean} options.prompt - Show the system permission dialog if needed
   */
  const fetchLocalMusic = useCallback(
    async ({ force = false, prompt = true } = {}) => {
      setError(null);

      // 1. Instant paint from memory, else from the persisted cache
      if (!hasDataRef.current) {
        try {
          const cached = await StorageManager.getLocalMusicCache();
          const cachedTracks = Array.isArray(cached?.music)
            ? cached.music
            : Array.isArray(cached)
            ? cached
            : [];
          if (cachedTracks.length > 0 && mountedRef.current) {
            await LocalTracksMetadataManager.initialize();
            const restored = cachedTracks
              .filter((t) => t && t.path)
              .map((t) =>
                applyMeta(
                  fromCacheTrack(t),
                  LocalTracksMetadataManager.getMetadata(pathToKey(t.path))
                )
              );
            hasDataRef.current = restored.length > 0;
            setLocalMusic(restored);
            setLoading(false);
          }
        } catch (e) {
          console.warn('Local music cache load failed', e);
        }
      }

      // 2. Permission: check silently, prompt only when asked to
      let granted = await checkAudioReadPermission();
      if (!granted && prompt) {
        const status = await requestAudioReadPermission();
        granted = status === 'granted';
        if (!granted && mountedRef.current) {
          setPermissionStatus(status);
        }
      } else if (!granted && mountedRef.current) {
        setPermissionStatus('denied');
      }
      if (!mountedRef.current) {
        return;
      }
      if (!granted) {
        setLoading(false);
        return;
      }
      setPermissionStatus('granted');

      // 3. Scan, unless a recent scan is still fresh
      const fresh =
        lastScan.tracks && Date.now() - lastScan.at < RESCAN_COOLDOWN_MS;
      if (fresh && !force) {
        setLoading(false);
        return;
      }
      if (!hasDataRef.current) {
        setLoading(true);
      }
      await runScan();
    },
    [runScan]
  );

  // Re-scan after the user returns from system settings
  useEffect(() => {
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active' && awaitingSettingsRef.current) {
        awaitingSettingsRef.current = false;
        fetchLocalMusic({ force: true, prompt: false });
      }
    });
    return () => sub.remove();
  }, [fetchLocalMusic]);

  useEffect(() => {
    mountedRef.current = true;
    const unsubscribe = NetInfo.addEventListener((state) => {
      setIsOffline(!state.isConnected);
    });

    fetchLocalMusic();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [fetchLocalMusic]);

  const requestPermission = useCallback(async () => {
    if (permissionStatus === 'blocked') {
      awaitingSettingsRef.current = true;
      Linking.openSettings();
      return;
    }
    await fetchLocalMusic({ force: true, prompt: true });
  }, [permissionStatus, fetchLocalMusic]);

  const requestAllFilesAccess = useCallback(async () => {
    awaitingSettingsRef.current = true;
    await requestAllFilesAccessPermission();
  }, []);

  return {
    localMusic,
    loading,
    error,
    isOffline,
    permissionStatus,
    needsAllFilesAccess,
    scanState,
    requestPermission,
    requestAllFilesAccess,
    refetch: () => fetchLocalMusic({ force: true, prompt: false }),
  };
};
