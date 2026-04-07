import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  FlatList,
  StyleSheet,
  ToastAndroid,
  Pressable,
  Dimensions,
} from 'react-native';
import { MainWrapper } from '../Layout/MainWrapper';
import { Text, Appbar } from 'react-native-paper';
import {
  useTheme as useNavigationTheme,
  useRoute,
  useNavigation,
} from '@react-navigation/native';
import FastImage from 'react-native-fast-image';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { LoadingComponent } from '../Component/Global/Loading';
import { AddPlaylist } from '../MusicPlayerFunctions';
import InnerTubeClient from '../Api/InnertubeClient';

const { width: screenWidth } = Dimensions.get('window');
const NUM_COLUMNS = 2;
const CARD_WIDTH = (screenWidth - 48) / NUM_COLUMNS;

const ArtistItems = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useNavigationTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  const { artistId, artistName, browseId, params, title } = route.params || {};

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [continuation, setContinuation] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchItems = useCallback(async () => {
    if (!browseId) {
      return;
    }

    try {
      setLoading(true);
      const data = await InnerTubeClient.request('browse', {
        browseId,
        params,
      });
      const parsed = parseArtistItemsPage(data);
      setItems(parsed.items);
      setContinuation(parsed.continuation);
    } catch (error) {
      console.error('Error fetching artist items:', error);
      ToastAndroid.show('Failed to load items', ToastAndroid.SHORT);
    } finally {
      setLoading(false);
    }
  }, [browseId, params]);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const loadMore = async () => {
    if (!continuation || loadingMore) {
      return;
    }

    try {
      setLoadingMore(true);
      const data = await InnerTubeClient.request('browse', { continuation });
      const parsed = parseArtistItemsContinuation(data);
      setItems((prev) => [...prev, ...parsed.items]);
      setContinuation(parsed.continuation);
    } catch (error) {
      console.error('Error loading more:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleItemPress = (item) => {
    if (item.type === 'song' || item.videoId) {
      const formatted = formatSong(item);
      AddPlaylist([formatted]);
    } else if (
      item.type === 'album' ||
      item.browseId?.startsWith('MPRE') ||
      item.browseId?.startsWith('OLAK')
    ) {
      navigation.navigate('Album', {
        id: item.browseId || item.id,
        name: item.name,
        source: 'ytmusic',
      });
    } else if (item.type === 'playlist') {
      navigation.navigate('Playlist', {
        id: item.playlistId || item.id,
        name: item.name,
      });
    } else if (item.type === 'artist' || item.browseId?.startsWith('UC')) {
      navigation.navigate('ArtistPage', {
        artistId: item.browseId || item.id,
        artistName: item.name,
        source: 'ytmusic',
      });
    }
  };

  const renderItem = useCallback(
    ({ item, index }) => {
      // Songs render as list items
      if (item.type === 'song' || item.videoId) {
        return (
          <SongListItem
            song={item}
            index={index}
            onPress={() => handleItemPress(item)}
            isActive={
              activeTrack?.id === item.videoId || activeTrack?.id === item.id
            }
            isPlaying={
              playbackState.state === 'playing' || playbackState.state === 3
            }
            theme={theme}
          />
        );
      }

      // Grid items for albums, playlists, artists
      return (
        <GridItem
          item={item}
          onPress={() => handleItemPress(item)}
          theme={theme}
        />
      );
    },
    [activeTrack?.id, playbackState.state, theme, handleItemPress]
  );

  const keyExtractor = useCallback(
    (item, index) => `${item.id || item.videoId || index}-${index}`,
    []
  );

  const ListFooter = useMemo(
    () => (
      <View style={styles.footer}>
        {loadingMore && <LoadingComponent loading={true} height={50} />}
      </View>
    ),
    [loadingMore]
  );

  // Determine if items are songs (list view) or other (grid view)
  const isSongsList =
    items.length > 0 && (items[0].type === 'song' || items[0].videoId);

  return (
    <MainWrapper>
      <Appbar.Header style={{ backgroundColor: theme.colors.background }}>
        <Appbar.BackAction onPress={() => navigation.goBack()} />
        <Appbar.Content title={title || 'Items'} subtitle={artistName} />
      </Appbar.Header>

      {loading ? (
        <LoadingComponent loading={true} height={300} />
      ) : (
        <FlatList
          data={items}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          numColumns={isSongsList ? 1 : NUM_COLUMNS}
          key={isSongsList ? 'list' : 'grid'}
          contentContainerStyle={
            isSongsList ? styles.listContent : styles.gridContent
          }
          ListFooterComponent={ListFooter}
          onEndReached={loadMore}
          onEndReachedThreshold={0.5}
          showsVerticalScrollIndicator={false}
          initialNumToRender={20}
          maxToRenderPerBatch={10}
          windowSize={5}
        />
      )}
    </MainWrapper>
  );
};

// Song List Item
const SongListItem = React.memo(
  ({ song, index, onPress, isActive, isPlaying, theme }) => {
    const thumbnail = song.thumbnail || song.thumbnails?.[0]?.url;

    return (
      <Pressable
        style={[styles.songItem, isActive && styles.songItemActive]}
        onPress={onPress}
      >
        <Text style={[styles.songIndex, { color: theme.colors.text }]}>
          {index + 1}
        </Text>
        <FastImage
          source={{ uri: thumbnail }}
          style={styles.songThumbnail}
          resizeMode={FastImage.resizeMode.cover}
        />
        <View style={styles.songInfo}>
          <Text
            style={[
              styles.songTitle,
              { color: theme.colors.text },
              isActive && { color: theme.colors.primary },
            ]}
            numberOfLines={1}
          >
            {song.title || song.name}
          </Text>
          <Text
            style={[styles.songArtist, { color: theme.colors.text }]}
            numberOfLines={1}
          >
            {song.artist ||
              song.artists?.map((a) => a.name).join(', ') ||
              'Unknown'}
          </Text>
        </View>
      </Pressable>
    );
  }
);

// Grid Item
const GridItem = React.memo(({ item, onPress, theme }) => {
  const thumbnail = item.thumbnail || item.thumbnails?.[0]?.url;
  const isArtist = item.type === 'artist' || item.browseId?.startsWith('UC');

  return (
    <Pressable style={styles.gridItem} onPress={onPress}>
      <FastImage
        source={{ uri: thumbnail }}
        style={[styles.gridImage, isArtist && styles.gridImageCircle]}
        resizeMode={FastImage.resizeMode.cover}
      />
      <Text
        style={[styles.gridTitle, { color: theme.colors.text }]}
        numberOfLines={2}
      >
        {item.title || item.name}
      </Text>
      {item.subtitle && (
        <Text
          style={[styles.gridSubtitle, { color: theme.colors.text }]}
          numberOfLines={1}
        >
          {item.subtitle}
        </Text>
      )}
    </Pressable>
  );
});

// Parse artist items page response
const parseArtistItemsPage = (data) => {
  try {
    const gridRenderer =
      data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0]?.gridRenderer;

    if (gridRenderer) {
      return {
        title:
          gridRenderer.header?.gridHeaderRenderer?.title?.runs?.[0]?.text || '',
        items: gridRenderer.items?.map(parseGridItem).filter(Boolean) || [],
        continuation:
          gridRenderer.continuations?.[0]?.nextContinuationData?.continuation,
      };
    }

    // Try musicPlaylistShelfRenderer for songs
    const playlistShelf =
      data?.contents?.singleColumnBrowseResultsRenderer?.tabs?.[0]?.tabRenderer
        ?.content?.sectionListRenderer?.contents?.[0]
        ?.musicPlaylistShelfRenderer;

    if (playlistShelf) {
      return {
        title: data?.header?.musicHeaderRenderer?.title?.runs?.[0]?.text || '',
        items: playlistShelf.contents?.map(parseSongItem).filter(Boolean) || [],
        continuation:
          playlistShelf.continuations?.[0]?.nextContinuationData?.continuation,
      };
    }

    return { items: [], continuation: null };
  } catch (e) {
    console.error('parseArtistItemsPage error:', e);
    return { items: [], continuation: null };
  }
};

const parseArtistItemsContinuation = (data) => {
  try {
    const items =
      data?.continuationContents?.gridContinuation?.items
        ?.map(parseGridItem)
        .filter(Boolean) ||
      data?.continuationContents?.musicPlaylistShelfContinuation?.contents
        ?.map(parseSongItem)
        .filter(Boolean) ||
      [];

    const continuation =
      data?.continuationContents?.gridContinuation?.continuations?.[0]
        ?.nextContinuationData?.continuation ||
      data?.continuationContents?.musicPlaylistShelfContinuation
        ?.continuations?.[0]?.nextContinuationData?.continuation;

    return { items, continuation };
  } catch (e) {
    return { items: [], continuation: null };
  }
};

const parseGridItem = (item) => {
  try {
    const renderer = item.musicTwoRowItemRenderer;
    if (!renderer) {
      return null;
    }

    const title = renderer.title?.runs?.[0]?.text;
    const thumbnail =
      renderer.thumbnailRenderer?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(
        -1
      )[0]?.url;
    const subtitle = renderer.subtitle?.runs?.map((r) => r.text).join('') || '';
    const browseId = renderer.navigationEndpoint?.browseEndpoint?.browseId;
    const videoId = renderer.navigationEndpoint?.watchEndpoint?.videoId;

    let type = 'unknown';
    if (videoId) {
      type = 'song';
    } else if (browseId?.startsWith('MPRE') || browseId?.startsWith('OLAK')) {
      type = 'album';
    } else if (browseId?.startsWith('VL') || browseId?.startsWith('PL')) {
      type = 'playlist';
    } else if (browseId?.startsWith('UC')) {
      type = 'artist';
    }

    return {
      id: browseId || videoId,
      browseId,
      videoId,
      title,
      name: title,
      thumbnail,
      thumbnails: [{ url: thumbnail }],
      subtitle,
      type,
    };
  } catch (e) {
    return null;
  }
};

const parseSongItem = (item) => {
  try {
    const renderer = item.musicResponsiveListItemRenderer;
    if (!renderer) {
      return null;
    }

    const videoId = renderer.playlistItemData?.videoId;
    const title =
      renderer.flexColumns?.[0]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs?.[0]?.text;
    const artistRuns =
      renderer.flexColumns?.[1]?.musicResponsiveListItemFlexColumnRenderer?.text
        ?.runs || [];
    const artist = artistRuns
      .filter((_, i) => i % 2 === 0)
      .map((r) => r.text)
      .join(', ');
    const thumbnail =
      renderer.thumbnail?.musicThumbnailRenderer?.thumbnail?.thumbnails?.slice(
        -1
      )[0]?.url;

    return {
      id: videoId,
      videoId,
      title,
      name: title,
      artist,
      thumbnail,
      thumbnails: [{ url: thumbnail }],
      type: 'song',
    };
  } catch (e) {
    return null;
  }
};

const formatSong = (song) => ({
  id: song.videoId || song.id,
  title: song.title || song.name,
  artist: song.artist || 'Unknown',
  artwork: song.thumbnail || song.thumbnails?.[0]?.url,
  url: song.videoId || song.id,
  duration: 0,
});

const styles = StyleSheet.create({
  listContent: { paddingHorizontal: 16, paddingBottom: 120 },
  gridContent: { paddingHorizontal: 16, paddingBottom: 120 },
  footer: { height: 80, justifyContent: 'center', alignItems: 'center' },

  // Song items
  songItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 4,
    borderRadius: 8,
  },
  songItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  songIndex: { width: 30, fontSize: 14, opacity: 0.6, textAlign: 'center' },
  songThumbnail: {
    width: 48,
    height: 48,
    borderRadius: 4,
    marginHorizontal: 12,
  },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 15, fontWeight: '500' },
  songArtist: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  // Grid items
  gridItem: { width: CARD_WIDTH, marginBottom: 16, marginHorizontal: 4 },
  gridImage: {
    width: CARD_WIDTH - 8,
    height: CARD_WIDTH - 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  gridImageCircle: { borderRadius: (CARD_WIDTH - 8) / 2 },
  gridTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18 },
  gridSubtitle: { fontSize: 12, opacity: 0.7, marginTop: 2 },
});

export default ArtistItems;
