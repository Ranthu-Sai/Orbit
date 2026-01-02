import { MainWrapper } from "../Layout/MainWrapper";
import Tabs from "../Component/Global/Tabs/Tabs";
import { useEffect, useState, useCallback, useRef } from "react";
import { getSearchSongData } from "../Api/Songs";
import {
  getYTMusicSearchSongData,
  getYTMusicSearchPlaylistData,
  getYTMusicSearchAlbumData,
  getYTMusicSearchArtistData,
  getYTMusicSearchSuggestions
} from "../Api/YTMusic";
import dabMusicService from "../Utils/DabMusicService";
import { SpotifyService } from "../Utils/SpotifyService";
import { View, TouchableOpacity, TextInput, Pressable, Dimensions, FlatList, StyleSheet, Text, Modal, Alert, BackHandler } from "react-native";
import SongDisplay from "../Component/SearchPage/SongDisplay";
import { SearchPageSkeleton } from "../Component/Search/SearchSkeletonLoader";
import { getSearchPlaylistData } from "../Api/Playlist";
import PlaylistDisplay from "../Component/SearchPage/PlaylistDisplay";
import { getSearchAlbumData } from "../Api/Album";
import AlbumsDisplay from "../Component/SearchPage/AlbumDisplay";
import ArtistDisplay from "../Component/SearchPage/ArtistDisplay";
import SearchSuggestions from "../Component/SearchPage/SearchSuggestions";
import { Spacer } from "../Component/Global/Spacer";
import { useTheme, useFocusEffect } from "@react-navigation/native";
import { GitFork } from 'lucide-react-native';
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Divider } from 'react-native-paper';
import SwipeableHistoryItem from '../Component/SearchPage/SwipeableHistoryItem';
import { CacheManager } from '../Utils/NavigationCacheManager';
import { AddSongToPlayer } from '../MusicPlayerFunctions';

const SEARCH_HISTORY_KEY = '@search_history';
const MAX_HISTORY_ITEMS = 20;
const SELECTED_SOURCE_KEY = '@selected_search_source';

export const SearchPage = ({ navigation }) => {
  const { colors } = useTheme();
  const width = Dimensions.get("window").width;
  const [ActiveTab, setActiveTab] = useState(0);
  const [query, setQuery] = useState("");
  const [SearchText, setSearchText] = useState("");
  const [Loading, setLoading] = useState(false);
  const [Data, setData] = useState({ data: { results: [] } });
  const [searchHistory, setSearchHistory] = useState([]);
  const [selectedSource, setSelectedSource] = useState('saavn');
  const [modalVisible, setModalVisible] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [quickResults, setQuickResults] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const limit = 20;

  // Track component mount state
  const isMounted = useRef(true);
  const isInitialMount = useRef(true);

  // RESTORE SEARCH STATE ON MOUNT (for back navigation preservation)
  useEffect(() => {
    const savedState = CacheManager.getSearchState();
    if (savedState && isInitialMount.current) {
      if (savedState.query) setQuery(savedState.query);
      if (savedState.searchText) setSearchText(savedState.searchText);
      if (savedState.activeTab !== undefined) setActiveTab(savedState.activeTab);
      if (savedState.selectedSource) setSelectedSource(savedState.selectedSource);
      if (savedState.data) setData(savedState.data);
    }
    isInitialMount.current = false;

    return () => {
      isMounted.current = false;
    };
  }, []);

  // SAVE SEARCH STATE on every change (for back navigation preservation)
  useEffect(() => {
    if (SearchText && Data?.data?.results?.length > 0) {
      CacheManager.setSearchState({
        query,
        searchText: SearchText,
        activeTab: ActiveTab,
        selectedSource,
        data: Data,
      });
    }
  }, [SearchText, Data, ActiveTab, selectedSource, query]);

  // Handle back navigation - go to HomePage instead of exiting app
  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        if (showSuggestions) {
          setShowSuggestions(false);
          return true;
        }
        // Navigate to HomePage instead of default back (which might exit app)
        navigation.navigate('HomePage');
        return true; // Prevent default back behavior
      };

      const backHandler = BackHandler.addEventListener('hardwareBackPress', onBackPress);
      return () => backHandler.remove();
    }, [navigation, showSuggestions])
  );

  // Fetch Suggestions AND Quick Results while typing
  useEffect(() => {
    const fetchSuggestionsAndQuickResults = async () => {
      // RATE LIMIT OPTIMIZATION: Minimum 3 characters for Spotify, 2 for others
      // Spotify now only fetches results on manual search (Enter) to save RPM.
      const minLength = selectedSource === 'spotify' ? 3 : 2;
      if (!query || query.trim().length < minLength) {
        setSuggestions([]);
        setQuickResults([]);
        return;
      }

      try {
        // Fetch suggestions
        const suggestResult = await getYTMusicSearchSuggestions(query);
        if (suggestResult && suggestResult.queries) {
          setSuggestions(suggestResult.queries);
        }

        // Fetch quick results (top 3 songs) based on selected source
        let quickData = null;
        if (selectedSource === 'ytmusic') {
          quickData = await getYTMusicSearchSongData(query, 1, 3);
        } else if (selectedSource === 'saavn') {
          quickData = await getSearchSongData(query, 1, 3);
        } else if (selectedSource === 'dab') {
          // RATE LIMIT OPTIMIZATION: Disabled auto-fetching for DAB to save RPM.
          // Results will now only appear when the user hits 'Enter'.
          // Suggestions (YTMusic) still provide the 'instant' feel.
          quickData = null;
        } else if (selectedSource === 'spotify') {
          // RATE LIMIT OPTIMIZATION: Disabled auto-fetching for Spotify to save RPM.
          // Results will now only appear when the user hits 'Enter'.
          // Suggestions (YTMusic) still provide the 'instant' feel.
          quickData = null;
        }

        if (quickData?.data?.results) {
          setQuickResults(quickData.data.results.slice(0, 3));
        }
      } catch (error) {
        console.error('Error fetching suggestions/quick results:', error);
      }
    };

    const timeoutId = setTimeout(() => {
      if (query.trim() && showSuggestions) {
        fetchSuggestionsAndQuickResults();
      }
    }, 500); // 500ms Debounce (Optimized for rate limiting)

    return () => clearTimeout(timeoutId);
  }, [query, showSuggestions, selectedSource]);


  async function fetchSearchData(text) {
    if (!text) {
      setData({ data: { results: [] } });
      return;
    }

    try {
      setLoading(true);
      setShowSuggestions(false); // Hide suggestions when searching
      let data = null;

      // DAB Music - supports Songs and Albums, requires authentication
      if (selectedSource === 'dab') {
        try {
          let results = [];
          if (ActiveTab === 0) {
            // Songs
            results = await dabMusicService.searchTracks(text, limit);
          } else if (ActiveTab === 1) {
            // Albums
            results = await dabMusicService.searchAlbums(text, limit);
          }
          data = {
            success: results.length > 0,
            data: {
              results: results,
              total: results.length
            }
          };
        } catch (error) {
          if (error.message === 'AUTH_REQUIRED') {
            // User not logged in
            Alert.alert(
              'Login Required',
              'You must login to use Qobuz. Would you like to login now?',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Login',
                  onPress: () => navigation.navigate('Settings')
                }
              ]
            );
            setData({ data: { results: [] } });
            setLoading(false);
            return;
          }
          // Other errors
          throw error;
        }
      }
      // For YTMusic, handle categories based on tabs
      else if (selectedSource === 'ytmusic') {
        if (ActiveTab === 0) {
          data = await getYTMusicSearchSongData(text, 1, limit);
        } else if (ActiveTab === 1) {
          data = await getYTMusicSearchPlaylistData(text, 1, limit);
        } else if (ActiveTab === 2) {
          data = await getYTMusicSearchAlbumData(text, 1, limit);
        } else if (ActiveTab === 3) {
          data = await getYTMusicSearchArtistData(text, 1, limit);
        }
      } else if (selectedSource === 'spotify') {
        // Spotify search - Artists handled by YTMusic
        if (ActiveTab === 0) {
          data = await SpotifyService.search(text, 'tracks', limit);
        } else if (ActiveTab === 1) {
          data = await SpotifyService.search(text, 'playlists', limit);
        } else if (ActiveTab === 2) {
          data = await SpotifyService.search(text, 'albums', limit);
        } else if (ActiveTab === 3) {
          // Artists - Use YTMusic as per requirement
          data = await getYTMusicSearchArtistData(text, 1, limit);
        }
      } else {
        // Saavn logic
        if (ActiveTab === 0) {
          // Songs
          data = await getSearchSongData(text, 1, limit);
        } else if (ActiveTab === 1) {
          // Playlists - Always use Saavn API
          data = await getSearchPlaylistData(text, 1, limit);
        } else if (ActiveTab === 2) {
          // Albums - Always use Saavn API
          data = await getSearchAlbumData(text, 1, limit);
        } else if (ActiveTab === 3) {
          // Artists - Always use YTMusic for consistent UI and features
          data = await getYTMusicSearchArtistData(text, 1, limit);
        }
      }

      if (data && data.success !== false) {
        setData(data);
      } else {
        setData({ data: { results: [] } });
      }
    } catch (e) {
      console.error('Search error:', e);
      setData({ data: { results: [] } });
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (SearchText) {
      fetchSearchData(SearchText);
    } else {
      // Clear data when no search text, regardless of tab/source switch
      setData({ data: { results: [] } });
    }
  }, [SearchText, ActiveTab, selectedSource]);

  // Load search history on mount
  useEffect(() => {
    const loadSearchHistory = async () => {
      try {
        const history = await AsyncStorage.getItem(SEARCH_HISTORY_KEY);
        if (history) {
          setSearchHistory(JSON.parse(history));
        }
      } catch (error) {
        console.error('Error loading search history:', error);
      }
    };
    loadSearchHistory();
  }, []);

  // Load selected source on mount
  useEffect(() => {
    const loadSelectedSource = async () => {
      try {
        const source = await AsyncStorage.getItem(SELECTED_SOURCE_KEY);
        if (source) {
          setSelectedSource(source);
        }
      } catch (error) {
        console.error('Error loading selected source:', error);
      }
    };
    loadSelectedSource();
  }, []);

  // Save selected source
  const saveSelectedSource = async (source) => {
    try {
      await AsyncStorage.setItem(SELECTED_SOURCE_KEY, source);
      setSelectedSource(source);
      // Clear data when switching sources to avoid incompatible data structures
      setData({ data: { results: [] } });
    } catch (error) {
      console.error('Error saving selected source:', error);
    }
  };

  // Save search query to history
  const saveToHistory = useCallback(async (queryText) => {
    if (!queryText || queryText.trim().length < 2) return; // Don't save very short queries

    try {
      setSearchHistory(prevHistory => {
        const updatedHistory = [
          queryText,
          ...prevHistory.filter(item => item.toLowerCase() !== queryText.toLowerCase())
        ].slice(0, MAX_HISTORY_ITEMS);

        // Update AsyncStorage (fire and forget)
        AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory))
          .catch(error => console.error('Error saving search history to storage:', error));

        return updatedHistory;
      });
    } catch (error) {
      console.error('Error in saveToHistory:', error);
    }
  }, []);

  // NOTE: Removed auto-search debounce - only search on Enter press now
  // This allows suggestions + quick results to show while typing

  // Handle search from history item
  const handleHistoryItemPress = (item) => {
    setQuery(item);
    setSearchText(item); // Trigger search immediately
    setShowSuggestions(false);
    saveToHistory(item); // Ensure clicked item moves to top of history
  };

  // Handle suggestion press
  const handleSuggestionPress = (item, fillOnly = false) => {
    setQuery(item);
    if (!fillOnly) {
      // Perform full search
      setSearchText(item);
      setShowSuggestions(false);
      setQuickResults([]);
      saveToHistory(item);
    }
    // If fillOnly, just update the input text
  };

  // Clear search history
  const clearHistory = async () => {
    try {
      await AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
      setSearchHistory([]);
    } catch (error) {
      console.error('Error clearing search history:', error);
    }
  };

  const handleManualSearch = () => {
    const trimmedQuery = query.trim();
    if (trimmedQuery.length > 1) { // Only save if query has more than 1 character
      saveToHistory(trimmedQuery);
      setSearchText(trimmedQuery);
      setShowSuggestions(false);
      setQuickResults([]);
    } else if (trimmedQuery.length > 0) {
      setSearchText(trimmedQuery);
      setShowSuggestions(false);
      setQuickResults([]);
    }
  };

  // Handle delete history item
  const handleDeleteHistoryItem = async (itemToDelete) => {
    try {
      const updatedHistory = searchHistory.filter(item => item !== itemToDelete);
      await AsyncStorage.setItem(SEARCH_HISTORY_KEY, JSON.stringify(updatedHistory));
      setSearchHistory(updatedHistory);
    } catch (error) {
      console.error('Error deleting history item:', error);
    }
  };

  // Render search history item with swipe to delete
  const renderHistoryItem = ({ item }) => (
    <SwipeableHistoryItem
      item={item}
      onPress={() => handleHistoryItemPress(item)}
      onDelete={() => handleDeleteHistoryItem(item)}
      onSwipeableOpen={(direction) => {
        if (direction === 'right') {
          handleDeleteHistoryItem(item);
        }
      }}
    />
  );

  // Render search history list
  const renderSearchHistory = () => (
    <View style={{ flex: 1, marginTop: 10 }}>
      <View style={[styles.historyHeader, { borderBottomColor: colors.border }]}>
        <Text style={[styles.historyTitle, { color: colors.text }]}>
          Recent Searches
        </Text>
        {searchHistory.length > 0 && (
          <Pressable
            onPress={() => {
              AsyncStorage.removeItem(SEARCH_HISTORY_KEY);
              setSearchHistory([]);
            }}
            style={({ pressed }) => ({
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: colors.primary, fontWeight: '600' }}>Clear All</Text>
          </Pressable>
        )}
      </View>
      <FlatList
        data={searchHistory}
        renderItem={renderHistoryItem}
        keyExtractor={(item, index) => index.toString()}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.historyList}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );

  return (
    <MainWrapper>
      <Spacer />

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <TextInput
            cursorColor={colors.text}
            placeholder="Search songs, albums, artists"
            placeholderTextColor={colors.text + '80'}
            style={[styles.searchInput, { color: colors.text }]}
            onChangeText={(text) => {
              setQuery(text);
              if (text.trim().length > 0) {
                setShowSuggestions(true);
              } else {
                setShowSuggestions(false);
              }
            }}
            onSubmitEditing={handleManualSearch}
            returnKeyType="search"
            autoFocus={true}
            value={query}
          />
        </View>

        <Pressable
          onPress={() => setModalVisible(true)}
          style={[styles.clearButton, { backgroundColor: colors.card }]}
        >
          <GitFork
            size={20}
            color={colors.text}
          />
        </Pressable>
      </View>

      <View style={{ zIndex: 10 }}>
        {selectedSource === 'dab' ? (
          <Tabs tabs={["Songs", "Albums"]} setState={setActiveTab} state={ActiveTab} />
        ) : (selectedSource === 'saavn' || selectedSource === 'ytmusic' || selectedSource === 'spotify') && (
          <Tabs tabs={["Songs", "Playlists", "Albums", "Artists"]} setState={setActiveTab} state={ActiveTab} />
        )}
      </View>

      <Spacer height={15} />

      {/* Logic to show Suggestions OR History OR Results */}
      {showSuggestions && (suggestions.length > 0 || quickResults.length > 0) ? (
        <SearchSuggestions
          suggestions={suggestions}
          quickResults={quickResults}
          onSuggestionPress={handleSuggestionPress}
          source={selectedSource}
        />
      ) : !SearchText && searchHistory.length > 0 ? (
        renderSearchHistory()
      ) : Loading ? (
        <SearchPageSkeleton activeTab={ActiveTab} />
      ) : (
        <View style={{ flex: 1, paddingHorizontal: 10 }}>
          {selectedSource === 'dab' ? (
            // DAB supports Songs and Albums
            <>
              {ActiveTab === 0 && <SongDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
              {ActiveTab === 1 && <AlbumsDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
            </>
          ) : (
            // Saavn, YTMusic, and Spotify support all categories
            <>
              {ActiveTab === 0 && <SongDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
              {ActiveTab === 1 && <PlaylistDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
              {ActiveTab === 2 && <AlbumsDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
              {ActiveTab === 3 && <ArtistDisplay data={Data} limit={limit} Searchtext={SearchText} source={selectedSource} />}
            </>
          )}
        </View>
      )}

      {/* Source Selection Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setModalVisible(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Select Music Source</Text>

            <TouchableOpacity
              style={[styles.sourceOption, selectedSource === 'saavn' && styles.selectedOption]}
              onPress={() => {
                saveSelectedSource('saavn');
                setModalVisible(false);
              }}
            >
              <Text style={[styles.sourceText, { color: colors.text }]}>JioSaavn</Text>
              {selectedSource === 'saavn' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceOption, selectedSource === 'ytmusic' && styles.selectedOption]}
              onPress={() => {
                saveSelectedSource('ytmusic');
                setModalVisible(false);
              }}
            >
              <Text style={[styles.sourceText, { color: colors.text }]}>YTMusic</Text>
              {selectedSource === 'ytmusic' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceOption, selectedSource === 'dab' && styles.selectedOption]}
              onPress={() => {
                saveSelectedSource('dab');
                setModalVisible(false);
              }}
            >
              <Text style={[styles.sourceText, { color: colors.text }]}>Qobuz</Text>
              {selectedSource === 'dab' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.sourceOption, selectedSource === 'spotify' && styles.selectedOption]}
              onPress={() => {
                saveSelectedSource('spotify');
                setModalVisible(false);
              }}
            >
              <Text style={[styles.sourceText, { color: colors.text }]}>Spotify</Text>
              {selectedSource === 'spotify' && <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text>}
            </TouchableOpacity>
          </View>
        </Pressable>
      </Modal>
    </MainWrapper>
  );
};

const styles = StyleSheet.create({
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 15,
    marginBottom: 10,
  },
  searchInputContainer: {
    flex: 1,
    borderBottomWidth: 1,
    borderBottomColor: 'gray',
    marginRight: 10,
  },
  searchInput: {
    fontSize: 18,
    paddingVertical: 8,
  },
  clearButton: {
    padding: 8,
    borderRadius: 20,
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  historyList: {
    paddingBottom: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    borderRadius: 10,
    padding: 20,
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  sourceOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    padding: 15,
    borderRadius: 8,
    marginVertical: 5,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  selectedOption: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
  },
  sourceText: {
    fontSize: 16,
  },
  checkmark: {
    fontSize: 18,
    fontWeight: 'bold',
  },
});
