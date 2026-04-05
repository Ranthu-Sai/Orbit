/**
 * OptimizedQueueList.jsx
 *
 * High-performance queue list that:
 * - Uses TrackPlayer hooks ONCE at the top level (not per item)
 * - Passes playback state down as props
 * - Uses FlatList with proper optimization settings
 * - Separates queue logic from UI
 */

import React, {
  memo,
  useCallback,
  useMemo,
  useRef,
  useEffect,
  useState,
} from 'react';
import { View, FlatList, StyleSheet, ActivityIndicator } from 'react-native';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import TrackPlayer, { State } from 'react-native-track-player';
import OptimizedQueueItem from './OptimizedQueueItem';
import { SkipToTrack } from '../../MusicPlayerFunctions';
import { useThemeContext } from '../../Context/ThemeContext';
import { debounce } from '../../Utils/EventDebouncer';

// Queue refresh interval (don't poll too frequently)
const QUEUE_REFRESH_INTERVAL = 1000;

const OptimizedQueueList = memo(function OptimizedQueueList({
  style,
  reorderMode = false,
  ListHeaderComponent,
  ListFooterComponent,
}) {
  const { theme } = useThemeContext();

  // Single hook calls at top level - shared by all items
  const currentTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  const [queue, setQueue] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const flatListRef = useRef(null);
  const isMounted = useRef(true);

  // Current track ID for comparison
  const currentTrackId = currentTrack?.id;
  const isPlaying = playbackState.state === State.Playing;

  // Debounced queue refresh
  const refreshQueue = useCallback(async () => {
    if (!isMounted.current) {
      return;
    }

    try {
      const currentQueue = await TrackPlayer.getQueue();
      if (isMounted.current) {
        setQueue(currentQueue);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error fetching queue:', error);
      setIsLoading(false);
    }
  }, []);

  // Debounced version to prevent excessive refreshes
  const debouncedRefresh = useMemo(
    () => debounce(refreshQueue, 300),
    [refreshQueue]
  );

  // Initial load and track change listener
  useEffect(() => {
    isMounted.current = true;
    refreshQueue();

    // Refresh when track changes
    const subscription = TrackPlayer.addEventListener(
      'playback-active-track-changed',
      debouncedRefresh
    );

    // Periodic refresh for queue changes (add/remove)
    const interval = setInterval(refreshQueue, QUEUE_REFRESH_INTERVAL);

    return () => {
      isMounted.current = false;
      subscription.remove();
      clearInterval(interval);
    };
  }, [refreshQueue, debouncedRefresh]);

  // Handle track selection
  const handleTrackPress = useCallback(async (index) => {
    try {
      await SkipToTrack(index);
    } catch (error) {
      console.error('Error skipping to track:', error);
    }
  }, []);

  // Render item - passes playback state as props
  const renderItem = useCallback(
    ({ item, index }) => {
      return (
        <OptimizedQueueItem
          key={item.id}
          id={item.id}
          index={index}
          title={item.title}
          artist={item.artist}
          artwork={item.artwork || item.image}
          isCurrentTrack={item.id === currentTrackId}
          isPlaying={isPlaying && item.id === currentTrackId}
          onPress={handleTrackPress}
          reorderMode={reorderMode}
        />
      );
    },
    [currentTrackId, isPlaying, handleTrackPress, reorderMode]
  );

  // Key extractor
  const keyExtractor = useCallback((item, index) => `${item.id}-${index}`, []);

  // Get item layout for faster scrolling
  const getItemLayout = useCallback(
    (data, index) => ({
      length: 66, // Height of each item (48px artwork + 10px*2 padding + 2px margin)
      offset: 66 * index,
      index,
    }),
    []
  );

  if (isLoading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="large" color={theme.colors.primary} />
      </View>
    );
  }

  return (
    <FlatList
      ref={flatListRef}
      data={queue}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      getItemLayout={getItemLayout}
      style={[styles.list, style]}
      contentContainerStyle={styles.contentContainer}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      // Performance optimizations
      removeClippedSubviews={true}
      maxToRenderPerBatch={10}
      windowSize={10}
      initialNumToRender={15}
      updateCellsBatchingPeriod={50}
      // Disable expensive features
      showsVerticalScrollIndicator={false}
    />
  );
});

const styles = StyleSheet.create({
  list: {
    flex: 1,
  },
  contentContainer: {
    paddingBottom: 100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default OptimizedQueueList;
