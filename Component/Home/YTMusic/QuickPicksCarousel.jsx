import React, { useRef, useState, useCallback, useEffect } from 'react';
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
import LinearGradient from 'react-native-linear-gradient';
import ImageColors from 'react-native-image-colors';
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

const getRgba = (hexColor, alpha = 1) => {
  if (!hexColor) return `rgba(27, 67, 50, ${alpha})`;
  let c = hexColor.replace('#', '');
  if (c.length === 3) {
    c = c[0] + c[0] + c[1] + c[1] + c[2] + c[2];
  }
  if (c.length === 6) {
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
  return hexColor;
};

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ITEM_WIDTH = SCREEN_WIDTH * 0.7; // 70% of screen width
const ITEM_SPACING = (SCREEN_WIDTH - ITEM_WIDTH) / 2;

export const QuickPicksCarousel = ({ title, songs }) => {
  const theme = useTheme();
  const scrollX = useRef(new Animated.Value(ITEM_WIDTH)).current;
  const flatListRef = useRef(null);
  const [currentIndex, setCurrentIndex] = useState(1);
  const [accentColor, setAccentColor] = useState('#1b4332');
  const initializedRef = useRef(false);

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

  // Ensure initial scroll position is index 1 once songs load
  React.useEffect(() => {
    if (!initializedRef.current && flatSongs && flatSongs.length > 1) {
      initializedRef.current = true;
      setCurrentIndex(1);
      scrollX.setValue(ITEM_WIDTH);
      flatListRef.current?.scrollToOffset({
        offset: ITEM_WIDTH,
        animated: false,
      });
    }
  }, [flatSongs]);

  // Extract color whenever currentIndex changes
  useEffect(() => {
    let isMounted = true;
    const currentSong = flatSongs[currentIndex];
    if (!currentSong) return;

    const imageUrl = getBestThumbnail(currentSong.thumbnails, currentSong.videoId || currentSong.id);
    if (!imageUrl) return;

    ImageColors.getColors(imageUrl, {
      fallback: '#1b4332',
      cache: true,
      key: imageUrl,
    })
      .then((colors) => {
        if (!isMounted) return;
        let pickedColor = null;
        if (colors.platform === 'android') {
          pickedColor = colors.vibrant || colors.darkVibrant || colors.dominant || colors.lightVibrant;
        } else if (colors.platform === 'ios') {
          pickedColor = colors.background || colors.primary || colors.secondary;
        } else {
          pickedColor = colors.vibrant || colors.dominant;
        }

        if (pickedColor) {
          setAccentColor(pickedColor);
        }
      })
      .catch((err) => {
        console.warn('Failed to extract color from carousel thumbnail:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentIndex, flatSongs]);

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
  const rawArtist = currentSong?.artist || currentSong?.artists?.[0]?.name || 'Unknown Artist';
  const currentArtist = rawArtist.length > 35 ? rawArtist.substring(0, 35) + '...' : rawArtist;

  return (
    <View style={styles.container}>
      {/* Dynamic Ambient Background Gradient */}
      <LinearGradient
        colors={[
          getRgba(accentColor, 0.8),
          getRgba(accentColor, 0.45),
          getRgba(accentColor, 0.2),
          'transparent',
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
        style={[StyleSheet.absoluteFillObject, { top: -350, height: 850, zIndex: -1 }]}
        pointerEvents="none"
      />

      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: theme.colors.onSurface }]}>
          {title || 'Quick Picks'}
        </Text>
      </View>

      <Animated.FlatList
        ref={flatListRef}
        data={flatSongs}
        keyExtractor={(item, index) => `${item.videoId || item.id}-${index}`}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_WIDTH}
        decelerationRate="fast"
        bounces={false}
        initialScrollIndex={flatSongs.length > 1 ? 1 : 0}
        contentOffset={{ x: flatSongs.length > 1 ? ITEM_WIDTH : 0, y: 0 }}
        getItemLayout={(data, index) => ({
          length: ITEM_WIDTH,
          offset: ITEM_WIDTH * index,
          index,
        })}
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
            outputRange: [0.8, 1, 0.8],
            extrapolate: 'clamp',
          });

          const translateX = scrollX.interpolate({
            inputRange,
            outputRange: [-ITEM_WIDTH * 0.55, 0, ITEM_WIDTH * 0.55], // pull inwards
            extrapolate: 'clamp',
          });

          const zIndex = scrollX.interpolate({
            inputRange,
            outputRange: [0, 100, 0],
            extrapolate: 'clamp',
          });

          const opacity = scrollX.interpolate({
            inputRange,
            outputRange: [0.5, 1, 0.5],
            extrapolate: 'clamp',
          });

          const imageUrl = getBestThumbnail(item.thumbnails, item.videoId || item.id);

          return (
            <Animated.View
              style={[
                styles.cardContainer,
                {
                  transform: [{ scale }, { translateX }],
                  opacity,
                  zIndex,
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
                <View style={styles.shadowWrapper}>
                  <View style={[styles.imageContainer, { backgroundColor: theme.colors.surfaceVariant, borderWidth: 1, borderColor: theme.dark ? 'white' : 'black' }]}>
                    <FastImage
                      source={{ uri: imageUrl }}
                      style={styles.image}
                      resizeMode={FastImage.resizeMode.cover}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            </Animated.View>
          );
        }}
      />

      {/* Pagination Dots */}
      <View style={styles.paginationContainer}>
        {flatSongs.slice(0, Math.min(flatSongs.length, 8)).map((_, idx) => (
          <View
            key={`dot-${idx}`}
            style={[
              styles.paginationDot,
              idx === currentIndex
                ? { backgroundColor: accentColor, width: 14 }
                : { backgroundColor: 'rgba(255, 255, 255, 0.25)', width: 6 },
            ]}
          />
        ))}
      </View>

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
    position: 'relative',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  titleIndicator: {
    width: 4,
    height: 22,
    borderRadius: 2,
    marginRight: 10,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
  },
  cardContainer: {
    width: ITEM_WIDTH,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shadowWrapper: {
    elevation: 25,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 20,
    borderRadius: 12,
  },
  imageContainer: {
    width: ITEM_WIDTH,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  image: {
    width: '100%',
    height: '100%',
    transform: [{ scale: 1.35 }],
  },
  paginationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 14,
    gap: 6,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  infoContainer: {
    alignItems: 'center',
    marginTop: 12,
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

