import React, {
  useState,
  useContext,
  useCallback,
  useMemo,
  useRef,
  useEffect,
} from 'react';
import {
  View,
  Text,
  FlatList,
  ActivityIndicator,
  StyleSheet,
  Button,
  ToastAndroid,
  Image,
  Pressable,
  RefreshControl,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { AnimatedSearchBar } from '../../Component/Global/AnimatedSearchBar';
import { LocalMusicCard } from '../../Component/MusicPlayer/LocalMusicCard';
import Context from '../../Context/Context';
import { useTheme } from '@react-navigation/native';
import TrackPlayer, {
  useActiveTrack,
  usePlaybackState,
  State,
} from 'react-native-track-player';
import { useTrackPlayerEvents, Event } from 'react-native-track-player';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useDeviceLibrary } from '../../Component/MusicPlayer/LocalTracks/useDeviceLibrary';
import localMusicQueueManager from '../../Utils/LocalMusicQueueManager';

const NAV_PATH = 'Library/MyMusicPage';

export const MyMusicPage = () => {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const {
    localMusic,
    loading,
    error,
    isOffline,
    refetch,
    permissionStatus,
    needsAllFilesAccess,
    scanState,
    requestPermission,
    requestAllFilesAccess,
  } = useDeviceLibrary();

  const [refreshing, setRefreshing] = useState(false);
  const currentPlaying = useActiveTrack();
  const playbackState = usePlaybackState();
  const { setIndex, setVisible, setPreviousScreen, setMusicPreviousScreen } =
    useContext(Context);
  const [searchQuery, setSearchQuery] = useState('');

  // Latest list for callbacks, so row callbacks can stay referentially stable
  const localMusicRef = useRef(localMusic);
  useEffect(() => {
    localMusicRef.current = localMusic;
  }, [localMusic]);

  const filteredMusic = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return localMusic;
    }
    return localMusic.filter(
      (item) =>
        item.title?.toLowerCase().includes(query) ||
        item.artist?.toLowerCase().includes(query)
    );
  }, [localMusic, searchQuery]);

  const styles = useMemo(() => getStyles(theme.colors), [theme.colors]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    // Rescans files; changed/new files get their tags re-read automatically
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadAndPlayTrack = useCallback(
    async (index) => {
      const songs = localMusicRef.current;
      if (index < 0 || index >= songs.length) {
        return;
      }
      try {
        if (!songs[index].path) {
          ToastAndroid.show(
            'Cannot play track: Invalid file path',
            ToastAndroid.LONG
          );
          return;
        }
        // Progressive queue: the tapped song starts first, the rest follows
        const started = await localMusicQueueManager.playFrom(songs, index, {
          sourceType: 'mymusic',
        });
        if (started) {
          setIndex(1);
        } else {
          ToastAndroid.show('Failed to start playback', ToastAndroid.SHORT);
        }
      } catch (err) {
        console.warn('Play error', err);
        ToastAndroid.show('Failed to start playback', ToastAndroid.SHORT);
      }
    },
    [setIndex]
  );

  const handlePlaySong = useCallback(
    (song) => {
      setPreviousScreen(NAV_PATH);
      setMusicPreviousScreen(NAV_PATH);
      const index = localMusicRef.current.findIndex((s) => s.id === song.id);
      loadAndPlayTrack(index);
    },
    [loadAndPlayTrack, setPreviousScreen, setMusicPreviousScreen]
  );

  const handleOpenMenu = useCallback(
    (song, pageY) => {
      setVisible({
        visible: true,
        position: { y: pageY },
        ...song,
        isLocalMusic: true,
      });
    },
    [setVisible]
  );

  // Index of the active track in the library, or -1 when it isn't from here
  const findActiveIndex = useCallback(async () => {
    const currentTrack = await TrackPlayer.getActiveTrack();
    if (!currentTrack) {
      return -1;
    }
    const path = currentTrack.url?.replace('file://', '');
    return localMusicRef.current.findIndex(
      (track) => track.id === currentTrack.id || track.path === path
    );
  }, []);

  const playPreviousSong = useCallback(async () => {
    try {
      // Move within the existing queue; only rebuild when there is none
      if (await localMusicQueueManager.skipPrevious()) {
        return;
      }
      const songs = localMusicRef.current;
      const currentIndex = await findActiveIndex();
      const prevIndex =
        currentIndex === -1
          ? 0
          : (currentIndex - 1 + songs.length) % songs.length;
      await loadAndPlayTrack(prevIndex);
    } catch (err) {
      console.warn('Previous track error', err);
    }
  }, [findActiveIndex, loadAndPlayTrack]);

  const playNextSong = useCallback(async () => {
    try {
      if (await localMusicQueueManager.skipNext()) {
        return;
      }
      const songs = localMusicRef.current;
      const currentIndex = await findActiveIndex();
      const nextIndex =
        currentIndex === -1 ? 0 : (currentIndex + 1) % songs.length;
      await loadAndPlayTrack(nextIndex);
    } catch (err) {
      console.warn('Next track error', err);
    }
  }, [findActiveIndex, loadAndPlayTrack]);

  // Event Listeners for Queue management handled largely by Global Player context in Root,
  // but we keep basic error recovery here if needed.
  useTrackPlayerEvents([Event.PlaybackQueueEnded], async (event) => {
    if (event.type === Event.PlaybackQueueEnded) {
      const queue = await TrackPlayer.getQueue();
      if (queue.length > 0) {
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      }
    }
  });

  const activeTrackId = currentPlaying?.id;
  const isPlaying =
    playbackState.state === State.Playing || playbackState.state === 3;

  const renderItem = useCallback(
    ({ item }) => {
      const isActive = item.id === activeTrackId;
      return (
        <LocalMusicCard
          song={item}
          isActive={isActive}
          // Only the active row cares about play/pause; others stay memoized
          isPlaying={isActive && isPlaying}
          onPlay={handlePlaySong}
          onOpenMenu={handleOpenMenu}
        />
      );
    },
    [activeTrackId, isPlaying, handlePlaySong, handleOpenMenu]
  );

  const keyExtractor = useCallback((item) => item.id, []);

  const listHeader = useMemo(
    () => (
      <View>
        <View style={styles.headerContainer}>
          <Text style={styles.title}>My Music</Text>
          <AnimatedSearchBar
            onChange={setSearchQuery}
            placeholder="Search songs..."
          />
        </View>
        {permissionStatus !== 'granted' &&
          permissionStatus !== 'unknown' &&
          localMusic.length > 0 && (
            <Pressable style={styles.noticeBanner} onPress={requestPermission}>
              <Text style={styles.noticeText}>
                Showing saved list. Allow music access to see new songs.
              </Text>
            </Pressable>
          )}
        {needsAllFilesAccess && (
          <Pressable style={styles.noticeBanner} onPress={requestAllFilesAccess}>
            <Text style={styles.noticeText}>
              Some folders couldn't be read. Tap to allow full storage access
              so every song is found.
            </Text>
          </Pressable>
        )}
        {scanState.processingMeta && scanState.metaTotal > 0 && (
          <Text style={styles.progressText}>
            Reading song details {scanState.metaProcessed}/{scanState.metaTotal}
          </Text>
        )}
      </View>
    ),
    [
      styles,
      permissionStatus,
      localMusic.length,
      needsAllFilesAccess,
      scanState.processingMeta,
      scanState.metaProcessed,
      scanState.metaTotal,
      requestPermission,
      requestAllFilesAccess,
    ]
  );

  // First run / no access and nothing cached: explain before showing a spinner
  if (
    (permissionStatus === 'denied' || permissionStatus === 'blocked') &&
    localMusic.length === 0
  ) {
    return (
      <View style={[styles.centered, { paddingTop: insets.top }]}>
        <Ionicons
          name="musical-notes-outline"
          size={56}
          color={theme.colors.textSecondary}
        />
        <Text style={styles.permissionTitle}>Show your music</Text>
        <Text style={styles.permissionText}>
          Orbit needs access to audio files on this device to list and play
          your songs.
        </Text>
        <Button
          title={
            permissionStatus === 'blocked' ? 'Open Settings' : 'Allow access'
          }
          onPress={requestPermission}
        />
      </View>
    );
  }

  if (loading && !localMusic.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>Scanning music on your device...</Text>
        {scanState.found > 0 && (
          <Text style={[styles.loadingText, styles.loadingSubText]}>
            {scanState.found} songs found so far
          </Text>
        )}
      </View>
    );
  }

  if (error && !localMusic.length) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        <View style={styles.errorActions}>
          <Button title="Try Again" onPress={() => refetch()} />
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Image
            source={require('../../Images/offline.png')}
            style={styles.offlineIcon}
            resizeMode="contain"
          />
          <Text style={styles.offlineBannerText}>
            You're offline. Your local music still plays.
          </Text>
        </View>
      )}

      <FlatList
        ListHeaderComponent={listHeader}
        data={filteredMusic}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        extraData={activeTrackId}
        initialNumToRender={12}
        maxToRenderPerBatch={10}
        windowSize={9}
        updateCellsBatchingPeriod={50}
        removeClippedSubviews
        ListEmptyComponent={
          <Text style={styles.emptyText}>
            {scanState.scanning
              ? 'Looking for music...'
              : 'No music files available.'}
          </Text>
        }
        contentContainerStyle={styles.listContainer}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1DB954']}
          />
        }
      />

      <View style={styles.controls}>
        <Pressable onPress={playPreviousSong} style={styles.controlButton}>
          <Ionicons name="play-skip-back" size={24} color="white" />
        </Pressable>
        <Pressable onPress={playNextSong} style={styles.controlButton}>
          <Ionicons name="play-skip-forward" size={24} color="white" />
        </Pressable>
      </View>
    </View>
  );
};

const getStyles = (colors) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingHorizontal: 24,
    },
    listContainer: {
      paddingBottom: 70, // Extra padding to account for controls
    },
    loadingText: {
      marginTop: 8,
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingSubText: {
      fontSize: 13,
      marginTop: 6,
    },
    errorText: {
      fontSize: 16,
      color: '#D32F2F',
      textAlign: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    errorActions: {
      flexDirection: 'row',
      gap: 10,
    },
    permissionTitle: {
      fontSize: 20,
      fontWeight: 'bold',
      color: colors.text,
      marginTop: 12,
      marginBottom: 8,
    },
    permissionText: {
      fontSize: 15,
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 20,
    },
    emptyText: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
      padding: 16,
    },
    noticeBanner: {
      marginHorizontal: 16,
      marginTop: 10,
      padding: 10,
      borderRadius: 10,
      backgroundColor: 'rgba(30,144,255,0.12)',
    },
    noticeText: {
      fontSize: 13,
      color: colors.text,
    },
    progressText: {
      fontSize: 12,
      color: colors.textSecondary,
      paddingHorizontal: 16,
      paddingTop: 8,
    },
    offlineBanner: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: 10,
      paddingBottom: 5,
      marginBottom: 0,
    },
    offlineIcon: {
      width: 24,
      height: 24,
      marginRight: 8,
    },
    offlineBannerText: {
      fontSize: 16,
      color: colors.textSecondary,
    },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: 10,
    },
    controlButton: {
      padding: 10,
    },
    headerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 16,
      paddingTop: 5,
      borderBottomWidth: 1,
      borderBottomColor: 'rgba(255,255,255,0.1)',
    },
    title: {
      fontSize: 26,
      fontWeight: 'bold',
      color: colors.text,
    },
  });

export default MyMusicPage;
