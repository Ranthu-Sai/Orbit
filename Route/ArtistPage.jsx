import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  ScrollView,
  Dimensions,
  ToastAndroid,
  RefreshControl,
  Pressable,
  StyleSheet,
  Share,
  StatusBar,
} from 'react-native';
import { Text, IconButton, Button } from 'react-native-paper';
import { useTheme as useNavigationTheme, useRoute, useNavigation } from '@react-navigation/native';
import PlaylistSelectorWrapper from '../Component/Playlist/PlaylistSelectorWrapper';
import FastImage from 'react-native-fast-image';
import LinearGradient from 'react-native-linear-gradient';
import Ionicons from 'react-native-vector-icons/Ionicons';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';

import { LoadingComponent } from '../Component/Global/Loading';
import { EachSongCard } from '../Component/Global/EachSongCard';
import { SmallText } from '../Component/Global/SmallText';
import { AddPlaylist } from '../MusicPlayerFunctions';
import FormatArtist from '../Utils/FormatArtists';
import YouTubeMusicService from '../Utils/YouTubeMusicService';

import { useArtistData, useArtistSongs, useArtistAlbums } from '../hooks/useArtistData';
import { validateRouteParams, formatSongsForPlaylist, getValidImageUrl, safeString, formatFollowerCount } from '../Utils/ArtistUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');
const CARD_WIDTH = 140;

const ArtistPage = () => {
  const route = useRoute();
  const navigation = useNavigation();
  const theme = useNavigationTheme();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  const routeParams = route.params || {};
  const { safeArtistId, safeArtistName } = validateRouteParams(routeParams);
  const source = routeParams.source || 'saavn';
  const preloadedSongs = routeParams.preloadedSongs || null;

  // YTMusic specific state for full sections
  const [ytSections, setYtSections] = useState([]);
  const [ytArtist, setYtArtist] = useState(null);
  const [ytLoading, setYtLoading] = useState(false);

  // Use existing hooks for data (works for both Saavn and YTMusic)
  const { artistData, loading, refreshing, onRefresh } = useArtistData(safeArtistId, source);
  const { visibleSongs, songLoading, hasMoreSongs, totalSongs, loadMoreSongs, resetSongs } = useArtistSongs(safeArtistId, 10, source, preloadedSongs);
  const { visibleAlbums, albumLoading, hasMoreAlbums, totalAlbums, loadMoreAlbums, resetAlbums } = useArtistAlbums(safeArtistId, 10, source);

  // Fetch full YTMusic sections if source is ytmusic
  useEffect(() => {
    const fetchYTMusicSections = async () => {
      if (source !== 'ytmusic' || !safeArtistId) return;

      try {
        setYtLoading(true);
        const data = await YouTubeMusicService.getArtist(safeArtistId);

        if (data && !data.error) {
          setYtArtist(data.artist);
          setYtSections(data.sections || []);
        }
      } catch (error) {
        console.error('Error fetching YTMusic sections:', error);
      } finally {
        setYtLoading(false);
      }
    };

    fetchYTMusicSections();
  }, [safeArtistId, source]);

  if (!safeArtistId) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <View style={styles.errorContainer}>
          <SmallText text="Error: Missing artist information" style={{ textAlign: 'center' }} />
          <Button mode="text" onPress={() => navigation.goBack()}>Go Back</Button>
        </View>
        <PlaylistSelectorWrapper />
      </View>
    );
  }

  // Get display values
  const displayName = safeString(
    ytArtist?.title || artistData?.data?.name || safeArtistName,
    'Unknown Artist'
  );
  const followerCount = formatFollowerCount(artistData?.data?.followerCount);
  const isVerified = artistData?.data?.isVerified;

  // Get artist image - try multiple sources with fallback
  const saavnImage = getValidImageUrl(artistData?.data?.image);
  const artistImage = ytArtist?.thumbnail || saavnImage || null;



  const handleRefresh = async () => {
    resetSongs();
    resetAlbums();
    await onRefresh();
    // Also refresh YTMusic data
    if (source === 'ytmusic') {
      try {
        const data = await YouTubeMusicService.getArtist(safeArtistId);
        if (data && !data.error) {
          setYtArtist(data.artist);
          setYtSections(data.sections || []);
        }
      } catch (e) { }
    }
  };

  const shufflePlay = async () => {
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
  };

  const playRadio = async () => {
    if (!visibleSongs || visibleSongs.length === 0) {
      ToastAndroid.show('No songs for radio', ToastAndroid.SHORT);
      return;
    }
    try {
      const formattedSongs = formatSongsForPlaylist(visibleSongs);
      const shuffled = [...formattedSongs].sort(() => Math.random() - 0.5);
      await AddPlaylist(shuffled.slice(0, 25));
      ToastAndroid.show(`Radio: ${displayName}`, ToastAndroid.SHORT);
    } catch (error) {
      console.error('Error starting radio:', error);
      ToastAndroid.show('Failed to start radio', ToastAndroid.SHORT);
    }
  };

  const handleShare = async () => {
    try {
      await Share.share({
        message: `Check out ${displayName} on Orbit Music!`,
        title: displayName,
      });
    } catch (error) {
      console.error('Error sharing:', error);
    }
  };

  const navigateToAlbum = useCallback((album) => {
    navigation.navigate('Album', {
      id: album.id || album.browseId,
      name: album.name || album.title,
      source: source === 'ytmusic' ? 'ytmusic' : 'saavn',
    });
  }, [navigation, source]);

  const navigateToArtist = useCallback((artist) => {
    navigation.push('ArtistPage', {
      artistId: artist.id || artist.browseId,
      artistName: artist.name || artist.title,
      source: 'ytmusic',
    });
  }, [navigation]);

  const isLoading = loading || ytLoading;

  if (isLoading && !artistData && ytSections.length === 0) {
    return (
      <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <LoadingComponent loading={true} height={screenHeight} />
        <PlaylistSelectorWrapper />
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      <ScrollView
        style={styles.container}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        contentContainerStyle={{ paddingBottom: 120 }}
      >
        {/* Hero Header */}
        <View style={styles.heroContainer}>
          {artistImage ? (
            <FastImage
              source={{ uri: artistImage }}
              style={styles.heroImage}
              resizeMode={FastImage.resizeMode.cover}
            />
          ) : (
            <View style={[styles.heroImage, { backgroundColor: theme.colors.card }]} />
          )}
          <LinearGradient
            colors={['rgba(0,0,0,0.6)', 'transparent', 'rgba(0,0,0,0.2)', 'rgba(0,0,0,0.6)', '#000000']}
            style={styles.heroGradient}
          />



          {/* Artist Info */}
          <View style={styles.heroContent}>
            <View style={styles.artistNameRow}>
              <Text style={styles.artistName} numberOfLines={2}>{displayName}</Text>
              {isVerified && (
                <MaterialIcons name="verified" size={24} color="#1DB954" style={{ marginLeft: 8 }} />
              )}
            </View>


            {/* Action Buttons */}
            <View style={styles.actionButtons}>
              <Button
                mode="contained"
                icon="shuffle"
                onPress={shufflePlay}
                style={[styles.shuffleButton, { backgroundColor: theme.colors.primary }]}
                labelStyle={[styles.buttonLabel, { color: '#fff' }]}
                contentStyle={styles.buttonContent}
              >
                Shuffle
              </Button>
              <Button
                mode="outlined"
                icon="radio"
                onPress={playRadio}
                style={styles.radioButton}
                labelStyle={[styles.buttonLabel, { color: '#fff' }]}
                contentStyle={styles.buttonContent}
              >
                Radio
              </Button>
            </View>
          </View>
        </View>

        {/* YTMusic Sections (if available) */}
        {source === 'ytmusic' && ytSections.length > 0 && ytSections.map((section, index) => (
          <ArtistSection
            key={`yt-${section.title}-${index}`}
            section={section}
            theme={theme}
            navigation={navigation}
            activeTrack={activeTrack}
            playbackState={playbackState}
            onAlbumPress={navigateToAlbum}
            onArtistPress={navigateToArtist}
            source={source}
          />
        ))}

        {/* Songs Section (from hooks - for Saavn or if YTMusic sections empty) */}
        {(source !== 'ytmusic' || ytSections.length === 0) && visibleSongs && visibleSongs.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Songs</Text>
              <Text style={[styles.sectionCount, { color: theme.colors.text }]}>
                {totalSongs > 0 ? totalSongs : visibleSongs.length} songs
              </Text>
            </View>

            <View style={styles.songsContainer}>
              {visibleSongs.slice(0, 5).map((song, index) => {
                if (!song || !song.id) return null;
                return (
                  <EachSongCard
                    key={`${song.id}-${index}`}
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
                    Data={{ data: { songs: visibleSongs } }}
                    index={index}
                    showNumber={true}
                    truncateTitle={true}
                    activeTrackId={activeTrack?.id}
                    isPlaying={playbackState.state === "playing" || playbackState.state === 3}
                  />
                );
              })}
            </View>

            {visibleSongs.length > 5 && (
              <Pressable
                style={[styles.showMoreButton, { backgroundColor: theme.colors.card }]}
                onPress={() => navigation.navigate('ArtistSongs', {
                  artistId: safeArtistId,
                  artistName: displayName,
                  source,
                  preloadedSongs: visibleSongs,
                })}
              >
                <Text style={[styles.showMoreText, { color: theme.colors.text }]}>
                  Show all songs
                </Text>
                <Ionicons name="chevron-forward" size={18} color={theme.colors.text} />
              </Pressable>
            )}
          </View>
        )}

        {/* Albums Section (from hooks - for Saavn or if YTMusic sections empty) */}
        {(source !== 'ytmusic' || ytSections.length === 0) && visibleAlbums && visibleAlbums.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>Albums</Text>
              <Text style={[styles.sectionCount, { color: theme.colors.text }]}>
                {totalAlbums > 0 ? totalAlbums : visibleAlbums.length} albums
              </Text>
            </View>

            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.horizontalScroll}
            >
              {visibleAlbums.map((album, index) => (
                <AlbumCard
                  key={`${album.id}-${index}`}
                  album={album}
                  onPress={navigateToAlbum}
                  theme={theme}
                />
              ))}
            </ScrollView>
          </View>
        )}

        {/* Bio Section */}
        {artistData?.data?.bio && artistData.data.bio.length > 0 && (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>About</Text>
            <View style={[styles.bioContainer, { backgroundColor: theme.colors.card }]}>
              <Text style={[styles.bioText, { color: theme.colors.text }]} numberOfLines={6}>
                {Array.isArray(artistData.data.bio)
                  ? artistData.data.bio.map(b => b.text || b).join('\n')
                  : artistData.data.bio}
              </Text>
            </View>
          </View>
        )}

        {/* Loading indicators */}
        {(songLoading || albumLoading) && (
          <LoadingComponent loading={true} height={50} />
        )}
      </ScrollView>
      <PlaylistSelectorWrapper />
    </View>
  );
};

const ArtistSection = React.memo(({ section, theme, navigation, activeTrack, playbackState, onAlbumPress, onArtistPress, source }) => {
  const { title, items, type, moreEndpoint } = section;

  if (!items || items.length === 0) return null;

  const handleItemPress = (item) => {
    if (item.type === 'song' || item.videoId) {
      const formatted = {
        id: item.videoId || item.id,
        title: item.title || item.name,
        artist: item.artist || item.artists?.map(a => a.name).join(', ') || 'Unknown',
        artwork: item.thumbnail || item.thumbnails?.[0]?.url,
        url: item.videoId || item.id,
        duration: item.duration || 0,
      };
      AddPlaylist([formatted]);
    } else if (item.type === 'album' || item.browseId?.startsWith('MPRE') || item.browseId?.startsWith('OLAK')) {
      onAlbumPress(item);
    } else if (item.type === 'playlist') {
      navigation.navigate('Playlist', { id: item.playlistId || item.id, name: item.name || item.title });
    } else if (item.type === 'artist' || item.browseId?.startsWith('UC')) {
      onArtistPress(item);
    }
  };

  // Generic "See All" Handler
  const handleSeeAll = () => {
    if (moreEndpoint) {
      navigation.navigate('SectionListPage', {
        title: title,
        endpoint: moreEndpoint,
        type: type === 'songs' ? 'song' : type // Pass type hint
      });
    }
  };

  // OuterTune logic: check if first item has album property = songs section (vertical list)
  const firstItem = items[0];
  const isSongsSection = type === 'songs' || (firstItem?.album != null && !firstItem?.browseId);

  // Check if it's an artists section (circular cards)
  const isArtistsSection = type === 'artists' ||
    items.every(item => item.type === 'artist' || item.browseId?.startsWith('UC'));

  // Check if it's videos/live section (wider cards)
  const isVideosSection = type === 'videos' || type === 'live' ||
    title.toLowerCase().includes('video') || title.toLowerCase().includes('live');


  // Videos/Live - wider cards
  if (isVideosSection) {
    const isLive = title.toLowerCase().includes('live');
    return (
      <View style={styles.section}>
        <SectionHeader
          title={title}
          hasMore={!isLive && !!moreEndpoint}
          theme={theme}
          onViewMore={handleSeeAll}
        />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {items.map((item, index) => (
            <VideoCard key={`${item.id}-${index}`} item={item} onPress={() => handleItemPress(item)} theme={theme} />
          ))}
        </ScrollView>
      </View>
    );
  }


  // Songs section - vertical list (like OuterTune)
  if (isSongsSection) {
    const displaySongs = items.slice(0, 5);
    return (
      <View style={styles.section}>
        <SectionHeader title={title || 'Songs'} hasMore={!!moreEndpoint} theme={theme} onViewMore={handleSeeAll} />
        <View style={styles.songsContainer}>
          {displaySongs.map((song, index) => (
            <SongListItem
              key={`${song.id || song.videoId}-${index}`}
              song={song}
              index={index}
              onPress={() => handleItemPress(song)}
              isActive={activeTrack?.id === song.videoId || activeTrack?.id === song.id}
              isPlaying={playbackState.state === 'playing' || playbackState.state === 3}
              theme={theme}
            />
          ))}
        </View>
      </View>
    );
  }

  // Artists section - circular cards (like OuterTune's "Fans might also like")
  if (isArtistsSection) {
    return (
      <View style={styles.section}>
        <SectionHeader title={title} hasMore={!!moreEndpoint} theme={theme} onViewMore={handleSeeAll} />
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
          {items.map((item, index) => (
            <ArtistCard key={`${item.id}-${index}`} item={item} onPress={() => handleItemPress(item)} theme={theme} />
          ))}
        </ScrollView>
      </View>
    );
  }


  // Default carousel (Albums, Singles, Playlists, Featured) - LazyRow in OuterTune
  return (
    <View style={styles.section}>
      <SectionHeader title={title} hasMore={!!moreEndpoint} theme={theme} onViewMore={handleSeeAll} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.horizontalScroll}>
        {items.map((item, index) => (
          <GridCard key={`${item.id}-${index}`} item={item} onPress={() => handleItemPress(item)} theme={theme} />
        ))}
      </ScrollView>
    </View>
  );
});

// Section Header
const SectionHeader = React.memo(({ title, hasMore, theme, onViewMore }) => (
  // Add paddingRight directly to the touch target for better UX
  <View style={styles.sectionHeader}>
    <Text style={[styles.sectionTitle, { color: theme.colors.text }]}>{title}</Text>
    {hasMore && (
      <IconButton
        icon="arrow-right"
        size={24}
        iconColor={theme.colors.primary}
        onPress={onViewMore}
        style={{ margin: 0, padding: 0 }} // Remove default margins 
      />
    )}
  </View>
));

// Song List Item
const SongListItem = React.memo(({ song, index, onPress, isActive, isPlaying, theme }) => {
  const thumbnail = song.thumbnail || song.thumbnails?.[0]?.url || song.artwork;

  return (
    <Pressable style={[styles.songItem, isActive && styles.songItemActive]} onPress={onPress}>
      <Text style={[styles.songIndex, { color: theme.colors.text }]}>{index + 1}</Text>
      <FastImage source={{ uri: thumbnail }} style={styles.songThumbnail} resizeMode={FastImage.resizeMode.cover} />
      <View style={styles.songInfo}>
        <Text style={[styles.songTitle, { color: theme.colors.text }, isActive && { color: theme.colors.primary }]} numberOfLines={1}>
          {song.title || song.name}
        </Text>
        <Text style={[styles.songArtist, { color: theme.colors.text }]} numberOfLines={1}>
          {song.artist || song.artists?.map(a => a.name).join(', ') || 'Unknown'}
        </Text>
      </View>
      <IconButton icon="dots-vertical" size={20} iconColor={theme.colors.text} style={{ opacity: 0.6 }} />
    </Pressable>
  );
});

// Grid Card (Albums, Singles, Playlists)
const GridCard = React.memo(({ item, onPress, theme }) => {
  const thumbnail = item.thumbnail || item.thumbnails?.[0]?.url || getValidImageUrl(item.image);

  return (
    <Pressable style={styles.gridCard} onPress={onPress}>
      <FastImage source={{ uri: thumbnail }} style={styles.gridImage} resizeMode={FastImage.resizeMode.cover} />
      <Text style={[styles.gridTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title || item.name}</Text>
      <Text style={[styles.gridSubtitle, { color: theme.colors.text }]} numberOfLines={1}>
        {item.subtitle || (item.year ? `${item.year}` : '')}
      </Text>
    </Pressable>
  );
});

// Video Card (wider)
const VideoCard = React.memo(({ item, onPress, theme }) => {
  const thumbnail = item.thumbnail || item.thumbnails?.[0]?.url;

  return (
    <Pressable style={styles.videoCard} onPress={onPress}>
      <FastImage source={{ uri: thumbnail }} style={styles.videoImage} resizeMode={FastImage.resizeMode.cover} />
      <View style={styles.videoOverlay}>
        <Ionicons name="play-circle" size={40} color="rgba(255,255,255,0.9)" />
      </View>
      <Text style={[styles.videoTitle, { color: theme.colors.text }]} numberOfLines={2}>{item.title || item.name}</Text>
    </Pressable>
  );
});

// Artist Card (circular)
const ArtistCard = React.memo(({ item, onPress, theme }) => {
  const thumbnail = item.thumbnail || item.thumbnails?.[0]?.url;

  return (
    <Pressable style={styles.artistCard} onPress={onPress}>
      <FastImage source={{ uri: thumbnail }} style={styles.artistCardImage} resizeMode={FastImage.resizeMode.cover} />
      <Text style={[styles.artistCardName, { color: theme.colors.text }]} numberOfLines={2}>{item.title || item.name}</Text>
    </Pressable>
  );
});

// Album Card (for Saavn)
const AlbumCard = React.memo(({ album, onPress, theme }) => {
  const albumImage = getValidImageUrl(album.image);

  return (
    <Pressable style={styles.gridCard} onPress={() => onPress(album)}>
      <FastImage source={{ uri: albumImage }} style={styles.gridImage} resizeMode={FastImage.resizeMode.cover} />
      <Text style={[styles.gridTitle, { color: theme.colors.text }]} numberOfLines={2}>
        {safeString(album.name, 'Unknown Album')}
      </Text>
      <Text style={[styles.gridSubtitle, { color: theme.colors.text }]} numberOfLines={1}>
        {album.year || ''} {album.year && album.songCount ? '•' : ''} {album.songCount ? `${album.songCount} songs` : ''}
      </Text>
    </Pressable>
  );
});

const styles = StyleSheet.create({
  container: { flex: 1 },
  errorContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },

  // Hero
  heroContainer: { height: 350, position: 'relative', paddingTop: StatusBar.currentHeight || 0 },
  heroImage: { width: '100%', height: '100%', position: 'absolute' },
  heroGradient: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  heroContent: { position: 'absolute', bottom: 64, left: 24, right: 24 },
  artistNameRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap' },
  artistName: { color: '#fff', fontSize: 36, fontWeight: 'bold', maxWidth: '90%' },
  followerText: { color: 'rgba(255,255,255,0.8)', fontSize: 14, marginTop: 4, marginBottom: 16 },
  actionButtons: { flexDirection: 'row', gap: 12, marginTop: 24 },
  shuffleButton: { flex: 1, borderRadius: 32 },
  radioButton: { flex: 1, borderRadius: 32, borderColor: 'rgba(255,255,255,0.5)' },
  buttonLabel: { fontSize: 16, fontWeight: '600', color: '#000' },
  buttonContent: { height: 48 },

  // Sections
  section: { marginTop: 4, paddingHorizontal: 0 },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingHorizontal: 16
  },
  sectionTitle: { fontSize: 24, fontWeight: 'bold' },
  sectionCount: { fontSize: 14, opacity: 0.7 },
  horizontalScroll: { gap: 16, paddingHorizontal: 16 },

  // Songs
  songsContainer: { gap: 4, paddingHorizontal: 8 },
  songItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, paddingHorizontal: 8, borderRadius: 8 },
  songItemActive: { backgroundColor: 'rgba(255,255,255,0.1)' },
  songIndex: { width: 24, fontSize: 14, opacity: 0.6, textAlign: 'center' },
  songThumbnail: { width: 48, height: 48, borderRadius: 4, marginHorizontal: 12 },
  songInfo: { flex: 1 },
  songTitle: { fontSize: 16, fontWeight: '500' },
  songArtist: { fontSize: 14, opacity: 0.7, marginTop: 2 },

  showMoreButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 20, borderRadius: 24, marginTop: 12, marginHorizontal: 16 },
  showMoreText: { fontSize: 14, fontWeight: '600', marginRight: 4 },

  // Grid Cards
  gridCard: { width: CARD_WIDTH },
  gridImage: { width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12, marginBottom: 8 },
  gridTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18, marginTop: 4 },
  gridSubtitle: { fontSize: 13, opacity: 0.7, marginTop: 2 },

  // Video Cards - Matches OuterTune Video Card
  videoCard: { width: 280 },
  videoImage: { width: 280, height: 157, borderRadius: 12, marginBottom: 8 }, // 16:9 aspect
  videoOverlay: { position: 'absolute', top: 50, left: 120 },
  videoTitle: { fontSize: 14, fontWeight: '600', lineHeight: 18, marginTop: 4 },

  // Artist Cards (circular)
  artistCard: { width: CARD_WIDTH, alignItems: 'center' },
  artistCardImage: { width: 140, height: 140, borderRadius: 70, marginBottom: 12 },
  artistCardName: { fontSize: 14, fontWeight: '500', textAlign: 'center' },

  // Bio
  bioContainer: { padding: 16, borderRadius: 12, marginTop: 8, marginHorizontal: 16 },
  bioText: { fontSize: 14, lineHeight: 22, opacity: 0.9 },
});

export default ArtistPage;
