import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { useTheme, useNavigation } from '@react-navigation/native';
import { Search, ArrowUpRight } from 'lucide-react-native';
import { EachSongCard } from '../Global/EachSongCard';
import { useActiveTrack, usePlaybackState } from 'react-native-track-player';

/**
 * SearchSuggestions with Quick Results
 * Shows text suggestions + top 3 song results like OuterTune
 */
const SearchSuggestions = ({
  suggestions = [],
  quickResults = [],
  onSuggestionPress,
   source = 'ytmusic',
}) => {
  const { colors } = useTheme();
  const navigation = useNavigation();
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();

  const width = Dimensions.get('window').width;

  function FormatArtist(artists) {
    if (!artists || !Array.isArray(artists)) {
      return '';
    }
    return artists.map((e) => e.name).join(', ');
  }

  // Fill suggestion arrow press - fills input but doesn't search
  const handleFillPress = (item) => {
    if (onSuggestionPress) {
      onSuggestionPress(item, true); // second param = fillOnly
    }
  };

  if (
    (!suggestions || suggestions.length === 0) &&
    (!quickResults || quickResults.length === 0)
  ) {
    return null;
  }

  return (
    <ScrollView
      style={styles.container}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {/* Text Suggestions */}
      {suggestions.slice(0, 6).map((item, index) => (
        <TouchableOpacity
          key={`suggestion-${index}`}
          style={[styles.suggestionItem, { borderBottomColor: colors.border }]}
          onPress={() => onSuggestionPress && onSuggestionPress(item)}
        >
          <Search
            size={20}
            color={colors.text}
            style={{ opacity: 0.5, marginRight: 15 }}
          />
          <Text
            style={[styles.suggestionText, { color: colors.text }]}
            numberOfLines={1}
          >
            {item}
          </Text>
          <TouchableOpacity
            onPress={() => handleFillPress(item)}
            style={styles.fillButton}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <ArrowUpRight
              size={18}
              color={colors.text}
              style={{ opacity: 0.5 }}
            />
          </TouchableOpacity>
        </TouchableOpacity>
      ))}

      {/* Quick Results Section - Top Songs / Artists */}
      {quickResults && quickResults.length > 0 && (
        <View style={styles.quickResultsSection}>
          {quickResults.slice(0, 5).map((song, index) => (
            <EachSongCard
              key={`quick-${song.id || index}`}
              artistID={song?.primaryArtistsId || song?.primary_artists_id}
              language={song?.language}
              duration={song?.duration}
              image={
                song?.image?.[2]?.url ??
                song?.image?.[2]?.link ??
                song?.image?.[0]?.url ??
                song?.image?.[0]?.link ??
                song?.artwork ??
                ''
              }
              id={song?.id}
              width={width - 30} // Account for paddingHorizontal: 15
              title={song?.name || song?.title}
              artist={
                FormatArtist(song?.artists?.primary) ||
                song?.primaryArtists ||
                song?.artist
              }
              url={song?.downloadUrl}
              showNumber={false}
              source={song?.source || source || 'ytmusic'}
              item={song}
              Data={{ data: { results: quickResults } }}
              index={index}
              activeTrackId={activeTrack?.id}
              isPlaying={
                playbackState.state === 'playing' || playbackState.state === 3
              }
            />
          ))}
        </View>
      )}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 15,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  suggestionText: {
    fontSize: 16,
    flex: 1,
  },
  fillButton: {
    padding: 5,
  },
  quickResultsSection: {
    marginTop: 8,
  },
});

export default SearchSuggestions;
