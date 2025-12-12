import React, { useState, useEffect, useContext, useCallback } from 'react';
import { View, Text, FlatList, ActivityIndicator, StyleSheet, Button, Linking, Platform, ToastAndroid, Image, Pressable, RefreshControl } from 'react-native';
import { AnimatedSearchBar } from '../../Component/Global/AnimatedSearchBar';
import { LocalMusicCard } from '../../Component/MusicPlayer/LocalMusicCard';
import Context from '../../Context/Context';
import { useTheme, useNavigation } from '@react-navigation/native';
import TrackPlayer, { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import { useTrackPlayerEvents, Event } from 'react-native-track-player';
import Ionicons from "react-native-vector-icons/Ionicons";
import Cover from "../../Images/Music.jpeg";
import { useDeviceLibrary } from '../../Component/MusicPlayer/LocalTracks/useDeviceLibrary';

export const MyMusicPage = () => {
  const theme = useTheme();
  const navigation = useNavigation();

  // Use custom hook for logic
  const { localMusic, loading, error, isOffline, refetch } = useDeviceLibrary();

  const [refreshing, setRefreshing] = useState(false);
  const currentPlaying = useActiveTrack();
  const playbackState = usePlaybackState();
  const { Index, setIndex } = useContext(Context);
  const [searchQuery, setSearchQuery] = useState('');

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    centered: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    header: {
      fontSize: 24,
      fontWeight: 'bold',
      padding: 16,
      color: theme.colors.text,
    },
    listContainer: {
      paddingBottom: 70, // Extra padding to account for controls
    },
    loadingText: {
      marginTop: 8,
      fontSize: 16,
      color: theme.colors.textSecondary,
    },
    errorText: {
      fontSize: 16,
      color: '#D32F2F',
      textAlign: 'center',
      paddingHorizontal: 16,
      marginBottom: 10,
    },
    emptyText: {
      fontSize: 16,
      color: theme.colors.textSecondary,
      textAlign: 'center',
      padding: 16,
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
      color: theme.colors.textSecondary,
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
      fontSize: 20,
      fontWeight: 'bold',
      color: theme.colors.text,
    }
  });

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await refetch();
    setRefreshing(false);
  }, [refetch]);

  const loadAndPlayTrack = async (index) => {
    if (index < 0 || index >= localMusic.length) return;

    try {
      const song = localMusic[index];
      if (!song.path) {
        ToastAndroid.show('Cannot play track: Invalid file path', ToastAndroid.LONG);
        return;
      }

      const formattedTracks = localMusic
        .filter(track => track.path)
        .map(track => ({
          id: track.id,
          url: `file://${track.path}`,
          title: track.title,
          artist: track.artist,
          artwork: track.artwork || Cover,
          isLocal: true,
          sourceType: 'mymusic'
        }));

      await TrackPlayer.reset();
      await TrackPlayer.add([
        ...formattedTracks.slice(index),
        ...formattedTracks.slice(0, index)
      ]);
      await TrackPlayer.play();
      setIndex(1);
    } catch (error) {
      console.warn("Play error", error);
    }
  };

  const playPreviousSong = useCallback(async () => {
    try {
      const currentTrack = await TrackPlayer.getActiveTrack();
      if (!currentTrack) {
        await loadAndPlayTrack(0);
        return;
      }
      const currentIndex = localMusic.findIndex(track => track.id === currentTrack.id || track.path === currentTrack.url?.replace('file://', ''));
      // Fallback matching if IDs differ due to regeneration

      const prevIndex = (currentIndex - 1 + localMusic.length) % localMusic.length;
      await loadAndPlayTrack(prevIndex);
    } catch (error) { }
  }, [localMusic]);

  const playNextSong = useCallback(async () => {
    try {
      const currentTrack = await TrackPlayer.getActiveTrack();
      if (!currentTrack) {
        await loadAndPlayTrack(0);
        return;
      }
      const currentIndex = localMusic.findIndex(track => track.id === currentTrack.id || track.path === currentTrack.url?.replace('file://', ''));

      const nextIndex = (currentIndex + 1) % localMusic.length;
      await loadAndPlayTrack(nextIndex);
    } catch (error) { }
  }, [localMusic]);

  // Event Listeners for Queue management handled largely by Global Player context in Root,
  // but we keep basic error recovery here if needed.
  useTrackPlayerEvents([Event.PlaybackQueueEnded, Event.PlaybackError], async (event) => {
    if (event.type === Event.PlaybackQueueEnded) {
      const queue = await TrackPlayer.getQueue();
      if (queue.length > 0) {
        await TrackPlayer.skip(0);
        await TrackPlayer.play();
      }
    }
  });

  if (loading && !localMusic.length) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#1E90FF" />
        <Text style={styles.loadingText}>{isOffline ? 'Loading cached music...' : 'Fetching your music...'}</Text>
        <Text style={[styles.loadingText, { fontSize: 14, marginTop: 10, color: '#1E90FF' }]}>
          This may take a few seconds...
        </Text>
        <Text style={[styles.loadingText, { fontSize: 12, marginTop: 5, color: '#666' }]}>
          Scanning music files on your device
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.centered}>
        <Text style={styles.errorText}>{error}</Text>
        {error.includes('settings') && (
          <Button
            title="Open Settings"
            onPress={() => Linking.openSettings()}
          />
        )}
        {!error.includes('settings') && (
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Button
              title="Try Again"
              onPress={() => refetch()}
            />
          </View>
        )}
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {isOffline && (
        <View style={styles.offlineBanner}>
          <Image
            source={require('../../Images/offline.png')}
            style={styles.offlineIcon}
            resizeMode="contain"
          />
          <Text style={styles.offlineBannerText}>You're currently offline</Text>
        </View>
      )}

      <FlatList
        ListHeaderComponent={
          <View style={styles.headerContainer}>
            <Text style={styles.title}>My Music</Text>
            <AnimatedSearchBar
              onChange={setSearchQuery}
              placeholder="Search songs..."
            />
          </View>
        }
        data={localMusic.filter(item =>
          item.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          item.artist?.toLowerCase().includes(searchQuery.toLowerCase())
        )}
        keyExtractor={(item) => item.id}
        renderItem={({ item, index }) => (
          <LocalMusicCard
            song={item}
            index={index}
            allSongs={localMusic}
            artist={item.artist && item.artist.length > 20 ? item.artist.substring(0, 20) + "..." : item.artist}
            activeTrackId={currentPlaying?.id}
            isPlaying={playbackState.state === "playing" || playbackState.state === 3}
          />
        )}
        ListEmptyComponent={<Text style={styles.emptyText}>No music files available.</Text>}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#1DB954']}
          />
        }
      />

      <View style={{ flexDirection: 'row', justifyContent: 'space-between', padding: 10 }}>
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

export default MyMusicPage;