import React, { useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  Dimensions,
  ToastAndroid,
  StyleSheet,
} from 'react-native';
import { MainWrapper } from '../Layout/MainWrapper';
import { Text, IconButton, Appbar } from 'react-native-paper';
import { useTheme as useNavigationTheme, useRoute, useNavigation } from '@react-navigation/native';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { LoadingComponent } from '../Component/Global/Loading';
import { EachSongCard } from '../Component/Global/EachSongCard';
import { AddPlaylist } from '../MusicPlayerFunctions';
import FormatArtist from '../Utils/FormatArtists';

import { useArtistSongs } from '../hooks/useArtistData';
import { formatSongsForPlaylist, getValidImageUrl, safeString } from '../Utils/ArtistUtils';

const { height: screenHeight } = Dimensions.get('window');

const ArtistSongs = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useNavigationTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  const { artistId, artistName, source, preloadedSongs } = route.params || {};

  const {
    visibleSongs,
    songLoading,
    hasMoreSongs,
    totalSongs,
    loadMoreSongs,
  } = useArtistSongs(artistId, 20, source, preloadedSongs);

  const shufflePlay = useCallback(async () => {
    if (!visibleSongs || visibleSongs.length === 0) {
      ToastAndroid.show('No songs available', ToastAndroid.SHORT);
      return;
    }
    try {
      const formattedSongs = formatSongsForPlaylist(visibleSongs);
      const shuffled = [...formattedSongs].sort(() => Math.random() - 0.5);
      await AddPlaylist(shuffled);
      ToastAndroid.show(`Shuffling ${formattedSongs.length} songs`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error shuffling:', error);
      ToastAndroid.show('Failed to shuffle', ToastAndroid.SHORT);
    }
  }, [visibleSongs]);

  const renderItem = useCallback(({ item: song, index }) => {
    if (!song || !song.id) return null;
    return (
      <EachSongCard
        title={safeString(song.name, "Unknown Title")}
        artist={safeString(FormatArtist(song.artists?.primary), "Unknown Artist")}
        image={getValidImageUrl(song.image)}
        id={song.id}
        url={song.downloadUrl?.[2]?.url || song.downloadUrl?.[1]?.url || song.downloadUrl?.[0]?.url}
        duration={song.duration}
        language={song.language}
        artistID={song.artists?.primary?.[0]?.id}
        width="100%"
        isFromPlaylist={true}
        source={source}
        Data={{ data: { songs: visibleSongs } }}
        index={index}
        showNumber={true}
        truncateTitle={true}
        activeTrackId={activeTrack?.id}
        isPlaying={playbackState.state === "playing" || playbackState.state === 3}
      />
    );
  }, [visibleSongs, activeTrack?.id, playbackState.state]);

  const keyExtractor = useCallback((item, index) => `${item?.id || index}-${index}`, []);

  const ListHeader = useMemo(() => (
    <View style={styles.headerInfo}>
      <Text style={[styles.songCount, { color: theme.colors.text }]}>
        {totalSongs > 0 ? totalSongs : visibleSongs.length} songs
      </Text>
    </View>
  ), [totalSongs, visibleSongs.length, theme.colors.text]);

  const ListFooter = useMemo(() => (
    <View style={styles.footer}>
      {songLoading && <LoadingComponent loading={true} height={50} />}
    </View>
  ), [songLoading]);

  const onEndReached = useCallback(() => {
    if (hasMoreSongs && !songLoading) {
      loadMoreSongs();
    }
  }, [hasMoreSongs, songLoading, loadMoreSongs]);

  return (
    <MainWrapper>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={artistName || 'Songs'} />
        <Appbar.Action icon="shuffle" onPress={shufflePlay} />
      </Appbar.Header>

      <FlatList
        data={visibleSongs}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        ListHeaderComponent={ListHeader}
        ListFooterComponent={ListFooter}
        onEndReached={onEndReached}
        onEndReachedThreshold={0.5}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        initialNumToRender={15}
        maxToRenderPerBatch={10}
        windowSize={5}
        removeClippedSubviews={true}
      />
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  headerInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  songCount: {
    fontSize: 14,
    opacity: 0.7,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 120,
  },
  footer: {
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default ArtistSongs;
