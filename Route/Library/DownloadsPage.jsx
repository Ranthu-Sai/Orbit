import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ToastAndroid, AppState, TouchableOpacity } from 'react-native';
import { MainWrapper } from "../../Layout/MainWrapper";
import { EachSongCard } from "../../Component/Global/EachSongCard";
import { Heading } from "../../Component/Global/Heading";
import { Spacer } from "../../Component/Global/Spacer";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer, { useActiveTrack, usePlaybackState } from 'react-native-track-player';
import EventRegister from '../../Utils/EventRegister';

export const DownloadsPage = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [debugInfo, setDebugInfo] = useState('');
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();
  const loadDownloadedSongs = async () => {
    setLoading(true);
    try {
      // Use SimpleOrbitScanner (no native module required)
      const SimpleOrbitScanner = require('../../Utils/SimpleOrbitScanner').default;
      const songs = await SimpleOrbitScanner.scanOrbitSongs();

      console.log(`[DownloadsPage] Loaded ${songs.length} songs from orbit/songs folder`);
      setDownloads(songs);
      setDebugInfo(`Found ${songs.length} songs`);
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
      setDebugInfo(`Error: ${error.message}`);
      ToastAndroid.show('Failed to load downloads', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const testScanner = async () => {
    console.log('🧪 [DEBUG] Manual scanner test triggered');
    ToastAndroid.show('Testing scanner... check logs', ToastAndroid.LONG);
    await loadDownloadedSongs();
  };

  const onRefresh = async () => {
    console.log('🔄 [DownloadsPage] Refresh triggered - starting scan...');
    ToastAndroid.show('🔄 Refreshing downloads...', ToastAndroid.SHORT);
    setRefreshing(true);
    await loadDownloadedSongs();
    setRefreshing(false);
  };

  useEffect(() => {
    loadDownloadedSongs();

    const subscription = AppState.addEventListener('change', nextAppState => {
      if (nextAppState === 'active') {
        loadDownloadedSongs();
      }
    });

    const downloadListener = EventRegister.addEventListener('download-complete', () => {
      loadDownloadedSongs();
    });

    return () => {
      subscription.remove();
      EventRegister.removeEventListener(downloadListener);
    };
  }, []);

  const EmptyDownloads = () => (
    <View style={styles.emptyContainer}>
      <MaterialIcons name="download" size={80} color="#666" />
      <Text style={styles.emptyText}>No downloads yet</Text>
      <Text style={styles.emptySubText}>
        Your downloaded songs will appear here
      </Text>
      {debugInfo ? <Text style={styles.debugText}>{debugInfo}</Text> : null}
    </View>
  );

  return (
    <MainWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Heading text="Downloads" />
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
            <TouchableOpacity onPress={testScanner} style={styles.testButton}>
              <MaterialIcons name="bug-report" size={20} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.songCount}>
              {downloads.length} {downloads.length === 1 ? 'song' : 'songs'}
            </Text>
          </View>
        </View>
        <Spacer height={10} />

        <FlatList
          data={downloads}
          keyExtractor={(item) => item.id}
          renderItem={({ item, index }) => (
            <EachSongCard
              title={item.title}
              artist={item.artist}
              image={item.artwork}
              id={item.id}
              url={item.url}
              duration={item.duration}
              isLocal={true}
              index={index}
              showNumber={false}
              allSongs={downloads}
              downloadUrl={item.downloadUrl}
              onDeleteComplete={() => loadDownloadedSongs()}
              activeTrackId={activeTrack?.id}
              isPlaying={playbackState.state === "playing" || playbackState.state === 3}
            />
          )}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#1DB954']}
            />
          }
          ListEmptyComponent={!loading && <EmptyDownloads />}
          contentContainerStyle={
            downloads.length === 0 ? styles.emptyList : styles.list
          }
        />
      </View>
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 15,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  songCount: {
    color: '#666',
    fontSize: 14,
  },
  testButton: {
    backgroundColor: '#FF6B6B',
    padding: 8,
    borderRadius: 8,
  },
  list: {
    paddingBottom: 100,
  },
  emptyList: {
    flex: 1,
    justifyContent: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingBottom: 100,
  },
  emptyText: {
    color: 'white',
    fontSize: 20,
    fontWeight: 'bold',
    marginTop: 16,
  },
  emptySubText: {
    color: '#666',
    fontSize: 16,
    marginTop: 8,
  },
  debugText: {
    color: '#FF6B6B',
    fontSize: 14,
    marginTop: 12,
    fontFamily: 'monospace',
  },
});