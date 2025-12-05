import React, { useEffect, useRef, useState } from "react";
import { useActiveTrack, usePlaybackState } from "react-native-track-player";
import { View, BackHandler, TouchableOpacity, Text, StyleSheet, FlatList, TextInput, Dimensions, ActivityIndicator } from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from '@expo/vector-icons/Ionicons';
import { searchAll } from "../Api/Search";
import EachAlbumCard from "../Component/Global/EachAlbumCard";
import EachPlaylistCard from "../Component/Global/EachPlaylistCard";
import EachSongCard from "../Component/Global/EachSongCard";


const { width } = Dimensions.get('window');

export const Search = ({ route }) => {
  const navigation = useNavigation();
  const [searchText, setSearchText] = useState(route?.params?.searchText || "");
  const [searchResults, setSearchResults] = useState({});
  const [loading, setLoading] = useState(false);
  const backAttempted = useRef(false);
  const activeTrack = useActiveTrack();
  const playbackState = usePlaybackState();



  // Simple direct approach for back button
  useEffect(() => {
    const backAction = () => {
      // If we've already attempted to go back, go directly to Home
      if (backAttempted.current) {
        navigation.navigate('Home', { screen: 'HomePage' });
        return true;
      }

      // First back attempt - set flag and try to go back normally
      backAttempted.current = true;

      // Reset the flag after a delay
      setTimeout(() => {
        backAttempted.current = false;
      }, 3000); // Reset after 3 seconds

      // Go directly to Home on first attempt too
      navigation.navigate('Home', { screen: 'HomePage' });
      return true;
    };

    const backHandler = BackHandler.addEventListener('hardwareBackPress', backAction);
    return () => backHandler.remove();
  }, [navigation]);

  // Direct header icon navigation to Home
  useEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity
          onPress={() => {
            navigation.navigate('Home', { screen: 'HomePage' });
          }}
          style={{ marginLeft: 15, padding: 10 }}
        >
          <Ionicons name="close" size={24} color="black" />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  // Search functionality
  const handleSearch = async () => {
    if (!searchText.trim()) return;

    setLoading(true);
    try {
      const results = await searchAll(searchText);
      setSearchResults(results);
    } catch (error) {
      // Silent error handling
    } finally {
      setLoading(false);
    }
  };

  // Perform search when text changes or on mount
  useEffect(() => {
    if (searchText.trim()) {
      handleSearch();
    }
  }, [searchText]);

  // Render playlist with improved UI
  const renderPlaylist = ({ item }) => (
    <View style={styles.playlistContainer}>
      <EachPlaylistCard
        item={item}
        onPress={() => navigation.navigate('Playlist', {
          id: item.id,
          image: item.image,
          name: item.title,
          follower: `Total ${item.songCount} Songs`,
          source: 'Search',
          searchText: searchText
        })}
      />
    </View>
  );

  // Render album with improved UI
  const renderAlbum = ({ item }) => (
    <View style={styles.albumContainer}>
      <EachAlbumCard
        item={item}
        onPress={() => {
          navigation.navigate('Album', {
            id: item.id,
            name: item.title || item.name,
            timestamp: Date.now(),
            source: 'Search',
            searchText: searchText
          });
        }}
      />
    </View>
  );

  // Render song with improved UI
  const renderSong = ({ item }) => (
    <EachSongCard
      item={item}
      source={{ type: 'search', query: searchText }}
      showNumber={false}
      activeTrackId={activeTrack?.id}
      isPlaying={playbackState.state === "playing" || playbackState.state === 3}
    />
  );

  // Empty component for better UX
  const renderEmptyComponent = (title) => (
    <View style={styles.emptyContainer}>
      <Text style={styles.emptyText}>No {title} found</Text>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Search Input */}
      <View style={styles.searchInputContainer}>
        <Ionicons name="search" size={20} color="#777" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search songs, albums, playlists..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={handleSearch}
          returnKeyType="search"
          clearButtonMode="while-editing"
        />
      </View>

      {/* Loading Indicator */}
      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#8B5CF6" />
        </View>
      )}

      {/* Results */}
      {!loading && (
        <FlatList
          data={[1]} // Just a dummy item to render once
          keyExtractor={() => 'search-results'}
          renderItem={() => (
            <View style={styles.resultsContainer}>
              {/* Playlists Section with improved styling */}
              {searchResults.playlists && searchResults.playlists.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Playlists</Text>
                  <FlatList
                    data={searchResults.playlists}
                    keyExtractor={(item) => `playlist-${item.id}`}
                    renderItem={renderPlaylist}
                    horizontal={false}
                    numColumns={2}
                    contentContainerStyle={styles.playlistGrid}
                    columnWrapperStyle={styles.playlistRow}
                    ListEmptyComponent={() => renderEmptyComponent('playlists')}
                    showsHorizontalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </View>
              )}

              {/* Albums Section */}
              {searchResults.albums && searchResults.albums.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Albums</Text>
                  <FlatList
                    data={searchResults.albums}
                    keyExtractor={(item) => `album-${item.id}`}
                    renderItem={renderAlbum}
                    horizontal={false}
                    numColumns={2}
                    contentContainerStyle={styles.albumGrid}
                    columnWrapperStyle={styles.playlistRow}
                    ListEmptyComponent={() => renderEmptyComponent('albums')}
                    showsHorizontalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.separator} />}
                  />
                </View>
              )}

              {/* Songs Section */}
              {searchResults.songs && searchResults.songs.length > 0 && (
                <View style={styles.section}>
                  <Text style={styles.sectionTitle}>Songs</Text>
                  <FlatList
                    data={searchResults.songs}
                    keyExtractor={(item) => `song-${item.id}`}
                    renderItem={renderSong}
                    contentContainerStyle={styles.songsList}
                    ListEmptyComponent={() => renderEmptyComponent('songs')}
                    showsVerticalScrollIndicator={false}
                    ItemSeparatorComponent={() => <View style={styles.songSeparator} />}
                  />
                </View>
              )}

              {/* No Results */}
              {!loading && searchText.trim() &&
                (!searchResults.songs?.length && !searchResults.albums?.length && !searchResults.playlists?.length) && (
                  <View style={styles.noResultsContainer}>
                    <Ionicons name="search-outline" size={50} color="#8B5CF6" />
                    <Text style={styles.noResultsText}>No results found for "{searchText}"</Text>
                  </View>
                )}
            </View>
          )}
          contentContainerStyle={styles.flatListContent}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#635f5e', // Changed to black background
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#333333', // Darker input background
    borderRadius: 10,
    height: 48,
  },
  searchIcon: {
    marginRight: 10,
    color: '#999999', // Lighter icon color
  },
  searchInput: {
    flex: 1,
    height: 48,
    fontSize: 16,
    color: '#FFFFFF', // White text
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  resultsContainer: {
    flex: 1,
    paddingBottom: 140, // Extra padding for bottom player
  },
  section: {
    marginBottom: 24,       // Increase section bottom margin
    paddingTop: 8,          // Add padding to top of section
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginHorizontal: 18,   // Increase horizontal margin
    marginBottom: 16,       // Increase bottom margin
    color: '#FFFFFF',       // White text for headers
  },
  flatListContent: {
    flexGrow: 1,
  },
  // Update playlist styling to match album styling while keeping albums unchanged
  playlistContainer: {
    width: width / 2 - 36,  // Reduced width to account for margins
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginHorizontal: 10,  // Increased from 8
    marginBottom: 16,
    borderRadius: 8,
    backgroundColor: '#2A2A2A',
  },
  playlistGrid: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginTop: 4,
  },
  playlistRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    marginBottom: 12,  // Added margin bottom for vertical spacing
  },
  albumContainer: {
    width: width / 2 - 32,
    paddingVertical: 8,
    paddingHorizontal: 0,
    marginHorizontal: 8,
    marginBottom: 16,
    borderRadius: 8,
  },
  albumGrid: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    marginTop: 4,
  },
  songsList: {
    paddingHorizontal: 16,
  },
  separator: {
    height: 10, // Reduced separator height
  },
  songSeparator: {
    height: 12,
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#AAAAAA', // Lighter gray for empty text
  },
  noResultsContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  noResultsText: {
    fontSize: 16,
    marginTop: 16,
    textAlign: 'center',
    color: '#AAAAAA', // Lighter gray for no results
  }
}); 