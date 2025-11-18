import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, RefreshControl, ToastAndroid, AppState } from 'react-native';
import { MainWrapper } from "../../Layout/MainWrapper";
import { StorageManager } from '../../Utils/StorageManager';
import { EachSongCard } from "../../Component/Global/EachSongCard";
import { Heading } from "../../Component/Global/Heading";
import { Spacer } from "../../Component/Global/Spacer";
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import TrackPlayer from 'react-native-track-player';
import EventRegister from '../../Utils/EventRegister';

export const DownloadsPage = () => {
  const [downloads, setDownloads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const loadDownloadedSongs = async () => {
    setLoading(true);
    try {
      const metadata = await StorageManager.getAllDownloadedSongsMetadata();
      const songs = Object.values(metadata)
        .map(song => {
          const localUrl = song.localSongPath || (song.url && typeof song.url === 'string' && song.url.startsWith('/') ? song.url : null);
          const localArtwork = song.localArtworkPath || (song.artwork && typeof song.artwork === 'string' && song.artwork.startsWith('/') ? song.artwork : null);

          console.log(`[DEBUG] Processing song: ${song.title} (ID: ${song.id})`);
          console.log(`  - song.localSongPath: ${song.localSongPath}`);
          console.log(`  - song.url: ${song.url}`);
          console.log(`  - Evaluated localUrl: ${localUrl}`);

          if (!localUrl) {
            console.log(`  - RESULT: Filtering out.`);
            return null;
          }

          console.log(`  - RESULT: Keeping.`);
          return {
            ...song,
            id: song.id,
            url: `file://${localUrl}`,
            artwork: localArtwork ? { uri: `file://${localArtwork}` } : 'https://htmlcolorcodes.com/assets/images/colors/gray-color-solid-background-1920x1080.png',
            isLocal: true,
          };
        })
        .filter(Boolean);
      setDownloads(songs);
    } catch (error) {
      console.error('Error loading downloaded songs:', error);
      ToastAndroid.show('Failed to load downloads', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadDownloadedSongs().finally(() => setRefreshing(false));
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
    </View>
  );

  return (
    <MainWrapper>
      <View style={styles.container}>
        <View style={styles.header}>
          <Heading text="Downloads" />
          <Text style={styles.songCount}>
            {downloads.length} {downloads.length === 1 ? 'song' : 'songs'}
          </Text>
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
});