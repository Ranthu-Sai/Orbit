import React, { useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  Animated,
  TouchableOpacity,
} from 'react-native';
import FastImage from 'react-native-fast-image';
import { useTheme } from 'react-native-paper';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { PlayOneSong } from '../../../MusicPlayerFunctions';
import { GlassBox } from '../../Global/GlassBox';


const getBestThumbnail = (thumbnails, videoId = null) => {
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  }
  if (!thumbnails) return null;

  if (Array.isArray(thumbnails)) {
    const sorted = [...thumbnails].sort((a, b) => (b.width || 0) - (a.width || 0));
    return sorted[0]?.url || thumbnails[thumbnails.length - 1]?.url || thumbnails[0]?.url;
  }

  if (typeof thumbnails === 'string') return thumbnails;
  if (thumbnails?.url) return thumbnails.url;

  return null;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const ITEM_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

export const QuickPicksCarousel = ({ title, songs }) => {
  const theme = useTheme();
  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Flatten the columns structure if songs are passed as 4-item columns (from original QuickPicksSection)
  // Or handle flat array of songs.
  const flatSongs = React.useMemo(() => {
    if (!songs || songs.length === 0) return [];

    // If the songs array contains arrays (columns), flatten it
    if (Array.isArray(songs[0])) {
      return songs.flat();
    }

    return songs;
  }, [songs]);

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current;

  const onViewableItemsChanged = useCallback(({ viewableItems }) => {
    if (viewableItems && viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index || 0);
    }
  }, []);

  const handlePlaySong = async (song) => {
    if (!song) return;

    try {
      const songData = {
        title: song.title || song.name,
        artist: song.artist || song.artists?.[0]?.name || '',
        artwork: getBestThumbnail(song.thumbnails, song.videoId || song.id),
        id: song.videoId || song.id,
        duration: song.duration,
        source: 'ytmusic',
        url: song.videoId || song.id, // For YTMusic, URL is often just the ID
      };

      await PlayOneSong(songData);
    } catch (error) {
      console.error('Error playing song from carousel:', error);
    }
  };

  const handlePlayCurrent = () => {
    if (flatSongs[currentIndex]) {
      handlePlaySong(flatSongs[currentIndex]);
    }
  };

  const handleSkipBackward = () => {
    if (currentIndex > 0) {
      const nextIndex = currentIndex - 1;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * ITEM_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  };

  const handleSkipForward = () => {
    if (currentIndex < flatSongs.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToOffset({
        offset: nextIndex * ITEM_WIDTH,
        animated: true,
      });
      setCurrentIndex(nextIndex);
    }
  };

  if (!flatSongs || flatSongs.length === 0) {
    return null;
  }

  const currentSong = flatSongs[currentIndex];
  const currentTitle = currentSong?.title || currentSong?.name || 'Unknown';
  const currentArtist = currentSong?.artist || currentSong?.artists?.[0]?.name || 'Unknown Artist';

  return (
    <View style={styles.container}>
      <Text style={[styles.title, { color: theme.colors.onSurface }]}>
        {title || 'Quick Picks'}
      </Text>

      <Animated.FlatList
        ref={flatListRef}
        data={flatSongs}
        keyExtractor={(item, index) => `${item.videoId || item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        contentContainerStyle={{
          paddingHorizontal: ITEM_SPACING,
        }}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { x: scrollX } } }],
          { useNativeDriver: true }
        )}
        onViewableItemsChanged={onViewableItemsChanged}
        viewabilityConfig={viewabilityConfig}
        scrollEventThrottle={16}
        renderItem={({ item, index }) => {
          const inputRange = [
            (index - 1) * ITEM_WIDTH,
            index * ITEM_WIDTH,
            (index + 1) * ITEM_WIDTH,
          ];

          const scale = scrollX.interpolate({
            inputRange,
            outputRange: [0.85, 1, 0.85],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.6, 1, 0.6],
            extrapolate: 'clamp',
          });

          const imageUrl = getBestThumbnail(item.thumbnails, item.videoId || item.id);

          return (
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale }],
                  opacity,
                },
              ]}
            >
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  if (currentIndex === index) {
                    handlePlaySong(item);
                  } else {
                    flatListRef.current?.scrollToOffset({
                      offset: index * ITEM_WIDTH,
                      animated: true,
                    });
                    setCurrentIndex(index);
                  }
                }}
              >
                <View style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceVariant }]}>
                  <FastImage
                    source={{ uri: imageUrl }}
                    style={styles.image}
                    resizeMode={FastImage.resizeMode.cover}
                  />
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      <View style={styles.infoContainer}>
        <Text
          style={[styles.songTitle, { color: theme.colors.onSurface }]}
          numberOfLines={1}
        >
          {currentTitle}
        </Text>
        <Text
          style={[styles.songArtist, { color: theme.colors.onSurfaceVariant }]}
          numberOfLines={1}
        >
          {currentArtist}
        </Text>
      </View>

      <View style={styles.controlsContainer}>
        <TouchableOpacity onPress={handleSkipBackward}>
          <GlassBox 
            id="prev" 
            style={styles.iconButton}
            gradientConfig={{
              x1: '0%', y1: '0%', x2: '100%', y2: '100%',
              stops: [
                { offset: '0%', opacity: 0.5 },
                { offset: '25%', opacity: 0.5 },
                { offset: '50%', opacity: 0.0 },
                { offset: '75%', opacity: 0.5 },
                { offset: '100%', opacity: 0.5 },
              ],
            }}
          >
            <Icon name="skip-previous" size={28} color={theme.colors.onSurface} />
          </GlassBox>
        </TouchableOpacity>

        <TouchableOpacity onPress={handlePlayCurrent}>
          <GlassBox 
            id="play" 
            style={styles.playButton}
            gradientConfig={{
              x1: '0%', y1: '0%', x2: '12%', y2: '172%',
              stops: [
                { offset: '0%', opacity: 0.5 },
                { offset: '25%', opacity: 0.5 },
                { offset: '40%', opacity: 0.0 },
                { offset: '50%', opacity: 0.0 },
                { offset: '65%', opacity: 0.5 },
                { offset: '100%', opacity: 0.5 },
              ],
            }}
          >
            <Icon name="play" size={28} color={theme.colors.onSurface} style={styles.playIcon} />
            <Text style={[styles.playText, { color: theme.colors.onSurface }]}>Your rhythm</Text>
          </GlassBox>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleSkipForward}>
          <GlassBox 
            id="next" 
            style={styles.iconButton}
            gradientConfig={{
              x1: '0%', y1: '0%', x2: '100%', y2: '100%',
              stops: [
                { offset: '0%', opacity: 0.5 },
                { offset: '25%', opacity: 0.5 },
                { offset: '50%', opacity: 0.0 },
                { offset: '75%', opacity: 0.5 },
                { offset: '100%', opacity: 0.5 },
              ],
            }}
          >
            <Icon name="skip-next" size={28} color={theme.colors.onSurface} />
          </GlassBox>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    width: '100%',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  cardContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  imageContainer: {
    width: ITEM_WIDTH,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  image: {
    width: '100%',
    height: '100%',
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 16,
    paddingHorizontal: 32,
  },
  songTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 4,
  },
  songArtist: {
    fontSize: 14,
    textAlign: 'center',
  },
  controlsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 20,
    gap: 24,
  },
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
  },
  playIcon: {
    marginRight: 8,
  },
  playText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  iconButton: {
    width: 52,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 26,
  },
});
