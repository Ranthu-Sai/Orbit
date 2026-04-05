/**
 * QuickPicks.jsx
 *
 * OuterTune-style Quick Picks component using Orbit's EachSongCard.
 * Horizontal scroll with 4 songs per column.
 */

import React from 'react';
import { View, FlatList, Text, StyleSheet, Dimensions } from 'react-native';
import { useTheme } from '@react-navigation/native';
import { EachSongCard } from '../../Global/EachSongCard'; // User requested component
import FormatTitleAndArtist from '../../../Utils/FormatTitleAndArtist';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const COLUMN_WIDTH = SCREEN_WIDTH * 0.92; // Slightly wider for full cards
const SONGS_PER_COLUMN = 4;

// Get best thumbnail helper
const getBestThumbnail = (thumbnails, videoId = null) => {
  if (videoId) {
    return `https://i.ytimg.com/vi/${videoId}/mqdefault.jpg`;
  }
  if (!thumbnails) {
    return null;
  }
  if (Array.isArray(thumbnails)) {
    const sorted = [...thumbnails].sort(
      (a, b) => (b.width || 0) - (a.width || 0)
    );
    return sorted[0]?.url || thumbnails[0]?.url;
  }
  if (typeof thumbnails === 'string') {
    return thumbnails;
  }
  if (thumbnails?.url) {
    return thumbnails.url;
  }
  return null;
};

// Column of 4 EachSongCards
const QuickPickColumn = ({ songs, colors }) => {
  return (
    <View style={styles.column}>
      {songs.map((song, idx) => {
        const thumbnail = getBestThumbnail(
          song.thumbnails,
          song.videoId || song.id
        );
        const title = song.title || song.name || '';
        const artist = song.artist || song.artists?.[0]?.name || '';

        return (
          <View
            key={`${song.videoId || song.id}-${idx}`}
            style={styles.cardContainer}
          >
            <EachSongCard
              id={song.videoId || song.id}
              title={title}
              artist={artist}
              image={thumbnail}
              duration={song.duration}
              width={COLUMN_WIDTH} // distinct prop for text truncation width
              titleandartistwidth={COLUMN_WIDTH - 120} // Adjust for thumbnail + buttons
              source={'ytmusic'}
              // key props for EachSongCard functionality
              url={song.url || ''}
              isFromPlaylist={false}
              showNumber={false}
            />
          </View>
        );
      })}
    </View>
  );
};

export const QuickPicks = ({ songs = [], title = 'Quick picks' }) => {
  const { colors } = useTheme();

  if (!songs || songs.length === 0) {
    return null;
  }

  // Group songs into columns of 4
  const columns = [];
  for (let i = 0; i < songs.length; i += SONGS_PER_COLUMN) {
    columns.push(songs.slice(i, i + SONGS_PER_COLUMN));
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.heading, { color: colors.text }]}>{title}</Text>
      </View>
      <FlatList
        horizontal
        showsHorizontalScrollIndicator={false}
        data={columns}
        keyExtractor={(_, index) => `column-${index}`}
        contentContainerStyle={styles.listContainer}
        snapToInterval={COLUMN_WIDTH + 12}
        decelerationRate="fast"
        renderItem={({ item: columnSongs }) => (
          <QuickPickColumn songs={columnSongs} colors={colors} />
        )}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: 16, // More breathing room
    marginBottom: 8,
  },
  headerRow: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  heading: {
    fontSize: 22, // Matches Home titles
    fontWeight: 'bold',
    fontFamily: 'CircularStd-Bold', // Use app font if available or default
  },
  listContainer: {
    paddingHorizontal: 8,
  },
  column: {
    width: COLUMN_WIDTH,
    marginRight: 8,
  },
  cardContainer: {
    marginBottom: 0, // EachSongCard has internal padding
  },
});

export default QuickPicks;
